import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "low" | "medium" | "high";
type Axis = "aiSlop" | "copySlop" | "taste" | "designQuality";
type DetectionMode = "code" | "visual-only";
type Confidence = "low" | "medium" | "high";

type Rule = {
  id: string;
  title: string;
  severity: Severity;
  axis: Axis;
  group: string;
  mode: DetectionMode;
  recommendation: string;
};

type Finding = {
  ruleId: string;
  title: string;
  severity: Severity;
  axis: Axis;
  group: string;
  category?: string;
  weight?: number;
  confidence?: Confidence;
  matchStrength?: number;
  rawContribution?: number;
  countedContribution?: number;
  file: string;
  line: number;
  evidence: string;
  recommendation: string;
  contextConflict?: string;
};

type ProjectContext = {
  product: {
    path: string;
    exists: boolean;
    loaded: boolean;
    product?: string;
    audience?: string;
    primaryDesignGoal?: string;
  };
  design: {
    path: string;
    exists: boolean;
    loaded: boolean;
    theme?: string;
    styleDirection?: string;
    colorDirection?: string;
    density?: string;
    motion?: string;
    selectedStyleProfile?: string;
    profileSource?: string;
    companyStyleCategory?: string;
    companyStyleReference?: string;
    customOverrides?: string;
    designSystemSource?: string;
    components?: string;
    buttonStyle?: string;
    fieldStyle?: string;
    cardStyle?: string;
    modalStyle?: string;
    headerStyle?: string;
    heroStyle?: string;
    pricingStyle?: string;
    howItWorksStyle?: string;
    textAnimationStyle?: string;
    scrollStyle?: string;
    layoutAndScreenPatterns?: string;
    screenTemplates?: string;
  };
  warnings: string[];
};

type CategoryScore = {
  category: string;
  raw: number;
  capped: number;
  cap: number;
  ruleCount: number;
};

type CompoundMatch = {
  id: string;
  name: string;
  membersMatched: number;
  membersTotal: number;
  ratio: number;
  contribution: number;
};

type WeightedScore = {
  score: number;
  activeCategories: number;
  gatedByCategoryCount: boolean;
  categoryScores: CategoryScore[];
  compoundMatches: CompoundMatch[];
  compoundBonus: number;
  negativeAdjustment: number;
  negativeMatches: string[];
};

type Report = {
  root: string;
  threshold: number;
  passed: boolean;
  aiSlopScore: number;
  copySlopScore: number;
  tasteScore: number;
  designQualityScore: number;
  projectContext: ProjectContext;
  scannedFiles: number;
  catalogCoverage: {
    aiSlopRules: number;
    landingCopyRules: number;
    legacyRules: number;
    tasteRules: number;
    codeDetectedCatalogRules: number;
    legacyCodeRules: number;
  };
  scoring: {
    aiSlop: WeightedScore;
    copySlop: WeightedScore;
    taste: WeightedScore;
  };
  findings: Finding[];
  skippedRuleCount: number;
  skippedRuleExamples: Array<Pick<Rule, "id" | "title" | "recommendation">>;
  fixedFiles?: string[];
};

type Options = {
  root: string;
  threshold: number;
  format: "json" | "markdown";
  fix: boolean;
};

const FRONTEND_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".html",
  ".css",
  ".scss",
  ".sass",
  ".vue",
  ".svelte"
]);

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "out",
  "vendor"
]);

type CatalogRule = {
  id: string;
  category: string;
  name?: string;
  title?: string;
  weight?: number;
  confidence?: Confidence;
  severity?: Severity;
  description?: string;
  recommendation?: string;
  betterDirection?: string;
};

type CatalogBundle = {
  ai: CatalogRule[];
  lp: CatalogRule[];
  legacy: CatalogRule[];
  byId: Map<string, CatalogRule>;
};

const CONFIDENCE_MULTIPLIER: Record<Confidence, number> = {
  low: 0.4,
  medium: 0.7,
  high: 1
};

const MIN_ACTIVE_CATEGORIES = 3;
const BELOW_THRESHOLD_MULTIPLIER = 0.55;
const DEFAULT_COMPOUND_THRESHOLD = 0.6;

const DESIGN_QUALITY_GROUP_CAP = 24;
const SEVERITY_PENALTY: Record<Severity, number> = {
  low: 6,
  medium: 10,
  high: 16
};

const AI_CATEGORY_CAPS: Record<string, number> = {
  layout: 15,
  cards: 12,
  color: 12,
  typography: 10,
  effects: 12,
  ui: 10,
  assets: 12,
  motion: 8,
  text: 15,
  html: 12,
  css: 15,
  responsive: 10,
  accessibility: 8,
  authenticity: 18,
  metadata: 12
};

const LP_CATEGORY_CAPS: Record<string, number> = {
  hero_copy: 18,
  subheadline: 12,
  microcopy: 6,
  cta: 10,
  feature_copy: 18,
  process_copy: 10,
  social_proof: 14,
  testimonial: 16,
  pricing_copy: 12,
  faq_copy: 10,
  final_cta: 7,
  brand_voice: 14,
  specificity: 20,
  consistency: 10,
  localization: 6,
  legal_copy: 6,
  claim: 14,
  contradiction: 14
};

const TASTE_CATEGORY_CAPS: Record<string, number> = {
  motionPurpose: 14,
  motionTiming: 16,
  physicality: 14,
  performance: 16,
  interactionFeedback: 12,
  accessibility: 12,
  typographyCraft: 10,
  platformRestraint: 12
};

const AI_COMPOUND_RULES = [
  { id: "CMP-001", name: "Generic AI SaaS hero", weight: 8, members: ["LAY-001", "TYP-001", "UI-001", "CLR-003", "AST-001"] },
  { id: "CMP-002", name: "Generic AI startup landing page", weight: 9, members: ["DOM-010", "LAY-010", "LAY-014", "LAY-015", "LAY-016"] },
  { id: "CMP-003", name: "AI visual-effects stack", weight: 8, members: ["CLR-004", "FX-005", "FX-007", "FX-004", "MOT-001"] },
  { id: "CMP-004", name: "Prompt-generated copy stack", weight: 8, members: ["TXT-001", "TXT-003", "TXT-006", "TXT-007", "TXT-010"] },
  { id: "CMP-005", name: "Fake social-proof stack", weight: 10, members: ["TXT-015", "TXT-017", "TXT-018", "TXT-020", "AST-013"] },
  { id: "CMP-006", name: "Template pricing stack", weight: 7, members: ["LAY-014", "UI-015", "UI-016", "CRD-003", "TXT-021"] },
  { id: "CMP-007", name: "Generated-code quality stack", weight: 9, members: ["DOM-001", "DOM-005", "CSS-006", "CSS-011", "CSS-016"] },
  { id: "CMP-008", name: "Unfinished AI prototype", weight: 12, members: ["MET-001", "MET-005", "DOM-011", "AUT-004", "MET-008"] },
  { id: "CMP-009", name: "Decorative product illusion", weight: 10, members: ["AST-002", "CRD-013", "AUT-002", "AUT-005", "AUT-019"] },
  { id: "CMP-010", name: "Generic mobile-app launch page", weight: 8, members: ["LAY-001", "AST-001", "UI-011", "TXT-024", "CLR-003"] }
];

const LP_COMPOUND_RULES = [
  { id: "LP-CMP-001", name: "Generic SaaS hero copy", weight: 10, members: ["LP-HERO-001", "LP-HERO-009", "LP-HERO-010", "LP-SUB-002", "LP-CTA-001"] },
  { id: "LP-CMP-002", name: "AI-powered marketing cliche stack", weight: 10, members: ["LP-HERO-021", "LP-FTR-007", "LP-HOW-011", "LP-FTR-010", "LP-LEX-001"] },
  { id: "LP-CMP-003", name: "Empty productivity promise", weight: 9, members: ["LP-SUB-005", "LP-FTR-027", "LP-FTR-028", "LP-FTR-005", "LP-FTR-003"] },
  { id: "LP-CMP-004", name: "Generic feature-card copy", weight: 9, members: ["LP-FTR-013", "LP-FTR-014", "LP-FTR-017", "LP-FTR-030"] },
  { id: "LP-CMP-005", name: "Fake testimonial stack", weight: 12, members: ["LP-TST-001", "LP-TST-005", "LP-TST-016", "LP-TST-017", "LP-TST-020"] },
  { id: "LP-CMP-006", name: "Unsupported trust stack", weight: 10, members: ["LP-PRF-001", "LP-PRF-004", "LP-PRF-007", "LP-PRF-015"] },
  { id: "LP-CMP-007", name: "Boilerplate pricing copy", weight: 8, members: ["LP-PRC-001", "LP-PRC-003", "LP-PRC-004", "LP-PRC-008", "LP-PRC-017"] },
  { id: "LP-CMP-008", name: "Generic FAQ stack", weight: 9, members: ["LP-FAQ-002", "LP-FAQ-003", "LP-FAQ-004", "LP-FAQ-011", "LP-FAQ-020"] },
  { id: "LP-CMP-009", name: "Low-specificity landing page", weight: 15, members: ["LP-SPC-001", "LP-SPC-002", "LP-SPC-003", "LP-SPC-004", "LP-SPC-005"] },
  { id: "LP-CMP-010", name: "Generic launch-page copy", weight: 8, members: ["LP-BDG-008", "LP-HERO-013", "LP-SUB-004", "LP-CTA-019", "LP-END-001"] }
];

const TASTE_COMPOUND_RULES = [
  { id: "TASTE-CMP-001", name: "Sluggish generic UI motion", weight: 8, members: ["TASTE-MOT-001", "TASTE-MOT-002", "TASTE-MOT-003", "TASTE-PERF-001"] },
  { id: "TASTE-CMP-002", name: "Physically incorrect popover motion", weight: 7, members: ["TASTE-PHY-001", "TASTE-PHY-002", "TASTE-MOT-002"] },
  { id: "TASTE-CMP-003", name: "Decorative motion without restraint", weight: 7, members: ["TASTE-MOT-004", "TASTE-MOT-005", "TASTE-A11Y-001"] },
  { id: "TASTE-CMP-004", name: "Low-craft interaction feedback", weight: 6, members: ["TASTE-FBK-001", "TASTE-FBK-002", "TASTE-MOT-001"] }
];

const TASTE_RULES: Rule[] = [
  rule("TASTE-MOT-001", "Unbounded transition-all motion", "high", "taste", "motionTiming", "Animate explicit properties only, usually transform and opacity."),
  rule("TASTE-MOT-002", "Ease-in UI motion", "high", "taste", "motionTiming", "Use ease-out for entering/responding UI; ease-in delays the moment users watch."),
  rule("TASTE-MOT-003", "Slow everyday UI animation", "high", "taste", "motionTiming", "Keep ordinary UI motion under 300ms unless it is a modal, drawer, or explanatory moment."),
  rule("TASTE-MOT-004", "High-frequency decorative motion", "medium", "taste", "motionPurpose", "Remove or drastically reduce motion users see many times per day."),
  rule("TASTE-MOT-005", "Idle float or pulse as decoration", "medium", "taste", "motionPurpose", "Delete ambient float/pulse unless it communicates state or a rare brand moment."),
  rule("TASTE-PHY-001", "Scale from zero", "high", "taste", "physicality", "Start from scale(0.9-0.97) plus opacity; nothing should appear from scale(0)."),
  rule("TASTE-PHY-002", "Trigger-anchored surface uses center origin", "medium", "taste", "physicality", "Popover/dropdown/tooltip surfaces should scale from their trigger; modals may stay centered."),
  rule("TASTE-PERF-001", "Layout property animation", "high", "taste", "performance", "Move motion to transform or opacity so it stays compositor-friendly."),
  rule("TASTE-PERF-002", "Keyframes for rapidly triggered UI", "medium", "taste", "performance", "Prefer interruptible transitions, WAAPI, or springs for toasts, toggles, and rapidly repeated UI."),
  rule("TASTE-A11Y-001", "Movement without reduced-motion fallback", "high", "taste", "accessibility", "Add prefers-reduced-motion handling that drops large movement while preserving useful feedback."),
  rule("TASTE-A11Y-002", "Ungated hover motion", "medium", "taste", "accessibility", "Gate hover motion behind @media (hover: hover) and (pointer: fine)."),
  rule("TASTE-FBK-001", "Pressable element lacks active feedback", "low", "taste", "interactionFeedback", "Add subtle pointer-down feedback such as active:scale-[0.97] when appropriate."),
  rule("TASTE-FBK-002", "Delayed press feedback", "medium", "taste", "interactionFeedback", "Show feedback on pointer-down/active state, not only after click completes."),
  rule("TASTE-TYP-001", "Decorative tracking overuse", "medium", "taste", "typographyCraft", "Use tracking intentionally by size; avoid blanket wide tracking for UI labels."),
  rule("TASTE-TYP-002", "Fixed text sizing that resists user settings", "low", "taste", "typographyCraft", "Prefer rem/clamp/system scale so layout respects user text size."),
  rule("TASTE-PLT-001", "Over-stacked translucent materials", "medium", "taste", "platformRestraint", "Use translucent material sparingly; do not stack glass on glass where legibility collapses."),
  rule("TASTE-PLT-002", "Hard divider under floating chrome", "low", "taste", "platformRestraint", "Prefer contextual separation only where floating UI overlaps content."),
  rule("TASTE-PLT-003", "Generic delight instead of craft", "medium", "taste", "platformRestraint", "Remove confetti, sparkles, bounce, or celebration patterns that are not earned by the product moment.")
];

const AI_NEGATIVE_SIGNALS = [
  { id: "NEG-003", adjustment: -8, pattern: /\b(?:interactive demo|playground|try it live|live demo)\b/i },
  { id: "NEG-006", adjustment: -5, pattern: /\b(?:invoice reconciliation|kanban|schema|api endpoint|audit trail|merge request|token budget)\b/i },
  { id: "NEG-008", adjustment: -3, pattern: /\b(?:empty state|loading state|error state|aria-live)\b/i },
  { id: "NEG-010", adjustment: -3, pattern: /\b(?:design token|theme token|css variable|var\(--)\b/i },
  { id: "NEG-013", adjustment: -3, pattern: /\b(?:privacy policy|terms of service|legal|billing address)\b/i }
];

const LP_NEGATIVE_SIGNALS = [
  { id: "LP-NEG-002", adjustment: -5, pattern: /\b(?:for designers|for developers|for founders|for operators|for sales teams|for clinics|for agencies)\b/i },
  { id: "LP-NEG-004", adjustment: -6, pattern: /\b(?:review queue|approval workflow|audit trail|invoice reconciliation|deployment handoff)\b/i },
  { id: "LP-NEG-006", adjustment: -6, pattern: /\b(?:source:|methodology|according to|case study|benchmark)\b/i },
  { id: "LP-NEG-014", adjustment: -3, pattern: /\b(?:book a demo|open report|view findings|create project|upload file|schedule call)\b/i }
];

const LEGACY_CATALOG_EQUIVALENTS: Record<string, string[]> = {
  "oversized-radius": ["CRD-002", "CRD-004"],
  "pill-overload": ["CRD-005", "UI-003"],
  "gradient-overuse": ["CLR-001", "CLR-002", "CLR-017", "CRD-010"],
  "gradient-text": ["CLR-008", "TYP-015"],
  "glow-heavy-ui": ["FX-004", "CLR-004"],
  "glassmorphism-default": ["FX-005", "FX-007"],
  "dramatic-shadows": ["FX-001", "FX-004"],
  "decorative-eyebrows": ["TYP-009"],
  "uppercase-label-overuse": ["TYP-009"],
  "fake-premium-copy": ["LP-LEX-001"],
  "formulaic-ai-copy": ["LP-HERO-004", "LP-SUB-013"],
  "overpadded-layout": ["UI-004"],
  "placeholder-dead-links": ["DOM-012", "MET-014"],
  "fake-charts": ["CRD-013"]
};

const RULES: Rule[] = [
  rule("oversized-radius", "Oversized rounded corners", "medium", "aiSlop", "surface-shape", "Use 8-12px radii for cards and 8-10px for buttons."),
  rule("pill-overload", "Pill button and chip overload", "medium", "aiSlop", "surface-shape", "Reserve pills for tags/filter chips; use normal button radii."),
  rule("gradient-overuse", "Unnecessary gradients", "medium", "aiSlop", "decorative-effects", "Replace decorative gradients with solid surfaces."),
  rule("gradient-text", "Gradient text", "medium", "aiSlop", "decorative-effects", "Use solid text and hierarchy from type scale or weight."),
  rule("glow-heavy-ui", "Glow-heavy UI", "medium", "aiSlop", "decorative-effects", "Remove colored glows; use subtle neutral shadows or borders."),
  rule("glassmorphism-default", "Glassmorphism as default", "medium", "aiSlop", "decorative-effects", "Use solid panel backgrounds with simple borders."),
  rule("dramatic-shadows", "Excessive dramatic shadows", "medium", "aiSlop", "decorative-effects", "Reduce elevation to subtle, consistent shadows."),
  rule("decorative-eyebrows", "Decorative eyebrow labels", "low", "aiSlop", "copy-typography", "Remove decorative eyebrow labels unless they carry real information."),
  rule("uppercase-label-overuse", "Uppercase label overuse", "low", "aiSlop", "copy-typography", "Use sentence-case labels and reserve uppercase for rare emphasis."),
  rule("fake-premium-copy", "Fake premium generic SaaS copy", "low", "aiSlop", "copy-typography", "Replace generic premium copy with product-specific language."),
  rule("formulaic-ai-copy", "Formulaic AI copy patterns", "medium", "aiSlop", "copy-typography", "State concrete product value directly."),
  rule("centered-stack-default", "Centered stack default", "medium", "aiSlop", "layout-rhythm", "Avoid centered-everything layouts when content needs hierarchy."),
  rule("repetitive-equal-cards", "Repetitive equal cards", "medium", "aiSlop", "layout-rhythm", "Introduce meaningful hierarchy or grouping."),
  rule("overpadded-layout", "Overpadded layout", "low", "aiSlop", "layout-rhythm", "Reduce padding unless the content density requires it."),
  rule("placeholder-dead-links", "Placeholder or dead links", "low", "aiSlop", "prototype-signals", "Replace placeholders with real routes/actions or remove them."),
  rule("fake-charts", "Fake decorative charts", "medium", "aiSlop", "prototype-signals", "Use real data/labels or remove decorative chart bars."),
  rule("missing-image-alt", "Missing image alt text", "high", "designQuality", "accessibility", "Add meaningful alt text or alt=\"\" for decorative images."),
  rule("icon-button-missing-label", "Icon button missing accessible label", "high", "designQuality", "accessibility", "Add aria-label, title, or visible text to icon-only buttons."),
  rule("tiny-touch-targets", "Tiny touch targets", "medium", "designQuality", "visual-validation", "Verify rendered control hit areas in a browser.", "visual-only"),
  rule("weak-primary-action", "Weak primary action", "medium", "designQuality", "visual-validation", "Verify rendered visual hierarchy in a browser.", "visual-only"),
  rule("mobile-viewport-height-risk", "Mobile viewport height risk", "medium", "designQuality", "visual-validation", "Verify mobile rendering for viewport clipping.", "visual-only")
];

const RULE_BY_ID = new Map([...RULES, ...TASTE_RULES].map((entry) => [entry.id, entry]));
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REFERENCES_DIR = path.resolve(SCRIPT_DIR, "../references/catalogs");

const AI_CODE_PATTERNS: Array<[string, RegExp]> = [
  ["LAY-002", /\b(?:text-center|items-center|justify-center)\b[\s\S]{0,220}\b(?:h1|text-[5-8]xl|get started|learn more)\b/i],
  ["LAY-003", /\b(?:text-center|items-center|justify-center)\b/i],
  ["LAY-004", /\b(?:eyebrow|kicker|overline)\b[\s\S]{0,160}\b(?:card|grid|features?)\b/i],
  ["LAY-010", /\bgrid-cols-3\b|\b(?:feature|card)[^"'\n]{0,120}(?:feature|card)[^"'\n]{0,120}(?:feature|card)\b/i],
  ["LAY-014", /\b(?:pricing|plans?|billing)\b[\s\S]{0,240}\b(?:popular|recommended|pro|enterprise)\b/i],
  ["LAY-016", /\bready to\b[\s\S]{0,180}\b(?:get started|start|join|sign up|try)\b/i],
  ["LAY-017", /\b(?:absolute|fixed)\b[^"'\n]{0,120}\b(?:blob|orb|glow|sphere|decor|shape|blur)\b/i],
  ["CRD-002", /\brounded-(?:xl|2xl|3xl)\b|border-radius\s*:\s*(?:1[6-9]|[2-9]\d)px/i],
  ["CRD-004", /\brounded-(?:2xl|3xl|\[2[0-9]px\]|\[3[0-9]px\])\b|border-radius\s*:\s*(?:2[0-9]|3[0-9])px/i],
  ["CRD-005", /\brounded-full\b|border-radius\s*:\s*999(?:9)?px/i],
  ["CRD-007", /\bcard\b[^"'\n]{0,180}\bcard\b[^"'\n]{0,180}\bcard\b/i],
  ["CRD-008", /\b(?:icon|svg|lucide)\b[\s\S]{0,120}\b(?:h3|heading|title)\b[\s\S]{0,120}\b(?:p|description)\b/i],
  ["CRD-010", /\bcard\b[^"'\n]{0,100}\b(?:bg-gradient|linear-gradient|radial-gradient)\b/i],
  ["CRD-013", /\b(?:fake|mock|decorative).{0,40}(?:dashboard|analytics|chart|metric)\b/i],
  ["CRD-014", /\b(?:stat|metric|kpi)\b[^"'\n]{0,120}\b(?:text-[4-7]xl|\d+%|\d+x|\d+k)\b/i],
  ["CLR-001", /\b(?:from|via|to)-(?:violet|indigo|purple|blue|cyan|sky)-\d|\b(?:linear|radial)-gradient[^;\n]*(?:violet|indigo|purple|blue|cyan|sky)/i],
  ["CLR-002", /\b(?:from|via|to)-(?:orange|pink|rose|fuchsia)-\d|\b(?:linear|radial)-gradient[^;\n]*(?:orange|pink|rose|fuchsia)/i],
  ["CLR-003", /\bradial-gradient\b|\b(?:blur|glow).{0,80}(?:mockup|hero|product|dashboard)\b/i],
  ["CLR-004", /\b(?:blob|orb|glow|blur-[2-9]xl|blur-\[[4-9]\dpx\])\b/i],
  ["CLR-008", /\bbg-clip-text\b|background-clip\s*:\s*text/i],
  ["CLR-017", /\b(?:bg-gradient|linear-gradient|radial-gradient|conic-gradient)\b/i],
  ["TYP-001", /\b(?:text-6xl|text-7xl|text-8xl|font-size\s*:\s*(?:6[4-9]|[7-9]\d)px)\b/i],
  ["TYP-005", /\b(?:font-extrabold|font-black|font-weight\s*:\s*(?:800|900))\b/i],
  ["TYP-007", /\btext-center\b/i],
  ["TYP-008", /\b(?:max-w-2xl|max-w-3xl)\b[^"'\n]{0,80}\bmx-auto\b|\bmx-auto\b[^"'\n]{0,80}\b(?:max-w-2xl|max-w-3xl)\b/i],
  ["TYP-009", /\b(?:uppercase|tracking-widest|eyebrow|kicker|overline)\b/i],
  ["TYP-011", /\b(?:Inter|Manrope|Geist|DM Sans)\b/i],
  ["TYP-015", /\b(?:bg-clip-text|text-transparent|gradient)\b/i],
  ["TYP-019", /\btext-wrap\s*:\s*balance|\btext-balance\b/i],
  ["FX-004", /\bshadow-(?:cyan|blue|purple|pink|rose|emerald|indigo|violet|fuchsia|amber|orange)-|box-shadow\s*:[^;\n]*(?:rgba\(\s*\d+\s*,\s*(?:0|[1-9]\d{2})\s*,|#[0-9a-f]{3,8})/i],
  ["FX-005", /\bbackdrop-blur|backdrop-filter\s*:\s*blur/i],
  ["FX-007", /\b(?:glass|frosted|backdrop-blur)\b[^"'\n]{0,120}\bborder\b/i],
  ["FX-013", /\b(?:animate|animation)[^"'\n]{0,120}\b(?:gradient|border)\b/i],
  ["FX-016", /\b(?:fade-up|translate-y-[2-9]|opacity-0)\b/i],
  ["FX-017", /\b(?:hover:scale|hover:-translate-y|group-hover:scale)\b/i],
  ["UI-001", /\bget started\b[\s\S]{0,80}\b(?:learn more|watch demo|see how)\b/i],
  ["UI-002", /\b(?:ArrowRight|ChevronRight|arrow-right|→)\b/i],
  ["UI-003", /\b(?:rounded-full|rounded-2xl|rounded-3xl)\b[^"'\n]{0,100}\b(?:button|btn|cta|px-)/i],
  ["UI-004", /\b(?:px-(?:8|10|12|14|16)|py-(?:6|8))\b/i],
  ["UI-005", /\b(?:icon|svg|lucide)\b[^"'\n]{0,100}\b(?:rounded-lg|rounded-xl|rounded-2xl|p-3|p-4)\b/i],
  ["UI-007", /\b(?:navbar|nav|header)\b[^"'\n]{0,160}\b(?:rounded-full|shadow|mx-auto)\b/i],
  ["UI-008", /\b(?:sticky|fixed)\b[^"'\n]{0,120}\b(?:backdrop-blur|bg-white\/|bg-black\/)\b/i],
  ["UI-010", /\b(?:waitlist|join waitlist)\b|\binput\b[\s\S]{0,120}\b(?:button|submit)\b/i],
  ["UI-015", /\b(?:monthly|annual|yearly)\b[\s\S]{0,120}\b(?:toggle|segmented|switch)\b/i],
  ["UI-016", /\b(?:most popular|recommended|best value)\b/i],
  ["UI-021", /\b(?:coming soon|beta|new|live)\b[^"'\n]{0,100}\b(?:rounded-full|dot|badge|pill)\b/i],
  ["AST-004", /\b(?:browser|window|chrome)\b[^"'\n]{0,120}\b(?:traffic|dot|red|yellow|green)\b/i],
  ["AST-005", /\b(?:lucide|Icon|Sparkles|Wand|Star)\b/i],
  ["AST-008", /\b(?:Sparkles|Wand|stars?|magic)\b/i],
  ["AST-013", /\b(?:avatar|facepile)\b[^"'\n]{0,120}\b(?:-space-x|overlap|rounded-full)\b/i],
  ["AST-020", /\b(?:hero-image|dashboard-mockup|feature-1|generated-image|placeholder)\b/i],
  ["MOT-001", /\b(?:fade-up|whileInView|initial=\{\{ opacity: 0|translateY|translate-y-[2-9])\b/i],
  ["MOT-003", /\b(?:marquee|animate-marquee|logo-scroll)\b/i],
  ["MOT-005", /\b(?:animate-float|floating|float)\b/i],
  ["MOT-006", /\b(?:animate-pulse|pulse|glow)\b[^"'\n]{0,100}\b(?:button|cta)\b/i],
  ["MOT-012", /\b(?:typewriter|typing|typed)\b/i],
  ["MOT-016", /\btransition-all\b|transition\s*:\s*all/i],
  ["MOT-020", /\banimation\b(?![\s\S]{0,300}prefers-reduced-motion)|\bwhileInView\b/i],
  ["DOM-001", /\b<div\b/i],
  ["DOM-006", /\b(?:w-\[\d+px\]|h-\[\d+px\]|top-\[\d+px\]|left-\[\d+px\])\b/i],
  ["DOM-008", /className=["'][^"']{180,}["']|class=["'][^"']{180,}["']/i],
  ["DOM-012", /href=["'](?:#|javascript:void\(0\))["']/i],
  ["CSS-001", /style=\{\{|\bstyle=["']/i],
  ["CSS-002", /\b(?:#[0-9a-f]{6}|rgba?\()\b/i],
  ["CSS-006", /\bz-\[(?:999|9999|10000)/i],
  ["RSP-001", /\b(?:hidden md:block|md:hidden|lg:hidden)\b/i],
  ["MET-014", /\b(?:YOUR_API_KEY|YOUR_DOMAIN|SITE_URL|TODO|FIXME)\b/i]
];

const LP_CODE_PATTERNS: Array<[string, RegExp]> = [
  ["LP-HERO-002", /\b(?:unlock|unleash)\b/i],
  ["LP-HERO-003", /\belevate your\b|take your .{0,30} to the next level/i],
  ["LP-HERO-004", /\b(?:reimagine|reinvent|revolutionize|transform)\b/i],
  ["LP-HERO-005", /\bthe future of\b|\bfuture-ready\b|\bbuilt for the future\b/i],
  ["LP-HERO-006", /\b(?:work|build|sell) smarter\b/i],
  ["LP-HERO-007", /\bnot harder\b/i],
  ["LP-HERO-014", /\ball-in-one\b|\ball in one\b|\bone platform\b/i],
  ["LP-HERO-015", /everything you need in one place/i],
  ["LP-HERO-016", /\bmade simple\b|\bsimplified\b|without the complexity/i],
  ["LP-HERO-017", /\beffortless(?:ly)?\b/i],
  ["LP-HERO-018", /\bseamless(?:ly)?\b/i],
  ["LP-HERO-020", /\b(?:ultimate|most powerful|world-class|leading platform)\b/i],
  ["LP-HERO-021", /\bai-powered\b|powered by ai|\bwith ai\b/i],
  ["LP-HERO-022", /\bmagic(?:ally)?\b|\bin seconds\b|at the click of a button/i],
  ["LP-HERO-026", /\ba better way to\b/i],
  ["LP-HERO-027", /\bnext-gen\b|\bnext generation\b/i],
  ["LP-HERO-028", /\bgame-changing\b|change the game|\bredefine\b/i],
  ["LP-SUB-004", /save time and money/i],
  ["LP-SUB-005", /focus on what matters|focus on what you do best/i],
  ["LP-SUB-007", /whether you (?:are|'re)\b/i],
  ["LP-SUB-011", /\binstantly\b|faster than ever|\bin seconds\b/i],
  ["LP-SUB-012", /\bno complexity\b|\bno hassle\b|without the headache|without the hassle|zero friction/i],
  ["LP-SUB-013", /\bdesigned to help\b|\bempowers? you to\b|\bhelps? you achieve\b|\benables? teams to\b/i],
  ["LP-SUB-017", /\btrusted by\b|\bproven\b|\breliable\b/i],
  ["LP-SUB-018", /\bany team\b|\bevery business\b|\bfor everyone\b/i],
  ["LP-CTA-001", />\s*get started\s*</i],
  ["LP-CTA-002", />\s*learn more\s*</i],
  ["LP-CTA-003", />\s*try now\s*</i],
  ["LP-CTA-004", />\s*(?:explore|discover|see more)\s*</i],
  ["LP-CTA-011", /see how it works|watch (?:the )?demo/i],
  ["LP-CTA-014", /transform my business|unlock growth/i],
  ["LP-CTA-015", /start my journey|grow my business/i],
  ["LP-CTA-016", /claim your spot|get access now|don't miss out/i],
  ["LP-FTR-001", /powerful features|everything you need/i],
  ["LP-FTR-002", /built to scale/i],
  ["LP-FTR-003", /lightning[- ]?fast/i],
  ["LP-FTR-004", /secure by design/i],
  ["LP-FTR-005", /easy to use/i],
  ["LP-FTR-006", /seamless integration/i],
  ["LP-FTR-007", /smart automation/i],
  ["LP-FTR-008", /real[- ]?time insights/i],
  ["LP-FTR-009", /advanced analytics/i],
  ["LP-FTR-010", /personalized experience/i],
  ["LP-FTR-011", /\bone-click\b|\b1-click\b/i],
  ["LP-FTR-027", /streamline (?:your )?workflow/i],
  ["LP-FTR-028", /boost productivity/i],
  ["LP-FTR-029", /drive growth|accelerate growth|scale faster/i],
  ["LP-HOW-011", /let ai do the rest|ai does the rest/i],
  ["LP-PRF-001", /trusted by (?:thousands|\d+|many|teams)/i],
  ["LP-PRF-002", /loved by teams|loved by (?:thousands|\d+)/i],
  ["LP-PRF-004", /\b\d{1,4}(?:k|,000)\+?\b|99\.9%|\b\d{2,}%/i],
  ["LP-PRF-009", /award-winning|industry-leading/i],
  ["LP-TST-008", /game[- ]?changer|changed everything/i],
  ["LP-TST-013", /\b(?:acme|globex|initech|hooli)\b/i],
  ["LP-PRC-003", /for growing teams/i],
  ["LP-PRC-004", /everything in (?:pro|starter|business|the)/i],
  ["LP-PRC-005", /\b(?:credits?|tokens?|runs?)\b/i],
  ["LP-PRC-007", /\bunlimited\b/i],
  ["LP-PRC-008", /most popular/i],
  ["LP-PRC-017", /(?:custom|flexible|tailored)[^.]{0,40}(?:enterprise|plan)/i],
  ["LP-FAQ-002", /how does it work/i],
  ["LP-FAQ-003", /is it easy to use/i],
  ["LP-FAQ-004", /is it (?:secure|safe)/i],
  ["LP-FAQ-013", /integrate with your favorite tools/i],
  ["LP-END-001", /ready to (?:transform|grow|build|start|scale)/i],
  ["LP-END-002", /start your journey/i],
  ["LP-END-004", /\bstart today\b|\bdon't wait\b|now is the time/i],
  ["LP-END-008", /see the difference|experience the future|take control/i],
  ["LP-BRV-011", /\b(?:solutions|capabilities|ecosystem|innovation|excellence)\b/i],
  ["LP-BRV-012", /\b(?:disrupt|revolutionary|game-changing|redefine|next-gen)\b/i],
  ["LP-BRV-013", /\b(?:help you|empower you|enable you)\b/i],
  ["LP-CLM-001", /\b\d{1,3}%\s+(?:faster|more|growth|improvement|increase|reduction)/i],
  ["LP-CLM-002", /\b\d+x\s+(?:faster|more|growth|productive|quick)/i],
  ["LP-CLM-006", /enterprise-grade security|bank-level security|military-grade encryption/i],
  ["LP-CON-001", /\b(?:coming soon|launching soon|beta|early access|waitlist)\b[\s\S]{0,500}\b(?:thousands|\d{1,4}(?:k|,000)?)\s+(?:users|customers|teams|signups|developers)\b/i],
  ["LP-CON-004", /\bunlimited\b[\s\S]{0,240}\b\d+\s*(?:credits?|messages?|requests?|users?|per month|\/mo)\b/i],
  ["LP-LEX-001", /\b(?:transform|reimagine|redefine|revolutionize|elevate|unlock|empower|supercharge|streamline|seamless|effortless|powerful|game-changing)\b/i]
];

const TASTE_CODE_PATTERNS: Array<[string, RegExp]> = [
  ["TASTE-MOT-001", /\btransition-all\b|transition\s*:\s*all\b/i],
  ["TASTE-MOT-002", /\bease-in\b|transition-timing-function\s*:\s*ease-in\b/i],
  ["TASTE-MOT-003", /\bduration-(?:[4-9]\d\d|[1-9]\d{3,})\b|(?:transition-duration|animation-duration)\s*:\s*(?:[4-9]\d\d|[1-9]\d{3,})ms/i],
  ["TASTE-MOT-004", /\b(?:command|shortcut|palette|combobox|search)\b[^"'\n]{0,160}\b(?:animate|transition|duration-|ease-)/i],
  ["TASTE-MOT-005", /\b(?:animate-(?:pulse|float|bounce|spin)|animation\s*:[^;\n]*(?:pulse|float|bounce|spin))\b/i],
  ["TASTE-PHY-001", /\bscale-0\b|scale\(0\)|transform\s*:[^;\n]*scale\(0\)/i],
  ["TASTE-PHY-002", /\b(?:popover|dropdown|tooltip|menu|select)\b[^"'\n]{0,180}\b(?:origin-center|transform-origin\s*:\s*center)\b/i],
  ["TASTE-PERF-001", /\b(?:transition|animate|animation)[^"'\n]{0,160}\b(?:width|height|top|left|right|bottom|margin|padding|border-radius)\b|transition-property\s*:[^;\n]*(?:width|height|top|left|right|bottom|margin|padding)/i],
  ["TASTE-PERF-002", /@keyframes\s+(?:toast|toggle|switch|popover|dropdown|tooltip|modal|drawer)|animation\s*:[^;\n]*(?:toast|toggle|switch|popover|dropdown|tooltip)/i],
  ["TASTE-A11Y-001", /\b(?:animate-|animation|transition|whileInView|motion\.)\b(?![\s\S]{0,300}prefers-reduced-motion)/i],
  ["TASTE-A11Y-002", /\bhover:(?:scale|translate|rotate|animate)|:hover\s*{[^}]*transform/i],
  ["TASTE-FBK-002", /\bonClick\b[^"'\n]{0,180}\b(?:setTimeout|delay|duration-[4-9]\d\d|transition)\b/i],
  ["TASTE-TYP-001", /\btracking-(?:wide|wider|widest|\[[^\]]+\])\b|letter-spacing\s*:\s*(?:0\.0[5-9]|0\.[1-9]|\d)em/i],
  ["TASTE-TYP-002", /font-size\s*:\s*\d+px|text-\[\d+px\]|line-height\s*:\s*\d+px/i],
  ["TASTE-PLT-001", /\b(?:backdrop-blur|backdrop-filter)\b[^"'\n]{0,180}\b(?:backdrop-blur|bg-white\/[1-7]0|bg-black\/[1-7]0)\b/i],
  ["TASTE-PLT-002", /\b(?:sticky|fixed)\b[^"'\n]{0,160}\bborder-b\b|\b(?:header|toolbar|nav)\b[^"'\n]{0,160}\bborder-bottom\s*:/i],
  ["TASTE-PLT-003", /\b(?:confetti|sparkles|celebration|fireworks|magic|animate-bounce)\b/i]
];

const RESTRAINT_CONFLICT_RULES = new Set([
  "CLR-001",
  "CLR-002",
  "CLR-003",
  "CLR-004",
  "CLR-008",
  "CLR-017",
  "CRD-010",
  "FX-004",
  "FX-005",
  "FX-007",
  "gradient-overuse",
  "gradient-text",
  "glow-heavy-ui",
  "glassmorphism-default",
  "dramatic-shadows"
]);

const MOTION_CONFLICT_RULES = new Set([
  "MOT-001",
  "MOT-003",
  "MOT-005",
  "MOT-006",
  "MOT-012",
  "MOT-016",
  "MOT-020",
  "TASTE-MOT-001",
  "TASTE-MOT-002",
  "TASTE-MOT-003",
  "TASTE-MOT-004",
  "TASTE-MOT-005",
  "TASTE-A11Y-001",
  "TASTE-A11Y-002"
]);

export async function runBeUniqCheck(options: Options): Promise<Report> {
  const root = path.resolve(options.root);
  const catalog = await loadCatalogBundle();
  const projectContext = await loadProjectContext(root);
  const files = await collectFrontendFiles(root);
  const findings: Finding[] = [];
  const fixedFiles: string[] = [];
  const scannedSource: string[] = [];

  for (const file of files) {
    let source = await fs.readFile(file, "utf8");
    if (options.fix) {
      const fixed = applySafeFixes(source);
      if (fixed !== source) {
        await fs.writeFile(file, fixed);
        fixedFiles.push(path.relative(root, file));
        source = fixed;
      }
    }
    scannedSource.push(source);
    findings.push(...scanSource(root, file, source, catalog));
  }
  applyProjectContextConflicts(findings, projectContext);
  const allSource = scannedSource.join("\n");

  const aiScore = scoreWeighted(
    findings.filter((finding) => finding.axis === "aiSlop"),
    AI_CATEGORY_CAPS,
    AI_COMPOUND_RULES,
    detectNegativeSignalIds(allSource, AI_NEGATIVE_SIGNALS),
    AI_NEGATIVE_SIGNALS
  );
  const copyScore = scoreWeighted(
    findings.filter((finding) => finding.axis === "copySlop"),
    LP_CATEGORY_CAPS,
    LP_COMPOUND_RULES,
    detectNegativeSignalIds(allSource, LP_NEGATIVE_SIGNALS),
    LP_NEGATIVE_SIGNALS
  );
  const tasteScore = scoreWeighted(
    findings.filter((finding) => finding.axis === "taste"),
    TASTE_CATEGORY_CAPS,
    TASTE_COMPOUND_RULES,
    [],
    []
  );
  applyContributions(findings, aiScore, "aiSlop");
  applyContributions(findings, copyScore, "copySlop");
  applyContributions(findings, tasteScore, "taste");
  const aiSlopScore = aiScore.score;
  const copySlopScore = copyScore.score;
  const taste = tasteScore.score;
  const designQualityPenalty = scoreDesignQuality(findings.filter((finding) => finding.axis === "designQuality"));
  const designQualityScore = Math.max(0, 100 - designQualityPenalty);
  const codeDetectedCatalogIds = new Set([...AI_CODE_PATTERNS, ...LP_CODE_PATTERNS].map(([id]) => id));
  const legacyCodeIds = new Set([...RULES, ...TASTE_RULES].filter((entry) => entry.mode === "code").map((entry) => entry.id));
  const skippedExamples = [...catalog.ai, ...catalog.lp]
    .filter((entry) => !codeDetectedCatalogIds.has(entry.id))
    .slice(0, 12)
    .map((entry) => ({
      id: entry.id,
      title: entry.name ?? entry.title ?? entry.id,
      recommendation: entry.recommendation ?? `Catalog rule from SwipeUI; not hard-failed in code-only mode.`
    }));

  return {
    root,
    threshold: options.threshold,
    passed: aiSlopScore <= options.threshold && copySlopScore <= options.threshold && taste <= options.threshold,
    aiSlopScore,
    copySlopScore,
    tasteScore: taste,
    designQualityScore,
    projectContext,
    scannedFiles: files.length,
    catalogCoverage: {
      aiSlopRules: catalog.ai.length,
      landingCopyRules: catalog.lp.length,
      legacyRules: catalog.legacy.length,
      tasteRules: TASTE_RULES.length,
      codeDetectedCatalogRules: codeDetectedCatalogIds.size,
      legacyCodeRules: legacyCodeIds.size
    },
    scoring: {
      aiSlop: aiScore,
      copySlop: copyScore,
      taste: tasteScore
    },
    findings: sortFindings(findings),
    skippedRuleCount: catalog.ai.length + catalog.lp.length - codeDetectedCatalogIds.size,
    skippedRuleExamples: [
      ...RULES
        .filter((entry) => entry.mode === "visual-only")
        .map(({ id, title, recommendation }) => ({ id, title, recommendation })),
      ...skippedExamples
    ],
    fixedFiles: options.fix ? fixedFiles : undefined
  };
}

export function formatMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push(`# BeUniq Design Report`);
  lines.push("");
  lines.push(`- Root: \`${report.root}\``);
  lines.push(`- Scanned files: ${report.scannedFiles}`);
  lines.push(`- AI slop: ${report.aiSlopScore}/100`);
  lines.push(`- Copy slop: ${report.copySlopScore}/100`);
  lines.push(`- Taste: ${report.tasteScore}/100`);
  lines.push(`- Design quality: ${report.designQualityScore}/100`);
  lines.push(`- Project context: PRODUCT.md ${report.projectContext.product.loaded ? "loaded" : "missing"}, DESIGN.md ${report.projectContext.design.loaded ? "loaded" : "missing"}`);
  if (report.projectContext.design.styleDirection) lines.push(`- Style direction: ${report.projectContext.design.styleDirection}`);
  if (report.projectContext.design.colorDirection) lines.push(`- Color direction: ${report.projectContext.design.colorDirection}`);
  if (report.projectContext.design.motion) lines.push(`- Motion: ${report.projectContext.design.motion}`);
  if (report.projectContext.design.selectedStyleProfile) lines.push(`- Selected style profile: ${report.projectContext.design.selectedStyleProfile}`);
  if (report.projectContext.design.profileSource) lines.push(`- Profile source: ${report.projectContext.design.profileSource}`);
  if (report.projectContext.design.companyStyleCategory) lines.push(`- Company style category: ${report.projectContext.design.companyStyleCategory}`);
  if (report.projectContext.design.companyStyleReference) lines.push(`- Company style reference: ${report.projectContext.design.companyStyleReference}`);
  if (report.projectContext.design.designSystemSource) lines.push(`- Design system source: ${report.projectContext.design.designSystemSource}`);
  if (report.projectContext.design.buttonStyle) lines.push(`- Button style: ${report.projectContext.design.buttonStyle}`);
  if (report.projectContext.design.cardStyle) lines.push(`- Card style: ${report.projectContext.design.cardStyle}`);
  if (report.projectContext.design.headerStyle) lines.push(`- Header style: ${report.projectContext.design.headerStyle}`);
  if (report.projectContext.design.heroStyle) lines.push(`- Hero style: ${report.projectContext.design.heroStyle}`);
  if (report.projectContext.design.pricingStyle) lines.push(`- Pricing style: ${report.projectContext.design.pricingStyle}`);
  if (report.projectContext.design.howItWorksStyle) lines.push(`- How it works style: ${report.projectContext.design.howItWorksStyle}`);
  lines.push(`- Threshold: <= ${report.threshold}`);
  lines.push(`- Catalog: ${report.catalogCoverage.aiSlopRules} AI/design + ${report.catalogCoverage.landingCopyRules} landing-copy + ${report.catalogCoverage.tasteRules} taste + ${report.catalogCoverage.legacyRules} legacy rules`);
  lines.push(`- Code-detected catalog rules in this no-AI mode: ${report.catalogCoverage.codeDetectedCatalogRules}`);
  lines.push(`- Legacy local rules: ${report.catalogCoverage.legacyCodeRules}`);
  lines.push(`- AI scoring: ${report.scoring.aiSlop.activeCategories} active categories, compound bonus ${report.scoring.aiSlop.compoundBonus}, negative adjustment ${report.scoring.aiSlop.negativeAdjustment}`);
  lines.push(`- Copy scoring: ${report.scoring.copySlop.activeCategories} active categories, compound bonus ${report.scoring.copySlop.compoundBonus}, negative adjustment ${report.scoring.copySlop.negativeAdjustment}`);
  lines.push(`- Taste scoring: ${report.scoring.taste.activeCategories} active categories, compound bonus ${report.scoring.taste.compoundBonus}`);
  lines.push(`- Status: ${report.passed ? "PASS" : "FAIL"}`);
  if (report.fixedFiles) {
    lines.push(`- Fixed files: ${report.fixedFiles.length ? report.fixedFiles.map((file) => `\`${file}\``).join(", ") : "none"}`);
  }
  lines.push("");

  if (report.findings.length === 0) {
    lines.push(`No code-detectable BeUniq findings.`);
  } else {
    lines.push(`## Findings`);
    lines.push("");
    for (const finding of report.findings) {
      const contribution = finding.countedContribution === undefined ? "" : ` (${finding.countedContribution} pts)`;
      lines.push(`- [${finding.severity}] \`${finding.ruleId}\` ${finding.title}${contribution}`);
      lines.push(`  ${finding.file}:${finding.line} - ${finding.evidence}`);
      if (finding.contextConflict) lines.push(`  Context: ${finding.contextConflict}`);
      lines.push(`  Fix: ${finding.recommendation}`);
    }
  }

  lines.push("");
  lines.push(`## Skipped Semantic / Visual Rules`);
  lines.push("");
  lines.push(`${report.skippedRuleCount} catalog rules are reference-only in code-only mode because they need rendered DOM, screenshots, metadata, semantic reading, or human judgment. Examples:`);
  lines.push("");
  for (const skipped of report.skippedRuleExamples) {
    lines.push(`- \`${skipped.id}\`: ${skipped.title}. ${skipped.recommendation}`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatJson(report: Report): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function parseArgs(argv: string[]): Options {
  const options: Options = {
    root: process.cwd(),
    threshold: 20,
    format: "json",
    fix: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      options.root = requireValue(argv, ++index, "--root");
    } else if (arg === "--threshold") {
      options.threshold = Number(requireValue(argv, ++index, "--threshold"));
      if (!Number.isFinite(options.threshold) || options.threshold < 0 || options.threshold > 100) {
        throw new Error("--threshold must be a number from 0 to 100.");
      }
    } else if (arg === "--format") {
      const value = requireValue(argv, ++index, "--format");
      if (value !== "json" && value !== "markdown") {
        throw new Error("--format must be json or markdown.");
      }
      options.format = value;
    } else if (arg === "--fix") {
      options.fix = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function loadCatalogBundle(): Promise<CatalogBundle> {
  const [ai, lp, legacy] = await Promise.all([
    readCatalog("ai-slop-rules.json"),
    readCatalog("landing-copy-rules.json"),
    readCatalog("uncodixify-rules.json")
  ]);
  const byId = new Map<string, CatalogRule>();
  for (const entry of [...ai, ...lp, ...legacy]) byId.set(entry.id, entry);
  return { ai, lp, legacy, byId };
}

async function readCatalog(fileName: string): Promise<CatalogRule[]> {
  const raw = await fs.readFile(path.join(REFERENCES_DIR, fileName), "utf8");
  return JSON.parse(raw).rules as CatalogRule[];
}

async function loadProjectContext(root: string): Promise<ProjectContext> {
  const productPath = path.join(root, "PRODUCT.md");
  const designPath = path.join(root, "DESIGN.md");
  const [productSource, designSource] = await Promise.all([readOptional(productPath), readOptional(designPath)]);
  const warnings: string[] = [];
  if (!productSource) warnings.push("PRODUCT.md is missing; run beuniq init before design changes.");
  if (!designSource) warnings.push("DESIGN.md is missing; run beuniq init before design changes.");
  if (designSource && !extractSection(designSource, "Selected Style Profile")) {
    warnings.push("DESIGN.md is missing Selected Style Profile; ask the user to choose BeUniq base, component collection, or custom before design changes.");
  }

  return {
    product: {
      path: productPath,
      exists: productSource !== undefined,
      loaded: productSource !== undefined,
      product: productSource ? extractSection(productSource, "Product") : undefined,
      audience: productSource ? extractSection(productSource, "Audience") : undefined,
      primaryDesignGoal: productSource ? extractSection(productSource, "Primary Design Goal") : undefined
    },
    design: {
      path: designPath,
      exists: designSource !== undefined,
      loaded: designSource !== undefined,
      theme: designSource ? extractSection(designSource, "Theme") : undefined,
      styleDirection: designSource ? extractSection(designSource, "Style Direction") : undefined,
      colorDirection: designSource ? extractSection(designSource, "Color Direction") : undefined,
      density: designSource ? extractSection(designSource, "Density") : undefined,
      motion: designSource ? extractSection(designSource, "Motion") : undefined,
      selectedStyleProfile: designSource ? extractSection(designSource, "Selected Style Profile") : undefined,
      profileSource: designSource ? extractSection(designSource, "Profile Source") : undefined,
      companyStyleCategory: designSource ? extractSection(designSource, "Company Style Category") : undefined,
      companyStyleReference: designSource ? extractSection(designSource, "Company Style Reference") : undefined,
      customOverrides: designSource ? extractSection(designSource, "Custom Overrides") : undefined,
      designSystemSource: designSource ? extractSection(designSource, "Design System Source") : undefined,
      components: designSource ? extractSection(designSource, "Components") : undefined,
      buttonStyle: designSource ? extractSection(designSource, "Button Style") : undefined,
      fieldStyle: designSource ? extractSection(designSource, "Field Style") : undefined,
      cardStyle: designSource ? extractSection(designSource, "Card Style") : undefined,
      modalStyle: designSource ? extractSection(designSource, "Modal Style") : undefined,
      headerStyle: designSource ? extractSection(designSource, "Header Style") : undefined,
      heroStyle: designSource ? extractSection(designSource, "Hero Style") : undefined,
      pricingStyle: designSource ? extractSection(designSource, "Pricing Style") : undefined,
      howItWorksStyle: designSource ? extractSection(designSource, "How It Works Style") : undefined,
      textAnimationStyle: designSource ? extractSection(designSource, "Text Animation Style") : undefined,
      scrollStyle: designSource ? extractSection(designSource, "Scroll Style") : undefined,
      layoutAndScreenPatterns: designSource ? extractSection(designSource, "Layout And Screen Patterns") : undefined,
      screenTemplates: designSource ? extractSection(designSource, "Screen Templates") : undefined
    },
    warnings
  };
}

async function readOptional(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

function extractSection(source: string, heading: string): string | undefined {
  const lines = source.split(/\r?\n/);
  const headingPattern = /^#{1,2}\s+(.+?)\s*$/;
  const start = lines.findIndex((line) => headingPattern.exec(line)?.[1]?.toLowerCase() === heading.toLowerCase());
  if (start === -1) return undefined;
  const body: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (headingPattern.test(lines[index])) break;
    body.push(lines[index]);
  }
  const value = body.join("\n").trim();
  if (!value || value === "TBD") return undefined;
  return value.replace(/\s+/g, " ").slice(0, 220);
}

function applyProjectContextConflicts(findings: Finding[], context: ProjectContext) {
  const designText = [
    context.design.styleDirection,
    context.design.colorDirection,
    context.design.density,
    context.design.motion,
    context.design.selectedStyleProfile,
    context.design.profileSource,
    context.design.companyStyleCategory,
    context.design.companyStyleReference,
    context.design.customOverrides,
    context.design.designSystemSource,
    context.design.components,
    context.design.buttonStyle,
    context.design.fieldStyle,
    context.design.cardStyle,
    context.design.modalStyle,
    context.design.headerStyle,
    context.design.heroStyle,
    context.design.pricingStyle,
    context.design.howItWorksStyle,
    context.design.textAnimationStyle,
    context.design.scrollStyle,
    context.design.layoutAndScreenPatterns,
    context.product.primaryDesignGoal
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!designText) return;
  const wantsRestraint = /\b(minimal|productive|linear|vercel|neutral|monochrome|calm|clarity|speed|technical|expert|dense|no motion|functional)\b/i.test(designText);
  const wantsLowMotion = /\b(no motion|crisp functional|functional motion|calm|speed|productive|expert)\b/i.test(designText);

  for (const finding of findings) {
    if (wantsRestraint && RESTRAINT_CONFLICT_RULES.has(finding.ruleId)) {
      finding.contextConflict = "Project context asks for a restrained/productive direction, so decorative effects should be treated as higher-priority cleanup.";
    }
    if (wantsLowMotion && MOTION_CONFLICT_RULES.has(finding.ruleId)) {
      finding.contextConflict = "Project context favors restrained functional motion, so this motion finding should be fixed before decorative polish.";
    }
  }
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT");
}

function scanSource(root: string, file: string, source: string, catalog: CatalogBundle): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  const relativeFile = path.relative(root, file);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    for (const [ruleId, pattern] of AI_CODE_PATTERNS) {
      detectCatalogLine(findings, catalog, relativeFile, lineNumber, line, ruleId, pattern);
    }
    for (const [ruleId, pattern] of LP_CODE_PATTERNS) {
      detectCatalogLine(findings, catalog, relativeFile, lineNumber, line, ruleId, pattern);
    }
    for (const [ruleId, pattern] of TASTE_CODE_PATTERNS) {
      detectLine(findings, relativeFile, lineNumber, line, ruleId, pattern);
    }
    detectLine(findings, relativeFile, lineNumber, line, "oversized-radius", /\brounded-(?:2xl|3xl|\[2[0-9]px\]|\[3[0-9]px\])\b|border-radius\s*:\s*(?:2[0-9]|3[0-9])px/i);
    detectLine(findings, relativeFile, lineNumber, line, "pill-overload", /\brounded-full\b|border-radius\s*:\s*999(?:9)?px/i);
    detectLine(findings, relativeFile, lineNumber, line, "gradient-overuse", /\bbg-gradient-|linear-gradient|radial-gradient/i);
    detectLine(findings, relativeFile, lineNumber, line, "gradient-text", /\bbg-clip-text\b|background-clip\s*:\s*text/i);
    detectLine(findings, relativeFile, lineNumber, line, "glow-heavy-ui", /\bshadow-(?:cyan|blue|purple|pink|rose|emerald|indigo|violet|fuchsia|amber|orange)-|box-shadow\s*:[^;\n]*(?:rgba\(\s*\d+\s*,\s*(?:0|[1-9]\d{2})\s*,|#[0-9a-f]{3,8})/i);
    detectLine(findings, relativeFile, lineNumber, line, "glassmorphism-default", /\bbackdrop-blur|backdrop-filter\s*:\s*blur|bg-(?:white|black)\/[1-7]0\b/i);
    detectLine(findings, relativeFile, lineNumber, line, "dramatic-shadows", /\bshadow-(?:xl|2xl)\b|box-shadow\s*:[^;\n]*(?:[2-9]\dpx\s+[2-9]\dpx|0\s+[1-9]\dpx\s+[2-9]\dpx)/i);
    detectLine(findings, relativeFile, lineNumber, line, "decorative-eyebrows", /\b(?:eyebrow|kicker|overline)\b|className=["'][^"']*(?:uppercase[^"']*tracking|tracking[^"']*uppercase)[^"']*["'][^>]*>[^<]{1,40}</i);
    detectLine(findings, relativeFile, lineNumber, line, "uppercase-label-overuse", /\buppercase\b[^"'\n]{0,80}\btracking-(?:wide|wider|widest|\[[^\]]+\])/i);
    detectLine(findings, relativeFile, lineNumber, line, "fake-premium-copy", /\b(?:effortless|seamless|powerful|unlock|elevate|supercharge|beautifully crafted|next-generation|all-in-one|game-changing)\b/i);
    detectLine(findings, relativeFile, lineNumber, line, "formulaic-ai-copy", /\b(?:in today'?s|not just .* but|designed to help|transform the way|reimagine how|without the hassle|with ease)\b/i);
    detectLine(findings, relativeFile, lineNumber, line, "overpadded-layout", /\b(?:p|px|py)-(?:16|20|24|28|32)\b/i);
    detectLine(findings, relativeFile, lineNumber, line, "placeholder-dead-links", /href=["'](?:#|javascript:void\(0\))["']|lorem ipsum|placeholder/i);
    detectLine(findings, relativeFile, lineNumber, line, "fake-charts", /\b(?:fake-chart|mock-chart|chart-bar|bar-chart-placeholder|skeleton-chart)\b/i);
    detectLine(findings, relativeFile, lineNumber, line, "missing-image-alt", /<img\b(?![^>]*\balt=)/i);
    detectIconButton(findings, relativeFile, lineNumber, line);
  });

  detectCenteredStack(findings, relativeFile, source);
  detectRepetitiveCards(findings, relativeFile, lines);
  detectTasteAggregates(findings, relativeFile, source);
  detectAggregateCatalogRules(findings, catalog, relativeFile, source);
  return dedupeFindings(findings);
}

function detectLine(
  findings: Finding[],
  file: string,
  line: number,
  text: string,
  ruleId: string,
  pattern: RegExp
) {
  const match = text.match(pattern);
  if (!match) return;
  const ruleEntry = getRule(ruleId);
  findings.push({
    ruleId,
    title: ruleEntry.title,
    severity: ruleEntry.severity,
    axis: ruleEntry.axis,
    group: ruleEntry.group,
    file,
    line,
    evidence: evidenceFromMatch(text, match),
    recommendation: ruleEntry.recommendation
  });
}

function detectCatalogLine(
  findings: Finding[],
  catalog: CatalogBundle,
  file: string,
  line: number,
  text: string,
  ruleId: string,
  pattern: RegExp
) {
  const match = text.match(pattern);
  if (!match) return;
  const catalogRule = catalog.byId.get(ruleId);
  if (!catalogRule) return;
  const confidence = confidenceFromCatalog(catalogRule);
  findings.push({
    ruleId,
    title: catalogRule.name ?? catalogRule.title ?? ruleId,
    severity: severityFromCatalog(catalogRule),
    axis: ruleId.startsWith("LP-") ? "copySlop" : "aiSlop",
    group: `${ruleId.startsWith("LP-") ? "copy" : "design"}:${catalogRule.category}`,
    category: catalogRule.category,
    weight: catalogRule.weight ?? 2,
    confidence,
    matchStrength: 1,
    file,
    line,
    evidence: evidenceFromMatch(text, match),
    recommendation: catalogRule.recommendation ?? catalogRule.betterDirection ?? `Address ${catalogRule.name ?? ruleId} with product-specific, non-template design/copy.`
  });
}

function detectIconButton(findings: Finding[], file: string, line: number, text: string) {
  if (!/<button\b/i.test(text)) return;
  if (/\baria-label=|\btitle=|>\s*[A-Za-z0-9][^<]{1,40}\s*</.test(text)) return;
  if (/<(?:svg|Icon|Menu|X|Search|Chevron|Arrow|Bell|Settings)\b|lucide/i.test(text)) {
    const ruleEntry = getRule("icon-button-missing-label");
    findings.push({
      ruleId: ruleEntry.id,
      title: ruleEntry.title,
      severity: ruleEntry.severity,
      axis: ruleEntry.axis,
      group: ruleEntry.group,
      file,
      line,
      evidence: trimEvidence(text),
      recommendation: ruleEntry.recommendation
    });
  }
}

function detectCenteredStack(findings: Finding[], file: string, source: string) {
  const matches = source.match(/\b(?:text-center|items-center|justify-center|mx-auto)\b/g) ?? [];
  if (matches.length < 5) return;
  const firstLine = lineForIndex(source, source.search(/\b(?:text-center|items-center|justify-center|mx-auto)\b/));
  const ruleEntry = getRule("centered-stack-default");
  findings.push({
    ruleId: ruleEntry.id,
    title: ruleEntry.title,
    severity: ruleEntry.severity,
    axis: ruleEntry.axis,
    group: ruleEntry.group,
    file,
    line: firstLine,
    evidence: `${matches.length} centered-stack utilities found in one file.`,
    recommendation: ruleEntry.recommendation
  });
}

function detectRepetitiveCards(findings: Finding[], file: string, lines: string[]) {
  const classCounts = new Map<string, { count: number; line: number }>();
  lines.forEach((line, index) => {
    if (!/\bcard\b|rounded-|shadow-|border\b/.test(line)) return;
    const matches = line.matchAll(/className=["']([^"']{30,})["']|class=["']([^"']{30,})["']/g);
    for (const match of matches) {
      const classText = normalizeClassText(match[1] ?? match[2] ?? "");
      if (!classText) continue;
      const existing = classCounts.get(classText);
      classCounts.set(classText, { count: (existing?.count ?? 0) + 1, line: existing?.line ?? index + 1 });
    }
  });

  for (const [classText, value] of classCounts.entries()) {
    if (value.count < 3) continue;
    const ruleEntry = getRule("repetitive-equal-cards");
    findings.push({
      ruleId: ruleEntry.id,
      title: ruleEntry.title,
      severity: ruleEntry.severity,
      axis: ruleEntry.axis,
      group: ruleEntry.group,
      file,
      line: value.line,
      evidence: `${value.count} repeated card-like class strings: ${classText.slice(0, 120)}`,
      recommendation: ruleEntry.recommendation
    });
  }
}

function detectAggregateCatalogRules(
  findings: Finding[],
  catalog: CatalogBundle,
  file: string,
  source: string
) {
  const aggregateChecks: Array<[string, RegExp, number, string]> = [
    ["LAY-020", /\b(?:min-h-screen|h-screen|100vh)\b/g, 3, "3+ viewport-height section declarations."],
    ["FX-001", /\bshadow-(?:sm|md|lg|xl|2xl)\b|box-shadow\s*:/g, 5, "5+ shadow declarations."],
    ["FX-008", /\bborder(?:\s|-[a-z]+-\d+)\b/g, 8, "8+ hairline border utilities/declarations."],
    ["CRD-011", /\bborder\b[^"'\n]{0,80}\bshadow-(?:sm|md|lg)\b|\bshadow-(?:sm|md|lg)\b[^"'\n]{0,80}\bborder\b/g, 3, "3+ soft-border cards."],
    ["CLR-020", /\b(?:from-purple-500|to-cyan-400|text-slate-600|bg-slate-50|border-slate-200)\b/g, 6, "6+ default framework palette utilities."]
  ];

  for (const [ruleId, pattern, minCount, evidence] of aggregateChecks) {
    const matches = [...source.matchAll(pattern)];
    if (matches.length < minCount) continue;
    const firstIndex = matches[0]?.index ?? 0;
    const ruleEntry = catalog.byId.get(ruleId);
    if (!ruleEntry) continue;
    findings.push({
      ruleId,
      title: ruleEntry.name ?? ruleEntry.title ?? ruleId,
      severity: severityFromCatalog(ruleEntry),
      axis: "aiSlop",
      group: `design:${ruleEntry.category}`,
      category: ruleEntry.category,
      weight: ruleEntry.weight ?? 2,
      confidence: confidenceFromCatalog(ruleEntry),
      matchStrength: 1,
      file,
      line: lineForIndex(source, firstIndex),
      evidence: `${evidence} Found ${matches.length}.`,
      recommendation: ruleEntry.recommendation ?? `Reduce repeated ${ruleEntry.name ?? ruleId} pattern.`
    });
  }
}

function detectTasteAggregates(findings: Finding[], file: string, source: string) {
  const pressableCount = (source.match(/<button\b|role=["']button["']|<a\b[^>]*\b(?:href|onClick)=/g) ?? []).length;
  const hasActiveFeedback = /\bactive:(?:scale|translate|opacity)|:active\s*{[^}]*(?:transform|opacity)|onPointerDown|onMouseDown/.test(source);
  if (pressableCount < 3 || hasActiveFeedback) return;

  const firstPressableIndex = source.search(/<button\b|role=["']button["']|<a\b[^>]*\b(?:href|onClick)=/);
  const ruleEntry = getRule("TASTE-FBK-001");
  findings.push({
    ruleId: ruleEntry.id,
    title: ruleEntry.title,
    severity: ruleEntry.severity,
    axis: ruleEntry.axis,
    group: ruleEntry.group,
    file,
    line: lineForIndex(source, firstPressableIndex),
    evidence: `${pressableCount} pressable elements found without code-detectable active/pointer-down feedback.`,
    recommendation: ruleEntry.recommendation
  });
}

function applySafeFixes(source: string): string {
  let output = source;
  output = output.replace(/\brounded-\[?(?:2[0-9]|3[0-9])px\]?\b/g, "rounded-lg");
  output = output.replace(/\brounded-(?:2xl|3xl)\b/g, "rounded-lg");
  output = output.replace(/\brounded-full\b/g, "rounded-lg");
  output = output.replace(/\btext-center\b|\bitems-center\b|\bjustify-center\b/g, "");
  output = output.replace(/\bmin-h-screen\b|\bh-screen\b/g, "");
  output = output.replace(/\bgrid-cols-3\b/g, "grid-cols-[1.2fr_0.9fr_0.9fr]");
  output = output.replace(/\bbg-gradient-to-[a-z]+\b/g, "");
  output = output.replace(/\bfrom-[^\s"'`]+|\bvia-[^\s"'`]+|\bto-[^\s"'`]+/g, "");
  output = output.replace(/\bbg-clip-text\b|\btext-transparent\b/g, "");
  output = output.replace(/\bbackdrop-blur(?:-[^\s"'`]+)?\b/g, "");
  output = output.replace(/\bbg-(white|black)\/[1-7]0\b/g, "bg-$1");
  output = output.replace(/\bshadow-(?:sm|md|lg|xl|2xl)\b/g, "");
  output = output.replace(/\bshadow-(?:cyan|blue|purple|pink|rose|emerald|indigo|violet|fuchsia|amber|orange)-[^\s"'`]+/g, "");
  output = output.replace(/\bborder-(?:white|black|slate|gray|zinc|neutral)\/\d+\b/g, "");
  output = output.replace(/\bborder\b/g, "");
  output = output.replace(/\bcard\b/g, "panel");
  output = output.replace(/\b(?:p|px|py)-(?:24|28|32)\b/g, (match) => `${match.split("-")[0]}-16`);
  output = output.replace(/\b(?:p|px|py)-(?:12|14|16|20)\b/g, (match) => `${match.split("-")[0]}-8`);
  output = output.replace(/\bp-8\b/g, "p-5");
  output = output.replace(/\b(?:px|py)-8\b/g, (match) => `${match.split("-")[0]}-5`);
  output = output.replace(/\btext-(?:6xl|7xl|8xl)\b/g, "text-4xl");
  output = output.replace(/\btracking-(?:wide|wider|widest)\b/g, "");
  output = output.replace(/\buppercase\b/g, "");
  output = output.replace(/\beyebrow\b|\bkicker\b|\boverline\b/g, "label");
  output = output.replace(/\bhref=["']#["']/g, 'href="/"');
  output = output.replace(/\bfake-chart\b/g, "data-chart");
  output = output.replace(/\bmock-chart\b/g, "data-chart");
  output = output.replace(/\bchart-bar\b/g, "metric-bar");
  output = output.replace(/\bUnlock seamless workflows with effortless precision\b/g, "Review UI issues before release");
  output = output.replace(/\bDesigned to help teams transform the way they ship powerful experiences without the hassle\./g, "Teams see source-level design findings before shipping.");
  output = output.replace(/\bNEXT-GENERATION CLARITY\b/g, "Design review");
  output = output.replace(/\bPowerful analytics\b/g, "Design finding");
  output = output.replace(/>\s*Get started\s*</g, ">Review findings<");
  output = output.replace(/<img([^>]*?)src=(["'][^"']+["'])([^>]*?)\/>/g, (match, before, src, after) => {
    if (/\balt=/.test(match)) return match;
    return `<img${before}src=${src}${after} alt="" />`;
  });
  output = output.replace(/border-radius\s*:\s*(?:2[0-9]|3[0-9]|9999?)px/gi, "border-radius: 10px");
  output = output.replace(/background(?:-image)?\s*:\s*(?:linear|radial)-gradient\([^;]+;/gi, "");
  output = output.replace(/backdrop-filter\s*:\s*blur\([^;]+;/gi, "");
  return output;
}

async function collectFrontendFiles(root: string): Promise<string[]> {
  const output: string[] = [];

  async function walk(directory: string) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) await walk(fullPath);
      } else if (entry.isFile() && FRONTEND_EXTENSIONS.has(path.extname(entry.name))) {
        output.push(fullPath);
      }
    }
  }

  await walk(root);
  return output.sort();
}

function scoreWeighted(
  findings: Finding[],
  categoryCaps: Record<string, number>,
  compoundRules: Array<{ id: string; name: string; members: string[]; weight: number }>,
  matchedNegativeIds: string[],
  negativeSignals: Array<{ id: string; adjustment: number; pattern: RegExp }>
): WeightedScore {
  const matchedRuleIds = new Set(findings.map((finding) => finding.ruleId));
  const rawByCategory = new Map<string, number>();
  const countByCategory = new Map<string, number>();

  for (const finding of findings) {
    const category = finding.category ?? categoryFromGroup(finding.group);
    const weight = finding.weight ?? weightFromSeverity(finding.severity);
    const confidence = finding.confidence ?? confidenceFromWeight(weight);
    const strength = clamp01(finding.matchStrength ?? 1);
    const raw = weight * CONFIDENCE_MULTIPLIER[confidence] * strength;
    rawByCategory.set(category, (rawByCategory.get(category) ?? 0) + raw);
    countByCategory.set(category, (countByCategory.get(category) ?? 0) + 1);
  }

  const categoryScores: CategoryScore[] = [];
  for (const [category, raw] of rawByCategory) {
    const cap = categoryCaps[category] ?? 10;
    categoryScores.push({
      category,
      raw: round1(raw),
      capped: round1(Math.min(raw, cap)),
      cap,
      ruleCount: countByCategory.get(category) ?? 0
    });
  }
  categoryScores.sort((a, b) => b.capped - a.capped);

  const compoundMatches: CompoundMatch[] = [];
  let compoundBonus = 0;
  for (const compound of compoundRules) {
    const membersMatched = compound.members.filter((id) => matchedRuleIds.has(id)).length;
    const ratio = membersMatched / compound.members.length;
    if (ratio < DEFAULT_COMPOUND_THRESHOLD) continue;
    const contribution = round1(compound.weight * ratio);
    compoundBonus += contribution;
    compoundMatches.push({
      id: compound.id,
      name: compound.name,
      membersMatched,
      membersTotal: compound.members.length,
      ratio: round1(ratio),
      contribution
    });
  }
  compoundMatches.sort((a, b) => b.contribution - a.contribution);

  const validNegativeIds = matchedNegativeIds.filter((id) => negativeSignals.some((signal) => signal.id === id));
  const negativeAdjustment = validNegativeIds.reduce((sum, id) => {
    const signal = negativeSignals.find((entry) => entry.id === id);
    return sum + (signal?.adjustment ?? 0);
  }, 0);

  let score = categoryScores.reduce((sum, entry) => sum + entry.capped, 0) + compoundBonus + negativeAdjustment;
  const activeCategories = categoryScores.filter((entry) => entry.capped > 0).length;
  const gatedByCategoryCount = activeCategories < MIN_ACTIVE_CATEGORIES;
  if (gatedByCategoryCount) score *= BELOW_THRESHOLD_MULTIPLIER;

  return {
    score: clampScore(score),
    activeCategories,
    gatedByCategoryCount,
    categoryScores,
    compoundMatches,
    compoundBonus: round1(compoundBonus),
    negativeAdjustment: round1(negativeAdjustment),
    negativeMatches: validNegativeIds
  };
}

function applyContributions(findings: Finding[], weightedScore: WeightedScore, axis: Axis) {
  const rawByCategory = new Map<string, number>();
  for (const finding of findings) {
    if (finding.axis !== axis) continue;
    const category = finding.category ?? categoryFromGroup(finding.group);
    const weight = finding.weight ?? weightFromSeverity(finding.severity);
    const confidence = finding.confidence ?? confidenceFromWeight(weight);
    const raw = weight * CONFIDENCE_MULTIPLIER[confidence] * clamp01(finding.matchStrength ?? 1);
    rawByCategory.set(category, (rawByCategory.get(category) ?? 0) + raw);
  }

  const categoryScale = new Map<string, number>();
  for (const entry of weightedScore.categoryScores) {
    categoryScale.set(entry.category, entry.raw > 0 ? entry.capped / entry.raw : 1);
  }

  for (const finding of findings) {
    if (finding.axis !== axis) continue;
    const category = finding.category ?? categoryFromGroup(finding.group);
    const weight = finding.weight ?? weightFromSeverity(finding.severity);
    const confidence = finding.confidence ?? confidenceFromWeight(weight);
    const raw = weight * CONFIDENCE_MULTIPLIER[confidence] * clamp01(finding.matchStrength ?? 1);
    finding.rawContribution = round1(raw);
    finding.countedContribution = round1(raw * (categoryScale.get(category) ?? 1));
  }
}

function scoreDesignQuality(findings: Finding[]): number {
  const byGroup = new Map<string, number>();
  for (const finding of findings) {
    byGroup.set(finding.group, (byGroup.get(finding.group) ?? 0) + SEVERITY_PENALTY[finding.severity]);
  }
  const total = [...byGroup.values()].reduce((sum, value) => sum + Math.min(value, DESIGN_QUALITY_GROUP_CAP), 0);
  return Math.max(0, Math.min(100, total));
}

function sortFindings(findings: Finding[]): Finding[] {
  const severityOrder: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return [...findings].sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity] ||
    a.axis.localeCompare(b.axis) ||
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.ruleId.localeCompare(b.ruleId)
  );
}

function severityFromCatalog(entry: CatalogRule): Severity {
  if (entry.severity) return entry.severity;
  const weight = entry.weight ?? 2;
  if (weight >= 5) return "high";
  if (weight >= 3) return "medium";
  return "low";
}

function confidenceFromCatalog(entry: CatalogRule): Confidence {
  return entry.confidence ?? confidenceFromWeight(entry.weight ?? 2);
}

function confidenceFromWeight(weight: number): Confidence {
  return weight >= 4 ? "medium" : "low";
}

function weightFromSeverity(severity: Severity): number {
  if (severity === "high") return 5;
  if (severity === "medium") return 3;
  return 1;
}

function categoryFromGroup(group: string): string {
  return group.includes(":") ? group.split(":").at(-1) ?? group : group;
}

function detectNegativeSignalIds(
  source: string,
  signals: Array<{ id: string; pattern: RegExp }>
): string[] {
  return signals.filter((signal) => signal.pattern.test(source)).map((signal) => signal.id);
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const catalogRuleIds = new Set(findings.filter((finding) => isCatalogRuleId(finding.ruleId)).map((finding) => finding.ruleId));
  const output: Finding[] = [];
  const seen = new Set<string>();

  for (const finding of findings) {
    const equivalentCatalogIds = LEGACY_CATALOG_EQUIVALENTS[finding.ruleId] ?? [];
    if (equivalentCatalogIds.some((id) => catalogRuleIds.has(id))) continue;
    const key = `${finding.axis}:${finding.ruleId}:${finding.file}:${finding.line}:${finding.evidence}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(finding);
  }

  return output;
}

function isCatalogRuleId(ruleId: string): boolean {
  return /^[A-Z]{2,4}-\d{3}$/.test(ruleId) || /^LP-[A-Z]{3,4}-\d{3}$/.test(ruleId);
}

function evidenceFromMatch(text: string, match: RegExpMatchArray): string {
  const matched = match[0] || text;
  if (matched.length >= 18) return trimEvidence(matched);
  const index = match.index ?? text.indexOf(matched);
  if (index < 0) return trimEvidence(text);
  return trimEvidence(text.slice(Math.max(0, index - 70), Math.min(text.length, index + matched.length + 70)));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeClassText(value: string): string {
  return value.trim().split(/\s+/).sort().join(" ");
}

function trimEvidence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed;
}

function lineForIndex(source: string, index: number): number {
  if (index < 0) return 1;
  return source.slice(0, index).split(/\r?\n/).length;
}

function getRule(id: string): Rule {
  const ruleEntry = RULE_BY_ID.get(id);
  if (!ruleEntry) throw new Error(`Unknown rule id: ${id}`);
  return ruleEntry;
}

function rule(
  id: string,
  title: string,
  severity: Severity,
  axis: Axis,
  group: string,
  recommendation: string,
  mode: DetectionMode = "code"
): Rule {
  return { id, title, severity, axis, group, recommendation, mode };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value.`);
  return value;
}

function printHelpAndExit(): void {
  console.log(`Usage: tsx beuniq-check.ts [--root path] [--threshold 20] [--format json|markdown] [--fix]`);
  process.exit(0);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = await runBeUniqCheck(options);
    process.stdout.write(options.format === "markdown" ? formatMarkdown(report) : formatJson(report));
    process.exitCode = report.passed ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

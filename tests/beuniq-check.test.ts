import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const initScript = path.join(repoRoot, "skills/beuniq-design/scripts/beuniq-init.ts");
const checker = path.join(repoRoot, "skills/beuniq-design/scripts/beuniq-check.ts");
const claudeSkill = path.join(repoRoot, ".claude/skills/beuniq-design");
const claudeInitScript = path.join(claudeSkill, "scripts/beuniq-init.ts");
const claudeChecker = path.join(claudeSkill, "scripts/beuniq-check.ts");

function runCheck(root: string, extra: string[] = []) {
  try {
    const stdout = execFileSync("npx", ["tsx", checker, "--root", root, "--format", "json", ...extra], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { status: 0, report: JSON.parse(stdout) };
  } catch (error) {
    const err = error as { status?: number; stdout?: Buffer | string };
    const stdout = Buffer.isBuffer(err.stdout) ? err.stdout.toString("utf8") : String(err.stdout ?? "");
    return { status: err.status ?? 1, report: JSON.parse(stdout) };
  }
}

function runInit(root: string, extra: string[] = []) {
  try {
    const stdout = execFileSync("npx", ["tsx", initScript, "--root", root, "--format", "json", ...extra], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { status: 0, report: JSON.parse(stdout) };
  } catch (error) {
    const err = error as { status?: number; stdout?: Buffer | string };
    const stdout = Buffer.isBuffer(err.stdout) ? err.stdout.toString("utf8") : String(err.stdout ?? "");
    return { status: err.status ?? 1, report: JSON.parse(stdout) };
  }
}

const sloppy = path.join(repoRoot, "tests/fixtures/sloppy");
const clean = path.join(repoRoot, "tests/fixtures/clean");
const tailwindHeavy = path.join(repoRoot, "tests/fixtures/tailwind-heavy");
const cssModule = path.join(repoRoot, "tests/fixtures/css-module");
const dashboard = path.join(repoRoot, "tests/fixtures/dashboard");
const copyOnly = path.join(repoRoot, "tests/fixtures/copy-only");
const tasteMotion = path.join(repoRoot, "tests/fixtures/taste-motion");

const sloppyResult = runCheck(sloppy);
assert.equal(sloppyResult.status, 1);
assert.equal(sloppyResult.report.passed, false);
assert.equal(sloppyResult.report.projectContext.product.loaded, false);
assert.equal(sloppyResult.report.projectContext.design.loaded, false);
assert.ok(sloppyResult.report.projectContext.warnings.some((warning: string) => warning.includes("PRODUCT.md")));
assert.ok(sloppyResult.report.aiSlopScore > 20);
assert.ok(sloppyResult.report.findings.some((finding: { ruleId: string }) => finding.ruleId === "CRD-002"));
assert.ok(sloppyResult.report.findings.some((finding: { file: string; line: number }) => finding.file === "App.tsx" && finding.line > 0));
assert.ok(sloppyResult.report.findings.some((finding: { ruleId: string }) => finding.ruleId === "missing-image-alt"));
assert.ok(sloppyResult.report.scoring.aiSlop.categoryScores.some((score: { category: string; capped: number }) => score.category === "cards" && score.capped === 12));
assert.ok(sloppyResult.report.findings.some((finding: { ruleId: string; countedContribution?: number }) => finding.ruleId === "CRD-002" && Number(finding.countedContribution) > 0));

const tmp = mkdtempSync(path.join(tmpdir(), "beuniq-sloppy-"));
try {
  cpSync(sloppy, tmp, { recursive: true });
  const initResult = runInit(tmp, [
    "--product",
    "BeUniq source-level design review",
    "--audience",
    "Frontend engineers",
    "--goal",
    "clarity and speed",
    "--theme",
    "light",
    "--style",
    "minimal/productive",
    "--colors",
    "neutral with one blue accent",
    "--density",
    "dashboard-dense",
    "--motion",
    "no motion",
    "--motion-library",
    "framer-motion",
    "--motion-style",
    "motion-functional-microinteractions",
    "--selected-style-profile",
    "beuniq-minimal-productive",
    "--profile-source",
    "beuniq-base",
    "--company-style-category",
    "productivity-saas",
    "--company-style-reference",
    "Linear",
    "--component-library",
    "components/ui",
    "--button-style",
    "compact squared buttons with solid primary and quiet secondary variants",
    "--field-style",
    "solid bordered fields",
    "--card-style",
    "quiet bordered cards without glow",
    "--modal-style",
    "functional dialogs with direct actions",
    "--header-style",
    "header-product-app",
    "--hero-style",
    "hero-dashboard-first",
    "--pricing-style",
    "pricing-three-tier-saas",
    "--how-it-works-style",
    "steps-linear-3",
    "--text-animation-style",
    "text-no-animation",
    "--scroll-style",
    "scroll-native",
    "--layout-patterns",
    "dense dashboard screens with clear side navigation",
    "--screen-templates",
    "settings, dashboard, and detail screens"
  ]);
  assert.equal(initResult.status, 0);
  assert.deepEqual(initResult.report.created, ["PRODUCT.md", "DESIGN.md"]);
  const contextCheck = runInit(tmp, ["--check"]);
  assert.equal(contextCheck.status, 0);
  assert.equal(contextCheck.report.ready, true);

  const contextualResult = runCheck(tmp);
  assert.equal(contextualResult.report.projectContext.product.loaded, true);
  assert.equal(contextualResult.report.projectContext.design.loaded, true);
  assert.equal(contextualResult.report.projectContext.design.styleDirection, "minimal/productive");
  assert.equal(contextualResult.report.projectContext.design.motionLibrary, "framer-motion");
  assert.equal(contextualResult.report.projectContext.design.motionStyle, "motion-functional-microinteractions");
  assert.equal(contextualResult.report.projectContext.design.selectedStyleProfile, "beuniq-minimal-productive");
  assert.equal(contextualResult.report.projectContext.design.profileSource, "beuniq-base");
  assert.equal(contextualResult.report.projectContext.design.companyStyleCategory, "productivity-saas");
  assert.equal(contextualResult.report.projectContext.design.companyStyleReference, "Linear");
  assert.equal(contextualResult.report.projectContext.design.designSystemSource, "components/ui");
  assert.match(contextualResult.report.projectContext.design.buttonStyle, /compact squared buttons/);
  assert.match(contextualResult.report.projectContext.design.cardStyle, /quiet bordered cards/);
  assert.equal(contextualResult.report.projectContext.design.headerStyle, "header-product-app");
  assert.equal(contextualResult.report.projectContext.design.heroStyle, "hero-dashboard-first");
  assert.equal(contextualResult.report.projectContext.design.pricingStyle, "pricing-three-tier-saas");
  assert.equal(contextualResult.report.projectContext.design.howItWorksStyle, "steps-linear-3");
  assert.equal(contextualResult.report.projectContext.design.textAnimationStyle, "text-no-animation");
  assert.equal(contextualResult.report.projectContext.design.scrollStyle, "scroll-native");
  assert.ok(contextualResult.report.findings.some((finding: { contextConflict?: string }) => finding.contextConflict));

  const productBefore = readFileSync(path.join(tmp, "PRODUCT.md"), "utf8");
  const secondInit = runInit(tmp, ["--product", "Overwritten product"]);
  assert.equal(secondInit.status, 0);
  assert.deepEqual(secondInit.report.skipped, ["PRODUCT.md", "DESIGN.md"]);
  assert.equal(readFileSync(path.join(tmp, "PRODUCT.md"), "utf8"), productBefore);

  const fixedResult = runCheck(tmp, ["--fix"]);
  assert.equal(fixedResult.report.fixedFiles.length, 1);
  const afterFix = runCheck(tmp);
  assert.equal(afterFix.report.passed, true);
  assert.ok(afterFix.report.aiSlopScore <= 20);
  assert.ok(afterFix.report.copySlopScore <= 20);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const missingContextTmp = mkdtempSync(path.join(tmpdir(), "beuniq-context-missing-"));
try {
  const missingContext = runInit(missingContextTmp, ["--check"]);
  assert.equal(missingContext.status, 1);
  assert.equal(missingContext.report.ready, false);
  assert.equal(missingContext.report.hasProduct, false);
  assert.equal(missingContext.report.hasDesign, false);
} finally {
  rmSync(missingContextTmp, { recursive: true, force: true });
}

const missingProfileTmp = mkdtempSync(path.join(tmpdir(), "beuniq-profile-missing-"));
try {
  cpSync(clean, missingProfileTmp, { recursive: true });
  const initWithoutProfile = runInit(missingProfileTmp, ["--theme", "light", "--style", "minimal/productive"]);
  assert.equal(initWithoutProfile.status, 0);
  const missingProfileReport = runCheck(missingProfileTmp).report;
  assert.equal(missingProfileReport.projectContext.design.loaded, true);
  assert.ok(
    missingProfileReport.projectContext.warnings.some((warning: string) =>
      warning.includes("Selected Style Profile")
    )
  );
} finally {
  rmSync(missingProfileTmp, { recursive: true, force: true });
}

const missingCompanyReferenceTmp = mkdtempSync(path.join(tmpdir(), "beuniq-company-reference-missing-"));
try {
  cpSync(clean, missingCompanyReferenceTmp, { recursive: true });
  const initWithoutCompanyReference = runInit(missingCompanyReferenceTmp, [
    "--theme",
    "light",
    "--style",
    "minimal/productive",
    "--selected-style-profile",
    "beuniq-minimal-productive",
    "--profile-source",
    "beuniq-base"
  ]);
  assert.equal(initWithoutCompanyReference.status, 0);
  const missingCompanyReferenceReport = runCheck(missingCompanyReferenceTmp).report;
  assert.equal(missingCompanyReferenceReport.projectContext.design.loaded, true);
  assert.equal(
    missingCompanyReferenceReport.projectContext.design.selectedStyleProfile,
    "beuniq-minimal-productive"
  );
  assert.ok(
    missingCompanyReferenceReport.projectContext.warnings.some((warning: string) =>
      warning.includes("Company Style Reference")
    )
  );
  assert.ok(
    missingCompanyReferenceReport.projectContext.warnings.some((warning: string) =>
      warning.includes("Design System Source")
    )
  );
  assert.ok(
    missingCompanyReferenceReport.projectContext.warnings.some((warning: string) =>
      warning.includes("Motion Style")
    )
  );
} finally {
  rmSync(missingCompanyReferenceTmp, { recursive: true, force: true });
}

const technologyProfileTmp = mkdtempSync(path.join(tmpdir(), "beuniq-tech-profile-"));
try {
  writeFileSync(
    path.join(technologyProfileTmp, "package.json"),
    JSON.stringify(
      {
        dependencies: {
          "@radix-ui/react-dialog": "^1.0.0",
          "class-variance-authority": "^0.7.0",
          "tailwind-merge": "^2.0.0",
          "framer-motion": "^11.0.0"
        },
        devDependencies: {
          tailwindcss: "^3.4.0"
        }
      },
      null,
      2
    )
  );
  writeFileSync(path.join(technologyProfileTmp, "components.json"), "{}\n");
  mkdirSync(path.join(technologyProfileTmp, "components/ui"), { recursive: true });
  writeFileSync(path.join(technologyProfileTmp, "components/ui/button.tsx"), "export function Button() { return null; }\n");
  writeFileSync(
    path.join(technologyProfileTmp, "App.tsx"),
    `import { motion } from "framer-motion";

export function App() {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Hello</motion.div>;
}
`
  );
  const initTech = runInit(technologyProfileTmp, [
    "--theme",
    "light",
    "--style",
    "minimal/productive",
    "--selected-style-profile",
    "beuniq-minimal-productive",
    "--profile-source",
    "beuniq-base",
    "--company-style-category",
    "nothing-from-this-list",
    "--company-style-reference",
    "none"
  ]);
  assert.equal(initTech.status, 0);
  const techReport = runCheck(technologyProfileTmp).report;
  assert.ok(techReport.technologyProfile.componentLibraries.includes("shadcn/radix/tailwind"));
  assert.ok(techReport.technologyProfile.motionLibraries.includes("framer-motion"));
  assert.equal(techReport.technologyProfile.shouldAskComponentStyle, true);
  assert.equal(techReport.technologyProfile.shouldAskMotionStyle, true);
  assert.ok(
    techReport.projectContext.warnings.some((warning: string) =>
      warning.includes("component style")
    )
  );
  assert.ok(
    techReport.projectContext.warnings.some((warning: string) =>
      warning.includes("motion style")
    )
  );
} finally {
  rmSync(technologyProfileTmp, { recursive: true, force: true });
}

const copyOnlyResult = runCheck(copyOnly);
assert.equal(copyOnlyResult.status, 1);
assert.equal(copyOnlyResult.report.passed, false);
assert.ok(copyOnlyResult.report.aiSlopScore <= 20);
assert.ok(copyOnlyResult.report.copySlopScore > 20);
assert.ok(copyOnlyResult.report.findings.some((finding: { ruleId: string }) => finding.ruleId === "LP-LEX-001"));
assert.ok(copyOnlyResult.report.scoring.copySlop.activeCategories >= 3);

const tasteResult = runCheck(tasteMotion);
assert.equal(tasteResult.status, 1);
assert.equal(tasteResult.report.passed, false);
assert.ok(tasteResult.report.aiSlopScore <= 20);
assert.ok(tasteResult.report.copySlopScore <= 20);
assert.ok(tasteResult.report.tasteScore > 20);
assert.ok(tasteResult.report.findings.some((finding: { ruleId: string }) => finding.ruleId === "TASTE-MOT-001"));
assert.ok(tasteResult.report.findings.some((finding: { ruleId: string }) => finding.ruleId === "TASTE-PHY-001"));
assert.ok(tasteResult.report.scoring.taste.activeCategories >= 3);

for (const fixture of [clean, tailwindHeavy, cssModule, dashboard]) {
  const result = runCheck(fixture);
  assert.equal(result.status, 0, `${fixture} should pass`);
  assert.equal(result.report.passed, true);
  assert.ok(result.report.aiSlopScore <= 20);
  assert.ok(result.report.tasteScore <= 20);
}

const cleanReport = runCheck(clean).report;
assert.equal(cleanReport.catalogCoverage.aiSlopRules, 325);
assert.equal(cleanReport.catalogCoverage.landingCopyRules, 301);
assert.equal(cleanReport.catalogCoverage.legacyRules, 74);
assert.ok(cleanReport.catalogCoverage.tasteRules >= 18);
assert.ok(cleanReport.catalogCoverage.codeDetectedCatalogRules > 100);
assert.ok(cleanReport.catalogCoverage.legacyCodeRules > 10);
const visualRules = cleanReport.skippedRuleExamples;
assert.ok(visualRules.some((rule: { id: string }) => rule.id === "tiny-touch-targets"));

const duplicateIds = sloppyResult.report.findings.filter((finding: { ruleId: string }) => finding.ruleId === "oversized-radius");
assert.equal(duplicateIds.length, 0, "legacy radius rule should not double-count when catalog CRD rules fire");

const claudeSkillMarkdown = readFileSync(path.join(claudeSkill, "SKILL.md"), "utf8");
assert.match(claudeSkillMarkdown, /^---\n[\s\S]*description:/);
assert.match(claudeSkillMarkdown, /\$\{CLAUDE_SKILL_DIR\}\/scripts\/beuniq-check\.ts/);
assert.match(claudeSkillMarkdown, /Selected Style Profile/);
assert.match(claudeSkillMarkdown, /Company Style Reference/);
assert.match(claudeSkillMarkdown, /Shadcn Component Style Choice|Shadcn\/Radix component style/);
assert.match(claudeSkillMarkdown, /Framer Motion style/);
assert.match(claudeSkillMarkdown, /company-style-references\.md/);
assert.match(claudeSkillMarkdown, /component-patterns\.md/);
assert.match(claudeSkillMarkdown, /allowed-tools:/);

const openaiCompanyReferences = readFileSync(
  path.join(repoRoot, "skills/beuniq-design/references/company-style-references.md"),
  "utf8"
);
const claudeCompanyReferences = readFileSync(
  path.join(claudeSkill, "references/company-style-references.md"),
  "utf8"
);
assert.match(openaiCompanyReferences, /AI and LLM platforms/);
assert.match(openaiCompanyReferences, /Nothing from this list/);
assert.match(claudeCompanyReferences, /AI and LLM platforms/);
assert.match(claudeCompanyReferences, /Nothing from this list/);

const claudeResult = (() => {
  try {
    const stdout = execFileSync("npx", ["tsx", claudeChecker, "--root", clean, "--format", "json"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { status: 0, report: JSON.parse(stdout) };
  } catch (error) {
    const err = error as { status?: number; stdout?: Buffer | string };
    const stdout = Buffer.isBuffer(err.stdout) ? err.stdout.toString("utf8") : String(err.stdout ?? "");
    return { status: err.status ?? 1, report: JSON.parse(stdout) };
  }
})();
assert.equal(claudeResult.status, 0);
assert.equal(claudeResult.report.passed, true);
assert.equal(claudeResult.report.catalogCoverage.aiSlopRules, 325);

const checkerSource = readFileSync(checker, "utf8");
const claudeCheckerSource = readFileSync(claudeChecker, "utf8");
const initSource = readFileSync(initScript, "utf8");
const reportSource = readFileSync(path.join(repoRoot, "skills/beuniq-design/scripts/beuniq-report.ts"), "utf8");
const claudeInitSource = readFileSync(claudeInitScript, "utf8");
const claudeReportSource = readFileSync(path.join(claudeSkill, "scripts/beuniq-report.ts"), "utf8");
assert.doesNotMatch(`${checkerSource}\n${claudeCheckerSource}\n${initSource}\n${reportSource}\n${claudeInitSource}\n${claudeReportSource}`, /\bfetch\s*\(|https?:\/\/|GoogleGenAI|openai|anthropic|gemini/i);

console.log("PASS beuniq-check fixtures, fix loop, stable evidence, and no-network constraints.");

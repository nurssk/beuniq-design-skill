# BeUniq Component Patterns

Use this catalog when `Selected Style Profile` is missing or the user asks for concrete UI examples. Present concrete choices, not abstract library names. The implementation must still use the target repo's installed dependencies, tokens, and component collection.

## Library Families To Detect

Inspect `package.json`, imports, component folders, Storybook stories, and token/theme files. Classify the repo into the closest family:

- **shadcn/radix/tailwind:** `@radix-ui/*`, `class-variance-authority`, `tailwind-merge`, `components/ui`.
- **headless/tailwind:** `@headlessui/react`, `tailwindcss`, local primitives.
- **material:** `@mui/*`, Material UI theme files.
- **antd:** `antd`, Ant Design tokens/config.
- **chakra:** `@chakra-ui/*`, Chakra theme.
- **mantine:** `@mantine/*`, Mantine theme.
- **nextui/heroui:** `@nextui-org/*`, `@heroui/*`.
- **bootstrap/daisy:** `bootstrap`, `react-bootstrap`, `daisyui`.
- **custom css:** CSS modules, SCSS, vanilla CSS, local design tokens.
- **motion stack:** `framer-motion`, `motion`, `gsap`, `react-spring`, `lenis`.

Do not suggest installing a new UI library unless the user explicitly asks. If no library is detected, use custom CSS/Tailwind primitives with the selected BeUniq profile.

## Shadcn/Radix Component Source Choices

Use these when shadcn/Radix/Tailwind is detected. Ask the user to choose one before editing when `DESIGN.md` does not already record component styles.

- **shadcn-existing-variants:** preserve current `components/ui` APIs and variants; derive style from existing `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `sheet.tsx`, and token classes.
- **shadcn-beuniq-compact:** map BeUniq dense/productive patterns onto shadcn primitives; 8px radius, compact spacing, clear focus-visible rings, quiet bordered cards.
- **shadcn-native-soft:** map Apple/native profile onto shadcn; grouped controls, 10-12px radius, calm surfaces, sheet-first mobile overlays.
- **shadcn-editorial-minimal:** reduce chrome; use text links, asymmetric blocks, minimal cards, and restrained CTAs.
- **shadcn-premium-restrained:** high-trust shadcn treatment with deliberate spacing, low elevation, explicit form labels, restrained contrast.
- **nothing-from-this-list:** record component source as `none`; continue with conservative existing styles.

Always inspect component implementation before editing. Preserve Radix accessibility behavior, `asChild`, variant APIs, `cn()` helpers, focus-visible states, disabled/loading states, and existing token names.

## Button Patterns

- **button-compact-solid:** 36-40px height, 8px radius, solid primary, subtle secondary, no glow. Use for dashboards and dense SaaS.
- **button-soft-native:** 40-44px height, 10-12px radius, platform-like press feedback, calm shadow or none. Use for Apple/native profile.
- **button-editorial-link:** text or icon+text command, underline/arrow on hover, one restrained primary. Use for editorial pages.
- **button-premium-border:** deliberate spacing, border/solid pair, high contrast, no gradient text. Use for premium services.
- **button-playful-accent:** friendly shape, clear active state, one expressive accent, no bouncing loop.

Required states: default, hover, active, focus-visible, disabled, loading. Icon buttons need labels.

## Field Patterns

- **field-solid-bordered:** visible border, white/neutral fill, 8px radius, focus ring, inline error text.
- **field-soft-filled:** lightly tinted fill, no glass blur, explicit label, clear helper text.
- **field-native-grouped:** grouped controls, platform spacing, large touch target.
- **field-premium-calm:** high legibility, explicit labels, restrained error color.

Required states: default, hover, focus, error, disabled, loading/skeleton where applicable.

## Card Patterns

- **card-quiet-panel:** 8px radius, border, no glow, low/no shadow, dense hierarchy.
- **card-saas-surface:** subtle surface, thin border, measured spacing, one clear title/action.
- **card-editorial-block:** asymmetric media/text composition, not repeated equal tiles.
- **card-premium-section:** composed section, careful typography, restrained elevation.
- **card-playful-tile:** varied rhythm, purposeful media/illustration, no fake metrics.

Avoid repeated equal-card grids unless the content is genuinely parallel.

## Modal And Overlay Patterns

- **modal-task-dialog:** centered, direct title/body/actions, 8-12px radius, clear cancel/confirm.
- **modal-native-sheet:** bottom or side sheet for mobile/native flows, crisp motion, obvious dismiss.
- **modal-danger-confirm:** concise destructive confirmation, explicit object name, safe default focus.
- **modal-command-palette:** keyboard-first search/list, no decorative animation, fast feedback.

Required states: open, closing, loading, error, mobile layout, reduced-motion behavior.

## Header Patterns

- **header-product-app:** left product/nav, right account/actions, sticky only when useful, no floating pill nav.
- **header-marketing-minimal:** logo, 3-5 links, one primary CTA, no centered pill container unless brand requires it.
- **header-docs-developer:** side/search/docs nav, version/status controls, compact actions.
- **header-mobile-sheet:** visible menu trigger, accessible label, full-height or sheet nav with focus handling.

Avoid glassmorphism headers as a default.

## Hero Patterns

- **hero-product-demo:** concise product promise, one primary CTA, real product screenshot/demo area, supporting proof.
- **hero-dashboard-first:** app surface first, dense factual headline, no oversized generic gradient background.
- **hero-editorial-split-rhythm:** strong typography and real image/media, asymmetric rhythm, no generic SaaS cards.
- **hero-premium-trust:** calm composition, direct claim, credentials/process proof, careful typography.
- **hero-playful-interactive:** one useful interactive/visual moment, not decorative confetti.

The H1 should be concrete. Avoid "transform/revolutionize/unlock the future" copy.

## Pricing Patterns

- **pricing-two-tier:** simple starter/pro split, clear limits, no fake "most popular" unless justified.
- **pricing-three-tier-saas:** balanced tiers, real feature differences, transparent billing copy.
- **pricing-usage-based:** calculator/table, explicit units, overage/error states.
- **pricing-enterprise-contact:** clear procurement/security/proof, not vague "custom solutions".

Include real constraints, disabled/unavailable states, and concise FAQ links.

## How It Works Patterns

- **steps-linear-3:** three concrete steps with verbs and real artifacts.
- **process-timeline:** timeline for workflows with handoffs/status.
- **interactive-demo-flow:** small real product flow, not fake charts.
- **technical-pipeline:** inputs, processing, outputs, integrations, failure states.

Avoid "Sign up, customize, launch" boilerplate unless those are actually the product steps.

## Text Animation Pattern

- **text-no-animation:** required default for dashboards, forms, pricing, docs, expert tools, landing pages, and product pages.

Do not offer text animation choices during intake unless the user explicitly asks for animation. Avoid typewriter loops, infinite word rotators, scramble text, animated gradients, and animation on essential reading.

## Motion Style Patterns

Use these when `framer-motion`, `motion`, `gsap`, `react-spring`, or `lenis` is detected. Ask before adding or changing animation when `DESIGN.md` does not already record `Motion Style`.

- **motion-none:** no new animation; keep native CSS state feedback only.
- **motion-functional-microinteractions:** use installed motion library only for state feedback, disclosure, hover/press, and small transitions under 250ms.
- **motion-native-sheets:** sheets/dialogs/drawers use transform+opacity, trigger-aware origins where relevant, reduced-motion fallback, and fast exit.
- **motion-product-reveal:** restrained product-demo reveal for marketing/product pages; no loops, no text rotators, no animation on core reading.
- **motion-scroll-subtle:** one restrained scroll-linked reveal/progress behavior only when already supported and reduced-motion safe.
- **nothing-from-this-list:** record `Motion Style: none`; continue with no-motion defaults.

For Framer Motion specifically, prefer explicit `initial/animate/exit` transform+opacity values, short durations, `layout` only when it improves continuity, `AnimatePresence` only for real enter/exit states, and `useReducedMotion` or CSS `prefers-reduced-motion` for movement fallbacks.

## Scroll Patterns

- **scroll-native:** required default browser scroll, sticky headers only when they help orientation.
- **scroll-snap-sections:** rare presentation pages; must work on mobile and keyboard.
- **scroll-progress-docs:** reading progress for long docs/articles.
- **scroll-parallax-subtle:** one restrained visual layer, never blocking content.
- **smooth-scroll-library:** only if the user explicitly asks for animated scrolling, it is already installed, and it respects reduced motion.

Avoid scroll-jacking for product workflows.

## State Catalog Required

For selected components, record expected states in `DESIGN.md`:

- Buttons: default, hover, active, focus-visible, disabled, loading.
- Fields: default, hover, focus, error, disabled, helper text.
- Cards: default, selected, empty, loading, error where applicable.
- Modals: open, loading, error, mobile, reduced motion.
- Page blocks: desktop, tablet, mobile, empty/error/loading, long text.

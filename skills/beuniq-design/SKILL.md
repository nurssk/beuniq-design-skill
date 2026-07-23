---
name: beuniq-design
description: Rule-based frontend design, taste, motion-craft, landing-copy audit, concrete component/block pattern selection, two-step company-style reference choice, shadcn/Radix component-style scan, Framer Motion animation-style scan, and project-context workflow without AI APIs. Use for React, Next.js, Vite, HTML, CSS, SCSS, or Tailwind UI polish, redesign, AI-slop checks, component style choices, animation style choices, or PRODUCT.md/DESIGN.md context. For UI edits, first read context and ask missing style/company/component/motion choices before editing.
---

# BeUniq Design

## Overview

Use BeUniq to statically inspect frontend source code for AI-slop, landing-copy slop, taste/motion-craft, and design-quality signals, apply targeted fixes, and re-check until the project passes. BeUniq also keeps project design direction in `PRODUCT.md` and `DESIGN.md` so agents do not repeatedly ask the same style questions. The workflow is code-only and must not call AI APIs, screenshot services, browser automation, telemetry endpoints, or external network services.

## Workflow

1. If the task asks to change, polish, fix, redesign, or make the UI pass BeUniq, first check whether the target repo has `PRODUCT.md`, `DESIGN.md`, a non-TBD `Selected Style Profile`, a non-TBD `Company Style Reference`, selected component styles, and selected motion style when a motion library is installed. If all exist, read them and use them as constraints.
2. Before asking intake questions, perform a lightweight local technology scan: read `package.json`, `components.json`, `components/ui` or `src/components/ui`, imports, Storybook stories, and token/theme files. Detect shadcn/Radix/Tailwind primitives (`@radix-ui/*`, `class-variance-authority`, `tailwind-merge`, `components/ui`) and motion stacks (`framer-motion`, `motion`, `gsap`, `react-spring`, `lenis`). This scan is allowed before running the full checker or editing code.
3. If `PRODUCT.md`, `DESIGN.md`, `Selected Style Profile`, `Company Style Reference`, component style choices, or motion style choices are missing or `TBD`, the first visible response must ask only the missing pieces. At minimum, when `Company Style Reference` is missing or `TBD`, ask the Company Style Category Choice; when shadcn/Radix/Tailwind is detected and component styles are missing, ask the Shadcn Component Style Choice; when Framer Motion or another motion stack is detected and motion style is missing, ask the Motion Style Choice. Stop after asking and wait for the user's answers unless the user explicitly says to choose defaults.
4. Read `references/style-profiles.md` before presenting base profile options or explaining a profile. Read `references/company-style-references.md` before presenting company-style categories or companies. After the user chooses a company category, present only the companies inside that category, plus `nothing from this list`; do not present all companies at once. Read `references/component-patterns.md` before asking about component/block or motion examples. The choice must include any missing BeUniq base/existing/custom profile choice, company-style category then company or `nothing from this list`, concrete component choices for relevant components and sections, plus concrete motion choices when a motion stack is installed.
5. After the user answers intake, inspect the target repo's existing component collection when present: `components/`, `src/components/`, `app/components`, `components/ui`, `src/components/ui`, `src/ui`, `stories/`, Storybook files, token/theme files, or a path/reference the user provided.
6. Choose one coherent component style profile from the user's selected source before editing UI: overall composition, button shape/size/elevation/variants, field treatment, card treatment, modal/dialog treatment, header, hero, pricing, how-it-works, scroll behavior, layout blocks, reusable screen templates, and motion primitives. Use `text-no-animation` by default; do not offer text animation choices unless the user explicitly asks for animation. Prefer existing components, shadcn variants, Radix states, Tailwind tokens, and installed motion libraries over inventing new primitives.
7. Create `PRODUCT.md` and `DESIGN.md` in the target repo before making UI edits. Use `scripts/beuniq-init.ts` when practical, then fill missing sections from the user's answers and the selected component/motion style profile. Do not overwrite existing context files unless the user explicitly asks.
8. Skip intake only when the user explicitly asks for audit/report only, CI usage, or no questions. For audit/report-only usage, still let the checker report whether project context exists and whether shadcn/Radix/Tailwind or Framer Motion choices are missing.
9. Read `references/rules.md` when the task involves explaining rule meaning, changing thresholds, adding rules, or deciding whether a finding is valid. Read `references/taste.md` when a finding concerns motion craft, interaction feedback, typography craft, platform restraint, or "taste".
10. Run the checker from the target frontend repo:

```bash
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-check.ts --root . --format markdown
```

11. Treat `aiSlop <= 20`, `copySlop <= 20`, and `tasteScore <= 20` as passing unless the user gives a different threshold.
12. If the project fails, make targeted code changes only for reported findings and the saved project context. Preserve product meaning, content semantics, data fetching, routing, state management, component boundaries, accessibility intent, and existing design-system tokens.
13. Re-run the checker after each fix pass. Continue until the score passes or the remaining findings are marked visual-only/human-judgment.

## Project Context

`PRODUCT.md` is the strategy file: product, audience, primary design goal, voice/copy rules, references, constraints, and do-not-change items.

`DESIGN.md` is the visual direction file: theme, style direction, color direction, density, typography, motion, motion library, motion style, selected style profile, profile source, company style category, company style reference, custom overrides, design-system source, components, button style, field style, card style, modal style, header style, hero style, pricing style, how-it-works style, text animation style, scroll style, layout/screen patterns, BeUniq rule priorities, and visual review needs.

Useful commands:

```bash
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-init.ts --root . --check
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-init.ts --root . --product "..." --audience "..." --goal "..." --theme "..." --style "..." --colors "..." --density "..." --motion "functional motion only" --motion-library "framer-motion" --motion-style "motion-functional-microinteractions" --selected-style-profile "beuniq-minimal-productive" --profile-source "beuniq-base" --company-style-category "productivity-saas" --company-style-reference "Linear" --component-library "components/ui shadcn/radix/tailwind" --button-style "button-compact-solid" --field-style "field-solid-bordered" --card-style "card-quiet-panel" --modal-style "modal-task-dialog" --header-style "header-product-app" --hero-style "hero-product-demo" --pricing-style "pricing-three-tier-saas" --how-it-works-style "steps-linear-3" --text-animation-style "text-no-animation" --scroll-style "scroll-native"
```

If context files already exist, read them instead of asking repeated intake questions. If `Company Style Reference` is absent or `TBD`, still ask the two-step company-style choice even when `Selected Style Profile` is already present. If shadcn/Radix/Tailwind is detected and component styles are absent or `TBD`, ask component style choices. If Framer Motion or another motion stack is detected and `Motion Style` is absent or `TBD`, ask motion style choices. If only one file exists, ask only for the missing information and create only the missing file.

If a component collection exists but `DESIGN.md` does not name a component style profile, ask the Style Profile Choice first. Do not silently inspect and choose. The selected profile is the source of truth for future agent work.

## Design Intake

Before making design changes, ask a compact set of questions as the first visible response. Do not ask more than six. If the user already answered some of them, do not repeat those questions. If the user asks you to choose, pick conservative defaults that match the existing product.

Required questions:

1. **Theme:** light, dark, system/adaptive, or keep current?
2. **Style direction:** minimal/productive, editorial, Apple-like native, Linear/Vercel-like SaaS, playful, premium/luxury, brutalist, or another reference?
3. **Design goal:** trust, clarity, conversion, speed, calm, delight, technical credibility, or another outcome?
4. **Color direction:** keep current palette, neutral, monochrome, vibrant accent, specific brand colors, or avoid certain colors?
5. **Density and audience:** dashboard-dense, marketing spacious, mobile-first, desktop workflow, expert users, or broad consumer?
6. **Component source:** where is the component collection or design system: `components/ui`, `src/components`, Storybook, Figma, package/library name, or keep current?

Technology Scan Questions:

Ask these only when the lightweight scan finds matching technology and the answer is not already recorded in `DESIGN.md`.

1. **Shadcn/Radix component style:** if `components/ui`, `components.json`, `@radix-ui/*`, `class-variance-authority`, or `tailwind-merge` is detected, ask whether to derive style from existing shadcn variants, BeUniq base patterns mapped onto shadcn, custom overrides, or `nothing from this list`.
2. **Framer Motion style:** if `framer-motion` or `motion` is detected, ask which animation approach to use: `motion-none`, `motion-functional-microinteractions`, `motion-native-sheets`, `motion-product-reveal`, `motion-scroll-subtle`, or `nothing from this list`.
3. If the user picks `nothing from this list`, record the matching section as `none` and continue with conservative defaults.

Style Profile Choice:

Ask this as part of the first response whenever `Selected Style Profile` is missing:

1. **BeUniq base:** choose one of `beuniq-minimal-productive`, `beuniq-linear-saas`, `beuniq-apple-native`, `beuniq-editorial`, `beuniq-premium`, or `beuniq-playful`.
2. **Existing collection:** use the target repo's component collection as the source, then inspect it and derive the button/field/card/modal/layout profile.
3. **Custom:** the user provides a reference, brand rules, or a custom description; record it in `Custom Overrides`.

Company Style Choice:

Ask this after Style Profile Choice and before concrete component patterns whenever `Company Style Reference` is missing, `TBD`, `none` without an explicit `nothing-from-this-list` category, or the user asks to choose a visual reference. Use `references/company-style-references.md`. This is a two-step choice: category first, company second.

1. First ask the user to choose a company category: `ai-llm`, `developer-tools`, `backend-devops`, `productivity-saas`, `design-creative`, `fintech-crypto`, `ecommerce-retail`, `media-consumer-tech`, `automotive`, `retro-web`, or `nothing from this list`.
2. Stop and wait for the category answer. If the user chooses a category, present the companies inside only that category and include `nothing from this list`.
3. If the user chooses a company, use it as high-level style inspiration only: translate it into general principles for layout, typography, color role, density, surfaces, and interaction tone. Do not copy logos, assets, brand text, trademarks, or exact product identity.
4. If the user chooses `nothing from this list`, record `Company Style Category: nothing-from-this-list` and `Company Style Reference: none`; continue with the BeUniq base/existing/custom style profile and component patterns.

Concrete Pattern Choice:

Do not ask only "which library?". Present concrete examples from `references/component-patterns.md`, filtered to the user's product type and detected dependencies. Include only relevant categories, but for landing/product pages ask at least:

1. **Buttons:** `button-compact-solid`, `button-soft-native`, `button-editorial-link`, `button-premium-border`, or `button-playful-accent`.
2. **Fields/cards/modals:** concrete field, card, and modal patterns when the page has forms, panels, checkout/pricing, dialogs, or app UI.
3. **Header:** `header-product-app`, `header-marketing-minimal`, `header-docs-developer`, or `header-mobile-sheet`.
4. **Hero:** `hero-product-demo`, `hero-dashboard-first`, `hero-editorial-split-rhythm`, `hero-premium-trust`, or `hero-playful-interactive`.
5. **Pricing:** `pricing-two-tier`, `pricing-three-tier-saas`, `pricing-usage-based`, or `pricing-enterprise-contact`.
6. **How it works:** `steps-linear-3`, `process-timeline`, `interactive-demo-flow`, or `technical-pipeline`.
7. **Text animation:** set `text-no-animation` by default. Do not ask this as a choice unless the user explicitly requests animated text.
8. **Scroll:** default to `scroll-native`; only offer `scroll-snap-sections`, `scroll-progress-docs`, `scroll-parallax-subtle`, or `smooth-scroll-library` if the task is a presentation/long-form page and the user wants scroll behavior.

If the repo uses shadcn/radix, MUI, Ant Design, Chakra, Mantine, NextUI/HeroUI, Bootstrap, DaisyUI, custom CSS, or a motion stack, map these concrete patterns onto the existing library primitives instead of replacing the library.

Optional when relevant:

- Motion taste: default to no motion. Ask only when the user explicitly requests motion or animation.
- References: ask for 1-3 product/site references only if the user chooses `custom`, mentions a visual benchmark outside the company-style list, or the current repo has no clear brand direction.

After the intake, inspect the component source and choose the component/block pattern set yourself only if the user asked you to choose defaults. Otherwise wait for the user to choose. Always record `Text Animation Style: text-no-animation`; record `Motion: no motion` and `Motion Style: motion-none` unless the user explicitly chooses a motion style or an installed motion stack needs functional microinteractions. Record the selected company style category/reference, component library/source, button, field, card, modal, header, hero, pricing, how-it-works, motion library/style, scroll, layout, and screen-template direction in `DESIGN.md`. Then summarize the chosen direction in one sentence and use it as a constraint for all fixes. Example: "Direction: light, dense SaaS dashboard, neutral palette with one blue accent, Linear-inspired precision, shadcn/Radix components, button-compact-solid, field-solid-bordered, card-quiet-panel, modal-task-dialog, header-product-app, hero-dashboard-first, framer-motion functional microinteractions, text-no-animation, and scroll-native."

## Scripts

- `scripts/beuniq-init.ts`: deterministic creator/checker for `PRODUCT.md` and `DESIGN.md` project-context files.
- `scripts/beuniq-check.ts`: deterministic scanner, scorer, Markdown/JSON reporter, context-aware finding annotations, and conservative `--fix` mode.
- `scripts/beuniq-report.ts`: report writer for CI artifacts and saved audits.

Useful commands:

```bash
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-init.ts --root . --check
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-check.ts --root . --format markdown
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-check.ts --root . --format json
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-check.ts --root . --fix --format markdown
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-report.ts --root . --out beuniq-report.json
```

If `tsx` is already available in the target repo or environment, use that local executable. `npx --yes tsx` is only a TypeScript runner bootstrap; the BeUniq checker itself must not make network calls or call AI APIs.

## Fix Policy

Prefer small, local edits:

- Replace oversized Tailwind radius utilities with restrained radii.
- Replace pill buttons/chips with normal button radii unless the element is clearly a tag/filter chip.
- Remove decorative gradients, gradient text, glow shadows, glass blur, and dramatic shadows.
- Reduce excessive padding and uppercase tracking when they are purely decorative.
- Replace placeholder or fake UI artifacts with real product-specific structure only when the code already contains enough context.

Do not:

- Perform a full redesign just to pass the score.
- Rewrite app architecture, business logic, data loading, or routing.
- Invent new brand colors, assets, metrics, testimonials, or product claims.
- Use AI APIs or screenshots for v1 checks.

## Output Contract

Every audit should report:

- pass/fail
- AI-slop score
- copy-slop score
- taste score
- design-quality score
- stable rule ids
- severity
- evidence
- file path and line
- suggested targeted fix
- semantic/visual rules skipped from hard failure

## Limitations

The bundled catalogs include the full SwipeUI-derived rulebase: 325 AI/design rules, 301 landing-copy rules, 74 legacy Uncodixify rules, and 18 code-detectable taste/motion-craft rules adapted from Emil Kowalski's MIT-licensed design-engineering skills. Code-only checks cannot prove rendered spacing, contrast, actual visual hierarchy, viewport behavior, animation feel, cross-page contradictions, testimonial authenticity, or screenshot-level polish. Keep those as skipped semantic/visual notes unless the user provides a separate visual review workflow.

---
name: BeUniq Design
description: Rule-based frontend design, taste, motion-craft, landing-copy audit, and project-context workflow for reducing generic AI-generated UI patterns without AI APIs. Use when asked to make React, Next.js, Vite, HTML, CSS, SCSS, or Tailwind UI feel less AI-generated, improve taste, review motion craft, initialize PRODUCT.md/DESIGN.md design context, run a BeUniq AI-slop/design-quality check, or iterate until aiSlop, copySlop, and tasteScore are at or below 20. For UI change, polish, redesign, cleanup, or fix passes, first read existing PRODUCT.md/DESIGN.md; if either is missing, ask BeUniq Design Intake and wait before editing or running fixes.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Edit
  - MultiEdit
  - Bash(npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-init.ts *)
  - Bash(npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-check.ts *)
  - Bash(npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-report.ts *)
---

# BeUniq Design

Use BeUniq to statically inspect frontend source code for AI-slop, landing-copy slop, taste/motion-craft, and design-quality signals, apply targeted fixes, and re-check until the project passes. BeUniq also keeps project design direction in `PRODUCT.md` and `DESIGN.md` so agents do not repeatedly ask the same style questions. The workflow is code-only and must not call AI APIs, screenshot services, browser automation, telemetry endpoints, or external network services.

## Workflow

1. If the task asks to change, polish, fix, redesign, or make the UI pass BeUniq, first check whether the target repo has both `PRODUCT.md` and `DESIGN.md`. If both exist, read them and use them as constraints. If either is missing, the first visible response must be the Design Intake questions. Stop after asking and wait for the user's answers unless the user explicitly says to choose defaults.
2. After the user answers intake, create `PRODUCT.md` and `DESIGN.md` in the target repo before making UI edits. Use `${CLAUDE_SKILL_DIR}/scripts/beuniq-init.ts` when practical, then fill missing sections from the user's answers. Do not overwrite existing context files unless the user explicitly asks.
3. Skip intake only when the user explicitly asks for audit/report only, CI usage, or no questions. For audit/report-only usage, still let the checker report whether project context exists.
4. Read `${CLAUDE_SKILL_DIR}/references/rules.md` when the task involves explaining rule meaning, changing thresholds, adding rules, or deciding whether a finding is valid. Read `${CLAUDE_SKILL_DIR}/references/taste.md` when a finding concerns motion craft, interaction feedback, typography craft, platform restraint, or "taste".
5. Run the checker from the target frontend repo:

```bash
npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-check.ts --root . --format markdown
```

6. Treat `aiSlop <= 20`, `copySlop <= 20`, and `tasteScore <= 20` as passing unless the user gives a different threshold.
7. If the project fails, make targeted code changes only for reported findings and the saved project context. Preserve product meaning, content semantics, data fetching, routing, state management, component boundaries, accessibility intent, and existing design-system tokens.
8. Re-run the checker after each fix pass. Continue until the score passes or the remaining findings are visual-only/human-judgment.

## Project Context

`PRODUCT.md` is the strategy file: product, audience, primary design goal, voice/copy rules, references, constraints, and do-not-change items.

`DESIGN.md` is the visual direction file: theme, style direction, color direction, density, typography, motion, components, BeUniq rule priorities, and visual review needs.

Useful commands:

```bash
npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-init.ts --root . --check
npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-init.ts --root . --product "..." --audience "..." --goal "..." --theme "..." --style "..." --colors "..." --density "..." --motion "..."
```

If context files already exist, read them instead of asking repeated intake questions. If only one file exists, ask only for the missing information and create only the missing file.

## Design Intake

Before making design changes, ask a compact set of questions as the first visible response. Do not ask more than six. If the user already answered some of them, do not repeat those questions. If the user asks you to choose, pick conservative defaults that match the existing product.

Required questions:

1. **Theme:** light, dark, system/adaptive, or keep current?
2. **Style direction:** minimal/productive, editorial, Apple-like native, Linear/Vercel-like SaaS, playful, premium/luxury, brutalist, or another reference?
3. **Design goal:** trust, clarity, conversion, speed, calm, delight, technical credibility, or another outcome?
4. **Color direction:** keep current palette, neutral, monochrome, vibrant accent, specific brand colors, or avoid certain colors?
5. **Density and audience:** dashboard-dense, marketing spacious, mobile-first, desktop workflow, expert users, or broad consumer?

Optional when relevant:

- Motion taste: no motion, crisp functional motion, springy/native, or expressive brand motion?
- References: ask for 1-3 product/site references if the user mentions a visual benchmark or the current repo has no clear brand direction.

After the intake, create or update the missing project-context file(s), summarize the chosen direction in one sentence, and use it as a constraint for all fixes. Example: "Direction: light, dense SaaS dashboard, neutral palette with one blue accent, built for expert operators; prioritize clarity and speed over decorative delight."

## Scripts

- `${CLAUDE_SKILL_DIR}/scripts/beuniq-init.ts`: deterministic creator/checker for `PRODUCT.md` and `DESIGN.md` project-context files.
- `${CLAUDE_SKILL_DIR}/scripts/beuniq-check.ts`: deterministic scanner, scorer, Markdown/JSON reporter, context-aware finding annotations, and conservative `--fix` mode.
- `${CLAUDE_SKILL_DIR}/scripts/beuniq-report.ts`: report writer for CI artifacts and saved audits.

Useful commands:

```bash
npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-init.ts --root . --check
npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-check.ts --root . --format markdown
npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-check.ts --root . --format json
npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-check.ts --root . --fix --format markdown
npx --yes tsx ${CLAUDE_SKILL_DIR}/scripts/beuniq-report.ts --root . --out beuniq-report.json
```

`npx --yes tsx` may download the TypeScript runner if it is not already available. The BeUniq checker itself must remain deterministic and must not make network calls or call AI APIs.

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
- Use AI APIs, screenshots, browser automation, or network services for v1 checks.

## Output Contract

Every audit should report pass/fail, AI-slop score, copy-slop score, taste score, design-quality score, stable rule ids, severity, evidence, file path and line, suggested targeted fix, and semantic/visual rules skipped from hard failure.

## Limitations

The bundled catalogs include the full SwipeUI-derived rulebase: 325 AI/design rules, 301 landing-copy rules, 74 legacy Uncodixify rules, and 18 code-detectable taste/motion-craft rules adapted from Emil Kowalski's MIT-licensed design-engineering skills. Code-only checks cannot prove rendered spacing, contrast, actual visual hierarchy, viewport behavior, animation feel, cross-page contradictions, testimonial authenticity, or screenshot-level polish. Keep those as skipped semantic/visual notes unless the user provides a separate visual review workflow.

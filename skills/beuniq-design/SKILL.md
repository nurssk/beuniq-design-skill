---
name: beuniq-design
description: Rule-based frontend design audit and targeted cleanup for detecting generic AI-generated UI patterns without AI APIs. Use when Codex is asked to make a React, Next.js, Vite, HTML, CSS, SCSS, or Tailwind UI feel less AI-generated, run an AI-slop/design-quality check, enforce BeUniq design criteria, or iterate until AI slop is at or below 20.
---

# BeUniq Design

## Overview

Use BeUniq to statically inspect frontend source code for AI-slop, landing-copy slop, and design-quality signals, apply targeted fixes, and re-check until the project passes. The workflow is code-only and must not call AI APIs, screenshot services, browser automation, telemetry endpoints, or external network services.

## Workflow

1. Read `references/rules.md` when the task involves explaining rule meaning, changing thresholds, adding rules, or deciding whether a finding is valid.
2. Run the checker from the target frontend repo:

```bash
npx --yes tsx /path/to/beuniq-design/scripts/beuniq-check.ts --root . --format markdown
```

3. Treat `aiSlop <= 20` and `copySlop <= 20` as passing unless the user gives a different threshold.
4. If the project fails, make targeted code changes only for reported findings. Preserve product meaning, content semantics, data fetching, routing, state management, component boundaries, accessibility intent, and existing design-system tokens.
5. Re-run the checker after each fix pass. Continue until the score passes or the remaining findings are marked visual-only/human-judgment.

## Scripts

- `scripts/beuniq-check.ts`: deterministic scanner, scorer, Markdown/JSON reporter, and conservative `--fix` mode.
- `scripts/beuniq-report.ts`: report writer for CI artifacts and saved audits.

Useful commands:

```bash
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
- design-quality score
- stable rule ids
- severity
- evidence
- file path and line
- suggested targeted fix
- semantic/visual rules skipped from hard failure

## Limitations

The bundled catalogs include the full SwipeUI-derived rulebase: 325 AI/design rules, 301 landing-copy rules, and 74 legacy Uncodixify rules. Code-only checks cannot prove rendered spacing, contrast, actual visual hierarchy, viewport behavior, animation feel, cross-page contradictions, testimonial authenticity, or screenshot-level polish. Keep those as skipped semantic/visual notes unless the user provides a separate visual review workflow.

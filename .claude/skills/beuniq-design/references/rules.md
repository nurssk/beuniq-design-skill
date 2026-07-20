# BeUniq Rule Catalog

The v1 checker is code-only. Rules marked `code` can affect pass/fail. Rules marked `visual-only` or `semantic` are reported as skipped because they need rendered screenshots, computed styles, metadata, cross-page context, or human judgment.

Passing threshold: `aiSlop <= 20` and `copySlop <= 20`.

Full machine-readable catalogs are included in:

- `references/catalogs/ai-slop-rules.json` — 325 SwipeUI BeUniq AI/design rules.
- `references/catalogs/landing-copy-rules.json` — 301 SwipeUI landing-copy rules.
- `references/catalogs/uncodixify-rules.json` — 74 legacy Uncodixify/design-quality rules.

## AI-Slop Rules

| id | severity | mode | Detectable signals | Targeted direction |
| --- | --- | --- | --- | --- |
| `oversized-radius` | medium | code | `rounded-2xl`, `rounded-3xl`, `border-radius >= 20px` | Use 8-12px radii for cards and 8-10px for buttons. |
| `pill-overload` | medium | code | repeated `rounded-full`, `border-radius: 999px`, pill buttons | Reserve pills for tags/filter chips; use normal button radii. |
| `gradient-overuse` | medium | code | `bg-gradient-*`, `linear-gradient`, `radial-gradient` | Use solid surfaces and hierarchy from layout/type. |
| `gradient-text` | medium | code | `bg-clip-text`, `background-clip: text` | Use solid, legible text. |
| `glow-heavy-ui` | medium | code | colored shadow utilities or saturated `box-shadow` | Use subtle neutral shadows or borders. |
| `glassmorphism-default` | medium | code | `backdrop-blur`, `backdrop-filter: blur`, translucent panels | Use solid panels with simple borders. |
| `dramatic-shadows` | medium | code | `shadow-xl`, `shadow-2xl`, large blur shadows | Keep elevation subtle and consistent. |
| `decorative-eyebrows` | low | code | uppercase micro labels above headings, eyebrow/kicker classes | Lead with clear headings, not decorative labels. |
| `uppercase-label-overuse` | low | code | repeated `uppercase` + `tracking-*` | Use sentence case except for rare intentional labels. |
| `fake-premium-copy` | low | code | generic SaaS phrases such as effortless, seamless, powerful, unlock, elevate | Replace with product-specific copy. |
| `formulaic-ai-copy` | medium | code | "not X, but Y", "in today's", "designed to help", "transform the way" | State concrete product value directly. |
| `centered-stack-default` | medium | code | many `text-center`, `items-center`, `mx-auto` in the same section | Add asymmetric hierarchy when appropriate. |
| `repetitive-equal-cards` | medium | code | repeated card blocks with identical class strings | Introduce meaningful hierarchy or grouping. |
| `overpadded-layout` | low | code | `py-24`, `py-32`, `p-12`, `p-16` | Reduce padding unless content density requires it. |
| `placeholder-dead-links` | low | code | `href="#"`, `javascript:void(0)`, lorem ipsum | Replace placeholders with real routes/actions or remove. |
| `fake-charts` | medium | code | decorative chart bars without data semantics | Use real data, labels, or remove chart decoration. |

## Design-Quality Rules

| id | severity | mode | Detectable signals | Targeted direction |
| --- | --- | --- | --- | --- |
| `missing-image-alt` | high | code | `<img>` without `alt` | Add meaningful alt text or `alt=""` for decorative images. |
| `icon-button-missing-label` | high | code | icon-only button without `aria-label`, title, or visible text | Add an accessible label. |
| `tiny-touch-targets` | medium | visual-only | rendered controls under 40px | Verify in browser; increase hit area if needed. |
| `weak-primary-action` | medium | visual-only | primary CTA lacks visual priority | Verify rendered hierarchy. |
| `mobile-viewport-height-risk` | medium | visual-only | fixed viewport heroes causing mobile clipping | Verify mobile rendering. |

## Scoring Notes

The checker caps repeated hits in the same group so one repeated style cannot dominate the entire score. AI-slop and design-quality are separate dimensions. `aiSlop` controls pass/fail; `designQuality` is reported so fixes are not mixed with taste-only signals.

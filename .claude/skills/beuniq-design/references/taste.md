# Taste Reference

This reference adds a deterministic taste layer to BeUniq. It is adapted from Emil Kowalski's public design-engineering skills, especially `emil-design-eng`, `apple-design`, `animation-vocabulary`, and `review-animations`. The source repository is MIT licensed.

The checker does not copy a visual judgment model. It turns a small set of high-signal craft principles into code-detectable findings.

## Principles

- Motion must have a purpose: spatial consistency, state indication, explanation, feedback, or preventing a jarring change.
- The more often users see an animation, the shorter and subtler it should be. Keyboard/high-frequency actions should usually not animate.
- Entering/responding UI should feel immediate. `ease-in` on UI is a taste failure because it delays the first visible response.
- Ordinary UI motion should stay under 300ms unless it is a modal, drawer, or explanatory moment.
- Animate explicit properties. Prefer `transform` and `opacity`; avoid `transition: all`.
- Do not animate from `scale(0)`. Use a small initial scale plus opacity.
- Popovers, dropdowns, menus, and tooltips should originate from their trigger. Modals are allowed to stay centered.
- Gesture-driven or rapidly-triggered motion should be interruptible. Avoid keyframes for toasts, toggles, and surfaces that may be re-triggered quickly.
- Reduced motion is mandatory for movement. Hover motion should be gated to hover-capable fine pointers.
- Pressable controls should give immediate active/pointer-down feedback when it fits the component.
- Typography craft matters: tracking, leading, and fixed pixel sizing should be deliberate, not decorative defaults.
- Translucent material and delight effects should be earned by hierarchy or product emotion, not stacked as generic polish.

## Code-Detectable Taste Rules

| id | category | Detects | Direction |
| --- | --- | --- | --- |
| `TASTE-MOT-001` | motionTiming | `transition-all`, `transition: all` | Animate explicit properties. |
| `TASTE-MOT-002` | motionTiming | `ease-in` on UI code | Use `ease-out` or a stronger custom curve for entering/responding UI. |
| `TASTE-MOT-003` | motionTiming | everyday UI duration above 300ms | Shorten normal UI motion. |
| `TASTE-MOT-004` | motionPurpose | command/search/shortcut surfaces with motion | Remove or drastically reduce high-frequency motion. |
| `TASTE-MOT-005` | motionPurpose | ambient pulse/float/bounce/spin | Delete idle decoration unless it communicates state. |
| `TASTE-PHY-001` | physicality | `scale(0)` / `scale-0` | Start from `scale(0.9-0.97)` plus opacity. |
| `TASTE-PHY-002` | physicality | trigger-anchored surface with center origin | Use trigger-aware transform origin. |
| `TASTE-PERF-001` | performance | animation of layout properties | Move to transform/opacity. |
| `TASTE-PERF-002` | performance | keyframes for rapidly triggered UI | Prefer interruptible transitions, WAAPI, or springs. |
| `TASTE-A11Y-001` | accessibility | movement without nearby reduced-motion handling | Add `prefers-reduced-motion`. |
| `TASTE-A11Y-002` | accessibility | hover transform without pointer/hover gating | Gate hover motion for fine pointers. |
| `TASTE-FBK-001` | interactionFeedback | many pressables without active feedback | Add subtle pointer-down feedback where appropriate. |
| `TASTE-FBK-002` | interactionFeedback | delayed press feedback | Show feedback on press, not after click completes. |
| `TASTE-TYP-001` | typographyCraft | decorative wide tracking | Use tracking by type size and purpose. |
| `TASTE-TYP-002` | typographyCraft | fixed px text sizing/leading | Prefer scalable type units. |
| `TASTE-PLT-001` | platformRestraint | stacked translucent surfaces | Use material sparingly and protect legibility. |
| `TASTE-PLT-002` | platformRestraint | hard dividers on floating chrome | Use contextual separation only where needed. |
| `TASTE-PLT-003` | platformRestraint | confetti/sparkles/bounce/magic delight | Remove delight that is not earned by the product moment. |

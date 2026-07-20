# BeUniq Design Skill

BeUniq is a rule-based Codex/Claude skill for detecting and reducing generic AI-generated UI patterns in frontend code. It does not call AI APIs, vision models, browser automation, telemetry endpoints, or external services.

The skill is designed for React, Next.js, Vite, static HTML, CSS, SCSS, and Tailwind-heavy projects. It statically inspects source code, visible copy, class names, inline styles, and CSS declarations, then scores design AI slop and landing-copy slop from `0` to `100`. A project passes when both `AI slop <= 20` and `Copy slop <= 20`.

The bundled reference catalog is derived from SwipeUI's BeUniq rulebase:

- 325 weighted AI/design slop rules from `aiSlopCatalog.ts`
- 301 landing-page copy rules from `landingCopyCatalog.ts`
- 74 legacy Uncodixify/design-quality rules from `uncodixifyRules.ts`

Because v1 is code-only, the checker hard-fails only rules that can be detected reliably from source text. Rules that require rendered DOM, screenshots, computed styles, metadata context, semantic judgment, or human review remain available as reference-only catalog entries.

## Install

### Codex

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo <owner>/beuniq-design-skill --path skills/beuniq-design --name beuniq-design
```

After installing the skill folder, run bundled scripts with a TypeScript runner:

```bash
npx --yes tsx ~/.codex/skills/beuniq-design/scripts/beuniq-check.ts --root /path/to/frontend --format markdown
```

`npx --yes tsx` may download the TypeScript runner if it is not already available. The BeUniq checker itself is deterministic and makes no network, telemetry, browser, or AI API calls.

### Claude Code

Use the bundled project skill directly from this repository, or copy it into your personal Claude skills folder:

```bash
mkdir -p ~/.claude/skills
cp -R .claude/skills/beuniq-design ~/.claude/skills/beuniq-design
```

Then invoke it in Claude Code with:

```text
/beuniq-design
```

The Claude skill is self-contained under `.claude/skills/beuniq-design/` and uses `${CLAUDE_SKILL_DIR}` so its scripts resolve from project, personal, or plugin skill locations.

For local development in this repository:

```bash
npm install
npm run beuniq:check -- --root ./tests/fixtures/sloppy --format markdown
npm test
```

## Usage

Audit a project:

```bash
npm run beuniq:check -- --root /path/to/frontend --format markdown
```

Write a JSON report:

```bash
npm run beuniq:report -- --root /path/to/frontend --out beuniq-report.json
```

Apply conservative class/style fixes and re-check:

```bash
npm run beuniq:check -- --root /path/to/frontend --fix --format markdown
```

The fixer only changes obvious code-level signals such as oversized radius utilities, pill overload, decorative gradients, glow shadows, glass blur, dramatic shadows, over-padding, and uppercase tracking. It does not redesign layouts, rewrite business logic, rename components, alter data fetching, or call external APIs.

## Scoring Model

BeUniq reports three dimensions:

- `aiSlop`: taste and pattern signals that make UI feel generated, such as huge rounded cards, gradient text, glow-heavy surfaces, generic premium copy, centered-stack defaults, and repetitive equal cards.
- `copySlop`: generic landing-page writing signals, such as vague transformation claims, generic CTAs, unsupported social proof, vague pricing language, fake testimonial patterns, repeated sentence structures, and promotional cliche density.
- `designQuality`: correctness and accessibility issues detectable from code, such as missing image alt text or unlabeled icon buttons.

Only code-detectable rules affect the v1 pass/fail result. Visual-only checks are listed as skipped because they need rendered screenshots, computed styles, or human judgment.

## Contributing

Keep the project deterministic and local-first:

- Do not add AI API calls.
- Do not add network calls to the checker.
- Keep rules stable by id.
- Add fixtures for every new rule.
- Prefer targeted, reversible fixes over broad redesigns.

## License

MIT.
# beuniq-design-skill

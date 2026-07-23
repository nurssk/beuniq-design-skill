import { constants as fsConstants, promises as fs } from "node:fs";
import path from "node:path";

type Format = "json" | "markdown";

type InitOptions = {
  root: string;
  check: boolean;
  force: boolean;
  format: Format;
  fields: Record<string, string>;
};

type ContextStatus = {
  root: string;
  productPath: string;
  designPath: string;
  hasProduct: boolean;
  hasDesign: boolean;
  ready: boolean;
  created: string[];
  skipped: string[];
};

const FIELD_FLAGS = new Set([
  "product",
  "audience",
  "goal",
  "voice",
  "references",
  "constraints",
  "do-not-change",
  "theme",
  "style",
  "colors",
  "density",
  "typography",
  "motion",
  "motion-library",
  "motion-style",
  "selected-style-profile",
  "profile-source",
  "company-style-category",
  "company-style-reference",
  "custom-overrides",
  "component-library",
  "components",
  "button-style",
  "field-style",
  "card-style",
  "modal-style",
  "header-style",
  "hero-style",
  "pricing-style",
  "how-it-works-style",
  "text-animation-style",
  "scroll-style",
  "layout-patterns",
  "screen-templates",
  "rule-priorities",
  "visual-review-needed"
]);

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const status = await runBeUniqInit(options);
    const body = options.format === "json" ? `${JSON.stringify(status, null, 2)}\n` : formatMarkdown(status);
    process.stdout.write(body);
    process.exitCode = status.ready ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

export async function runBeUniqInit(options: InitOptions): Promise<ContextStatus> {
  const root = path.resolve(options.root);
  const productPath = path.join(root, "PRODUCT.md");
  const designPath = path.join(root, "DESIGN.md");
  const status: ContextStatus = {
    root,
    productPath,
    designPath,
    hasProduct: await exists(productPath),
    hasDesign: await exists(designPath),
    ready: false,
    created: [],
    skipped: []
  };

  if (!options.check) {
    await fs.mkdir(root, { recursive: true });
    if (!status.hasProduct || options.force) {
      await fs.writeFile(productPath, productTemplate(options.fields), "utf8");
      status.created.push("PRODUCT.md");
      status.hasProduct = true;
    } else {
      status.skipped.push("PRODUCT.md");
    }

    if (!status.hasDesign || options.force) {
      await fs.writeFile(designPath, designTemplate(options.fields), "utf8");
      status.created.push("DESIGN.md");
      status.hasDesign = true;
    } else {
      status.skipped.push("DESIGN.md");
    }
  }

  status.ready = status.hasProduct && status.hasDesign;
  return status;
}

export function parseArgs(argv: string[]): InitOptions {
  const options: InitOptions = {
    root: process.cwd(),
    check: false,
    force: false,
    format: "markdown",
    fields: {}
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      options.root = requireValue(argv, ++index, "--root");
    } else if (arg === "--check") {
      options.check = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--format") {
      const value = requireValue(argv, ++index, "--format");
      if (value !== "json" && value !== "markdown") throw new Error("--format must be json or markdown.");
      options.format = value;
    } else if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (!FIELD_FLAGS.has(key)) throw new Error(`Unknown argument: ${arg}`);
      options.fields[key] = requireValue(argv, ++index, arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function productTemplate(fields: Record<string, string>): string {
  return `# Product

${value(fields.product)}

## Audience

${value(fields.audience)}

## Primary Design Goal

${value(fields.goal)}

## Voice And Copy Rules

${value(fields.voice)}

## References

${value(fields.references)}

## Constraints

${value(fields.constraints)}

## Do Not Change

${value(fields["do-not-change"])}
`;
}

function designTemplate(fields: Record<string, string>): string {
  return `# Design

## Theme

${value(fields.theme)}

## Style Direction

${value(fields.style)}

## Color Direction

${value(fields.colors)}

## Density

${value(fields.density)}

## Typography

${value(fields.typography)}

## Motion

${value(fields.motion)}

## Motion Library

${value(fields["motion-library"])}

## Motion Style

${value(fields["motion-style"])}

## Selected Style Profile

${value(fields["selected-style-profile"])}

## Profile Source

${value(fields["profile-source"])}

## Company Style Category

${value(fields["company-style-category"])}

## Company Style Reference

${value(fields["company-style-reference"])}

## Custom Overrides

${value(fields["custom-overrides"])}

## Design System Source

${value(fields["component-library"])}

## Components

${value(fields.components)}

## Button Style

${value(fields["button-style"])}

## Field Style

${value(fields["field-style"])}

## Card Style

${value(fields["card-style"])}

## Modal Style

${value(fields["modal-style"])}

## Header Style

${value(fields["header-style"])}

## Hero Style

${value(fields["hero-style"])}

## Pricing Style

${value(fields["pricing-style"])}

## How It Works Style

${value(fields["how-it-works-style"])}

## Text Animation Style

${value(fields["text-animation-style"])}

## Scroll Style

${value(fields["scroll-style"])}

## Layout And Screen Patterns

${value(fields["layout-patterns"])}

## Screen Templates

${value(fields["screen-templates"])}

## BeUniq Rule Priorities

${value(fields["rule-priorities"])}

## Visual Review Needed

${value(fields["visual-review-needed"])}
`;
}

function value(input: string | undefined): string {
  const text = input?.trim();
  return text ? text : "TBD";
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function formatMarkdown(status: ContextStatus): string {
  const lines = [
    "# BeUniq Project Context",
    "",
    `- Root: \`${status.root}\``,
    `- PRODUCT.md: ${status.hasProduct ? "present" : "missing"}`,
    `- DESIGN.md: ${status.hasDesign ? "present" : "missing"}`,
    `- Status: ${status.ready ? "READY" : "MISSING_CONTEXT"}`
  ];
  if (status.created.length) lines.push(`- Created: ${status.created.map((file) => `\`${file}\``).join(", ")}`);
  if (status.skipped.length) lines.push(`- Skipped existing files: ${status.skipped.map((file) => `\`${file}\``).join(", ")}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function printHelpAndExit(): never {
  console.log(`Usage: beuniq-init --root <frontend> [--check] [--force] [--format json|markdown]

Creates PRODUCT.md and DESIGN.md project-context files for BeUniq design work.
Pass intake answers with flags such as --product, --audience, --goal, --theme, --style, --colors, --density, --motion, --motion-library, --motion-style, --selected-style-profile, --profile-source, --company-style-category, --company-style-reference, --custom-overrides, --component-library, --button-style, --field-style, --card-style, --modal-style, --header-style, --hero-style, --pricing-style, --how-it-works-style, --text-animation-style, and --scroll-style.`);
  process.exit(0);
}

void main();

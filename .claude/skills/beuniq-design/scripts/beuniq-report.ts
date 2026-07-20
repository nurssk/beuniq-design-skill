import { promises as fs } from "node:fs";
import path from "node:path";
import { formatJson, formatMarkdown, parseArgs, runBeUniqCheck } from "./beuniq-check.js";

type ReportOptions = ReturnType<typeof parseArgs> & {
  out: string;
};

function parseReportArgs(argv: string[]): ReportOptions {
  let out = "beuniq-report.json";
  const forwarded: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      const value = argv[++index];
      if (!value) throw new Error("--out requires a file path.");
      out = value;
    } else {
      forwarded.push(arg);
    }
  }

  return { ...parseArgs(forwarded), out };
}

async function main() {
  try {
    const options = parseReportArgs(process.argv.slice(2));
    const report = await runBeUniqCheck(options);
    const body = options.out.endsWith(".md") ? formatMarkdown(report) : formatJson(report);
    const outputPath = path.resolve(options.out);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, body);
    console.log(`Wrote ${outputPath}`);
    process.exitCode = report.passed ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

void main();

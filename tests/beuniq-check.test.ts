import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(repoRoot, "skills/beuniq-design/scripts/beuniq-check.ts");

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

const sloppy = path.join(repoRoot, "tests/fixtures/sloppy");
const clean = path.join(repoRoot, "tests/fixtures/clean");
const tailwindHeavy = path.join(repoRoot, "tests/fixtures/tailwind-heavy");
const cssModule = path.join(repoRoot, "tests/fixtures/css-module");
const dashboard = path.join(repoRoot, "tests/fixtures/dashboard");
const copyOnly = path.join(repoRoot, "tests/fixtures/copy-only");

const sloppyResult = runCheck(sloppy);
assert.equal(sloppyResult.status, 1);
assert.equal(sloppyResult.report.passed, false);
assert.ok(sloppyResult.report.aiSlopScore > 20);
assert.ok(sloppyResult.report.findings.some((finding: { ruleId: string }) => finding.ruleId === "CRD-002"));
assert.ok(sloppyResult.report.findings.some((finding: { file: string; line: number }) => finding.file === "App.tsx" && finding.line > 0));
assert.ok(sloppyResult.report.findings.some((finding: { ruleId: string }) => finding.ruleId === "missing-image-alt"));
assert.ok(sloppyResult.report.scoring.aiSlop.categoryScores.some((score: { category: string; capped: number }) => score.category === "cards" && score.capped === 12));
assert.ok(sloppyResult.report.findings.some((finding: { ruleId: string; countedContribution?: number }) => finding.ruleId === "CRD-002" && Number(finding.countedContribution) > 0));

const tmp = mkdtempSync(path.join(tmpdir(), "beuniq-sloppy-"));
try {
  cpSync(sloppy, tmp, { recursive: true });
  const fixedResult = runCheck(tmp, ["--fix"]);
  assert.equal(fixedResult.report.fixedFiles.length, 1);
  const afterFix = runCheck(tmp);
  assert.equal(afterFix.report.passed, true);
  assert.ok(afterFix.report.aiSlopScore <= 20);
  assert.ok(afterFix.report.copySlopScore <= 20);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const copyOnlyResult = runCheck(copyOnly);
assert.equal(copyOnlyResult.status, 1);
assert.equal(copyOnlyResult.report.passed, false);
assert.ok(copyOnlyResult.report.aiSlopScore <= 20);
assert.ok(copyOnlyResult.report.copySlopScore > 20);
assert.ok(copyOnlyResult.report.findings.some((finding: { ruleId: string }) => finding.ruleId === "LP-LEX-001"));
assert.ok(copyOnlyResult.report.scoring.copySlop.activeCategories >= 3);

for (const fixture of [clean, tailwindHeavy, cssModule, dashboard]) {
  const result = runCheck(fixture);
  assert.equal(result.status, 0, `${fixture} should pass`);
  assert.equal(result.report.passed, true);
  assert.ok(result.report.aiSlopScore <= 20);
}

const cleanReport = runCheck(clean).report;
assert.equal(cleanReport.catalogCoverage.aiSlopRules, 325);
assert.equal(cleanReport.catalogCoverage.landingCopyRules, 301);
assert.equal(cleanReport.catalogCoverage.legacyRules, 74);
assert.ok(cleanReport.catalogCoverage.codeDetectedCatalogRules > 100);
assert.ok(cleanReport.catalogCoverage.legacyCodeRules > 10);
const visualRules = cleanReport.skippedRuleExamples;
assert.ok(visualRules.some((rule: { id: string }) => rule.id === "tiny-touch-targets"));

const duplicateIds = sloppyResult.report.findings.filter((finding: { ruleId: string }) => finding.ruleId === "oversized-radius");
assert.equal(duplicateIds.length, 0, "legacy radius rule should not double-count when catalog CRD rules fire");

const checkerSource = readFileSync(checker, "utf8");
assert.doesNotMatch(checkerSource, /\bfetch\s*\(|https?:\/\/|GoogleGenAI|openai|anthropic|gemini/i);

console.log("PASS beuniq-check fixtures, fix loop, stable evidence, and no-network constraints.");

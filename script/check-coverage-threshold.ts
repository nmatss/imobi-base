#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type CoverageMetric = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};

type CoverageSummary = {
  total: {
    lines: CoverageMetric;
    statements: CoverageMetric;
    functions: CoverageMetric;
    branches: CoverageMetric;
  };
};

const threshold = Number(process.argv[2] ?? process.env.COVERAGE_THRESHOLD ?? 80);
const summaryPath = resolve(process.cwd(), "coverage/coverage-summary.json");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
  fail(`Invalid coverage threshold: ${String(process.argv[2])}`);
}

let summary: CoverageSummary;
try {
  summary = JSON.parse(readFileSync(summaryPath, "utf8")) as CoverageSummary;
} catch {
  fail(`Coverage summary not found at ${summaryPath}. Run npm run test:coverage first.`);
}

const metrics = summary.total;
const failures = Object.entries(metrics)
  .filter(([, metric]) => metric.pct < threshold)
  .map(([name, metric]) => `${name}: ${metric.pct}% < ${threshold}% (${metric.covered}/${metric.total})`);

console.log(`Coverage threshold: ${threshold}%`);
for (const [name, metric] of Object.entries(metrics)) {
  console.log(`${name}: ${metric.pct}% (${metric.covered}/${metric.total})`);
}

if (failures.length > 0) {
  console.error("\nCoverage gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nCoverage gate passed.");

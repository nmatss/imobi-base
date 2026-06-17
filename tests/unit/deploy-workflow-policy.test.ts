import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production deploy workflow policy", () => {
  it("does not run blind database migrations after production deploy", () => {
    const workflow = readFileSync(".github/workflows/deploy-production.yml", "utf8");

    expect(workflow).not.toContain("npm run db:migrate");
    expect(workflow).toContain("Automatic production migrations are disabled by policy.");
    expect(workflow).toContain("npm run ops:cron:verify");
    expect(workflow).toContain("url: https://imobibase.com.br");
  });

  it("keeps Playwright runtime artifacts out of source control", () => {
    const gitignore = readFileSync(".gitignore", "utf8");

    expect(gitignore).toContain("test-results/");
    expect(gitignore).toContain("playwright-report/");
  });
});

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

  it("keeps the manual production deploy behind the same strict readiness gate", () => {
    const script = readFileSync("scripts/deploy.sh", "utf8");

    expect(script).toContain("npm run check:scripts");
    expect(script).toContain("npm run lint -- --quiet");
    expect(script).toContain("npm run ops:go-live:verify:strict");
    expect(script).toContain("vercel build --prod");
    expect(script).toContain("vercel deploy --prebuilt --prod");
    expect(script).toContain("Automatic production migrations are disabled.");
    expect(script).toContain('HEALTH_URL="https://imobibase.com.br/api/health"');
    expect(script).toContain('if [[ "$PUSH_RELEASE_TAG" == "true" ]]');
    expect(script).toContain('if [[ "$DEPLOYED" != "true" ]]');
    expect(script).not.toContain('HEALTH_URL="https://imobibase.com/api/health"');
    expect(script).not.toContain('Production URL: https://imobibase.com"');
    expect(script).not.toContain('npm run db:migrate:indexes || log_warn "Database migrations failed"');
  });

  it("uses the canonical production domain in rollback health checks", () => {
    const script = readFileSync("scripts/rollback.sh", "utf8");

    expect(script).toContain('HEALTH_URL="https://imobibase.com.br/api/health"');
    expect(script).toContain("Production URL: https://imobibase.com.br");
    expect(script).toContain("Vercel rollback requires an explicit deployment URL or deployment ID.");
    expect(script).toContain('vercel rollback "$VERSION" --yes');
    expect(script).not.toContain('git checkout "$PREVIOUS_COMMIT"');
    expect(script).not.toContain('git checkout HEAD~1');
    expect(script).not.toContain('HEALTH_URL="https://imobibase.com/api/health"');
  });

  it("only notifies Sentry after a successful production health check", () => {
    const workflow = readFileSync(".github/workflows/deploy-production.yml", "utf8");
    const healthIndex = workflow.indexOf("- name: Health Check");
    const sentryIndex = workflow.indexOf("- name: Notify Sentry of Deployment");

    expect(healthIndex).toBeGreaterThan(-1);
    expect(sentryIndex).toBeGreaterThan(healthIndex);
    expect(workflow).toContain("if: success() && steps.deploy.outputs.DEPLOY_URL != ''");
    expect(workflow).not.toContain("if: always()\n        run: |\n          curl -X POST \"https://sentry.io");
  });

  it("keeps Playwright runtime artifacts out of source control", () => {
    const gitignore = readFileSync(".gitignore", "utf8");

    expect(gitignore).toContain("test-results/");
    expect(gitignore).toContain("playwright-report/");
  });
});

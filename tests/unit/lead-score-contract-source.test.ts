import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("lead score API/UI contract", () => {
  it("keeps the backend calculate route aligned with the frontend route", () => {
    const routes = read("server/routes-features.ts");
    const component = read("client/src/components/leads/LeadScoreDisplay.tsx");

    expect(routes).toContain('app.post("/api/leads/:leadId/score/calculate"');
    expect(routes).toContain("calculateAndPersistLeadScore");
    expect(component).toContain("`/api/leads/${leadId}/score/calculate`");
  });

  it("returns frontend-compatible score metadata", () => {
    const routes = read("server/routes-features.ts");

    expect(routes).toContain("formatLeadScoreResponse");
    expect(routes).toContain("trend: getScoreTrend(scoreHistory)");
    expect(routes).toContain("calculatedAt");
    expect(routes).toContain("lastCalculated");
    expect(routes).toContain("parseScoreHistory");
  });

  it("treats an uncalculated lead score as an empty UI state", () => {
    const component = read("client/src/components/leads/LeadScoreDisplay.tsx");

    expect(component).toContain("useQuery<LeadScore | null>");
    expect(component).toContain("payload.calculated === false ? null : payload");
    expect(component).toContain("if (!score)");
  });
});

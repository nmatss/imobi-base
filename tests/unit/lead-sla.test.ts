import { describe, expect, it } from "vitest";
import { calculateLeadSlaStatus, summarizeLeadSla } from "../../server/services/lead-sla";
import type { LeadSlaLead } from "../../server/services/lead-sla";

const now = new Date("2026-06-17T15:00:00.000Z");

function lead(overrides: Partial<LeadSlaLead> = {}): LeadSlaLead {
  return {
    id: "lead-1",
    status: "new",
    assignedTo: "broker-1",
    createdAt: "2026-06-17T14:00:00.000Z",
    updatedAt: "2026-06-17T14:00:00.000Z",
    ...overrides,
  };
}

describe("lead SLA", () => {
  it("marks first response as met when interaction happens within 15 minutes", () => {
    const sla = calculateLeadSlaStatus(
      lead(),
      [{ createdAt: "2026-06-17T14:10:00.000Z" }],
      now,
    );

    expect(sla.firstResponseStatus).toBe("met");
    expect(sla.firstResponseMinutes).toBe(10);
    expect(sla.priority).toBe("low");
  });

  it("marks first response as late when interaction happens after target", () => {
    const sla = calculateLeadSlaStatus(
      lead(),
      [{ createdAt: "2026-06-17T14:30:00.000Z" }],
      now,
    );

    expect(sla.firstResponseStatus).toBe("late");
    expect(sla.firstResponseMinutes).toBe(30);
    expect(sla.priority).toBe("high");
  });

  it("prioritizes unassigned leads before any other action", () => {
    const sla = calculateLeadSlaStatus(
      lead({ assignedTo: null }),
      [{ createdAt: "2026-06-17T14:05:00.000Z" }],
      now,
    );

    expect(sla.priority).toBe("urgent");
    expect(sla.nextAction).toBe("Distribuir lead para um corretor");
  });

  it("detects stale qualification leads", () => {
    const sla = calculateLeadSlaStatus(
      lead({
        status: "qualification",
        updatedAt: "2026-06-16T12:00:00.000Z",
      }),
      [{ createdAt: "2026-06-16T12:05:00.000Z" }],
      now,
    );

    expect(sla.stale).toBe(true);
    expect(sla.priority).toBe("high");
    expect(sla.nextAction).toBe("Reativar contato e registrar próxima ação");
  });

  it("uses the latest interaction to decide if a lead is stale", () => {
    const sla = calculateLeadSlaStatus(
      lead({
        status: "qualification",
        updatedAt: "2026-06-15T12:00:00.000Z",
      }),
      [
        { createdAt: "2026-06-15T12:05:00.000Z" },
        { createdAt: "2026-06-17T14:30:00.000Z" },
      ],
      now,
    );

    expect(sla.stale).toBe(false);
    expect(sla.staleHours).toBe(0);
  });

  it("summarizes SLA totals", () => {
    const leads = [
      lead({ id: "lead-1" }),
      lead({ id: "lead-2", assignedTo: null }),
      lead({ id: "lead-3", status: "qualification", updatedAt: "2026-06-16T12:00:00.000Z" }),
    ];
    const interactionsByLeadId = new Map([
      ["lead-1", [{ createdAt: "2026-06-17T14:30:00.000Z" }]],
      ["lead-3", [{ createdAt: "2026-06-16T12:05:00.000Z" }]],
    ]);

    const summary = summarizeLeadSla(leads, interactionsByLeadId, now);

    expect(summary.totals).toEqual({
      total: 3,
      pendingFirstResponse: 1,
      lateFirstResponse: 1,
      stale: 1,
      urgent: 1,
      unassigned: 1,
    });
  });

  it("rejects invalid lead dates", () => {
    expect(() =>
      calculateLeadSlaStatus(
        lead({ createdAt: "invalid-date" }),
        [],
        now,
      ),
    ).toThrow("Data inválida em createdAt");
  });
});

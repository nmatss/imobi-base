import { describe, expect, it, vi } from "vitest";
import {
  createVisitWithPolicy,
  findVisitSchedulingConflict,
  formatVisitSchedulingConflict,
  type VisitScheduleCreateInput,
  type VisitSchedulePolicyResources,
} from "../../server/services/visit-scheduling";

const baseVisit = {
  id: "visit-1",
  propertyId: "property-1",
  assignedTo: "broker-1",
  scheduledFor: "2026-06-17T13:00:00.000Z",
  status: "scheduled",
};

describe("visit scheduling conflicts", () => {
  it("blocks overlapping active visits for the same property", () => {
    const conflict = findVisitSchedulingConflict([baseVisit], {
      propertyId: "property-1",
      assignedTo: "broker-2",
      scheduledFor: "2026-06-17T13:30:00.000Z",
      status: "scheduled",
    });

    expect(conflict?.reason).toBe("property");
    expect(formatVisitSchedulingConflict(conflict!)).toContain("Imóvel indisponível");
  });

  it("blocks overlapping active visits for the same broker", () => {
    const conflict = findVisitSchedulingConflict([baseVisit], {
      propertyId: "property-2",
      assignedTo: "broker-1",
      scheduledFor: "2026-06-17T13:45:00.000Z",
      status: "scheduled",
    });

    expect(conflict?.reason).toBe("broker");
    expect(formatVisitSchedulingConflict(conflict!)).toContain("Corretor indisponível");
  });

  it("allows different broker and property in the same slot", () => {
    expect(
      findVisitSchedulingConflict([baseVisit], {
        propertyId: "property-2",
        assignedTo: "broker-2",
        scheduledFor: "2026-06-17T13:30:00.000Z",
        status: "scheduled",
      }),
    ).toBeNull();
  });

  it("ignores completed and cancelled visits", () => {
    const inactiveVisits = [
      { ...baseVisit, id: "completed", status: "completed" },
      { ...baseVisit, id: "cancelled", status: "cancelled" },
    ];

    expect(
      findVisitSchedulingConflict(inactiveVisits, {
        propertyId: "property-1",
        assignedTo: "broker-1",
        scheduledFor: "2026-06-17T13:15:00.000Z",
        status: "scheduled",
      }),
    ).toBeNull();
  });

  it("allows back-to-back visits at the 60-minute boundary", () => {
    expect(
      findVisitSchedulingConflict([baseVisit], {
        propertyId: "property-1",
        assignedTo: "broker-1",
        scheduledFor: "2026-06-17T14:00:00.000Z",
        status: "scheduled",
      }),
    ).toBeNull();
  });

  it("ignores the current visit during reschedule validation", () => {
    expect(
      findVisitSchedulingConflict(
        [baseVisit],
        {
          propertyId: "property-1",
          assignedTo: "broker-1",
          scheduledFor: "2026-06-17T13:15:00.000Z",
          status: "scheduled",
        },
        "visit-1",
      ),
    ).toBeNull();
  });

  it("rejects invalid scheduled dates", () => {
    expect(() =>
      findVisitSchedulingConflict([], {
        propertyId: "property-1",
        assignedTo: "broker-1",
        scheduledFor: "not-a-date",
        status: "scheduled",
      }),
    ).toThrow("Data da visita inválida");
  });

  it("creates visits only after tenant and conflict policy passes", async () => {
    const resources = createPolicyResources();

    const visit = await createVisitWithPolicy("tenant-1", {
      tenantId: "tenant-1",
      propertyId: "property-1",
      leadId: "lead-1",
      assignedTo: "broker-1",
      scheduledFor: "2026-06-17T15:00:00.000Z",
      status: "scheduled",
    }, resources);

    expect(visit.id).toBe("created-visit");
    expect(resources.createVisit).toHaveBeenCalledTimes(1);
  });

  it("rejects visits for cross-tenant references", async () => {
    const resources = createPolicyResources({
      lead: { tenantId: "tenant-2" },
    });

    await expect(
      createVisitWithPolicy("tenant-1", {
        tenantId: "tenant-1",
        propertyId: "property-1",
        leadId: "lead-1",
        assignedTo: "broker-1",
        scheduledFor: "2026-06-17T15:00:00.000Z",
        status: "scheduled",
      }, resources),
    ).rejects.toMatchObject({ status: 404 });
    expect(resources.createVisit).not.toHaveBeenCalled();
  });

  it("rejects create-with-policy when an active visit conflicts", async () => {
    const resources = createPolicyResources({
      visits: [baseVisit],
    });

    await expect(
      createVisitWithPolicy("tenant-1", {
        tenantId: "tenant-1",
        propertyId: "property-1",
        leadId: "lead-1",
        assignedTo: "broker-2",
        scheduledFor: "2026-06-17T13:30:00.000Z",
        status: "scheduled",
      }, resources),
    ).rejects.toMatchObject({ status: 409 });
    expect(resources.createVisit).not.toHaveBeenCalled();
  });
});

function createPolicyResources(overrides: {
  property?: { tenantId: string } | null;
  lead?: { tenantId: string } | null;
  user?: { tenantId: string } | null;
  visits?: (typeof baseVisit)[];
} = {}): VisitSchedulePolicyResources<VisitScheduleCreateInput & { id: string }> & {
  createVisit: ReturnType<typeof vi.fn>;
} {
  return {
    getProperty: vi.fn(async () => overrides.property ?? { tenantId: "tenant-1" }),
    getLead: vi.fn(async () => overrides.lead ?? { tenantId: "tenant-1" }),
    getUser: vi.fn(async () => overrides.user ?? { tenantId: "tenant-1" }),
    getVisitsByTenant: vi.fn(async () => overrides.visits ?? []),
    createVisit: vi.fn(async (visit) => ({ ...visit, id: "created-visit" })),
  };
}

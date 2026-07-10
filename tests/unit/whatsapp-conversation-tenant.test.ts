import { beforeEach, describe, expect, it, vi } from "vitest";

type ColumnRef = { table: string; name: string };
type EqCondition = { op: "eq"; column: ColumnRef; value: unknown };
type AndCondition = { op: "and"; conditions: Condition[] };
type Condition = EqCondition | AndCondition;

const mocks = vi.hoisted(() => {
  const column = (table: string, name: string): ColumnRef => ({ table, name });
  const schema = {
    users: {
      id: column("users", "id"),
      tenantId: column("users", "tenant_id"),
    },
    whatsappConversations: {
      id: column("whatsapp_conversations", "id"),
      tenantId: column("whatsapp_conversations", "tenant_id"),
      unreadCount: column("whatsapp_conversations", "unread_count"),
      assignedTo: column("whatsapp_conversations", "assigned_to"),
      status: column("whatsapp_conversations", "status"),
      updatedAt: column("whatsapp_conversations", "updated_at"),
    },
    whatsappMessages: {
      conversationId: column("whatsapp_messages", "conversation_id"),
      tenantId: column("whatsapp_messages", "tenant_id"),
    },
  };

  const state = {
    selectRows: [] as Array<Record<string, unknown>>,
    updateRows: [] as Array<Record<string, unknown>>,
    selectWheres: [] as unknown[],
    updateWheres: [] as unknown[],
    updateSets: [] as Array<Record<string, unknown>>,
  };

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn((condition: unknown) => {
          state.selectWheres.push(condition);
          return {
            limit: vi.fn(async () => state.selectRows),
          };
        }),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((data: Record<string, unknown>) => {
        state.updateSets.push(data);
        return {
          where: vi.fn((condition: unknown) => {
            state.updateWheres.push(condition);
            return {
              returning: vi.fn(async () => state.updateRows),
            };
          }),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => state.updateRows),
      })),
    })),
  };

  return { db, schema, state };
});

vi.mock("drizzle-orm", () => ({
  and: (...conditions: Condition[]) => ({ op: "and", conditions }),
  desc: (column: ColumnRef) => ({ op: "desc", column }),
  eq: (column: ColumnRef, value: unknown) => ({ op: "eq", column, value }),
  sql: (...args: unknown[]) => ({ op: "sql", args }),
}));

vi.mock("@shared/schema", () => ({
  users: mocks.schema.users,
  whatsappConversations: mocks.schema.whatsappConversations,
  whatsappMessages: mocks.schema.whatsappMessages,
}));

vi.mock("../../server/db", () => ({
  db: mocks.db,
}));

vi.mock("../../server/utils/log", () => ({
  log: vi.fn(),
}));

const { conversationManager } = await import(
  "../../server/integrations/whatsapp/conversation-manager"
);

function flattenConditions(condition: unknown): EqCondition[] {
  const typed = condition as Condition;
  if (typed.op === "and") {
    return typed.conditions.flatMap(flattenConditions);
  }
  return [typed];
}

function expectConditionIncludes(
  condition: unknown,
  column: ColumnRef,
  value: unknown,
): void {
  expect(flattenConditions(condition)).toContainEqual({ op: "eq", column, value });
}

describe("WhatsApp conversation tenant isolation", () => {
  beforeEach(() => {
    mocks.state.selectRows = [];
    mocks.state.updateRows = [];
    mocks.state.selectWheres = [];
    mocks.state.updateWheres = [];
    mocks.state.updateSets = [];
    vi.clearAllMocks();
  });

  it("scopes generic conversation updates by conversation id and tenant id", async () => {
    mocks.state.updateRows = [{ id: "conv-1", tenantId: "tenant-1" }];

    const result = await conversationManager.updateConversation("conv-1", "tenant-1", {
      status: "closed",
    });

    expect(result).toEqual({ id: "conv-1", tenantId: "tenant-1" });
    expect(mocks.state.updateSets[0]).toMatchObject({ status: "closed" });
    expectConditionIncludes(
      mocks.state.updateWheres[0],
      mocks.schema.whatsappConversations.id,
      "conv-1",
    );
    expectConditionIncludes(
      mocks.state.updateWheres[0],
      mocks.schema.whatsappConversations.tenantId,
      "tenant-1",
    );
  });

  it("does not mark a conversation as read outside the authenticated tenant", async () => {
    mocks.state.updateRows = [];

    const updated = await conversationManager.markAsRead("conv-2", "tenant-1");

    expect(updated).toBe(false);
    expectConditionIncludes(
      mocks.state.updateWheres[0],
      mocks.schema.whatsappConversations.id,
      "conv-2",
    );
    expectConditionIncludes(
      mocks.state.updateWheres[0],
      mocks.schema.whatsappConversations.tenantId,
      "tenant-1",
    );
  });

  it("rejects assignment to a user from another tenant before updating", async () => {
    mocks.state.selectRows = [];

    const result = await conversationManager.assignToUser(
      "conv-1",
      "tenant-1",
      "user-from-other-tenant",
    );

    expect(result).toBeNull();
    expect(mocks.state.updateSets).toHaveLength(0);
    expectConditionIncludes(
      mocks.state.selectWheres[0],
      mocks.schema.users.id,
      "user-from-other-tenant",
    );
    expectConditionIncludes(
      mocks.state.selectWheres[0],
      mocks.schema.users.tenantId,
      "tenant-1",
    );
  });

  it("scopes assignment updates by conversation tenant after assignee validation", async () => {
    mocks.state.selectRows = [{ id: "user-1" }];
    mocks.state.updateRows = [{ id: "conv-1", tenantId: "tenant-1", assignedTo: "user-1" }];

    const result = await conversationManager.assignToUser(
      "conv-1",
      "tenant-1",
      "user-1",
    );

    expect(result).toEqual({ id: "conv-1", tenantId: "tenant-1", assignedTo: "user-1" });
    expect(mocks.state.updateSets[0]).toMatchObject({ assignedTo: "user-1" });
    expectConditionIncludes(
      mocks.state.updateWheres[0],
      mocks.schema.whatsappConversations.id,
      "conv-1",
    );
    expectConditionIncludes(
      mocks.state.updateWheres[0],
      mocks.schema.whatsappConversations.tenantId,
      "tenant-1",
    );
  });
});

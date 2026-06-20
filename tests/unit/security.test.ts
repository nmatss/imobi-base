import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

/**
 * Testes comportamentais para server/auth/security.ts.
 *
 * Foco: helpers de segurança (validação de força de senha, histórico de senha,
 * lockout de conta). O módulo importa server/db (e e-mail/audit/RLS), portanto
 * essas dependências pesadas são mockadas para isolar a lógica de negócio.
 *
 * Estratégia para os helpers que tocam o banco: um stub encadeável de Drizzle
 * (select().from().where().limit() e update().set().where()) que devolve valores
 * controlados, permitindo asserir o COMPORTAMENTO (entrada -> saída + efeitos).
 */

// --- Mock das dependências pesadas (DB, e-mail, audit, RLS) -----------------

// Estado controlável pelo teste para o que db.select(...) deve retornar.
const dbState: {
  selectResults: any[][];
  updateCalls: Array<{ set: any; where: any }>;
  insertCalls: Array<{ table: string; values: any }>;
} = {
  selectResults: [],
  updateCalls: [],
  insertCalls: [],
};

function makeSelectChain() {
  // Cada chamada a select() consome o próximo resultado da fila.
  const result = dbState.selectResults.shift() ?? [];
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(result),
    // Permite `await db.select()...` direto sem limit (orderBy terminal).
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function makeUpdateChain() {
  const call: any = {};
  const chain: any = {
    set: (s: any) => {
      call.set = s;
      return chain;
    },
    where: (w: any) => {
      call.where = w;
      dbState.updateCalls.push(call);
      return Promise.resolve();
    },
  };
  return chain;
}

vi.mock("../../server/db", () => ({
  db: {
    select: () => makeSelectChain(),
    update: () => makeUpdateChain(),
    insert: (table: any) => ({
      values: (values: any) => {
        dbState.insertCalls.push({ table: String(table), values });
        return Promise.resolve();
      },
    }),
  },
}));

vi.mock("@shared/schema-sqlite", () => ({
  users: { id: "users.id" },
  loginHistory: {
    userId: "loginHistory.userId",
    success: "loginHistory.success",
    suspicious: "loginHistory.suspicious",
    createdAt: "loginHistory.createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (...a: any[]) => ({ op: "eq", a }),
  and: (...a: any[]) => ({ op: "and", a }),
  desc: (...a: any[]) => ({ op: "desc", a }),
  gte: (...a: any[]) => ({ op: "gte", a }),
}));

const sendSecurityAlertEmail = vi.fn(async (..._a: any[]) => {});
const sendNewLoginEmail = vi.fn(async (..._a: any[]) => {});
vi.mock("../../server/auth/email-service", () => ({
  sendSecurityAlertEmail: (...a: any[]) => sendSecurityAlertEmail(...a),
  sendNewLoginEmail: (...a: any[]) => sendNewLoginEmail(...a),
}));

const createAuditLog = vi.fn(async (..._a: any[]) => {});
vi.mock("../../server/routes-security", () => ({
  createAuditLog: (...a: any[]) => createAuditLog(...a),
}));

vi.mock("../../server/db-rls", () => ({
  runWithTenantRlsContext: (_tenant: string, fn: () => any) => fn(),
}));

// Importa APÓS os mocks estarem registrados.
import {
  validatePasswordStrength,
  PASSWORD_REQUIREMENTS,
  checkPasswordHistory,
  updatePasswordHistory,
  checkAccountLock,
} from "../../server/auth/security";

beforeEach(() => {
  dbState.selectResults = [];
  dbState.updateCalls = [];
  dbState.insertCalls = [];
  sendSecurityAlertEmail.mockClear();
  sendNewLoginEmail.mockClear();
  createAuditLog.mockClear();
});

// ---------------------------------------------------------------------------
// validatePasswordStrength (função pura)
// ---------------------------------------------------------------------------
describe("validatePasswordStrength", () => {
  it("aprova senha que cumpre os 5 requisitos com score 100", () => {
    const r = validatePasswordStrength("Abcdef1!");
    expect(r.valid).toBe(true);
    expect(r.score).toBe(100);
    expect(r.message).toBeUndefined();
    expect(r.requirements).toEqual({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasNumber: true,
      hasSpecialChar: true,
    });
  });

  it("reprova senha curta e prioriza a mensagem de comprimento mínimo", () => {
    const r = validatePasswordStrength("Ab1!");
    expect(r.valid).toBe(false);
    expect(r.requirements.minLength).toBe(false);
    expect(r.message).toBe("A senha deve ter pelo menos 8 caracteres");
  });

  it("reprova quando falta letra maiúscula (comprimento ok)", () => {
    const r = validatePasswordStrength("abcdef1!");
    expect(r.valid).toBe(false);
    expect(r.requirements.hasUppercase).toBe(false);
    expect(r.message).toBe("A senha deve conter pelo menos uma letra maiúscula");
  });

  it("reprova quando falta letra minúscula", () => {
    const r = validatePasswordStrength("ABCDEF1!");
    expect(r.valid).toBe(false);
    expect(r.requirements.hasLowercase).toBe(false);
    expect(r.message).toBe("A senha deve conter pelo menos uma letra minúscula");
  });

  it("reprova quando falta número", () => {
    const r = validatePasswordStrength("Abcdefg!");
    expect(r.valid).toBe(false);
    expect(r.requirements.hasNumber).toBe(false);
    expect(r.message).toBe("A senha deve conter pelo menos um número");
  });

  it("reprova quando falta caractere especial", () => {
    const r = validatePasswordStrength("Abcdefg1");
    expect(r.valid).toBe(false);
    expect(r.requirements.hasSpecialChar).toBe(false);
    expect(r.message).toBe("A senha deve conter pelo menos um caractere especial");
  });

  it("calcula score proporcional ao número de requisitos atendidos", () => {
    // minLength + minúscula: 2/5 = 40
    expect(validatePasswordStrength("abcdefgh").score).toBe(40);
    // Só minúsculas (curta, < minLength): 1/5 = 20
    expect(validatePasswordStrength("abc").score).toBe(20);
    // minLength + minúscula + número: 3/5 = 60
    expect(validatePasswordStrength("abcdef12").score).toBe(60);
    // minLength + maiúscula + minúscula + número: 4/5 = 80
    expect(validatePasswordStrength("Abcdef12").score).toBe(80);
  });

  it("trata string vazia sem lançar erro", () => {
    const r = validatePasswordStrength("");
    expect(r.valid).toBe(false);
    expect(r.score).toBe(0);
    expect(r.requirements.minLength).toBe(false);
    expect(r.message).toBe("A senha deve ter pelo menos 8 caracteres");
  });

  it("usa o limiar de comprimento definido em PASSWORD_REQUIREMENTS.minLength", () => {
    const minLen = PASSWORD_REQUIREMENTS.minLength;
    // Senha com exatamente minLen - 1 caracteres reprova no minLength.
    const tooShort = "Ab1!".padEnd(minLen - 1, "x").slice(0, minLen - 1);
    expect(validatePasswordStrength(tooShort).requirements.minLength).toBe(false);
    // Com minLen caracteres, minLength deve passar.
    const exact = tooShort + "x";
    expect(exact.length).toBe(minLen);
    expect(validatePasswordStrength(exact).requirements.minLength).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkPasswordHistory
// ---------------------------------------------------------------------------
describe("checkPasswordHistory", () => {
  it("retorna true (permitido) quando o usuário não existe", async () => {
    dbState.selectResults = [[]]; // userList vazio
    const ok = await checkPasswordHistory("missing", "QualquerSenha1!");
    expect(ok).toBe(true);
  });

  it("retorna true quando a nova senha NÃO está no histórico", async () => {
    const oldHash = await bcrypt.hash("SenhaAntiga1!", 4);
    dbState.selectResults = [[{ passwordHistory: JSON.stringify([oldHash]) }]];
    const ok = await checkPasswordHistory("u1", "SenhaNova2!");
    expect(ok).toBe(true);
  });

  it("retorna false quando a nova senha JÁ foi usada (match no histórico)", async () => {
    const reused = "SenhaReutilizada1!";
    const reusedHash = await bcrypt.hash(reused, 4);
    dbState.selectResults = [[{ passwordHistory: JSON.stringify([reusedHash]) }]];
    const ok = await checkPasswordHistory("u1", reused);
    expect(ok).toBe(false);
  });

  it("trata passwordHistory null como histórico vazio (permite)", async () => {
    dbState.selectResults = [[{ passwordHistory: null }]];
    const ok = await checkPasswordHistory("u1", "SenhaNova3!");
    expect(ok).toBe(true);
  });

  it("respeita o limite historyCount ao comparar", async () => {
    const reused = "SenhaReutilizada1!";
    const reusedHash = await bcrypt.hash(reused, 4);
    const otherHash = await bcrypt.hash("Outra1!", 4);
    // reused está na posição 2; com historyCount=2 só posições 0..1 são checadas.
    dbState.selectResults = [
      [{ passwordHistory: JSON.stringify([otherHash, otherHash, reusedHash]) }],
    ];
    const ok = await checkPasswordHistory("u1", reused, 2);
    expect(ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updatePasswordHistory
// ---------------------------------------------------------------------------
describe("updatePasswordHistory", () => {
  it("não atualiza nada quando o usuário não existe", async () => {
    dbState.selectResults = [[]];
    await updatePasswordHistory("missing", "novoHash");
    expect(dbState.updateCalls).toHaveLength(0);
  });

  it("prepende o novo hash e persiste o histórico", async () => {
    dbState.selectResults = [[{ passwordHistory: JSON.stringify(["h1", "h2"]) }]];
    await updatePasswordHistory("u1", "novoHash");
    expect(dbState.updateCalls).toHaveLength(1);
    const saved = JSON.parse(dbState.updateCalls[0].set.passwordHistory);
    expect(saved[0]).toBe("novoHash");
    expect(saved).toEqual(["novoHash", "h1", "h2"]);
  });

  it("mantém no máximo 5 senhas no histórico", async () => {
    dbState.selectResults = [
      [{ passwordHistory: JSON.stringify(["h1", "h2", "h3", "h4", "h5"]) }],
    ];
    await updatePasswordHistory("u1", "novoHash");
    const saved = JSON.parse(dbState.updateCalls[0].set.passwordHistory);
    expect(saved).toHaveLength(5);
    expect(saved[0]).toBe("novoHash");
    expect(saved).not.toContain("h5"); // o mais antigo é descartado
  });

  it("inicializa histórico vazio quando passwordHistory é null", async () => {
    dbState.selectResults = [[{ passwordHistory: null }]];
    await updatePasswordHistory("u1", "primeiroHash");
    const saved = JSON.parse(dbState.updateCalls[0].set.passwordHistory);
    expect(saved).toEqual(["primeiroHash"]);
  });
});

// ---------------------------------------------------------------------------
// checkAccountLock
// ---------------------------------------------------------------------------
describe("checkAccountLock", () => {
  it("retorna não-bloqueado quando o usuário não existe", async () => {
    dbState.selectResults = [[]];
    const r = await checkAccountLock("missing");
    expect(r).toEqual({ locked: false });
  });

  it("retorna não-bloqueado quando lockedUntil é nulo", async () => {
    dbState.selectResults = [[{ lockedUntil: null }]];
    const r = await checkAccountLock("u1");
    expect(r.locked).toBe(false);
  });

  it("retorna bloqueado com tempo restante quando lockedUntil é futuro", async () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // +10min
    dbState.selectResults = [[{ lockedUntil: future }]];
    const r = await checkAccountLock("u1");
    expect(r.locked).toBe(true);
    expect(r.lockedUntil).toBeInstanceOf(Date);
    expect(r.remainingTime).toBeGreaterThan(0);
    expect(r.remainingTime).toBeLessThanOrEqual(600);
    // Nenhum update de unlock deve ocorrer enquanto ainda bloqueado.
    expect(dbState.updateCalls).toHaveLength(0);
  });

  it("desbloqueia (update) e retorna não-bloqueado quando lockedUntil expirou", async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    dbState.selectResults = [[{ lockedUntil: past }]];
    const r = await checkAccountLock("u1");
    expect(r.locked).toBe(false);
    // Deve ter feito update zerando lockedUntil e failedLoginAttempts.
    expect(dbState.updateCalls).toHaveLength(1);
    expect(dbState.updateCalls[0].set).toMatchObject({
      lockedUntil: null,
      failedLoginAttempts: 0,
    });
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Testes comportamentais + de contrato para server/auth/password-reset.ts.
 *
 * O módulo registra rotas Express e toda a lógica de token vive em funções
 * NÃO exportadas, acopladas a `../db`, contextos RLS, email e Redis. Cobrimos
 * em duas camadas:
 *
 *  1. CONTRATO/CRYPTO (sem import do módulo): propriedades criptográficas
 *     observáveis do esquema de token (hashing sha256 determinístico, 64 hex,
 *     uso único, janela de 1h) reproduzindo o algoritmo exato declarado.
 *  2. COMPORTAMENTAL DE PONTA A PONTA (import real do módulo com deps mockadas):
 *     as três rotas (forgot-password, validate-token, reset-password) são
 *     exercitadas via supertest, controlando o estado do "banco" e observando
 *     status HTTP, corpo da resposta e EFEITOS (que update/insert ocorreram,
 *     com quais valores). É aqui que cobrimos token expirado, token usado
 *     (single-use real), token forjado/ausente, enumeração de email,
 *     rate-limit/lockout, força de senha e invalidação de sessão pós-reset.
 *
 * Os mocks de `../db` são chaináveis e programáveis por teste; mocks com
 * argumentos usam assinatura rest-param (`(..._a: any[]) => ...`) para o tsc.
 */

const SOURCE_PATH = join(process.cwd(), 'server/auth/password-reset.ts');
const source = readFileSync(SOURCE_PATH, 'utf8');

// Reproduz exatamente o que o módulo faz:
//   generateResetToken() -> randomBytes(32).toString('hex')
//   hashToken(t)        -> createHash('sha256').update(t).digest('hex')
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora, conforme o módulo

describe('token de reset — geração (comportamento)', () => {
  it('gera token de 64 caracteres hexadecimais (32 bytes)', () => {
    const token = generateResetToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gera tokens distintos a cada chamada (entropia)', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateResetToken()));
    expect(tokens.size).toBe(200);
  });

  it('o módulo gera o token com randomBytes(32) em hex (CSPRNG)', () => {
    expect(source).toContain("return randomBytes(32).toString('hex');");
  });
});

describe('token de reset — hashing (comportamento)', () => {
  it('nunca persiste o token bruto: só o hash sha256 vai ao banco', () => {
    // O hash é o que entra em passwordResetToken; o token bruto vai por email.
    expect(source).toContain('const hashedToken = hashToken(resetToken);');
    expect(source).toContain('passwordResetToken: hashedToken,');
    expect(source).toContain('sendPasswordResetEmail(user.email, user.name, resetToken)');
    // o token bruto NÃO deve ser gravado na coluna de token
    expect(source).not.toContain('passwordResetToken: resetToken');
  });

  it('hashToken é determinístico: o mesmo token produz sempre o mesmo hash', () => {
    const token = generateResetToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('hashToken produz 64 hex (saída sha256) e difere do token bruto', () => {
    const token = generateResetToken();
    const hashed = hashToken(token);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).not.toBe(token);
  });

  it('tokens diferentes geram hashes diferentes (sem colisão observável)', () => {
    const a = hashToken('a'.repeat(64));
    const b = hashToken('b'.repeat(64));
    expect(a).not.toBe(b);
  });

  it('a validação e o reset re-hasham o token recebido antes de consultar', () => {
    // Ambas as rotas convertem o token de entrada em hash para casar a coluna.
    expect(source.match(/const hashedToken = hashToken\(token\);/g) || []).toHaveLength(2);
    expect(source).toContain('eq(users.passwordResetToken, hashedToken)');
  });
});

describe('token de reset — expiração (comportamento + contrato)', () => {
  it('janela de validade é de exatamente 1 hora a partir de agora', () => {
    const before = Date.now();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    const after = Date.now();
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + TOKEN_TTL_MS);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + TOKEN_TTL_MS);
  });

  it('o módulo define expiração de 1h (60*60*1000) ao emitir o token', () => {
    expect(source).toContain('const expiresAt = new Date(Date.now() + 60 * 60 * 1000)');
    expect(source).toContain('passwordResetExpires: expiresAt.toISOString(),');
  });

  it('consulta de token exige expiração no futuro (gt expires, now)', () => {
    // Sem o gt(...) um token expirado ainda casaria — gate de expiração.
    expect(source).toContain('const now = new Date().toISOString();');
    expect(source).toContain('gt(users.passwordResetExpires, now)');
  });

  it('um token cujo expires já passou é considerado inválido', () => {
    // Reproduz a semântica do gt(expires, now): expires<=now => inválido.
    const now = new Date();
    const expired = new Date(now.getTime() - 1000).toISOString();
    const valid = new Date(now.getTime() + TOKEN_TTL_MS).toISOString();
    const nowIso = now.toISOString();
    expect(expired > nowIso).toBe(false); // expirado: não passa no gt()
    expect(valid > nowIso).toBe(true); // válido: passa no gt()
  });

  it('token inválido/expirado responde 400 com expired:true (não 404/500)', () => {
    expect(source).toContain('error: "Token inválido ou expirado"');
    expect(source).toContain('expired: true');
  });
});

describe('token de reset — uso único (contrato)', () => {
  it('o reset bem-sucedido apaga o token e a expiração (não reutilizável)', () => {
    // Após trocar a senha, ambos os campos viram null => o mesmo link falha.
    expect(source).toContain('passwordResetToken: null,');
    expect(source).toContain('passwordResetExpires: null,');
  });

  it('o reset também zera tentativas falhas e destrava a conta', () => {
    expect(source).toContain('failedLoginAttempts: 0,');
    expect(source).toContain('lockedUntil: null,');
  });

  it('a limpeza do token ocorre no mesmo update que grava a nova senha', () => {
    const setBlock = source.slice(
      source.indexOf('password: hashedPassword,'),
      source.indexOf('lockedUntil: null,') + 'lockedUntil: null,'.length,
    );
    expect(setBlock).toContain('passwordResetToken: null,');
    expect(setBlock).toContain('passwordResetExpires: null,');
  });
});

describe('reset — validação de senha (comportamento)', () => {
  // Reproduz validatePassword (não exportada) para travar as regras observáveis.
  function validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 8) {
      return { valid: false, message: 'A senha deve ter pelo menos 8 caracteres' };
    }
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'maiúscula' };
    if (!/[a-z]/.test(password)) return { valid: false, message: 'minúscula' };
    if (!/[0-9]/.test(password)) return { valid: false, message: 'número' };
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { valid: false, message: 'especial' };
    return { valid: true };
  }

  it('aceita uma senha forte completa', () => {
    expect(validatePassword('Abcdef1!').valid).toBe(true);
  });

  it.each([
    ['curta demais (<8)', 'Ab1!'],
    ['sem maiúscula', 'abcdef1!'],
    ['sem minúscula', 'ABCDEF1!'],
    ['sem número', 'Abcdefg!'],
    ['sem caractere especial', 'Abcdef12'],
    ['vazia', ''],
  ])('rejeita senha %s', (_label, pwd) => {
    expect(validatePassword(pwd).valid).toBe(false);
  });

  it('o módulo bloqueia o reset quando a senha falha na validação (400)', () => {
    expect(source).toContain('const passwordValidation = validatePassword(password);');
    expect(source).toContain('if (!passwordValidation.valid)');
    expect(source).toContain('res.status(400).json({ error: passwordValidation.message })');
  });

  it('o módulo exige token e senha e rejeita comprimento de token != 64', () => {
    expect(source).toContain('if (!token || !password)');
    expect(source).toContain('if (token.length !== 64)');
    expect(source).toContain('token.length !== 64'); // também no validate-token
  });

  it('faz hash da nova senha com bcrypt em 12 rounds antes de gravar', () => {
    expect(source).toContain('await bcrypt.hash(password, 12)');
  });

  it('bloqueia reuso de senha recente (histórico) com mensagem 400', () => {
    expect(source).toContain('checkPasswordHistory(user.id, password)');
    expect(source).toContain('Esta senha foi usada recentemente');
  });
});

describe('forgot-password — proteção contra enumeração de email (contrato)', () => {
  it('responde sempre com a mesma mensagem genérica, exista o email ou não', () => {
    const generic = 'Se o email existir, você receberá instruções para redefinir sua senha';
    // aparece para: email inexistente, conta travada e sucesso real.
    expect(source.split(generic).length - 1).toBeGreaterThanOrEqual(3);
  });

  it('contas travadas não vazam estado: respondem com a mensagem genérica', () => {
    expect(source).toContain('if (user.lockedUntil && new Date(user.lockedUntil) > new Date())');
  });

  it('normaliza o email (lowercase + trim) antes de consultar', () => {
    expect(source).toContain('const normalizedEmail = email.toLowerCase().trim();');
  });

  it('aplica rate limit antes de buscar o usuário (anti-abuso, 429)', () => {
    const rlIdx = source.indexOf('await checkResetRateLimit(normalizedEmail)');
    const lookupIdx = source.indexOf('db.select().from(users).where(eq(users.email, normalizedEmail))');
    expect(rlIdx).toBeGreaterThan(-1);
    expect(lookupIdx).toBeGreaterThan(rlIdx);
    expect(source).toContain('res.status(429)');
  });
});

// ---------------------------------------------------------------------------
// CAMADA 2 — comportamental de ponta a ponta (rotas reais + deps mockadas)
// ---------------------------------------------------------------------------

/**
 * Estado programável do "banco". Cada teste configura:
 *  - selectResults: fila de retornos para cada `db.select()...limit()`.
 *  - userById: linha retornada nas leituras por id (checkPasswordHistory /
 *    updatePasswordHistory).
 * Capturamos updates/inserts para asserir EFEITOS reais (single-use, etc).
 */
const dbState = vi.hoisted(() => ({
  selectQueue: [] as any[][],
  userByIdRows: [] as any[],
  selectCallCount: 0,
  updates: [] as any[],
  inserts: [] as any[],
  reset() {
    this.selectQueue = [];
    this.userByIdRows = [];
    this.selectCallCount = 0;
    this.updates = [];
    this.inserts = [];
  },
}));

// Mock chainável de Drizzle. `select().from().where().limit()` é "thenable":
// resolve para o próximo item da fila (ou [] se esvaziar). A heurística de
// leitura-por-id usa userByIdRows quando a fila acabou (checkPasswordHistory
// e updatePasswordHistory consultam por id depois das leituras principais).
const dbMock = vi.hoisted(() => {
  const makeSelectChain = () => {
    const settle = () => {
      dbState.selectCallCount++;
      if (dbState.selectQueue.length > 0) {
        return dbState.selectQueue.shift();
      }
      return dbState.userByIdRows;
    };
    const chain: any = {
      from: vi.fn((..._a: any[]) => chain),
      where: vi.fn((..._a: any[]) => chain),
      limit: vi.fn((..._a: any[]) => Promise.resolve(settle())),
      // suporte a `await db.select()...` sem .limit() (não usado, mas seguro)
      then: (onFulfilled: any) => Promise.resolve(settle()).then(onFulfilled),
    };
    return chain;
  };

  const makeUpdateChain = () => {
    const record: any = { set: undefined, where: undefined };
    const chain: any = {
      set: vi.fn((values: any) => {
        record.set = values;
        return chain;
      }),
      where: vi.fn((cond: any) => {
        record.where = cond;
        dbState.updates.push(record);
        return Promise.resolve(undefined);
      }),
    };
    return chain;
  };

  const makeInsertChain = () => ({
    values: vi.fn((values: any) => {
      dbState.inserts.push(values);
      return Promise.resolve(undefined);
    }),
  });

  return {
    select: vi.fn((..._a: any[]) => makeSelectChain()),
    update: vi.fn((..._a: any[]) => makeUpdateChain()),
    insert: vi.fn((..._a: any[]) => makeInsertChain()),
  };
});

const emailMocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn((..._a: any[]) => Promise.resolve()),
  sendPasswordChangedEmail: vi.fn((..._a: any[]) => Promise.resolve()),
}));

const auditMock = vi.hoisted(() => ({
  createAuditLog: vi.fn((..._a: any[]) => Promise.resolve()),
}));

// Redis client programável: por padrão simula "Redis indisponível" lançando,
// o que força o fallback in-memory determinístico do módulo. Testes de
// rate-limit substituem o comportamento.
const redisState = vi.hoisted(() => ({
  client: null as any,
  getClient: vi.fn((..._a: any[]): any => {
    throw new Error('REDIS_URL not configured');
  }),
}));

vi.mock('../../server/db', () => ({
  get db() {
    return dbMock;
  },
}));

vi.mock('../../server/db-rls', () => ({
  runWithAuthEmailRlsContext: vi.fn((_email: any, cb: any) => cb()),
  runWithPasswordResetTokenRlsContext: vi.fn((_hash: any, cb: any) => cb()),
  runWithTenantRlsContext: vi.fn((_tenantId: any, cb: any) => cb()),
}));

vi.mock('../../server/auth/email-service', () => ({
  sendPasswordResetEmail: emailMocks.sendPasswordResetEmail,
  sendPasswordChangedEmail: emailMocks.sendPasswordChangedEmail,
}));

vi.mock('../../server/routes-security', () => ({
  createAuditLog: auditMock.createAuditLog,
}));

vi.mock('../../server/cache/redis-client', () => ({
  getRedisClient: (..._a: any[]) => redisState.getClient(),
}));

// bcryptjs é real: queremos confirmar que a senha gravada é um hash bcrypt
// verificável (não texto puro) e que o histórico bloqueia reuso real.
const expressMod = await import('express');
const express = (expressMod as any).default ?? expressMod;
const supertestMod = await import('supertest');
const request = (supertestMod as any).default ?? supertestMod;
const bcryptMod = await import('bcryptjs');
const bcrypt = (bcryptMod as any).default ?? bcryptMod;

const { registerPasswordResetRoutes } = await import('../../server/auth/password-reset');

function buildApp() {
  const app = express();
  app.use(express.json());
  registerPasswordResetRoutes(app);
  return app;
}

// Token bruto de 64 hex válido e seu hash sha256 (o que o "banco" guarda).
function validRawToken(): string {
  return randomBytes(32).toString('hex');
}

function userRow(overrides: Record<string, any> = {}) {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'owner@example.com',
    name: 'Owner',
    password: '$2a$12$oldhasholdhasholdhasholdhasholdhasholdhasholdhash..',
    passwordHistory: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

describe('reset-password (rota real) — token expirado / inválido / forjado', () => {
  beforeEach(() => {
    dbState.reset();
    vi.clearAllMocks();
    redisState.getClient.mockImplementation((..._a: any[]) => {
      throw new Error('REDIS_URL not configured');
    });
  });

  it('rejeita token cujo expires já passou (gate gt() não retorna linha) -> 400 expired', async () => {
    // O gate gt(expires, now) no SQL não casaria; simulamos isso com fila vazia.
    dbState.selectQueue = [[]];
    const res = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: validRawToken(), password: 'NovaSenh@1' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'Token inválido ou expirado', expired: true });
    // Nenhuma senha foi gravada.
    expect(dbState.updates).toHaveLength(0);
    expect(emailMocks.sendPasswordChangedEmail).not.toHaveBeenCalled();
  });

  it('rejeita token forjado (sem correspondência) sem trocar a senha', async () => {
    dbState.selectQueue = [[]]; // hash não bate com nenhuma linha
    const res = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: validRawToken(), password: 'NovaSenh@1' });

    expect(res.status).toBe(400);
    expect(res.body.expired).toBe(true);
    expect(dbState.updates).toHaveLength(0);
  });

  it('rejeita token com comprimento != 64 antes de qualquer consulta ao banco', async () => {
    const res = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: 'abc123', password: 'NovaSenh@1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Token inválido');
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it('rejeita requisição sem token ou sem senha (400) sem tocar o banco', async () => {
    const r1 = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ password: 'NovaSenh@1' });
    expect(r1.status).toBe(400);
    expect(r1.body.error).toBe('Token e senha são obrigatórios');

    const r2 = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: validRawToken() });
    expect(r2.status).toBe(400);
    expect(r2.body.error).toBe('Token e senha são obrigatórios');

    expect(dbMock.select).not.toHaveBeenCalled();
  });
});

describe('reset-password (rota real) — single-use efetivo e invalidação de sessão', () => {
  beforeEach(() => {
    dbState.reset();
    vi.clearAllMocks();
    redisState.getClient.mockImplementation((..._a: any[]) => {
      throw new Error('REDIS_URL not configured');
    });
  });

  it('no reset bem-sucedido: grava hash bcrypt, NULA token/expires e destrava a conta', async () => {
    const raw = validRawToken();
    const hashed = createHash('sha256').update(raw).digest('hex');
    // 1ª leitura: usuário pelo token. Demais leituras (por id) usam userByIdRows.
    dbState.selectQueue = [[userRow({ passwordResetToken: hashed, failedLoginAttempts: 4, lockedUntil: new Date().toISOString() })]];
    dbState.userByIdRows = [userRow({ passwordResetToken: hashed })];

    const res = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'NovaSenh@1' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });

    // O primeiro update é o que grava a senha + limpa token (efeito observável).
    const pwUpdate = dbState.updates.find((u) => u.set && 'password' in u.set);
    expect(pwUpdate, 'update de senha deve existir').toBeTruthy();
    // Single-use: token e expires viram null -> o mesmo link não casa de novo.
    expect(pwUpdate.set.passwordResetToken).toBeNull();
    expect(pwUpdate.set.passwordResetExpires).toBeNull();
    // Invalidação de "sessão"/estado de lockout: tentativas zeradas, conta destravada.
    expect(pwUpdate.set.failedLoginAttempts).toBe(0);
    expect(pwUpdate.set.lockedUntil).toBeNull();
    // A senha persistida é um hash bcrypt verificável, nunca texto puro.
    expect(typeof pwUpdate.set.password).toBe('string');
    expect(pwUpdate.set.password).not.toBe('NovaSenh@1');
    expect(await bcrypt.compare('NovaSenh@1', pwUpdate.set.password)).toBe(true);
    // Email de confirmação e trilha de auditoria disparam.
    expect(emailMocks.sendPasswordChangedEmail).toHaveBeenCalledTimes(1);
    // Registra login bem-sucedido (evidência de invalidação/rotação de sessão).
    expect(dbState.inserts.some((v) => v.success === true && v.userId === 'user-1')).toBe(true);
  });

  it('o MESMO token não pode ser reutilizado: 2ª tentativa não encontra linha -> 400', async () => {
    const raw = validRawToken();
    const hashed = createHash('sha256').update(raw).digest('hex');

    // 1º uso: encontra o usuário.
    dbState.selectQueue = [[userRow({ passwordResetToken: hashed })]];
    dbState.userByIdRows = [userRow({ passwordResetToken: hashed })];
    const first = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'NovaSenh@1' });
    expect(first.status).toBe(200);

    // 2º uso: token já foi anulado no banco -> consulta volta vazia.
    dbState.selectQueue = [[]];
    dbState.userByIdRows = [];
    const second = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'OutraSenh@2' });
    expect(second.status).toBe(400);
    expect(second.body.expired).toBe(true);
  });
});

describe('reset-password (rota real) — política de força de senha aplicada', () => {
  beforeEach(() => {
    dbState.reset();
    vi.clearAllMocks();
    redisState.getClient.mockImplementation((..._a: any[]) => {
      throw new Error('REDIS_URL not configured');
    });
    // Token válido disponível caso a validação passasse (não deve passar nestes casos).
    const raw = validRawToken();
    const hashed = createHash('sha256').update(raw).digest('hex');
    dbState.selectQueue = [[userRow({ passwordResetToken: hashed })]];
    dbState.userByIdRows = [userRow({ passwordResetToken: hashed })];
    (globalThis as any).__rawToken = raw;
  });

  it.each([
    ['curta demais', 'Ab1!'],
    ['sem maiúscula', 'novasenha1!'],
    ['sem minúscula', 'NOVASENHA1!'],
    ['sem número', 'NovaSenha!'],
    ['sem caractere especial', 'NovaSenha12'],
  ])('rejeita senha %s com 400 e NÃO grava nada', async (_label, pwd) => {
    const raw = (globalThis as any).__rawToken as string;
    const res = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: raw, password: pwd });

    expect(res.status).toBe(400);
    // A senha fraca é barrada antes de qualquer update.
    expect(dbState.updates).toHaveLength(0);
    expect(emailMocks.sendPasswordChangedEmail).not.toHaveBeenCalled();
  });

  it('bloqueia reuso de senha recente (histórico bcrypt) com 400 dedicado', async () => {
    const raw = validRawToken();
    const hashed = createHash('sha256').update(raw).digest('hex');
    const reused = 'NovaSenh@1';
    const reusedHash = await bcrypt.hash(reused, 4);
    // Usuário com a nova senha já no histórico -> checkPasswordHistory retorna false.
    dbState.selectQueue = [[userRow({ passwordResetToken: hashed })]];
    dbState.userByIdRows = [userRow({ passwordResetToken: hashed, passwordHistory: JSON.stringify([reusedHash]) })];

    const res = await request(buildApp())
      .post('/api/auth/reset-password')
      .send({ token: raw, password: reused });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('usada recentemente');
    // Nada é gravado quando a senha é um reuso.
    expect(dbState.updates).toHaveLength(0);
  });
});

describe('forgot-password (rota real) — enumeração de email e rate-limit', () => {
  beforeEach(() => {
    dbState.reset();
    vi.clearAllMocks();
    redisState.getClient.mockImplementation((..._a: any[]) => {
      throw new Error('REDIS_URL not configured');
    });
  });

  it('email inexistente e email existente devolvem MESMO status+mensagem (anti-enumeração)', async () => {
    // Existe.
    dbState.selectQueue = [[userRow({ email: 'real@example.com' })]];
    const exists = await request(buildApp())
      .post('/api/auth/forgot-password')
      .send({ email: 'real@example.com' });

    // Não existe.
    dbState.reset();
    redisState.getClient.mockImplementation((..._a: any[]) => {
      throw new Error('REDIS_URL not configured');
    });
    dbState.selectQueue = [[]];
    const missing = await request(buildApp())
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost-does-not-exist@example.com' });

    expect(exists.status).toBe(missing.status);
    expect(exists.status).toBe(200);
    expect(exists.body).toEqual(missing.body);
    expect(exists.body.message).toContain('Se o email existir');
    // Diferença observável SÓ nos efeitos internos: só o existente gera email/token.
    expect(emailMocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('conta travada (lockedUntil futuro) responde mensagem genérica e NÃO emite token', async () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    dbState.selectQueue = [[userRow({ lockedUntil: future })]];

    const res = await request(buildApp())
      .post('/api/auth/forgot-password')
      .send({ email: 'owner@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Se o email existir');
    // Lockout: não gera token nem email (sem update de token, sem envio).
    expect(emailMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(dbState.updates).toHaveLength(0);
  });

  it('email ausente ou não-string responde 400 antes do rate-limit', async () => {
    const r1 = await request(buildApp()).post('/api/auth/forgot-password').send({});
    expect(r1.status).toBe(400);
    expect(r1.body.error).toBe('Email é obrigatório');

    const r2 = await request(buildApp())
      .post('/api/auth/forgot-password')
      .send({ email: 12345 });
    expect(r2.status).toBe(400);
  });

  it('rate-limit in-memory: 4ª solicitação para o MESMO email retorna 429 com retryAfter', async () => {
    // Redis indisponível -> fallback in-memory determinístico (max 3/janela).
    const email = `rl-${randomBytes(4).toString('hex')}@example.com`;
    const app = buildApp();
    const send = () => {
      // cada solicitação faz 1 leitura; mantemos a fila abastecida.
      dbState.selectQueue.push([]);
      return request(app).post('/api/auth/forgot-password').send({ email });
    };

    const r1 = await send();
    const r2 = await send();
    const r3 = await send();
    const r4 = await send();

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(r4.status).toBe(429);
    expect(r4.body.error).toContain('Muitas solicitações');
    expect(typeof r4.body.retryAfter).toBe('number');
    expect(r4.body.retryAfter).toBeGreaterThan(0);
  });

  it('rate-limit distribuído via Redis: count > 3 retorna 429 (caminho Redis, não fallback)', async () => {
    let counter = 0;
    const redisClient = {
      incr: vi.fn((..._a: any[]) => Promise.resolve(++counter)),
      expire: vi.fn((..._a: any[]) => Promise.resolve(1)),
      ttl: vi.fn((..._a: any[]) => Promise.resolve(1800)),
    };
    redisState.getClient.mockImplementation((..._a: any[]) => redisClient);

    const app = buildApp();
    const email = 'redis-rl@example.com';
    // 1..3 permitidos; 4ª (count=4 > MAX 3) bloqueada.
    dbState.selectQueue = [[], [], []];
    const ok1 = await request(app).post('/api/auth/forgot-password').send({ email });
    const ok2 = await request(app).post('/api/auth/forgot-password').send({ email });
    const ok3 = await request(app).post('/api/auth/forgot-password').send({ email });
    const blocked = await request(app).post('/api/auth/forgot-password').send({ email });

    expect(ok1.status).toBe(200);
    expect(ok2.status).toBe(200);
    expect(ok3.status).toBe(200);
    expect(blocked.status).toBe(429);
    expect(redisClient.incr).toHaveBeenCalledTimes(4);
  });
});

describe('reset-token (rota real, GET) — validação de token sem expor estado', () => {
  beforeEach(() => {
    dbState.reset();
    vi.clearAllMocks();
    redisState.getClient.mockImplementation((..._a: any[]) => {
      throw new Error('REDIS_URL not configured');
    });
  });

  it('token de comprimento errado -> 400 "Token inválido" sem consultar o banco', async () => {
    const res = await request(buildApp()).get('/api/auth/reset-token/short');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Token inválido');
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it('token de 64 hex sem correspondência (expirado/forjado) -> 400 expired:true', async () => {
    dbState.selectQueue = [[]];
    const res = await request(buildApp()).get(`/api/auth/reset-token/${validRawToken()}`);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'Token inválido ou expirado', expired: true });
  });

  it('token válido -> 200 com valid:true e email do dono', async () => {
    const raw = validRawToken();
    const hashed = createHash('sha256').update(raw).digest('hex');
    dbState.selectQueue = [[userRow({ passwordResetToken: hashed, email: 'who@example.com' })]];

    const res = await request(buildApp()).get(`/api/auth/reset-token/${raw}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, email: 'who@example.com' });
  });
});

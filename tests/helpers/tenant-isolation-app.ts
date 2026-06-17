/**
 * Helper de integração REAL para testes de isolamento de tenant e compliance.
 *
 * Sobe o MESMO router do projeto (`registerRoutes`) contra o MESMO storage real
 * (`server/storage.ts`), que usa o `db` real (`server/db.ts`). Em modo SQLite,
 * `server/db.ts` abre o caminho de `SQLITE_DB_PATH` (ou o default de dev) no
 * momento do import.
 *
 * ISOLAMENTO E SEGURANÇA (parallel-safe, não-destrutivo):
 *  1. Antes de qualquer import de `server/*`, força SQLite e define
 *     `SQLITE_DB_PATH` com um caminho ÚNICO por execução (data/test-<uuid>.db).
 *     Assim cada arquivo de teste tem seu próprio banco e podem rodar em
 *     paralelo sem colidir — e o banco de dev (`data/imobibase.db`) NUNCA é
 *     modificado.
 *  2. Cria o banco de teste copiando o schema do db de dev (que está em dia com
 *     `shared/schema-sqlite.ts`) e ESVAZIANDO os dados; fallback para a migration
 *     oficial quando não há db de dev.
 *  3. Importa dinamicamente `server/storage` e `server/routes` só após o passo 2.
 *  4. Remove o banco de teste ao final (sem tocar no db de dev).
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import Database from "better-sqlite3";

const PROJECT_ROOT = process.cwd();
// Banco de dev usado APENAS como fonte de schema (somente leitura/cópia).
const DEV_DB_PATH = path.resolve(PROJECT_ROOT, "data/imobibase.db");
const MIGRATION_PATH = path.resolve(
  PROJECT_ROOT,
  "migrations-sqlite/0000_parallel_orphan.sql",
);

// Caminho único do banco de teste desta execução (definido em prepareTestEnv).
let workDbPath = "";

/**
 * Garante variáveis de ambiente que fazem `server/db.ts` escolher SQLite, isola
 * o banco de teste por execução e satisfaz o secret-manager.
 * Deve ser chamado ANTES de qualquer import dinâmico de `server/*`.
 */
export function prepareTestEnv(): void {
  // Forçar SQLite: db.ts usa SQLite quando NÃO há DATABASE_URL.
  delete process.env.DATABASE_URL;
  process.env.USE_SQLITE = "true";
  process.env.NODE_ENV = "test";

  // Banco de teste ÚNICO por ARQUIVO de teste (parallel-safe; não toca no db de
  // dev). Idempotente: gera o caminho UMA vez por módulo e reusa nas chamadas
  // seguintes — assim o caminho fixado no module-load é o MESMO que db.ts abre,
  // mesmo que prepareTestEnv seja chamado de novo no beforeAll.
  if (!workDbPath) {
    workDbPath = path.resolve(
      PROJECT_ROOT,
      `data/test-${process.pid}-${randomUUID()}.db`,
    );
  }
  process.env.SQLITE_DB_PATH = workDbPath;

  // SESSION_SECRET precisa de >= 32 chars para passar no secret-manager.
  process.env.SESSION_SECRET =
    "tenant-isolation-test-session-secret-0123456789";
  // Evitar que o cookie seguro/strict atrapalhe o supertest (sem TLS).
  process.env.COOKIE_DOMAIN = "";
}

/**
 * Cria o banco SQLite de TESTE no caminho único (`workDbPath`), com o mesmo
 * schema do runtime e sem dados. Estratégia: copiar o db de dev (schema em dia)
 * e esvaziar; fallback para a migration oficial em ambientes sem db de dev.
 * Nunca modifica o banco de dev.
 */
export function setupFreshDatabase(): void {
  if (!workDbPath) prepareTestEnv();

  const dataDir = path.dirname(workDbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Limpa qualquer remanescente do caminho de teste (não deveria existir).
  removeDbFiles(workDbPath);

  if (fs.existsSync(DEV_DB_PATH)) {
    // Preferencial: clona o schema atualizado do db de dev e zera os dados.
    fs.copyFileSync(DEV_DB_PATH, workDbPath);
    ensureWebhookEventsTable(workDbPath);
    wipeAllTables(workDbPath);
  } else {
    // Fallback: recria a partir da migration (schema possivelmente parcial).
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const client = new Database(workDbPath);
    try {
      client.pragma("foreign_keys = OFF");
      for (const stmt of statements) client.exec(stmt);
      createWebhookEventsTable(client);
    } finally {
      client.close();
    }
  }
}

function ensureWebhookEventsTable(dbPath: string): void {
  const client = new Database(dbPath);
  try {
    createWebhookEventsTable(client);
  } finally {
    client.close();
  }
}

function createWebhookEventsTable(client: Database.Database): void {
  client.exec(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id),
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      attempts INTEGER NOT NULL DEFAULT 1,
      payload_digest TEXT,
      signature_digest TEXT,
      last_error TEXT,
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      failed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_provider_event
      ON webhook_events(provider, event_id);
  `);
}

/**
 * Apaga todas as linhas de todas as tabelas de usuário do banco informado,
 * preservando o schema.
 */
function wipeAllTables(dbPath: string): void {
  const client = new Database(dbPath);
  try {
    client.pragma("foreign_keys = OFF");
    const tables = client
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as Array<{ name: string }>;
    const wipe = client.transaction(() => {
      for (const { name } of tables) {
        client.prepare(`DELETE FROM "${name}"`).run();
      }
    });
    wipe();
  } finally {
    client.close();
  }
}

/** Remove o arquivo de banco e seus companheiros WAL/SHM, se existirem. */
function removeDbFiles(dbPath: string): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = dbPath + suffix;
    if (fs.existsSync(f)) fs.rmSync(f, { force: true });
  }
}

/**
 * Limpa as chaves de rate-limit no Redis (prefixo `rl:`), caso exista um Redis
 * acessível. Sem isso, contadores acumulados entre execuções podem gerar 429
 * falso-positivo no login do teste. Best-effort: ignora se Redis indisponível.
 */
export async function flushRateLimitKeys(): Promise<void> {
  try {
    const IORedis = (await import("ioredis")).default;
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const client = new IORedis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    await client.connect();
    let cursor = "0";
    do {
      const [next, keys] = (await client.scan(
        cursor,
        "MATCH",
        "rl:*",
        "COUNT",
        100,
      )) as [string, string[]];
      cursor = next;
      if (keys.length > 0) await client.del(...keys);
    } while (cursor !== "0");
    await client.quit();
  } catch {
    // Redis indisponível: nada a limpar (rate limit usa store em memória).
  }
}

/**
 * Remove o banco de teste desta execução. Nunca toca no banco de dev.
 */
export function restoreDatabase(): void {
  if (workDbPath) removeDbFiles(workDbPath);
}

/**
 * Importa e monta o app Express REAL com o router real do projeto.
 * Importações são dinâmicas e DEVEM acontecer após setupFreshDatabase(),
 * para que o singleton `db` abra o arquivo já recriado em `SQLITE_DB_PATH`.
 */
export async function buildRealApp(): Promise<{
  app: Express;
  httpServer: Server;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any;
  closeDb: () => Promise<void>;
}> {
  const app = express();
  // Replica a captura de rawBody feita em server/index.ts (padrão-ouro do
  // webhook do Stripe), mantendo o pipeline o mais próximo possível do app real.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  const cookieParser = (await import("cookie-parser")).default;
  app.use(cookieParser());

  const httpServer = createServer(app);

  // Importa o ROUTER REAL e o STORAGE REAL só agora.
  const routesModule = await import("../../server/routes");
  const storageModule = await import("../../server/storage");
  const dbModule = await import("../../server/db");

  await routesModule.registerRoutes(httpServer, app);

  return {
    app,
    httpServer,
    storage: storageModule.storage,
    closeDb: dbModule.closeDb,
  };
}

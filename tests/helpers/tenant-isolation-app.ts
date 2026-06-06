/**
 * Helper de integração REAL para o teste de isolamento de tenant.
 *
 * Diferente dos testes que montam um mini-app com banco em memória fake, este
 * helper sobe o MESMO router do projeto (`registerRoutes`) contra o MESMO
 * storage real (`server/storage.ts`), que por sua vez usa o `db` real
 * (`server/db.ts`). Como `server/db.ts` seleciona SQLite quando NÃO há
 * `DATABASE_URL` apontando para Postgres e abre o arquivo fixo
 * `./data/imobibase.db` no momento do import, a estratégia é:
 *
 *  1. Garantir, ANTES de qualquer import de `server/*`, que o ambiente force
 *     SQLite (sem `DATABASE_URL`) e que `SESSION_SECRET` seja válido.
 *  2. Fazer backup do `./data/imobibase.db` de desenvolvimento (se existir) e
 *     substituí-lo por um banco LIMPO criado a partir da migration oficial
 *     `migrations-sqlite/0000_parallel_orphan.sql`. Assim o teste é isolado e
 *     não polui o banco de dev.
 *  3. Importar dinamicamente `server/storage` e `server/routes` só depois do
 *     passo 2, para que o singleton `db` abra o arquivo já recriado.
 *  4. Restaurar o backup ao final.
 *
 * Tudo isso exercita o código REAL de rotas + storage + drizzle, que é o
 * objetivo do track.
 */
import fs from "fs";
import path from "path";
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import Database from "better-sqlite3";

const PROJECT_ROOT = process.cwd();
const DB_PATH = path.resolve(PROJECT_ROOT, "data/imobibase.db");
const BACKUP_PATH = path.resolve(
  PROJECT_ROOT,
  "data/imobibase.db.tenant-isolation-backup",
);
const MIGRATION_PATH = path.resolve(
  PROJECT_ROOT,
  "migrations-sqlite/0000_parallel_orphan.sql",
);

/**
 * Garante variáveis de ambiente que fazem `server/db.ts` escolher SQLite e
 * `secret-manager` não reclamar de SESSION_SECRET (>= 32 chars).
 * Deve ser chamado ANTES de qualquer import dinâmico de `server/*`.
 */
export function prepareTestEnv(): void {
  // Forçar SQLite: db.ts usa SQLite quando NÃO há DATABASE_URL.
  delete process.env.DATABASE_URL;
  process.env.USE_SQLITE = "true";
  process.env.NODE_ENV = "test";
  // SESSION_SECRET precisa de >= 32 chars para passar no secret-manager.
  process.env.SESSION_SECRET =
    "tenant-isolation-test-session-secret-0123456789";
  // Evitar que o cookie seguro/strict atrapalhe o supertest (sem TLS).
  process.env.COOKIE_DOMAIN = "";
}

/**
 * Prepara um banco SQLite de TESTE no caminho fixo usado por server/db.ts.
 *
 * A migration `migrations-sqlite/0000_parallel_orphan.sql` está desatualizada
 * em relação a `shared/schema-sqlite.ts` (faltam colunas novas como
 * `email_verified`). A fonte de verdade do schema em runtime é o próprio banco
 * de dev `./data/imobibase.db`, que está em dia. Por isso a estratégia robusta
 * é: fazer backup do db de dev, copiá-lo para o caminho de trabalho e ESVAZIAR
 * todas as tabelas de dados — garantindo schema idêntico ao código E isolamento
 * (nenhum dado de dev contamina as asserções). O backup é restaurado ao final.
 *
 * Fallback: se não houver db de dev, recria a partir da migration (schema
 * possivelmente parcial), apenas para não quebrar em ambientes limpos.
 */
export function setupFreshDatabase(): void {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const devDbExists = fs.existsSync(DB_PATH);

  // Backup do banco de dev (somente se ainda não houver backup pendente).
  if (devDbExists && !fs.existsSync(BACKUP_PATH)) {
    fs.renameSync(DB_PATH, BACKUP_PATH);
  } else if (devDbExists) {
    // Backup já existe (execução anterior interrompida): descarta o db atual.
    fs.rmSync(DB_PATH, { force: true });
  }
  // Remover WAL/SHM remanescentes para evitar mistura de estados.
  for (const suffix of ["-wal", "-shm"]) {
    const f = DB_PATH + suffix;
    if (fs.existsSync(f)) fs.rmSync(f, { force: true });
  }

  if (fs.existsSync(BACKUP_PATH)) {
    // Caminho preferencial: clona o schema atualizado do db de dev e limpa dados.
    fs.copyFileSync(BACKUP_PATH, DB_PATH);
    wipeAllTables();
  } else {
    // Fallback: recria a partir da migration (pode ser schema parcial).
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const client = new Database(DB_PATH);
    try {
      client.pragma("foreign_keys = OFF");
      for (const stmt of statements) client.exec(stmt);
    } finally {
      client.close();
    }
  }
}

/**
 * Apaga todas as linhas de todas as tabelas de usuário do banco no caminho de
 * trabalho, preservando o schema. Usado para isolar o banco de teste copiado
 * do db de dev.
 */
function wipeAllTables(): void {
  const client = new Database(DB_PATH);
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

/**
 * Limpa as chaves de rate-limit no Redis (prefixo `rl:`), caso exista um Redis
 * acessível. O `server/routes.ts` usa um RedisStore compartilhado quando há
 * Redis local; sem essa limpeza, contadores acumulados entre execuções podem
 * gerar 429 falso-positivo no login do teste. Best-effort: se Redis não estiver
 * disponível, ignora silenciosamente (a app cai para store em memória).
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
 * Restaura o banco de dev original e limpa o banco de teste.
 */
export function restoreDatabase(): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = DB_PATH + suffix;
    if (fs.existsSync(f)) fs.rmSync(f, { force: true });
  }
  if (fs.existsSync(BACKUP_PATH)) {
    fs.renameSync(BACKUP_PATH, DB_PATH);
  }
}

/**
 * Importa e monta o app Express REAL com o router real do projeto.
 * Retorna o app e a função de fechamento do db.
 *
 * Importações são dinâmicas e DEVEM acontecer após setupFreshDatabase(),
 * para que o singleton `db` abra o arquivo já recriado.
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
  // webhook do Stripe) — não é estritamente necessário aqui, mas mantém o
  // pipeline o mais próximo possível do app real.
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

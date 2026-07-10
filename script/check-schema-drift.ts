/**
 * Guarda de drift entre shared/schema.ts (Postgres, produção) e
 * shared/schema-sqlite.ts (dev/CI). Falha quando surge NOVO drift além do
 * baseline conhecido/aceito abaixo.
 *
 * Por quê: dev e CI usam SQLite. Se um domínio existe só no schema Postgres, o
 * código que o usa fica estruturalmente NÃO-TESTÁVEL localmente (ex.: tabelas
 * whatsapp_*). Este guard "para a sangria": um domínio novo precisa existir nos
 * DOIS schemas — ou entrar no baseline abaixo com justificativa explícita.
 *
 * Uso: `npm run guard:schema` (ou `tsx script/check-schema-drift.ts`).
 * Para inspecionar o drift atual sem falhar: `tsx script/check-schema-drift.ts --print`.
 */
import { Table, is, getTableName, getTableColumns } from "drizzle-orm";
import * as pgSchema from "../shared/schema";
import * as sqliteSchema from "../shared/schema-sqlite";

type TableMap = Map<string, Set<string>>;

function collect(mod: Record<string, unknown>): TableMap {
  const out: TableMap = new Map();
  for (const val of Object.values(mod)) {
    if (val && typeof val === "object" && is(val as object, Table)) {
      const name = getTableName(val as never);
      const cols = new Set<string>(
        Object.values(getTableColumns(val as never)).map((c) => (c as { name: string }).name),
      );
      out.set(name, cols);
    }
  }
  return out;
}

const pg = collect(pgSchema as Record<string, unknown>);
const sq = collect(sqliteSchema as Record<string, unknown>);

const onlyPg = [...pg.keys()].filter((t) => !sq.has(t)).sort();
const onlySqlite = [...sq.keys()].filter((t) => !pg.has(t)).sort();

const columnDrift: Record<string, { onlyPg: string[]; onlySqlite: string[] }> = {};
for (const [name, pgCols] of pg) {
  const sqCols = sq.get(name);
  if (!sqCols) continue;
  const oPg = [...pgCols].filter((c) => !sqCols.has(c)).sort();
  const oSq = [...sqCols].filter((c) => !pgCols.has(c)).sort();
  if (oPg.length || oSq.length) columnDrift[name] = { onlyPg: oPg, onlySqlite: oSq };
}

if (process.argv.includes("--print")) {
  console.log(JSON.stringify({ onlyPg, onlySqlite, columnDrift }, null, 2));
  process.exit(0);
}

// ── Baseline de drift ACEITO (documentado) ────────────────────────────────────
// Tabelas presentes só em um schema e diferenças de coluna já conhecidas em
// 2026-07-10. Débito técnico rastreado em docs/TECH_DEBT.md. Ao alterar o schema,
// atualize este baseline conscientemente (o objetivo é NÃO deixar crescer).
// Nível TABELA = falha dura (ratchet): um domínio novo NÃO pode existir só em um
// schema. As 6 tabelas abaixo são o drift de tabela conhecido/aceito em 2026-07-10.
const BASELINE_ONLY_PG: string[] = [
  "whatsapp_conversations",
  "whatsapp_messages",
  "whatsapp_message_queue",
  "whatsapp_auto_responses",
  "whatsapp_templates",
];
const BASELINE_ONLY_SQLITE: string[] = ["legal_documents"];

const newOnlyPg = onlyPg.filter((t) => !BASELINE_ONLY_PG.includes(t));
const newOnlySqlite = onlySqlite.filter((t) => !BASELINE_ONLY_SQLITE.includes(t));

// Nível COLUNA = relatório (não falha): há drift de coluna pré-existente amplo,
// rastreado como débito técnico em docs/TECH_DEBT.md. Reportamos para dar
// visibilidade sem bloquear o CI numa dívida herdada.
const columnDriftTables = Object.keys(columnDrift).sort();

if (newOnlyPg.length > 0 || newOnlySqlite.length > 0) {
  console.error("❌ Drift de TABELA novo detectado (além do baseline aceito):\n");
  if (newOnlyPg.length) console.error(`  Tabelas só no Postgres: ${newOnlyPg.join(", ")}`);
  if (newOnlySqlite.length) console.error(`  Tabelas só no SQLite: ${newOnlySqlite.join(", ")}`);
  console.error(
    "\n  Adicione o domínio nos DOIS schemas (shared/schema.ts e shared/schema-sqlite.ts)\n" +
      "  ou, se for intencional, inclua no baseline de script/check-schema-drift.ts com justificativa.\n",
  );
  process.exit(1);
}

console.log(
  `✅ Drift de TABELA dentro do baseline (${BASELINE_ONLY_PG.length} só-PG, ` +
    `${BASELINE_ONLY_SQLITE.length} só-SQLite conhecidas).`,
);
if (columnDriftTables.length > 0) {
  console.log(
    `ℹ️  Drift de COLUNA (não-bloqueante, débito conhecido) em ${columnDriftTables.length} ` +
      `tabelas: ${columnDriftTables.join(", ")}.`,
  );
}

/**
 * Guarda de orçamento de linhas (ratchet) para arquivos monolíticos conhecidos.
 * Falha se qualquer arquivo abaixo CRESCER além do teto (as linhas atuais em
 * 2026-07-10). "Para a sangria": a decomposição incremental (arch-1) fica
 * irreversível — os monolitos só podem encolher, nunca crescer. Ao extrair um
 * domínio/componente e reduzir o arquivo, baixe o teto correspondente aqui.
 *
 * Uso: `npm run guard:size`. Backlog de decomposição em docs/TECH_DEBT.md.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// teto = linhas atuais (não aumentar; reduzir ao decompor).
const BUDGET: Record<string, number> = {
  "server/routes.ts": 4337,
  "server/storage.ts": 4550,
  "shared/schema.ts": 2000,
  "shared/schema-sqlite.ts": 1862,
  "client/src/pages/vendas/index.tsx": 2653,
  "client/src/pages/leads/kanban.tsx": 2416,
  "client/src/pages/calendar/index.tsx": 2256,
  "client/src/pages/contracts/index.tsx": 1971,
  "client/src/pages/reports/index.tsx": 1866,
  "client/src/pages/rentals/index.tsx": 1599,
};

const root = resolve(import.meta.dirname, "..");
let failed = false;
const rows: string[] = [];

for (const [rel, max] of Object.entries(BUDGET)) {
  let lines: number;
  try {
    lines = readFileSync(resolve(root, rel), "utf8").split("\n").length;
  } catch {
    console.error(`⚠️  ${rel}: arquivo não encontrado (ajuste o BUDGET se foi movido/renomeado).`);
    failed = true;
    continue;
  }
  const over = lines > max;
  if (over) failed = true;
  rows.push(
    `${over ? "❌" : "✅"} ${rel.padEnd(42)} ${String(lines).padStart(5)} / ${String(max).padStart(5)}` +
      (over ? `  (+${lines - max})` : lines < max ? `  (-${max - lines}: baixe o teto)` : ""),
  );
}

console.log("Orçamento de linhas (atual / teto):");
console.log(rows.join("\n"));

if (failed) {
  console.error(
    "\n❌ Arquivo cresceu além do teto. Extraia um domínio/componente (ver docs/ARCHITECTURE.md,\n" +
      "   docs/ADR/0002 e docs/TECH_DEBT.md) em vez de adicionar mais linhas ao monolito.\n",
  );
  process.exit(1);
}
console.log("\n✅ Nenhum monolito cresceu além do teto.");

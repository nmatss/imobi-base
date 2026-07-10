/**
 * Guarda de orçamento de `fetch` cru (ratchet) no client.
 * Conta chamadas `fetch(` diretas (fora do wrapper client/src/lib) em
 * client/src/pages e client/src/components e falha se o total AUMENTAR além do
 * teto atual. "Para a sangria": código novo deve usar a camada padronizada
 * (apiRequest/getQueryFn em client/src/lib/queryClient.ts, com CSRF e cache),
 * não `fetch` cru. Migre chamadas existentes oportunisticamente e baixe o teto.
 *
 * Uso: `npm run guard:fetch`. Guias: client/src/lib/MIGRATION_GUIDE.md.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const DIRS = ["client/src/pages", "client/src/components"];
// Conta `fetch(` que NÃO seja precedido por char de palavra ou ponto — exclui
// refetch/prefetch (React Query) e chamadas de método tipo `.fetch(`.
const BARE_FETCH = /(?<![A-Za-z0-9_.])fetch\s*\(/g;

// teto = total atual (não aumentar; reduzir ao migrar para apiRequest).
const BUDGET = 174;

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
}

let total = 0;
const perFile: Array<{ file: string; count: number }> = [];
for (const d of DIRS) {
  const files: string[] = [];
  walk(resolve(root, d), files);
  for (const f of files) {
    const matches = readFileSync(f, "utf8").match(BARE_FETCH);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      total += count;
      perFile.push({ file: f.replace(root + "/", ""), count });
    }
  }
}

console.log(`fetch cru em pages/components: ${total} (teto ${BUDGET}) em ${perFile.length} arquivos.`);

if (total > BUDGET) {
  perFile.sort((a, b) => b.count - a.count);
  console.error(
    `\n❌ fetch cru aumentou (${total} > ${BUDGET}). Use apiRequest/getQueryFn de\n` +
      "   client/src/lib/queryClient.ts (CSRF + cache) em vez de fetch direto.\n" +
      "   Top ofensores:\n" +
      perFile.slice(0, 10).map((p) => `     ${String(p.count).padStart(3)}  ${p.file}`).join("\n"),
  );
  process.exit(1);
}
console.log("✅ fetch cru não aumentou além do teto.");

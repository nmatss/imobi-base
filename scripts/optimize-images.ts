#!/usr/bin/env tsx
/**
 * Gera variantes WebP (e opcionalmente AVIF) dos assets pesados em
 * `attached_assets/stock_images/` e `public/`, gravando-os lado a lado com
 * o arquivo original. Componentes que usam o arquivo original continuam
 * funcionando; para trocar para `<picture>` com fallback use a sintaxe:
 *
 *   <picture>
 *     <source srcset="/dashboard-mockup.avif" type="image/avif" />
 *     <source srcset="/dashboard-mockup.webp" type="image/webp" />
 *     <img src="/dashboard-mockup.png" alt="..." />
 *   </picture>
 *
 * Requisito: `sharp` precisa estar instalado como devDependency.
 *
 *   npm install --save-dev sharp
 *
 * Execucao:
 *
 *   npm run assets:optimize
 *
 * Este script nao e executado automaticamente no build (sharp e uma
 * dependencia pesada e nao essencial). Deve ser rodado manualmente quando
 * novas imagens forem adicionadas ao repositorio.
 */
import { readdir, stat } from "fs/promises";
import { join, extname, basename } from "path";

const MIN_BYTES = 150 * 1024; // so otimiza imagens acima de 150KB
const TARGET_DIRS = [
  "public",
  "attached_assets/stock_images",
];
const INPUT_EXTS = new Set([".jpg", ".jpeg", ".png"]);

async function optimize(): Promise<void> {
  let sharp: any;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error(
      "\nERRO: `sharp` nao esta instalado.\n" +
        "Execute: npm install --save-dev sharp\n" +
        "e rode este script novamente.\n",
    );
    process.exit(1);
  }

  const cwd = process.cwd();
  let converted = 0;
  let skipped = 0;
  let savedBytes = 0;

  for (const dir of TARGET_DIRS) {
    const absDir = join(cwd, dir);
    let entries: string[];
    try {
      entries = await readdir(absDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const abs = join(absDir, entry);
      const ext = extname(entry).toLowerCase();
      if (!INPUT_EXTS.has(ext)) continue;

      const info = await stat(abs);
      if (!info.isFile()) continue;
      if (info.size < MIN_BYTES) {
        skipped++;
        continue;
      }

      const name = basename(entry, ext);
      const webpOut = join(absDir, `${name}.webp`);
      const avifOut = join(absDir, `${name}.avif`);

      try {
        const [webpInfo, avifInfo] = await Promise.all([
          sharp(abs).webp({ quality: 82 }).toFile(webpOut),
          sharp(abs).avif({ quality: 60 }).toFile(avifOut),
        ]);
        converted++;
        savedBytes +=
          Math.max(0, info.size - webpInfo.size) +
          Math.max(0, info.size - avifInfo.size);
        console.log(
          `  ok  ${entry}  ${(info.size / 1024).toFixed(0)}KB  ->  webp ${(webpInfo.size / 1024).toFixed(0)}KB / avif ${(avifInfo.size / 1024).toFixed(0)}KB`,
        );
      } catch (err) {
        console.error(`  fail ${entry}: ${(err as Error).message}`);
      }
    }
  }

  console.log(
    `\n${converted} arquivo(s) otimizado(s), ${skipped} ignorado(s) (abaixo de ${MIN_BYTES / 1024}KB).`,
  );
  console.log(`Reducao estimada: ${(savedBytes / 1024 / 1024).toFixed(2)} MB.`);
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});

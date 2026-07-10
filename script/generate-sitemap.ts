#!/usr/bin/env tsx
/**
 * Gera client/public/sitemap.xml a partir das rotas publicas conhecidas.
 *
 * O output vai para `client/public/` (nao `public/` na raiz) porque o Vite e
 * configurado com `root: "client"` no vite.config.ts — portanto apenas os
 * arquivos dentro de client/public/ sao copiados para dist/public/ durante
 * o build.
 *
 * Executado manualmente (npm run seo:sitemap) e antes do build (package.json).
 */
import { writeFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import { PUBLIC_SEO_ROUTES, SITE_URL } from "./public-seo-manifest";

type SitemapRoute = {
  loc: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
};

const ROUTES: SitemapRoute[] = PUBLIC_SEO_ROUTES.map((route) => ({
  loc: route.path,
  changefreq: route.changefreq,
  priority: route.priority,
}));

function buildXml(routes: SitemapRoute[], lastmod: string): string {
  const urls = routes
    .map((r) => {
      const parts = [
        `    <loc>${SITE_URL}${r.loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
      ];
      if (r.changefreq) parts.push(`    <changefreq>${r.changefreq}</changefreq>`);
      if (typeof r.priority === "number")
        parts.push(`    <priority>${r.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export async function generateSitemap(
  outputPath = resolve(process.cwd(), "client/public/sitemap.xml"),
): Promise<string> {
  const lastmod = new Date().toISOString().slice(0, 10);
  const xml = buildXml(ROUTES, lastmod);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, xml, "utf-8");
  return outputPath;
}

// Executar apenas quando invocado diretamente.
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("generate-sitemap.ts");

if (isDirectRun) {
  generateSitemap()
    .then((p) => console.log(`sitemap.xml gerado em ${p}`))
    .catch((err) => {
      console.error("Falha ao gerar sitemap.xml:", err);
      process.exit(1);
    });
}

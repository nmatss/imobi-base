import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PUBLIC_SEO_ROUTES, routeCanonical, SITE_URL, type PublicSeoRoute } from "./public-seo-manifest";

const DEFAULT_IMAGE = `${SITE_URL}/opengraph.png`;
const HERO_PRELOAD = `<link rel="preload" as="image" href="/dashboard-mockup-1280.avif" imagesrcset="/dashboard-mockup-960.avif 960w, /dashboard-mockup-1280.avif 1280w" imagesizes="(max-width: 768px) 92vw, 720px" fetchpriority="high" data-static-seo="true">`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripManagedHeadTags(head: string): string {
  return head
    .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/\s*<meta[^>]+name=["']description["'][^>]*>/gi, "")
    .replace(/\s*<meta[^>]+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/\s*<meta[^>]+name=["']twitter:[^"']+["'][^>]*>/gi, "")
    .replace(/\s*<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s*<link[^>]+data-static-seo=["']true["'][^>]*>/gi, "");
}

function buildStaticHead(route: PublicSeoRoute): string {
  const canonical = routeCanonical(route.path);
  let image = DEFAULT_IMAGE;
  if (route.image?.startsWith("http")) {
    image = route.image;
  } else if (route.image) {
    image = `${SITE_URL}${route.image}`;
  }
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const imageAlt = route.imageAlt ? `\n    <meta property="og:image:alt" content="${escapeHtml(route.imageAlt)}" data-static-seo="true" />` : "";
  const structuredData = route.structuredData?.length
    ? `\n    <script type="application/ld+json" data-static-seo="true">${JSON.stringify({
        "@context": "https://schema.org",
        "@graph": route.structuredData,
      })}</script>`
    : "";
  const preload = route.preloadHero ? `\n    ${HERO_PRELOAD}` : "";

  return `
    <title>${title}</title>
    <meta name="description" content="${description}" data-static-seo="true" />
    <link rel="canonical" href="${canonical}" data-static-seo="true" />
    <meta property="og:title" content="${title}" data-static-seo="true" />
    <meta property="og:description" content="${description}" data-static-seo="true" />
    <meta property="og:type" content="website" data-static-seo="true" />
    <meta property="og:url" content="${canonical}" data-static-seo="true" />
    <meta property="og:image" content="${image}" data-static-seo="true" />${imageAlt}
    <meta property="og:site_name" content="ImobiBase" data-static-seo="true" />
    <meta property="og:locale" content="pt_BR" data-static-seo="true" />
    <meta name="twitter:card" content="summary_large_image" data-static-seo="true" />
    <meta name="twitter:site" content="@imobibase" data-static-seo="true" />
    <meta name="twitter:url" content="${canonical}" data-static-seo="true" />
    <meta name="twitter:title" content="${title}" data-static-seo="true" />
    <meta name="twitter:description" content="${description}" data-static-seo="true" />
    <meta name="twitter:image" content="${image}" data-static-seo="true" />${preload}${structuredData}
`;
}

function applyStaticHead(baseHtml: string, route: PublicSeoRoute): string {
  const headMatch = baseHtml.match(/<head>([\s\S]*?)<\/head>/i);
  if (!headMatch) throw new Error("dist/public/index.html does not contain a <head> section");

  const managedHead = buildStaticHead(route);
  const remainingHead = stripManagedHeadTags(headMatch[1]);
  const nextHead = `<head>${managedHead}${remainingHead}</head>`;
  return baseHtml.replace(/<head>[\s\S]*?<\/head>/i, nextHead);
}

function outputPathForRoute(routePath: string, outputDir: string): string {
  if (routePath === "/") return resolve(outputDir, "index.html");
  return resolve(outputDir, routePath.replace(/^\//, ""), "index.html");
}

export async function generateStaticPublicHtml(
  outputDir = resolve(process.cwd(), "dist/public"),
): Promise<string[]> {
  const baseIndex = resolve(outputDir, "index.html");
  const baseHtml = await readFile(baseIndex, "utf8");
  const written: string[] = [];

  for (const route of PUBLIC_SEO_ROUTES) {
    const html = applyStaticHead(baseHtml, route);
    const outputPath = outputPathForRoute(route.path, outputDir);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf8");
    written.push(outputPath);
  }

  return written;
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("generate-static-public-html.ts");

if (isDirectRun) {
  generateStaticPublicHtml()
    .then((files) => console.warn(`HTML publico estatico gerado para ${files.length} rotas.`))
    .catch((error) => {
      console.error("Falha ao gerar HTML publico estatico:", error);
      process.exit(1);
    });
}

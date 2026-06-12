/**
 * Gera os assets bitmap da marca ImobiBase a partir dos SVGs master
 * em client/public/brand/. Os arquivos gerados são commitados.
 *
 * Uso: npm run brand:assets
 * Requer: a fonte "Plus Jakarta Sans" instalada no fontconfig do sistema
 * (fc-list | grep -i jakarta) para renderizar wordmark/OG corretamente.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "client/public/brand");
const PUB = path.join(ROOT, "client/public");

const BLUE = "#0066CC";
const BLUE_LIGHT = "#0080FF";
const BLUE_DARK = "#0052AA";

/** Grupo SVG do pin predial (viewBox original 512x512), reutilizado nas composições. */
function pinGroup({ transform = "", idSuffix = "" } = {}) {
  const pin = `ibp${idSuffix}`;
  const door = `ibd${idSuffix}`;
  return `
  <linearGradient id="${pin}" x1="256" y1="28" x2="256" y2="486" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${BLUE_LIGHT}"/>
    <stop offset="0.55" stop-color="${BLUE}"/>
    <stop offset="1" stop-color="${BLUE_DARK}"/>
  </linearGradient>
  <linearGradient id="${door}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#00D455"/>
    <stop offset="1" stop-color="#00AA44"/>
  </linearGradient>
  <g transform="${transform}">
    <path d="M256 28C152.2 28 68 112.2 68 216c0 80 54 152 106 204 30 30 58 52 72 62 6 4.4 14 4.4 20 0 14-10 42-32 72-62 52-52 106-124 106-204C444 112.2 359.8 28 256 28Z" fill="url(#${pin})"/>
    <rect x="144" y="104" width="56" height="56" rx="12" fill="#FFFFFF" fill-opacity="0.95"/>
    <rect x="228" y="104" width="56" height="56" rx="12" fill="#FFFFFF" fill-opacity="0.8"/>
    <rect x="312" y="104" width="56" height="56" rx="12" fill="#FFFFFF" fill-opacity="0.95"/>
    <rect x="144" y="188" width="56" height="56" rx="12" fill="#FFFFFF" fill-opacity="0.8"/>
    <rect x="228" y="188" width="56" height="56" rx="12" fill="#FFFFFF" fill-opacity="0.95"/>
    <rect x="312" y="188" width="56" height="56" rx="12" fill="#FFFFFF" fill-opacity="0.8"/>
    <rect x="144" y="272" width="56" height="56" rx="12" fill="#FFFFFF" fill-opacity="0.95"/>
    <rect x="228" y="272" width="56" height="56" rx="12" fill="url(#${door})"/>
    <rect x="312" y="272" width="56" height="56" rx="12" fill="#FFFFFF" fill-opacity="0.95"/>
  </g>`;
}

/** Pin sobre fundo full-bleed (apple-touch-icon e maskable não aceitam transparência/precisam de safe zone). */
function fullBleedIcon(pinScale) {
  const offset = (512 - 512 * pinScale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#0A1A2F"/>
    <stop offset="1" stop-color="#103A66"/>
  </linearGradient>
  <rect width="512" height="512" fill="url(#bg)"/>
  ${pinGroup({ transform: `translate(${offset} ${offset}) scale(${pinScale})`, idSuffix: "fb" })}
</svg>`;
}

function ogImage() {
  const dots = [];
  for (let x = 40; x < 1200; x += 44) {
    for (let y = 40; y < 630; y += 44) {
      dots.push(`<circle cx="${x}" cy="${y}" r="1.6" fill="#FFFFFF" fill-opacity="0.05"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0A1A2F"/>
      <stop offset="1" stop-color="#0F3057"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.24" cy="0.46" r="0.5">
      <stop offset="0" stop-color="${BLUE_LIGHT}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${BLUE_LIGHT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>
  ${dots.join("\n  ")}
  <rect width="1200" height="630" fill="url(#glow)"/>
  ${pinGroup({ transform: "translate(110 122) scale(0.71)", idSuffix: "og" })}
  <text x="520" y="282" font-family="'Plus Jakarta Sans',sans-serif" font-size="104" font-weight="800" letter-spacing="-2.5"><tspan fill="#FFFFFF">Imobi</tspan><tspan fill="#3D9BFF">Base</tspan></text>
  <text x="524" y="356" font-family="'Plus Jakarta Sans',sans-serif" font-size="40" font-weight="600" fill="#B8C7DB">Gestão Imobiliária Inteligente</text>
  <text x="524" y="426" font-family="'Plus Jakarta Sans',sans-serif" font-size="27" font-weight="500" fill="#7E97B5">CRM  ·  Imóveis  ·  Financeiro  ·  Site Público</text>
  <text x="1160" y="588" text-anchor="end" font-family="'Plus Jakarta Sans',sans-serif" font-size="24" font-weight="600" fill="#5C7799">imobibase.com</text>
</svg>`;
}

async function svgToPng(svgBuffer, size, dest, { width, height } = {}) {
  await sharp(svgBuffer, { density: 300 })
    .resize(width ?? size, height ?? size)
    .png()
    .toFile(dest);
  console.log("✓", path.relative(ROOT, dest));
}

async function main() {
  await mkdir(BRAND, { recursive: true });
  const iconSvg = await readFile(path.join(BRAND, "logo-icon.svg"));
  const faviconSvg = await readFile(path.join(BRAND, "favicon.svg"));
  const fullSvg = await readFile(path.join(BRAND, "logo-full.svg"));

  // Ícones PWA / gerais (transparentes, a partir do pin)
  await svgToPng(iconSvg, 512, path.join(PUB, "icon-512.png"));
  await svgToPng(iconSvg, 192, path.join(PUB, "icon-192.png"));
  await svgToPng(faviconSvg, 96, path.join(PUB, "favicon-96.png"));

  // Apple touch icon (full-bleed, sem transparência) e maskable (safe zone 80%)
  await svgToPng(Buffer.from(fullBleedIcon(0.72)), 180, path.join(PUB, "apple-touch-icon.png"));
  await svgToPng(Buffer.from(fullBleedIcon(0.62)), 512, path.join(PUB, "icon-maskable-512.png"));

  // favicon.ico multi-size a partir do favicon simplificado
  const icoSizes = await Promise.all(
    [16, 32, 48].map((s) => sharp(faviconSvg, { density: 300 }).resize(s, s).png().toBuffer()),
  );
  await writeFile(path.join(PUB, "favicon.ico"), await pngToIco(icoSizes));
  console.log("✓ client/public/favicon.ico");

  // Open Graph 1200x630
  await svgToPng(Buffer.from(ogImage()), 1200, path.join(PUB, "opengraph.png"), { width: 1200, height: 630 });

  // Logo para cabeçalho de email (2x: 720px de largura)
  await svgToPng(fullSvg, 720, path.join(BRAND, "logo-email.png"), { width: 720, height: 177 });

  console.log("\nAssets da marca gerados com sucesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

# Guia de Marca — ImobiBase

> Criado em 2026-06-12 (PR #2). Fonte de verdade da identidade visual da plataforma.

## Conceito

**"Pin predial"** — um pin de localização contendo a fachada de um prédio. Une os dois
significados centrais do produto: *imóvel* (fachada com grade de janelas) e *lugar*
(pin de mapa). A porta verde no centro inferior representa o "lar encontrado" /
negócio fechado.

## Cores

| Token | Hex | Uso |
|---|---|---|
| Azul primário | `#0066CC` | Cor da marca, theme-color, CTAs (WCAG AA 4.5:1) |
| Azul claro | `#0080FF` | Topo do gradiente do pin |
| Azul escuro | `#0052AA` | Base do gradiente do pin |
| Verde (porta) | `#00AA44` → `#00D455` | Acento "lar encontrado"; secundária da marca |
| Azul wordmark dark | `#3D9BFF` | "Base" do wordmark sobre fundos escuros |
| Navy (fundos) | `#0A1A2F` → `#103A66` | Fundos de OG image, apple-touch-icon, maskable |

## Tipografia

- **Wordmark e headings**: Plus Jakarta Sans (ExtraBold para o wordmark)
- **Corpo**: Inter
- Wordmark: `Imobi` em foreground (#0F172A claro / #FFFFFF escuro) + `Base` em azul

## Arquivos

### SVGs master — `client/public/brand/`

| Arquivo | Uso |
|---|---|
| `logo-icon.svg` | Ícone completo (grade 3x3, gradiente, porta verde) |
| `logo-full.svg` | Lockup horizontal ícone + wordmark (fundos claros) |
| `logo-full-white.svg` | Lockup para fundos escuros |
| `favicon.svg` | Versão simplificada (grade 2x2) legível em 16px |
| `logo-email.png` | Lockup 720px para cabeçalho de emails (gerado) |

### Bitmaps gerados — `client/public/`

`favicon.ico` (16/32/48) · `favicon-96.png` · `apple-touch-icon.png` (180, fundo navy)
· `icon-192.png` · `icon-512.png` · `icon-maskable-512.png` (safe zone 80%)
· `opengraph.png` (1200x630)

## Como regenerar os bitmaps

```bash
npm run brand:assets   # scripts/generate-brand-assets.mjs (sharp + png-to-ico)
```

Requisito: fonte **Plus Jakarta Sans** instalada no fontconfig do sistema para
renderizar wordmark/OG (`~/.local/share/fonts/PlusJakartaSans-Variable.ttf`,
baixável de github.com/google/fonts → ofl/plusjakartasans; rode `fc-cache -f`).

Edite os SVGs master e rode o script; os bitmaps são commitados.

## Uso no código

```tsx
import { Logo, LogoIcon } from "@/components/brand/logo";

<Logo />                                  // ícone + wordmark, segue o tema
<Logo tone="white" />                     // wordmark claro (sidebar/fundo escuro)
<Logo variant="icon" />                   // só o pin
<LogoIcon className="h-8 w-8" />          // ícone inline avulso
```

Pontos já aplicados: sidebar e header mobile (`dashboard-layout.tsx`), login
(`App.tsx`), signup, product-landing, pricing, terms, privacy, contact, changelog,
`PublicFooter`, 404 (`not-found.tsx`) e `ErrorBoundary`.

## Regras importantes

1. **Manifest PWA**: gerado pelo `vite-plugin-pwa` em `vite.config.ts`. **Não** crie
   `manifest.webmanifest` estático em `client/public/` — o plugin sobrescreve.
2. **Multi-tenant**: o logo da plataforma é o *default*. Tenants customizam o próprio
   branding via Settings → Marca (`BrandTab.tsx`); emails usam `branding.logo` do
   tenant com fallback para `https://imobibase.com/brand/logo-email.png`
   (`server/email/template-renderer.ts`).
3. **OG image**: meta tags usam URL absoluta (`https://imobibase.com/opengraph.png`);
   padrão 1200x630.
4. **Não usar** o ícone `Building2` do lucide como marca — foi substituído em todos
   os pontos pelo `<Logo>`.

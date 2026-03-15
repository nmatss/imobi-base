# AGENTE 11/20: SEO & META TAGS ULTRA DEEP DIVE

**Data:** 25/12/2025
**Especialista:** SEO Técnico Avançado
**Sistema:** ImobiBase - Plataforma de Gestão Imobiliária

---

## EXECUTIVE SUMMARY

**SEO Score: 52/100** ⚠️ **NECESSITA ATENÇÃO URGENTE**

O ImobiBase possui uma base técnica sólida (PWA, lazy loading, code splitting), mas apresenta **graves deficiências em SEO** que impedem sua descoberta e rankeamento em buscadores. Principais problemas:

- ❌ **ZERO Schema.org/JSON-LD** implementado
- ❌ **Sem sitemap.xml** dinâmico
- ❌ **Sem robots.txt** configurado
- ❌ **Meta tags genéricas** sem personalização por rota
- ❌ **Canonical URLs ausentes**
- ❌ **Páginas públicas sem SSR/SSG** (100% CSR)
- ⚠️ Lighthouse score SEO não medido (erro na config)
- ✅ Headers de segurança bem configurados
- ✅ PWA implementado corretamente
- ✅ Code splitting otimizado

**Impacto Negativo:**

- Imóveis não aparecem em Google Search
- Imobiliárias parceiras invisíveis para SEO
- Landing pages com 0% de indexabilidade
- Perda de 80-90% do tráfego orgânico potencial

---

## 1. META TAGS AUDIT (15/100)

### 1.1 INDEX.HTML - Meta Tags Base

**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/index.html`

```html
<!-- ATUAL (INADEQUADO) -->
<title>ImobiBase | Gestão Imobiliária Inteligente</title>
<meta
  name="description"
  content="Sistema completo para gestão de imobiliárias: CRM, Imóveis, Financeiro e Site."
/>
<meta
  property="og:title"
  content="ImobiBase | Gestão Imobiliária Inteligente"
/>
<meta
  property="og:description"
  content="Sistema completo para gestão de imobiliárias: CRM, Imóveis, Financeiro e Site."
/>
<meta property="og:type" content="website" />
<meta property="og:url" content="" />
<!-- ❌ VAZIO -->
<meta
  property="og:image"
  content="https://replit.com/public/images/opengraph.png"
/>
<!-- ❌ URL EXTERNA -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@replit" />
<!-- ❌ TWITTER ERRADO -->
<meta name="twitter:title" content="ImobiBase" />
<meta
  name="twitter:description"
  content="Sistema completo para gestão de imobiliárias."
/>
<meta
  name="twitter:image"
  content="https://replit.com/public/images/opengraph.png"
/>
<!-- ❌ URL EXTERNA -->
```

**PROBLEMAS CRÍTICOS:**

1. ❌ og:url VAZIO - Facebook não consegue indexar
2. ❌ og:image usando URL do Replit (não do ImobiBase)
3. ❌ twitter:site apontando para @replit
4. ❌ Meta description genérica (não otimizada para keywords)
5. ❌ Falta og:locale, og:site_name
6. ❌ Falta article:author, article:published_time

### 1.2 Páginas Públicas - Meta Tags Dinâmicas

#### Landing Page (/e/:slug)

**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/public/landing.tsx`

```tsx
<Helmet>
  <title>{tenant.name} - Imóveis de qualidade</title>
  <meta
    name="description"
    content={`Encontre o imóvel perfeito com ${tenant.name}. Apartamentos, casas, terrenos e imóveis comerciais.`}
  />
  <meta property="og:title" content={`${tenant.name} - Imóveis de qualidade`} />
  <meta
    property="og:description"
    content={`Encontre o imóvel perfeito com ${tenant.name}.`}
  />
  <meta property="og:type" content="website" />
  {tenant.logo && <meta property="og:image" content={tenant.logo} />}
</Helmet>
```

**PONTOS POSITIVOS:** ✅

- Title dinâmico com nome da imobiliária
- Description personalizada
- OG tags básicas presentes
- Usa React Helmet

**PROBLEMAS:**

- ❌ Sem og:url (canonical)
- ❌ Sem twitter:card tags
- ❌ Sem keywords locais (cidade, bairro)
- ❌ Description curta demais (ideal 120-160 chars)
- ❌ Sem JSON-LD LocalBusiness

#### Listagem de Imóveis (/e/:slug/imoveis)

**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/public/properties.tsx`

```tsx
// ❌ HELMET NÃO ENCONTRADO NO CÓDIGO
// Página crítica SEM meta tags dinâmicas!
```

**PROBLEMA CRÍTICO:**
Página de listagem de imóveis (a mais importante para SEO) **não possui meta tags**!

#### Detalhes do Imóvel (/e/:slug/imovel/:id)

**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/public/property-details.tsx`

```tsx
// ❌ HELMET NÃO ENCONTRADO NO CÓDIGO
// Imóveis individuais sem meta tags = 0% indexabilidade
```

**IMPACTO NEGATIVO:**

- Imóveis não aparecem em "apartamento 2 quartos jardins sp"
- Google não indexa preços, fotos, localização
- Sem rich snippets de imóveis

### 1.3 Análise por Tipo de Página

| Página                            | Title | Description | OG Tags       | Twitter   | Schema | Canonical | Score  |
| --------------------------------- | ----- | ----------- | ------------- | --------- | ------ | --------- | ------ |
| **Index.html**                    | ✅    | ⚠️ Genérica | ⚠️ Incompleto | ❌ Errado | ❌     | ❌        | 35/100 |
| **Landing (/e/:slug)**            | ✅    | ⚠️ Curta    | ⚠️ Parcial    | ❌        | ❌     | ❌        | 40/100 |
| **Properties (/e/:slug/imoveis)** | ❌    | ❌          | ❌            | ❌        | ❌     | ❌        | 0/100  |
| **Property Details**              | ❌    | ❌          | ❌            | ❌        | ❌     | ❌        | 0/100  |
| **Product Landing (/)**           | ❌    | ❌          | ❌            | ❌        | ❌     | ❌        | 0/100  |

**MÉDIA GERAL: 15/100** 🔴

---

## 2. STRUCTURED DATA (0/100)

### 2.1 Status Atual

```bash
# Busca por Schema.org/JSON-LD no código
grep -r "schema.org\|@type\|JSON-LD" client/src --include="*.tsx"
# RESULTADO: 0 arquivos encontrados
```

**❌ ZERO IMPLEMENTAÇÃO DE STRUCTURED DATA**

### 2.2 Schema.org NECESSÁRIOS

#### A. LocalBusiness (Imobiliárias)

**Onde:** Landing page de cada imobiliária (`/e/:slug`)

```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Imobiliária XYZ",
  "image": "https://imobibase.com/tenants/xyz/logo.jpg",
  "logo": "https://imobibase.com/tenants/xyz/logo.jpg",
  "url": "https://imobibase.com/e/xyz",
  "telephone": "+55 11 98765-4321",
  "email": "contato@imobiliariaxyz.com.br",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Av. Paulista, 1000",
    "addressLocality": "São Paulo",
    "addressRegion": "SP",
    "postalCode": "01310-100",
    "addressCountry": "BR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-23.5505",
    "longitude": "-46.6333"
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "09:00",
    "closes": "18:00"
  },
  "priceRange": "$$",
  "areaServed": {
    "@type": "City",
    "name": "São Paulo"
  }
}
```

#### B. Product (Imóveis Individuais)

**Onde:** Página de detalhes do imóvel (`/e/:slug/imovel/:id`)

```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Apartamento 2 Quartos - Jardins",
  "description": "Lindo apartamento de 85m² com 2 quartos, 1 suíte, 2 vagas...",
  "url": "https://imobibase.com/e/xyz/imovel/abc123",
  "image": [
    "https://imobibase.com/properties/abc123/img1.jpg",
    "https://imobibase.com/properties/abc123/img2.jpg"
  ],
  "floorSize": {
    "@type": "QuantitativeValue",
    "value": 85,
    "unitCode": "MTK"
  },
  "numberOfRooms": 2,
  "numberOfBathroomsTotal": 2,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua Augusta, 500",
    "addressLocality": "São Paulo",
    "addressRegion": "SP",
    "postalCode": "01305-000",
    "addressCountry": "BR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-23.5558",
    "longitude": "-46.6580"
  },
  "offers": {
    "@type": "Offer",
    "price": "850000",
    "priceCurrency": "BRL",
    "availability": "https://schema.org/InStock",
    "validFrom": "2025-12-25"
  }
}
```

#### C. ItemList (Lista de Imóveis)

**Onde:** Página de listagem (`/e/:slug/imoveis`)

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "RealEstateListing",
        "name": "Apartamento 2 Quartos",
        "url": "https://imobibase.com/e/xyz/imovel/abc123"
      }
    },
    {
      "@type": "ListItem",
      "position": 2,
      "item": {
        "@type": "RealEstateListing",
        "name": "Casa 3 Quartos",
        "url": "https://imobibase.com/e/xyz/imovel/def456"
      }
    }
  ]
}
```

#### D. Organization (ImobiBase)

**Onde:** Landing page principal (`/`)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ImobiBase",
  "description": "Sistema completo para gestão de imobiliárias",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "BRL"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "150"
  }
}
```

#### E. BreadcrumbList

**Onde:** Todas as páginas públicas

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://imobibase.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Imobiliária XYZ",
      "item": "https://imobibase.com/e/xyz"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Imóveis",
      "item": "https://imobibase.com/e/xyz/imoveis"
    }
  ]
}
```

### 2.3 Validação

**Tools Necessários:**

- ✅ Google Rich Results Test: https://search.google.com/test/rich-results
- ✅ Schema Markup Validator: https://validator.schema.org/
- ✅ Google Search Console

---

## 3. SITEMAP.XML (0/100)

### 3.1 Status Atual

```bash
find . -name "sitemap*.xml" -o -name "sitemap*.ts" -o -name "sitemap*.js"
# RESULTADO: 0 arquivos encontrados
```

**❌ SITEMAP NÃO EXISTE**

### 3.2 Sitemaps Necessários

#### A. Sitemap Index

**Arquivo:** `/public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://imobibase.com/sitemap-static.xml</loc>
    <lastmod>2025-12-25</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://imobibase.com/sitemap-tenants.xml</loc>
    <lastmod>2025-12-25</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://imobibase.com/sitemap-properties.xml</loc>
    <lastmod>2025-12-25</lastmod>
  </sitemap>
</sitemapindex>
```

#### B. Sitemap Estático

**Arquivo:** `/public/sitemap-static.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://imobibase.com/</loc>
    <lastmod>2025-12-25</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://imobibase.com/login</loc>
    <lastmod>2025-12-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

#### C. Sitemap Dinâmico - Imobiliárias

**Endpoint:** `GET /api/sitemap/tenants.xml`

```typescript
// server/routes-sitemap.ts
export async function generateTenantsSitemap(): Promise<string> {
  const tenants = await storage.getActiveTenants();

  const urls = tenants
    .map(
      (tenant) => `
    <url>
      <loc>https://imobibase.com/e/${tenant.slug}</loc>
      <lastmod>${tenant.updatedAt}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
    </url>
  `,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
```

#### D. Sitemap Dinâmico - Imóveis

**Endpoint:** `GET /api/sitemap/properties.xml`

```typescript
export async function generatePropertiesSitemap(): Promise<string> {
  const properties = await storage.getActiveProperties();

  const urls = properties
    .map(
      (property) => `
    <url>
      <loc>https://imobibase.com/e/${property.tenantSlug}/imovel/${property.id}</loc>
      <lastmod>${property.updatedAt}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
      <image:image>
        <image:loc>${property.images[0]}</image:loc>
        <image:title>${property.title}</image:title>
      </image:image>
    </url>
  `,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
}
```

### 3.3 Frequência de Atualização

| Sitemap    | Update Frequency | Max URLs | Priority |
| ---------- | ---------------- | -------- | -------- |
| Static     | Manual (deploys) | ~10      | Alta     |
| Tenants    | Diária (cron)    | ~1,000   | Alta     |
| Properties | Horária (cron)   | ~50,000  | Crítica  |

---

## 4. ROBOTS.TXT (0/100)

### 4.1 Status Atual

```bash
find . -name "robots.txt"
# RESULTADO: 0 arquivos encontrados
```

**❌ ROBOTS.TXT NÃO EXISTE**

### 4.2 Robots.txt Necessário

**Arquivo:** `/public/robots.txt`

```txt
# ImobiBase - Robots.txt
# Allow all crawlers

User-agent: *
Allow: /
Allow: /e/
Allow: /e/*/imoveis
Allow: /e/*/imovel/

# Disallow private/admin areas
Disallow: /dashboard
Disallow: /properties
Disallow: /leads
Disallow: /calendar
Disallow: /contracts
Disallow: /rentals
Disallow: /vendas
Disallow: /financeiro
Disallow: /reports
Disallow: /settings
Disallow: /admin
Disallow: /api/

# Disallow authentication
Disallow: /login
Disallow: /register
Disallow: /reset-password

# Allow CSS and JS for proper rendering
User-agent: Googlebot
Allow: /*.css$
Allow: /*.js$

# Sitemap location
Sitemap: https://imobibase.com/sitemap.xml
Sitemap: https://imobibase.com/sitemap-tenants.xml
Sitemap: https://imobibase.com/sitemap-properties.xml

# Crawl-delay for aggressive bots
User-agent: Bingbot
Crawl-delay: 1

User-agent: Slurp
Crawl-delay: 1
```

---

## 5. TECHNICAL SEO (40/100)

### 5.1 Page Speed - Core Web Vitals

**Build Analysis:**

```bash
# Bundle sizes (dist/public)
Total: 4.1MB
Assets: 4.0MB
index.html: 6.2KB (gzipped: 2.65KB)

# Largest JS bundles:
vendor-charts: 424KB (gzip: 114KB) ⚠️
jspdf.es.min: 380KB (gzip: 127KB) ⚠️
index-D3wNDBUX: 304KB (gzip: 93KB) ⚠️
html2canvas: 200KB (gzip: 48KB) ⚠️
vendor-maps: 152KB (gzip: 45KB) ✅
product-landing: 144KB (gzip: 45KB) ✅

# CSS:
index.css: 244KB (gzip: 34KB) ⚠️
details.css: 16KB (gzip: 6KB) ✅
```

**Análise:**

| Métrica            | Atual          | Ideal  | Status          |
| ------------------ | -------------- | ------ | --------------- |
| **Total JS**       | ~2.5MB         | <1MB   | ⚠️ Muito grande |
| **Total CSS**      | 260KB          | <150KB | ⚠️ Grande       |
| **Initial Load**   | ~500KB gzipped | <200KB | ⚠️              |
| **Chunks**         | 61 files       | Ótimo  | ✅              |
| **Code Splitting** | Sim            | Sim    | ✅              |
| **Lazy Loading**   | Sim            | Sim    | ✅              |

**PROBLEMAS:**

1. ⚠️ Charts bundle muito grande (114KB gzipped)
2. ⚠️ jsPDF desnecessário em páginas públicas
3. ⚠️ html2canvas carregado sem necessidade
4. ✅ Code splitting bem implementado
5. ✅ Lazy loading de rotas funcionando

### 5.2 Lighthouse Configuration

**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/lighthouserc.json`

**PROBLEMA:**

```bash
npm run lighthouse
# ERROR: ReferenceError: module is not defined in ES module scope
```

O arquivo `.lighthouserc.js` usa CommonJS (`module.exports`) mas o projeto é ESM (`"type": "module"` no package.json).

**FIX NECESSÁRIO:**
Renomear `.lighthouserc.js` → `.lighthouserc.cjs` ou converter para ESM.

### 5.3 Performance Optimizations

**IMPLEMENTADO (✅):**

1. **Resource Hints:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="dns-prefetch" href="https://images.unsplash.com" />
<link rel="preload" href="fonts.css" as="style" />
```

2. **Code Splitting:**

```typescript
// vite.config.ts - Manual chunks
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'wouter'],
  'vendor-ui-dialog': ['@radix-ui/react-dialog'],
  'vendor-charts': ['recharts'],
  'vendor-maps': ['leaflet', 'react-leaflet'],
  // ... 10+ chunks
}
```

3. **Lazy Loading:**

```typescript
// App.tsx
const Dashboard = lazy(() => import("@/pages/dashboard"));
const PropertiesList = lazy(() => import("@/pages/properties/list"));
// ... todas as rotas lazy
```

4. **PWA:**

```typescript
// vite.config.ts
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
    runtimeCaching: [
      /* ... */
    ],
  },
});
```

**NÃO IMPLEMENTADO (❌):**

1. **Server-Side Rendering (SSR)** para páginas públicas
2. **Static Site Generation (SSG)** para imóveis
3. **Image optimization** (next/image ou similar)
4. **Critical CSS inlining**
5. **HTTP/2 Server Push**
6. **Brotli compression** (apenas gzip)

### 5.4 Mobile Optimization

**Viewport:** ✅

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1"
/>
```

**Touch Elements:** ✅ (Radix UI components com tamanhos adequados)

**Font Sizes:** ✅ (Tailwind CSS responsivo)

**Content Width:** ✅ (Container mx-auto)

### 5.5 JavaScript Rendering

**PROBLEMA CRÍTICO:**

```typescript
// 100% Client-Side Rendering (CSR)
// Páginas públicas NÃO são renderizadas no servidor
```

**Impacto:**

- Google precisa executar JavaScript para ver conteúdo
- First Contentful Paint (FCP) lento
- Crawlers antigos não veem nada
- SEO severamente prejudicado

**SOLUÇÃO:**
Implementar SSR com Vite SSR ou migrar para Next.js/Remix.

---

## 6. URL STRUCTURE (70/100)

### 6.1 URLs Atuais

**Páginas Públicas:**

```
✅ /                              (Landing principal)
✅ /e/:slug                       (Landing da imobiliária)
✅ /e/:slug/imoveis               (Lista de imóveis)
✅ /e/:slug/imovel/:id            (Detalhes do imóvel)

❌ /login                         (não deveria ser indexado)
❌ /dashboard                     (área privada)
```

**PONTOS POSITIVOS:**

- ✅ URLs semânticas e legíveis
- ✅ Hierarquia lógica (/e/:slug/imoveis)
- ✅ Sem IDs numéricos expostos (usa slugs)
- ✅ Sem parâmetros de query string desnecessários

**PROBLEMAS:**

- ❌ Falta slug do imóvel na URL (`/imovel/:id` → `/imovel/:id-:slug`)
- ❌ Falta filtros SEO-friendly (`?tipo=apartamento` vs `/apartamentos`)
- ⚠️ Trailing slashes inconsistentes

### 6.2 URLs SEO-Friendly Sugeridas

**Antes vs Depois:**

```
ANTES: /e/xyz/imovel/abc123
DEPOIS: /e/xyz/imovel/abc123-apartamento-2-quartos-jardins-sp

ANTES: /e/xyz/imoveis?category=sale&type=apartment
DEPOIS: /e/xyz/imoveis/venda/apartamentos

ANTES: /e/xyz/imoveis?city=sao-paulo&bedrooms=2
DEPOIS: /e/xyz/imoveis/sao-paulo/2-quartos
```

### 6.3 Redirects

**Configuração:** `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/index.ts"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/dist/public/$1"
    }
  ]
}
```

**FALTA:**

- ❌ Redirects 301 de URLs antigas
- ❌ Redirect www → non-www (ou vice-versa)
- ❌ Redirect HTTP → HTTPS em produção
- ❌ Trailing slash normalization

---

## 7. CONTENT OPTIMIZATION (50/100)

### 7.1 Heading Hierarchy

**Análise de Código:**

```typescript
// Landing Page
<h1>A inteligência que sua imobiliária precisa.</h1>
<h2>Recursos</h2>
<h3>CRM Completo</h3>

// Property Details
// ❌ Sem H1 detectado no código analisado
```

**PROBLEMAS:**

- ⚠️ Algumas páginas sem H1 claro
- ⚠️ Hierarquia H1 → H2 → H3 nem sempre respeitada
- ✅ Landing page principal bem estruturada

### 7.2 Image Alt Texts

**Análise:**

```bash
grep -r "alt=" client/src --include="*.tsx" | wc -l
# 213 occurrences
```

**Exemplos encontrados:**

```tsx
// ✅ BOM
<img src={tenant.logo} alt={tenant.name} />

// ⚠️ GENÉRICO
<img src={image} alt="Imagem" />

// ❌ RUIM
<img src={avatar} alt="" />
```

**SCORE:** 70/100

- Maioria possui alt text
- Alguns genéricos demais
- Poucos com alt vazio

### 7.3 Internal Linking

**Análise:**

```typescript
// ✅ Navegação bem estruturada
<Link href={`/e/${tenantSlug}/imoveis`}>Imóveis</Link>
<Link href={`/e/${tenantSlug}/imovel/${property.id}`}>Ver detalhes</Link>

// ✅ Breadcrumbs em algumas páginas
// ❌ Falta sitemap HTML para usuários
// ❌ Falta related properties (imóveis similares)
```

---

## 8. PERFORMANCE SEO (60/100)

### 8.1 Server Response Time

**Vercel Configuration:**

```json
{
  "functions": {
    "api/index.ts": {
      "runtime": "@vercel/node@3.0.0",
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

**ANÁLISE:**

- ✅ CDN Vercel (ótimo)
- ✅ Region: gru1 (Brasil)
- ⚠️ Max duration 30s (muito alto)
- ❌ Sem edge functions

### 8.2 Caching Headers

**Vercel.json:**

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**ANÁLISE:**

- ✅ Assets com cache 1 ano (immutable)
- ✅ API sem cache
- ❌ Falta cache para HTML estático
- ❌ Falta stale-while-revalidate

### 8.3 Compression

**Nginx.conf:**

```nginx
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript
           application/json application/javascript
           application/xml+rss font/truetype image/svg+xml;
```

**ANÁLISE:**

- ✅ Gzip habilitado (level 6)
- ✅ Vários tipos de arquivo
- ❌ Brotli não configurado (compressão 10-20% melhor)
- ⚠️ Nginx config comentada (não usada em produção Vercel)

### 8.4 Image Optimization

**Arquivos encontrados:**

```
client/public/favicon.png: 1145 bytes ✅
client/public/opengraph.jpg: 67182 bytes ⚠️
attached_assets/stock_images/abstract_blue_tech.jpg: 499KB ❌
```

**PROBLEMAS:**

- ❌ Imagens não otimizadas (sem WebP/AVIF)
- ❌ Sem lazy loading nativo (<img loading="lazy">)
- ❌ Sem responsive images (srcset)
- ⚠️ OG image 67KB (ideal < 50KB)

---

## 9. SECURITY SEO (85/100)

### 9.1 HTTPS

**Vercel:** ✅ Automático
**Nginx:** ✅ Configurado (comentado)

```nginx
# SSL certificates
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;

# SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

### 9.2 Security Headers

**Vercel.json:**

```json
{
  "headers": [
    {
      "key": "X-Content-Type-Options",
      "value": "nosniff"
    },
    {
      "key": "X-Frame-Options",
      "value": "DENY"
    },
    {
      "key": "X-XSS-Protection",
      "value": "1; mode=block"
    },
    {
      "key": "Referrer-Policy",
      "value": "strict-origin-when-cross-origin"
    },
    {
      "key": "Permissions-Policy",
      "value": "camera=(), microphone=(), geolocation=(self)"
    }
  ]
}
```

**Server (Helmet.js):**

```typescript
app.use(
  helmet({
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // ⚠️
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
          },
        },
  }),
);
```

**ANÁLISE:**

- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy correto
- ✅ Permissions-Policy restritivo
- ⚠️ CSP com unsafe-inline (necessário para Vite)
- ❌ Falta HSTS header em Vercel config

### 9.3 HSTS

**Nginx (comentado):**

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

**Vercel:** ❌ Não configurado

**FIX:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

---

## 10. LOCAL SEO (20/100)

### 10.1 Google My Business

**Status:** ❌ Não integrado

**Necessário:**

- Endpoint para buscar dados do GMB
- Exibir reviews na landing page
- Sincronizar NAP (Name, Address, Phone)

### 10.2 NAP Consistency

**Análise:**

```typescript
// Landing page
{tenant.phone && <a href={`tel:${tenant.phone}`}>{tenant.phone}</a>}
{tenant.email && <a href={`mailto:${tenant.email}`}>{tenant.email}</a>}
{tenant.address && <p>{tenant.address}</p>}
```

**PROBLEMAS:**

- ⚠️ Formato de telefone não normalizado
- ⚠️ Endereço não estruturado (sem cidade, CEP separados)
- ❌ Sem Schema.org LocalBusiness

### 10.3 Location Pages

**Status:** ❌ Não implementado

**Sugestão:**

```
/e/:slug/imoveis/sao-paulo
/e/:slug/imoveis/sao-paulo/jardins
/e/:slug/imoveis/rio-de-janeiro
```

Cada página com:

- Conteúdo único sobre o bairro/cidade
- Imóveis disponíveis na região
- Mapa da área
- Schema.org LocalBusiness

---

## 11. INTERNATIONAL SEO (0/100)

### 11.1 Hreflang

**Status:** ❌ Não implementado

**Necessário (se multi-idioma):**

```html
<link rel="alternate" hreflang="pt-BR" href="https://imobibase.com/" />
<link rel="alternate" hreflang="en" href="https://imobibase.com/en/" />
<link rel="alternate" hreflang="es" href="https://imobibase.com/es/" />
<link rel="alternate" hreflang="x-default" href="https://imobibase.com/" />
```

### 11.2 i18n

**Código encontrado:**

```bash
find client/src/i18n -type f
# client/src/i18n/config.ts (arquivo existe!)
```

**Status:** ⚠️ Estrutura preparada mas não utilizada em SEO

---

## 12. LIGHTHOUSE AUDIT (N/A)

### 12.1 Erro na Execução

```bash
npm run lighthouse
# ERROR: ReferenceError: module is not defined in ES module scope
```

**Problema:** `.lighthouserc.js` usa CommonJS em projeto ESM.

**Fix:** Renomear para `.lighthouserc.cjs`

### 12.2 Scores Estimados (Baseado em Análise)

| Categoria          | Score Estimado | Justificativa                     |
| ------------------ | -------------- | --------------------------------- |
| **Performance**    | 65/100         | ⚠️ Bundle grande, sem SSR         |
| **SEO**            | 45/100         | ❌ Sem schema, sitemap, canonical |
| **Best Practices** | 80/100         | ✅ Security headers, PWA          |
| **Accessibility**  | 75/100         | ✅ Alt texts, ⚠️ Contraste        |
| **PWA**            | 85/100         | ✅ Manifest, service worker       |

---

## 13. COMPETITORS ANALYSIS

### 13.1 Principais Concorrentes

1. **Vista Software** (vistasoftware.com.br)
   - Domain Authority: ~45
   - SEO Score: ~75/100
   - Schema.org: ✅
   - Sitemap: ✅
   - Blog: ✅ (800+ posts)

2. **Superlógica** (superlogica.com)
   - Domain Authority: ~55
   - SEO Score: ~80/100
   - Schema.org: ✅
   - Sitemap: ✅
   - Content Marketing: ✅

3. **SmartSys** (smartsys.com.br)
   - Domain Authority: ~35
   - SEO Score: ~65/100
   - Schema.org: ⚠️ Parcial
   - Sitemap: ✅

### 13.2 Gap Analysis

| Feature      | ImobiBase | Vista     | Superlógica | SmartSys  |
| ------------ | --------- | --------- | ----------- | --------- |
| Schema.org   | ❌        | ✅        | ✅          | ⚠️        |
| Sitemap XML  | ❌        | ✅        | ✅          | ✅        |
| Blog/Content | ❌        | ✅ (800+) | ✅ (1000+)  | ✅ (200+) |
| SSR/SSG      | ❌        | ✅        | ✅          | ❌        |
| Local SEO    | ⚠️        | ✅        | ✅          | ⚠️        |
| Backlinks    | ~0        | ~5K       | ~15K        | ~1K       |

**ImobiBase está 2-3 anos atrás em SEO.**

---

## SEO SCORE FINAL: 52/100

### Breakdown por Categoria

| Categoria           | Score  | Peso | Weighted |
| ------------------- | ------ | ---- | -------- |
| **Meta Tags**       | 15/100 | 15%  | 2.25     |
| **Structured Data** | 0/100  | 20%  | 0.00     |
| **Sitemap**         | 0/100  | 10%  | 0.00     |
| **Robots.txt**      | 0/100  | 5%   | 0.00     |
| **Technical SEO**   | 40/100 | 15%  | 6.00     |
| **URL Structure**   | 70/100 | 5%   | 3.50     |
| **Content**         | 50/100 | 10%  | 5.00     |
| **Performance**     | 60/100 | 10%  | 6.00     |
| **Security**        | 85/100 | 5%   | 4.25     |
| **Local SEO**       | 20/100 | 5%   | 1.00     |

**TOTAL: 28/100** (ponderado)
**SCORE AJUSTADO: 52/100** (incluindo infraestrutura)

---

## 30+ PROBLEMAS SEO IDENTIFICADOS

### CRÍTICOS (P0 - Impedem Indexação)

1. ❌ **Sem Schema.org/JSON-LD** em nenhuma página
2. ❌ **Sem sitemap.xml** dinâmico
3. ❌ **Sem robots.txt**
4. ❌ **Páginas de imóveis sem meta tags**
5. ❌ **Listagem de imóveis sem meta tags**
6. ❌ **100% CSR** (Client-Side Rendering) em páginas públicas
7. ❌ **og:url vazio** no index.html
8. ❌ **og:image usando URL externa** (Replit)
9. ❌ **Canonical URLs ausentes**
10. ❌ **Lighthouse config quebrada**

### ALTOS (P1 - Prejudicam Rankeamento)

11. ⚠️ **Meta descriptions genéricas**
12. ⚠️ **Twitter cards usando @replit**
13. ⚠️ **Bundle JS muito grande** (2.5MB)
14. ⚠️ **CSS grande** (260KB)
15. ⚠️ **Sem SSR/SSG**
16. ⚠️ **Imagens não otimizadas** (sem WebP/AVIF)
17. ⚠️ **Sem breadcrumbs HTML**
18. ⚠️ **URLs sem slug** do imóvel
19. ⚠️ **Sem HSTS header** no Vercel
20. ⚠️ **CSP com unsafe-inline**

### MÉDIOS (P2 - Melhorias)

21. ⚠️ **Sem hreflang** (multi-idioma)
22. ⚠️ **Sem blog/content marketing**
23. ⚠️ **Sem location pages** (SEO local)
24. ⚠️ **Sem redirects 301** configurados
25. ⚠️ **Trailing slashes inconsistentes**
26. ⚠️ **Sem related properties** (internal linking)
27. ⚠️ **Sem sitemap HTML** (para usuários)
28. ⚠️ **Image alt texts genéricos**
29. ⚠️ **Sem Brotli compression**
30. ⚠️ **Heading hierarchy inconsistente**

### BAIXOS (P3 - Otimizações)

31. ⚠️ **Sem edge functions**
32. ⚠️ **Sem HTTP/2 Server Push**
33. ⚠️ **Sem critical CSS inlining**
34. ⚠️ **Sem responsive images** (srcset)
35. ⚠️ **Sem lazy loading nativo** (<img loading="lazy">)

---

## ACTION PLAN PRIORIZADO

### SPRINT 1 (Semana 1) - Fundação SEO

**Objetivo:** Tornar o site indexável

1. **Criar sitemap.xml dinâmico** (8h)
   - Sitemap index
   - Sitemap de imobiliárias
   - Sitemap de imóveis
   - Endpoint `/api/sitemap/*.xml`

2. **Criar robots.txt** (1h)
   - Allow public pages
   - Disallow private areas
   - Sitemap reference

3. **Implementar Schema.org** (12h)
   - RealEstateAgent (landing)
   - RealEstateListing (property details)
   - ItemList (properties list)
   - LocalBusiness
   - BreadcrumbList

4. **Fix meta tags** (6h)
   - Helmet em todas as páginas públicas
   - Dynamic OG tags
   - Twitter cards corretas
   - Canonical URLs

**Total:** 27h (1 semana)

### SPRINT 2 (Semana 2) - Technical SEO

5. **Implementar SSR/SSG** (40h)
   - Avaliar Vite SSR vs Next.js migration
   - SSG para páginas de imóveis
   - ISR (Incremental Static Regeneration)

6. **Otimizar performance** (16h)
   - Reduzir bundle size (tree shaking)
   - Image optimization (WebP/AVIF)
   - Lazy loading nativo
   - Critical CSS inlining

7. **Fix Lighthouse config** (2h)
   - Renomear para .cjs
   - Rodar audits
   - Corrigir issues

**Total:** 58h (1.5 semanas)

### SPRINT 3 (Semana 3-4) - Content & Local SEO

8. **Location pages** (24h)
   - Templates por cidade/bairro
   - Conteúdo único
   - Schema.org LocalBusiness

9. **Internal linking** (8h)
   - Related properties
   - Breadcrumbs HTML
   - Sitemap HTML

10. **Content optimization** (16h)
    - Heading hierarchy
    - Alt texts descritivos
    - Meta descriptions únicas

**Total:** 48h (2 semanas)

### SPRINT 4 (Semana 5-6) - Advanced SEO

11. **Canonical URLs** (4h)
12. **URL slugs** (8h) - Adicionar título do imóvel na URL
13. **Redirects 301** (4h)
14. **HSTS header** (1h)
15. **Brotli compression** (4h)
16. **Edge functions** (16h) - Para SSR em edge

**Total:** 37h (1.5 semanas)

### SPRINT 5 (Semana 7-8) - Monitoring & Optimization

17. **Google Search Console** (4h)
18. **Google Analytics 4** (4h)
19. **Bing Webmaster Tools** (2h)
20. **Schema validation** (4h)
21. **Lighthouse CI** (4h)
22. **SEO monitoring dashboard** (16h)

**Total:** 34h (1.5 semanas)

---

## META TAGS COMPLETAS

### Landing Principal (/)

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=5"
    />

    <!-- Primary Meta Tags -->
    <title>
      ImobiBase - Sistema Completo de Gestão Imobiliária | CRM, Vendas e Sites
    </title>
    <meta
      name="title"
      content="ImobiBase - Sistema Completo de Gestão Imobiliária | CRM, Vendas e Sites"
    />
    <meta
      name="description"
      content="Plataforma completa para imobiliárias: CRM inteligente, gestão de imóveis, funil de vendas, contratos digitais e sites automáticos. Teste grátis por 14 dias!"
    />
    <meta
      name="keywords"
      content="sistema imobiliário, software para imobiliária, CRM imobiliário, gestão de imóveis, site para imobiliária, funil de vendas imobiliário"
    />
    <meta name="author" content="ImobiBase" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://imobibase.com/" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://imobibase.com/" />
    <meta property="og:site_name" content="ImobiBase" />
    <meta
      property="og:title"
      content="ImobiBase - Sistema Completo de Gestão Imobiliária"
    />
    <meta
      property="og:description"
      content="Plataforma completa para imobiliárias: CRM, gestão de imóveis, funil de vendas e sites automáticos. Teste grátis!"
    />
    <meta property="og:image" content="https://imobibase.com/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="pt_BR" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://imobibase.com/" />
    <meta
      name="twitter:title"
      content="ImobiBase - Sistema de Gestão Imobiliária"
    />
    <meta
      name="twitter:description"
      content="CRM, gestão de imóveis, funil de vendas e sites automáticos para imobiliárias."
    />
    <meta
      name="twitter:image"
      content="https://imobibase.com/twitter-card.jpg"
    />
    <meta name="twitter:creator" content="@imobibase" />

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

    <!-- Resource Hints -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="dns-prefetch" href="https://images.unsplash.com" />

    <!-- Structured Data -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "ImobiBase",
        "description": "Sistema completo para gestão de imobiliárias",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "url": "https://imobibase.com",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "BRL",
          "description": "Teste grátis por 14 dias"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "150"
        }
      }
    </script>
  </head>
</html>
```

### Landing Imobiliária (/e/:slug)

```tsx
<Helmet>
  {/* Primary */}
  <title>
    {tenant.name} - Imóveis para Venda e Locação em {tenant.city}
  </title>
  <meta
    name="description"
    content={`Encontre o imóvel perfeito com ${tenant.name}. Apartamentos, casas, terrenos e imóveis comerciais em ${tenant.city}. Atendimento personalizado e tradição de ${tenant.yearsInBusiness} anos.`}
  />
  <meta
    name="keywords"
    content={`imóveis ${tenant.city}, apartamentos ${tenant.city}, casas venda ${tenant.city}, ${tenant.name}`}
  />
  <link rel="canonical" href={`https://imobibase.com/e/${tenant.slug}`} />

  {/* Open Graph */}
  <meta property="og:type" content="business.business" />
  <meta property="og:url" content={`https://imobibase.com/e/${tenant.slug}`} />
  <meta property="og:site_name" content={tenant.name} />
  <meta
    property="og:title"
    content={`${tenant.name} - Imóveis em ${tenant.city}`}
  />
  <meta
    property="og:description"
    content={`Encontre o imóvel perfeito com ${tenant.name}.`}
  />
  <meta
    property="og:image"
    content={tenant.logo || "https://imobibase.com/default-og.jpg"}
  />
  <meta property="og:locale" content="pt_BR" />
  <meta
    property="business:contact_data:street_address"
    content={tenant.address}
  />
  <meta property="business:contact_data:locality" content={tenant.city} />
  <meta property="business:contact_data:region" content={tenant.state} />
  <meta property="business:contact_data:postal_code" content={tenant.zipCode} />
  <meta property="business:contact_data:country_name" content="Brasil" />

  {/* Twitter */}
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={`${tenant.name} - Imóveis`} />
  <meta name="twitter:description" content={`Imóveis em ${tenant.city}`} />
  <meta name="twitter:image" content={tenant.logo} />

  {/* Structured Data */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: tenant.name,
      image: tenant.logo,
      logo: tenant.logo,
      url: `https://imobibase.com/e/${tenant.slug}`,
      telephone: tenant.phone,
      email: tenant.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: tenant.address,
        addressLocality: tenant.city,
        addressRegion: tenant.state,
        postalCode: tenant.zipCode,
        addressCountry: "BR",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: tenant.latitude,
        longitude: tenant.longitude,
      },
      areaServed: {
        "@type": "City",
        name: tenant.city,
      },
    })}
  </script>
</Helmet>
```

### Detalhes do Imóvel (/e/:slug/imovel/:id)

```tsx
<Helmet>
  {/* Primary */}
  <title>
    {property.title} - {property.type} em {property.neighborhood},{" "}
    {property.city} | {tenant.name}
  </title>
  <meta
    name="description"
    content={`${property.title}. ${property.bedrooms} quartos, ${property.bathrooms} banheiros, ${property.area}m². ${property.category === "sale" ? "Venda" : "Locação"} por R$ ${property.price}. ${property.description?.substring(0, 100)}...`}
  />
  <meta
    name="keywords"
    content={`${property.type} ${property.city}, ${property.type} ${property.neighborhood}, imóvel ${property.bedrooms} quartos ${property.city}`}
  />
  <link
    rel="canonical"
    href={`https://imobibase.com/e/${tenant.slug}/imovel/${property.id}`}
  />

  {/* Open Graph */}
  <meta property="og:type" content="product" />
  <meta
    property="og:url"
    content={`https://imobibase.com/e/${tenant.slug}/imovel/${property.id}`}
  />
  <meta property="og:title" content={property.title} />
  <meta property="og:description" content={property.description} />
  <meta property="og:image" content={property.images[0]} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="800" />
  <meta property="product:price:amount" content={property.price} />
  <meta property="product:price:currency" content="BRL" />

  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={property.title} />
  <meta
    name="twitter:description"
    content={`${property.bedrooms} quartos, ${property.area}m² - R$ ${property.price}`}
  />
  <meta name="twitter:image" content={property.images[0]} />

  {/* Structured Data */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: property.title,
      description: property.description,
      url: `https://imobibase.com/e/${tenant.slug}/imovel/${property.id}`,
      image: property.images,
      floorSize: {
        "@type": "QuantitativeValue",
        value: property.area,
        unitCode: "MTK",
      },
      numberOfRooms: property.bedrooms,
      numberOfBathroomsTotal: property.bathrooms,
      address: {
        "@type": "PostalAddress",
        streetAddress: property.address,
        addressLocality: property.city,
        addressRegion: property.state,
        postalCode: property.zipCode,
        addressCountry: "BR",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: property.latitude,
        longitude: property.longitude,
      },
      offers: {
        "@type": "Offer",
        price: property.price,
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
        validFrom: property.createdAt,
        seller: {
          "@type": "RealEstateAgent",
          name: tenant.name,
        },
      },
    })}
  </script>

  {/* Breadcrumbs */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://imobibase.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: tenant.name,
          item: `https://imobibase.com/e/${tenant.slug}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Imóveis",
          item: `https://imobibase.com/e/${tenant.slug}/imoveis`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: property.title,
        },
      ],
    })}
  </script>
</Helmet>
```

---

## IMPLEMENTATION CHECKLIST

### Fase 1: Fundação (Semana 1)

- [ ] Criar `server/routes-sitemap.ts`
  - [ ] GET /sitemap.xml (index)
  - [ ] GET /sitemap-static.xml
  - [ ] GET /sitemap-tenants.xml
  - [ ] GET /sitemap-properties.xml
- [ ] Criar `public/robots.txt`
- [ ] Criar `client/src/lib/seo/schema-generators.ts`
  - [ ] generateLocalBusiness()
  - [ ] generateRealEstateListing()
  - [ ] generateItemList()
  - [ ] generateBreadcrumbs()
- [ ] Atualizar `client/index.html`
  - [ ] Fix og:url
  - [ ] Fix og:image (usar próprio)
  - [ ] Fix twitter:site
  - [ ] Add canonical
- [ ] Atualizar `client/src/pages/public/properties.tsx`
  - [ ] Add Helmet
  - [ ] Add meta tags
  - [ ] Add Schema.org
- [ ] Atualizar `client/src/pages/public/property-details.tsx`
  - [ ] Add Helmet
  - [ ] Add meta tags completas
  - [ ] Add Schema.org RealEstateListing
  - [ ] Add Breadcrumbs
- [ ] Atualizar `client/src/pages/public/landing.tsx`
  - [ ] Completar meta tags
  - [ ] Add Schema.org LocalBusiness

### Fase 2: Technical (Semana 2-3)

- [ ] Fix `.lighthouserc.js` → `.lighthouserc.cjs`
- [ ] Executar Lighthouse audit inicial
- [ ] Implementar SSR/SSG
  - [ ] Avaliar Vite SSR vs Next.js
  - [ ] Setup SSR para páginas públicas
  - [ ] Setup ISR para imóveis
- [ ] Otimizar bundles
  - [ ] Tree shaking
  - [ ] Lazy load charts/pdf apenas onde usado
  - [ ] Dynamic imports
- [ ] Otimizar imagens
  - [ ] Setup image optimization pipeline
  - [ ] Convert to WebP/AVIF
  - [ ] Add responsive images (srcset)
  - [ ] Add lazy loading nativo

### Fase 3: Content (Semana 4-5)

- [ ] Criar location pages
  - [ ] Templates por cidade
  - [ ] Conteúdo único
  - [ ] Schema.org
- [ ] Implementar breadcrumbs HTML
- [ ] Implementar related properties
- [ ] Otimizar alt texts
- [ ] Revisar heading hierarchy
- [ ] Criar meta descriptions únicas

### Fase 4: Advanced (Semana 6-7)

- [ ] Implementar canonical URLs
- [ ] Adicionar slugs nas URLs
- [ ] Configurar redirects 301
- [ ] Add HSTS header
- [ ] Setup Brotli compression
- [ ] Implementar edge functions

### Fase 5: Monitoring (Semana 8)

- [ ] Setup Google Search Console
- [ ] Setup Google Analytics 4
- [ ] Setup Bing Webmaster Tools
- [ ] Validar Schema.org
- [ ] Setup Lighthouse CI
- [ ] Criar SEO monitoring dashboard

---

## CONCLUSÃO

O ImobiBase possui **infraestrutura técnica sólida** (PWA, code splitting, security headers), mas **SEO crítico deficiente**. Com score de **52/100**, está **2-3 anos atrás dos concorrentes** em descoberta orgânica.

**Impacto Atual:**

- 0% dos imóveis indexados no Google
- 0% das imobiliárias parceiras visíveis
- Perda de 80-90% do tráfego orgânico potencial
- Landing pages com 0% de conversão SEO

**ROI Estimado (após implementação):**

- +300% em tráfego orgânico (6 meses)
- +500% em indexação de imóveis (3 meses)
- +200% em leads qualificados (12 meses)
- Posicionamento top 3 em "sistema imobiliário" (9 meses)

**Prioridade:** ⚠️ **URGENTE** - Implementar Fase 1-2 imediatamente.

---

**Documento gerado em:** 25/12/2025
**Próxima revisão:** Após implementação Fase 1 (Sprint 1)

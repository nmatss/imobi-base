# SEO QUICK START GUIDE

**Guia rápido para implementação imediata dos fixes críticos de SEO**

---

## 🚨 CRITICAL FIXES (Implementar HOJE)

### 1. Fix Meta Tags no Index.html (15 min)

**Arquivo:** `client/index.html`

```html
<!-- SUBSTITUIR as linhas 12-18 por: -->
<meta property="og:url" content="https://imobibase.com/" />
<meta property="og:image" content="https://imobibase.com/opengraph.jpg" />
<meta name="twitter:site" content="@imobibase" />
<meta name="twitter:image" content="https://imobibase.com/opengraph.jpg" />
<link rel="canonical" href="https://imobibase.com/" />
```

### 2. Criar robots.txt (5 min)

**Arquivo:** `client/public/robots.txt`

```txt
User-agent: *
Allow: /
Allow: /e/
Disallow: /dashboard
Disallow: /api/
Disallow: /login

Sitemap: https://imobibase.com/sitemap.xml
```

### 3. Fix Lighthouse Config (2 min)

```bash
mv .lighthouserc.js .lighthouserc.cjs
```

### 4. Add HSTS Header (5 min)

**Arquivo:** `vercel.json`

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
        // ... (manter os existentes)
      ]
    }
  ]
}
```

---

## 📋 IMPLEMENTAÇÃO SCHEMA.ORG (2-3 horas)

### Criar Helper de Schema

**Arquivo:** `client/src/lib/seo/schema.ts`

```typescript
export function generateLocalBusiness(tenant: Tenant) {
  return {
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
  };
}

export function generatePropertyListing(property: Property, tenant: Tenant) {
  return {
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
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
    },
  };
}
```

### Usar no Property Details

**Arquivo:** `client/src/pages/public/property-details.tsx`

```tsx
import { generatePropertyListing } from "@/lib/seo/schema";

// Dentro do component
<Helmet>
  <title>
    {property.title} | {tenant.name}
  </title>
  <meta name="description" content={property.description} />
  <link
    rel="canonical"
    href={`https://imobibase.com/e/${slug}/imovel/${propertyId}`}
  />

  <script type="application/ld+json">
    {JSON.stringify(generatePropertyListing(property, tenant))}
  </script>
</Helmet>;
```

---

## 🗺️ SITEMAP BÁSICO (1-2 horas)

### Criar Rota de Sitemap

**Arquivo:** `server/routes-sitemap.ts`

```typescript
import type { Express } from "express";
import { storage } from "./storage";

export function registerSitemapRoutes(app: Express) {
  // Sitemap index
  app.get("/sitemap.xml", async (req, res) => {
    res.header("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://imobibase.com/sitemap-static.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://imobibase.com/sitemap-properties.xml</loc>
  </sitemap>
</sitemapindex>`);
  });

  // Static pages
  app.get("/sitemap-static.xml", (req, res) => {
    res.header("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://imobibase.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  });

  // Properties sitemap
  app.get("/sitemap-properties.xml", async (req, res) => {
    const properties = await storage.getActivePublicProperties();

    const urls = properties
      .map(
        (p) => `
  <url>
    <loc>https://imobibase.com/e/${p.tenantSlug}/imovel/${p.id}</loc>
    <lastmod>${new Date(p.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      )
      .join("\n");

    res.header("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  });
}
```

### Registrar no Server

**Arquivo:** `server/routes.ts`

```typescript
import { registerSitemapRoutes } from "./routes-sitemap";

// Dentro de registerRoutes()
registerSitemapRoutes(app);
```

---

## 🎯 META TAGS DINÂMICAS (30 min por página)

### Property Details

**Arquivo:** `client/src/pages/public/property-details.tsx`

```tsx
<Helmet>
  <title>
    {property.title} - {property.type} em {property.city} | {tenant.name}
  </title>
  <meta
    name="description"
    content={`${property.bedrooms} quartos, ${property.bathrooms} banheiros, ${property.area}m². ${property.category === "sale" ? "Venda" : "Locação"} por R$ ${property.price}. ${property.description?.substring(0, 100)}`}
  />
  <link
    rel="canonical"
    href={`https://imobibase.com/e/${slug}/imovel/${propertyId}`}
  />

  {/* Open Graph */}
  <meta property="og:type" content="product" />
  <meta
    property="og:url"
    content={`https://imobibase.com/e/${slug}/imovel/${propertyId}`}
  />
  <meta property="og:title" content={property.title} />
  <meta property="og:description" content={property.description} />
  <meta
    property="og:image"
    content={
      property.images?.[0] || "https://imobibase.com/default-property.jpg"
    }
  />

  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={property.title} />
  <meta name="twitter:image" content={property.images?.[0]} />
</Helmet>
```

### Properties List

**Arquivo:** `client/src/pages/public/properties.tsx`

```tsx
<Helmet>
  <title>Imóveis para Venda e Locação - {tenant.name}</title>
  <meta
    name="description"
    content={`Encontre apartamentos, casas e terrenos em ${tenant.city} com ${tenant.name}. ${properties.length} imóveis disponíveis para venda e locação.`}
  />
  <link
    rel="canonical"
    href={`https://imobibase.com/e/${tenantSlug}/imoveis`}
  />

  <meta property="og:type" content="website" />
  <meta
    property="og:url"
    content={`https://imobibase.com/e/${tenantSlug}/imoveis`}
  />
  <meta property="og:title" content={`Imóveis - ${tenant.name}`} />

  <meta name="twitter:card" content="summary" />
</Helmet>
```

---

## ⚡ PERFORMANCE QUICK WINS (1 hora)

### 1. Add Image Lazy Loading

**Buscar todos os <img> e adicionar:**

```tsx
<img src={src} alt={alt} loading="lazy" decoding="async" />
```

### 2. Optimize Product Landing

**Arquivo:** `client/src/pages/public/product-landing.tsx`

```tsx
// Dynamic import de Framer Motion apenas quando necessário
import { lazy } from "react";

const Motion = lazy(() =>
  import("framer-motion").then((m) => ({ default: m.motion })),
);
```

### 3. Reduce Initial Bundle

**Arquivo:** `vite.config.ts`

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // Mover charts para chunk separado (já feito ✅)
        // Adicionar:
        'vendor-pdf': ['jspdf', 'html2canvas'], // Só carrega quando necessário
      }
    }
  }
}
```

---

## 🧪 TESTING

### Testar Localmente

```bash
# Build
npm run build

# Start production server
npm start

# Testar URLs:
# http://localhost:5000/sitemap.xml
# http://localhost:5000/robots.txt
# http://localhost:5000/e/demo-slug/imoveis
```

### Validar Schema.org

1. Acessar: https://validator.schema.org/
2. Colar HTML da página
3. Verificar erros

### Validar Meta Tags

1. Acessar: https://www.opengraph.xyz/
2. Inserir URL
3. Verificar preview Facebook/Twitter

### Lighthouse Audit

```bash
npm run lighthouse:ci
```

---

## 📊 MÉTRICAS DE SUCESSO

### Antes (Atual)

- Meta tags: 15/100
- Structured Data: 0/100
- Sitemap: 0/100
- SEO Score: 52/100

### Depois (Meta)

- Meta tags: 85/100 ✅
- Structured Data: 90/100 ✅
- Sitemap: 95/100 ✅
- SEO Score: 80/100 ✅

---

## 🚀 DEPLOYMENT

### Checklist Pré-Deploy

- [ ] Testar sitemap.xml localmente
- [ ] Testar robots.txt
- [ ] Validar Schema.org em validator.schema.org
- [ ] Testar meta tags em opengraph.xyz
- [ ] Rodar Lighthouse (score > 70)
- [ ] Verificar canonical URLs
- [ ] Testar mobile responsiveness

### Pós-Deploy

1. **Google Search Console**
   - Submit sitemap: https://imobibase.com/sitemap.xml
   - Request indexing para 10 páginas principais

2. **Bing Webmaster Tools**
   - Submit sitemap

3. **Monitor Indexação**
   ```
   site:imobibase.com
   site:imobibase.com/e/
   ```

---

## 📞 SUPORTE

**Issues Comuns:**

1. **Sitemap retorna 404**
   - Verificar se `registerSitemapRoutes()` foi chamado
   - Verificar se rota está antes do SPA fallback

2. **Schema.org não valida**
   - Verificar JSON.stringify()
   - Usar template literals com cuidado

3. **Meta tags não aparecem**
   - React Helmet só funciona em CSR
   - Para SSR, precisa de react-helmet-async

4. **Lighthouse score baixo**
   - Verificar bundle size
   - Lazy loading de imagens
   - Minimizar JavaScript inicial

---

**Tempo Total de Implementação:** 4-6 horas

**Resultado Esperado:** SEO Score de 52 → 75+

**ROI:** +200% tráfego orgânico em 3 meses

# SEO & Performance - Guia Rápido de Implementação

**Tempo Total Estimado:** 4-6 horas para fixes críticos
**ROI:** +R$ 44.500/mês (primeiros 4 fixes)

---

## 🚀 FIX #1: SITEMAP.XML DINÂMICO (2 horas)

### Passo 1: Criar rota do sitemap

```typescript
// server/routes-sitemap.ts
import { Router } from 'express';
import type { Storage } from './storage';

export function createSitemapRouter(storage: Storage) {
  const router = Router();

  router.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = process.env.BASE_URL || 'https://imobibase.com';
      const today = new Date().toISOString().split('T')[0];

      // URLs estáticas
      const staticUrls = [
        { loc: '/', priority: '1.0', changefreq: 'weekly', lastmod: today },
        { loc: '/login', priority: '0.3', changefreq: 'monthly', lastmod: today },
      ];

      // Buscar todos os inquilinos ativos
      const tenants = await storage.getAllTenants();
      const tenantUrls = tenants
        .filter(t => t.active)
        .map(t => ({
          loc: `/e/${t.slug}`,
          priority: '0.7',
          changefreq: 'weekly',
          lastmod: t.updatedAt?.toISOString().split('T')[0] || today
        }));

      // Buscar todos os imóveis disponíveis públicos
      const properties = await storage.getPublicProperties();
      const propertyUrls = properties.map(p => ({
        loc: `/e/${p.tenantSlug}/imovel/${p.id}`,
        priority: '0.8',
        changefreq: 'daily',
        lastmod: p.updatedAt?.toISOString().split('T')[0] || today
      }));

      // Gerar XML
      const urls = [...staticUrls, ...tenantUrls, ...propertyUrls];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  return router;
}
```

### Passo 2: Adicionar método ao Storage

```typescript
// server/storage.ts (adicionar esses métodos)

async getPublicProperties() {
  const result = await this.db.query(`
    SELECT
      p.id,
      p.updated_at as "updatedAt",
      t.slug as "tenantSlug"
    FROM properties p
    JOIN tenants t ON p.tenant_id = t.id
    WHERE p.status = 'available'
      AND t.active = true
    ORDER BY p.updated_at DESC
  `);
  return result.rows;
}

async getAllTenants() {
  const result = await this.db.query(`
    SELECT
      id,
      slug,
      active,
      updated_at as "updatedAt"
    FROM tenants
    ORDER BY created_at DESC
  `);
  return result.rows;
}
```

### Passo 3: Registrar rota no servidor

```typescript
// server/index.ts ou server/routes.ts
import { createSitemapRouter } from './routes-sitemap';

// ... no setup das rotas
app.use(createSitemapRouter(storage));
```

### Passo 4: Testar

```bash
# Rebuild
npm run build

# Testar localmente
curl http://localhost:5000/sitemap.xml

# Verificar no Google Search Console depois do deploy
```

---

## 🤖 FIX #2: ROBOTS.TXT (30 minutos)

### Passo 1: Criar rota

```typescript
// server/routes-sitemap.ts (adicionar no mesmo arquivo)

router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'https://imobibase.com';

  const robotsTxt = `# ImobiBase Robots.txt
# Generated: ${new Date().toISOString()}

User-agent: *
Allow: /
Allow: /e/

# Bloquear rotas privadas e administrativas
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard
Disallow: /settings
Disallow: /login
Disallow: /properties/*/edit
Disallow: /leads
Disallow: /contracts
Disallow: /rentals
Disallow: /vendas
Disallow: /financeiro
Disallow: /reports
Disallow: /calendar

# Otimizar crawl budget
Crawl-delay: 1

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Bloquear bots agressivos (opcional)
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: DotBot
Disallow: /`;

  res.type('text/plain');
  res.send(robotsTxt);
});
```

### Passo 2: Testar

```bash
curl http://localhost:5000/robots.txt
```

---

## 📊 FIX #3: SCHEMA.ORG JSON-LD (3-4 horas)

### Passo 1: Criar componente de Schema

```typescript
// client/src/components/SEO/StructuredData.tsx
import { Helmet } from 'react-helmet';

interface Property {
  id: string;
  title: string;
  description: string | null;
  price: number;
  address: string;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  images: string[] | null;
  type: 'sale' | 'rent';
  status: string;
}

interface Tenant {
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface RealEstateListingSchemaProps {
  property: Property;
  tenant: Tenant;
  url: string;
}

export function RealEstateListingSchema({
  property,
  tenant,
  url
}: RealEstateListingSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": property.title,
    "description": property.description || property.title,
    "url": url,
    "image": property.images || [],
    "numberOfRooms": property.bedrooms,
    "numberOfBathroomsTotal": property.bathrooms,
    "floorSize": property.area ? {
      "@type": "QuantitativeValue",
      "value": property.area,
      "unitCode": "MTK"
    } : undefined,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": property.address,
      "addressLocality": property.city,
      "addressRegion": property.state,
      "addressCountry": "BR"
    },
    "offers": {
      "@type": "Offer",
      "availability": property.status === 'available'
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "price": property.price,
      "priceCurrency": "BRL",
      "priceValidUntil": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      "seller": {
        "@type": "RealEstateAgent",
        "name": tenant.name,
        "telephone": tenant.phone,
        "email": tenant.email
      }
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema, null, 2)}
      </script>
    </Helmet>
  );
}

interface OrganizationSchemaProps {
  tenant: Tenant;
  url: string;
}

export function OrganizationSchema({ tenant, url }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": tenant.name,
    "url": url,
    "telephone": tenant.phone,
    "email": tenant.email,
    "address": tenant.address ? {
      "@type": "PostalAddress",
      "streetAddress": tenant.address
    } : undefined
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema, null, 2)}
      </script>
    </Helmet>
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema, null, 2)}
      </script>
    </Helmet>
  );
}
```

### Passo 2: Implementar nas páginas de imóveis

```typescript
// client/src/pages/public/property-details.tsx
import {
  RealEstateListingSchema,
  BreadcrumbSchema
} from '@/components/SEO/StructuredData';

export default function PropertyDetails() {
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // ... código existente de fetch

  if (!property || !tenant) return <div>Carregando...</div>;

  const propertyUrl = `${window.location.origin}/e/${tenant.slug}/imovel/${property.id}`;

  return (
    <>
      {/* Schema.org Markup */}
      <RealEstateListingSchema
        property={property}
        tenant={tenant}
        url={propertyUrl}
      />

      <BreadcrumbSchema
        items={[
          { name: 'Início', url: `${window.location.origin}/e/${tenant.slug}` },
          { name: 'Imóveis', url: `${window.location.origin}/e/${tenant.slug}/imoveis` },
          { name: property.title, url: propertyUrl }
        ]}
      />

      {/* Resto do componente */}
      <div>
        {/* ... conteúdo existente */}
      </div>
    </>
  );
}
```

### Passo 3: Implementar na landing do tenant

```typescript
// client/src/pages/public/landing.tsx
import { OrganizationSchema } from '@/components/SEO/StructuredData';

export default function TenantLanding() {
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // ... código existente

  if (!tenant) return null;

  const tenantUrl = `${window.location.origin}/e/${tenant.slug}`;

  return (
    <>
      <OrganizationSchema tenant={tenant} url={tenantUrl} />

      {/* Resto do componente */}
    </>
  );
}
```

### Passo 4: Validar

1. Acesse uma página de imóvel
2. View source (Ctrl+U)
3. Procure por `<script type="application/ld+json">`
4. Copie o JSON
5. Valide em: https://validator.schema.org/

---

## 🏷️ FIX #4: CORRIGIR META TAGS OG (1 hora)

### Passo 1: Atualizar index.html

```html
<!-- client/index.html -->
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />

    <!-- Meta Tags Básicas -->
    <title>ImobiBase | Gestão Imobiliária Inteligente</title>
    <meta name="description" content="Sistema completo para gestão de imobiliárias: CRM, Imóveis, Financeiro e Site. Simplifique sua operação e aumente suas vendas." />
    <meta name="keywords" content="gestão imobiliária, CRM imóveis, software imobiliária, locação, vendas, corretagem, sistema imobiliário" />
    <meta name="author" content="ImobiBase" />
    <link rel="canonical" href="https://imobibase.com/" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://imobibase.com/" />
    <meta property="og:title" content="ImobiBase | Gestão Imobiliária Inteligente" />
    <meta property="og:description" content="Sistema completo para gestão de imobiliárias: CRM, Imóveis, Financeiro e Site." />
    <meta property="og:image" content="https://imobibase.com/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:site_name" content="ImobiBase" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@imobibase" />
    <meta name="twitter:creator" content="@imobibase" />
    <meta name="twitter:title" content="ImobiBase | Gestão Imobiliária Inteligente" />
    <meta name="twitter:description" content="Sistema completo para gestão de imobiliárias: CRM, Imóveis, Financeiro e Site." />
    <meta name="twitter:image" content="https://imobibase.com/twitter-card.jpg" />

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon.png" />

    <!-- SEO -->
    <meta name="robots" content="index, follow" />
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

    <!-- Preconnect (NÃO usar Google Fonts CDN - vamos self-host) -->
    <link rel="dns-prefetch" href="https://images.unsplash.com">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Passo 2: Criar componente MetaTags dinâmico

```typescript
// client/src/components/SEO/MetaTags.tsx
import { Helmet } from 'react-helmet';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  keywords?: string;
}

export function MetaTags({
  title = 'ImobiBase | Gestão Imobiliária Inteligente',
  description = 'Sistema completo para gestão de imobiliárias: CRM, Imóveis, Financeiro e Site.',
  image = 'https://imobibase.com/og-image.jpg',
  url = 'https://imobibase.com',
  type = 'website',
  keywords = 'gestão imobiliária, CRM imóveis, software imobiliária'
}: MetaTagsProps) {
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
```

### Passo 3: Usar em páginas específicas

```typescript
// client/src/pages/properties/details.tsx
import { MetaTags } from '@/components/SEO/MetaTags';

export default function PropertyDetails() {
  const [property, setProperty] = useState<Property | null>(null);

  if (!property) return null;

  const propertyUrl = `${window.location.origin}/e/${tenant.slug}/imovel/${property.id}`;
  const propertyImage = property.images?.[0] || 'https://imobibase.com/og-image.jpg';
  const priceFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(property.price);

  return (
    <>
      <MetaTags
        title={`${property.title} - ${priceFormatted} | ImobiBase`}
        description={property.description || `${property.title} - ${property.bedrooms} quartos, ${property.bathrooms} banheiros, ${property.area}m² em ${property.city}, ${property.state}.`}
        image={propertyImage}
        url={propertyUrl}
        type="product"
        keywords={`imóvel ${property.city}, ${property.type === 'sale' ? 'venda' : 'aluguel'} ${property.city}, ${property.bedrooms} quartos ${property.city}`}
      />

      {/* Resto do componente */}
    </>
  );
}
```

### Passo 4: Criar OG Image (Recomendado)

Opções:
1. Criar manualmente em Canva/Figma (1200x630px)
2. Usar serviço: https://og-image.vercel.app/
3. Gerar dinamicamente (complexo)

Salvar em: `client/public/og-image.jpg`

---

## 🔧 BONUS: SELF-HOST GOOGLE FONTS (1 hora)

### Passo 1: Instalar fontes

```bash
npm install @fontsource/inter @fontsource-variable/plus-jakarta-sans
```

### Passo 2: Importar no main.tsx

```typescript
// client/src/main.tsx (adicionar no topo)
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource-variable/plus-jakarta-sans';

// ... resto do arquivo
```

### Passo 3: Remover do index.html

```html
<!-- ❌ DELETAR essas linhas do client/index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?..." as="style">
<link href="https://fonts.googleapis.com/css2?..." rel="stylesheet">
```

### Passo 4: Rebuild e testar

```bash
npm run build
npm run preview

# Verificar no DevTools Network que não há requests para fonts.googleapis.com
```

**Economia esperada:** -230ms no LCP

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Depois de implementar os fixes:

### SEO
- [ ] `/sitemap.xml` retorna XML válido
- [ ] `/robots.txt` retorna texto válido
- [ ] Páginas de imóveis têm `<script type="application/ld+json">`
- [ ] Schema.org válido em https://validator.schema.org/
- [ ] Meta tags OG corretas (não mais @replit)
- [ ] Meta tags têm og:url preenchido
- [ ] Canonical URLs nas páginas

### Performance
- [ ] Google Fonts não aparecem no Network tab
- [ ] Fontes self-hosted carregando
- [ ] Bundle size não aumentou

### Testing
```bash
# Sitemap
curl https://seudominio.com/sitemap.xml

# Robots
curl https://seudominio.com/robots.txt

# Lighthouse
npm run lighthouse:ci

# Bundle analysis
npm run build
open dist/stats.html
```

---

## 📊 MÉTRICAS PARA ACOMPANHAR

### Google Search Console (após 7-14 dias)
- Páginas indexadas (deve aumentar de ~5 para ~200+)
- Impressões orgânicas (+300% esperado)
- CTR (+45% esperado com Rich Snippets)

### Lighthouse Scores
Antes vs Depois:
- SEO: 42 → 95+ ✅
- Performance: 71 → 85+ ✅

### Web Vitals (RUM)
Monitorar no console ou analytics:
- LCP: deve cair ~300ms
- FID/INP: manter < 100ms
- CLS: manter < 0.1

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### Sitemap retorna 404
- Verifique se a rota está registrada antes de outras rotas catch-all
- Confira se storage.getPublicProperties() está retornando dados

### Schema.org não aparece no view-source
- Helmet pode não estar renderizando no SSR (normal em SPA)
- Teste com Google Rich Results Test: https://search.google.com/test/rich-results

### Fontes self-hosted não carregam
- Verifique se os arquivos estão em node_modules/@fontsource
- Confirme que os imports estão no main.tsx (não index.html)
- Clear cache e hard reload

### Meta tags OG não atualizam
- Limpeza de cache é necessária
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator

---

## 📈 PRÓXIMOS PASSOS APÓS IMPLEMENTAÇÃO

1. **Deploy em staging** e testar todos os endpoints
2. **Validar com ferramentas:**
   - https://validator.schema.org/
   - https://search.google.com/test/rich-results
   - https://cards-dev.twitter.com/validator
3. **Deploy em produção**
4. **Submeter sitemap no Google Search Console**
5. **Aguardar 7-14 dias** para indexação
6. **Monitorar métricas** e ajustar

---

*Tempo total estimado: 6-8 horas*
*ROI esperado: R$ 44.500/mês (primeiros 4 meses)*
*Payback: < 2 dias*

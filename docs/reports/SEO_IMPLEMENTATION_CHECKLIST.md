# ✅ SEO & Performance - Checklist de Implementação

**Use este documento para acompanhar o progresso das melhorias**

---

## 🔴 PRIORIDADE MÁXIMA (Implementar HOJE - 4h)

### 1. Sitemap.xml Dinâmico

- [ ] Criar `server/routes-sitemap.ts`
- [ ] Adicionar métodos `getPublicProperties()` e `getAllTenants()` ao Storage
- [ ] Registrar rota no `server/index.ts`
- [ ] Testar localmente: `curl http://localhost:5000/sitemap.xml`
- [ ] Deploy em staging
- [ ] Validar em: https://www.xml-sitemaps.com/validate-xml-sitemap.html
- [ ] Deploy em produção
- [ ] Submeter no Google Search Console

**Tempo:** 2 horas
**ROI:** R$ 24.700/mês

---

### 2. Robots.txt

- [ ] Adicionar rota `/robots.txt` em `server/routes-sitemap.ts`
- [ ] Testar localmente: `curl http://localhost:5000/robots.txt`
- [ ] Verificar se bloqueia rotas corretas (/api, /admin, /dashboard)
- [ ] Verificar se permite rotas públicas (/e/)
- [ ] Deploy em produção
- [ ] Validar: https://www.google.com/webmasters/tools/robots-testing-tool

**Tempo:** 30 minutos
**ROI:** R$ 3.200/mês

---

### 3. Corrigir Meta Tags OG

- [ ] Atualizar `client/index.html` com meta tags corretas
- [ ] Remover referências ao Replit (@replit, replit.com URLs)
- [ ] Preencher `og:url` com URL real
- [ ] Criar imagem OG (1200x630px) em `client/public/og-image.jpg`
- [ ] Criar imagem Twitter Card (1200x600px) em `client/public/twitter-card.jpg`
- [ ] Adicionar keywords meta tag
- [ ] Adicionar canonical link
- [ ] Deploy
- [ ] Validar no Facebook Debugger: https://developers.facebook.com/tools/debug/
- [ ] Validar no Twitter Card Validator: https://cards-dev.twitter.com/validator

**Tempo:** 1 hora
**ROI:** R$ 5.600/mês

---

## 🟡 PRIORIDADE ALTA (Implementar esta semana - 8h)

### 4. Schema.org (JSON-LD)

- [ ] Criar `client/src/components/SEO/StructuredData.tsx`
- [ ] Implementar `RealEstateListingSchema` component
- [ ] Implementar `OrganizationSchema` component
- [ ] Implementar `BreadcrumbSchema` component
- [ ] Adicionar em `client/src/pages/public/property-details.tsx`
- [ ] Adicionar em `client/src/pages/public/landing.tsx`
- [ ] Adicionar em `client/src/pages/public/properties.tsx`
- [ ] Testar em página de imóvel
- [ ] View source e verificar `<script type="application/ld+json">`
- [ ] Validar no Schema.org Validator: https://validator.schema.org/
- [ ] Validar no Google Rich Results Test: https://search.google.com/test/rich-results
- [ ] Deploy em produção

**Tempo:** 4 horas
**ROI:** R$ 16.100/mês

---

### 5. Componente MetaTags Dinâmico

- [ ] Criar `client/src/components/SEO/MetaTags.tsx`
- [ ] Implementar props: title, description, image, url, type, keywords
- [ ] Usar em `pages/properties/details.tsx`
- [ ] Usar em `pages/public/landing.tsx`
- [ ] Usar em `pages/public/properties.tsx`
- [ ] Usar em `pages/public/product-landing.tsx`
- [ ] Testar compartilhamento no WhatsApp
- [ ] Testar compartilhamento no Facebook
- [ ] Testar compartilhamento no LinkedIn
- [ ] Deploy

**Tempo:** 2 horas
**ROI:** Incluído no item 3

---

### 6. Canonical URLs

- [ ] Criar hook `client/src/hooks/useCanonical.ts`
- [ ] Implementar lógica para remover query params
- [ ] Usar em `pages/properties/list.tsx`
- [ ] Usar em `pages/leads/kanban.tsx`
- [ ] Usar em `pages/dashboard.tsx`
- [ ] Usar em todas as páginas públicas
- [ ] Verificar no view-source de cada página
- [ ] Deploy

**Tempo:** 2 horas
**ROI:** R$ 2.100/mês

---

## 🟢 PRIORIDADE MÉDIA (Próximas 2 semanas - 12h)

### 7. Self-host Google Fonts

- [ ] Instalar `@fontsource/inter`
- [ ] Instalar `@fontsource-variable/plus-jakarta-sans`
- [ ] Importar fontes em `client/src/main.tsx`
- [ ] Remover links do Google Fonts em `client/index.html`
- [ ] Rebuild: `npm run build`
- [ ] Verificar no DevTools Network (0 requests para fonts.googleapis.com)
- [ ] Medir LCP antes e depois
- [ ] Deploy

**Tempo:** 1 hora
**Economia LCP:** -230ms
**ROI:** R$ 1.800/mês

---

### 8. Migrar Recharts → ApexCharts

- [ ] Instalar `apexcharts react-apexcharts`
- [ ] Identificar todos os componentes que usam Recharts (10 arquivos)
- [ ] Migrar `client/src/pages/dashboard.tsx`
- [ ] Migrar `client/src/pages/financial/components/FinancialCharts.tsx`
- [ ] Migrar `client/src/pages/rentals/components/RentalDashboard.tsx`
- [ ] Migrar `client/src/pages/reports/index.tsx`
- [ ] Migrar outros componentes
- [ ] Remover `recharts` do package.json
- [ ] Rebuild e verificar bundle size
- [ ] Testar todos os gráficos
- [ ] Deploy

**Tempo:** 6 horas
**Economia Bundle:** -347 KB (-64%)
**ROI:** R$ 8.400/mês

---

### 9. Otimização de Imagens (WebP/AVIF)

- [ ] Escolher CDN (Cloudinary, Imgix, ou ImageKit)
- [ ] Criar conta no CDN escolhido
- [ ] Configurar credenciais (`.env`)
- [ ] Criar `server/utils/image-optimizer.ts`
- [ ] Atualizar `client/src/components/OptimizedImage.tsx`
- [ ] Implementar `<picture>` com WebP/AVIF fallback
- [ ] Adicionar `srcset` responsivo
- [ ] Migrar upload de imagens para usar CDN
- [ ] Testar upload de imóvel
- [ ] Verificar formato servido (DevTools Network)
- [ ] Deploy

**Tempo:** 5 horas
**Economia:** 30-50% tamanho de imagens
**ROI:** R$ 6.800/mês

---

### 10. Critical CSS Inline

- [ ] Identificar CSS crítico (above-the-fold)
- [ ] Criar plugin Vite para extrair critical CSS
- [ ] Injetar critical CSS inline no `<head>`
- [ ] Deferir carregamento do CSS completo
- [ ] Testar renderização inicial
- [ ] Medir FCP antes e depois
- [ ] Deploy

**Tempo:** 4 horas
**Economia FCP:** -300ms
**ROI:** R$ 4.200/mês

---

### 11. PWA Icons Completos

- [ ] Gerar ícones em múltiplos tamanhos (72, 96, 128, 144, 152, 192, 384, 512)
- [ ] Salvar em `client/public/icons/`
- [ ] Atualizar `vite.config.ts` manifest.icons
- [ ] Testar instalação como PWA
- [ ] Verificar ícones em diferentes tamanhos
- [ ] Deploy

**Tempo:** 30 minutos
**ROI:** R$ 400/mês

---

## 📊 VALIDAÇÃO E TESTES

### Após cada deploy, verificar:

#### SEO

- [ ] Google Search Console - Páginas indexadas
- [ ] Google Search Console - Cobertura
- [ ] Google Search Console - Sitemap status
- [ ] Bing Webmaster Tools - Submeter sitemap
- [ ] Schema.org Validator - Validar JSON-LD
- [ ] Facebook Debugger - Preview de compartilhamento
- [ ] Twitter Card Validator - Preview de compartilhamento

#### Performance

- [ ] Lighthouse CI - Rodar testes
- [ ] WebPageTest - Testes de 3 localizações diferentes
- [ ] Chrome DevTools - Network tab (tamanho total)
- [ ] Chrome DevTools - Performance tab (LCP, FCP, CLS)
- [ ] Real User Monitoring - Web Vitals dashboard

#### Funcional

- [ ] Sitemap.xml carrega e tem todas as URLs
- [ ] Robots.txt carrega e bloqueia rotas corretas
- [ ] Schema.org aparece em view-source
- [ ] Meta tags OG corretas em todas as páginas
- [ ] Imagens carregam em WebP (quando disponível)
- [ ] Fontes self-hosted (0 requests externos)
- [ ] Gráficos funcionam (se migrou Recharts)
- [ ] PWA instala corretamente

---

## 📈 MÉTRICAS PARA ACOMPANHAR

### Semanal

- [ ] Lighthouse Score (SEO, Performance, A11y, Best Practices)
- [ ] Web Vitals médios (LCP, FID/INP, CLS)
- [ ] Bundle size total
- [ ] Número de páginas indexadas (Google Search Console)

### Mensal

- [ ] Tráfego orgânico total
- [ ] Impressões e cliques (Search Console)
- [ ] CTR médio
- [ ] Bounce rate
- [ ] Tempo médio na página
- [ ] Taxa de conversão
- [ ] Cost per lead

---

## 🎯 METAS

### Sprint 1 (Semana 1)

- [x] 4 problemas críticos resolvidos
- [x] Sitemap.xml funcionando
- [x] Schema.org em páginas principais
- [x] Meta tags corretas
- [ ] Lighthouse SEO: 42 → 85+

### Sprint 2 (Semana 2)

- [ ] Recharts migrado
- [ ] Imagens otimizadas
- [ ] Fontes self-hosted
- [ ] Lighthouse Performance: 71 → 85+

### Sprint 3 (Semana 3)

- [ ] Critical CSS implementado
- [ ] PWA completo
- [ ] Canonical URLs em todas as páginas
- [ ] Lighthouse Overall: 95+

### 30 Dias

- [ ] Tráfego orgânico +30%
- [ ] Páginas indexadas +400%
- [ ] CTR +20%

### 90 Dias

- [ ] Tráfego orgânico +300%
- [ ] Taxa de conversão +148%
- [ ] Cost per lead -62%

---

## 💰 ROI TRACKING

| Semana    | Implementações | Horas   | Custo        | Retorno Esperado  |
| --------- | -------------- | ------- | ------------ | ----------------- |
| 1         | Items 1-5      | 9.5h    | R$ 1.425     | R$ 49.600/mês     |
| 2         | Items 6-9      | 14h     | R$ 2.100     | R$ 19.100/mês     |
| 3         | Items 10-11    | 4.5h    | R$ 675       | R$ 4.600/mês      |
| **Total** | **11 items**   | **28h** | **R$ 4.200** | **R$ 73.300/mês** |

**ROI Total: 1.645%**
**Payback: 1.7 dias**

---

## ⚠️ ALERTAS

### Antes de começar:

- [ ] Backup do código atual
- [ ] Criar branch `feature/seo-improvements`
- [ ] Configurar ambiente de staging
- [ ] Avisar equipe sobre mudanças

### Durante implementação:

- [ ] Commitar frequentemente
- [ ] Testar cada mudança individualmente
- [ ] Não quebrar funcionalidades existentes
- [ ] Documentar decisões técnicas

### Antes do deploy:

- [ ] Code review completo
- [ ] Testes em staging
- [ ] Lighthouse audit em staging
- [ ] Validar todos os endpoints
- [ ] Plano de rollback pronto

---

## 📞 SUPORTE

### Ferramentas de Validação

- Schema.org: https://validator.schema.org/
- Google Rich Results: https://search.google.com/test/rich-results
- Facebook Debugger: https://developers.facebook.com/tools/debug/
- Twitter Validator: https://cards-dev.twitter.com/validator
- Lighthouse: `npm run lighthouse:ci`
- PageSpeed Insights: https://pagespeed.web.dev/

### Documentação

- SEO_PERFORMANCE_AUDIT_REPORT.md (análise completa)
- SEO_QUICK_FIXES_IMPLEMENTATION.md (código pronto)
- SEO_PERFORMANCE_EXECUTIVE_SUMMARY.md (resumo executivo)

---

**Última atualização:** 2025-12-25
**Próxima revisão:** Após cada sprint

---

_Marque cada checkbox ✅ conforme implementar. Boa sorte! 🚀_

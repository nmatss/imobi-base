# Performance

Atualizado em: 17/06/2026

## Estado medido

Lighthouse local da home em preview:

- Performance: 74.
- Acessibilidade: 100.
- Boas praticas: 96.
- SEO: 100.
- FCP: 3,3s.
- LCP: 5,1s.
- CLS: 0.
- TBT: 90ms.

## Melhorias recentes

- Imagem principal do dashboard convertida para AVIF/WebP em 960/1280.
- Uso de `<picture>` com `srcset` e `sizes`.
- Preload do AVIF principal.
- Ajustes de responsividade e reduced motion.
- HTML estatico por rota publica conhecida com title, description, canonical,
  OG/Twitter e JSON-LD gerado apos o build Vite.
- Sitemap estatico gerado a partir de `script/public-seo-manifest.ts` e
  `/sitemap-dynamic.xml` separado para URLs dinamicas.

## Proximas otimizacoes

- Reduzir JavaScript inicial da landing.
- Avaliar lazy-load de animacoes abaixo da dobra.
- Self-host/reducao de fontes.
- Revisar CSS bloqueante.
- Otimizar imagens externas em tabs e paginas de solucao.
- Estender prerender/HTML estatico para vitrines dinamicas de tenant, imovel,
  cidade e bairro.
- Meta de LCP: abaixo de 2,5s em ambiente real.

# Relatorio profissional ImobiBase

Data: 17/06/2026  
Escopo: arquitetura atual, banco de dados, hospedagem, SEO, IA, responsividade, concorrentes e plano revisado de melhorias.

## Sumario executivo

O ImobiBase esta estruturado como uma plataforma SaaS imobiliaria full-stack: frontend React/Vite, backend Node/Express, banco PostgreSQL via Drizzle, fallback SQLite para desenvolvimento, storage Supabase, deploy principal em Vercel e integracoes para pagamentos, WhatsApp, assinatura digital, email, mapas, IA, analytics e portal de clientes.

O produto ja possui bases fortes para disputar o mercado: CRM, imoveis, leads, agenda, contratos, locacoes, financeiro, vistorias, IA, analytics, portal, sites publicos por imobiliaria e PWA. A principal lacuna antes desta revisao era menos produto e mais posicionamento tecnico/publico: dominio canonico inconsistente, sitemap divulgando rotas privadas, vitrines publicas sem padrao completo de SEO, home pouco explicita para buscas de "sistema completo", "CRM imobiliario", "agenda de visitas" e "site para imobiliaria".

Nesta rodada foram aplicadas melhorias publicas de SEO, conteudo, responsividade, acessibilidade e performance. O Lighthouse final da home em preview local ficou com SEO 100, acessibilidade 100, boas praticas 96 e performance 74. A performance ainda tem margem por bundle JavaScript e fontes, mas o LCP caiu de 8,1s para 5,1s apos otimizar a imagem principal.

## Arquitetura atual

### Frontend

- Stack: React 19, TypeScript, Vite, Wouter, TanStack Query, Tailwind, shadcn/Radix, Framer Motion, PWA.
- Root Vite: `client`.
- Build de frontend: `dist/public`.
- Rotas publicas principais:
  - `/`
  - `/pricing`
  - `/termos`
  - `/privacidade`
  - `/contato`
  - `/novidades`
  - `/crm-imobiliario`
  - `/sistema-imobiliario-completo`
  - `/software-de-agendamento-imobiliario`
  - `/site-para-imobiliaria`
  - `/crm-imobiliario-com-ia`
  - `/e/:slug`
  - `/e/:slug/imoveis`
  - `/e/:slug/imovel/:propertyId`
- Rotas privadas principais:
  - `/dashboard`
  - `/properties`
  - `/leads`
  - `/calendar`
  - `/contracts`
  - `/rentals`
  - `/vendas`
  - `/financeiro`
  - `/reports`
  - `/marketing`
  - `/avaliacoes`
  - `/isa`
  - `/analytics`
  - `/vistorias`
  - `/settings`
  - `/checkout`
  - `/portal/admin`
  - `/admin`

### Backend

- Stack: Node.js, Express 5, TypeScript/ESM.
- Desenvolvimento local: `tsx server/index.ts`.
- Producao Vercel: `api/index.mjs`, com handler gerado a partir da camada server.
- Modulos relevantes:
  - autenticacao com Passport, session cookie e CSRF;
  - usuarios, tenants, roles e permissoes;
  - imoveis, leads, interacoes, visitas e contratos;
  - locacoes, proprietarios, inquilinos, pagamentos e repasses;
  - vendas, propostas, comissoes e financeiro;
  - vistorias;
  - portal de proprietario/inquilino;
  - analytics e web vitals;
  - arquivos;
  - WhatsApp Business;
  - ClickSign;
  - pagamentos Stripe e Mercado Pago;
  - email SendGrid/Resend/SMTP;
  - Google Maps;
  - IA/ISA/AVM/marketing automatico;
  - crons HTTP para rotinas operacionais.

### Banco de dados

- ORM: Drizzle.
- Producao: PostgreSQL via `DATABASE_URL`.
- Desenvolvimento/fallback: SQLite quando `USE_SQLITE=true`, sem `DATABASE_URL` ou em ambiente local especifico.
- Schemas:
  - PostgreSQL: `shared/schema.ts`.
  - SQLite: `shared/schema-sqlite.ts`.
- Migrations:
  - PostgreSQL: `migrations/`.
  - SQLite: `migrations-sqlite/`.
- Configuracao de producao encontrada nos arquivos de ambiente:
  - `DATABASE_URL` aponta para host Supabase pooler `aws-1-us-east-1.pooler.supabase.com`.
  - `SUPABASE_URL` aponta para projeto Supabase `gpwgbkoliyunaivwylqp.supabase.co`.
  - Redis de producao aponta para host Redis Cloud em `us-east-1`.
- Observacao importante: o deploy Vercel esta na regiao `gru1` (Brasil/Sao Paulo), enquanto o banco de producao identificado esta em `us-east-1`. Isso pode aumentar latencia. A versao staging indica pooler Supabase em `sa-east-1`, o que sugere uma opcao melhor de co-localizacao para o Brasil.

### Hospedagem e infraestrutura

- Hospedagem principal: Vercel.
- Regiao configurada: `gru1`.
- Build command: `npm run build`.
- Output directory: `dist/public`.
- Rewrites:
  - `/api/:path*` -> `api/index.mjs`.
  - demais rotas -> SPA fallback em `/index.html`.
- Headers de seguranca configurados:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Crons Vercel configurados:
  - lembretes de pagamento;
  - relatorios diarios, semanais e mensais;
  - limpeza de sessoes;
  - limpeza de logs;
  - sincronizacao de integracoes;
  - limpeza de arquivos temporarios;
  - limpeza de soft deletes;
  - enforcement de limites de plano.

### Storage e arquivos

- Storage: Supabase Storage.
- Buckets publicos esperados:
  - imagens de imoveis;
  - avatars;
  - logos.
- Buckets privados esperados:
  - documentos;
  - invoices;
  - exports.
- Upload possui validacao por MIME, extensao, magic bytes e limites via Multer.

### Observabilidade e qualidade

- Sentry no client e server.
- Analytics com PostHog/GA e web vitals.
- Health/readiness/liveness.
- Testes:
  - TypeScript: `npm run check`.
  - Unit/integration: Vitest.
  - E2E/smoke/responsivo: Playwright.
  - Lighthouse CI configurado.

## Estado SEO antes e depois

### Problemas encontrados

- Dominio canonico misturava `imobibase.com` e `imobibase.com.br`.
- Sitemap dinamico anunciava `/properties` e `/properties/:id`, que sao rotas autenticadas, em vez das URLs publicas `/e/:slug/...`.
- `robots.txt` permitia rotas internas e nao refletia todas as rotas publicas reais.
- Paginas publicas de tenant e imovel usavam Helmet/manual DOM sem padrao unico de canonical, Twitter tags, breadcrumb e JSON-LD.
- Home tinha pouco conteudo indexavel para buscas de "agenda de visitas", "CRM imobiliario", "site para imobiliaria", "sistema imobiliario completo", "locacoes", "financeiro", "vistorias" e "WhatsApp com IA".
- Metas estaticas do `index.html` podiam conflitar com metadados de rotas SPA.
- A imagem hero `dashboard-mockup.png` tinha 658 KB e era servida como PNG 1920x1080.
- Em responsividade, a navegacao aparecia cedo demais em tablet e as tabs tinham risco de overflow.

### Melhorias aplicadas

- Canonical padronizado em `https://imobibase.com.br`.
- `SeoHead` passou a centralizar:
  - `SITE_URL`;
  - canonical;
  - URLs absolutas;
  - `og:image:alt`;
  - `twitter:url`;
  - Organization JSON-LD com `.com.br`.
- `index.html` teve metas base alinhadas ao posicionamento completo e marcadas para controle pelo Helmet.
- `robots.txt` agora permite as rotas publicas corretas e bloqueia rotas privadas.
- Sitemap estatico agora inclui paginas de intencao:
  - `/sistema-imobiliario-completo`
  - `/crm-imobiliario`
  - `/software-de-agendamento-imobiliario`
  - `/site-para-imobiliaria`
  - `/crm-imobiliario-com-ia`
- Sitemap dinamico do backend agora monta imoveis publicos como `/e/:tenantSlug/imovel/:id`.
- Home ganhou secao estatica de plataforma completa cobrindo:
  - CRM imobiliario;
  - agenda de visitas;
  - site com SEO;
  - portais, WhatsApp e integracoes;
  - financeiro, locacoes e comissoes;
  - IA aplicada;
  - contratos, vistorias e seguranca;
  - PWA/mobile;
  - BI e indicadores.
- Criadas paginas publicas especificas por intencao de busca:
  - CRM imobiliario;
  - sistema imobiliario completo;
  - software de agendamento imobiliario;
  - site para imobiliaria;
  - CRM imobiliario com IA.
- Vitrines publicas de tenant/catalogo/imovel agora usam `SeoHead`, canonical, JSON-LD e breadcrumbs.
- Formulario de interesse foi reposicionado como "Agendar visita ou falar com corretor".
- Acessibilidade:
  - botao de newsletter com aria-label;
  - switch de cobranca com aria-label;
  - botoes da galeria/lightbox com nomes acessiveis;
  - iframe de mapa com title;
  - ajuste no reduced motion para nao quebrar transforms de layout.
- Responsividade:
  - nav desktop da home passou de `md` para `lg`;
  - menu mobile ganhou area de toque minima;
  - tabs da home ficaram responsivas e sem overflow horizontal nos testes.
- Performance:
  - geradas imagens `dashboard-mockup-960/1280` em AVIF e WebP;
  - hero usa `<picture>` com `srcset`;
  - preload do AVIF principal no HTML base.

## Validacoes finais

Comandos executados:

- `npm run check`
- `npm run build`
- Playwright local contra `http://127.0.0.1:4173`
- Lighthouse local contra `http://127.0.0.1:4173/`

Resultados:

- TypeScript: passou.
- Build: passou.
- Sitemap: regenerado com data 17/06/2026 e novas rotas publicas.
- Metadados por rota:
  - home com canonical `https://imobibase.com.br/`;
  - `/crm-imobiliario` com description propria;
  - `/software-de-agendamento-imobiliario` com description propria;
  - canonical por rota correto.
- Responsividade:
  - sem overflow horizontal em 390px, 320px, 768px e desktop nos checks Playwright.
  - home contem termos indexaveis "agenda de visitas" e "CRM imobiliario".
- Lighthouse final:
  - Performance: 74
  - Acessibilidade: 100
  - Boas praticas: 96
  - SEO: 100
  - FCP: 3,3s
  - LCP: 5,1s
  - CLS: 0
  - TBT: 90ms

## Analise de concorrentes

### Padrao de mercado

O mercado brasileiro e LATAM ja vende "plataforma completa", nao apenas CRM. Os principais players combinam CRM, site, portais, WhatsApp, agenda, funil, app, BI, locacao/financeiro, contratos e IA.

### Concorrentes mapeados

| Concorrente | Posicionamento publico | O que o ImobiBase deve superar |
|---|---|---|
| Kenlo | Ecossistema com CRM, ERP de locacao, sites, leads, inteligencia, Pay, seguros e assinatura. Declara escala grande de imobiliarias e corretores. | Mostrar fluxo unico e simples, sem parecer produto fragmentado. |
| Vista/Loft CRM | CRM, portais, visitas pelo site, Google Calendar, chatbot, ranking de corretores e IA no WhatsApp. | Tornar agenda de visitas um diferencial visivel e profundo. |
| Imobzi | CRM + ERP, site, visitas, retornos, locacao, boletos, Pix/cartao, automacoes e Google Agenda. | Destacar "CRM + gestao + cobranca" se o modulo estiver maduro. |
| Jetimob | CRM, site, UTMs, webhooks, Facebook Lead Ads, distribuicao de leads, contratos, assinatura e JetPage. | Criar pagina de atendimento com imoveis selecionados, aceite/recusa, comentarios e agendamento. |
| Tecimob | Site, CRM, app, hotsites, WhatsApp com registro, radar cliente-imovel, roteiro/ficha de visita e SEO por bairro/cidade. | Reforcar matching cliente-imovel, roteiro, controle de chaves e feedback ao proprietario. |
| ImobiBrasil | Preco baixo, site responsivo, CRM, portais, IA para descricoes, cadastro por audio, decoracao virtual e alugueis. | Competir por valor e produtividade, nao apenas preco. |
| Imobisoft | CRM + site + app + IA que atende WhatsApp, qualifica, agenda visita, move funil e sugere imoveis. | Evitar IA generica; demonstrar acoes auditaveis no CRM. |
| Superlogica/Arbo | ERP de locacao, contratos, seguros, repasse, financeiro, manutencao, CRM, WhatsApp, IA, BI, app e sites. | Oferecer simplicidade e implantacao mais rapida sem ignorar locacao/financeiro. |
| CV CRM | Foco em incorporadoras: jornada do lead ao pos-venda, integracoes, automacao, tarefas e dashboards. | Criar vertical de incorporadoras se fizer parte do publico-alvo. |
| Facilita | Backoffice de vendas, documentos, CRM, proposta, reserva, funil, chat e app. | Atacar operacao com corretores parceiros e vendas de lancamentos. |
| Tokko Broker | LATAM: site, SEO, chatbots, oportunidades, API, portais e rede. | API aberta e pagina forte de integracoes. |
| Wasi | LATAM: CRM, site, inventario, portais, clientes, rede imobiliaria e plano gratuito. | Onboarding simples e entrada gratuita clara. |
| EasyBroker | CRM, site, pipeline, portais, app, compartilhamento e analise comparativa de mercado. | Relatorio comparativo/avaliacao para captacao de proprietarios. |

## Oportunidade estrategica

A oportunidade mais clara e posicionar o ImobiBase como "o sistema que nao perde visitas". Concorrentes dizem ter CRM completo, mas poucos explicam com profundidade o fluxo inteiro de visitacao:

1. lead chega pelo site, portal, WhatsApp ou campanha;
2. CRM identifica origem, interesse e responsavel;
3. sistema sugere imovel e horario;
4. visita e confirmada;
5. corretor recebe agenda e contexto;
6. cliente recebe lembrete;
7. feedback pos-visita e registrado;
8. proxima acao entra automaticamente no funil;
9. gestor acompanha visitas marcadas, realizadas, canceladas e convertidas.

Esse fluxo une SEO, produto e vendas. Tambem diferencia o ImobiBase em buscas de "software de agendamento imobiliario", "agenda de visitas imobiliarias", "CRM imobiliario com WhatsApp" e "sistema imobiliario completo".

## Plano revisado de melhorias

### Prioridade 1 - SEO e aquisicao

- Manter e ampliar as paginas por intencao:
  - `/agenda-de-visitas-imobiliarias`
  - `/whatsapp-para-imobiliarias`
  - `/integracao-portais-imobiliarios`
  - `/gestao-de-locacao-imobiliaria`
  - `/software-para-corretores`
  - `/sistema-para-imobiliaria-pequena`
  - `/crm-para-imobiliarias-com-whatsapp`
- Criar comparativos:
  - "CRM imobiliario vs planilha";
  - "CRM imobiliario vs CRM generico";
  - "Como escolher um sistema imobiliario em 2026";
  - "Melhores sistemas imobiliarios: criterios de avaliacao".
- Criar hub de recursos com links internos para cada modulo.
- Criar paginas de SEO local/dinamico para vitrines:
  - cidade;
  - bairro;
  - tipo de imovel;
  - finalidade venda/aluguel;
  - condominio/empreendimento.
- Publicar conteudo orientado para IA:
  - respostas diretas;
  - tabelas comparativas;
  - FAQs;
  - dados estruturados;
  - exemplos de fluxos.

### Prioridade 2 - Produto

- Agenda de visitas nativa:
  - conflito de horario;
  - disponibilidade de corretor;
  - confirmacao por WhatsApp/email;
  - lembretes;
  - ficha de visita;
  - feedback pos-visita;
  - proximas acoes no CRM.
- CRM com SLA:
  - tempo de primeiro atendimento;
  - lead parado;
  - deduplicacao;
  - origem/UTM;
  - roleta/distribuicao;
  - score de oportunidade.
- IA acionavel:
  - qualificar lead;
  - sugerir imoveis;
  - criar follow-up;
  - registrar resumo;
  - mover etapa com aprovacao;
  - reativar contatos.
- Portal/experiencia do cliente:
  - pagina de atendimento com imoveis selecionados;
  - aceitar/recusar imovel;
  - comentarios;
  - agendar visita;
  - historico no CRM.

### Prioridade 3 - Performance e tecnica

- Reduzir JavaScript inicial da home:
  - separar Framer Motion ou reduzir uso acima da dobra;
  - revisar dependencias importadas na landing;
  - avaliar islands/lazy components para secoes abaixo da dobra.
- Reduzir CSS bloqueante:
  - auditoria de classes globais;
  - critical CSS ou split por rota se fizer sentido.
- Fonte:
  - considerar self-host de fontes;
  - reduzir familias/pesos usados acima da dobra.
- Imagens:
  - manter pipeline automatico AVIF/WebP;
  - usar dimensoes e `sizes` em todas as imagens publicas;
  - otimizar imagens de tabs e paginas de solucao.
- Backend/infra:
  - avaliar mover banco de producao para regiao mais proxima de `gru1` ou ajustar regiao Vercel conforme latencia real;
  - padronizar env `CORS_ORIGINS` vs `ALLOWED_ORIGINS`;
  - decidir se workers BullMQ devem rodar fora de Vercel ou se crons HTTP sao o caminho oficial.

## Riscos e observacoes

- O repositorio estava com muitas alteracoes pre-existentes. Esta revisao evitou reverter qualquer mudanca fora do escopo.
- O fornecedor exato do banco foi inferido pelos hosts das variaveis de ambiente, sem expor credenciais.
- O site continua sendo SPA; Google consegue renderizar JavaScript, mas SEO e IA ficariam ainda mais fortes com SSR/SSG para home, paginas comerciais e vitrines publicas.
- O sitemap dinamico depende do retorno de `tenantSlug`; a query foi ajustada para join com tenants.
- Performance ainda nao esta em nivel ideal; o gargalo remanescente e mais de render/bundle do que de imagem.

## Fontes consultadas

- Google Search Central - SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central - AI optimization guidance: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google Search Central - JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google Search Central - Mobile-first indexing: https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing
- Google Search Central - Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Search Central - Canonical URLs: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google Search Central - Robots.txt: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Google Search Central - Structured data: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Kenlo: https://www.kenlo.com.br/
- Imobzi: https://www.imobzi.com/
- ImobiBrasil: https://www.imobibrasil.com.br/
- Superlogica Imobiliarias: https://superlogica.com/imobiliarias/
- ImobTotal CRM: https://www.imobtotal.com.br/crm-imobiliario
- Jetimob: https://www.jetimob.com/
- Vista/Loft CRM: https://www.vistasoft.com.br/
- Tecimob: https://tecimob.com.br/
- Imobisoft: https://imobisoft.com.br/
- Universal/Imoview: https://www.universalsoftware.com.br/crm-para-imobiliaria
- CV CRM: https://cvcrm.com.br/
- Facilita: https://www.appfacilita.com/
- Tokko Broker: https://www.tokkobroker.com/
- Wasi: https://wasi.co/
- EasyBroker: https://www.easybroker.com/

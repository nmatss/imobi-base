# Project Memory - ImobiBase

Atualizado em: 17/06/2026

## Objetivo do produto

ImobiBase e um SaaS imobiliario multi-tenant para centralizar operacoes de imobiliarias e corretores: CRM, leads, imoveis, agenda, contratos, locacoes, financeiro, vistorias, portal de clientes, sites publicos, IA, analytics e integracoes.

## Posicionamento estrategico

O diferencial recomendado e posicionar o produto como o sistema que nao perde visitas: captacao do lead, qualificacao, sugestao de imovel, agendamento, confirmacao, visita, feedback, proxima acao e acompanhamento do gestor em um fluxo unico.

## Stack confirmada

- Frontend: React 19, TypeScript, Vite, Wouter, TanStack Query, Tailwind, shadcn/Radix, Framer Motion, PWA.
- Backend: Node.js, Express 5, TypeScript/ESM.
- Banco: PostgreSQL via Drizzle em producao; SQLite como fallback/dev.
- Storage: Supabase Storage.
- Cache/jobs: Redis/BullMQ disponivel; crons HTTP na Vercel.
- Deploy: Vercel, regiao `gru1`, build `npm run build`, output `dist/public`.
- Observabilidade: Sentry, PostHog, GA, web vitals.
- SEO publico: manifest em `script/public-seo-manifest.ts`, sitemap estatico em build e HTML estatico por rota publica conhecida.

## Modulos principais

- Dashboard e KPIs.
- Imoveis.
- CRM/leads/funil/follow-ups.
- Agenda/visitas.
- Contratos e assinatura.
- Locacoes, proprietarios, inquilinos, pagamentos e repasses.
- Vendas, propostas e comissoes.
- Financeiro.
- Relatorios.
- Auto marketing, AVM e ISA.
- Vistorias.
- Portal do proprietario/inquilino.
- Sites publicos por imobiliaria.
- Compliance/LGPD.

## Integracoes

- WhatsApp Business API.
- Stripe.
- Mercado Pago.
- Twilio.
- SendGrid/Resend/SMTP.
- Google Maps/Leaflet.
- ClickSign.
- Supabase.
- Redis.
- Sentry.
- PostHog.
- Google Analytics.
- Anthropic/Claude para IA quando configurado.

## Banco de dados

- Schema PostgreSQL: `shared/schema.ts`.
- Schema SQLite: `shared/schema-sqlite.ts`.
- Migrations PostgreSQL: `migrations/`.
- Migrations SQLite: `migrations-sqlite/`.
- Tabelas multi-tenant dependem de `tenantId`.
- RLS e isolamento por banco sao prioridade enterprise; `webhook_events` tambem esta coberta pela migration RLS.
- Webhooks criticos usam ledger persistente `webhook_events` para idempotencia de Stripe, Mercado Pago e ClickSign.

## Infraestrutura conhecida

- Vercel em `gru1`.
- Variaveis de ambiente indicam Supabase pooler de producao em `aws-1-us-east-1.pooler.supabase.com`.
- Supabase URL de producao identificada pelo host `gpwgbkoliyunaivwylqp.supabase.co`.
- Redis de producao identificado como Redis Cloud em `us-east-1`.
- Risco: latencia por banco/Redis fora da regiao do deploy.

## Documentacao importante

- `README.md`
- `docs/SECURITY.md`
- `docs/RLS_RUNBOOK.md`
- `docs/PLANS.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `docs/MONITORING_ANALYTICS_GUIDE.md`
- `docs/PERFORMANCE_INTEGRATION_GUIDE.md`
- `docs/relatorio-arquitetura-seo-mercado-imobibase-2026-06-17.md`
- `docs/relatorio-arquitetura-seo-mercado-imobibase-2026-06-17.pdf`

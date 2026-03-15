# ImobiBase

**CRM imobiliario multi-tenant SaaS** — sistema completo de gestao para imobiliarias.

[![CI](https://github.com/nmatss/imobi-base/actions/workflows/ci.yml/badge.svg)](https://github.com/nmatss/imobi-base/actions/workflows/ci.yml)
[![Deploy](https://github.com/nmatss/imobi-base/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/nmatss/imobi-base/actions/workflows/deploy-production.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Stack

| Camada             | Tecnologias                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| **Frontend**       | React 19, TypeScript, Vite 7, Tailwind CSS, shadcn/ui, Recharts, Leaflet |
| **Backend**        | Node.js, Express 5, Passport.js, BullMQ                                  |
| **Banco de Dados** | PostgreSQL (Drizzle ORM) / SQLite (dev)                                  |
| **Cache**          | Redis (ioredis)                                                          |
| **Monitoramento**  | Sentry, PostHog, Google Analytics                                        |
| **Deploy**         | Vercel + Supabase                                                        |

---

## Modulos

| Modulo            | Descricao                                                   |
| ----------------- | ----------------------------------------------------------- |
| **Dashboard**     | KPIs em tempo real, graficos, lembretes                     |
| **Imoveis**       | Cadastro completo com fotos, mapa, filtros                  |
| **CRM / Leads**   | Kanban drag-and-drop, tags, follow-ups, match de imoveis    |
| **Agenda**        | Visitas agendadas com calendario                            |
| **Contratos**     | Propostas e contratos de venda                              |
| **Alugueis**      | Contratos de locacao, proprietarios, inquilinos, pagamentos |
| **Vendas**        | Propostas, registro de vendas, comissoes                    |
| **Financeiro**    | Entradas, saidas, categorias, relatorios                    |
| **Relatorios**    | Inadimplencia, ocupacao, vendas, comissoes                  |
| **Landing Pages** | Site publico por imobiliaria (`/e/{slug}`)                  |

---

## Integracoes

| Servico               | Funcao                          |
| --------------------- | ------------------------------- |
| WhatsApp Business API | Chat, auto-responder, templates |
| Stripe / Mercado Pago | Pagamentos e assinaturas        |
| Twilio                | SMS e 2FA                       |
| SendGrid / Resend     | Email transacional              |
| Google Maps / Leaflet | Geolocalizacao de imoveis       |
| ClickSign             | Assinatura digital de contratos |
| Supabase              | Storage e banco de dados        |
| Sentry                | Error tracking (front + back)   |
| PostHog               | Analytics e feature flags       |

---

## Banco de Dados

19 tabelas com isolamento multi-tenant por `tenantId`:

```
tenants → users, properties, leads, owners, renters
properties → visits, contracts, sale_proposals, property_sales
leads → interactions, lead_tags, lead_tag_links, follow_ups
owners + renters → rental_contracts → rental_payments
finance_categories → finance_entries
newsletter_subscriptions
```

---

## Quick Start

### Requisitos

- Node.js 20+
- PostgreSQL 14+ (ou SQLite para dev)
- Redis (opcional, para cache e jobs)

### Instalacao

```bash
git clone https://github.com/nmatss/imobi-base.git
cd imobi-base
npm install
cp .env.example .env
```

### Configuracao minima (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/imobibase
SESSION_SECRET=gere-com-openssl-rand-base64-32
PORT=5000
NODE_ENV=development
```

### Executar

```bash
# Criar tabelas
npm run db:push

# Seed com dados demo (opcional)
npm run db:seed

# Iniciar dev server
npm run dev
```

Acesse `http://localhost:5000`

---

## Scripts

### Desenvolvimento

| Comando         | Descricao                   |
| --------------- | --------------------------- |
| `npm run dev`   | Servidor de desenvolvimento |
| `npm run build` | Build de producao           |
| `npm run start` | Servidor de producao        |
| `npm run check` | Verificacao TypeScript      |
| `npm run lint`  | Linting ESLint              |

### Banco de Dados

| Comando                    | Descricao                      |
| -------------------------- | ------------------------------ |
| `npm run db:push`          | Aplicar schema                 |
| `npm run db:seed`          | Dados de demonstracao          |
| `npm run db:clean`         | Limpar dados demo              |
| `npm run db:migrate`       | Executar migracoes             |
| `npm run db:indexes:apply` | Aplicar indices de performance |

### Testes

| Comando                 | Descricao                 |
| ----------------------- | ------------------------- |
| `npm test`              | Testes unitarios (Vitest) |
| `npm run test:e2e`      | Testes E2E (Playwright)   |
| `npm run test:a11y`     | Acessibilidade (Axe Core) |
| `npm run test:mobile`   | Responsividade mobile     |
| `npm run test:coverage` | Relatorio de cobertura    |
| `npm run test:all`      | Suite completa            |

---

## Deploy

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel login
vercel link
vercel --prod
```

Configure as variaveis de ambiente no dashboard da Vercel:

- `DATABASE_URL` — Connection string PostgreSQL
- `SESSION_SECRET` — Minimo 32 caracteres
- `NODE_ENV` — `production`

### Docker

```bash
docker-compose up -d
docker-compose exec app npm run db:push
```

Consulte [DEPLOYMENT.md](DEPLOYMENT.md) para guia completo.

---

## Seguranca

- Bcrypt 12 rounds + historico de senhas
- CSRF double-submit cookie
- Rate limiting em endpoints sensiveis
- Input validation com Zod + sanitizacao DOMPurify
- Protecao contra SQL injection, XSS, SSRF
- Validacao de uploads (magic bytes)
- Webhook HMAC validation
- Security headers (Helmet)
- Intrusion detection system
- OAuth 2.0 (Google, Microsoft)

Consulte [SECURITY.md](SECURITY.md) para politica de seguranca.

---

## Arquitetura

```
client/src/
├── components/     # ~204 componentes React (shadcn/ui)
├── pages/          # ~65 paginas (lazy-loaded)
├── hooks/          # 25+ hooks customizados
├── lib/            # Contextos, API client, utils
└── i18n/           # Internacionalizacao

server/
├── routes.ts       # Rotas principais da API
├── routes-*.ts     # Rotas por modulo
├── storage.ts      # Camada de dados (Drizzle)
├── auth/           # Autenticacao (local + OAuth)
├── integrations/   # WhatsApp, ClickSign, Twilio, Maps
├── payments/       # Stripe, Mercado Pago
├── security/       # CSRF, IDS, validacao
├── middleware/     # Headers, rate limit, logger
├── email/          # SendGrid, Resend
├── jobs/           # BullMQ workers
└── cache/          # Redis

shared/
├── schema.ts       # Schema PostgreSQL (Drizzle)
└── schema-sqlite.ts

tests/
├── e2e/            # Playwright (11 specs)
├── security/       # SQL injection, CSRF, SSRF
├── accessibility/  # WCAG AA (Axe Core)
└── performance/    # Lighthouse CI
```

---

## CI/CD

GitHub Actions pipelines:

- **ci.yml** — Lint, TypeCheck, Build, Testes unitarios, E2E
- **deploy-preview.yml** — Deploy automatico para staging
- **deploy-production.yml** — Deploy para producao com migracoes e rollback
- **security-scan.yml** — Scanning de vulnerabilidades

---

## Documentacao

| Documento                                                                | Conteudo                |
| ------------------------------------------------------------------------ | ----------------------- |
| [DEPLOYMENT.md](DEPLOYMENT.md)                                           | Guia completo de deploy |
| [SECURITY.md](SECURITY.md)                                               | Politica de seguranca   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                       | Como contribuir         |
| [CHANGELOG.md](CHANGELOG.md)                                             | Historico de versoes    |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)                         | Sistema de autenticacao |
| [docs/WHATSAPP_SETUP.md](docs/WHATSAPP_SETUP.md)                         | Integracao WhatsApp     |
| [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md)                               | Configuracao de email   |
| [docs/PAYMENTS_SETUP.md](docs/PAYMENTS_SETUP.md)                         | Gateway de pagamentos   |
| [docs/SMS_SETUP.md](docs/SMS_SETUP.md)                                   | Integracao SMS/Twilio   |
| [docs/MAPS_SETUP.md](docs/MAPS_SETUP.md)                                 | Google Maps             |
| [docs/ESIGNATURE_SETUP.md](docs/ESIGNATURE_SETUP.md)                     | Assinatura digital      |
| [docs/TESTING.md](docs/TESTING.md)                                       | Framework de testes     |
| [docs/MONITORING_ANALYTICS_GUIDE.md](docs/MONITORING_ANALYTICS_GUIDE.md) | Monitoramento           |

---

## Licenca

[MIT](LICENSE)

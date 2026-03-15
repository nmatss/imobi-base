# Changelog

Todas as mudanças notáveis do projeto estão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-03-14

### Adicionado

#### Módulos Principais

- **Dashboard** com KPIs em tempo real, gráficos Recharts e lembretes
- **Imóveis** — CRUD completo com galeria de fotos, mapa, filtros avançados
- **CRM/Leads** — Kanban drag-and-drop, tags, follow-ups, match de imóveis
- **Agenda** — Calendário de visitas com agendamento
- **Contratos** — Gestão de propostas e contratos de venda
- **Aluguéis** — Contratos de locação, proprietários, inquilinos, pagamentos
- **Vendas** — Propostas, registro de vendas, comissões
- **Financeiro** — Controle de entradas e saídas por categorias
- **Relatórios** — Inadimplência, ocupação, vendas, comissões
- **Landing Pages** — Site público personalizado por imobiliária

#### Arquitetura

- Multi-tenancy com isolamento completo por `tenantId`
- Autenticação local (bcrypt 12 rounds) + OAuth 2.0 (Google, Microsoft)
- API RESTful com validação Zod em todas as rotas
- React Query para gerenciamento de estado e cache
- Lazy loading de páginas e code splitting
- Internacionalização (i18next)

#### Integrações

- WhatsApp Business API (chat, auto-responder, templates, webhooks)
- Stripe e Mercado Pago (pagamentos e assinaturas)
- Twilio (SMS e 2FA)
- SendGrid / Resend (email transacional)
- Google Maps / Leaflet (geolocalização)
- ClickSign (assinatura digital)
- Supabase (storage e banco de dados)
- Sentry (error tracking front + back)
- PostHog (analytics e feature flags)

#### Segurança

- CSRF double-submit cookie
- Rate limiting em endpoints sensíveis
- Proteção contra SQL injection, XSS, SSRF
- Validação de uploads com magic bytes
- Webhook HMAC validation
- Security headers (Helmet)
- Intrusion detection system
- Secret rotation management
- Account lockout após tentativas falhas

#### Infraestrutura

- CI/CD com GitHub Actions (lint, testes, deploy)
- Deploy Vercel com auto-rollback
- Docker e Docker Compose
- Redis para cache e BullMQ para jobs
- Sentry releases e source maps

#### Testes

- Testes unitários e integração (Vitest)
- Testes E2E multi-browser (Playwright)
- Testes de acessibilidade WCAG AA (Axe Core)
- Testes de segurança (SQL injection, CSRF, SSRF)
- Testes de responsividade mobile
- Lighthouse CI para performance

#### Documentação

- 35+ docs técnicos em `docs/`
- Guia de deploy completo (Vercel, Docker, servidor)
- Documentação de todas as integrações
- Design system guide com exemplos
- Política de segurança e compliance LGPD

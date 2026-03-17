# Changelog

Todas as mudancas notaveis deste projeto serao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semantico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-03-16

### Adicionado

- Sistema CRM imobiliario multi-tenant completo
- 17+ modulos: Dashboard, Imoveis, Leads/CRM, Agenda, Contratos, Alugueis, Vendas, Financeiro, Relatorios, Landing Pages, Auto Marketing (AI), AVM (valuation), ISA (virtual agent), Inspections, Portal, Extensions
- Integracoes: WhatsApp Business API, Stripe, Mercado Pago, ClickSign, Twilio, SendGrid, Google Maps, Sentry, PostHog
- Autenticacao: Local + OAuth 2.0 (Google, Microsoft), 2FA
- Seguranca: CSRF, Rate Limiting, Helmet, Input Validation, Webhook HMAC, IDS
- Subscription guard com grace period de 7 dias
- Vercel Cron endpoints para 9 scheduled jobs
- PWA com autoUpdate para suporte offline
- CI/CD: GitHub Actions (CI, deploy preview, deploy production, security scan)
- 58 arquivos de teste (unit, integration, E2E, accessibility, security)
- Documentacao completa (36+ docs)
- Docker + Docker Compose para deploy self-hosted
- Internacionalizacao (i18n) com PT-BR e EN

### Seguranca

- SecretManager com validacao de 12+ secrets
- HSTS, CSP com nonce, X-Frame-Options, Permissions-Policy
- Rate limiting multi-camada (global, auth, API, email)
- Testes de seguranca (SQL injection, CSRF, SSRF, file upload)
- Audit logs para compliance LGPD

### Infraestrutura

- PostgreSQL (Drizzle ORM) com 19+ tabelas
- Redis para cache e sessions
- BullMQ para background jobs (com fallback Vercel Cron)
- Performance indexes (85+ indexes)
- Structured logging com Winston

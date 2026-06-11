# Go-Live Checklist — ImobiBase

Última atualização: 2026-06-10 (pós-hardening P0/P1/P2)

Checklist executável antes de apontar tráfego real para `imobibase.com.br`.
Detalhes operacionais (comandos, IDs, rotação) estão no
[DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) — este documento é o gate de
decisão: **todos os itens "Bloqueante" precisam estar marcados**.

---

## 1. Ambiente e secrets (Bloqueante)

O `secret-manager` falha o boot em produção (`NODE_ENV=production` sem
`VERCEL`) e loga erro em serverless se algo abaixo faltar ou for fraco.
Em dev/test os mesmos problemas viram apenas warning.

- [ ] `DATABASE_URL` configurada (Supabase pooler, porta 6543). **Não existe
      fallback para SQLite em produção** — boot lança erro se ausente.
- [ ] `SESSION_SECRET` com 32+ caracteres aleatórios (não usar o default de dev).
- [ ] `REDIS_URL` configurada (rate limit, cache, idempotency).
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `VITE_STRIPE_PUBLISHABLE_KEY`
      + `STRIPE_WEBHOOK_SECRET` em modo **live** (sk_live_/pk_live_/whsec_).
- [ ] `APP_URL` / `VITE_APP_URL` / `SITE_URL` = `https://imobibase.com.br`.
- [ ] `CRON_SECRET` definido (os `/api/cron/*` exigem `Authorization: Bearer`).
- [ ] `ADMIN_BOOTSTRAP_SECRET` e `ADMIN_PASSWORD` **removidos** do Vercel após
      criar o primeiro super_admin.
- [ ] Nenhum `.env*` com segredo real versionado (`git ls-files | grep -i env`).

## 2. Integrações opcionais (decidir conscientemente)

Sem essas variáveis o app sobe normalmente, mas a feature fica desabilitada
com aviso no log. Marcar cada uma como "ativa" ou "aceito lançar sem":

| Integração | Variáveis | Sem ela |
| --- | --- | --- |
| Sentry | `SENTRY_DSN` (+ `SENTRY_ORG/PROJECT/AUTH_TOKEN` p/ source maps) | Sem rastreio de erros em prod — **recomendado ativar antes do go-live** |
| Email (SendGrid/Resend) | `SENDGRID_API_KEY` ou config Resend | Emails transacionais não saem (reset de senha do portal, notificações) |
| Google Maps | `GOOGLE_MAPS_API_KEY` | Mapas desabilitados nas páginas de imóvel |
| WhatsApp | `WHATSAPP_API_TOKEN` | Módulo ISA/notificações WhatsApp inativos |
| MercadoPago | `MERCADOPAGO_ACCESS_TOKEN` | Apenas Stripe como meio de pagamento |
| ClickSign | `CLICKSIGN_API_KEY` + `CLICKSIGN_WEBHOOK_SECRET` | Assinatura digital de contratos inativa |

> Os templates de email (`server/email/templates/`) são embarcados no deploy
> via `includeFiles` no `vercel.json`. Se mover o diretório, atualizar também
> `EMAIL_TEMPLATES_DIR` ou o glob do `vercel.json`.

## 3. Banco de dados (Bloqueante)

- [ ] Migrations aplicadas em prod (`npm run db:push` com backup antes —
      seção 4.2 do runbook).
- [ ] **Não rodar `npm run db:seed` em produção** (cria tenants demo
      `sol`/`nova-casa` com senha `password`).
- [ ] Catálogo de planos hidratado (`server/seed-plans.ts` via fluxo do
      runbook, seção 3.5) — `GET /api/plans` retorna os 5 planos.
- [ ] Backup automático Supabase habilitado + teste de restore documentado.

## 4. Validação técnica pré-deploy (Bloqueante)

Rodar na branch/commit exato que vai ao ar:

- [ ] `npm run check` — typecheck limpo.
- [ ] `npm test` — suíte Vitest completa verde (1291+ testes).
- [ ] `npm run build` — **zero warnings de `import.meta`**; avisos de chunk
      >500 kB só são aceitáveis para chunks lazy (charts/pdf).
- [ ] `npx playwright test tests/e2e/smoke.spec.ts --project=chromium` —
      8/8 (landing, site público `/e/sol`, login, reload, health, módulos).
- [ ] Lint verde (`npm run lint`).

## 5. Smoke pós-deploy (Bloqueante)

Imediatamente após o deploy de produção:

- [ ] `GET https://imobibase.com.br/api/health` → 200 com
      `database/redis/stripe: ok` (503 indica dependência fora).
- [ ] Landing `/` carrega sem erro de console e sem painel de debug
      (debug só aparece com `VITE_SHOW_ERROR_DEBUG=true`).
- [ ] Site público de um tenant real `/e/<slug>` renderiza imóveis.
- [ ] Login + reload do dashboard mantém sessão.
- [ ] Checkout Stripe em modo live com cartão de teste do radar desativado
      (ou transação real de R$1 estornada).
- [ ] Webhook Stripe entregue com 200 (dashboard Stripe → webhook attempts).
- [ ] Evento de teste chega no Sentry (se ativado).
- [ ] Disparar um `/api/cron/*` manualmente com `CRON_SECRET` → 200; sem o
      header → 401.

## 6. Riscos conhecidos aceitos (não-bloqueantes)

Registrados para a primeira sprint pós-launch (ver memória/backlog):

- ✅ **Migrations `20260610_000/001/002` APLICADAS no Supabase em 2026-06-10**
  (47 → 70 tabelas; `users` 9 → 23 colunas; dados pré-existentes intactos;
  health pós-aplicação ok). Backup lógico pré-migration em
  `~/backups/imobibase-prod-20260610-pre-migration.json`. Atenção: NÃO usar
  `npm run db:migrate` cego — ele roda TODAS as `migrations/*.sql` incluindo
  `RLS_enable.sql` (RLS ainda não deve ser ativada) e pares duplicados
  001/20241225_001; aplicar migrations novas individualmente.

- Bundle: chunk principal ~110 kB gz (inclui posthog); charts (134 kB gz) e
  maps (45 kB gz) já são lazy por rota.
- `npm audit` com vulnerabilidades em dev-deps (sem caminho de exploração em
  runtime de produção).
- 2FA, handlers de refund e dashboard MRR ficam para pós-launch.
- Sem cron de `database-backup` na Vercel (o runtime não tem `pg_dump` — o
  cron falharia diariamente); o DR real do banco é o backup/PITR gerenciado do
  Supabase.
- Flake raro de timeout no Vitest sob paralelismo alto — mitigado com
  `testTimeout: 20000`; se reaparecer, rodar o arquivo isolado para confirmar.

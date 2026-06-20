# Go-Live Checklist — ImobiBase

Última atualização: 2026-06-17 (pós-hardening P0/P1/P2 e revisão Go Live)

Checklist executável antes de apontar tráfego real para `imobibase.com.br`.
Detalhes operacionais (comandos, IDs, rotação) estão no
[DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) — este documento é o gate de
decisão: **todos os itens "Bloqueante" precisam estar marcados**.

Gate automatizado principal:

```bash
npm run ops:go-live:verify:static
npm run ops:go-live:verify
npm run ops:go-live:verify:strict
```

O modo `static` valida wiring do repositório/CI sem secrets. O modo padrão
`deploy` valida ambiente após `vercel pull`. O modo `strict` exige evidência ou
execução real de Redis, banco, RLS, backup, restore drill e pentest.

> Status em 17/06/2026: **não liberar como enterprise Go Live ainda**. A base
> local melhorou, mas os gates abaixo precisam ser executados contra
> staging/producao real e as pendencias P0 de seguranca em
> `docs/KNOWN_ISSUES.md` precisam ter aceite formal ou correcao.

---

## 1. Ambiente e secrets (Bloqueante)

O `secret-manager` falha o boot em produção (`NODE_ENV=production` sem
`VERCEL`) e loga erro em serverless se algo abaixo faltar ou for fraco.
Em dev/test os mesmos problemas viram apenas warning.

- [ ] `DATABASE_URL` configurada (Supabase pooler, porta 6543). **Não existe
      fallback para SQLite em produção** — boot lança erro se ausente.
- [ ] `SESSION_SECRET` com 32+ caracteres aleatórios (não usar o default de dev).
- [ ] `REDIS_URL` configurada (rate limit, cache, locks de cron e 2FA).
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `VITE_STRIPE_PUBLISHABLE_KEY`
      + `STRIPE_WEBHOOK_SECRET` em modo **live** (sk_live_/pk_live_/whsec_).
- [ ] `APP_URL` / `VITE_APP_URL` / `SITE_URL` = `https://imobibase.com.br`.
- [ ] `CRON_SECRET` definido (os `/api/cron/*` exigem `Authorization: Bearer`).
- [ ] `REDIS_URL` definido em producao; os `/api/cron/*` e o 2FA usam estado
      distribuido para evitar execucao/tentativas duplicadas entre instancias.
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
| WhatsApp | `WHATSAPP_API_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Envio, webhook oficial Meta e ledger de mensagens WhatsApp inativos |
| MercadoPago | `MERCADOPAGO_ACCESS_TOKEN` | Apenas Stripe como meio de pagamento |
| ClickSign | `CLICKSIGN_API_KEY` + `CLICKSIGN_WEBHOOK_SECRET` | Assinatura digital de contratos inativa |

> Os templates de email (`server/email/templates/`) são embarcados no deploy
> via `includeFiles` no `vercel.json`. Se mover o diretório, atualizar também
> `EMAIL_TEMPLATES_DIR` ou o glob do `vercel.json`.

## 3. Banco de dados (Bloqueante)

- [x] Migrations aplicadas em prod — ✅ 2026-06-10, `20260610_000/001/002`
      individualmente em transação (47→70 tabelas, zero downtime; ver alerta
      na seção 4.2 do runbook sobre NÃO usar `db:migrate` cego).
- [ ] **Não rodar `npm run db:seed` em produção** (cria tenants demo
      `sol`/`nova-casa` com senha `password`).
- [ ] Catálogo de planos hidratado (`server/seed-plans.ts` via fluxo do
      runbook, seção 3.5) — `GET /api/plans` retorna os 5 planos.
- [ ] Backup automático Supabase habilitado + teste de restore documentado.
- [ ] RLS aplicado e validado com `npm run db:rls:verify` usando role runtime
      nao-owner e sem `BYPASSRLS`.
- [ ] Migration `20260617_001_webhook_events.sql` aplicada em staging/producao.
- [ ] Migration `20260617_002_newsletter_opt_out.sql` aplicada em staging/producao.
- [ ] `npm run ops:go-live:verify:strict` aprovado com
      `GO_LIVE_RESTORE_DRILL_VERIFIED=true` e `GO_LIVE_PENTEST_VERIFIED=true`
      ou executando os dois gates via `GO_LIVE_RUN_RESTORE_DRILL=true` e
      `GO_LIVE_RUN_PENTEST=true`.

## 4. Validação técnica pré-deploy (Bloqueante)

Rodar na branch/commit exato que vai ao ar:

- [x] `npm run check` — typecheck limpo. ✅ 2026-06-10
- [x] `npm test` — suíte Vitest completa verde (1290+ testes; flakes de contenção documentados). ✅ 2026-06-10
- [x] `npm run build` — **zero warnings**. ✅ 2026-06-10
- [x] `npx playwright test tests/e2e/smoke.spec.ts --project=chromium` —
      8/8 ✅ 2026-06-10 (local e no CI do GitHub).
- [x] Lint verde (`npm run lint`). ✅ 2026-06-10
- [x] `npm run ops:go-live:verify:static` — valida wiring de scripts,
      workflow, migration `webhook_events`, RLS e cron manifest sem secrets.
- [ ] Baseline 17/06/2026: cobertura ainda em ~11% e lint ainda tem 5166
      warnings. Para Go Live enterprise, elevar cobertura/gates ou registrar
      aceite formal de risco para MVP controlado.

## 5. Smoke pós-deploy (Bloqueante)

Imediatamente após o deploy de produção:

- [x] `GET https://imobibase.com.br/api/health` → 200 com
      `database/redis/stripe: ok`. ✅ 2026-06-10 pós-deploy `d136db5`
- [x] Landing `/` carrega sem erro de console. ✅ 2026-06-10 (zero pageerrors)
- [x] Site público `/e/imobibase` renderiza (0 imóveis = tenant prod sem
      cadastro ainda). ✅ 2026-06-10
- [ ] Login + reload do dashboard mantém sessão.
- [ ] Checkout Stripe em modo live com cartão de teste do radar desativado
      (ou transação real de R$1 estornada).
- [ ] Webhook Stripe entregue com 200 (dashboard Stripe → webhook attempts).
- [ ] Webhooks Stripe/MercadoPago/ClickSign usando ledger persistente no banco
      real (`webhook_events`) e sem erro de migration.
- [ ] Webhook oficial do WhatsApp usando ledger persistente no banco real
      (`provider='whatsapp'`) com duplicata ignorada.
- [ ] 2FA em produção bloqueia a 6ª tentativa inválida mesmo entre duas
      instâncias/serverless invocations com `REDIS_URL` ativo.
- [ ] Evento de teste chega no Sentry (se ativado).
- [ ] Disparar um `/api/cron/*` manualmente com `CRON_SECRET` → 200; sem o
      header → 401.
- [ ] `GET /api/cron/status` retorna `lockMode=redis` e `lastRun` depois de
      trigger manual em producao.
- [ ] Login, mutacao com CSRF e portal por cookie funcionam no handler Vercel
      serverless.

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
- Handlers de refund e dashboard MRR ficam para pós-launch. 2FA ja nao usa QR
  externo e o rate limit/lockout distribuido foi implementado com Redis; falta
  apenas prova no deploy real.
- Cron de `database-backup` pode rodar na Vercel somente com uma estrategia
  explicita: upload duravel de `pg_dump` via `BACKUP_UPLOAD_URL_TEMPLATE` ou
  Supabase PITR como DR oficial (`BACKUP_OPTIONAL=true` e
  `SUPABASE_PITR_ENABLED=true`). Sem isso, o gate `ops:backup:verify` falha.
- Vistorias e fluxos centrais com FKs sensiveis tiveram ownership por tenant
  reforcado localmente; ainda falta prova dinamica multi-tenant em staging.
- Flake raro de timeout no Vitest sob paralelismo alto — mitigado com
  `testTimeout: 20000`; se reaparecer, rodar o arquivo isolado para confirmar.

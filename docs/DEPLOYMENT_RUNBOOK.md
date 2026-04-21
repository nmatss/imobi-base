# Deployment Runbook — ImobiBase

Última atualização: 2026-04-21 (pós-sessão de hardening + Stripe checkout)

Este documento é o guia operacional para operar ImobiBase em produção. Leitura obrigatória antes de qualquer mudança em `imobibase.com.br`.

---

## 1. Stack e topologia

```
Cliente (browser)
   │
   ▼
imobibase.com.br  (Vercel Edge Network)
   │
   ├── Rotas /api/*  → Vercel Serverless Function (api/index.mjs)
   │                   │
   │                   ├── Drizzle ORM → Supabase Postgres (pooler us-east-1)
   │                   ├── Redis (cache, rate limit, idempotency)
   │                   ├── Stripe API
   │                   └── Sentry (errors)
   │
   └── Rotas não-/api/ → dist/public/ (static) → React SPA
```

**Providers**:
- **Hosting**: Vercel (projeto `prj_DlvX6dcjTqP9SNTs6Zqr3yhh3leo`, team `team_j9C39dseS1UA3fLy7fixCkwi`)
- **Postgres**: Supabase (projeto `gpwgbkoliyunaivwylqp`, região us-east-1, pooler transaction mode)
- **Redis**: configurado via `REDIS_URL` env
- **Billing**: Stripe (test mode para staging — `acct_1TOjdV4JCD3gv4bh`)
- **Errors**: Sentry

---

## 2. Variáveis de ambiente (Vercel Production)

### Obrigatórias

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Supabase pooler connection string |
| `REDIS_URL` | Redis connection string (cache + rate limit + idempotency) |
| `SESSION_SECRET` | Assinatura de sessão (rotacionar em incidentes) |
| `STRIPE_SECRET_KEY` | sk_test_ em staging, sk_live_ em produção real |
| `STRIPE_PUBLISHABLE_KEY` | pk_test_/pk_live_ |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Mesmo valor — bundled no client no build |
| `STRIPE_WEBHOOK_SECRET` | whsec_ do webhook endpoint |
| `APP_URL` / `VITE_APP_URL` / `SITE_URL` | `https://imobibase.com.br` |

### Admin bootstrap (one-shot)

| Variável | Uso |
| --- | --- |
| `ADMIN_BOOTSTRAP_SECRET` | Header `x-bootstrap-secret` em `POST /api/admin/bootstrap` |
| `ADMIN_EMAIL` | Default do bootstrap endpoint (body override possível) |
| `ADMIN_PASSWORD` | Default do bootstrap endpoint |
| `ADMIN_NAME` | Default do bootstrap endpoint |

Após criar o primeiro super_admin, **remover** `ADMIN_BOOTSTRAP_SECRET`, `ADMIN_PASSWORD` do Vercel (endpoint responde 503 se secret ausente).

### Opcionais

| Variável | Uso |
| --- | --- |
| `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Error tracking + source maps |
| `CRON_SECRET` | Header `Authorization: Bearer` nos `/api/cron/*` |
| `PG_POOL_MAX`, `PG_POOL_MIN`, `PG_POOL_IDLE_TIMEOUT_MS`, `PG_POOL_CONN_TIMEOUT_MS` | Override do pool Postgres |
| `HEALTH_DEBUG_TOKEN` | `?debug=TOKEN` em `/api/health` expõe erro de DB completo |
| `ADMIN_TENANT_SLUG` | Slug do tenant de operação (default `imobibase-ops`) |

---

## 3. Primeiro setup (do zero)

### 3.1 Provisionar infra

1. **Supabase**: criar projeto, copiar `DATABASE_URL` (pooler, transaction mode, porta 6543)
2. **Redis**: Upstash/Redis Cloud — provisão free tier
3. **Stripe**: conta + `sk_test_`, `pk_test_` da API keys tab
4. **Vercel**: criar projeto apontando para repo, adicionar domínio

### 3.2 Configurar env vars (Vercel)

Via dashboard OU via CLI (`vercel env add NOME production`).

### 3.3 Criar catálogo Stripe

Via script na API Stripe (exemplo em `script/stripe-catalog.json`):
- 4 produtos: starter, pro, business, enterprise
- 8 preços (mensal + anual, BRL)
- 1 webhook endpoint com 10 eventos (ver §5)
- 1 Customer Portal configuration com upgrade/downgrade/cancel habilitados

### 3.4 Deploy inicial

```bash
vercel --prod --token=$VERCEL_TOKEN --yes
```

### 3.5 Hidratar banco

```bash
DATABASE_URL='...' \
ADMIN_EMAIL='admin@imobibase.com.br' \
ADMIN_PASSWORD='senha-forte-min-12' \
ADMIN_NAME='Admin' \
npm run setup:first-run
```

Isso roda em sequência:
1. `drizzle-kit push` → cria 47 tabelas
2. `server/seed-plans.ts` → 5 planos (free/starter/pro/business/enterprise)
3. `script/seed-stripe-prices.ts` → liga os `stripe_price_id`
4. `script/seed-super-admin.ts` → cria tenant `imobibase-ops` + user `role=super_admin`

### 3.6 Validação

```bash
curl https://imobibase.com.br/api/health
# Esperado: status:ok com database/redis/stripe: ok

curl https://imobibase.com.br/api/plans | jq 'length'
# Esperado: 5
```

---

## 4. Operações frequentes

### 4.1 Deploy novo código

```bash
git push origin main          # CI/CD (se conectado)
# OU
npx vercel --prod --token=$VERCEL_TOKEN --yes  # manual
```

Build pipeline:
1. `tsx script/generate-sitemap.ts` — gera `client/public/sitemap.xml`
2. `tsx script/build.ts` — executa `vite build` + `esbuild` do serverless

### 4.2 Aplicar schema changes

Sempre em dev primeiro, nunca direto em produção:

```bash
# Dev local
DATABASE_URL='postgres://dev...' npx drizzle-kit push

# Review diff em staging
DATABASE_URL='postgres://staging...' npx drizzle-kit push

# Apply em prod (com backup antes!)
DATABASE_URL='postgres://prod...' npx drizzle-kit push
```

Supabase faz backup automático diário no free tier (7 dias retention).

### 4.3 Criar super_admin adicional

Via API com super_admin existente logado, OU:

```bash
# Localmente
DATABASE_URL='...' \
ADMIN_EMAIL='outro@imobibase.com.br' \
ADMIN_PASSWORD='...' \
ADMIN_NAME='Nome' \
npm run admin:seed
```

### 4.4 Rotação de credenciais (mensal + em incidentes)

- **SESSION_SECRET**: regenera e atualiza na Vercel → todas sessões invalidadas
- **DATABASE_URL password**: Supabase dashboard → Settings → Database → Reset → atualizar env + redeploy
- **STRIPE_WEBHOOK_SECRET**: criar novo webhook endpoint → testar → trocar env → deletar antigo
- **STRIPE_SECRET_KEY**: roll na Stripe dashboard → atualizar env → redeploy
- **VERCEL_TOKEN**: delete + recreate em vercel.com/account/tokens

### 4.5 Migração test mode → live mode Stripe

1. Criar produtos e preços em live mode (manualmente ou script)
2. Atualizar `script/stripe-catalog.json` com novos IDs live
3. Criar webhook endpoint live com mesmos 10 eventos → copiar whsec_
4. Criar Customer Portal config em live mode
5. Atualizar env Vercel: `STRIPE_SECRET_KEY=sk_live_...`, `STRIPE_PUBLISHABLE_KEY=pk_live_...`, `STRIPE_WEBHOOK_SECRET=whsec_live_...`
6. Rodar `DATABASE_URL='...' npm run stripe:seed` para atualizar price IDs em DB
7. Redeploy
8. Testar checkout real com cartão pessoal (valor mínimo)
9. Monitorar Sentry + Stripe dashboard por 24h

---

## 5. Webhook Stripe — eventos tratados

`POST /api/webhooks/stripe` (CSRF-bypass, assinatura obrigatória, idempotente via Redis SETNX 24h)

| Evento | Handler | O que faz |
| --- | --- | --- |
| `checkout.session.completed` | `handleCheckoutSessionCompleted` | Persiste `stripeCustomerId` em metadata (antes do subscription.created chegar) |
| `customer.subscription.created` | `handleSubscriptionCreated` | Ativa subscription, mapeia priceId→planId, preserva metadata |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Atualiza status (active/trial/cancelled/suspended), dispara `enforceAllPlanLimits` |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Marca status=cancelled, cancelledAt=now |
| `customer.subscription.trial_will_end` | `handleTrialWillEnd` | Envia email com dias restantes + link de billing |
| `invoice.payment_succeeded` | `handleInvoicePaymentSucceeded` | Loga + envia email de confirmação |
| `invoice.payment_failed` | `handleInvoicePaymentFailed` | status=suspended + email de falha |
| Outros (`customer.created`, `payment_method.attached`, `invoice.upcoming`) | Logged apenas | — |

**Retry behavior**: em falha, limpa chave Redis de idempotência e responde 500. Stripe retenta com backoff exponencial até 72h.

### Eventos ainda não tratados (backlog)

- `checkout.session.expired` — notificar usuário
- `charge.refunded` — ajustar plano
- `charge.dispute.created` — alertar admin
- `invoice.upcoming` — notificação 7d pré-cobrança

---

## 6. Cron jobs (Vercel)

Todos exigem header `Authorization: Bearer $CRON_SECRET`. Configurados em `vercel.json`:

| Path | Cron | Função |
| --- | --- | --- |
| `/api/cron/payment-reminders` | `0 12 * * *` | Lembretes de pagamento pendente |
| `/api/cron/daily-reports` | `0 3 * * *` | Relatórios diários |
| `/api/cron/weekly-reports` | `0 11 * * 1` | Relatórios semanais |
| `/api/cron/monthly-reports` | `0 11 1 * *` | Relatórios mensais |
| `/api/cron/cleanup-sessions` | `0 2 * * *` | Limpa sessões expiradas |
| `/api/cron/cleanup-logs` | `0 4 * * *` | Purge de logs |
| `/api/cron/cleanup-soft-deletes` | `0 3 * * *` | Purge de registros deletedAt > 90d |
| `/api/cron/integration-sync` | `0 6 * * *` | Sincronização com APIs externas |
| `/api/cron/database-backup` | `0 5 * * *` | Snapshot manual (Supabase também faz automático) |
| `/api/cron/cleanup-temp-files` | `0 6 * * 0` | Domingos — limpa uploads órfãos |
| `/api/cron/enforce-plan-limits` | `30 6 * * *` | Desconecta integrações excedentes (safety net) |

---

## 7. Observabilidade

### Health check

`GET /api/health` retorna:
```json
{
  "status": "ok" | "degraded" | "error",
  "checks": {
    "database": { "status": "ok|fail", "latencyMs": N, "error"?: "kind" },
    "redis": { "status": "ok|fail|skipped", "latencyMs": N },
    "stripe": { "status": "ok|fail|skipped", "latencyMs": N }
  },
  "version": "sha-curto",
  "uptime": N,
  "responseTimeMs": N
}
```

Use `?debug=$HEALTH_DEBUG_TOKEN` para surface completo do erro de DB.

### Sentry

Erros de webhook recebem tags `webhook: 'stripe', event: '<type>'`. Erros de middleware recebem tags por componente. Configurar alert rule para `level: error` + webhook tag = ping via email/Slack.

### Logs

Console logs do serverless ficam no Vercel Logs (dashboard → Deployment → Runtime logs). Retenção conforme plano.

---

## 8. Incident response

### DB indisponível

1. `curl https://imobibase.com.br/api/health` → confirma fail
2. Supabase dashboard → ver status do projeto
3. Se projeto `PAUSED`: `curl -X POST https://api.supabase.com/v1/projects/$REF/restore -H "Authorization: Bearer $TOKEN"`
4. Aguardar `ACTIVE_HEALTHY` (1-5 min), validar health

### Webhook Stripe falhando

1. Dashboard Stripe → Webhooks → clicar no endpoint → ver "Recent events"
2. Retry manual em eventos com 500
3. Verificar logs Vercel em `/api/webhooks/stripe`
4. Se signature falhar: `STRIPE_WEBHOOK_SECRET` desatualizado → rotacionar

### Vazamento de credencial

1. Revogar imediatamente no provider
2. Gerar nova, atualizar env Vercel
3. Redeploy (automático se git push; manual via `vercel --prod`)
4. Revisar logs/audit para uso indevido
5. Se sessão comprometida: rotacionar `SESSION_SECRET` (desloga todos)

---

## 9. Rollback

Vercel mantém histórico de deployments. No dashboard:
1. Deployments → selecionar deploy anterior saudável
2. "..." → "Promote to Production"
3. Rollback imediato (sem rebuild)

Para rollback de schema DB (mais complexo):
- Supabase → Database → Backups → Point-in-time restore (pago) OU
- Snapshot manual antes de migrations arriscadas

---

## 10. Contatos

- **DPO / Privacidade**: `dpo@imobibase.com.br`, `privacidade@imobibase.com.br`
- **Incidents / Security**: `incident@imobibase.com.br`
- **Suporte**: `suporte@imobibase.com.br`
- **Comercial**: `contato@imobibase.com.br`

# Planos e Subscription Enforcement

Sistema de planos multi-tenant com enforcement de limites, feature flags e integracao com Stripe.

## Arquitetura

```
plans (DB)                    → Definicoes canonicas dos 5 planos
tenant_subscriptions (DB)     → Vinculo tenant ↔ plano (1:1)
seed-plans.ts                 → Upsert automatico no startup
plan-limits.ts (middleware)   → Enforcement de limites e features
subscription-guard.ts         → Bloqueia tenants suspensos/cancelados
routes.ts                     → GET /api/plans, GET /api/subscription/usage
stripe-webhooks.ts            → Atualiza planId em upgrade/downgrade
plans-config.ts (client)      → Dados de exibicao (landing/pricing)
PlansTab.tsx (client)         → Dashboard de uso do tenant
```

## Planos

| Plano        | Slug         | Mensal | Anual  | Users | Imoveis | Leads/mes | Integ. | Trial   |
| ------------ | ------------ | ------ | ------ | ----- | ------- | --------- | ------ | ------- |
| Gratuito     | `free`       | R$ 0   | R$ 0   | 1     | 15      | 30        | 0      | 0 dias  |
| Starter      | `starter`    | R$ 89  | R$ 69  | 3     | 100     | -1        | 2      | 14 dias |
| Profissional | `pro`        | R$ 199 | R$ 159 | 10    | 500     | -1        | 5      | 14 dias |
| Business     | `business`   | R$ 399 | R$ 319 | -1    | -1      | -1        | -1     | 14 dias |
| Enterprise   | `enterprise` | R$ 799 | R$ 639 | -1    | -1      | -1        | -1     | 0 dias  |

> `-1` = ilimitado

## Feature Flags

Features sao cumulativas — cada tier inclui todos os anteriores.

| Feature Flag            | Free | Starter | Pro | Business | Enterprise |
| ----------------------- | ---- | ------- | --- | -------- | ---------- |
| `basic_site`            | x    | x       | x   | x        | x          |
| `basic_crm`             | x    | x       | x   | x        | x          |
| `pro_site`              |      | x       | x   | x        | x          |
| `whatsapp`              |      | x       | x   | x        | x          |
| `basic_reports`         |      | x       | x   | x        | x          |
| `ai_marketing`          |      |         | x   | x        | x          |
| `ai_avm`                |      |         | x   | x        | x          |
| `ai_isa`                |      |         | x   | x        | x          |
| `client_portal`         |      |         | x   | x        | x          |
| `digital_contracts`     |      |         | x   | x        | x          |
| `advanced_reports`      |      |         | x   | x        | x          |
| `multi_branch`          |      |         |     | x        | x          |
| `api_access`            |      |         |     | x        | x          |
| `webhooks`              |      |         |     | x        | x          |
| `digital_inspections`   |      |         |     | x        | x          |
| `commission_management` |      |         |     | x        | x          |
| `custom_reports`        |      |         |     | x        | x          |
| `whatsapp_support`      |      |         |     | x        | x          |
| `sla_guarantee`         |      |         |     |          | x          |
| `dedicated_manager`     |      |         |     |          | x          |
| `custom_integrations`   |      |         |     |          | x          |
| `team_training`         |      |         |     |          | x          |
| `priority_support`      |      |         |     |          | x          |

## Middleware de Enforcement

### Limites de Recursos

Middleware aplicado nas rotas de criacao:

| Middleware              | Recurso     | Onde aplicado             |
| ----------------------- | ----------- | ------------------------- |
| `checkUserLimit`        | Usuarios    | POST /api/users, convites |
| `checkPropertyLimit`    | Imoveis     | POST /api/properties      |
| `checkLeadLimit`        | Leads/mes   | POST /api/leads           |
| `checkIntegrationLimit` | Integracoes | POST /api/integrations    |

Todos tratam `-1` como ilimitado (skip check).

### Feature Flags nas Rotas

| Feature                 | Arquivo de rotas         | Middleware                                                                         |
| ----------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `whatsapp`              | routes-whatsapp.ts       | `app.use("/api/whatsapp", checkFeatureAccess('whatsapp'))`                         |
| `ai_marketing`          | routes-auto-marketing.ts | `app.use('/api/auto-marketing', requireAuth, checkFeatureAccess('ai_marketing'))`  |
| `ai_avm`                | routes-avm.ts            | `app.use("/api/avm", requireAuth, checkFeatureAccess('ai_avm'))`                   |
| `ai_isa`                | routes-isa.ts            | Individual em cada rota                                                            |
| `digital_contracts`     | routes-esignature.ts     | `app.use('/api/esignature', requireAuth, checkFeatureAccess('digital_contracts'))` |
| `commission_management` | routes.ts                | Individual em 5 rotas de comissoes                                                 |
| `advanced_reports`      | routes-extensions.ts     | Individual em 5 rotas de relatorios                                                |

### Subscription Guard

`server/middleware/subscription-guard.ts` — middleware global que:

- Bloqueia tenants com status `suspended` ou `cancelled` (retorna 403)
- Permite 7 dias de grace period para `past_due`
- Bypassa rotas de billing, payments, webhooks e auth

## API Endpoints

### GET /api/plans (publico)

Retorna os planos ativos do banco de dados:

```json
[
  {
    "id": "free",
    "name": "Gratuito",
    "price": 0,
    "monthlyPrice": 0,
    "yearlyPrice": 0,
    "maxUsers": 1,
    "maxProperties": 15,
    "maxLeads": 30,
    "maxIntegrations": 0,
    "features": ["basic_site", "basic_crm"],
    "stripePriceId": null,
    "trialDays": 0
  }
]
```

### GET /api/subscription/usage (autenticado)

Retorna uso real do tenant:

```json
{
  "plan": { "name": "Starter", "slug": "starter" },
  "status": "active",
  "users": { "current": 2, "max": 3 },
  "properties": { "current": 47, "max": 100 },
  "leads": { "current": 12, "max": -1 },
  "integrations": { "current": 1, "max": 2 },
  "features": [
    "basic_site",
    "pro_site",
    "whatsapp",
    "basic_reports",
    "basic_crm"
  ]
}
```

## Stripe Integration

### Configuracao

1. Criar produtos e precos no Stripe Dashboard (mensal + anual para cada plano)
2. No admin do ImobiBase, editar cada plano e preencher `stripePriceId` e `stripeYearlyPriceId`
3. Configurar webhook no Stripe: `https://imobibase.com.br/api/webhooks/stripe`
4. Eventos necessarios: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

### Upgrade/Downgrade

Quando o Stripe envia `customer.subscription.updated`:

1. Webhook extrai o `priceId` da subscription
2. Busca o plano correspondente por `stripePriceId` ou `stripeYearlyPriceId`
3. Atualiza `tenantSubscriptions.planId` automaticamente
4. Novos limites e features sao aplicados imediatamente

## Fluxo de Registro

1. Usuario se cadastra em `/signup`
2. Backend cria tenant + user admin
3. Busca plano free via `getPlanBySlug("free")`
4. Cria subscription com status `"active"` no plano gratuito
5. Tenant ja pode usar o sistema dentro dos limites do plano free

## Schema do Banco

### Tabela `plans`

| Coluna              | Tipo          | Default | Descricao                                      |
| ------------------- | ------------- | ------- | ---------------------------------------------- |
| id                  | UUID          | auto    | Primary key                                    |
| slug                | VARCHAR       | -       | Identificador unico (free, starter, pro, etc.) |
| name                | TEXT          | -       | Nome exibido                                   |
| price               | DECIMAL(10,2) | -       | Preco mensal                                   |
| yearlyPrice         | DECIMAL(10,2) | null    | Preco mensal no plano anual                    |
| maxUsers            | INTEGER       | 5       | Limite de usuarios (-1 = ilimitado)            |
| maxProperties       | INTEGER       | 100     | Limite de imoveis                              |
| maxLeads            | INTEGER       | -1      | Limite de leads/mes                            |
| maxIntegrations     | INTEGER       | 3       | Limite de integracoes                          |
| features            | JSON          | []      | Array de feature flags                         |
| stripePriceId       | VARCHAR       | null    | ID do preco mensal no Stripe                   |
| stripeYearlyPriceId | VARCHAR       | null    | ID do preco anual no Stripe                    |
| trialDays           | INTEGER       | 0       | Dias de trial                                  |
| isActive            | BOOLEAN       | true    | Visivel para clientes                          |

### Tabela `tenant_subscriptions`

| Coluna             | Tipo             | Descricao                           |
| ------------------ | ---------------- | ----------------------------------- |
| id                 | UUID             | Primary key                         |
| tenantId           | VARCHAR (unique) | FK para tenants                     |
| planId             | VARCHAR          | FK para plans                       |
| status             | TEXT             | trial, active, suspended, cancelled |
| trialEndsAt        | TIMESTAMP        | Fim do periodo de teste             |
| currentPeriodStart | TIMESTAMP        | Inicio do periodo atual             |
| currentPeriodEnd   | TIMESTAMP        | Fim do periodo atual                |
| cancelledAt        | TIMESTAMP        | Data de cancelamento                |
| metadata           | JSONB            | {stripeCustomerId, etc.}            |

## Arquivos Relevantes

| Arquivo                                       | Descricao                                              |
| --------------------------------------------- | ------------------------------------------------------ |
| `shared/schema.ts`                            | Definicao das tabelas plans e tenant_subscriptions     |
| `server/seed-plans.ts`                        | Seed dos 5 planos (upsert no startup)                  |
| `server/storage.ts`                           | getAllPlans, getPlanBySlug, getActivePlans, updatePlan |
| `server/middleware/plan-limits.ts`            | Middleware de enforcement (limites + features)         |
| `server/middleware/subscription-guard.ts`     | Guard de status da subscription                        |
| `server/routes.ts`                            | GET /api/plans, GET /api/subscription/usage            |
| `server/payments/stripe/stripe-webhooks.ts`   | Resolucao de planId via Stripe                         |
| `client/src/lib/plans-config.ts`              | Dados de exibicao (landing/pricing)                    |
| `client/src/pages/settings/tabs/PlansTab.tsx` | Dashboard de uso real                                  |
| `client/src/pages/public/pricing.tsx`         | Pagina de precos                                       |
| `client/src/pages/admin/plans.tsx`            | Admin de planos                                        |

# RLS Runbook — Isolamento multi-tenant por Row Level Security

> **Status:** artefato pronto para aplicar, **ainda NÃO aplicado**.
> Requer acesso ao Postgres de produção (Supabase). Siga a ordem abaixo —
> aplicar fora de ordem pode deixar a aplicação **sem dados** ou **sem
> isolamento**.

Arquivo de migração: [`migrations/RLS_enable.sql`](../migrations/RLS_enable.sql)

O runner padrão `npm run db:migrate` pula essa migration por segurança. Aplique
RLS somente pelo comando explícito:

```bash
npm run db:rls:apply
npm run db:rls:verify
```

---

## 1. O que isto resolve

Hoje o isolamento entre imobiliárias (tenants) depende 100% do código da
aplicação adicionar `WHERE tenant_id = ...` em toda query. Qualquer rota que
esqueça esse filtro vira um IDOR cross-tenant. O RLS move a garantia para o
banco: mesmo que o app esqueça o filtro, o Postgres só devolve linhas do tenant
corrente. É **defesa em profundidade**, não substituto do filtro no app.

## 2. Modelo de isolamento

- Cada request abre uma **transação** e seta uma GUC de sessão local:

  ```sql
  SET LOCAL app.tenant_id = '<id-do-tenant-autenticado>';
  ```

- As políticas filtram por:

  ```sql
  tenant_id = current_setting('app.tenant_id', true)
  ```

- `current_setting(name, true)` com o segundo argumento `true` retorna **NULL**
  (em vez de erro) quando a GUC não foi setada. Combinado com o `USING`, isso
  **falha fechado**: se o middleware esquecer de setar o tenant, a query retorna
  **0 linhas** em vez de vazar tudo.

### Por que comparação como texto e não `::uuid`

No schema (`shared/schema.ts`) `tenant_id` é `varchar`, não `uuid`. Por isso o
`RLS_enable.sql` compara como texto (`tenant_id = current_setting(...)`) em vez
de `current_setting(...)::uuid`. Se você migrar a coluna para `uuid` no futuro,
troque para `::uuid` para evitar comparação de texto e ganhar uso de índice.

### Tabelas com `tenant_id` anulável

Sete tabelas têm `tenant_id` opcional (`newsletter_subscriptions`,
`usage_logs`, `user_sessions`, `user_consents`, `compliance_audit_log`,
`cookie_preferences`, `webhook_events`). Para elas a política também permite
`tenant_id IS NULL` (linhas globais/sem tenant), evitando que registros
legítimos sumam. Reavalie caso a caso se isso é desejável — pode ser preferível
backfillar o `tenant_id` e remover o `IS NULL`.

## 3. Pré-requisito CRÍTICO: papel de conexão da aplicação

RLS é **ignorada** por:

- roles com atributo `BYPASSRLS`;
- o **owner** da tabela — a menos que se use `FORCE ROW LEVEL SECURITY`
  (o script já aplica `FORCE` em todas as tabelas).

Mesmo com `FORCE`, **não** rode a aplicação como `postgres`/superuser nem como
um role `BYPASSRLS`. Configuração recomendada:

- **Migrations / seed / bootstrap admin / job de troca de plano** → role
  privilegiado (ex.: `postgres`) que pode escrever cross-tenant.
- **Runtime da aplicação (pool em `server/db.ts`)** → role comum, **não-owner**,
  **sem BYPASSRLS**, com apenas `SELECT/INSERT/UPDATE/DELETE` nas tabelas.

> No Supabase, valide qual role a `DATABASE_URL` da aplicação usa. Se for um
> role com privilégio alto, crie um role dedicado de aplicação antes do rollout.

## 4. Onde setar `app.tenant_id` por request

O `SET LOCAL` só vale dentro de uma transação.

### Implementado no runtime

O runtime possui uma base de contexto RLS em:

- `server/db-rls.ts`: `AsyncLocalStorage` para carregar o tenant corrente e
  patch do `pg.Pool`;
- `server/db.ts`: instala o patch no pool Postgres;
- `server/middleware/auth.ts`: ativa o contexto em `requireAuth` comum;
- `server/routes.ts`: ativa o contexto no `requireAuth` local das rotas
  centrais.

O patch cobre:

- `Pool.query(...)`: abre transação curta, chama
  `select set_config(...)` para o contexto ativo, executa a query e faz
  `commit`/`rollback`;
- `Pool.connect()` + transação explícita: ao detectar `begin`, seta
  o contexto RLS dentro da mesma transação antes das queries de negócio.

Os valores de contexto são sempre passados como parâmetro (`$1`), não
interpolados.

### Contextos suportados

Além de `app.tenant_id`, o runtime suporta contextos públicos estreitos para
fluxos que legitimamente acontecem antes de existir uma sessão autenticada:

- `app.user_id`: deserialize de sessão;
- `app.auth_email`: login, registro e OAuth por email normalizado;
- `app.password_reset_token_hash`: reset de senha;
- `app.email_verification_token_hash`: verificação de email;
- `app.clicksign_document_key`: webhook ClickSign assinado;
- `app.digital_signature_token`: assinatura pública por token;
- `app.public_property_ids`: comparação pública de imóveis disponíveis;
- `app.property_comparison_id`: leitura pública de comparação salva.

Esses contextos têm policies específicas em `migrations/RLS_enable.sql` e são
cobertos por `tests/unit/db-rls-context.test.ts`,
`tests/unit/rls-migration-parity.test.ts` e
`tests/unit/auth-rls-context.test.ts`.

### Lacunas restantes

O runtime está pronto para validação de staging com RLS ativo, mas ainda **não**
deve ser promovido direto para produção sem:

- aplicar em staging com role de aplicação não-owner e sem `BYPASSRLS`;
- executar testes de isolamento multi-tenant contra Postgres real;
- definir a estratégia operacional de `super_admin`/cross-tenant. A policy atual
  não abre bypass genérico; isso preserva isolamento, mas limita rotas que
  precisem enxergar todos os tenants.

> Atenção ao pool serverless: em modo Vercel o pool é pequeno e efêmero (ver
> `server/db.ts`). `set_config(..., true)` dentro de transação é seguro nesse
> cenário porque o escopo morre com a transação. `SET` de sessão não deve ser
> usado em pool compartilhado.

## 5. Ordem segura de rollout

1. **Staging primeiro.** Nunca aplique direto em produção.
2. **Crie o role de aplicação** (não-owner, sem BYPASSRLS) e aponte a
   `DATABASE_URL` do app para ele. Garanta os GRANTs de DML nas tabelas.
3. **Valide cobertura do contexto RLS** para requests autenticadas, auth/OAuth,
   webhooks, rotas públicas e fluxos super_admin — **antes** de habilitar RLS em
   produção. Sem isso, ao habilitar RLS o app retorna 0 linhas (falha fechado).
4. **Smoke test em staging** com o contexto ativo, mas RLS ainda desligado:
   confirme que a GUC está sendo setada (logar `current_setting('app.tenant_id', true)`).
5. **Aplique `migrations/RLS_enable.sql` em staging** com
   `npm run db:rls:apply`. É idempotente (`DROP POLICY IF EXISTS`).
6. **Rode o verificador automatizado**:
   ```bash
   RLS_VERIFY_TENANT_ID=<tenant-id-de-staging> npm run db:rls:verify
   ```
   O comando falha se o role runtime for superuser, tiver `BYPASSRLS`, for owner
   das tabelas protegidas, se `ENABLE/FORCE ROW LEVEL SECURITY` estiver ausente
   ou se uma tabela da migration nao tiver policy.
7. **Teste de isolamento em staging:**
   - Autenticado como tenant A: só vê dados de A.
   - Forçar acesso a um id de B (IDOR): retorna 404/0 linhas.
   - Sem GUC setada (simular bug): retorna 0 linhas (não vaza).
   - Jobs/admin com role privilegiado: ainda enxergam cross-tenant.
8. **Janela de produção:** repita passos 2–3 (role + middleware) em produção,
   valide, e só então aplique o `RLS_enable.sql`.
9. **Monitore** taxa de respostas vazias/erros logo após aplicar; tenha o
   rollback pronto.

## 6. Rollback

RLS pode ser desligado sem perder dados:

```sql
-- Por tabela:
ALTER TABLE "<tabela>" DISABLE ROW LEVEL SECURITY;
-- (opcional) remover a política:
DROP POLICY IF EXISTS tenant_isolation ON "<tabela>";
```

Para reverter tudo, rode o `DISABLE`/`DROP POLICY` para cada tabela listada no
`RLS_enable.sql`. Como o app continua aplicando `WHERE tenant_id` no código, o
isolamento lógico permanece após o rollback do RLS.

## 7. Performance

A condição `tenant_id = current_setting('app.tenant_id', true)` é aplicada em
toda query. Garanta índice em `tenant_id` (ou índices compostos
`(tenant_id, ...)`) nas tabelas de alto volume (`leads`, `properties`,
`interactions`, `audit_logs`, `whatsapp_messages`, `finance_entries`). Sem
índice, RLS pode forçar seq scans.

## 8. Tabelas cobertas

56 tabelas com `tenant_id` recebem RLS (ver `migrations/RLS_enable.sql`).
Tabelas-filhas **sem** coluna `tenant_id` própria (ex.: `interactions`,
`lead_tag_links`, `user_permissions`, `property_coordinates`) herdam o
isolamento via FK para a tabela-pai já protegida; se quiser RLS direto nelas,
adicione políticas baseadas em subquery `EXISTS (... join no pai ...)`.

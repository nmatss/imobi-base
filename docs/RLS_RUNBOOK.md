# RLS Runbook — Isolamento multi-tenant por Row Level Security

> **Status:** artefato pronto para aplicar, **ainda NÃO aplicado**.
> Requer acesso ao Postgres de produção (Supabase). Siga a ordem abaixo —
> aplicar fora de ordem pode deixar a aplicação **sem dados** ou **sem
> isolamento**.

Arquivo de migração: [`migrations/RLS_enable.sql`](../migrations/RLS_enable.sql)

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

Cinco tabelas têm `tenant_id` opcional (`newsletter_subscriptions`,
`usage_logs`, `user_consents`, `compliance_audit_log`, `cookie_preferences`).
Para elas a política também permite `tenant_id IS NULL` (linhas globais/sem
tenant), evitando que registros legítimos sumam. Reavalie caso a caso se isso é
desejável — pode ser preferível backfillar o `tenant_id` e remover o
`IS NULL`.

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

O `SET LOCAL` só vale dentro de uma transação. Há duas opções:

### Opção A (recomendada) — transação por request com `SET LOCAL`

Envolver cada request autenticado numa transação e setar a GUC nela. Esboço de
helper a ser adicionado em `server/db.ts` (fora do escopo desta entrega — só
referência):

```ts
// Pseudocódigo — implementar no track de db/storage, não aplicar agora.
export async function withTenant<T>(tenantId: string, fn: (tx) => Promise<T>) {
  return db.transaction(async (tx) => {
    // set_config(name, value, is_local=true) === SET LOCAL
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
```

Use `set_config(..., true)` (parametrizável) em vez de interpolar `SET LOCAL`
com string, para evitar SQL injection no valor do tenant.

Um middleware Express extrai o `tenantId` da sessão autenticada e roda o handler
dentro de `withTenant`.

### Opção B — `SET` (sessão) com pool dedicado

Só viável se cada conexão atender um tenant por vez e for resetada antes de
voltar ao pool (`DISCARD ALL` / `RESET app.tenant_id`). Em pool compartilhado
serverless isso é frágil — **prefira a Opção A**.

> Atenção ao pool serverless: em modo Vercel o pool é pequeno e efêmero (ver
> `server/db.ts`). `SET LOCAL` dentro de transação é seguro nesse cenário
> porque o escopo morre com a transação. `SET` de sessão não é.

## 5. Ordem segura de rollout

1. **Staging primeiro.** Nunca aplique direto em produção.
2. **Crie o role de aplicação** (não-owner, sem BYPASSRLS) e aponte a
   `DATABASE_URL` do app para ele. Garanta os GRANTs de DML nas tabelas.
3. **Implemente e faça deploy do middleware `withTenant`** que seta
   `app.tenant_id` em toda request autenticada — **antes** de habilitar o RLS.
   Sem isso, ao habilitar o RLS o app retornará 0 linhas (falha fechado).
4. **Smoke test em staging** com o middleware ativo, mas RLS ainda desligado:
   confirme que a GUC está sendo setada (logar `current_setting('app.tenant_id', true)`).
5. **Aplique `migrations/RLS_enable.sql` em staging** (`psql -f` ou via tooling
   de migração). É idempotente (`DROP POLICY IF EXISTS`).
6. **Teste de isolamento em staging:**
   - Autenticado como tenant A: só vê dados de A.
   - Forçar acesso a um id de B (IDOR): retorna 404/0 linhas.
   - Sem GUC setada (simular bug): retorna 0 linhas (não vaza).
   - Jobs/admin com role privilegiado: ainda enxergam cross-tenant.
7. **Janela de produção:** repita passos 2–3 (role + middleware) em produção,
   valide, e só então aplique o `RLS_enable.sql`.
8. **Monitore** taxa de respostas vazias/erros logo após aplicar; tenha o
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

44 tabelas com `tenant_id` recebem RLS (ver `migrations/RLS_enable.sql`).
Tabelas-filhas **sem** coluna `tenant_id` própria (ex.: `interactions`,
`lead_tag_links`, `user_permissions`, `property_coordinates`) herdam o
isolamento via FK para a tabela-pai já protegida; se quiser RLS direto nelas,
adicione políticas baseadas em subquery `EXISTS (... join no pai ...)`.

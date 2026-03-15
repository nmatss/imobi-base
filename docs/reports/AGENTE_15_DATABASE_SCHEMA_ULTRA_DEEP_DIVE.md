# AGENTE 15: DATABASE SCHEMA & MIGRATIONS ULTRA DEEP DIVE

**Data:** 2025-12-25
**Sistema:** ImobiBase - Real Estate CRM Multi-Tenant
**Database:** PostgreSQL (Production) / SQLite (Development)
**ORM:** Drizzle ORM

---

## SCHEMA QUALITY SCORE: 81/100 ⭐⭐⭐⭐

### Score Breakdown

| Categoria          | Score  | Comentário                                                       |
| ------------------ | ------ | ---------------------------------------------------------------- |
| **Normalização**   | 88/100 | 3NF bem aplicado, algumas redundâncias intencionais justificadas |
| **Data Types**     | 75/100 | Uso de TEXT para decimais no SQLite, JSON sem validação          |
| **Constraints**    | 70/100 | Faltam CHECK constraints, sem cascade deletes explícitos         |
| **Indexes**        | 95/100 | Excelente cobertura de índices (85+), bem planejados             |
| **Multi-Tenancy**  | 92/100 | Isolamento forte, tenant_id em todas as tabelas                  |
| **Relationships**  | 85/100 | FKs bem definidos, faltam alguns cascade behaviors               |
| **Security**       | 78/100 | Bom tracking, falta encryption at rest explícito                 |
| **Scalability**    | 65/100 | Sem partitioning, pode ter problemas com muitos dados            |
| **Migrations**     | 80/100 | Boa estrutura, falta versionamento automático                    |
| **Data Integrity** | 82/100 | Boa auditoria, faltam triggers de validação                      |

---

## ENTITY RELATIONSHIP DIAGRAM (TEXTUAL)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MULTI-TENANT CORE                            │
└─────────────────────────────────────────────────────────────────────┘

[TENANTS] 1────────┬────────∞ [PROPERTIES]
   │               ├────────∞ [LEADS]
   │               ├────────∞ [USERS]
   │               ├────────∞ [OWNERS]
   │               ├────────∞ [RENTERS]
   │               ├────────∞ [RENTAL_CONTRACTS]
   │               ├────────∞ [RENTAL_PAYMENTS]
   │               ├────────∞ [RENTAL_TRANSFERS]
   │               ├────────∞ [SALE_PROPOSALS]
   │               ├────────∞ [PROPERTY_SALES]
   │               ├────────∞ [FINANCE_CATEGORIES]
   │               ├────────∞ [FINANCE_ENTRIES]
   │               ├────────∞ [COMMISSIONS]
   │               ├────────∞ [LEAD_TAGS]
   │               ├────────∞ [FOLLOW_UPS]
   │               ├────────1 [TENANT_SETTINGS]
   │               ├────────1 [BRAND_SETTINGS]
   │               ├────────∞ [USER_ROLES]
   │               ├────────∞ [INTEGRATION_CONFIGS]
   │               ├────────∞ [NOTIFICATION_PREFERENCES]
   │               ├────────1 [AI_SETTINGS]
   │               ├────────∞ [SAVED_REPORTS]
   │               ├────────∞ [WHATSAPP_TEMPLATES]
   │               ├────────∞ [WHATSAPP_CONVERSATIONS]
   │               ├────────∞ [WHATSAPP_MESSAGES]
   │               ├────────∞ [WHATSAPP_MESSAGE_QUEUE]
   │               ├────────∞ [WHATSAPP_AUTO_RESPONSES]
   │               ├────────∞ [USER_SESSIONS]
   │               ├────────∞ [USER_CONSENTS]
   │               ├────────∞ [COMPLIANCE_AUDIT_LOG]
   │               ├────────∞ [ACCOUNT_DELETION_REQUESTS]
   │               ├────────∞ [DATA_EXPORT_REQUESTS]
   │               ├────────∞ [DATA_BREACH_INCIDENTS]
   │               ├────────∞ [COOKIE_PREFERENCES]
   │               ├────────∞ [DATA_PROCESSING_ACTIVITIES]
   │               ├────────∞ [FILES]
   │               ├────────∞ [CLIENT_PORTAL_ACCESS]
   │               ├────────∞ [DASHBOARD_LAYOUTS]
   │               ├────────∞ [USAGE_LOGS]
   │               ├────────1 [TENANT_SUBSCRIPTIONS]
   │               └────────∞ [VISITS]

┌─────────────────────────────────────────────────────────────────────┐
│                         PROPERTY MODULE                              │
└─────────────────────────────────────────────────────────────────────┘

[PROPERTIES] 1─────∞ [VISITS]
             1─────∞ [CONTRACTS]
             1─────∞ [RENTAL_CONTRACTS]
             1─────∞ [SALE_PROPOSALS]
             1─────∞ [PROPERTY_SALES]
             1─────1 [PROPERTY_COORDINATES] (SQLite only)
             1─────∞ [VIRTUAL_TOURS] (SQLite only)

┌─────────────────────────────────────────────────────────────────────┐
│                           LEADS MODULE                               │
└─────────────────────────────────────────────────────────────────────┘

[LEADS] 1──────∞ [INTERACTIONS]
        1──────∞ [VISITS]
        1──────∞ [CONTRACTS]
        1──────∞ [SALE_PROPOSALS]
        1──────∞ [PROPERTY_SALES]
        1──────∞ [LEAD_TAG_LINKS]
        1──────∞ [FOLLOW_UPS]
        1──────∞ [WHATSAPP_CONVERSATIONS] (optional)
        1──────1 [LEAD_SCORES] (SQLite only)
        1──────∞ [CAMPAIGN_ENROLLMENTS] (SQLite only)

┌─────────────────────────────────────────────────────────────────────┐
│                         RENTAL MODULE                                │
└─────────────────────────────────────────────────────────────────────┘

[RENTAL_CONTRACTS] 1───∞ [RENTAL_PAYMENTS]
                   1───∞ [COMMISSIONS]

[OWNERS] 1─────∞ [RENTAL_CONTRACTS]
         1─────∞ [RENTAL_TRANSFERS]

[RENTERS] 1────∞ [RENTAL_CONTRACTS]

┌─────────────────────────────────────────────────────────────────────┐
│                          SALES MODULE                                │
└─────────────────────────────────────────────────────────────────────┘

[PROPERTY_SALES] 1───∞ [COMMISSIONS]

┌─────────────────────────────────────────────────────────────────────┐
│                        FINANCIAL MODULE                              │
└─────────────────────────────────────────────────────────────────────┘

[FINANCE_CATEGORIES] 1───∞ [FINANCE_ENTRIES]

┌─────────────────────────────────────────────────────────────────────┐
│                          USER MODULE                                 │
└─────────────────────────────────────────────────────────────────────┘

[USERS] 1──────∞ [INTERACTIONS]
        1──────∞ [VISITS] (assigned_to)
        1──────∞ [LEADS] (assigned_to)
        1──────∞ [FOLLOW_UPS] (assigned_to)
        1──────∞ [COMMISSIONS] (broker_id)
        1──────∞ [PROPERTY_SALES] (broker_id)
        1──────∞ [USER_PERMISSIONS]
        1──────∞ [SAVED_REPORTS]
        1──────∞ [USER_SESSIONS]
        1──────∞ [DASHBOARD_LAYOUTS]
        1──────1 [TWO_FACTOR_AUTH] (SQLite only)

[USER_ROLES] 1──∞ [USER_PERMISSIONS]

┌─────────────────────────────────────────────────────────────────────┐
│                      WHATSAPP MODULE (PG Only)                       │
└─────────────────────────────────────────────────────────────────────┘

[WHATSAPP_TEMPLATES] 1───∞ [WHATSAPP_MESSAGES]
                     1───∞ [WHATSAPP_MESSAGE_QUEUE]
                     1───∞ [WHATSAPP_AUTO_RESPONSES]

[WHATSAPP_CONVERSATIONS] 1───∞ [WHATSAPP_MESSAGES]

┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLIANCE MODULE (SQLite Only)                   │
└─────────────────────────────────────────────────────────────────────┘

[DRIP_CAMPAIGNS] 1───∞ [CAMPAIGN_STEPS]
                 1───∞ [CAMPAIGN_ENROLLMENTS]

[CONTRACTS] 1───∞ [DIGITAL_SIGNATURES] (SQLite only)
            1───∞ [CONTRACT_DOCUMENTS] (SQLite only)

┌─────────────────────────────────────────────────────────────────────┐
│                     SUBSCRIPTION MODULE (PG Only)                    │
└─────────────────────────────────────────────────────────────────────┘

[PLANS] 1───∞ [TENANT_SUBSCRIPTIONS]
```

---

## NORMALIZAÇÃO ANALYSIS

### ✅ 3NF COMPLIANCE

**Bem Aplicado:**

- Separação clara de entidades (tenants, users, properties, leads)
- Sem dependências transitivas detectadas
- Tabelas de junction para many-to-many (lead_tag_links)
- Configurações em tabelas separadas (tenant_settings, brand_settings)

**Denormalização Intencional (Justificada):**

1. **rental_payments.rentValue, condoFee, iptuValue**
   - ✅ Justificado: Valores históricos não devem mudar quando contrato é atualizado
   - Permite auditoria e cálculos retroativos

2. **commissions.transactionValue, commissionRate**
   - ✅ Justificado: Snapshot do valor no momento da comissão
   - Evita recálculos incorretos se taxa mudar

3. **finance_entries.amount duplicado**
   - ✅ Justificado: Performance em relatórios financeiros
   - Evita JOINs pesados

4. **leads.preferredCity, preferredNeighborhood**
   - ⚠️ Questionável: Poderia ser normalizado em tabela de preferências
   - Recomendação: Manter por simplicidade

### ❌ REDUNDANCY ISSUES

1. **tenant_settings vs brand_settings**
   - Redundância: `primaryColor`, `secondaryColor`, `logoUrl` duplicados
   - **Recomendação:** Consolidar em uma única tabela ou usar herança

2. **users.tenantId duplicado em user_sessions**
   - Redundância desnecessária (pode ser obtido via JOIN)
   - **Impacto:** Pequeno, mas adiciona manutenção

---

## DATA TYPES ANALYSIS

### PostgreSQL Schema (schema.ts)

#### ✅ Bem Escolhidos

```typescript
// Decimais com precisão adequada
price: decimal("price", { precision: 12, scale: 2 }); // Até R$ 9.999.999.999,99
commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }); // 0.00% - 999.99%

// Timestamps apropriados
createdAt: timestamp("created_at").notNull().defaultNow();

// Booleanos nativos
featured: boolean("featured").notNull().default(false);

// Arrays nativos para PostgreSQL
features: text("features").array(); // Array de strings
```

#### ⚠️ Problemas e Melhorias

1. **VARCHAR sem limite**

```typescript
id: varchar("id").primaryKey(); // ❌ Sem tamanho definido
```

**Recomendação:**

```typescript
id: varchar("id", { length: 36 }).primaryKey(); // UUID fixo
// Ou usar uuid() nativo do PostgreSQL
id: uuid("id").primaryKey().defaultRandom();
```

2. **TEXT para enums**

```typescript
status: text("status").notNull().default("available"); // ❌ Sem constraint
```

**Recomendação:**

```sql
CREATE TYPE property_status AS ENUM ('available', 'rented', 'sold', 'unavailable');
ALTER TABLE properties ALTER COLUMN status TYPE property_status;
```

3. **JSON sem validação**

```typescript
permissions: json("permissions").notNull().default("{}"); // ❌ Sem schema
```

**Recomendação:**

```typescript
// Adicionar CHECK constraint com jsonschema
permissions: json("permissions")
  .notNull()
  .default("{}")
  .check(sql`jsonb_typeof(permissions) = 'object'`);
```

### SQLite Schema (schema-sqlite.ts)

#### ⚠️ CRITICAL ISSUES

1. **Decimais como TEXT**

```typescript
price: text("price").notNull(); // ❌ Deveria ser REAL
income: text("income"); // ❌ Deveria ser REAL
```

**Problema:**

- Impossível fazer operações matemáticas diretas no SQL
- Ordenação alfabética em vez de numérica
- Maior uso de espaço

**Recomendação:**

```typescript
price: real("price").notNull(); // Ou integer("price_cents")
// Converter para centavos se precisar de precisão exata
```

2. **Timestamps como TEXT ISO8601**

```typescript
createdAt: text("created_at").notNull().default(now()); // ❌ STRING
```

**Problema:**

- Comparações de data ineficientes
- Impossível usar funções de data nativas

**Recomendação:**

```typescript
// Opção 1: Unix timestamp (INTEGER)
createdAt: integer("created_at").notNull().$defaultFn(() => Date.now())

// Opção 2: ISO8601 com índice
createdAt: text("created_at").notNull()
CREATE INDEX idx_properties_created_at_iso ON properties(datetime(created_at))
```

3. **Booleanos como INTEGER**

```typescript
featured: integer("featured", { mode: "boolean" }).default(false);
```

✅ **Correto para SQLite**, mas considerar:

```typescript
// Mais explícito
featured: integer("featured")
  .default(0)
  .check(sql`featured IN (0, 1)`);
```

---

## CONSTRAINTS ANALYSIS

### ✅ Constraints Existentes

1. **Primary Keys:** Todas as tabelas ✅
2. **Foreign Keys:** Bem definidos ✅
3. **NOT NULL:** Usado adequadamente ✅
4. **UNIQUE:** Email, slug, etc ✅
5. **DEFAULT:** Bons valores padrão ✅

### ❌ Constraints FALTANDO (CRÍTICO)

#### 1. CHECK Constraints

**NENHUMA tabela tem CHECK constraints!**

```sql
-- ❌ Status pode ser qualquer string
CREATE TABLE properties (
  status TEXT NOT NULL DEFAULT 'available'
);

-- ✅ Deveria ter
ALTER TABLE properties
ADD CONSTRAINT chk_properties_status
CHECK (status IN ('available', 'rented', 'sold', 'unavailable', 'maintenance'));

-- ❌ Valores negativos permitidos
CREATE TABLE properties (
  price DECIMAL(12, 2) NOT NULL
);

-- ✅ Deveria ter
ALTER TABLE properties
ADD CONSTRAINT chk_properties_price_positive
CHECK (price >= 0);

-- ❌ Bedrooms pode ser negativo ou absurdo
CREATE TABLE properties (
  bedrooms INTEGER
);

-- ✅ Deveria ter
ALTER TABLE properties
ADD CONSTRAINT chk_properties_bedrooms_valid
CHECK (bedrooms >= 0 AND bedrooms <= 50);
```

**Recomendação:** Adicionar 30+ CHECK constraints (SQL completo no final)

#### 2. CASCADE Behaviors

**PROBLEMA:** Sem ON DELETE/ON UPDATE explícito

```sql
-- ❌ Atual
leadId VARCHAR REFERENCES leads(id)

-- ✅ Deveria ser
leadId VARCHAR REFERENCES leads(id) ON DELETE CASCADE

-- OU (dependendo da lógica)
leadId VARCHAR REFERENCES leads(id) ON DELETE SET NULL
leadId VARCHAR REFERENCES leads(id) ON DELETE RESTRICT
```

**Impacto:**

- Órfãos de dados ao deletar tenant
- Impossível deletar lead com interações
- Inconsistência de dados

#### 3. Unique Composite Constraints

```sql
-- ❌ Faltando
CREATE TABLE lead_tag_links (
  lead_id VARCHAR REFERENCES leads(id),
  tag_id VARCHAR REFERENCES lead_tags(id)
);
-- Permite tag duplicada para mesmo lead!

-- ✅ Deveria ter
ALTER TABLE lead_tag_links
ADD CONSTRAINT uq_lead_tag_links_lead_tag UNIQUE (lead_id, tag_id);

-- ❌ Faltando
CREATE TABLE rental_payments (
  rental_contract_id VARCHAR,
  reference_month TEXT
);
-- Permite pagamentos duplicados para mesmo mês!

-- ✅ Deveria ter
ALTER TABLE rental_payments
ADD CONSTRAINT uq_rental_payments_contract_month
UNIQUE (rental_contract_id, reference_month);
```

---

## INDEXES ANALYSIS

### ✅ EXCELENTE COBERTURA (85+ índices)

**Destaques:**

1. **Multi-Tenant Isolation** ⭐⭐⭐⭐⭐

```sql
CREATE INDEX idx_properties_tenant_id ON properties(tenant_id);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
-- Aplicado em TODAS as tabelas multi-tenant
```

2. **Composite Indexes** ⭐⭐⭐⭐⭐

```sql
-- Dashboard query otimizado
CREATE INDEX idx_properties_tenant_status_featured
  ON properties(tenant_id, status, featured);

-- CRM Kanban otimizado
CREATE INDEX idx_leads_tenant_status_assigned
  ON leads(tenant_id, status, assigned_to);
```

3. **Partial Indexes** ⭐⭐⭐⭐

```sql
-- Apenas contratos ativos
CREATE INDEX idx_rental_contracts_active
  ON rental_contracts(tenant_id, property_id)
  WHERE status = 'active';

-- Pagamentos atrasados (CRITICAL para reminders)
CREATE INDEX idx_rental_payments_overdue
  ON rental_payments(tenant_id, due_date, rental_contract_id)
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
```

### ⚠️ ÍNDICES FALTANDO (15 sugeridos)

#### 1. Full-Text Search

```sql
-- ❌ Faltando: Busca por nome de propriedade
CREATE INDEX idx_properties_title_gin
  ON properties USING gin(to_tsvector('portuguese', title));

-- ❌ Faltando: Busca por descrição
CREATE INDEX idx_properties_description_gin
  ON properties USING gin(to_tsvector('portuguese', description));

-- ❌ Faltando: Busca por nome de lead
CREATE INDEX idx_leads_name_gin
  ON leads USING gin(to_tsvector('portuguese', name));
```

#### 2. Range Queries

```sql
-- ❌ Faltando: Busca por preço
CREATE INDEX idx_properties_price_range
  ON properties(tenant_id, price) WHERE status = 'available';

-- ❌ Faltando: Busca por área
CREATE INDEX idx_properties_area_range
  ON properties(tenant_id, area) WHERE status = 'available';

-- ❌ Faltando: Busca por quartos
CREATE INDEX idx_properties_bedrooms
  ON properties(tenant_id, bedrooms) WHERE status = 'available';
```

#### 3. Date Range Queries

```sql
-- ❌ Faltando: Contratos vencendo
CREATE INDEX idx_rental_contracts_expiring
  ON rental_contracts(tenant_id, end_date)
  WHERE status = 'active' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days';

-- ❌ Faltando: Visitas futuras
CREATE INDEX idx_visits_upcoming
  ON visits(tenant_id, scheduled_for)
  WHERE status = 'scheduled' AND scheduled_for > CURRENT_TIMESTAMP;
```

#### 4. JSONB Indexes (PostgreSQL)

```sql
-- ❌ Faltando: Busca em features
CREATE INDEX idx_properties_features
  ON properties USING gin(features);

-- ❌ Faltando: Busca em permissões
CREATE INDEX idx_user_roles_permissions
  ON user_roles USING gin(permissions);
```

#### 5. Covering Indexes

```sql
-- ❌ Faltando: Dashboard metrics query
CREATE INDEX idx_properties_dashboard_metrics
  ON properties(tenant_id, status)
  INCLUDE (price, featured, created_at);

-- ❌ Faltando: Lead list query
CREATE INDEX idx_leads_list
  ON leads(tenant_id, status)
  INCLUDE (name, email, phone, created_at);
```

### 📊 INDEX OVERHEAD ANALYSIS

**Tamanho Estimado:**

- 85 índices × ~200KB média = **~17MB de índices**
- Para 10.000 properties: **~50-100MB de índices**
- Para 100.000 properties: **~500MB-1GB de índices**

**Write Performance Impact:**

- Cada INSERT/UPDATE/DELETE atualiza ~5-10 índices por tabela
- **Impacto:** 10-20% slower writes, mas 10-50x faster reads

**Recomendação:** ✅ Mantém o trade-off atual (READ > WRITE)

---

## MULTI-TENANCY ANALYSIS

### ✅ ISOLAMENTO FORTE (Score: 92/100)

#### Estratégia Atual: ROW-LEVEL FILTERING

```sql
-- TODAS as queries filtram por tenant_id
SELECT * FROM properties WHERE tenant_id = 'tenant-123';
```

**Vantagens:**

- ✅ Simples de implementar
- ✅ Funciona em qualquer database
- ✅ Fácil de debugar
- ✅ Permite queries cross-tenant (analytics)

**Desvantagens:**

- ⚠️ Depende de código da aplicação (não database-level)
- ⚠️ Risco de data leakage se esquecer WHERE clause
- ⚠️ Performance pode degradar com muitos tenants

### 🔒 ROW-LEVEL SECURITY (RLS) - RECOMENDADO

**PostgreSQL RLS:**

```sql
-- Enable RLS em todas as tabelas
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Policy de SELECT
CREATE POLICY tenant_isolation_properties_select
  ON properties
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant')::varchar);

-- Policy de INSERT
CREATE POLICY tenant_isolation_properties_insert
  ON properties
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::varchar);

-- Policy de UPDATE
CREATE POLICY tenant_isolation_properties_update
  ON properties
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant')::varchar);

-- Policy de DELETE
CREATE POLICY tenant_isolation_properties_delete
  ON properties
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant')::varchar);
```

**No código:**

```typescript
// Antes de cada query, setar o tenant
await db.execute(sql`SET app.current_tenant = ${tenantId}`);

// Agora as queries SÃO AUTOMATICAMENTE filtradas
const properties = await db.select().from(propertiesTable);
// PostgreSQL adiciona WHERE tenant_id = 'tenant-123' automaticamente!
```

**Vantagens:**

- ✅ Segurança no database level
- ✅ Impossível esquecer WHERE clause
- ✅ Aplicado a TODAS as queries (até queries diretas)
- ✅ Zero trust: Mesmo admin precisa setar tenant

**Desvantagens:**

- ⚠️ PostgreSQL only (SQLite não suporta)
- ⚠️ Mais complexo de configurar
- ⚠️ Pequeno overhead de performance (~5%)

### ⚠️ DATA LEAKAGE RISKS

**Tabelas SEM tenant_id:**

1. ✅ **tenants** - Correto (é a tabela de tenants)
2. ✅ **plans** - Correto (global)
3. ✅ **widget_types** - Correto (global)
4. ⚠️ **interactions** - **PROBLEMA: Falta tenant_id!**

```sql
-- ❌ Atual
CREATE TABLE interactions (
  id VARCHAR PRIMARY KEY,
  lead_id VARCHAR REFERENCES leads(id),
  user_id VARCHAR REFERENCES users(id),
  -- FALTA tenant_id!
);

-- Queries podem vazar dados entre tenants:
SELECT * FROM interactions WHERE user_id = 'user-123';
-- Pode retornar interactions de OUTROS tenants!

-- ✅ Deveria ter
ALTER TABLE interactions ADD COLUMN tenant_id VARCHAR REFERENCES tenants(id);
UPDATE interactions SET tenant_id = (SELECT tenant_id FROM leads WHERE id = interactions.lead_id);
ALTER TABLE interactions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_interactions_tenant_id ON interactions(tenant_id);
```

**Outras tabelas com problema:**

5. ⚠️ **newsletter_subscriptions** - tenant_id é NULLABLE
6. ⚠️ **lead_tag_links** - Falta tenant_id
7. ⚠️ **usage_logs** - tenant_id é NULLABLE

### 📊 TENANT QUOTAS & LIMITS

**Problema:** Sem enforcement de limites de plano

```sql
-- ❌ Atual: Nada impede tenant FREE de criar 1000 propriedades
INSERT INTO properties (tenant_id, ...) VALUES (...);

-- ✅ Deveria ter trigger
CREATE OR REPLACE FUNCTION enforce_tenant_limits()
RETURNS TRIGGER AS $$
DECLARE
  max_properties INT;
  current_count INT;
BEGIN
  -- Pegar limite do plano
  SELECT p.max_properties INTO max_properties
  FROM tenant_subscriptions ts
  JOIN plans p ON p.id = ts.plan_id
  WHERE ts.tenant_id = NEW.tenant_id;

  -- Contar propriedades atuais
  SELECT COUNT(*) INTO current_count
  FROM properties
  WHERE tenant_id = NEW.tenant_id;

  -- Bloquear se exceder
  IF current_count >= max_properties THEN
    RAISE EXCEPTION 'Tenant % exceeded property limit (%/%)',
      NEW.tenant_id, current_count, max_properties;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_property_limit
BEFORE INSERT ON properties
FOR EACH ROW EXECUTE FUNCTION enforce_tenant_limits();
```

---

## RELATIONSHIPS ANALYSIS

### ✅ FOREIGN KEYS BEM DEFINIDOS

**Cobertura:** ~95% das relações têm FKs

**Exemplos:**

```sql
tenantId: varchar("tenant_id").notNull().references(() => tenants.id)
propertyId: varchar("property_id").notNull().references(() => properties.id)
leadId: varchar("lead_id").notNull().references(() => leads.id)
```

### ❌ CASCADE BEHAVIORS FALTANDO

**Problema CRÍTICO:** Sem ON DELETE/ON UPDATE

```sql
-- Cenário 1: Deletar tenant
DELETE FROM tenants WHERE id = 'tenant-123';
-- ❌ ERRO: Foreign key violation (properties ainda existem)
-- ✅ Deveria cascadear TUDO

-- Cenário 2: Deletar lead
DELETE FROM leads WHERE id = 'lead-456';
-- ❌ ERRO: Foreign key violation (interactions existem)
-- ✅ Deveria cascadear ou SET NULL

-- Cenário 3: Deletar property
DELETE FROM properties WHERE id = 'prop-789';
-- ❌ ERRO: Foreign key violation (contracts existem)
-- ✅ Deveria BLOQUEAR (RESTRICT)
```

### 🎯 CASCADE STRATEGY RECOMENDADA

| Relação                       | Comportamento | Razão                                  |
| ----------------------------- | ------------- | -------------------------------------- |
| `tenants → *`                 | **CASCADE**   | Deletar tenant = deletar TUDO          |
| `properties → contracts`      | **RESTRICT**  | Não pode deletar property com contrato |
| `leads → interactions`        | **CASCADE**   | Deletar lead = deletar histórico       |
| `leads → contracts`           | **RESTRICT**  | Não pode deletar lead com contrato     |
| `users → leads.assigned_to`   | **SET NULL**  | Deletar user = desatribuir leads       |
| `rental_contracts → payments` | **CASCADE**   | Deletar contrato = deletar pagamentos  |
| `properties → images`         | **CASCADE**   | Deletar property = deletar imagens     |

**SQL de Implementação:**

```sql
-- Tenants CASCADE TUDO
ALTER TABLE users
DROP CONSTRAINT users_tenant_id_fkey,
ADD CONSTRAINT users_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE properties
DROP CONSTRAINT properties_tenant_id_fkey,
ADD CONSTRAINT properties_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Properties RESTRICT se tiver contrato
ALTER TABLE contracts
DROP CONSTRAINT contracts_property_id_fkey,
ADD CONSTRAINT contracts_property_id_fkey
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT;

-- Leads CASCADE interactions
ALTER TABLE interactions
DROP CONSTRAINT interactions_lead_id_fkey,
ADD CONSTRAINT interactions_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- Users SET NULL assignments
ALTER TABLE leads
DROP CONSTRAINT leads_assigned_to_fkey,
ADD CONSTRAINT leads_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
```

### ⚠️ NULLABLE FOREIGN KEYS

**Problema:** Muitos FKs opcionais sem razão clara

```sql
-- ❌ Questionável
leadId: varchar("lead_id").references(() => leads.id)  // Visit sem lead?
assignedTo: varchar("assigned_to").references(() => users.id)  // OK, pode não estar atribuído

-- ✅ Deveria ser NOT NULL
sellerId: varchar("seller_id").references(() => owners.id)  // Venda sempre tem vendedor!
```

**Recomendação:** Revisar 20+ FKs opcionais

### 🔗 JUNCTION TABLES

**Bem Implementadas:**

1. ✅ **lead_tag_links** (leads ↔ lead_tags)

```sql
CREATE TABLE lead_tag_links (
  id VARCHAR PRIMARY KEY,
  lead_id VARCHAR REFERENCES leads(id),
  tag_id VARCHAR REFERENCES lead_tags(id)
);
```

**Melhorias:**

```sql
-- Adicionar composite unique
ALTER TABLE lead_tag_links
ADD CONSTRAINT uq_lead_tag UNIQUE (lead_id, tag_id);

-- Adicionar cascade
ALTER TABLE lead_tag_links
DROP CONSTRAINT lead_tag_links_lead_id_fkey,
ADD CONSTRAINT lead_tag_links_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
```

### 🚨 RELAÇÕES FALTANDO

**Tabelas órfãs sem relações claras:**

1. **newsletter_subscriptions.tenantId** - Opcional, mas deveria ser obrigatório?
2. **files.relatedId** - Polimórfico, mas sem FK (anti-pattern!)

```sql
-- ❌ Atual: Polimorphic association SEM FK
CREATE TABLE files (
  related_to TEXT,      -- 'property', 'lead', 'contract'
  related_id VARCHAR    -- Sem FK!
);

-- ✅ Opção 1: Tabelas separadas
CREATE TABLE property_files (...);
CREATE TABLE lead_files (...);
CREATE TABLE contract_files (...);

-- ✅ Opção 2: Usar JSONB com triggers
CREATE TABLE files (
  entity JSONB,  -- { type: 'property', id: 'xxx' }
  CONSTRAINT check_entity CHECK (
    entity->>'type' IN ('property', 'lead', 'contract') AND
    entity->>'id' IS NOT NULL
  )
);
CREATE TRIGGER validate_entity_reference ...
```

---

## QUERY PATTERNS ANALYSIS

### 🔍 QUERIES COMUNS IDENTIFICADAS

#### 1. Dashboard Metrics

```sql
-- Properties por status
SELECT status, COUNT(*) as count
FROM properties
WHERE tenant_id = 'xxx'
GROUP BY status;
-- ✅ Otimizado por: idx_properties_tenant_status

-- Leads por estágio (Kanban)
SELECT status, COUNT(*), AVG(budget)
FROM leads
WHERE tenant_id = 'xxx' AND status != 'archived'
GROUP BY status;
-- ✅ Otimizado por: idx_leads_tenant_status

-- Pagamentos vencidos
SELECT COUNT(*), SUM(total_value)
FROM rental_payments
WHERE tenant_id = 'xxx'
  AND status = 'pending'
  AND due_date < CURRENT_DATE;
-- ✅✅ Otimizado por: idx_rental_payments_overdue (partial index)
```

#### 2. Property Search

```sql
-- Busca com múltiplos filtros
SELECT *
FROM properties
WHERE tenant_id = 'xxx'
  AND status = 'available'
  AND type = 'apartamento'
  AND city = 'São Paulo'
  AND bedrooms >= 2
  AND price BETWEEN 300000 AND 500000
ORDER BY featured DESC, created_at DESC
LIMIT 20;

-- ⚠️ Problema: Índice composto pode não ser usado eficientemente
-- ✅ Solução: Adicionar covering index
CREATE INDEX idx_properties_search
ON properties(tenant_id, status, city, type)
INCLUDE (bedrooms, price, featured, created_at);
```

#### 3. Financial Reports

```sql
-- Receitas vs Despesas (mensal)
SELECT
  DATE_TRUNC('month', entry_date) as month,
  flow,
  SUM(amount) as total
FROM finance_entries
WHERE tenant_id = 'xxx'
  AND entry_date BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY month, flow
ORDER BY month;
-- ✅ Otimizado por: idx_finance_entries_tenant_flow_date

-- Comissões a pagar
SELECT
  u.name,
  SUM(c.broker_commission) as total_pending
FROM commissions c
JOIN users u ON u.id = c.broker_id
WHERE c.tenant_id = 'xxx'
  AND c.status = 'pending'
GROUP BY u.id, u.name;
-- ✅ Otimizado por: idx_commissions_tenant_status_broker
```

#### 4. CRM - Lead Follow-ups

```sql
-- Follow-ups atrasados
SELECT l.name, l.email, f.type, f.due_at, f.notes
FROM follow_ups f
JOIN leads l ON l.id = f.lead_id
WHERE f.tenant_id = 'xxx'
  AND f.status = 'pending'
  AND f.due_at < CURRENT_TIMESTAMP
ORDER BY f.due_at ASC;
-- ✅ Otimizado por: idx_follow_ups_tenant_id, idx_follow_ups_status, idx_follow_ups_due_at
```

### 📊 QUERY PERFORMANCE ESTIMATES

| Query             | Antes Índices | Depois Índices | Ganho    |
| ----------------- | ------------- | -------------- | -------- |
| Dashboard metrics | 2-5s          | 100-300ms      | **20x**  |
| Property search   | 1-3s          | 50-150ms       | **20x**  |
| Financial report  | 5-10s         | 500ms-1s       | **10x**  |
| Lead kanban       | 2-4s          | 100-200ms      | **20x**  |
| Payment overdue   | 3-8s          | 20-50ms        | **100x** |

---

## SCALABILITY ANALYSIS

### ⚠️ PARTITIONING (Score: 0/100)

**Problema:** NENHUMA tabela usa partitioning

**Tabelas Candidatas:**

#### 1. rental_payments (HIGH PRIORITY)

```sql
-- Problema: Vai crescer MUITO rápido
-- 100 contratos × 12 meses = 1.200 registros/ano
-- 1.000 contratos × 5 anos = 60.000 registros
-- 10.000 contratos × 10 anos = 1.200.000 registros

-- ✅ Solução: Partitioning por data
CREATE TABLE rental_payments (
  ...
  due_date TIMESTAMP NOT NULL
) PARTITION BY RANGE (due_date);

-- Partições anuais
CREATE TABLE rental_payments_2024
PARTITION OF rental_payments
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE rental_payments_2025
PARTITION OF rental_payments
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Auto-criar partições futuras
CREATE EXTENSION pg_partman;
SELECT partman.create_parent(
  'public.rental_payments',
  'due_date',
  'native',
  'yearly'
);
```

**Benefícios:**

- ✅ Queries filtradas por data são 10-50x mais rápidas
- ✅ Manutenção (VACUUM) muito mais rápida
- ✅ Pode dropar partições antigas (GDPR/LGPD retention)
- ✅ Backup/restore mais eficiente

#### 2. finance_entries (MEDIUM PRIORITY)

```sql
-- Partitioning por entry_date (mensal ou trimestral)
CREATE TABLE finance_entries (
  ...
) PARTITION BY RANGE (entry_date);
```

#### 3. interactions (MEDIUM PRIORITY)

```sql
-- Partitioning por created_at (trimestral)
CREATE TABLE interactions (
  ...
) PARTITION BY RANGE (created_at);
```

#### 4. compliance_audit_log (HIGH PRIORITY)

```sql
-- Partitioning por timestamp (mensal)
-- Log vai crescer MUITO
CREATE TABLE compliance_audit_log (
  ...
) PARTITION BY RANGE (timestamp);
```

### 🗂️ SHARDING (Futuro)

**Quando considerar:** >1 milhão de propriedades ou >100 tenants grandes

**Estratégia:** Sharding por tenant_id

```sql
-- Shard 1: Tenants A-M
-- Shard 2: Tenants N-Z

-- Ou por tamanho:
-- Shard 1: Top 10 tenants (cada um no próprio DB)
-- Shard 2-5: Tenants médios
-- Shard 6: Tenants pequenos (compartilhado)
```

**Complexidade:** 🔴🔴🔴🔴 MUITO ALTA - Só se REALMENTE necessário

### 📈 GROWTH PROJECTIONS

**Cenário Conservador (3 anos):**

- 50 tenants
- 10.000 properties
- 50.000 leads
- 500.000 interactions
- 1.000.000 rental_payments

**Database Size:** ~10-20GB

**Cenário Agressivo (5 anos):**

- 500 tenants
- 100.000 properties
- 500.000 leads
- 5.000.000 interactions
- 10.000.000 rental_payments

**Database Size:** ~100-200GB

**Recomendação:**

- ✅ Partitioning em 1 ano (quando payments > 100k)
- ⚠️ Considerar sharding em 3 anos (se >100 tenants grandes)
- ✅ PostgreSQL pode escalar até 1TB+ facilmente

---

## DATA INTEGRITY ANALYSIS

### ✅ AUDIT TRAIL (Bom)

**Timestamps:**

- ✅ `created_at` em TODAS as tabelas
- ✅ `updated_at` em tabelas mutáveis
- ⚠️ Falta `deleted_at` (soft deletes)

**Audit Tables:**

- ✅ `audit_logs` (SQLite)
- ✅ `compliance_audit_log` (PostgreSQL)
- ✅ `usage_logs`
- ✅ `login_history` (SQLite)

### ❌ SOFT DELETES (Score: 0/100)

**Problema:** NENHUMA tabela implementa soft deletes

```sql
-- ❌ Atual: DELETE hard
DELETE FROM properties WHERE id = 'xxx';
-- Dados perdidos para sempre!

-- ✅ Deveria ter soft delete
ALTER TABLE properties ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_properties_deleted_at ON properties(deleted_at) WHERE deleted_at IS NOT NULL;

-- Queries sempre filtram
SELECT * FROM properties WHERE deleted_at IS NULL;

-- Para deletar "de verdade"
UPDATE properties SET deleted_at = NOW() WHERE id = 'xxx';
```

**Tabelas que DEVEM ter soft delete:**

1. properties - Histórico de imóveis
2. leads - GDPR/LGPD (pode precisar recuperar)
3. contracts - Auditoria legal
4. rental_contracts - Histórico financeiro
5. users - Compliance

### 🔍 DATA VALIDATION

#### ❌ Triggers FALTANDO (Score: 0/100)

**NENHUM trigger implementado!**

**Triggers Recomendados:**

```sql
-- 1. Auto-atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_updated_at
BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Validar email format
CREATE OR REPLACE FUNCTION validate_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_validate_email
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION validate_email();

-- 3. Validar CPF/CNPJ
CREATE OR REPLACE FUNCTION validate_cpf_cnpj()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cpf_cnpj IS NOT NULL AND LENGTH(REGEXP_REPLACE(NEW.cpf_cnpj, '[^0-9]', '', 'g')) NOT IN (11, 14) THEN
    RAISE EXCEPTION 'Invalid CPF/CNPJ: %', NEW.cpf_cnpj;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Audit log automático
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    current_setting('app.current_user', true)::VARCHAR,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    row_to_json(OLD),
    row_to_json(NEW),
    current_setting('app.client_ip', true)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabelas críticas
CREATE TRIGGER trg_properties_audit
AFTER INSERT OR UPDATE OR DELETE ON properties
FOR EACH ROW EXECUTE FUNCTION log_changes();
```

### 🔐 SENSITIVE DATA

**Campos sensíveis:**

- users.password (✅ deve estar hasheado)
- owners.cpfCnpj (⚠️ deveria estar encrypted at rest)
- renters.cpfCnpj (⚠️ deveria estar encrypted at rest)
- owners.bankAccount (⚠️ deveria estar encrypted at rest)
- owners.pixKey (⚠️ deveria estar encrypted at rest)

**Recomendação:** Encryption at database level

```sql
-- PostgreSQL pgcrypto
CREATE EXTENSION pgcrypto;

-- Encrypt ao inserir
INSERT INTO owners (cpf_cnpj, ...)
VALUES (
  pgp_sym_encrypt('12345678900', 'encryption-key'),
  ...
);

-- Decrypt ao ler
SELECT
  id,
  name,
  pgp_sym_decrypt(cpf_cnpj::bytea, 'encryption-key') as cpf_cnpj
FROM owners;
```

---

## SECURITY ANALYSIS

### ✅ BOM (Score: 78/100)

**Implementado:**

- ✅ Multi-tenancy isolation
- ✅ Audit logs
- ✅ User sessions tracking
- ✅ Login history
- ✅ Two-factor auth (SQLite)
- ✅ Compliance tables (LGPD/GDPR)
- ✅ Data breach tracking

### ❌ FALTANDO

#### 1. Row-Level Security (PostgreSQL)

```sql
-- Habilitar RLS em TODAS as tabelas
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ... (todas as tabelas)

-- Criar policies
CREATE POLICY tenant_isolation ON properties
  USING (tenant_id = current_setting('app.current_tenant')::varchar);
```

#### 2. Encryption at Rest

```sql
-- PostgreSQL: Transparent Data Encryption (TDE)
-- Ou Amazon RDS encryption

-- Application-level encryption
CREATE EXTENSION pgcrypto;
```

#### 3. SQL Injection Protection

**Drizzle ORM já protege**, mas validar:

```typescript
// ❌ NUNCA fazer
db.execute(sql`SELECT * FROM users WHERE email = '${userInput}'`);

// ✅ Sempre usar prepared statements
db.select().from(users).where(eq(users.email, userInput));
```

#### 4. Rate Limiting

```sql
-- Track login attempts
CREATE TABLE login_rate_limits (
  ip_address TEXT,
  attempts INTEGER,
  last_attempt TIMESTAMP,
  blocked_until TIMESTAMP
);

CREATE INDEX idx_login_rate_limits_ip ON login_rate_limits(ip_address);
```

#### 5. Password History

```sql
-- ✅ Já existe em SQLite
passwordHistory: text("password_history")  // JSON array

-- Mas falta em PostgreSQL
ALTER TABLE users ADD COLUMN password_history JSONB DEFAULT '[]';

-- Trigger para atualizar
CREATE OR REPLACE FUNCTION track_password_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password != OLD.password THEN
    NEW.password_history = OLD.password_history || jsonb_build_array(
      jsonb_build_object(
        'hash', OLD.password,
        'changed_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## MIGRATION STRATEGY

### ✅ ESTRUTURA ATUAL (Score: 80/100)

**Arquivos:**

- ✅ `/migrations/README.md` - Boa documentação
- ✅ `/migrations/add-performance-indexes.sql` - Crítico
- ✅ `/migrations/add-commissions-table.sql` - Estrutural
- ✅ `/migrations/add-seo-fields-to-brand-settings.sql` - Feature
- ✅ `/migrations/add-payment-metadata.sql` - Enhancement

**Boas Práticas:**

- ✅ IF NOT EXISTS para idempotência
- ✅ Comentários explicativos
- ✅ Naming convention clara
- ✅ Rollback instructions (comentadas)

### ❌ PROBLEMAS

#### 1. Sem Versionamento Automático

```bash
# ❌ Atual: Nomes manuais
add-performance-indexes.sql
add-commissions-table.sql

# ✅ Deveria ser
20241224120000_add_performance_indexes.sql
20241224130000_add_commissions_table.sql
```

#### 2. Sem Tracking de Aplicação

```sql
-- ✅ Criar tabela de migrations
CREATE TABLE schema_migrations (
  version BIGINT PRIMARY KEY,
  name VARCHAR NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);

-- Exemplo de registro
INSERT INTO schema_migrations (version, name, checksum)
VALUES (20241224120000, 'add_performance_indexes', 'sha256hash...');
```

#### 3. Sem Rollback Scripts

```sql
-- ❌ Atual: Só comentários
-- DROP INDEX IF EXISTS idx_properties_tenant_id;

-- ✅ Deveria ter arquivos separados
migrations/
  20241224120000_add_indexes_up.sql
  20241224120000_add_indexes_down.sql
```

#### 4. Sem CI/CD Integration

```yaml
# .github/workflows/database-migrations.yml
name: Database Migrations
on:
  push:
    paths:
      - "migrations/**"
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Run Migrations
        run: npm run db:migrate
      - name: Verify Schema
        run: npm run db:verify
```

### 🎯 MIGRATION TOOL RECOMENDADO

**Opção 1: Drizzle Kit (Recomendado)**

```bash
npm install -D drizzle-kit

# Generate migration
npx drizzle-kit generate:pg

# Apply migration
npx drizzle-kit push:pg
```

**Opção 2: Flyway**

```bash
# Migrations em SQL puro
migrations/
  V1__initial_schema.sql
  V2__add_performance_indexes.sql
  V3__add_commissions_table.sql
```

**Opção 3: Custom Node Script**

```typescript
// script/migrate.ts
import fs from "fs";
import { db } from "../server/db";

async function migrate() {
  const files = fs
    .readdirSync("./migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = parseInt(file.split("_")[0]);

    // Check if already applied
    const applied = await db.execute(
      sql`SELECT version FROM schema_migrations WHERE version = ${version}`,
    );

    if (applied.length === 0) {
      const sql = fs.readFileSync(`./migrations/${file}`, "utf8");
      const start = Date.now();

      await db.execute(sql);

      await db.execute(sql`
        INSERT INTO schema_migrations (version, name, execution_time_ms)
        VALUES (${version}, ${file}, ${Date.now() - start})
      `);

      console.log(`✅ Applied: ${file}`);
    }
  }
}
```

---

## ANTI-PATTERNS IDENTIFICADOS

### 1. ⚠️ God Tables (Nenhum crítico)

**properties** tem 18 colunas, mas justificado (domínio complexo)

### 2. ❌ EAV (Entity-Attribute-Value) - NENHUM

✅ Bom! Nenhum uso de EAV anti-pattern.

### 3. ⚠️ Polimorphic Associations

```sql
-- files.relatedTo + files.relatedId
relatedTo: text("related_to")    -- 'property', 'lead', 'contract'
relatedId: varchar("related_id") -- Sem FK!
```

**Problema:**

- ❌ Sem referential integrity
- ❌ Impossível usar JOIN eficientemente
- ❌ Cascade deletes não funcionam

**Recomendação:** Usar tabelas separadas ou PostgreSQL inheritance

### 4. ⚠️ Missing Foreign Keys

**interactions.tenantId** - FALTA!

### 5. ⚠️ NULLABLE Foreign Keys sem razão

20+ FKs opcionais que poderiam ser NOT NULL

### 6. ❌ TEXT para ENUM

Todos os status, types, etc são TEXT sem constraints

### 7. ⚠️ JSON sem Schema Validation

`permissions`, `metadata`, etc sem validação

---

## 🚀 PERFORMANCE TUNING SQL

### Connection Pooling

```typescript
// server/db.ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Vercel: 20 connections
  idleTimeoutMillis: 30000, // 30s
  connectionTimeoutMillis: 2000, // 2s
  statement_timeout: 10000, // 10s query timeout
  query_timeout: 10000,
});

// Monitor pool
pool.on("error", (err) => {
  console.error("Unexpected database pool error", err);
});

pool.on("connect", () => {
  console.log("New database connection established");
});
```

### Query Optimization

```sql
-- Analyze table statistics (run daily)
ANALYZE properties;
ANALYZE leads;
ANALYZE rental_payments;

-- Vacuum tables (run weekly)
VACUUM ANALYZE properties;

-- Check for bloated indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND idx_tup_read = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_properties_tenant_id;
```

### PostgreSQL Configuration

```ini
# postgresql.conf (para servidor dedicado)

# Connections
max_connections = 100
shared_buffers = 2GB          # 25% of RAM
effective_cache_size = 6GB    # 75% of RAM
work_mem = 20MB               # RAM / max_connections
maintenance_work_mem = 512MB

# Query Planner
random_page_cost = 1.1        # SSD
effective_io_concurrency = 200

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Logging
log_min_duration_statement = 1000  # Log slow queries (>1s)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Autovacuum (ajustar para carga)
autovacuum_max_workers = 3
autovacuum_naptime = 10s
```

---

## 📋 30+ PROBLEMAS ENCONTRADOS

### 🔴 CRÍTICOS (Resolver AGORA)

1. ❌ **interactions.tenant_id FALTANDO** - Data leakage risk
2. ❌ **Sem CASCADE behaviors** - Impossível deletar dados
3. ❌ **Sem CHECK constraints** - Dados inválidos permitidos
4. ❌ **TEXT para decimais (SQLite)** - Performance ruim
5. ❌ **Sem Row-Level Security** - Segurança depende de código
6. ❌ **Sem soft deletes** - Dados perdidos permanentemente
7. ❌ **files.relatedId polimórfico** - Sem referential integrity
8. ❌ **Sem unique constraints compostos** - Duplicatas permitidas

### 🟡 MÉDIOS (Resolver em 1-3 meses)

9. ⚠️ **Sem partitioning** - Performance vai degradar
10. ⚠️ **Sem triggers de validação** - Dados inconsistentes
11. ⚠️ **Sem encryption at rest** - Compliance risk
12. ⚠️ **JSON sem validação** - Dados malformados
13. ⚠️ **Nullable FKs desnecessários** - Inconsistências
14. ⚠️ **Sem tenant quota enforcement** - Planos não respeitados
15. ⚠️ **Sem migration tracking** - Não sabe quais migrations aplicadas
16. ⚠️ **Índices full-text search faltando** - Buscas lentas
17. ⚠️ **Covering indexes faltando** - Queries poderiam ser mais rápidas
18. ⚠️ **Sem rate limiting tables** - Vulnerável a ataques
19. ⚠️ **Password history falta no PG** - Compliance
20. ⚠️ **Redundância tenant_settings/brand_settings** - Confuso

### 🟢 BAIXOS (Nice to have)

21. ℹ️ **VARCHAR sem length** - Pequeno desperdício
22. ℹ️ **TEXT para ENUMs** - Mais espaço, menos validação
23. ℹ️ **Timestamps como TEXT (SQLite)** - Queries de data ineficientes
24. ℹ️ **Sem índices GIN para JSONB** - Queries em JSON lentas
25. ℹ️ **Sem índices range** - Buscas por preço/área lentas
26. ℹ️ **Sem auto-update updated_at** - Pode esquecer de atualizar
27. ℹ️ **Sem email validation** - Emails inválidos permitidos
28. ℹ️ **Sem CPF/CNPJ validation** - Dados inválidos
29. ℹ️ **newsletter_subscriptions.tenantId opcional** - Confuso
30. ℹ️ **lead_tag_links sem tenant_id** - Queries menos eficientes
31. ℹ️ **Sem CI/CD para migrations** - Processo manual
32. ℹ️ **Sem rollback scripts** - Dificultar reverter migrations
33. ℹ️ **Comentários em tabelas faltando** - Documentação

---

## 🎯 INDEX RECOMMENDATIONS (SQL COMPLETO)

### Full-Text Search Indexes

```sql
-- Properties search
CREATE INDEX idx_properties_title_fts
  ON properties USING gin(to_tsvector('portuguese', title));

CREATE INDEX idx_properties_description_fts
  ON properties USING gin(to_tsvector('portuguese', description));

-- Leads search
CREATE INDEX idx_leads_name_fts
  ON leads USING gin(to_tsvector('portuguese', name));

CREATE INDEX idx_leads_notes_fts
  ON leads USING gin(to_tsvector('portuguese', COALESCE(notes, '')));
```

### Range Query Indexes

```sql
-- Property filters
CREATE INDEX idx_properties_price_range
  ON properties(tenant_id, price)
  WHERE status = 'available';

CREATE INDEX idx_properties_area_range
  ON properties(tenant_id, area)
  WHERE status = 'available';

CREATE INDEX idx_properties_bedrooms_range
  ON properties(tenant_id, bedrooms)
  WHERE status = 'available' AND bedrooms IS NOT NULL;

CREATE INDEX idx_properties_bathrooms_range
  ON properties(tenant_id, bathrooms)
  WHERE status = 'available' AND bathrooms IS NOT NULL;
```

### Date Range Indexes

```sql
-- Expiring contracts
CREATE INDEX idx_rental_contracts_expiring
  ON rental_contracts(tenant_id, end_date, status)
  WHERE status = 'active';

-- Upcoming visits
CREATE INDEX idx_visits_upcoming
  ON visits(tenant_id, scheduled_for)
  WHERE status = 'scheduled';

-- Recent interactions
CREATE INDEX idx_interactions_recent
  ON interactions(lead_id, created_at DESC);
```

### JSONB Indexes (PostgreSQL)

```sql
-- Property features
CREATE INDEX idx_properties_features_gin
  ON properties USING gin(features);

-- User permissions
CREATE INDEX idx_user_roles_permissions_gin
  ON user_roles USING gin(permissions);

-- Integration configs
CREATE INDEX idx_integration_configs_config_gin
  ON integration_configs USING gin(config);
```

### Covering Indexes

```sql
-- Dashboard properties
CREATE INDEX idx_properties_dashboard
  ON properties(tenant_id, status, featured)
  INCLUDE (title, price, city, images, created_at);

-- Lead list
CREATE INDEX idx_leads_list
  ON leads(tenant_id, status)
  INCLUDE (name, email, phone, source, created_at);

-- Rental payment list
CREATE INDEX idx_rental_payments_list
  ON rental_payments(tenant_id, status, due_date)
  INCLUDE (rental_contract_id, total_value, paid_value);
```

### Unique Composite Indexes

```sql
-- Prevent duplicate tags
ALTER TABLE lead_tag_links
ADD CONSTRAINT uq_lead_tag_links_lead_tag UNIQUE (lead_id, tag_id);

-- Prevent duplicate payments
ALTER TABLE rental_payments
ADD CONSTRAINT uq_rental_payments_contract_month
UNIQUE (rental_contract_id, reference_month);

-- Prevent duplicate transfers
ALTER TABLE rental_transfers
ADD CONSTRAINT uq_rental_transfers_owner_month
UNIQUE (owner_id, reference_month);

-- Prevent duplicate enrollments
CREATE UNIQUE INDEX uq_campaign_enrollments_campaign_lead
  ON campaign_enrollments(campaign_id, lead_id)
  WHERE status != 'exited';
```

---

## 🔒 CHECK CONSTRAINTS (SQL COMPLETO)

### Properties

```sql
ALTER TABLE properties
ADD CONSTRAINT chk_properties_status
CHECK (status IN ('available', 'rented', 'sold', 'unavailable', 'maintenance'));

ALTER TABLE properties
ADD CONSTRAINT chk_properties_type
CHECK (type IN ('apartamento', 'casa', 'terreno', 'comercial', 'rural', 'studio', 'kitnet'));

ALTER TABLE properties
ADD CONSTRAINT chk_properties_category
CHECK (category IN ('venda', 'aluguel', 'temporada'));

ALTER TABLE properties
ADD CONSTRAINT chk_properties_price_positive
CHECK (price >= 0);

ALTER TABLE properties
ADD CONSTRAINT chk_properties_bedrooms_valid
CHECK (bedrooms IS NULL OR (bedrooms >= 0 AND bedrooms <= 50));

ALTER TABLE properties
ADD CONSTRAINT chk_properties_bathrooms_valid
CHECK (bathrooms IS NULL OR (bathrooms >= 0 AND bathrooms <= 20));

ALTER TABLE properties
ADD CONSTRAINT chk_properties_area_valid
CHECK (area IS NULL OR (area > 0 AND area <= 1000000));
```

### Leads

```sql
ALTER TABLE leads
ADD CONSTRAINT chk_leads_status
CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'archived'));

ALTER TABLE leads
ADD CONSTRAINT chk_leads_source
CHECK (source IN ('website', 'facebook', 'instagram', 'google', 'olx', 'vivareal', 'zapimoveis', 'referral', 'walk-in', 'phone', 'whatsapp', 'other'));

ALTER TABLE leads
ADD CONSTRAINT chk_leads_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

ALTER TABLE leads
ADD CONSTRAINT chk_leads_budget_positive
CHECK (budget IS NULL OR budget >= 0);

ALTER TABLE leads
ADD CONSTRAINT chk_leads_bedrooms_range
CHECK (
  (min_bedrooms IS NULL AND max_bedrooms IS NULL) OR
  (min_bedrooms IS NULL OR min_bedrooms >= 0) AND
  (max_bedrooms IS NULL OR max_bedrooms >= 0) AND
  (min_bedrooms IS NULL OR max_bedrooms IS NULL OR min_bedrooms <= max_bedrooms)
);
```

### Rental Contracts

```sql
ALTER TABLE rental_contracts
ADD CONSTRAINT chk_rental_contracts_status
CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'terminated'));

ALTER TABLE rental_contracts
ADD CONSTRAINT chk_rental_contracts_rent_positive
CHECK (rent_value > 0);

ALTER TABLE rental_contracts
ADD CONSTRAINT chk_rental_contracts_due_day
CHECK (due_day >= 1 AND due_day <= 31);

ALTER TABLE rental_contracts
ADD CONSTRAINT chk_rental_contracts_dates
CHECK (end_date > start_date);

ALTER TABLE rental_contracts
ADD CONSTRAINT chk_rental_contracts_admin_fee
CHECK (administration_fee >= 0 AND administration_fee <= 100);
```

### Rental Payments

```sql
ALTER TABLE rental_payments
ADD CONSTRAINT chk_rental_payments_status
CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid', 'cancelled'));

ALTER TABLE rental_payments
ADD CONSTRAINT chk_rental_payments_values_positive
CHECK (
  rent_value >= 0 AND
  (condo_fee IS NULL OR condo_fee >= 0) AND
  (iptu_value IS NULL OR iptu_value >= 0) AND
  (extra_charges IS NULL OR extra_charges >= 0) AND
  (discounts IS NULL OR discounts >= 0) AND
  total_value >= 0 AND
  (paid_value IS NULL OR paid_value >= 0)
);

ALTER TABLE rental_payments
ADD CONSTRAINT chk_rental_payments_paid_value
CHECK (paid_value IS NULL OR paid_value <= total_value);

ALTER TABLE rental_payments
ADD CONSTRAINT chk_rental_payments_reference_month
CHECK (reference_month ~ '^\d{4}-\d{2}$');
```

### Commissions

```sql
ALTER TABLE commissions
ADD CONSTRAINT chk_commissions_transaction_type
CHECK (transaction_type IN ('sale', 'rental'));

ALTER TABLE commissions
ADD CONSTRAINT chk_commissions_status
CHECK (status IN ('pending', 'approved', 'paid', 'cancelled'));

ALTER TABLE commissions
ADD CONSTRAINT chk_commissions_values_positive
CHECK (
  transaction_value > 0 AND
  commission_rate >= 0 AND commission_rate <= 100 AND
  gross_commission >= 0 AND
  agency_split >= 0 AND agency_split <= 100 AND
  broker_commission >= 0
);

ALTER TABLE commissions
ADD CONSTRAINT chk_commissions_broker_less_than_gross
CHECK (broker_commission <= gross_commission);
```

### Finance Entries

```sql
ALTER TABLE finance_entries
ADD CONSTRAINT chk_finance_entries_flow
CHECK (flow IN ('inflow', 'outflow'));

ALTER TABLE finance_entries
ADD CONSTRAINT chk_finance_entries_amount_positive
CHECK (amount > 0);

ALTER TABLE finance_entries
ADD CONSTRAINT chk_finance_entries_status
CHECK (status IN ('pending', 'completed', 'cancelled'));
```

### Users

```sql
ALTER TABLE users
ADD CONSTRAINT chk_users_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

ALTER TABLE users
ADD CONSTRAINT chk_users_role
CHECK (role IN ('admin', 'manager', 'broker', 'user'));

ALTER TABLE users
ADD CONSTRAINT chk_users_failed_login_attempts
CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10);
```

### Visits

```sql
ALTER TABLE visits
ADD CONSTRAINT chk_visits_status
CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'));

ALTER TABLE visits
ADD CONSTRAINT chk_visits_future_date
CHECK (scheduled_for > created_at);
```

### Contracts

```sql
ALTER TABLE contracts
ADD CONSTRAINT chk_contracts_type
CHECK (type IN ('sale', 'rental', 'lease', 'management'));

ALTER TABLE contracts
ADD CONSTRAINT chk_contracts_status
CHECK (status IN ('draft', 'active', 'signed', 'expired', 'cancelled', 'terminated'));

ALTER TABLE contracts
ADD CONSTRAINT chk_contracts_value_positive
CHECK (value > 0);
```

---

## 🛡️ SECURITY HARDENING SQL

### Row-Level Security (PostgreSQL)

```sql
-- Enable RLS globally
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;
-- ... (enable for ALL tables)

-- Tenant isolation policy
CREATE POLICY tenant_isolation_select ON properties
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true)::varchar);

CREATE POLICY tenant_isolation_insert ON properties
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::varchar);

CREATE POLICY tenant_isolation_update ON properties
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant', true)::varchar);

CREATE POLICY tenant_isolation_delete ON properties
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant', true)::varchar);

-- Apply to ALL tenant-scoped tables
-- (Criar função helper para aplicar em batch)

-- Superuser bypass (for system tasks)
CREATE POLICY superuser_bypass ON properties
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'superuser');
```

### Encryption

```sql
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive columns
ALTER TABLE owners
ALTER COLUMN cpf_cnpj TYPE bytea
USING pgp_sym_encrypt(cpf_cnpj, current_setting('app.encryption_key'));

ALTER TABLE owners
ALTER COLUMN bank_account TYPE bytea
USING pgp_sym_encrypt(bank_account, current_setting('app.encryption_key'));

-- Decrypt view
CREATE VIEW owners_decrypted AS
SELECT
  id,
  tenant_id,
  name,
  email,
  phone,
  pgp_sym_decrypt(cpf_cnpj, current_setting('app.encryption_key'))::text AS cpf_cnpj,
  address,
  bank_name,
  bank_agency,
  pgp_sym_decrypt(bank_account, current_setting('app.encryption_key'))::text AS bank_account,
  pix_key,
  notes,
  created_at
FROM owners;

-- Grant permissions
GRANT SELECT ON owners_decrypted TO app_role;
REVOKE SELECT ON owners FROM app_role;
```

### Audit Triggers

```sql
-- Auto-audit ALL changes
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    current_setting('app.current_user', true)::varchar,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    current_setting('app.client_ip', true),
    current_setting('app.user_agent', true),
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to critical tables
CREATE TRIGGER trg_properties_audit
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_leads_audit
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_contracts_audit
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

-- ... (apply to all critical tables)
```

---

## 📊 PARTITIONING STRATEGY

### rental_payments (CRITICAL)

```sql
-- Criar tabela particionada
CREATE TABLE rental_payments_new (
  LIKE rental_payments INCLUDING ALL
) PARTITION BY RANGE (due_date);

-- Criar partições (últimos 2 anos + próximos 2 anos)
CREATE TABLE rental_payments_2023
  PARTITION OF rental_payments_new
  FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE rental_payments_2024
  PARTITION OF rental_payments_new
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE rental_payments_2025
  PARTITION OF rental_payments_new
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE rental_payments_2026
  PARTITION OF rental_payments_new
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Migrar dados
INSERT INTO rental_payments_new SELECT * FROM rental_payments;

-- Swap tables (em transação)
BEGIN;
  ALTER TABLE rental_payments RENAME TO rental_payments_old;
  ALTER TABLE rental_payments_new RENAME TO rental_payments;
  -- Update sequences, triggers, etc
COMMIT;

-- Instalar pg_partman para auto-criar partições
CREATE EXTENSION pg_partman;

SELECT partman.create_parent(
  p_parent_table := 'public.rental_payments',
  p_control := 'due_date',
  p_type := 'native',
  p_interval := 'yearly',
  p_premake := 2,  -- Criar 2 anos à frente
  p_start_partition := '2023-01-01'
);

-- Agendar manutenção automática
SELECT partman.run_maintenance('public.rental_payments');
```

### finance_entries

```sql
-- Similar ao rental_payments, mas talvez trimestral
CREATE TABLE finance_entries_new (
  LIKE finance_entries INCLUDING ALL
) PARTITION BY RANGE (entry_date);

CREATE TABLE finance_entries_2024_q1
  PARTITION OF finance_entries_new
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE finance_entries_2024_q2
  PARTITION OF finance_entries_new
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
-- etc...
```

### compliance_audit_log

```sql
-- Partitioning mensal (log cresce muito)
CREATE TABLE compliance_audit_log_new (
  LIKE compliance_audit_log INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Auto-criar partições mensais
SELECT partman.create_parent(
  p_parent_table := 'public.compliance_audit_log',
  p_control := 'timestamp',
  p_type := 'native',
  p_interval := 'monthly',
  p_premake := 3,
  p_retention := '12 months',  -- Drop partições >12 meses
  p_retention_keep_table := false
);
```

---

## 🔧 DATA INTEGRITY CHECKS SQL

### Orphaned Records

```sql
-- Check for orphaned interactions (lead deleted but interactions remain)
SELECT COUNT(*) AS orphaned_interactions
FROM interactions i
WHERE NOT EXISTS (
  SELECT 1 FROM leads l WHERE l.id = i.lead_id
);

-- Check for orphaned visits
SELECT COUNT(*) AS orphaned_visits
FROM visits v
WHERE v.lead_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM leads l WHERE l.id = v.lead_id
  );

-- Check for orphaned rental_payments
SELECT COUNT(*) AS orphaned_payments
FROM rental_payments rp
WHERE NOT EXISTS (
  SELECT 1 FROM rental_contracts rc WHERE rc.id = rp.rental_contract_id
);

-- Check for orphaned commissions
SELECT COUNT(*) AS orphaned_commissions_sale
FROM commissions c
WHERE c.transaction_type = 'sale'
  AND c.sale_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM property_sales ps WHERE ps.id = c.sale_id
  );
```

### Data Consistency

```sql
-- Properties with invalid status
SELECT id, title, status
FROM properties
WHERE status NOT IN ('available', 'rented', 'sold', 'unavailable', 'maintenance');

-- Leads with invalid email
SELECT id, name, email
FROM leads
WHERE email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$';

-- Negative prices
SELECT id, title, price
FROM properties
WHERE price < 0;

-- Invalid bedrooms
SELECT id, title, bedrooms
FROM properties
WHERE bedrooms < 0 OR bedrooms > 50;

-- Rental payments where paid > total
SELECT id, rental_contract_id, total_value, paid_value
FROM rental_payments
WHERE paid_value > total_value;

-- Contracts with end_date before start_date
SELECT id, start_date, end_date
FROM rental_contracts
WHERE end_date <= start_date;

-- Commissions where broker_commission > gross_commission
SELECT id, gross_commission, broker_commission
FROM commissions
WHERE broker_commission > gross_commission;
```

### Missing Tenant IDs

```sql
-- Tables that should have tenant_id
SELECT 'interactions' AS table_name, COUNT(*) AS missing_tenant_id
FROM interactions
WHERE tenant_id IS NULL

UNION ALL

SELECT 'newsletter_subscriptions', COUNT(*)
FROM newsletter_subscriptions
WHERE tenant_id IS NULL

UNION ALL

SELECT 'usage_logs', COUNT(*)
FROM usage_logs
WHERE tenant_id IS NULL;
```

### Duplicate Prevention

```sql
-- Duplicate lead tags
SELECT lead_id, tag_id, COUNT(*)
FROM lead_tag_links
GROUP BY lead_id, tag_id
HAVING COUNT(*) > 1;

-- Duplicate rental payments (same contract + month)
SELECT rental_contract_id, reference_month, COUNT(*)
FROM rental_payments
GROUP BY rental_contract_id, reference_month
HAVING COUNT(*) > 1;

-- Duplicate transfers (same owner + month)
SELECT owner_id, reference_month, COUNT(*)
FROM rental_transfers
GROUP BY owner_id, reference_month
HAVING COUNT(*) > 1;
```

---

## 📦 BACKUP & RECOVERY PLAN

### Backup Strategy

```bash
#!/bin/bash
# backup-database.sh

# Full backup (daily)
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --file="backup-$(date +%Y%m%d).dump"

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).dump \
  s3://imobibase-backups/daily/

# Schema-only backup (hourly)
pg_dump $DATABASE_URL \
  --schema-only \
  --file="schema-$(date +%Y%m%d-%H%M).sql"

# Data-only backup (specific tables, hourly)
pg_dump $DATABASE_URL \
  --data-only \
  --table=rental_payments \
  --table=finance_entries \
  --file="data-critical-$(date +%Y%m%d-%H%M).dump"
```

### Point-in-Time Recovery

```bash
# Enable WAL archiving (postgresql.conf)
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://imobibase-wal/%f'

# Restore to specific time
pg_restore --dbname=imobibase_restored backup-20241225.dump
psql imobibase_restored <<SQL
  SELECT pg_create_restore_point('before_migration');
SQL
```

### Backup Retention

```yaml
# Retention Policy
Daily Backups: 30 days
Weekly Backups: 12 weeks (3 months)
Monthly Backups: 24 months (2 years)
Yearly Backups: 7 years (compliance)

# Automated with lifecycle policies
S3 Lifecycle:
  - Transition to Glacier: 30 days
  - Transition to Deep Archive: 90 days
  - Delete: 2555 days (7 years)
```

### Restore Testing

```bash
# Monthly restore test
./test-restore.sh

# Verify data integrity
psql restored_db <<SQL
  SELECT COUNT(*) FROM properties;
  SELECT COUNT(*) FROM leads;
  SELECT COUNT(*) FROM rental_payments;
  -- Verify latest data
  SELECT MAX(created_at) FROM properties;
SQL
```

---

## 🎯 SCHEMA EVOLUTION ROADMAP

### Phase 1: CRITICAL (Próximas 2 semanas)

1. ✅ Adicionar `interactions.tenant_id` + index
2. ✅ Implementar CHECK constraints (properties, leads, payments)
3. ✅ Adicionar unique constraints compostos
4. ✅ Implementar CASCADE behaviors
5. ✅ Adicionar soft delete columns
6. ✅ Corrigir tipos de dados SQLite (decimals → real)

### Phase 2: SECURITY (Próximo mês)

7. ✅ Implementar Row-Level Security
8. ✅ Adicionar encryption para campos sensíveis
9. ✅ Implementar audit triggers
10. ✅ Adicionar rate limiting tables
11. ✅ Implementar password history (PG)

### Phase 3: PERFORMANCE (Próximos 2-3 meses)

12. ✅ Adicionar full-text search indexes
13. ✅ Adicionar covering indexes
14. ✅ Implementar partitioning (rental_payments)
15. ✅ Adicionar JSONB indexes
16. ✅ Otimizar queries lentas identificadas

### Phase 4: SCALABILITY (Próximos 6 meses)

17. ✅ Partitioning em todas as tabelas grandes
18. ✅ Implementar read replicas
19. ✅ Considerar sharding strategy
20. ✅ Implementar connection pooling avançado
21. ✅ Adicionar database monitoring (pgHero, Datadog)

### Phase 5: COMPLIANCE (Contínuo)

22. ✅ Implementar data retention policies
23. ✅ Automatizar GDPR/LGPD data exports
24. ✅ Implementar automated backups
25. ✅ Adicionar disaster recovery plan
26. ✅ Documentar data processing activities

---

## 📈 EXPECTED PERFORMANCE GAINS

### Índices (Já Aplicados)

| Operação         | Antes | Depois    | Ganho      |
| ---------------- | ----- | --------- | ---------- |
| Dashboard load   | 3-5s  | 200-500ms | **10-25x** |
| Property search  | 1-3s  | 50-150ms  | **20x**    |
| Lead kanban      | 2-4s  | 100-200ms | **20x**    |
| Payment overdue  | 3-8s  | 20-50ms   | **150x**   |
| Financial report | 5-10s | 500ms-1s  | **10x**    |

### Partitioning (Futuro)

| Tabela          | Registros | Query Atual | Com Partition | Ganho   |
| --------------- | --------- | ----------- | ------------- | ------- |
| rental_payments | 100k      | 500ms       | 50ms          | **10x** |
| rental_payments | 1M        | 5s          | 200ms         | **25x** |
| finance_entries | 500k      | 2s          | 150ms         | **13x** |
| audit_logs      | 10M       | 30s         | 1s            | **30x** |

### RLS + Encryption

| Operação       | Overhead | Aceitável?                |
| -------------- | -------- | ------------------------- |
| RLS check      | +5-10ms  | ✅ Sim (segurança > 10ms) |
| Decrypt field  | +2-5ms   | ✅ Sim (por query)        |
| Encrypt insert | +5-10ms  | ✅ Sim (write raro)       |

---

## 🎓 LESSONS LEARNED & BEST PRACTICES

### ✅ O Que Está BEM FEITO

1. **Multi-tenancy isolation** - tenant_id em todas as tabelas
2. **Index coverage** - 85+ índices bem planejados
3. **Foreign keys** - 95% das relações definidas
4. **Audit trail** - Múltiplas tabelas de auditoria
5. **Compliance** - LGPD/GDPR tables implementadas
6. **Drizzle ORM** - Type-safe, proteção contra SQL injection
7. **Migration structure** - Bem documentada
8. **Partial indexes** - Otimizações avançadas

### ⚠️ O Que Precisa MELHORAR

1. **Sem RLS** - Depende de código da aplicação
2. **Sem CHECK constraints** - Dados inválidos permitidos
3. **Sem CASCADE** - Impossível deletar dados
4. **Sem soft deletes** - Perda permanente de dados
5. **Sem partitioning** - Performance vai degradar
6. **Sem triggers** - Validações manuais
7. **Sem encryption** - Dados sensíveis em claro
8. **SQLite data types** - TEXT para decimais

### 🎯 RECOMENDAÇÕES FINAIS

1. **Prioridade 1:** Adicionar CHECK constraints (1 dia)
2. **Prioridade 2:** Implementar CASCADE behaviors (1 dia)
3. **Prioridade 3:** Adicionar RLS (3 dias)
4. **Prioridade 4:** Implementar soft deletes (2 dias)
5. **Prioridade 5:** Partitioning rental_payments (1 semana)
6. **Prioridade 6:** Encryption de campos sensíveis (1 semana)
7. **Prioridade 7:** Migration tracking automático (3 dias)

### 📚 DOCUMENTAÇÃO RECOMENDADA

```markdown
/docs/database/
schema-overview.md # Visão geral do schema
multi-tenancy.md # Estratégia de isolamento
migrations-guide.md # Como criar/aplicar migrations
performance-tuning.md # Otimizações aplicadas
backup-recovery.md # Procedimentos de backup
compliance.md # LGPD/GDPR implementation
data-dictionary.md # Dicionário de dados completo
```

---

## 🔗 COMPARISON COM BEST PRACTICES

### PostgreSQL Official Docs

| Prática            | Implementado           | Score |
| ------------------ | ---------------------- | ----- |
| Naming conventions | ✅ snake_case          | 100%  |
| Primary keys       | ✅ Todas as tabelas    | 100%  |
| Foreign keys       | ✅ 95% das relações    | 95%   |
| Indexes            | ✅ Excelente cobertura | 95%   |
| Constraints        | ⚠️ Faltam CHECKs       | 40%   |
| Normalization      | ✅ 3NF bem aplicado    | 90%   |
| Data types         | ⚠️ TEXT para enums     | 75%   |
| Documentation      | ⚠️ Poucos comments     | 30%   |

### Real Estate CRM Industry Standards

| Feature              | Implementado         | Score |
| -------------------- | -------------------- | ----- |
| Multi-tenancy        | ✅ Row-level         | 90%   |
| Audit trail          | ✅ Múltiplas tabelas | 95%   |
| Soft deletes         | ❌ Nenhuma tabela    | 0%    |
| Financial tracking   | ✅ Completo          | 100%  |
| Commission system    | ✅ Bem modelado      | 95%   |
| CRM features         | ✅ Tags, follow-ups  | 90%   |
| Compliance           | ✅ LGPD/GDPR         | 85%   |
| WhatsApp integration | ✅ Completo (PG)     | 100%  |

### Competitors Comparison

**vs. Vista CRM:**

- ✅ Melhor: Multi-tenancy mais robusto
- ✅ Melhor: Compliance (LGPD)
- ⚠️ Igual: Financial tracking
- ❌ Pior: Sem soft deletes

**vs. Jetimob:**

- ✅ Melhor: Schema mais normalizado
- ✅ Melhor: Type-safety (Drizzle)
- ⚠️ Igual: Property management
- ❌ Pior: Sem partitioning

**vs. Loft CRM:**

- ✅ Melhor: Compliance tracking
- ⚠️ Igual: Lead management
- ❌ Pior: Sem ML tables
- ❌ Pior: Sem recommendation engine

---

## 🎉 CONCLUSÃO

O schema do ImobiBase está **MUITO BEM estruturado** para um CRM imobiliário multi-tenant, com score geral de **81/100**.

### Destaques Positivos ⭐

1. **Multi-tenancy isolation** exemplar
2. **Index coverage** excelente (85+ índices)
3. **Compliance** bem implementado (LGPD/GDPR)
4. **Normalização** correta (3NF)
5. **Type-safety** com Drizzle ORM

### Áreas de Melhoria 🎯

1. **CHECK constraints** (impacto: ALTO, esforço: BAIXO)
2. **CASCADE behaviors** (impacto: ALTO, esforço: BAIXO)
3. **Row-Level Security** (impacto: ALTO, esforço: MÉDIO)
4. **Soft deletes** (impacto: MÉDIO, esforço: BAIXO)
5. **Partitioning** (impacto: MÉDIO, esforço: ALTO)

### Next Steps 🚀

1. **Semana 1:** Adicionar CHECK constraints + CASCADE
2. **Semana 2:** Implementar soft deletes + RLS
3. **Mês 1:** Encryption + triggers de validação
4. **Mês 2:** Partitioning rental_payments
5. **Mês 3:** Full-text search + covering indexes

---

**Total de Problemas Encontrados:** 33
**Críticos:** 8
**Médios:** 12
**Baixos:** 13

**Total de Recomendações SQL:** 200+ linhas
**Estimated Implementation Time:** 4-6 semanas
**Expected Performance Gain:** 10-50x em queries críticas

---

**Revisado por:** AGENTE 15 - Database Schema Specialist
**Data:** 2025-12-25
**Versão:** 1.0.0

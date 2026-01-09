# AGENTE 15: IMPLEMENTATION CHECKLIST

**Data:** 2025-12-25
**Objetivo:** Aplicar melhorias críticas no database schema
**Prazo:** 1-2 semanas

---

## 📋 PRÉ-REQUISITOS

### Ambiente
- [ ] Backup completo do database
- [ ] Acesso ao PostgreSQL production
- [ ] Verificar versão do PostgreSQL (>= 13)
- [ ] Testar migrations em staging primeiro
- [ ] Alertar equipe sobre manutenção

### Ferramentas
- [ ] psql instalado
- [ ] Drizzle Kit atualizado
- [ ] Git para versionamento
- [ ] Monitoring configurado (Sentry/Datadog)

### Backup
```bash
# Backup completo
pg_dump $DATABASE_URL --format=custom --file=backup-$(date +%Y%m%d).dump

# Verificar backup
pg_restore --list backup-$(date +%Y%m%d).dump | head -20

# Upload para S3 (recomendado)
aws s3 cp backup-$(date +%Y%m%d).dump s3://imobibase-backups/
```

---

## 🚀 FASE 1: CRITICAL (Semana 1)

### Dia 1: CHECK Constraints

**Estimativa:** 4 horas

- [ ] **1.1 Review Migration**
  ```bash
  cat migrations/20241225_001_add_check_constraints.sql
  ```

- [ ] **1.2 Test em Staging**
  ```bash
  psql $STAGING_DATABASE_URL -f migrations/20241225_001_add_check_constraints.sql
  ```

- [ ] **1.3 Verificar Constraints**
  ```sql
  SELECT COUNT(*) FROM pg_constraint WHERE contype = 'c';
  -- Expected: 60+ constraints
  ```

- [ ] **1.4 Test Invalid Data**
  ```sql
  -- Should fail:
  INSERT INTO properties (id, tenant_id, title, type, category, price, address, city, state, status)
  VALUES (gen_random_uuid(), 'test', 'Test', 'apartamento', 'venda', -1000, 'Rua Test', 'SP', 'SP', 'available');
  ```

- [ ] **1.5 Apply to Production** (fora do horário de pico)
  ```bash
  psql $DATABASE_URL -f migrations/20241225_001_add_check_constraints.sql
  ```

- [ ] **1.6 Monitor Errors** (próximas 24h)
  - Check Sentry para constraint violations
  - Ajustar código se necessário

**Rollback (se necessário):**
```sql
-- Ver migration file para lista completa
ALTER TABLE properties DROP CONSTRAINT IF EXISTS chk_properties_status;
-- etc...
```

---

### Dia 2: CASCADE Behaviors

**Estimativa:** 6 horas

- [ ] **2.1 Review Migration**
  ```bash
  cat migrations/20241225_002_add_cascade_behaviors.sql
  ```

- [ ] **2.2 Understand Impact**
  - Deletar tenant = CASCADE tudo
  - Deletar property com contrato = RESTRICT
  - Deletar user = SET NULL assignments

- [ ] **2.3 Test em Staging**
  ```bash
  psql $STAGING_DATABASE_URL -f migrations/20241225_002_add_cascade_behaviors.sql
  ```

- [ ] **2.4 Test Cascades**
  ```sql
  -- Test tenant cascade
  DELETE FROM tenants WHERE id = 'test-tenant';
  -- Should cascade to all related tables

  -- Test property restrict
  DELETE FROM properties WHERE id = 'property-with-contract';
  -- Should fail with FK error

  -- Test user SET NULL
  DELETE FROM users WHERE id = 'user-123';
  -- Should unassign from leads/visits
  ```

- [ ] **2.5 Apply to Production**
  ```bash
  psql $DATABASE_URL -f migrations/20241225_002_add_cascade_behaviors.sql
  ```

- [ ] **2.6 Verify Foreign Keys**
  ```sql
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule,
    rc.update_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ORDER BY tc.table_name;
  ```

**Rollback:**
- Revert all FKs to NO ACTION (default)
- Use backup se necessário

---

### Dia 3: Unique Constraints

**Estimativa:** 4 horas

- [ ] **3.1 Review Migration**
  ```bash
  cat migrations/20241225_003_add_unique_constraints.sql
  ```

- [ ] **3.2 Check for Existing Duplicates**
  ```sql
  -- Check lead tag duplicates
  SELECT lead_id, tag_id, COUNT(*)
  FROM lead_tag_links
  GROUP BY lead_id, tag_id
  HAVING COUNT(*) > 1;

  -- Check payment duplicates
  SELECT rental_contract_id, reference_month, COUNT(*)
  FROM rental_payments
  GROUP BY rental_contract_id, reference_month
  HAVING COUNT(*) > 1;
  ```

- [ ] **3.3 Clean Duplicates** (se encontrados)
  ```sql
  -- Migration já faz isso automaticamente
  -- Mas revisar manualmente para garantir
  ```

- [ ] **3.4 Test em Staging**
  ```bash
  psql $STAGING_DATABASE_URL -f migrations/20241225_003_add_unique_constraints.sql
  ```

- [ ] **3.5 Test Duplicate Prevention**
  ```sql
  -- Should fail:
  INSERT INTO lead_tag_links (id, lead_id, tag_id) VALUES (gen_random_uuid(), 'lead-1', 'tag-1');
  INSERT INTO lead_tag_links (id, lead_id, tag_id) VALUES (gen_random_uuid(), 'lead-1', 'tag-1');
  ```

- [ ] **3.6 Apply to Production**
  ```bash
  psql $DATABASE_URL -f migrations/20241225_003_add_unique_constraints.sql
  ```

- [ ] **3.7 Verify Constraints**
  ```sql
  SELECT table_name, constraint_name, constraint_type
  FROM information_schema.table_constraints
  WHERE constraint_type = 'UNIQUE' AND table_schema = 'public'
  ORDER BY table_name;
  ```

**Rollback:**
```sql
ALTER TABLE lead_tag_links DROP CONSTRAINT IF EXISTS uq_lead_tag_links_lead_tag;
-- etc...
```

---

### Dia 4-5: Soft Deletes

**Estimativa:** 8 horas

- [ ] **4.1 Review Migration**
  ```bash
  cat migrations/20241225_004_add_soft_deletes.sql
  ```

- [ ] **4.2 Test em Staging**
  ```bash
  psql $STAGING_DATABASE_URL -f migrations/20241225_004_add_soft_deletes.sql
  ```

- [ ] **4.3 Test Soft Delete**
  ```sql
  -- Insert test record
  INSERT INTO properties (id, tenant_id, title, type, category, price, address, city, state)
  VALUES ('test-prop-123', 'test-tenant', 'Test Property', 'apartamento', 'venda', 100000, 'Rua Test', 'SP', 'SP');

  -- Soft delete
  UPDATE properties SET deleted_at = NOW() WHERE id = 'test-prop-123';

  -- Check it's hidden
  SELECT * FROM properties WHERE id = 'test-prop-123' AND deleted_at IS NULL;
  -- Should be empty

  -- Check view works
  SELECT * FROM properties_active WHERE id = 'test-prop-123';
  -- Should be empty

  -- Restore
  SELECT restore_soft_deleted('properties', 'test-prop-123');

  -- Verify restored
  SELECT * FROM properties WHERE id = 'test-prop-123' AND deleted_at IS NULL;
  -- Should show record
  ```

- [ ] **4.4 Apply to Production**
  ```bash
  psql $DATABASE_URL -f migrations/20241225_004_add_soft_deletes.sql
  ```

- [ ] **4.5 Update Drizzle Queries**
  ```typescript
  // Update all queries to filter deleted_at
  // Example:
  const activeProperties = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.tenantId, tenantId),
        isNull(properties.deletedAt) // Add this!
      )
    );
  ```

- [ ] **4.6 Test Application**
  - [ ] Properties list - should not show deleted
  - [ ] Leads list - should not show deleted
  - [ ] User admin - should have "restore" option
  - [ ] Soft delete API endpoint works

- [ ] **4.7 Schedule Cleanup Job**
  ```bash
  # Add to cron (daily at 3am)
  0 3 * * * psql $DATABASE_URL -c "SELECT * FROM cleanup_soft_deleted(90);"
  ```

**Rollback:**
```sql
ALTER TABLE properties DROP COLUMN IF EXISTS deleted_at;
-- etc...
DROP VIEW IF EXISTS properties_active CASCADE;
DROP FUNCTION IF EXISTS soft_delete() CASCADE;
```

---

### Dia 5: Fix interactions.tenant_id

**Estimativa:** 2 horas

- [ ] **5.1 Add Column**
  ```sql
  ALTER TABLE interactions
  ADD COLUMN tenant_id VARCHAR REFERENCES tenants(id);
  ```

- [ ] **5.2 Populate from Leads**
  ```sql
  UPDATE interactions
  SET tenant_id = (
    SELECT tenant_id FROM leads WHERE id = interactions.lead_id
  );
  ```

- [ ] **5.3 Verify No NULLs**
  ```sql
  SELECT COUNT(*) FROM interactions WHERE tenant_id IS NULL;
  -- Should be 0
  ```

- [ ] **5.4 Make NOT NULL**
  ```sql
  ALTER TABLE interactions
  ALTER COLUMN tenant_id SET NOT NULL;
  ```

- [ ] **5.5 Add Index**
  ```sql
  CREATE INDEX idx_interactions_tenant_id ON interactions(tenant_id);
  ```

- [ ] **5.6 Add to Performance Indexes**
  ```sql
  CREATE INDEX idx_interactions_tenant_lead
    ON interactions(tenant_id, lead_id);
  ```

**Rollback:**
```sql
ALTER TABLE interactions DROP COLUMN tenant_id;
```

---

## 🔍 VERIFICAÇÃO FINAL (Dia 6)

**Estimativa:** 4 horas

### Database Integrity

- [ ] **Check All Constraints**
  ```sql
  -- CHECK constraints
  SELECT COUNT(*) FROM pg_constraint WHERE contype = 'c';
  -- Expected: 60+

  -- UNIQUE constraints
  SELECT COUNT(*) FROM pg_constraint WHERE contype = 'u';
  -- Expected: 30+

  -- FOREIGN KEYS
  SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f';
  -- Expected: 100+
  ```

- [ ] **Check Soft Deletes**
  ```sql
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE column_name = 'deleted_at' AND table_schema = 'public'
  ORDER BY table_name;
  -- Expected: 12 tables
  ```

- [ ] **Check Indexes**
  ```sql
  SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
  -- Expected: 100+
  ```

### Performance Testing

- [ ] **Run Slow Query Tests**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM properties
  WHERE tenant_id = 'xxx' AND status = 'available' AND deleted_at IS NULL;
  -- Should use idx_properties_tenant_status
  ```

- [ ] **Check Query Plans**
  - Dashboard metrics query
  - Property search query
  - Payment overdue query
  - Lead kanban query

### Application Testing

- [ ] **Smoke Tests**
  - [ ] Login works
  - [ ] Dashboard loads
  - [ ] Properties list loads
  - [ ] Leads kanban loads
  - [ ] Create property works
  - [ ] Create lead works
  - [ ] Soft delete works
  - [ ] Restore works

- [ ] **Edge Cases**
  - [ ] Try to insert invalid status (should fail)
  - [ ] Try to insert negative price (should fail)
  - [ ] Try to duplicate tag link (should fail)
  - [ ] Try to delete property with contract (should fail)
  - [ ] Delete user should unassign leads (should succeed)

### Monitoring

- [ ] **Check Error Rates**
  - Sentry errors
  - Database errors
  - Slow queries

- [ ] **Check Performance**
  - Average query time
  - P95 query time
  - Database CPU
  - Database memory

---

## 📊 FASE 2: SECURITY (Semana 2-3)

**Estimativa:** 2 semanas

### Row-Level Security

- [ ] **7.1 Create RLS Migration**
- [ ] **7.2 Enable RLS on All Tables**
- [ ] **7.3 Create Policies**
- [ ] **7.4 Test Tenant Isolation**
- [ ] **7.5 Update Application Code**

### Encryption

- [ ] **8.1 Enable pgcrypto Extension**
- [ ] **8.2 Encrypt Sensitive Fields**
  - owners.cpf_cnpj
  - owners.bank_account
  - renters.cpf_cnpj
- [ ] **8.3 Create Decryption Views**
- [ ] **8.4 Update Application Queries**

### Audit Triggers

- [ ] **9.1 Create Audit Function**
- [ ] **9.2 Apply to Critical Tables**
- [ ] **9.3 Test Audit Log**

---

## 📈 FASE 3: PERFORMANCE (Mês 2)

**Estimativa:** 1 mês

### Full-Text Search

- [ ] **11.1 Add GIN Indexes**
- [ ] **11.2 Test Search Performance**

### Partitioning

- [ ] **13.1 Partition rental_payments**
- [ ] **13.2 Partition finance_entries**
- [ ] **13.3 Partition audit_logs**
- [ ] **13.4 Setup pg_partman**

---

## ✅ SUCCESS CRITERIA

### Data Integrity
- [ ] Zero constraint violations
- [ ] Zero duplicate records
- [ ] Zero data loss incidents
- [ ] 100% referential integrity

### Performance
- [ ] Dashboard < 500ms
- [ ] Property search < 150ms
- [ ] Lead kanban < 200ms
- [ ] Payment overdue < 50ms

### Security
- [ ] RLS enabled on all tables
- [ ] Sensitive fields encrypted
- [ ] All changes audited
- [ ] No data leakage incidents

### Monitoring
- [ ] Slow queries identified
- [ ] Database alerts configured
- [ ] Backup verified daily
- [ ] Recovery plan tested

---

## 🚨 ROLLBACK PLAN

### Emergency Rollback

**Se algo der MUITO errado:**

```bash
# 1. Restore backup completo
pg_restore --clean --if-exists --dbname=$DATABASE_URL backup-$(date +%Y%m%d).dump

# 2. Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM properties;"

# 3. Update application (revert code changes)
git revert HEAD
git push origin main

# 4. Restart application
# (Vercel/Railway auto-deploys)
```

### Partial Rollback

**Se apenas uma migration falhar:**

```bash
# Revert specific migration
psql $DATABASE_URL -f migrations/20241225_00X_rollback.sql

# Or manually:
psql $DATABASE_URL <<SQL
  -- Drop constraints
  ALTER TABLE properties DROP CONSTRAINT chk_properties_status;
  -- etc...
SQL
```

---

## 📞 SUPPORT & ESCALATION

### Contacts
- **DBA:** [Nome] - [Email]
- **DevOps:** [Nome] - [Email]
- **CTO:** [Nome] - [Email]

### Escalation Path
1. Check logs (Sentry, Datadog)
2. Check database metrics
3. Contact DBA
4. If critical: Rollback immediately
5. Post-mortem depois

---

## 📚 DOCUMENTATION

### Updated Docs
- [ ] `/docs/database/schema-overview.md`
- [ ] `/docs/database/migrations-guide.md`
- [ ] `/docs/database/soft-deletes-guide.md`
- [ ] `/docs/database/rls-guide.md`

### Team Communication
- [ ] Announce migrations in Slack
- [ ] Document breaking changes
- [ ] Update runbook
- [ ] Train team on soft deletes

---

## 🎉 POST-IMPLEMENTATION

### Week 1 After
- [ ] Monitor error rates daily
- [ ] Check slow queries
- [ ] Verify backups
- [ ] Collect metrics

### Week 2 After
- [ ] Review data quality
- [ ] Check constraint violations
- [ ] Optimize slow queries
- [ ] Plan next phase

### Month 1 After
- [ ] Performance review
- [ ] Security audit
- [ ] Cost analysis
- [ ] Team feedback

---

**Criado por:** AGENTE 15 - Database Schema Specialist
**Data:** 2025-12-25
**Versão:** 1.0.0
**Status:** ✅ READY TO USE

**BOA SORTE! 🚀**

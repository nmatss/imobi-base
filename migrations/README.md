# Database Migrations - ImobiBase

## Quick Start

### Apply Performance Indexes (CRITICAL - Do this first!)

```bash
# For PostgreSQL (Production/Supabase)
psql $DATABASE_URL -f migrations/add-performance-indexes.sql

# Or using npm script
npm run db:migrate:indexes
```

### Expected Results

✅ **85+ indexes added**
✅ **Query performance: 10-50x faster**
✅ **Dashboard load: 3-5s → 200-500ms**
✅ **Multi-tenant isolation optimized**

---

## Migration Files

| File | Description | Priority | Status |
|------|-------------|----------|--------|
| `add-performance-indexes.sql` | Critical performance indexes | 🔴 **URGENT** | ✅ Ready |
| `add-commissions-table.sql` | Commission tracking | 🟡 Medium | ✅ Applied |
| `add-seo-fields-to-brand-settings.sql` | SEO enhancements | 🟢 Low | ✅ Applied |

---

## Verification

After applying indexes, check their usage:

```sql
-- View index scan statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

-- Check unused indexes (consider removing if idx_scan = 0 after a week)
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY tablename, indexname;
```

### Check Database Size

```sql
-- Table and index sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_table_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size,
  ROUND(100.0 * pg_indexes_size(schemaname||'.'||tablename) /
    NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0), 2) AS index_pct
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Performance Testing

### Before Indexes

```sql
EXPLAIN ANALYZE
SELECT * FROM properties WHERE tenant_id = 'xxx' AND status = 'available';
-- Expected: Seq Scan, ~500-2000ms on 10k rows
```

### After Indexes

```sql
EXPLAIN ANALYZE
SELECT * FROM properties WHERE tenant_id = 'xxx' AND status = 'available';
-- Expected: Index Scan using idx_properties_tenant_status, ~10-50ms
```

---

## Rollback (if needed)

```sql
-- Drop all performance indexes
DROP INDEX IF EXISTS idx_users_tenant_id CASCADE;
DROP INDEX IF EXISTS idx_properties_tenant_id CASCADE;
-- ... (drop all indexes from migration file)

-- Or use this script to drop all indexes matching pattern
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || r.indexname || ' CASCADE';
  END LOOP;
END $$;
```

---

## Best Practices

### 1. **Apply in Off-Peak Hours**
Indexes are created `CONCURRENTLY` where possible to avoid locking tables.

### 2. **Monitor After Deployment**
Watch for slow queries using `pg_stat_statements`:

```sql
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_time DESC
LIMIT 10;
```

### 3. **Regular Index Maintenance**

```sql
-- Rebuild bloated indexes
REINDEX TABLE properties;

-- Analyze table statistics
ANALYZE properties;

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

### 4. **Connection Pooling**
With indexes in place, optimize your connection pool:

```typescript
// server/db.ts
const pool = new Pool({
  max: 20, // Vercel serverless: 20 connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Future Migrations

### Creating New Migrations

```bash
# Create migration file
touch migrations/$(date +%Y%m%d%H%M%S)-description.sql

# Example: Add full-text search
touch migrations/20241224120000-add-fulltext-search.sql
```

### Migration Template

```sql
-- ================================================================
-- MIGRATION: [Description]
-- Created: YYYY-MM-DD
-- Purpose: [Why this migration is needed]
-- Impact: [Performance/feature impact]
-- ================================================================

-- Migration logic here

-- Rollback instructions (commented)
-- DROP INDEX IF EXISTS ...;

-- ✅ Migration complete!
```

---

## Emergency: Performance Issues?

If you experience slow queries after deployment:

### 1. Check Query Plans
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
[YOUR SLOW QUERY];
```

### 2. Find Missing Indexes
```sql
-- Queries doing sequential scans
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_tuples
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;
```

### 3. Add Missing Index
```sql
CREATE INDEX CONCURRENTLY idx_[table]_[column]
  ON [table]([column]);
```

---

## Contact

For migration issues or questions:
- Check `/docs/database-optimization.md`
- Review query performance in production logs
- Monitor with Sentry database integration

---

**Last Updated:** 2024-12-24
**Version:** 1.0.0
**Indexes:** 85+
**Estimated Performance Gain:** 10-50x

#!/bin/bash
# ================================================================
# IMOBIBASE - Performance Testing Script
# Created: 2024-12-25
# Purpose: Test and benchmark backend performance
# ================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}ImobiBase - Performance Testing${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Test 1: Check indexes
echo -e "${YELLOW}Test 1: Checking database indexes...${NC}"
INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';")
echo -e "  Found indexes: ${BLUE}$INDEX_COUNT${NC}"

if [ "$INDEX_COUNT" -lt 80 ]; then
    echo -e "  ${YELLOW}⚠${NC}  Warning: Expected ~85 indexes, found $INDEX_COUNT"
    echo -e "  Run: ./scripts/apply-indexes.sh"
else
    echo -e "  ${GREEN}✓${NC} Indexes OK"
fi

# Test 2: Check critical indexes
echo ""
echo -e "${YELLOW}Test 2: Verifying critical indexes...${NC}"

CRITICAL_INDEXES=(
    "idx_properties_tenant_id"
    "idx_leads_tenant_id"
    "idx_rental_payments_tenant_id"
    "idx_properties_tenant_status_featured"
    "idx_leads_tenant_status_assigned"
)

MISSING=0
for idx in "${CRITICAL_INDEXES[@]}"; do
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = '$idx');")
    if [[ "$EXISTS" =~ "t" ]]; then
        echo -e "  ${GREEN}✓${NC} $idx"
    else
        echo -e "  ${RED}✗${NC} $idx (MISSING)"
        MISSING=$((MISSING + 1))
    fi
done

if [ "$MISSING" -gt 0 ]; then
    echo -e "${RED}Found $MISSING missing critical indexes!${NC}"
else
    echo -e "${GREEN}All critical indexes present${NC}"
fi

# Test 3: Query performance test
echo ""
echo -e "${YELLOW}Test 3: Testing query performance...${NC}"

# Test tenant query
echo -e "  Testing tenant query performance..."
TENANT_QUERY_TIME=$(psql "$DATABASE_URL" -c "EXPLAIN ANALYZE SELECT * FROM properties WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 10;" 2>&1 | grep "Execution Time" | awk '{print $3}')

if [ -n "$TENANT_QUERY_TIME" ]; then
    echo -e "  Execution time: ${BLUE}${TENANT_QUERY_TIME}ms${NC}"
    if (( $(echo "$TENANT_QUERY_TIME < 10" | bc -l) )); then
        echo -e "  ${GREEN}✓${NC} Excellent performance (<10ms)"
    elif (( $(echo "$TENANT_QUERY_TIME < 100" | bc -l) )); then
        echo -e "  ${GREEN}✓${NC} Good performance (<100ms)"
    else
        echo -e "  ${YELLOW}⚠${NC}  Slow query (>${TENANT_QUERY_TIME}ms)"
    fi
fi

# Test 4: Check Redis connection
echo ""
echo -e "${YELLOW}Test 4: Checking Redis cache...${NC}"

REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}

if command -v redis-cli &> /dev/null; then
    if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Redis is running and accessible"

        # Get Redis stats
        REDIS_KEYS=$(redis-cli -u "$REDIS_URL" DBSIZE | awk '{print $2}')
        REDIS_MEM=$(redis-cli -u "$REDIS_URL" INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')

        echo -e "  Cached keys: ${BLUE}$REDIS_KEYS${NC}"
        echo -e "  Memory usage: ${BLUE}$REDIS_MEM${NC}"
    else
        echo -e "  ${YELLOW}⚠${NC}  Redis not accessible"
        echo -e "  Cache will be disabled (app will still work)"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  redis-cli not installed"
    echo -e "  Install with: sudo apt-get install redis-tools"
fi

# Test 5: Table statistics
echo ""
echo -e "${YELLOW}Test 5: Database statistics...${NC}"

echo -e "  Table sizes:"
psql "$DATABASE_URL" -c "
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"

# Test 6: Index usage statistics
echo ""
echo -e "${YELLOW}Test 6: Index usage statistics...${NC}"

echo -e "  Most used indexes:"
psql "$DATABASE_URL" -c "
SELECT
  indexrelname AS index_name,
  idx_scan AS times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 10;
"

echo -e "  Unused indexes (may need optimization):"
UNUSED=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*) FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
  AND idx_scan = 0;
")
echo -e "  Unused: ${BLUE}$UNUSED${NC} indexes"

if [ "$UNUSED" -gt 10 ]; then
    echo -e "  ${YELLOW}⚠${NC}  Some indexes may not be used yet (normal for new indexes)"
fi

# Test 7: Connection statistics
echo ""
echo -e "${YELLOW}Test 7: Database connections...${NC}"

CONNECTIONS=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity;")
MAX_CONNECTIONS=$(psql "$DATABASE_URL" -t -c "SHOW max_connections;")

echo -e "  Active connections: ${BLUE}$CONNECTIONS${NC} / ${BLUE}$MAX_CONNECTIONS${NC}"

if [ "$CONNECTIONS" -gt $((MAX_CONNECTIONS * 80 / 100)) ]; then
    echo -e "  ${RED}⚠${NC}  High connection usage (>80%)"
else
    echo -e "  ${GREEN}✓${NC} Connection usage OK"
fi

# Final summary
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Performance Test Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Indexes: $INDEX_COUNT (expected: ~85)"
echo "Missing critical: $MISSING"
echo "Unused indexes: $UNUSED"
echo "Active connections: $CONNECTIONS / $MAX_CONNECTIONS"
echo ""

if [ "$MISSING" -eq 0 ] && [ "$INDEX_COUNT" -ge 80 ]; then
    echo -e "${GREEN}✓ Performance optimization looks good!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor query performance in production"
    echo "  2. Check cache hit rate with: curl /api/admin/cache-stats"
    echo "  3. Run ANALYZE periodically: psql \$DATABASE_URL -c 'ANALYZE;'"
else
    echo -e "${YELLOW}⚠ Some optimizations may be missing${NC}"
    echo ""
    echo "Recommended actions:"
    echo "  1. Apply indexes: ./scripts/apply-indexes.sh"
    echo "  2. Setup Redis cache"
    echo "  3. Re-run this test"
fi

echo ""

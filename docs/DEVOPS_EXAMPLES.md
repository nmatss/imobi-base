# DevOps Examples - Casos de Uso Práticos

Exemplos reais de como usar as ferramentas de DevOps implementadas pelo AGENTE 9.

---

## Exemplo 1: Criar e Aplicar Nova Migration

### Cenário
Você precisa adicionar um novo campo `verified` à tabela `properties` para indicar se um imóvel foi verificado pela equipe.

### Passo a Passo

**1. Criar arquivo de migration**:
```bash
cd /home/nic20/ProjetosWeb/ImobiBase
touch migrations/add-verified-field-to-properties.sql
```

**2. Escrever SQL**:
```sql
-- migrations/add-verified-field-to-properties.sql
-- Add verified field to properties table
-- Author: DevOps Team
-- Date: 2025-12-25

BEGIN;

-- Add column
ALTER TABLE properties
ADD COLUMN verified BOOLEAN DEFAULT false NOT NULL;

-- Add index for filtering
CREATE INDEX idx_properties_verified
ON properties(verified)
WHERE verified = true;

-- Add comment
COMMENT ON COLUMN properties.verified IS 'Indicates if property was verified by team';

COMMIT;
```

**3. Testar localmente**:
```bash
# Executar migration
DATABASE_URL="your_local_db" npm run db:migrate

# Verificar
psql $DATABASE_URL -c "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'properties' AND column_name = 'verified';
"

# Resultado esperado:
# column_name | data_type | is_nullable | column_default
# verified    | boolean   | NO          | false
```

**4. Testar rollback** (opcional):
```bash
# Rollback para testar
npm run db:migrate:rollback

# Verificar campo removido
psql $DATABASE_URL -c "
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'properties' AND column_name = 'verified';
"
# Deve retornar vazio

# Re-aplicar
npm run db:migrate
```

**5. Commit e deploy**:
```bash
git add migrations/add-verified-field-to-properties.sql
git commit -m "feat: Add verified field to properties table"
git push origin main

# GitHub Actions executará automaticamente:
# ✅ Build & Deploy
# ✅ Run migrations (incluindo a nova)
# ✅ Smoke tests
```

**6. Verificar em produção**:
```bash
# Após deploy, verificar
DATABASE_URL="$PRODUCTION_DATABASE_URL" psql -c "
  SELECT * FROM _migrations
  WHERE filename LIKE '%verified%'
  ORDER BY executed_at DESC
  LIMIT 1;
"

# Resultado:
# id | filename                                  | executed_at
# 5  | add-verified-field-to-properties.sql     | 2025-12-25 10:30:00
```

---

## Exemplo 2: Deploy com Migration que Falha

### Cenário
Você criou uma migration com erro de sintaxe. O CI/CD deve detectar e falhar o deploy.

### Simulação

**1. Criar migration com erro**:
```sql
-- migrations/broken-migration.sql
-- This will fail intentionally

ALTER TABLE properties
ADD COLUMN new_field INVALID_TYPE;  -- ❌ Tipo inválido
```

**2. Commit e push**:
```bash
git add migrations/broken-migration.sql
git commit -m "feat: Add broken migration (test)"
git push origin main
```

**3. GitHub Actions detecta erro**:
```
Workflow: deploy-production
Step: Run Database Migrations

Output:
  🔄 Starting database migrations...
  ✅ Database connection successful
  📋 Already executed: 5 migrations
  🚀 Running 1 pending migrations:

  ⏳ Executing: broken-migration.sql
     ❌ broken-migration.sql - FAILED
     Error: type "invalid_type" does not exist

  ❌ Migration failed!

❌ Error: Migration failed: broken-migration.sql

Step: Rollback Deployment on Migration Failure
  ❌ Migration failed! Deployment should be rolled back.

Deploy Status: FAILED ❌
```

**4. Resultado**:
- ✅ Deploy NÃO foi aplicado (rollback automático)
- ✅ Database permanece intacto
- ✅ Alerta enviado para equipe
- ✅ Produção continua estável

**5. Corrigir**:
```bash
# Remover migration quebrada
git rm migrations/broken-migration.sql

# Criar correta
cat > migrations/add-new-field-correctly.sql << 'EOF'
ALTER TABLE properties
ADD COLUMN new_field VARCHAR(255);
EOF

git add migrations/add-new-field-correctly.sql
git commit -m "fix: Correct migration syntax"
git push origin main

# Agora vai funcionar ✅
```

---

## Exemplo 3: Monitorar Downtime e Responder

### Cenário
UptimeRobot detecta que o site está fora do ar. Você recebe alerta no Slack.

### Alerta Recebido

```
🚨 [UptimeRobot Alert]

Monitor: ImobiBase - Health Check
Status: DOWN ⬇️
URL: https://imobibase.com/api/health
Duration: 2 minutes
Reason: Connection timeout

[View Status Page] [Acknowledge]
```

### Resposta - Passo a Passo

**1. Verificar manualmente (30 segundos)**:
```bash
# Testar health endpoint
curl -v https://imobibase.com/api/health

# Se timeout:
# * Trying 76.76.21.21:443...
# * connect to 76.76.21.21 port 443 failed: Connection timed out
# ❌ Failed to connect

# Testar homepage
curl -I https://imobibase.com

# Se também falhar, problema é sério
```

**2. Checar deploy recente (1 minuto)**:
```bash
# GitHub Actions
https://github.com/yourorg/imobibase/actions

# Último workflow:
# deploy-production - FAILED ❌ (5 minutes ago)
# Step: Health Check
# HTTP Status: 500

# Ah! Deploy falhou no health check
```

**3. Ver logs do Vercel (2 minutos)**:
```bash
# Vercel Dashboard → Deployments → Latest

Logs:
  Error: ECONNREFUSED - Could not connect to database
  at PostgresClient.connect
  ...

# Database connection issue!
```

**4. Checar Supabase (1 minuto)**:
```bash
# Supabase Dashboard → Database

Status: 🔴 Degraded Performance
Issue: Connection pool exhausted
Active connections: 100/100

# Ah! Database pool está cheio
```

**5. Solução rápida (2 minutos)**:
```bash
# Opção A: Restart database (arriscado)
# Supabase Dashboard → Restart Database

# Opção B: Rollback deploy
vercel rollback https://imobibase.com --token=$VERCEL_TOKEN

# Escolho B (mais seguro)

Output:
  ✅ Rolled back to previous deployment
  🔗 https://imobibase-abc123.vercel.app
  🚀 https://imobibase.com now serving previous version
```

**6. Validar (30 segundos)**:
```bash
curl https://imobibase.com/api/health

{
  "status": "ok",
  "timestamp": "2025-12-25T10:35:00.000Z",
  "database": "connected",
  "uptime": 12345
}

# ✅ Site voltou!
```

**7. Post-mortem (depois)**:
```markdown
# Incident Report - 2025-12-25

## Summary
Site was down for 8 minutes due to database connection pool exhaustion.

## Timeline
10:25 - Deploy started
10:27 - Health check failed
10:27 - UptimeRobot alerted
10:28 - Team started investigation
10:32 - Root cause identified (DB pool)
10:33 - Rollback initiated
10:35 - Site restored

## Root Cause
New code was creating database connections without properly closing them.

## Action Items
- [ ] Add connection pool monitoring
- [ ] Implement connection leak detection
- [ ] Add DB pool size to health check response
- [ ] Review code for proper connection cleanup

## MTTR
8 minutes ✅ (target: < 15 min)
```

**Total time**: ~8 minutos da detecção até resolução ✅

---

## Exemplo 4: Configurar Novo Alert no Sentry

### Cenário
Você quer ser alertado quando muitos usuários reportam erro 500 no endpoint de criação de propriedades.

### Configuração

**1. Criar alert rule no Sentry**:
```
Sentry Dashboard → Alerts → Create Alert Rule

Alert Rule Type: Issues

Conditions:
  When: an event is captured
  If: ALL of the conditions are met
    - The issue's tags match: http.status_code equals 500
    - The issue's tags match: endpoint equals /api/properties
    - The issue is seen more than 5 times in 5 minutes

Actions:
  - Send a notification to #backend-alerts (Slack)
  - Send a notification via email to backend-team@yourcompany.com
  - Assign to Backend Team
  - Add tags: critical, property-creation

Environment: production
Action Interval: 10 minutes (don't re-alert)
```

**2. Adicionar context no código**:
```typescript
// server/routes.ts

app.post("/api/properties", async (req, res) => {
  const transaction = Sentry.startTransaction({
    op: "http.server",
    name: "POST /api/properties",
  });

  Sentry.setTag("endpoint", "/api/properties");
  Sentry.setTag("method", "POST");

  try {
    // Validação
    const data = await validatePropertyData(req.body);

    // Criar propriedade
    const property = await db.insert(properties).values({
      ...data,
      tenantId: req.user!.tenantId,
    });

    transaction.setStatus("ok");
    res.json(property);

  } catch (error) {
    transaction.setStatus("internal_error");

    Sentry.setContext("property_data", {
      type: req.body.type,
      price: req.body.price,
      hasImages: !!req.body.images,
    });

    Sentry.setTag("http.status_code", "500");
    Sentry.captureException(error);

    res.status(500).json({
      error: "Failed to create property"
    });

  } finally {
    transaction.finish();
  }
});
```

**3. Testar o alerta**:
```bash
# Simular 6 erros em 2 minutos
for i in {1..6}; do
  curl -X POST https://imobibase.com/api/properties \
    -H "Content-Type: application/json" \
    -d '{"invalid": "data"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 20
done

# Após 5º erro (em ~2 min):
# Slack #backend-alerts recebe:
```

**Alerta no Slack**:
```
🚨 [Sentry Alert] High Error Rate

Issue: ValidationError: Property data is invalid
Endpoint: POST /api/properties
HTTP Status: 500
First Seen: 2 minutes ago
Event Count: 6 events in 2 minutes
Affected Users: 3 users
Environment: production

Context:
  • type: apartment
  • price: undefined (missing!)
  • hasImages: false

[View in Sentry] [View Stack Trace] [Assign to Backend]

Assigned to: Backend Team
Tags: critical, property-creation
```

**4. Resultado**:
- ✅ Equipe alertada em < 5 minutos
- ✅ Context rico para debug
- ✅ Auto-assignment para time correto
- ✅ Não alertar novamente por 10 minutos

---

## Exemplo 5: Smoke Tests Detectam Bug

### Cenário
Você fez deploy de nova feature, mas smoke tests detectam que login está quebrado.

### Deploy

```bash
git push origin main

# GitHub Actions executando...
```

### Workflow Execution

```
✅ Checkout code
✅ Setup Node.js
✅ Install Vercel CLI
✅ Pull Vercel Environment
✅ Build Project Artifacts
✅ Deploy to Vercel Production
   Deploy URL: https://imobibase-xyz.vercel.app
✅ Install Dependencies
✅ Run Database Migrations
   ✅ Migrations complete (0 pending)
✅ Notify Sentry of Deployment
✅ Health Check
   ✅ Health check passed! (HTTP 200)

Running: smoke-tests
  ✅ Checkout code
  ✅ Setup Node.js
  ✅ Install dependencies
  ✅ Install Playwright browsers

  Running: Run smoke tests
    ✅ application loads successfully (2.3s)
    ❌ user can login (5.1s)

       Error: Timeout 5000ms exceeded
       locator.click(selector='[data-testid="login-button"]')
       Button was found but not clickable

       Screenshot: test-results/smoke-login-failure.png

    ⏭️  dashboard loads with data (skipped - depends on login)
    ⏭️  can create property (skipped - depends on login)

❌ Smoke tests FAILED (1/15 tests failed)

Step: Notify on test failure
  ::error::❌ Smoke tests failed! Production deployment may have issues.
```

### Investigação

**1. Ver screenshot**:
```bash
# GitHub Actions → smoke-tests → Artifacts
# Download: smoke-test-results.zip

# Extrair e ver:
test-results/smoke-login-failure.png

# Screenshot mostra:
# Login button está coberto por modal de cookies!
```

**2. Identificar problema**:
```typescript
// Nova feature adicionou modal de cookies
// Mas esqueceu de adicionar data-testid
// E modal bloqueia interação com login button

// client/src/components/CookieConsent.tsx
<Dialog open={showCookies}>
  {/* ❌ Modal sem data-testid */}
  {/* ❌ Modal aparece sobre login */}
  <DialogContent>
    <p>We use cookies...</p>
    <Button>Accept</Button>
  </DialogContent>
</Dialog>
```

**3. Fix rápido**:
```typescript
// client/src/components/CookieConsent.tsx
<Dialog open={showCookies}>
  <DialogContent data-testid="cookie-consent-modal">
    <p>We use cookies...</p>
    <Button
      onClick={handleAccept}
      data-testid="accept-cookies"
    >
      Accept
    </Button>
  </DialogContent>
</Dialog>

// tests/e2e/smoke.spec.ts
test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // ✅ Handle cookie consent if present
  const cookieModal = page.locator('[data-testid="cookie-consent-modal"]');
  if (await cookieModal.isVisible()) {
    await page.click('[data-testid="accept-cookies"]');
  }

  await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);
  await expect(page).toHaveURL(/\/dashboard/);
});
```

**4. Re-deploy**:
```bash
git add client/src/components/CookieConsent.tsx tests/e2e/smoke.spec.ts
git commit -m "fix: Cookie consent blocking login in tests"
git push origin main

# Agora smoke tests passam ✅
```

**5. Resultado**:
- ✅ Bug detectado ANTES de afetar usuários
- ✅ Deploy bloqueado até fix
- ✅ Produção permanece estável
- ✅ Screenshot ajudou no debug

---

## Exemplo 6: Performance Alert - p95 Response Time

### Cenário
Sentry alerta que o p95 do endpoint de listagem de propriedades está > 2s.

### Alerta Recebido

```
⚠️  [Sentry Performance Alert]

Alert: p95 Response Time > 2s
Metric: p95(transaction.duration) = 2.456s
Transaction: GET /api/properties
Environment: production
Window: Last 10 minutes

Threshold: > 2000ms
Current value: 2456ms (23% over threshold)

[View in Sentry] [View Dashboard]
```

### Investigação

**1. Ver traces no Sentry**:
```
Sentry → Performance → Transactions → GET /api/properties

Recent Transactions (sorted by duration):
  3.2s - user@example.com - 50 properties loaded
  2.9s - user2@example.com - 45 properties loaded
  2.7s - user3@example.com - 30 properties loaded

Breakdown:
  HTTP Server: 3.2s total
    ├─ Middleware: 0.1s
    ├─ Auth: 0.05s
    └─ Database Query: 2.8s ⚠️  (87% of time!)
        └─ SELECT * FROM properties WHERE tenant_id = ?
            AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 50
```

**2. Identificar problema**:
```sql
-- Query lenta identificada
SELECT * FROM properties
WHERE tenant_id = ?
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 50;

-- Faltando índice composto!
```

**3. Criar migration de fix**:
```sql
-- migrations/add-properties-performance-index.sql
-- Fix slow query on GET /api/properties
-- Add composite index for tenant + status + created_at

BEGIN;

-- Index composto para query comum
CREATE INDEX CONCURRENTLY idx_properties_tenant_status_created
ON properties(tenant_id, status, created_at DESC)
WHERE status = 'active';

-- Permitir que index seja criado sem bloquear tabela
-- CONCURRENTLY = não bloqueia writes

COMMENT ON INDEX idx_properties_tenant_status_created
IS 'Performance optimization for GET /api/properties - covers tenant_id, status, created_at';

COMMIT;
```

**4. Aplicar migration**:
```bash
# Testar localmente primeiro
npm run db:migrate

# Verificar performance local
psql $DATABASE_URL -c "
  EXPLAIN ANALYZE
  SELECT * FROM properties
  WHERE tenant_id = 1
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 50;
"

# Antes:
# Planning Time: 0.5ms
# Execution Time: 2800ms  ❌

# Depois (com índice):
# Planning Time: 0.3ms
# Execution Time: 12ms    ✅ (233x mais rápido!)

# Deploy
git add migrations/add-properties-performance-index.sql
git commit -m "perf: Add composite index for properties listing"
git push origin main
```

**5. Validar melhoria**:
```bash
# Após deploy, monitorar Sentry

# Sentry → Performance → Transactions → GET /api/properties

Recent Transactions:
  245ms - user@example.com - 50 properties  ✅
  198ms - user2@example.com - 45 properties ✅
  156ms - user3@example.com - 30 properties ✅

p95: 289ms (was 2456ms) ✅
Improvement: 88% faster! 🎉
```

**6. Resultado**:
- ✅ Performance melhorou 88%
- ✅ Alert parou de disparar
- ✅ Usuários têm experiência mais rápida
- ✅ Database load reduzida

---

## Exemplo 7: Criar Status Page Público

### Cenário
Criar página de status público para que usuários vejam saúde do sistema.

### Setup

**1. UptimeRobot Status Page**:
```
UptimeRobot Dashboard → Status Pages → Create Status Page

Configuration:
  ✅ Page Name: ImobiBase Status
  ✅ Custom URL: status.imobibase.com
  ✅ Monitors to show:
     - Health Check
     - Homepage
     - Properties API
     - Public Properties
     - Database Health

  ✅ Show:
     - Overall uptime %
     - Last 90 days history
     - Current status
     - Incident timeline

  ✅ Custom domain: Yes
     DNS: CNAME status.imobibase.com → stats.uptimerobot.com

  ✅ Design:
     - Logo: Upload ImobiBase logo
     - Colors: Match brand (#0066CC)
     - Custom CSS: Yes
```

**2. Custom CSS**:
```css
/* UptimeRobot Status Page Custom CSS */

:root {
  --primary-color: #0066CC;
  --success-color: #00A651;
  --warning-color: #FFA500;
  --error-color: #DC3545;
}

.page-header {
  background: linear-gradient(135deg, var(--primary-color), #0052A3);
  padding: 2rem;
}

.monitor-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
}

.uptime-badge {
  font-weight: bold;
  font-size: 1.2rem;
}
```

**3. Adicionar link no site**:
```typescript
// client/src/components/layout/footer.tsx

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container py-8">
        <div className="grid grid-cols-4 gap-8">
          {/* Outras colunas... */}

          <div>
            <h3 className="font-semibold mb-4">Status</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://status.imobibase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  System Status
                </a>
              </li>
              <li>
                <a href="/api/health">API Health</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

**4. Resultado**:

Visitantes de `https://status.imobibase.com` veem:

```
╔════════════════════════════════════════════════╗
║  ImobiBase - System Status                    ║
║  All Systems Operational ✅                   ║
╚════════════════════════════════════════════════╝

┌──────────────────────────────────────────────┐
│ Overall Uptime                                │
│ 99.97% (Last 30 days)                         │
└──────────────────────────────────────────────┘

Services Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Health Check          Operational (99.98%)
✅ Homepage              Operational (99.96%)
✅ Properties API        Operational (99.95%)
✅ Public Properties     Operational (99.97%)
✅ Database              Operational (99.99%)

Recent Incidents:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dec 20, 2025 - Database Timeout
Duration: 8 minutes
Status: Resolved ✅
Root cause: Connection pool exhausted
Fix: Increased pool size

Dec 15, 2025 - Planned Maintenance
Duration: 15 minutes
Status: Completed ✅
Description: Database upgrade to v15

[Subscribe to Updates] [RSS Feed]
```

---

## Exemplo 8: Automatic Rollback on Critical Error

### Cenário
Deploy introduz bug crítico. Sentry detecta spike de erros fatais e triggera rollback automático.

**Nota**: Este exemplo requer configuração avançada de webhook.

### Setup

**1. Criar webhook endpoint**:
```typescript
// server/routes-webhooks.ts

import { Router } from 'express';
import { execSync } from 'child_process';

const router = Router();

router.post('/webhooks/sentry-critical', async (req, res) => {
  const { data } = req.body;

  // Verificar se é erro fatal
  if (data.level === 'fatal' && data.event.count > 10) {
    console.error('🚨 CRITICAL ERROR DETECTED - Auto-rollback triggered');

    // Log para auditoria
    await db.insert(incidents).values({
      type: 'auto-rollback',
      severity: 'critical',
      reason: `Fatal error spike: ${data.event.title}`,
      triggeredBy: 'sentry-webhook',
      triggeredAt: new Date(),
    });

    // Trigger rollback via Vercel API
    try {
      const response = await fetch(
        `https://api.vercel.com/v13/deployments/${process.env.VERCEL_DEPLOYMENT_ID}/rollback`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
          },
        }
      );

      if (response.ok) {
        console.log('✅ Rollback successful');

        // Notificar equipe
        await notifySlack('#incidents', {
          text: '🚨 CRITICAL: Auto-rollback triggered',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Auto-rollback triggered*\n\nReason: Fatal error spike (${data.event.count} events)\nError: ${data.event.title}\nStatus: Rollback completed ✅`,
            },
          }],
        });
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
    }
  }

  res.json({ received: true });
});

export default router;
```

**2. Configurar webhook no Sentry**:
```
Sentry → Settings → Integrations → Internal Integrations

Create Integration:
  Name: Auto-Rollback
  Webhook URL: https://imobibase.com/webhooks/sentry-critical
  Permissions:
    - Issue & Event: Read
  Subscribe to:
    - issue.created

Alert Rule:
  When: an event is captured
  If: level equals fatal
    AND event count > 10 in 1 minute
  Then: Send webhook to Auto-Rollback integration
```

**3. Teste** (simulado):
```bash
# Simular 15 erros fatais
for i in {1..15}; do
  curl -X POST https://imobibase.com/api/test-fatal-error
done

# Após 10º erro:
# Sentry → Webhook triggered
# Webhook → Auto-rollback initiated
# Vercel → Previous deployment promoted
# Slack → Team notified

# Resultado:
# ✅ Site rolled back in < 2 minutes
# ✅ Team alerted
# ✅ Incident logged
```

---

## Resumo dos Exemplos

| Exemplo | Problema | Solução | Tempo | Ferramenta |
|---------|----------|---------|-------|------------|
| 1 | Adicionar campo | Migration automática | 5 min | db:migrate |
| 2 | Migration quebrada | Deploy bloqueado | 0 min | CI/CD + rollback |
| 3 | Site down | Rollback manual | 8 min | UptimeRobot + Vercel |
| 4 | Erros no endpoint | Alert configurado | 2 min | Sentry |
| 5 | Bug no login | Smoke tests detectam | 0 min | Playwright |
| 6 | Query lenta | Index adicionado | 10 min | Sentry Performance |
| 7 | Falta status page | Status criado | 30 min | UptimeRobot |
| 8 | Erro fatal | Rollback auto | <2 min | Sentry Webhook |

---

**Última atualização**: 2025-12-25
**Autor**: AGENTE 9 - DevOps Excellence

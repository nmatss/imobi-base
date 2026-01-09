# AGENTE 9 - Implementation Checklist

Checklist passo-a-passo para implementar todas as melhorias de DevOps.

---

## Fase 1: Preparação (30 minutos)

### 1.1 Review de Documentação

- [ ] Ler `AGENT_9_QUICK_START.md`
- [ ] Ler `docs/GITHUB_SECRETS_SETUP.md`
- [ ] Ler `docs/UPTIME_MONITORING.md`
- [ ] Ler `docs/SENTRY_ALERTS_SETUP.md`

### 1.2 Verificar Arquivos Criados

```bash
cd /home/nic20/ProjetosWeb/ImobiBase

# Verificar scripts
ls -la script/migrate.ts                    # ✅ Deve existir

# Verificar documentação
ls -la docs/GITHUB_SECRETS_SETUP.md         # ✅ Deve existir
ls -la docs/UPTIME_MONITORING.md            # ✅ Deve existir
ls -la docs/SENTRY_ALERTS_SETUP.md          # ✅ Deve existir

# Verificar workflow
cat .github/workflows/deploy-production.yml | grep "npm run db:migrate"
# ✅ Deve mostrar linha com db:migrate descomentada

# Verificar package.json
cat package.json | grep "test:smoke"
# ✅ Deve mostrar script test:smoke
```

---

## Fase 2: GitHub Secrets (1 hora)

### 2.1 Secrets Críticos (OBRIGATÓRIOS)

**Vercel**:
- [ ] `VERCEL_TOKEN`
  - Ir para: https://vercel.com/account/tokens
  - Criar token: "GitHub Actions - ImobiBase"
  - Copiar e adicionar no GitHub
  - Testar: `vercel whoami --token YOUR_TOKEN`

**Database**:
- [ ] `DATABASE_URL`
  - Supabase → Settings → Database → Connection string
  - Copiar "Connection Pooling" (porta 6543)
  - Adicionar no GitHub
  - Testar: `psql "YOUR_URL" -c "SELECT NOW();"`

**Sentry**:
- [ ] `SENTRY_DSN`
  - Sentry → Settings → Projects → Client Keys
  - Copiar DSN
  - Adicionar no GitHub

- [ ] `SENTRY_ORG`
  - Sentry → Settings → General Settings
  - Copiar "Organization Slug"
  - Adicionar no GitHub

- [ ] `SENTRY_AUTH_TOKEN`
  - Sentry → Settings → Account → API → Auth Tokens
  - Criar token com scopes: org:read, project:read, project:releases
  - Copiar e adicionar no GitHub
  - Testar: `curl -H "Authorization: Bearer TOKEN" https://sentry.io/api/0/`

### 2.2 Secrets Opcionais

**Email** (escolher um):
- [ ] `SENDGRID_API_KEY` OU `RESEND_API_KEY`
  - Ver docs/GITHUB_SECRETS_SETUP.md
  - Adicionar no GitHub

**Maps**:
- [ ] `GOOGLE_MAPS_API_KEY`
  - Google Cloud Console → APIs & Services
  - Ver docs/GITHUB_SECRETS_SETUP.md

**Redis**:
- [ ] `REDIS_URL`
  - Upstash Console → Create database
  - Copiar Redis URL
  - Adicionar no GitHub

### 2.3 Validar Secrets

```bash
# No GitHub
# Repository → Settings → Secrets and variables → Actions

# Verificar secrets configurados:
# ✅ VERCEL_TOKEN
# ✅ DATABASE_URL
# ✅ SENTRY_DSN
# ✅ SENTRY_ORG
# ✅ SENTRY_AUTH_TOKEN
# ⚠️  Email service (um dos dois)
# ⚠️  Outros opcionais
```

---

## Fase 3: UptimeRobot Setup (30 minutos)

### 3.1 Criar Conta

- [ ] Ir para https://uptimerobot.com
- [ ] Sign up (FREE plan - 50 monitors)
- [ ] Verificar email
- [ ] Login

### 3.2 Adicionar Monitores

**Monitor 1: Health Check**:
```
Dashboard → Add New Monitor

Monitor Type: HTTP(s)
Friendly Name: ImobiBase - Health Check
URL: https://imobibase.com/api/health
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
HTTP Method: GET

Alert When Down For: 2 minutes

Click: Create Monitor
```

- [ ] Health Check configurado

**Monitor 2: Homepage**:
```
Friendly Name: ImobiBase - Homepage
URL: https://imobibase.com
Interval: 5 minutes
```

- [ ] Homepage configurado

**Monitor 3: Properties API**:
```
Friendly Name: ImobiBase - Properties API
URL: https://imobibase.com/api/properties?limit=1
Interval: 5 minutes
```

- [ ] Properties API configurado

**Monitor 4: Public Properties**:
```
Friendly Name: ImobiBase - Public Properties
URL: https://imobibase.com/public/properties
Interval: 5 minutes
```

- [ ] Public Properties configurado

**Monitor 5: Database Health**:
```
Friendly Name: ImobiBase - Database Health
URL: https://imobibase.com/api/health
Interval: 5 minutes
Alert Keywords: Must contain "database":"connected"
```

- [ ] Database Health configurado

**Monitor 6: Login Page**:
```
Friendly Name: ImobiBase - Login Page
URL: https://imobibase.com/login
Interval: 10 minutes
```

- [ ] Login Page configurado

**Monitor 7: Static Assets**:
```
Friendly Name: ImobiBase - Static Assets
URL: https://imobibase.com/assets/logo.png
Interval: 15 minutes
```

- [ ] Static Assets configurado

### 3.3 Configurar Alertas

**Email Alert**:
```
My Settings → Alert Contacts → Add Alert Contact

Type: E-mail
Email: devops@yourcompany.com
Friendly Name: DevOps Team

Alert When: Down & Up
```

- [ ] Email alert configurado

**Slack Alert** (opcional):
```
Type: Slack
Webhook URL: https://hooks.slack.com/services/YOUR/WEBHOOK
Channel: #alerts

Criar webhook:
  Slack → Apps → Add apps → Incoming Webhooks
  Create webhook for #alerts channel
  Copy URL
```

- [ ] Slack alert configurado (se aplicável)

### 3.4 Criar Status Page

```
Dashboard → Status Pages → Add Status Page

Page Name: ImobiBase Status
Custom URL: (subdomain).uptimerobot.com
Select monitors: (todos os 7 criados)

Show:
  ✅ Overall uptime percentage
  ✅ Last 90 days history
  ✅ Current status

Customize Design:
  - Upload logo
  - Set brand colors

Create Page
```

- [ ] Status page criada
- [ ] URL anotada: ___________________

### 3.5 Testar Sistema

```bash
# Simular downtime (teste rápido)
# Opção: Pausar monitor temporariamente

UptimeRobot → Monitor → Actions → Pause

# Aguardar 2 minutos
# ✅ Deve receber alerta por email
# ✅ Status page deve mostrar "DOWN"

# Unpause
Actions → Resume

# Aguardar 2 minutos
# ✅ Deve receber "UP" notification
```

- [ ] Teste de alerta realizado
- [ ] Email recebido
- [ ] Status page atualizada

---

## Fase 4: Sentry Alerts (1 hora)

### 4.1 Verificar Projeto Sentry

- [ ] Projeto "imobibase" existe em sentry.io
- [ ] DSN configurado no código
- [ ] Erros sendo capturados

**Teste rápido**:
```bash
# Visitar página de erro
curl https://imobibase.com/api/non-existent-route

# Verificar Sentry
# Dashboard → Issues
# ✅ Deve aparecer erro "404 Not Found"
```

### 4.2 Configurar Alert Rules

**Alert 1: High Error Rate**:
```
Sentry → Alerts → Create Alert Rule

Alert Name: [Production] High Error Rate
When: an event is captured
If: ALL of
  - The event's level equals error
  - The issue is seen more than 10 times in 1 minute
  - The event's environment equals production
Then:
  - Send notification to #alerts (Slack)
  - Send notification via email to devops@yourcompany.com

Action Interval: 15 minutes
```

- [ ] High Error Rate configurado

**Alert 2: New Error**:
```
Alert Name: [Production] New Error Detected
When: a new issue is created
If: ALL of
  - The issue's level equals error OR fatal
  - Environment equals production
Then:
  - Send notification to #errors (Slack)
```

- [ ] New Error configurado

**Alert 3: Performance Degradation**:
```
Alert Name: [Production] p95 Response Time > 2s
When: A metric aggregation
  Metric: p95(transaction.duration)
  Threshold: > 2000 (milliseconds)
  Time window: 10 minutes
  Filter: environment:production
Then:
  - Send notification to #performance (Slack)
```

- [ ] Performance alert configurado

**Alert 4: Database Slow**:
```
Alert Name: [Production] Slow Database Queries
When: A metric aggregation
  Metric: p95(spans.db.duration)
  Threshold: > 1000 (milliseconds)
  Filter: span.op:db.query AND environment:production
Then:
  - Send notification to #database (Slack)
```

- [ ] Database alert configurado

**Alert 5: Fatal Error**:
```
Alert Name: [Production] CRITICAL - Fatal Error
When: an event is captured
If:
  - The issue's level equals fatal
  - Environment equals production
Then:
  - Send notification to #critical-alerts (Slack) [@channel]
  - Send email to executives@yourcompany.com

Action Interval: Immediately (no throttling)
```

- [ ] Fatal error alert configurado

### 4.3 Integrar com Slack

```
Sentry → Settings → Integrations → Slack

Add to Slack → Authorize

Configure Alert Actions:
  #alerts → High Error Rate, General alerts
  #errors → New errors
  #performance → Performance issues
  #database → Database issues
  #critical-alerts → Fatal errors
```

- [ ] Slack integration configurada
- [ ] Channels mapeados

### 4.4 Criar Dashboard

```
Sentry → Dashboards → Create Dashboard

Name: Production Health

Add Widgets:
  1. Error Rate (Line Chart)
     Query: count()
     Filter: level:error
     Last: 24 hours

  2. p95 Response Time (Line Chart)
     Query: p95(transaction.duration)
     Filter: transaction.op:http.server

  3. Top Errors (Table)
     Query: count()
     Group by: title
     Order: count DESC
     Limit: 10

  4. Affected Users (Number)
     Query: count_unique(user)
     Filter: level:error

Save Dashboard
```

- [ ] Dashboard criado
- [ ] Widgets configurados

### 4.5 Testar Alertas

```bash
# Criar endpoint de teste (REMOVER DEPOIS!)
# server/index.ts

app.get('/api/test-sentry-alert', (req, res) => {
  for (let i = 0; i < 12; i++) {
    Sentry.captureException(new Error('Test alert - please ignore'));
  }
  res.json({ sent: 12 });
});

# Testar
curl https://imobibase.com/api/test-sentry-alert

# Aguardar 1-2 minutos
# ✅ Deve receber alerta no Slack #alerts
# ✅ Deve receber email
```

- [ ] Teste de alert realizado
- [ ] Alerta recebido
- [ ] Endpoint de teste REMOVIDO

---

## Fase 5: Database Migrations (30 minutos)

### 5.1 Testar Localmente

```bash
cd /home/nic20/ProjetosWeb/ImobiBase

# Verificar script existe
cat script/migrate.ts | head -20

# Verificar npm script
npm run db:migrate --help

# Executar migrations localmente
DATABASE_URL="postgresql://local..." npm run db:migrate

# Verificar tracking table
psql $DATABASE_URL -c "SELECT * FROM _migrations ORDER BY executed_at;"
```

- [ ] Script de migration testado localmente
- [ ] Tabela `_migrations` criada
- [ ] Migrations existentes aplicadas

### 5.2 Criar Migration de Teste

```bash
# Criar migration simples
cat > migrations/test-agent9-setup.sql << 'EOF'
-- Test migration by AGENTE 9
-- This can be removed after validation

-- Create test table
CREATE TABLE IF NOT EXISTS _agent9_test (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message VARCHAR(255)
);

-- Insert test record
INSERT INTO _agent9_test (message)
VALUES ('AGENTE 9 setup validated successfully!');

-- Clean up
DROP TABLE _agent9_test;
EOF

# Executar
npm run db:migrate

# Verificar na tabela _migrations
psql $DATABASE_URL -c "
  SELECT filename, executed_at
  FROM _migrations
  WHERE filename = 'test-agent9-setup.sql';
"
```

- [ ] Migration de teste criada
- [ ] Executada com sucesso
- [ ] Registrada em `_migrations`

### 5.3 Testar Rollback

```bash
# Rollback da migration de teste
npm run db:migrate:rollback

# Verificar foi removida
psql $DATABASE_URL -c "
  SELECT COUNT(*)
  FROM _migrations
  WHERE filename = 'test-agent9-setup.sql';
"
# ✅ Deve retornar 0

# Re-aplicar (para CI/CD encontrar ela)
npm run db:migrate
```

- [ ] Rollback testado
- [ ] Re-aplicação funciona

### 5.4 Validar CI/CD

```bash
# Commit migration de teste
git add migrations/test-agent9-setup.sql
git commit -m "test: Validate AGENTE 9 migration setup"
git push origin main

# Monitorar GitHub Actions
# Actions → deploy-production → Run Database Migrations

# ✅ Step deve executar sem erros
# ✅ Logs devem mostrar migration aplicada
```

- [ ] CI/CD executa migrations
- [ ] Logs mostram sucesso
- [ ] Workflow completo passa

---

## Fase 6: Smoke Tests (30 minutos)

### 6.1 Verificar Testes Existentes

```bash
# Ver smoke tests
cat tests/e2e/smoke.spec.ts | grep "test("

# Verificar package.json
npm run test:smoke --help
```

- [ ] 15 smoke tests identificados
- [ ] Script npm configurado

### 6.2 Executar Localmente

```bash
# Instalar Playwright (se necessário)
npx playwright install --with-deps chromium

# Executar smoke tests
npm run test:smoke

# Ver relatório
npx playwright show-report
```

- [ ] Playwright instalado
- [ ] Smoke tests executados
- [ ] Todos passaram (ou issues identificados e corrigidos)

### 6.3 Validar no CI/CD

```bash
# Criar commit simples
git commit --allow-empty -m "test: Trigger smoke tests in CI/CD"
git push origin main

# Monitorar GitHub Actions
# Actions → deploy-production → smoke-tests job

# Verificar:
# ✅ Job executa após deploy
# ✅ Playwright instalado
# ✅ Testes executam
# ✅ Resultados uploadados
```

- [ ] Smoke tests executam no CI/CD
- [ ] Artifacts gerados
- [ ] Falhas bloqueiam deploy (testar com teste falhando)

### 6.4 Testar Falha

```bash
# Modificar teste para falhar propositalmente
# tests/e2e/smoke.spec.ts

test('application loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/THIS_WILL_FAIL/); // ❌ Título errado
});

# Commit
git add tests/e2e/smoke.spec.ts
git commit -m "test: Force smoke test failure"
git push origin main

# Verificar GitHub Actions
# ✅ smoke-tests job deve FALHAR
# ✅ Workflow status: FAILED
# ✅ Notificação de erro clara

# Reverter
git revert HEAD
git push origin main
```

- [ ] Falha em smoke test bloqueia workflow
- [ ] Notificação clara do erro
- [ ] Revertido e funcionando novamente

---

## Fase 7: Validação Final (30 minutos)

### 7.1 Deploy Completo

```bash
# Criar feature simples para testar
# client/src/pages/dashboard.tsx

// Adicionar comentário
// AGENTE 9 validation - DevOps setup complete ✅

# Commit e push
git add .
git commit -m "chore: AGENTE 9 validation deploy"
git push origin main
```

**Monitorar workflow completo**:

```
GitHub Actions → deploy-production

✅ Checkout code
✅ Setup Node.js
✅ Install Vercel CLI
✅ Pull Vercel Environment
✅ Build Project Artifacts
✅ Deploy to Vercel Production
✅ Install Dependencies
✅ Run Database Migrations
    - Found 4 migration files
    - 0 pending migrations
    - ✅ All up to date
✅ Notify Sentry of Deployment
    - Release created: [commit-sha]
✅ Health Check
    - ✅ HTTP 200
✅ Create GitHub Deployment
✅ Deployment Summary

smoke-tests:
✅ Checkout code
✅ Setup Node.js
✅ Install dependencies
✅ Install Playwright
✅ Run smoke tests
    - 15/15 tests passed ✅
✅ Upload test results

Workflow Status: ✅ SUCCESS
```

- [ ] Deploy completo executou
- [ ] Todas as etapas passaram
- [ ] Site em produção funcionando

### 7.2 Verificar Monitoring

**UptimeRobot**:
- [ ] Abrir https://uptimerobot.com
- [ ] Todos os 7 monitores: UP ✅
- [ ] Status page acessível
- [ ] Uptime > 99%

**Sentry**:
- [ ] Abrir sentry.io
- [ ] Release criado para último commit
- [ ] Sem erros críticos nos últimos 30 min
- [ ] Dashboard mostrando métricas

### 7.3 Validar Endpoints

```bash
# Health check
curl https://imobibase.com/api/health
# ✅ {"status":"ok","database":"connected"}

# Homepage
curl -I https://imobibase.com
# ✅ HTTP/2 200

# Properties API (pode retornar 401 se não autenticado)
curl -I https://imobibase.com/api/properties
# ✅ HTTP/2 200 ou 401

# Status page
curl -I https://status.imobibase.com
# ✅ HTTP/2 200
```

- [ ] Todos os endpoints respondendo
- [ ] Health check mostra status OK

### 7.4 Documentação Final

```bash
# Verificar todos os docs criados
ls -lh docs/GITHUB_SECRETS_SETUP.md
ls -lh docs/UPTIME_MONITORING.md
ls -lh docs/SENTRY_ALERTS_SETUP.md
ls -lh docs/DEVOPS_EXAMPLES.md

ls -lh AGENT_9_DEVOPS_REPORT.md
ls -lh AGENT_9_QUICK_START.md
ls -lh AGENT_9_IMPLEMENTATION_CHECKLIST.md

# Verificar reports
cat AGENT_9_DEVOPS_REPORT.md | head -50
```

- [ ] Todas as documentações existem
- [ ] Reports gerados
- [ ] Exemplos disponíveis

---

## Fase 8: Treinamento da Equipe (1 hora)

### 8.1 Compartilhar Documentação

- [ ] Enviar link do repositório para equipe
- [ ] Destacar arquivos importantes:
  - `AGENT_9_QUICK_START.md` (começar aqui)
  - `docs/GITHUB_SECRETS_SETUP.md`
  - `docs/DEVOPS_EXAMPLES.md`

### 8.2 Demo ao Vivo

**Demonstrar**:

1. **Como criar migration**:
   ```bash
   # Criar arquivo SQL
   # Executar npm run db:migrate
   # Verificar tracking
   # Fazer rollback se necessário
   ```

2. **Como responder a incidente**:
   ```bash
   # Receber alerta UptimeRobot
   # Verificar GitHub Actions
   # Ver logs Sentry
   # Rollback se necessário
   ```

3. **Como interpretar alertas Sentry**:
   - Ver Issues
   - Analisar stack trace
   - Verificar affected users
   - Marcar como resolved

4. **Como ver smoke test results**:
   - GitHub Actions → Artifacts
   - Download report
   - Ver screenshots de falhas

- [ ] Demo realizada
- [ ] Equipe compreendeu workflows

### 8.3 Definir Responsabilidades

**On-call rotation**:
- [ ] Definir quem responde a alertas
- [ ] Criar schedule (ex: semanalmente)
- [ ] Documentar processo de escalation

**Incident response**:
- [ ] Primary: ___________________
- [ ] Secondary: ___________________
- [ ] Escalation: ___________________

**Manutenção**:
- [ ] Review semanal de alertas: ___________________
- [ ] Review mensal de uptime: ___________________
- [ ] Update de documentação: ___________________

---

## ✅ Checklist de Conclusão

### Infraestrutura

- [ ] GitHub Secrets configurados (6+ secrets)
- [ ] UptimeRobot com 7 monitores
- [ ] Sentry com 5+ alert rules
- [ ] Status page pública criada
- [ ] CI/CD executando migrations
- [ ] Smoke tests habilitados

### Validação

- [ ] Deploy completo realizado com sucesso
- [ ] Migrations executaram sem erros
- [ ] Smoke tests passaram (15/15)
- [ ] Monitoring mostrando "UP"
- [ ] Alertas funcionando (testados)

### Documentação

- [ ] AGENT_9_DEVOPS_REPORT.md revisado
- [ ] AGENT_9_QUICK_START.md compartilhado
- [ ] Equipe treinada
- [ ] Responsabilidades definidas

### Métricas

- [ ] Uptime atual: ______% (target: 99.9%)
- [ ] Deploy time: ______min (target: < 15 min)
- [ ] MTTR esperado: < 15 min
- [ ] Smoke tests: 15/15 passing

---

## 🎉 Próximos Passos

Após completar este checklist:

**Semana 1**:
- [ ] Monitorar alertas diariamente
- [ ] Ajustar thresholds se necessário
- [ ] Criar primeira migration real
- [ ] Review de incidents (se houver)

**Mês 1**:
- [ ] Review mensal de uptime
- [ ] Análise de alertas (fatigue?)
- [ ] Adicionar novos monitores se necessário
- [ ] Update de documentação com learnings

**Trimestre 1**:
- [ ] Implementar advanced monitoring
- [ ] Setup de APM (Application Performance Monitoring)
- [ ] Disaster recovery testing
- [ ] Chaos engineering experiments

---

**Data de início**: ___________________
**Data de conclusão**: ___________________
**Responsável**: ___________________
**Status**: ⬜ Not Started / 🔄 In Progress / ✅ Complete

---

**Última atualização**: 2025-12-25
**Versão**: 1.0.0
**Autor**: AGENTE 9 - DevOps Excellence

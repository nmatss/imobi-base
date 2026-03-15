# AGENTE 9 - Quick Start Guide

Guia rápido para começar a usar as melhorias de DevOps implementadas.

## O que foi implementado?

```
┌─────────────────────────────────────────────────────────────┐
│  AGENTE 9 - DEVOPS EXCELLENCE                              │
│                                                             │
│  ✅ GitHub Secrets Documentation                           │
│  ✅ Automated Database Migrations                          │
│  ✅ Post-Deploy Smoke Tests                                │
│  ✅ Uptime Monitoring (UptimeRobot)                        │
│  ✅ Sentry Alerts Configuration                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. GitHub Secrets (Primeiro Passo)

**Arquivo**: `docs/GITHUB_SECRETS_SETUP.md`

### Secrets Críticos

Configure estes secrets primeiro no GitHub:

```bash
# Repository → Settings → Secrets and variables → Actions

# Deploy
VERCEL_TOKEN                  # Deploy automático

# Database
DATABASE_URL                  # PostgreSQL connection

# Monitoring
SENTRY_DSN                   # Error tracking
SENTRY_ORG                   # Sentry organization
SENTRY_AUTH_TOKEN            # Sentry API token

# Email
SENDGRID_API_KEY             # Email service
EMAIL_FROM                   # Sender email
```

**Como obter cada um**: Ver `docs/GITHUB_SECRETS_SETUP.md`

---

## 2. Database Migrations

### Uso Básico

```bash
# Executar migrations pendentes
npm run db:migrate

# Rollback última migration
npm run db:migrate:rollback

# Rollback migration específica
npm run db:migrate rollback filename.sql

# Ver ajuda
npm run db:migrate help
```

### Como criar uma nova migration

```bash
# 1. Criar arquivo SQL em migrations/
touch migrations/add-new-feature.sql

# 2. Escrever SQL
cat > migrations/add-new-feature.sql << 'EOF'
-- Add new feature
ALTER TABLE properties ADD COLUMN new_field VARCHAR(255);
CREATE INDEX idx_properties_new_field ON properties(new_field);
EOF

# 3. Testar localmente
DATABASE_URL=your_local_db npm run db:migrate

# 4. Commit e push
git add migrations/add-new-feature.sql
git commit -m "feat: Add new feature migration"
git push

# 5. CI/CD executará automaticamente!
```

### O que acontece no deploy?

```
┌─────────────────────────────────────────────────────────┐
│ GitHub Actions Workflow                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Build & Deploy to Vercel                  ✅        │
│  2. npm ci (install dependencies)             ✅        │
│  3. npm run db:migrate                        ✅        │
│     ├─ Check pending migrations                         │
│     ├─ Execute in transaction                           │
│     ├─ Record in _migrations table                      │
│     └─ Rollback deploy if fails!                        │
│  4. Notify Sentry of deployment               ✅        │
│  5. Health check                              ✅        │
│  6. Run smoke tests                           ✅        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Smoke Tests

### Testes Incluídos

15 testes automáticos após cada deploy:

**Funcionalidade**:

- Application loads
- User login/logout
- Dashboard loads
- Navigation works
- Create property
- Create lead
- Search works
- API health check
- No console errors
- Public pages work

**Performance**:

- Dashboard < 2s
- Property list < 1s
- Search < 500ms

### Executar localmente

```bash
# Instalar Playwright (primeira vez)
npx playwright install --with-deps chromium

# Executar smoke tests
npm run test:smoke

# Ver relatório
npx playwright show-report
```

### Ver resultados no GitHub

```
GitHub Actions → Latest workflow run → smoke-tests job
↓
Download artifacts → smoke-test-results
```

---

## 4. Uptime Monitoring

**Arquivo**: `docs/UPTIME_MONITORING.md`

### Setup Rápido

**1. Criar conta**:

```
https://uptimerobot.com → Sign Up (FREE)
```

**2. Adicionar 7 monitores essenciais**:

| Nome              | URL                     | Interval | Alert |
| ----------------- | ----------------------- | -------- | ----- |
| Health Check      | `/api/health`           | 5 min    | Yes   |
| Homepage          | `/`                     | 5 min    | Yes   |
| Properties API    | `/api/properties`       | 5 min    | Yes   |
| Public Properties | `/public/properties`    | 5 min    | Yes   |
| Database Health   | `/api/health` (keyword) | 5 min    | Yes   |
| Login Page        | `/login`                | 10 min   | Yes   |
| Static Assets     | `/assets/logo.png`      | 15 min   | No    |

**3. Configurar alertas**:

- Email: devops@yourcompany.com
- Slack: Webhook integration
- Threshold: 2 minutes (1 check failure)

**4. Criar status page**:

```
UptimeRobot → Status Pages → Create
URL: status.imobibase.com
```

### Incident Response

Quando receber alerta:

```bash
# 1. Verificar issue (0-2 min)
curl -I https://imobibase.com/api/health

# 2. Checar GitHub Actions
# Latest workflow - passou ou falhou?

# 3. Checar Vercel Dashboard
# Deployment status, logs, resources

# 4. Checar Supabase
# Database status, connections

# 5. Rollback se necessário
vercel rollback https://imobibase.com
# OU
gh workflow run deploy-production.yml --ref previous-commit
```

**Target**: MTTR < 15 minutos

---

## 5. Sentry Alerts

**Arquivo**: `docs/SENTRY_ALERTS_SETUP.md`

### Setup Rápido

**1. Criar projeto**:

```
https://sentry.io → Create Project
Platform: Node.js
Name: imobibase
```

**2. Obter DSN e Token**:

```
Settings → Projects → imobibase → Client Keys (DSN)
Settings → Account → API → Auth Tokens → Create Token
```

**3. Adicionar no GitHub Secrets**:

```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org-slug
SENTRY_AUTH_TOKEN=sntrys_xxxxx
```

**4. Configurar 10 alert rules essenciais**:

```
┌───────────────────────────────────────────────────────────┐
│ Alert Rules Configuration                                 │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  1. High Error Rate        > 10 errors/min → Slack       │
│  2. New Error             First seen → Slack             │
│  3. Performance p95       > 2s → Slack                   │
│  4. Database Slow         > 1s → Slack                   │
│  5. Fatal Error           Any → Slack @channel + SMS     │
│  6. Auth Failures         > 20/5min → Security           │
│  7. Memory Leak           > 400MB/30min → DevOps         │
│  8. Unhandled Promise     Any → Backend Team            │
│  9. Apdex Score          < 0.85 → Performance           │
│ 10. User-Specific Error   > 5/min → Support             │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

**5. Integrar com Slack**:

```
Settings → Integrations → Slack → Add to Slack
Create channels: #alerts, #errors, #performance, #security
```

### Testar Sentry

```bash
# Adicionar endpoint de teste (remover depois)
# server/index.ts

app.get("/api/test-sentry", (req, res) => {
  throw new Error("Test error for Sentry");
});

# Testar
curl https://imobibase.com/api/test-sentry

# Verificar
# Sentry Dashboard → Issues → Test error
# Slack → #alerts → Notificação recebida?
```

---

## Workflows Completos

### Deploy para Produção

```mermaid
┌─────────────┐
│ git push    │
│   main      │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ GitHub Actions   │
│ Trigger          │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Build & Deploy   │
│ to Vercel        │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Run Migrations   │ ◄─── Se falhar, deploy FALHA
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Notify Sentry    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Health Check     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Smoke Tests      │ ◄─── 15 testes automáticos
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ ✅ Success       │
│ Deploy Complete  │
└──────────────────┘
```

### Criar e Aplicar Migration

```bash
# 1. Criar arquivo SQL
vim migrations/001-add-feature.sql

# 2. Testar localmente
npm run db:migrate

# 3. Verificar tracking
psql $DATABASE_URL -c "SELECT * FROM _migrations;"

# 4. Commit
git add migrations/001-add-feature.sql
git commit -m "feat: Add feature XYZ"

# 5. Push (CI/CD executará automaticamente)
git push origin main

# 6. Monitorar
# GitHub Actions → deploy-production
# Vercel → Deployment logs
# Sentry → Errors (não deve ter)

# 7. Validar
curl https://imobibase.com/api/health
# ✅ status: ok
```

### Responder a Incidente

```bash
# Alerta recebido: "Site is DOWN"

# ⏱️ 0-2 min: VERIFICAR
curl -I https://imobibase.com/api/health
# → 500 Internal Server Error

# ⏱️ 2-5 min: DIAGNOSTICAR
# GitHub Actions → Último deploy falhou?
# Sentry → Spike de erros?
# Vercel → Logs mostram o quê?

# ⏱️ 5-10 min: ROLLBACK
vercel rollback https://imobibase.com

# ⏱️ 10-15 min: VALIDAR
curl https://imobibase.com/api/health
# → 200 OK

# ⏱️ 15-30 min: POST-MORTEM
# O que causou?
# Como prevenir?
# Criar issue no GitHub
```

---

## Comandos Úteis

```bash
# Migrations
npm run db:migrate                    # Executar pendentes
npm run db:migrate:rollback           # Rollback última
npm run db:migrate help               # Ver ajuda

# Testing
npm run test:smoke                    # Smoke tests
npm run test                          # All tests
npm run test:watch                    # Watch mode

# Health Check
npm run health:check                  # Local health check
curl https://imobibase.com/api/health # Production

# Deploy
npm run deploy:production             # Manual deploy
git push origin main                  # Auto deploy

# Rollback
npm run rollback:production           # Rollback script
vercel rollback https://imobibase.com # Vercel CLI
```

---

## Checklist de Primeiro Deploy

Use este checklist no primeiro deploy após setup:

```
ANTES DO DEPLOY:
─────────────────────────────────────────────────────────────
□ Secrets configurados no GitHub
  □ VERCEL_TOKEN
  □ DATABASE_URL
  □ SENTRY_DSN, SENTRY_ORG, SENTRY_AUTH_TOKEN
  □ SENDGRID_API_KEY ou RESEND_API_KEY

□ UptimeRobot configurado
  □ Conta criada
  □ 7 monitores adicionados
  □ Alertas configurados (Email + Slack)

□ Sentry configurado
  □ Projeto criado
  □ 10 alert rules adicionadas
  □ Slack integration ativa

DURANTE O DEPLOY:
─────────────────────────────────────────────────────────────
□ Monitorar GitHub Actions workflow
□ Verificar migrations executaram
□ Confirmar smoke tests passaram
□ Checar Sentry recebeu notificação de release

APÓS O DEPLOY:
─────────────────────────────────────────────────────────────
□ Testar manualmente
  □ https://imobibase.com carrega
  □ Login funciona
  □ Dashboard mostra dados

□ Verificar monitoring
  □ UptimeRobot mostrando "UP"
  □ Sentry sem erros críticos
  □ Health check respondendo 200

□ Testar alertas
  □ Simular erro no Sentry
  □ Confirmar alerta chegou no Slack
  □ UptimeRobot alerta funciona (opcional)
```

---

## Suporte

### Documentação Completa

- **GitHub Secrets**: `docs/GITHUB_SECRETS_SETUP.md`
- **Uptime Monitoring**: `docs/UPTIME_MONITORING.md`
- **Sentry Alerts**: `docs/SENTRY_ALERTS_SETUP.md`
- **Report Completo**: `AGENT_9_DEVOPS_REPORT.md`

### Troubleshooting Comum

**Migration falhou no CI/CD**:

```bash
# Ver logs no GitHub Actions
# Identificar SQL com erro
# Corrigir localmente
# Fazer rollback da migration
npm run db:migrate rollback
# Criar nova migration corrigida
# Push novamente
```

**Smoke tests falhando**:

```bash
# Executar localmente para debug
npm run test:smoke -- --debug
# Ver screenshot no test-results/
# Corrigir issue
# Push fix
```

**UptimeRobot alertando mas site OK**:

```bash
# Falso positivo comum
# Verificar manualmente
curl https://imobibase.com/api/health
# Se OK, ajustar threshold no UptimeRobot
```

**Sentry com muitos alertas**:

```bash
# Alert fatigue
# Aumentar threshold (10 → 20 erros/min)
# Adicionar action interval (15 min)
# Filtrar erros conhecidos em ignoreErrors
```

---

## Métricas de Sucesso

Após implementação completa, espere:

```
┌────────────────────────────────────────────────────┐
│ ANTES           →  DEPOIS                          │
├────────────────────────────────────────────────────┤
│ Deploy manual   →  Deploy automático (CI/CD)       │
│ ~30 min deploy  →  ~10 min deploy                  │
│ Migration manual→  Migration automática            │
│ Bugs em prod    →  Caught por smoke tests         │
│ Downtime horas  →  MTTR < 15 min                   │
│ No monitoring   →  7 endpoints monitorados         │
│ Reactive        →  Proactive alerts                │
└────────────────────────────────────────────────────┘

TARGET:
  Uptime: 99.9%
  MTTR: < 15 minutes
  Deploy frequency: Multiple per day
  Change failure rate: < 5%
```

---

**Última atualização**: 2025-12-25
**Versão**: 1.0.0
**Autor**: AGENTE 9 - DevOps Excellence

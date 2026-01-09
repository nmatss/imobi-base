# Security Quick Reference - ImobiBase

**Guia Rápido de Segurança para Desenvolvedores**

---

## 1. Validação de Entrada

### Use Zod Schemas

```typescript
import { z } from 'zod';
import { validateBody } from '@/server/middleware/validate';

// 1. Definir schema
const createPropertySchema = z.object({
  title: z.string().min(3).max(200),
  price: z.number().positive(),
  email: z.string().email(),
});

// 2. Aplicar middleware
app.post('/api/properties',
  validateBody(createPropertySchema),
  async (req, res) => {
    // req.body já validado e type-safe
  }
);
```

### Schemas Prontos

```typescript
import { commonSchemas } from '@/server/security/input-validation';

// Email
commonSchemas.email // z.string().email().max(255)

// Telefone
commonSchemas.phone // z.string().regex(/^\+?[1-9]\d{9,14}$/)

// URL
commonSchemas.url // z.string().url().max(2048)

// ID
commonSchemas.id // z.string().regex(/^[a-zA-Z0-9_-]+$/).max(50)

// CPF/CNPJ
commonSchemas.cpf // z.string().regex(/^\d{11}$/)
commonSchemas.cnpj // z.string().regex(/^\d{14}$/)

// Data
commonSchemas.date // z.coerce.date()
```

### Sanitização Manual

```typescript
import {
  sanitizeString,
  sanitizeHtml,
  sanitizeEmail,
  sanitizeFilename,
  sanitizeUrl
} from '@/server/security/input-validation';

// String genérica
const clean = sanitizeString(userInput, 1000); // max 1000 chars

// HTML (remove scripts, event handlers)
const safeHtml = sanitizeHtml(htmlContent);

// Email
const email = sanitizeEmail(userEmail); // null se inválido

// Filename (previne path traversal)
const filename = sanitizeFilename(uploadedFile.name);

// URL (previne SSRF)
const url = sanitizeUrl(externalUrl);
```

---

## 2. Autenticação

### Proteger Rotas

```typescript
import { requireAuth } from '@/server/routes';

// Rota protegida
app.get('/api/properties', requireAuth, async (req, res) => {
  const userId = req.user!.id; // TypeScript sabe que user existe
  const tenantId = req.user!.tenantId;
  // ...
});

// Rota pública (explícita)
app.post('/api/leads/public', publicLimiter, async (req, res) => {
  // Sem requireAuth
});
```

### Validar Senha

```typescript
import { validatePasswordStrength } from '@/server/auth/security';

const result = validatePasswordStrength(password);

if (!result.valid) {
  return res.status(400).json({
    error: result.message,
    requirements: result.requirements
  });
}

// result.score: 0-100
```

### Login Seguro

```typescript
import {
  handleFailedLogin,
  handleSuccessfulLogin,
  checkAccountLock
} from '@/server/auth/security';

// 1. Verificar se conta está bloqueada
const lockStatus = await checkAccountLock(userId);
if (lockStatus.locked) {
  return res.status(423).json({
    error: 'Conta bloqueada',
    remainingTime: lockStatus.remainingTime
  });
}

// 2. Validar senha
const valid = await comparePassword(password, user.password);

if (!valid) {
  // Registrar falha
  const { locked, remainingAttempts } = await handleFailedLogin(
    userId, email, 'invalid_password', req
  );

  return res.status(401).json({
    error: 'Senha inválida',
    remainingAttempts,
    locked
  });
}

// 3. Login bem-sucedido
const { suspicious } = await handleSuccessfulLogin(userId, email, req);
// suspicious = true se login de novo IP/device
```

---

## 3. CSRF Protection

### Backend

```typescript
import { csrfProtection, getCsrfToken } from '@/server/security/csrf-protection';

// 1. Endpoint para obter token
app.get('/api/auth/csrf-token', getCsrfToken);

// 2. Aplicar proteção (automático para POST/PUT/DELETE)
app.use(csrfProtection);

// 3. Whitelist de rotas (webhooks)
// Já configurado em csrf-protection.ts
```

### Frontend

```typescript
// 1. Obter token CSRF
const { csrfToken, headerName } = await fetch('/api/auth/csrf-token')
  .then(r => r.json());

// 2. Incluir em todas requisições POST/PUT/DELETE
fetch('/api/properties', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken, // Header obrigatório
  },
  body: JSON.stringify(data)
});

// 3. OU incluir no body
fetch('/api/properties', {
  method: 'POST',
  body: JSON.stringify({
    ...data,
    _csrf: csrfToken // Campo alternativo
  })
});
```

---

## 4. Rate Limiting

### Limiters Disponíveis

```typescript
// 1. API Geral (15 min, 500 req)
// Aplicado automaticamente em /api/*

// 2. Autenticação (15 min, 20 req)
app.post('/api/auth/login', authLimiter, handler);

// 3. Público (1 hora, 30 req)
app.post('/api/leads/public', publicLimiter, handler);
```

### Custom Rate Limiter

```typescript
import rateLimit from 'express-rate-limit';

const customLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 100, // max 100 req/hora
  message: { error: 'Limite excedido' },
  standardHeaders: true,
});

app.post('/api/custom', customLimiter, handler);
```

---

## 5. Detecção de Intrusão

### Bloqueio Manual de IP

```typescript
import {
  blockIp,
  unblockIp,
  isIpBlocked,
  getThreatDetails
} from '@/server/security/intrusion-detection';

// Bloquear IP
blockIp('192.168.1.100', 3600000); // 1 hora

// Desbloquear IP
unblockIp('192.168.1.100');

// Verificar se bloqueado
if (isIpBlocked(ip)) {
  // ...
}

// Detalhes da ameaça
const details = getThreatDetails(ip);
console.log(details);
// {
//   blocked: true,
//   blockUntil: '2025-12-25T15:00:00Z',
//   loginAttempts: 5,
//   suspiciousActivities: 3,
//   patterns: ['failed_login', 'xss_attempt']
// }
```

### Detecção Automática

```typescript
// Já aplicado automaticamente em todas rotas:
// - SQL Injection detection
// - XSS detection
// - Path Traversal detection
// - Brute force detection
// - Credential stuffing detection

// Ver logs:
// [IDS] SQL injection attempt from 192.168.1.100 on /api/properties
// [IDS] Auto-blocking 192.168.1.100 due to 3 suspicious activities
```

---

## 6. Monitoramento de Segurança

### Log de Eventos

```typescript
import {
  logSecurityEvent,
  SecurityEventType
} from '@/server/security/security-monitor';

// Registrar evento de segurança
logSecurityEvent(
  SecurityEventType.SENSITIVE_DATA_ACCESS,
  'User accessed customer PII',
  req,
  { customerId: customer.id, fields: ['cpf', 'phone'] }
);

// Tipos de eventos disponíveis:
// - LOGIN_SUCCESS, LOGIN_FAILURE
// - PERMISSION_DENIED, UNAUTHORIZED_ACCESS
// - SQL_INJECTION_ATTEMPT, XSS_ATTEMPT
// - BRUTE_FORCE_DETECTED, CREDENTIAL_STUFFING
// - SENSITIVE_DATA_ACCESS, DATA_EXPORT, DATA_DELETION
// - RATE_LIMIT_EXCEEDED, IP_BLOCKED
// ... (61 tipos total)
```

### Buscar Eventos

```typescript
import {
  getRecentEvents,
  searchSecurityEvents,
  getSecurityMetrics
} from '@/server/security/security-monitor';

// Eventos recentes
const events = getRecentEvents(50); // últimos 50

// Busca avançada
const criticalEvents = searchSecurityEvents({
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-25'),
  severity: SecurityEventSeverity.CRITICAL,
  userId: 'user-123'
});

// Métricas
const metrics = getSecurityMetrics();
console.log(metrics);
// {
//   totalEvents: 1247,
//   eventsBySeverity: { low: 1100, medium: 120, high: 25, critical: 2 },
//   recentCriticalEvents: 2,
//   topThreats: [{ ip: '...', count: 15 }]
// }
```

---

## 7. Headers de Segurança

### Configuração Atual

```typescript
// Helmet já configurado em /server/routes.ts

// CSP Nonce (produção)
// Acesse via res.locals.cspNonce em templates

// HSTS
// Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

// X-Content-Type-Options
// X-Content-Type-Options: nosniff

// Referrer-Policy
// Referrer-Policy: strict-origin-when-cross-origin
```

### Usar Nonce em HTML

```html
<!-- Template com nonce -->
<script nonce="<%= cspNonce %>">
  // JavaScript inline permitido
</script>

<style nonce="<%= cspNonce %>">
  /* CSS inline permitido */
</style>
```

---

## 8. Tratamento de Erros

### Error Classes

```typescript
import {
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError
} from '@/server/middleware/error-handler';

// Validação
throw new ValidationError('Invalid input', zodErrors);

// Autenticação
throw new AuthError('Invalid credentials');

// Autorização
throw new ForbiddenError('Access denied');

// Não encontrado
throw new NotFoundError('Property');

// Conflito
throw new ConflictError('Email already exists');

// Rate limit
throw new RateLimitError('Too many requests');
```

### Async Handler

```typescript
import { asyncHandler } from '@/server/middleware/error-handler';

// Wrapper para async routes
app.post('/api/properties', asyncHandler(async (req, res) => {
  // Erros automaticamente capturados e enviados para error handler
  const property = await createProperty(req.body);
  res.json(property);
}));
```

---

## 9. Secrets Management

### Variáveis de Ambiente

```bash
# .env (NUNCA commitar!)

# Obrigatórios
DATABASE_URL=postgresql://...
SESSION_SECRET=<gerado com openssl rand -base64 64>

# Email
SENDGRID_API_KEY=SG...
# OU
RESEND_API_KEY=re_...

# Monitoramento
SENTRY_DSN=https://...

# Pagamentos (opcional)
STRIPE_SECRET_KEY=sk_live_...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...

# Integrações (opcional)
GOOGLE_MAPS_API_KEY=AIza...
TWILIO_ACCOUNT_SID=AC...
WHATSAPP_API_TOKEN=EAA...
```

### Gerar Secrets

```bash
# SESSION_SECRET (64 bytes)
openssl rand -base64 64

# Ou use o script
bash scripts/generate-secrets.sh
```

---

## 10. Testes de Segurança

### Testar Validação

```typescript
// tests/security/validation.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeString, detectSqlInjection } from '@/server/security/input-validation';

describe('Input Validation', () => {
  it('should detect SQL injection', () => {
    expect(detectSqlInjection("' OR '1'='1")).toBe(true);
    expect(detectSqlInjection("UNION SELECT * FROM users")).toBe(true);
    expect(detectSqlInjection("normal input")).toBe(false);
  });

  it('should sanitize strings', () => {
    expect(sanitizeString("test\0null")).toBe("testnull");
    expect(sanitizeString("a".repeat(2000), 100)).toHaveLength(100);
  });
});
```

### Testar Autenticação

```typescript
// tests/security/auth.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@/server';

describe('Authentication', () => {
  it('should block after 5 failed attempts', async () => {
    // 5 tentativas falhas
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
    }

    // 6ª tentativa deve retornar 423 (Locked)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' });

    expect(res.status).toBe(423);
  });
});
```

### Testar Rate Limiting

```bash
# Teste manual com curl
for i in {1..25}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' &
done

# 21ª requisição deve retornar 429 (Too Many Requests)
```

---

## 11. Checklist de Código

Antes de fazer commit:

- [ ] Todas rotas protegidas têm `requireAuth`?
- [ ] Validação de entrada com Zod?
- [ ] Sanitização de dados de usuário?
- [ ] Sem SQL raw (usar Drizzle ORM)?
- [ ] Sem secrets hardcoded?
- [ ] Erros não expõem informações sensíveis?
- [ ] CSRF token em formulários POST/PUT/DELETE?
- [ ] Rate limiting apropriado?
- [ ] Logs não contêm PII/passwords?
- [ ] Tests de segurança passam?

---

## 12. Comandos Úteis

```bash
# Audit de segurança
npm audit

# Fix automático
npm audit fix

# Ver vulnerabilidades detalhadas
npm audit --json

# Atualizar dependências
npm update

# Verificar outdated
npm outdated

# Gerar secrets
openssl rand -base64 64

# Testar headers
curl -I https://imobibase.com

# Rodar testes
npm test

# Rodar testes de segurança
npm run test:security
```

---

## 13. Recursos Adicionais

### Documentação

- `/server/security/` - Módulos de segurança
- `/server/auth/` - Autenticação
- `/server/middleware/` - Middlewares
- `/server/compliance/` - LGPD/GDPR

### Logs

```bash
# Eventos de segurança
grep "SECURITY" /var/log/app.log

# IDS
grep "IDS" /var/log/app.log

# Ataques detectados
grep "attempt" /var/log/app.log
```

### Ferramentas

- Sentry: https://sentry.io
- OWASP ZAP: https://www.zaproxy.org
- Burp Suite: https://portswigger.net/burp
- Security Headers: https://securityheaders.com
- SSL Labs: https://www.ssllabs.com/ssltest/

---

## 14. Contatos de Segurança

- **Email:** security@imobibase.com
- **Reportar Vulnerabilidade:** security-report@imobibase.com
- **On-call:** Ver /docs/INCIDENT_RESPONSE.md

---

**Última Atualização:** 25 de Dezembro de 2025
**Versão:** 1.0

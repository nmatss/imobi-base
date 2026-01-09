# Implementação de CORS com Whitelist

## Visão Geral

Este documento descreve a implementação de CORS (Cross-Origin Resource Sharing) com whitelist de origens permitidas no ImobiBase.

## Configuração Implementada

### 1. Instalação de Dependências

```bash
npm install cors @types/cors --legacy-peer-deps
```

### 2. Configuração em `/server/routes.ts`

A configuração de CORS foi implementada **ANTES** do Helmet para garantir o correto funcionamento dos headers:

```typescript
import cors from 'cors';

// Whitelist de origens permitidas
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:5000',
  'http://localhost:5173', // Vite dev server
  'https://imobibase.com',
  'https://www.imobibase.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Verificar se a origin está na whitelist ou corresponde a wildcard
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked request from origin:', origin);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-csrf-token',
    'x-requested-with',
  ],
  exposedHeaders: ['x-csrf-token'],
  maxAge: 86400, // 24 horas
}));
```

### 3. Handler de Erros CORS

```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.message && err.message.includes('CORS')) {
    console.warn('[SECURITY] CORS violation', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed',
    });
  }

  next(err);
});
```

### 4. Validação de Produção

```typescript
if (process.env.NODE_ENV === 'production') {
  const origins = process.env.CORS_ORIGINS;
  if (!origins || origins.includes('localhost')) {
    console.error('⚠️  WARNING: CORS_ORIGINS not properly configured for production!');
    console.error('   Current value:', origins);
    console.error('   Localhost origins should not be allowed in production.');
  } else {
    console.log('✓ CORS properly configured for production');
    console.log('  Allowed origins:', origins);
  }
}
```

## Configuração de Variáveis de Ambiente

### Desenvolvimento (.env)

```bash
CORS_ORIGINS=http://localhost:5000,http://localhost:5173,https://imobibase.com
```

### Produção (.env.production)

```bash
CORS_ORIGINS=https://imobibase.com,https://www.imobibase.com,https://*.imobibase.com
```

## Funcionalidades

### ✅ Whitelist de Origens

- Lista de origens permitidas configurável via variável de ambiente
- Suporte a wildcard para subdomínios: `https://*.imobibase.com`
- Validação rigorosa de origens

### ✅ Suporte a Credenciais

- `credentials: true` - Permite cookies e headers de autorização
- Headers de autenticação como `Authorization` e `x-csrf-token`

### ✅ Métodos HTTP Permitidos

- GET, POST, PUT, DELETE, PATCH, OPTIONS
- Preflight requests (OPTIONS) configuradas automaticamente

### ✅ Headers Permitidos e Expostos

**Allowed Headers:**
- Content-Type
- Authorization
- x-csrf-token
- x-requested-with

**Exposed Headers:**
- x-csrf-token (para CSRF protection)

### ✅ Cache de Preflight

- `maxAge: 86400` (24 horas)
- Reduz número de preflight requests
- Melhora performance

### ✅ Logging de Violações

- Log de todas as tentativas de acesso bloqueadas
- Informações sobre origem, método, path e IP
- Facilita auditoria de segurança

### ✅ Suporte a Mobile/API Clients

- Requisições sem origin são permitidas
- Suporte a mobile apps, curl, Postman, etc.

## Testes

### Executar Testes de CORS

```bash
# 1. Iniciar servidor em desenvolvimento
npm run dev

# 2. Em outro terminal, executar testes
node test-cors.js
```

### Testes Incluídos

1. **Origem permitida (localhost:5000)** - Deve passar ✓
2. **Origem permitida (localhost:5173)** - Deve passar ✓
3. **Origem permitida (imobibase.com)** - Deve passar ✓
4. **Wildcard match (app.imobibase.com)** - Deve passar ✓
5. **Origem bloqueada (malicious-site.com)** - Deve falhar ✗
6. **Sem origem (mobile/curl)** - Deve passar ✓

### Teste Manual com curl

```bash
# Teste com origem permitida (deve retornar 200)
curl -H "Origin: http://localhost:5000" \
     -i http://localhost:5000/api/health

# Teste com origem bloqueada (deve retornar 403)
curl -H "Origin: https://evil.com" \
     -i http://localhost:5000/api/health

# Teste sem origem - mobile app (deve retornar 200)
curl -i http://localhost:5000/api/health
```

### Teste de Preflight (OPTIONS)

```bash
curl -X OPTIONS \
     -H "Origin: http://localhost:5000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -i http://localhost:5000/api/leads
```

## Segurança

### ⚠️ Importante em Produção

1. **Remover origens localhost:**
   ```bash
   # ❌ NÃO fazer em produção
   CORS_ORIGINS=http://localhost:5000,https://imobibase.com

   # ✅ Correto em produção
   CORS_ORIGINS=https://imobibase.com,https://www.imobibase.com
   ```

2. **Validar wildcard:**
   - Use `https://*.imobibase.com` apenas se necessário
   - Evite wildcards muito permissivos como `https://*`

3. **Monitorar logs:**
   - Verificar regularmente logs de violações CORS
   - Investigar tentativas de acesso suspeitas

### Checklist de Segurança

- [x] CORS instalado e configurado
- [x] Whitelist de origens implementada
- [x] Suporte a wildcard para subdomínios
- [x] Credentials habilitado para cookies
- [x] Logging de violações implementado
- [x] Validação de produção adicionada
- [x] Handler de erros CORS
- [x] Documentação completa
- [x] Testes implementados

## Ordem de Middleware

**IMPORTANTE:** A ordem dos middlewares é crítica:

```typescript
1. CORS        ← Primeiro (antes do Helmet)
2. Helmet      ← Segundo (headers de segurança)
3. Rate Limit  ← Terceiro
4. Session     ← Quarto
5. Routes      ← Por último
```

## Troubleshooting

### Erro: "CORS policy violation"

**Causa:** Origem não está na whitelist

**Solução:**
1. Verificar variável `CORS_ORIGINS` no `.env`
2. Adicionar origem à whitelist
3. Reiniciar servidor

### Headers CORS não aparecem

**Causa:** Helmet configurado antes do CORS

**Solução:**
- Verificar ordem dos middlewares
- CORS deve vir ANTES do Helmet

### Wildcard não funciona

**Causa:** Regex incorreto

**Solução:**
- Usar formato: `https://*.domain.com`
- Não usar: `https://*domain.com` ou `https://domain.*`

## Monitoramento

### Logs a Observar

```bash
# Violações CORS
[SECURITY] CORS violation { origin: 'https://evil.com', ... }

# Validação de produção
✓ CORS properly configured for production
  Allowed origins: https://imobibase.com,...

⚠️  WARNING: CORS_ORIGINS not properly configured for production!
```

## Referências

- [MDN - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP - CORS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
- [cors npm package](https://www.npmjs.com/package/cors)

## Autor

Implementado em 2025-12-26 como parte das melhorias de segurança críticas do ImobiBase.

# 🚀 CORS - Quick Start Guide

## ⚡ Início Rápido

### 1. Verificar Instalação

```bash
# Verificar se cors está instalado
npm list cors @types/cors
```

**Esperado:**

```
├── cors@2.8.5
└── @types/cors@2.8.19
```

### 2. Configurar Variável de Ambiente

**Desenvolvimento (.env):**

```bash
CORS_ORIGINS=http://localhost:5000,http://localhost:5173,https://imobibase.com
```

**Produção (Vercel/Railway):**

```bash
CORS_ORIGINS=https://imobibase.com,https://www.imobibase.com,https://*.imobibase.com
```

### 3. Testar Localmente

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Executar testes
node test-cors.js
```

---

## 🧪 Testes Manuais Rápidos

### Teste 1: Origem Permitida ✅

```bash
curl -H "Origin: http://localhost:5000" \
     -i http://localhost:5000/api/health
```

**Esperado:**

- Status: `200 OK`
- Header: `Access-Control-Allow-Origin: http://localhost:5000`
- Header: `Access-Control-Allow-Credentials: true`

### Teste 2: Origem Bloqueada ❌

```bash
curl -H "Origin: https://evil.com" \
     -i http://localhost:5000/api/health
```

**Esperado:**

- Status: `403 Forbidden`
- Body: `{"error":"CORS policy violation","message":"Origin not allowed"}`
- Log no console: `[CORS] Blocked request from origin: https://evil.com`

### Teste 3: Sem Origem (Mobile) ✅

```bash
curl -i http://localhost:5000/api/health
```

**Esperado:**

- Status: `200 OK`
- Funciona normalmente (para apps mobile)

### Teste 4: Preflight (OPTIONS)

```bash
curl -X OPTIONS \
     -H "Origin: http://localhost:5000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -i http://localhost:5000/api/leads
```

**Esperado:**

- Status: `204 No Content` ou `200 OK`
- Headers CORS presentes

---

## 📊 Verificação de Status

### Logs no Console

**Desenvolvimento:**

```
🔐 Initializing Secret Manager...
[CORS] Configuration loaded: http://localhost:5000,http://localhost:5173,...
```

**Produção (correto):**

```
✓ CORS properly configured for production
  Allowed origins: https://imobibase.com,https://www.imobibase.com,...
```

**Produção (ERRO - localhost presente):**

```
⚠️  WARNING: CORS_ORIGINS not properly configured for production!
   Current value: http://localhost:5000,https://imobibase.com
   Localhost origins should not be allowed in production.
```

---

## 🔍 Troubleshooting Rápido

### Problema: "CORS policy violation"

**Causa:** Origem não está na whitelist

**Solução:**

```bash
# 1. Verificar variável de ambiente
echo $CORS_ORIGINS

# 2. Adicionar origem à whitelist
# No .env, adicionar a origem
CORS_ORIGINS=http://localhost:5000,http://localhost:5173,https://nova-origem.com

# 3. Reiniciar servidor
npm run dev
```

### Problema: Headers CORS não aparecem

**Causa:** Ordem incorreta de middlewares

**Solução:**

- Verificar que CORS está na linha 197 de `server/routes.ts`
- Verificar que Helmet está na linha 242 (DEPOIS do CORS)

### Problema: Wildcard não funciona

**Causa:** Formato incorreto

**Correto:**

```bash
CORS_ORIGINS=https://*.imobibase.com
```

**Incorreto:**

```bash
# ❌ NÃO usar:
CORS_ORIGINS=https://*imobibase.com     # Sem ponto
CORS_ORIGINS=https://imobibase.*        # Wildcard no TLD
CORS_ORIGINS=https://**                 # Duplo wildcard
```

---

## 🚀 Deploy em Produção

### Pré-Deploy Checklist

```bash
# 1. Verificar que CORS_ORIGINS está configurada
[ -z "$CORS_ORIGINS" ] && echo "⚠️  CORS_ORIGINS não configurada!" || echo "✅ OK"

# 2. Verificar que não tem localhost
echo $CORS_ORIGINS | grep -q localhost && echo "⚠️  Localhost encontrado!" || echo "✅ OK"

# 3. Build de produção
npm run build

# 4. Verificar compilação
echo "✅ Build concluído"
```

### Configuração no Vercel

```bash
# Via CLI
vercel env add CORS_ORIGINS

# Valor (produção):
https://imobibase.com,https://www.imobibase.com,https://*.imobibase.com
```

### Configuração no Railway

```bash
# Via CLI
railway variables set CORS_ORIGINS="https://imobibase.com,https://www.imobibase.com,https://*.imobibase.com"
```

### Pós-Deploy Validação

```bash
# 1. Verificar logs de startup
railway logs # ou vercel logs

# Procurar por:
# ✅ "✓ CORS properly configured for production"

# 2. Testar endpoint público
curl -H "Origin: https://imobibase.com" \
     -i https://seu-app.vercel.app/api/health

# 3. Monitorar logs nas primeiras 24h
# Procurar por:
# ⚠️ "[CORS] Blocked request from origin: ..."
```

---

## 📋 Comandos Úteis

### Desenvolvimento

```bash
# Iniciar servidor
npm run dev

# Executar testes CORS
node test-cors.js

# Verificar logs
# (logs aparecem no terminal do npm run dev)
```

### Produção

```bash
# Build
npm run build

# Iniciar em modo produção
npm start

# Health check
curl http://localhost:5000/api/health
```

### Debug

```bash
# Verificar configuração de CORS
grep -A 30 "CORS CONFIGURATION" server/routes.ts

# Verificar variável de ambiente
echo $CORS_ORIGINS

# Ver todas as origens permitidas
node -e "console.log((process.env.CORS_ORIGINS || '').split(','))"
```

---

## 🎯 Validação Rápida

### ✅ Checklist de 1 Minuto

```bash
# 1. CORS instalado?
npm list cors | grep -q "cors@" && echo "✅" || echo "❌"

# 2. Variável configurada?
[ -z "$CORS_ORIGINS" ] && echo "❌" || echo "✅"

# 3. Servidor rodando?
curl -s http://localhost:5000/api/health > /dev/null && echo "✅" || echo "❌"

# 4. CORS funcionando?
curl -sI -H "Origin: http://localhost:5000" http://localhost:5000/api/health | \
  grep -q "access-control-allow-origin" && echo "✅" || echo "❌"
```

---

## 📚 Referências Rápidas

### Arquivos Importantes

```
/server/routes.ts              ← Configuração CORS
/.env.example                  ← Exemplo de configuração
/test-cors.js                  ← Script de testes
/CORS_IMPLEMENTATION.md        ← Documentação completa
/CORS_VALIDATION_SUMMARY.md    ← Resumo de validação
/CORS_CHECKLIST.md             ← Checklist detalhado
```

### Linhas de Código Chave

```
server/routes.ts:17            ← import cors
server/routes.ts:190-195       ← allowedOrigins
server/routes.ts:197-231       ← app.use(cors(...))
server/routes.ts:2671-2689     ← Error handler
server/routes.ts:2691-2703     ← Production validation
```

### Variáveis de Ambiente

```
CORS_ORIGINS                   ← Lista de origens permitidas
NODE_ENV                       ← development | production
PORT                           ← Porta do servidor (padrão: 5000)
```

---

## 🆘 Suporte

### Problemas Comuns

1. **"Origin not allowed by CORS"**
   - Adicione a origem ao `CORS_ORIGINS`

2. **"Headers não aparecem"**
   - Verifique ordem: CORS antes do Helmet

3. **"Wildcard não funciona"**
   - Use formato: `https://*.domain.com`

4. **"Cookies não funcionam"**
   - Verifique `credentials: true`

### Debug Avançado

```bash
# Ver request completo
curl -v -H "Origin: http://localhost:5000" http://localhost:5000/api/health

# Ver apenas headers
curl -I -H "Origin: http://localhost:5000" http://localhost:5000/api/health

# Testar preflight
curl -v -X OPTIONS \
  -H "Origin: http://localhost:5000" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost:5000/api/leads
```

---

**✅ CORS Configurado e Pronto para Uso!**

Para detalhes completos, consulte: `CORS_IMPLEMENTATION.md`

# WhatsApp Webhook - Referência Rápida

## Setup Rápido (5 minutos)

### 1. Configurar Variáveis de Ambiente

```bash
# Gerar verify token
VERIFY_TOKEN=$(openssl rand -base64 32)

# Adicionar ao .env
cat >> .env << EOF
WHATSAPP_APP_SECRET=seu-app-secret-do-meta-console
WHATSAPP_VERIFY_TOKEN=$VERIFY_TOKEN
EOF
```

### 2. Obter App Secret

1. [Meta Developer Console](https://developers.facebook.com/apps) → Seu App
2. **Settings** → **Basic** → **App Secret** → **Show**
3. Copie e cole no `.env`

### 3. Configurar Webhook no Meta Console

```
URL: https://seu-dominio.com/api/webhooks/whatsapp
Verify Token: [valor do WHATSAPP_VERIFY_TOKEN]
```

**Subscribe to:** `messages`, `message_status`

---

## Endpoints

### GET `/api/webhooks/whatsapp`
**Uso:** Webhook verification (automático pelo WhatsApp)

**Query params:**
- `hub.mode=subscribe`
- `hub.verify_token=<seu-token>`
- `hub.challenge=<random-string>`

**Response:** `200` com challenge

---

### POST `/api/webhooks/whatsapp`
**Uso:** Receber mensagens e status updates

**Headers:**
- `Content-Type: application/json`
- `x-hub-signature-256: sha256=<hmac>`

**Body:** Webhook payload do WhatsApp

**Response:** `200 {"success": true}`

---

## Segurança

### Validações Implementadas

✅ **Signature Validation (POST)**
```typescript
// HMAC SHA-256 com timing-safe comparison
crypto.timingSafeEqual(receivedSignature, expectedSignature)
```

✅ **Verify Token Validation (GET)**
```typescript
// Challenge-response
if (mode === "subscribe" && token === verifyToken) {
  return challenge;
}
```

✅ **Fail-Fast**
```typescript
// Rejeita imediatamente se secrets não configurados
if (!appSecret) return 500;
if (!signature) return 401;
if (!isValid) return 401;
```

---

## Códigos de Status

| Código | Quando                           | Ação                              |
|--------|----------------------------------|-----------------------------------|
| 200    | Webhook válido                   | Processado com sucesso            |
| 401    | Signature inválida ou ausente    | Verificar App Secret              |
| 403    | Verify token incorreto           | Verificar Verify Token            |
| 500    | Secrets não configurados         | Configurar variáveis de ambiente  |

---

## Testes

### Testar Localmente

```bash
# Executar testes automatizados
./scripts/test-whatsapp-webhook.sh

# Ou manualmente:

# 1. Testar verification
curl "http://localhost:5000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=seu-token&hub.challenge=test"

# 2. Testar signature
PAYLOAD='{"object":"whatsapp_business_account"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "seu-app-secret" | awk '{print $2}')

curl -X POST http://localhost:5000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

---

## Troubleshooting

### Problema: "WHATSAPP_APP_SECRET not configured"

```bash
# Verificar se está no .env
grep WHATSAPP_APP_SECRET .env

# Se não estiver, adicionar
echo "WHATSAPP_APP_SECRET=seu-app-secret" >> .env
```

### Problema: "Invalid signature"

1. Verificar App Secret no Meta Console
2. Verificar se não há espaços extras
3. Testar com script de validação

```bash
# Debug signature
node -e "
const crypto = require('crypto');
const secret = process.env.WHATSAPP_APP_SECRET;
const payload = JSON.stringify({object: 'test'});
const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('Expected signature:', sig);
"
```

### Problema: "Webhook verification failed"

1. Verificar Verify Token
2. Confirmar que é o mesmo no Meta Console
3. Testar manualmente

```bash
# Testar verification
curl -v "http://localhost:5000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=$(grep WHATSAPP_VERIFY_TOKEN .env | cut -d'=' -f2)&hub.challenge=test"
```

---

## Logs

### Verificar Logs de Validação

```bash
# Filtrar logs do WhatsApp
grep "\[WHATSAPP\]" logs/server.log

# Logs esperados:
# ✓ [WHATSAPP] Webhook verified successfully
# ✓ [WHATSAPP] Processing WhatsApp webhook
# ✗ [WHATSAPP] Invalid webhook signature
# ✗ [WHATSAPP] Webhook verification failed
```

### Habilitar Logs Detalhados

```bash
# Adicionar ao .env
DEBUG=whatsapp:*
LOG_LEVEL=debug
```

---

## Checklist de Produção

- [ ] `WHATSAPP_APP_SECRET` configurado em produção
- [ ] `WHATSAPP_VERIFY_TOKEN` configurado em produção
- [ ] Webhook URL usa HTTPS
- [ ] Webhook configurado no Meta Developer Console
- [ ] Subscriptions ativadas: `messages`, `message_status`
- [ ] Testes de signature validation passando
- [ ] Logs de segurança habilitados
- [ ] Rate limiting configurado
- [ ] Monitoramento de webhooks ativo

---

## Recursos

- 📖 [Documentação Completa](./WHATSAPP_WEBHOOK_SECURITY_SETUP.md)
- 🔧 [Script de Teste](../scripts/test-whatsapp-webhook.sh)
- 🌐 [WhatsApp API Docs](https://developers.facebook.com/docs/whatsapp)
- 🔒 [OWASP Crypto Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

## Comandos Úteis

```bash
# Gerar verify token
openssl rand -base64 32

# Gerar app secret (se necessário)
openssl rand -hex 32

# Validar configuração
env | grep WHATSAPP

# Testar webhook
./scripts/test-whatsapp-webhook.sh

# Ver logs em tempo real
tail -f logs/server.log | grep WHATSAPP
```

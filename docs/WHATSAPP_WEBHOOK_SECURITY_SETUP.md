# WhatsApp Webhook Security - Guia de Configuração

## Visão Geral

Este guia explica como configurar a validação de assinatura de webhook do WhatsApp Business API para garantir que apenas requisições autênticas do WhatsApp sejam processadas.

## Recursos de Segurança Implementados

### ✅ Validação de Assinatura (POST)
- **HMAC SHA-256**: Cada webhook é assinado pelo WhatsApp usando HMAC SHA-256
- **Timing-Safe Comparison**: Proteção contra timing attacks
- **Fail-Fast**: Rejeita imediatamente se secrets não configurados
- **Logging Detalhado**: Registra todas as tentativas de validação

### ✅ Verificação de Webhook (GET)
- **Challenge-Response**: Verifica a propriedade do endpoint
- **Token Validation**: Valida token de verificação configurado
- **Auto-configuração**: WhatsApp configura o webhook automaticamente

---

## Configuração no Meta Developer Console

### Passo 1: Obter o App Secret

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Navegue até **My Apps** > Selecione seu app
3. No menu lateral, vá em **Settings** > **Basic**
4. Localize o campo **App Secret**
5. Clique em **Show** e copie o valor
6. **IMPORTANTE**: Este é um valor SECRETO - nunca compartilhe ou commite no git

### Passo 2: Criar o Verify Token

1. Gere um token aleatório forte. Use um dos comandos abaixo:

```bash
# Usando OpenSSL
openssl rand -base64 32

# Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Usando Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. Guarde este token - você vai usá-lo na configuração do webhook

### Passo 3: Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```bash
# WhatsApp Webhook Security
WHATSAPP_APP_SECRET=abc123def456...  # Valor copiado do Meta Developer Console
WHATSAPP_VERIFY_TOKEN=xyz789uvw012...  # Token aleatório que você gerou
```

**⚠️ IMPORTANTE**:
- Nunca commite o arquivo `.env` no git
- Use o `.env.example` como template
- Em produção (Vercel), configure via Environment Variables

### Passo 4: Configurar Webhook no Meta Developer Console

1. No Meta Developer Console, vá em **WhatsApp** > **Configuration**
2. Na seção **Webhooks**, clique em **Edit**
3. Configure os valores:

```
Callback URL: https://seu-dominio.com/api/webhooks/whatsapp
Verify Token: [O mesmo valor que você colocou em WHATSAPP_VERIFY_TOKEN]
```

4. Clique em **Verify and Save**
5. O WhatsApp vai enviar um GET request para validar o endpoint
6. Se configurado corretamente, você verá ✅ **Verified**

### Passo 5: Inscrever em Webhook Fields

1. Ainda na configuração de Webhooks
2. Clique em **Manage** na seção **Webhook Fields**
3. Inscreva-se nos seguintes campos:
   - ✅ **messages** - Receber mensagens enviadas pelos usuários
   - ✅ **message_status** - Receber atualizações de status (enviado, entregue, lido)

4. Clique em **Subscribe**

---

## Validação da Implementação

### Fluxo de Verificação (GET Request)

```
┌─────────────┐              ┌──────────────────┐
│  WhatsApp   │              │  Seu Servidor    │
│   (Meta)    │              │  (ImobiBase)     │
└─────────────┘              └──────────────────┘
       │                              │
       │  GET /api/webhooks/whatsapp  │
       │  ?hub.mode=subscribe         │
       │  &hub.verify_token=xyz789... │
       │  &hub.challenge=random123    │
       │─────────────────────────────>│
       │                              │
       │                              │ 1. Valida verify_token
       │                              │ 2. Se válido, retorna challenge
       │                              │
       │  HTTP 200 "random123"        │
       │<─────────────────────────────│
       │                              │
```

### Fluxo de Webhook (POST Request)

```
┌─────────────┐              ┌──────────────────┐
│  WhatsApp   │              │  Seu Servidor    │
│   (Meta)    │              │  (ImobiBase)     │
└─────────────┘              └──────────────────┘
       │                              │
       │  POST /api/webhooks/whatsapp │
       │  Header: x-hub-signature-256 │
       │  Body: {...webhook payload}  │
       │─────────────────────────────>│
       │                              │
       │                              │ 1. Extrai signature do header
       │                              │ 2. Calcula HMAC SHA-256 do body
       │                              │ 3. Compara com timing-safe
       │                              │ 4. Se válido, processa webhook
       │                              │
       │  HTTP 200 {"success": true}  │
       │<─────────────────────────────│
       │                              │
```

---

## Testando a Configuração

### 1. Testar Webhook Verification (GET)

```bash
# Simular request do WhatsApp
curl -X GET "http://localhost:5000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=seu-verify-token&hub.challenge=test123"

# Deve retornar: test123
```

### 2. Testar Webhook Signature (POST)

```bash
# Gerar signature válida
node -e "
const crypto = require('crypto');
const secret = 'seu-app-secret';
const payload = JSON.stringify({object: 'whatsapp_business_account'});
const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('Signature:', signature);
"

# Enviar request com signature
curl -X POST http://localhost:5000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=..." \
  -d '{"object":"whatsapp_business_account"}'
```

### 3. Verificar Logs

```bash
# Procurar por logs de validação
grep "WHATSAPP" logs/server.log

# Logs esperados:
# [WHATSAPP] Webhook verified successfully
# [WHATSAPP] Webhook signature validated
```

---

## Monitoramento e Troubleshooting

### Erros Comuns

#### ❌ "WHATSAPP_APP_SECRET not configured"

**Causa**: Variável de ambiente não configurada
**Solução**: Adicione `WHATSAPP_APP_SECRET` ao `.env`

```bash
# Verificar se está configurado
echo $WHATSAPP_APP_SECRET
```

#### ❌ "Invalid signature"

**Causa**: Signature inválida ou App Secret incorreto
**Solução**:
1. Verifique se o `WHATSAPP_APP_SECRET` está correto
2. Confirme que está usando o App Secret do app correto no Meta Developer Console
3. Verifique se não há espaços extras no valor

#### ❌ "Webhook verification failed"

**Causa**: Token de verificação não corresponde
**Solução**:
1. Verifique se `WHATSAPP_VERIFY_TOKEN` no `.env` é o mesmo configurado no Meta Developer Console
2. Certifique-se de que não há espaços extras

#### ❌ "Missing signature"

**Causa**: Request não veio do WhatsApp
**Solução**: Confirme que o webhook está configurado corretamente no Meta Developer Console

### Checklist de Segurança

- [ ] `WHATSAPP_APP_SECRET` configurado e NUNCA commitado no git
- [ ] `WHATSAPP_VERIFY_TOKEN` configurado e corresponde ao valor no Meta Developer Console
- [ ] Webhook URL usa HTTPS em produção (obrigatório pelo WhatsApp)
- [ ] Signature validation implementada em todos os webhooks POST
- [ ] Timing-safe comparison usado para evitar timing attacks
- [ ] Logs de segurança habilitados para auditoria
- [ ] Rate limiting implementado para prevenir DDoS
- [ ] Firewall configurado para aceitar apenas IPs do WhatsApp (opcional mas recomendado)

---

## Configuração em Produção (Vercel)

### Environment Variables

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione as variáveis:

```
WHATSAPP_APP_SECRET     = [valor do Meta Developer Console]
WHATSAPP_VERIFY_TOKEN   = [token aleatório gerado]
```

5. Selecione os ambientes: **Production**, **Preview**, **Development**
6. Clique em **Save**

### Redeploy

```bash
# Redeploy para aplicar as novas variáveis
vercel --prod
```

---

## Conformidade e Boas Práticas

### OWASP Top 10

✅ **A02:2021 – Cryptographic Failures**
- Uso de HMAC SHA-256 para validação
- Secrets armazenados em variáveis de ambiente
- Timing-safe comparison implementado

✅ **A07:2021 – Identification and Authentication Failures**
- Validação de assinatura em todas as requisições
- Fail-fast se credentials não configurados

✅ **A09:2021 – Security Logging and Monitoring Failures**
- Logs detalhados de tentativas de validação
- Alertas para falhas de autenticação

### WhatsApp Business API Best Practices

✅ **Webhook Security**
- Signature validation obrigatória
- HTTPS obrigatório em produção
- Verify token único e aleatório

✅ **Error Handling**
- Respostas apropriadas (401, 403, 500)
- Nunca expor detalhes internos em erros
- Logging centralizado

---

## Referências

- [WhatsApp Business Platform - Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Meta - Webhook Security](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)
- [OWASP - Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do servidor
2. Consulte a documentação oficial do WhatsApp
3. Revise este guia de configuração
4. Abra uma issue no repositório do projeto

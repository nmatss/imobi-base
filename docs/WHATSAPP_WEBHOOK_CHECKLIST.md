# WhatsApp Webhook - Checklist de Configuração

Use este checklist para configurar o webhook do WhatsApp Business API de forma rápida e segura.

---

## 📋 Checklist Completo

### 1️⃣ Configuração Local

- [ ] **Gerar Verify Token**
  ```bash
  openssl rand -base64 32
  ```
  Copie o resultado para usar no próximo passo.

- [ ] **Obter App Secret do Meta Developer Console**
  1. Acesse [developers.facebook.com](https://developers.facebook.com/apps)
  2. Selecione seu app WhatsApp
  3. Settings → Basic → App Secret → Show
  4. Copie o valor

- [ ] **Adicionar variáveis ao .env**
  ```bash
  echo "WHATSAPP_APP_SECRET=cole-o-app-secret-aqui" >> .env
  echo "WHATSAPP_VERIFY_TOKEN=cole-o-verify-token-aqui" >> .env
  ```

- [ ] **Verificar se as variáveis foram adicionadas**
  ```bash
  grep WHATSAPP .env
  ```

- [ ] **Reiniciar servidor de desenvolvimento**
  ```bash
  npm run dev
  ```

---

### 2️⃣ Teste Local

- [ ] **Executar script de testes**
  ```bash
  ./scripts/test-whatsapp-webhook.sh
  ```

- [ ] **Executar testes unitários**
  ```bash
  npm test -- tests/unit/backend/whatsapp-webhook.test.ts
  ```

- [ ] **Verificar logs**
  ```bash
  # Deve mostrar as variáveis configuradas
  grep "WHATSAPP" .env
  ```

---

### 3️⃣ Deploy em Produção (Vercel)

- [ ] **Configurar WHATSAPP_APP_SECRET no Vercel**
  1. [Vercel Dashboard](https://vercel.com/dashboard)
  2. Selecione seu projeto
  3. Settings → Environment Variables
  4. Add: `WHATSAPP_APP_SECRET` = [valor do Meta Console]
  5. Ambientes: Production, Preview, Development

- [ ] **Configurar WHATSAPP_VERIFY_TOKEN no Vercel**
  1. Settings → Environment Variables
  2. Add: `WHATSAPP_VERIFY_TOKEN` = [token gerado]
  3. Ambientes: Production, Preview, Development

- [ ] **Redeploy da aplicação**
  ```bash
  npm run deploy:production
  ```

- [ ] **Verificar URL de produção**
  ```
  https://seu-dominio.com/api/webhooks/whatsapp
  ```

---

### 4️⃣ Configuração no Meta Developer Console

- [ ] **Acessar WhatsApp Configuration**
  1. [Meta Developer Console](https://developers.facebook.com/apps)
  2. Seu App → WhatsApp → Configuration

- [ ] **Configurar Webhook**
  1. Seção "Webhooks" → Edit
  2. Callback URL: `https://seu-dominio.com/api/webhooks/whatsapp`
  3. Verify Token: [mesmo valor de WHATSAPP_VERIFY_TOKEN]
  4. Click: "Verify and Save"

- [ ] **Aguardar Verificação**
  - Status deve mudar para ✅ "Verified"
  - Se falhar, verificar logs do Vercel

- [ ] **Inscrever em Webhook Fields**
  1. Manage → Webhook Fields
  2. ✅ Subscribe to: `messages`
  3. ✅ Subscribe to: `message_status`
  4. Save

---

### 5️⃣ Teste em Produção

- [ ] **Enviar mensagem de teste via WhatsApp**
  - Envie uma mensagem para o número configurado
  - Exemplo: "Olá, gostaria de informações"

- [ ] **Verificar webhook recebido**
  ```bash
  # Verificar logs no Vercel
  vercel logs
  ```

- [ ] **Verificar logs de validação**
  - Procurar por: `[WHATSAPP] Processing WhatsApp webhook`
  - Procurar por: `[WHATSAPP] Incoming WhatsApp message`

- [ ] **Verificar no banco de dados**
  - Verificar se a mensagem foi salva em `whatsapp_messages`
  - Verificar se a conversa foi criada em `whatsapp_conversations`

---

### 6️⃣ Monitoramento e Alertas

- [ ] **Configurar Sentry (Error Tracking)**
  - Adicionar SENTRY_DSN ao .env
  - Verificar erros em tempo real

- [ ] **Configurar Logs**
  - Verificar logs no Vercel Dashboard
  - Configurar alertas para erros 401/403

- [ ] **Configurar Uptime Monitoring**
  - Use [UptimeRobot](https://uptimerobot.com/) ou similar
  - Monitorar endpoint: `/api/webhooks/whatsapp`

---

### 7️⃣ Segurança

- [ ] **Verificar HTTPS habilitado**
  - URL deve começar com `https://`
  - Certificado SSL válido

- [ ] **Verificar secrets não commitados**
  ```bash
  git status
  # .env NÃO deve aparecer na lista
  ```

- [ ] **Verificar .gitignore**
  ```bash
  grep ".env" .gitignore
  # Deve retornar: .env
  ```

- [ ] **Testar signature inválida**
  - Enviar POST com signature errada
  - Deve retornar 401 Unauthorized

- [ ] **Testar sem signature**
  - Enviar POST sem header `x-hub-signature-256`
  - Deve retornar 401 Unauthorized

---

## ✅ Verificação Final

### Status Esperado

```
✅ Variáveis de ambiente configuradas
✅ Testes unitários passando (29/29)
✅ Script de teste executando sem erros
✅ Deploy em produção bem-sucedido
✅ Webhook verificado no Meta Console
✅ Subscriptions ativas (messages, message_status)
✅ Mensagem de teste recebida
✅ Logs mostrando validação bem-sucedida
✅ HTTPS habilitado
✅ Secrets não commitados
```

### Troubleshooting

Se algo falhar, consulte:
- 📖 [Guia Completo](./WHATSAPP_WEBHOOK_SECURITY_SETUP.md) - Seção "Troubleshooting"
- 📋 [Referência Rápida](./WHATSAPP_WEBHOOK_QUICK_REFERENCE.md) - Seção "Troubleshooting"

---

## 🚀 Próximos Passos

Após completar este checklist:

1. **Documentar Configuração**
   - Salvar tokens em gerenciador de senhas seguro
   - Documentar webhook URL

2. **Configurar Rate Limiting**
   - Implementar limite de requisições por IP
   - Configurar throttling

3. **Implementar Monitoramento**
   - Dashboard de métricas de webhooks
   - Alertas para falhas

4. **Treinar Equipe**
   - Compartilhar documentação
   - Realizar treinamento sobre o sistema

---

## 📞 Suporte

Problemas? Consulte:
- [Setup Completo](./WHATSAPP_WEBHOOK_SECURITY_SETUP.md)
- [Referência Rápida](./WHATSAPP_WEBHOOK_QUICK_REFERENCE.md)
- [WhatsApp API Docs](https://developers.facebook.com/docs/whatsapp)

---

**Data de Criação:** 26/12/2025
**Versão:** 1.0.0
**Status:** ✅ Pronto para Produção

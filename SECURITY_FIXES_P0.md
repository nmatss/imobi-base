# CORREÇÕES DE SEGURANÇA PRIORITÁRIAS (P0)

**IMPLEMENTAR ANTES DE PRODUÇÃO**

---

## Fix 1: Validação Obrigatória de SESSION_SECRET

### Arquivo: `/server/routes.ts`

**Localização:** Linhas 187-190

**ANTES:**
```typescript
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === "imobibase-secret-key-change-in-production") {
  console.warn('⚠️ WARNING: Using default SESSION_SECRET. Set SESSION_SECRET environment variable in production!');
}
```

**DEPOIS:**
```typescript
const sessionSecret = process.env.SESSION_SECRET;

// Validação rigorosa em produção
if (process.env.NODE_ENV === 'production') {
  // 1. Verificar se existe
  if (!sessionSecret) {
    console.error('❌ FATAL: SESSION_SECRET environment variable is required in production');
    console.error('Generate a strong secret with: openssl rand -base64 64');
    process.exit(1);
  }

  // 2. Verificar se não é o valor padrão
  const defaultSecrets = [
    'imobibase-secret-key-change-in-production',
    'your-super-secret-session-key-change-in-production',
    'your-secret-key-change-in-production',
  ];

  if (defaultSecrets.includes(sessionSecret)) {
    console.error('❌ FATAL: Default SESSION_SECRET not allowed in production');
    console.error('Generate a strong secret with: openssl rand -base64 64');
    process.exit(1);
  }

  // 3. Verificar comprimento mínimo
  if (sessionSecret.length < 32) {
    console.error('❌ FATAL: SESSION_SECRET must be at least 32 characters');
    console.error(`Current length: ${sessionSecret.length}`);
    console.error('Generate a strong secret with: openssl rand -base64 64');
    process.exit(1);
  }

  console.log('✅ SESSION_SECRET validated successfully');
} else {
  // Em desenvolvimento, apenas avisar
  if (!sessionSecret || defaultSecrets.includes(sessionSecret)) {
    console.warn('⚠️ WARNING: Using default SESSION_SECRET in development');
    console.warn('For production, generate with: openssl rand -base64 64');
  }
}
```

### Verificação

```bash
# Deve falhar se SESSION_SECRET não estiver configurado
NODE_ENV=production npm start

# Deve falhar se SESSION_SECRET for padrão
SESSION_SECRET="imobibase-secret-key-change-in-production" NODE_ENV=production npm start

# Deve falhar se SESSION_SECRET for muito curto
SESSION_SECRET="short" NODE_ENV=production npm start

# Deve funcionar com secret válido
SESSION_SECRET="$(openssl rand -base64 64)" NODE_ENV=production npm start
```

---

## Fix 2: Gerar e Configurar SESSION_SECRET

### Passo 1: Gerar Secret Forte

```bash
# Gerar secret criptograficamente seguro (64 bytes = ~86 caracteres)
openssl rand -base64 64

# OU usar o script fornecido
bash scripts/generate-secrets.sh
```

**Exemplo de output:**
```
hK7mN9pQ2rS5tV8wX0yZ3aB6cD9eF2gH5jK8lM1nO4pQ7rS0tU3vW6xY9zA2bC5dE8fG1hI4jK7m
```

### Passo 2: Configurar Localmente

**Arquivo:** `.env` (na raiz do projeto)

```bash
# Adicionar ao .env
SESSION_SECRET=hK7mN9pQ2rS5tV8wX0yZ3aB6cD9eF2gH5jK8lM1nO4pQ7rS0tU3vW6xY9zA2bC5dE8fG1hI4jK7m
```

**IMPORTANTE:**
- ❌ NUNCA commitar o arquivo `.env`
- ✅ `.env` já está em `.gitignore`
- ✅ Usar valores diferentes para dev/staging/production

### Passo 3: Configurar em Produção (Vercel)

```bash
# Via CLI do Vercel
vercel env add SESSION_SECRET production

# Cole o secret gerado quando solicitado

# Verificar
vercel env ls
```

### Passo 4: Configurar em Produção (Outras Plataformas)

**Docker / Docker Compose:**
```yaml
# docker-compose.yml
services:
  app:
    environment:
      - SESSION_SECRET=${SESSION_SECRET}
```

```bash
# .env.production
SESSION_SECRET=hK7mN9pQ2rS5tV8wX0yZ3aB6cD9eF2gH5jK8lM1nO4pQ7rS0tU3vW6xY9zA2bC5dE8fG1hI4jK7m
```

**Heroku:**
```bash
heroku config:set SESSION_SECRET="hK7mN9pQ2rS5tV8wX0yZ3aB6cD9eF2gH5jK8lM1nO4pQ7rS0tU3vW6xY9zA2bC5dE8fG1hI4jK7m"
```

**AWS / GCP / Azure:**
- Usar secrets manager do respectivo cloud provider
- AWS: AWS Secrets Manager
- GCP: Google Secret Manager
- Azure: Azure Key Vault

---

## Verificação Final

### Checklist de Validação

- [ ] Código de validação adicionado em `/server/routes.ts`
- [ ] SESSION_SECRET gerado com `openssl rand -base64 64`
- [ ] SESSION_SECRET adicionado ao `.env` local
- [ ] SESSION_SECRET configurado em produção (Vercel/outro)
- [ ] `.env` está em `.gitignore` (verificar)
- [ ] Testado startup em produção com secret válido
- [ ] Testado startup em produção SEM secret (deve falhar)
- [ ] Testado startup em produção com secret padrão (deve falhar)
- [ ] Testado startup em produção com secret curto (deve falhar)

### Script de Teste

```bash
#!/bin/bash

echo "🧪 Testando validação de SESSION_SECRET..."

# Test 1: Sem SESSION_SECRET
echo "Test 1: Sem SESSION_SECRET (deve falhar)"
unset SESSION_SECRET
NODE_ENV=production npm start &
sleep 3
if ps aux | grep -q "npm start"; then
  echo "❌ FALHOU: App iniciou sem SESSION_SECRET"
  pkill -f "npm start"
else
  echo "✅ PASSOU: App não iniciou sem SESSION_SECRET"
fi

# Test 2: SESSION_SECRET padrão
echo "Test 2: SESSION_SECRET padrão (deve falhar)"
export SESSION_SECRET="imobibase-secret-key-change-in-production"
NODE_ENV=production npm start &
sleep 3
if ps aux | grep -q "npm start"; then
  echo "❌ FALHOU: App iniciou com SESSION_SECRET padrão"
  pkill -f "npm start"
else
  echo "✅ PASSOU: App não iniciou com SESSION_SECRET padrão"
fi

# Test 3: SESSION_SECRET curto
echo "Test 3: SESSION_SECRET curto (deve falhar)"
export SESSION_SECRET="short"
NODE_ENV=production npm start &
sleep 3
if ps aux | grep -q "npm start"; then
  echo "❌ FALHOU: App iniciou com SESSION_SECRET curto"
  pkill -f "npm start"
else
  echo "✅ PASSOU: App não iniciou com SESSION_SECRET curto"
fi

# Test 4: SESSION_SECRET válido
echo "Test 4: SESSION_SECRET válido (deve funcionar)"
export SESSION_SECRET="$(openssl rand -base64 64)"
NODE_ENV=production npm start &
sleep 5
if ps aux | grep -q "npm start"; then
  echo "✅ PASSOU: App iniciou com SESSION_SECRET válido"
  pkill -f "npm start"
else
  echo "❌ FALHOU: App não iniciou com SESSION_SECRET válido"
fi

echo "🏁 Testes concluídos!"
```

---

## Rotação de Secrets (Opcional mas Recomendado)

### Quando Rotacionar

- ✅ A cada 90 dias (recomendado)
- ✅ Após suspeita de comprometimento
- ✅ Após saída de funcionário com acesso
- ✅ Como parte de auditoria de segurança

### Como Rotacionar

1. **Gerar novo secret**
   ```bash
   openssl rand -base64 64
   ```

2. **Atualizar em produção**
   ```bash
   vercel env add SESSION_SECRET production
   # Cole o novo secret
   ```

3. **Deploy com novo secret**
   ```bash
   vercel deploy --prod
   ```

4. **Verificar que usuários conseguem logar**
   - ⚠️ Usuários com sessões ativas serão deslogados
   - ✅ Normal e esperado após rotação

5. **Documentar rotação**
   ```bash
   echo "$(date): SESSION_SECRET rotacionado" >> secrets-rotation.log
   ```

---

## Troubleshooting

### Problema: App não inicia em produção

**Erro:**
```
❌ FATAL: SESSION_SECRET environment variable is required in production
```

**Solução:**
```bash
# Verificar se variável está definida
echo $SESSION_SECRET

# Se vazio, adicionar ao .env ou configurar no provider
export SESSION_SECRET="$(openssl rand -base64 64)"
```

### Problema: Usuários deslogados após deploy

**Causa:** SESSION_SECRET foi alterado

**Solução:** Normal após rotação de secret. Usuários precisam fazer login novamente.

### Problema: "Default SESSION_SECRET not allowed"

**Causa:** Usando valor do `.env.example`

**Solução:**
```bash
# Gerar novo secret
openssl rand -base64 64

# Atualizar .env
vim .env
# Substituir SESSION_SECRET pelo valor gerado
```

---

## Segurança Adicional

### Armazenamento de Secrets

**❌ NÃO FAZER:**
```bash
# Commitar .env
git add .env
git commit -m "Add environment variables"

# Hardcode no código
const SESSION_SECRET = "my-secret-key";

# Compartilhar via email/Slack
```

**✅ FAZER:**
```bash
# Usar .gitignore
echo ".env" >> .gitignore

# Usar secrets manager
vercel env add SESSION_SECRET production

# Compartilhar via 1Password / Vault
```

### Backup de Secrets

```bash
# Exportar secrets (CUIDADO: arquivo sensível)
vercel env pull .env.production

# Armazenar em local seguro (1Password, Vault)
# NUNCA commitar este arquivo
```

---

## Compliance

### LGPD/GDPR

- ✅ Session secrets são criptografados
- ✅ Rotação regular implementável
- ✅ Auditoria de acesso possível
- ✅ Não expõe dados de usuários

### SOC 2

- ✅ Secrets management documentado
- ✅ Acesso controlado
- ✅ Rotação agendada
- ✅ Logs de mudanças

---

## Referências

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [NIST Secret Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [Express Session Security](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Última Atualização:** 25 de Dezembro de 2025
**Prioridade:** P0 (CRÍTICO)
**Tempo Estimado:** 10 minutos
**Impacto:** ALTO - Previne comprometimento de sessões

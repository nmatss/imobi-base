# Security Quick Start - ImobiBase

**AÇÕES IMEDIATAS ANTES DO PRÓXIMO DEPLOY**

---

## 1. Verificar se .env foi commitado

```bash
git log --all --full-history -- .env .env.development .env.production .env.staging
```

**Se retornar commits**: EMERGÊNCIA - Secrets vazados!
- Execute as instruções da seção 3.1 do AGENTE_1_SECURITY_IMPLEMENTATION_REPORT.md
- Rotacione TODOS os secrets IMEDIATAMENTE

**Se não retornar nada**: Você está seguro, continue para o passo 2.

---

## 2. Gerar Secrets para Produção

```bash
# Executar script
./scripts/generate-secrets.sh

# Copiar output para .env.production
# Atualizar environment variables no Vercel/hosting
```

---

## 3. Proteger .env Files

```bash
chmod 600 .env
chmod 600 .env.development
chmod 600 .env.production
chmod 600 .env.staging
```

---

## 4. Verificar Security

```bash
# Não deve retornar .env files (exceto .env.example)
git ls-files | grep "\.env"

# Audit dependencies
npm audit --production

# Verificar CSP
grep "unsafe-eval" server/routes.ts  # Deve retornar VAZIO
```

---

## 5. Deploy Checklist

- [ ] Secrets gerados e atualizados
- [ ] .env files com permissões 600
- [ ] npm audit passou
- [ ] CSP testado em staging
- [ ] Environment variables atualizadas no hosting

---

## 6. Pós-Deploy

```bash
# Testar CSP headers
curl -I https://your-domain.com | grep "content-security-policy"

# Testar security headers
curl -I https://your-domain.com | grep -i "strict-transport-security"
```

**Testes Online**:
- https://observatory.mozilla.org/analyze/your-domain.com
- https://securityheaders.com/?q=your-domain.com

**Meta**: Grade A ou A+

---

## Documentação Completa

- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) - Checklist completo
- [AGENTE_1_SECURITY_IMPLEMENTATION_REPORT.md](./AGENTE_1_SECURITY_IMPLEMENTATION_REPORT.md) - Relatório detalhado
- [SECURITY.md](./SECURITY.md) - Política de segurança

---

## Emergência - Secrets Vazados

```bash
# 1. Remover .env do git
git rm --cached .env .env.*
git commit -m "security: Remove leaked .env files"

# 2. Gerar novos secrets
./scripts/generate-secrets.sh

# 3. Rotacionar TODAS as API keys
# - Stripe Dashboard
# - SendGrid Dashboard
# - Google Cloud Console
# - Supabase Dashboard
# - Outros serviços

# 4. Atualizar .env.production com novos valores

# 5. Deploy imediato

# 6. Monitorar logs por 48 horas
```

**Contato**: security@imobibase.com

# 🚀 Production Setup Guide

Este guia explica como configurar o ImobiBase para produção com **dados reais**, sem dados de demonstração.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Remover Dados Demo](#remover-dados-demo)
3. [Inicializar Banco de Produção](#inicializar-banco-de-produção)
4. [Configurações Padrão](#configurações-padrão)
5. [Próximos Passos](#próximos-passos)

---

## 🎯 Visão Geral

O sistema ImobiBase vem com dados de demonstração para facilitar o desenvolvimento e testes. Para usar em produção com dados reais:

1. **Limpar dados demo** (opcional, se já tem dados demo)
2. **Inicializar com dados reais** da sua imobiliária
3. **Configurar integrações** e personalizações

---

## 🧹 Remover Dados Demo

Se você já tem o banco com dados de demonstração e quer começar do zero:

```bash
# ⚠️ ATENÇÃO: Isto irá DELETAR todos os dados!
tsx server/clean-demo-data.ts
```

Você precisará confirmar digitando `DELETE ALL` para prosseguir.

### O que será removido:

- ✅ Tenants demo (Imobiliária Sol, Nova Casa, etc.)
- ✅ Usuários demo (admin@demo.com, etc.)
- ✅ Propriedades de exemplo
- ✅ Leads de teste
- ✅ Contratos, visitas e todos os dados relacionados

### O que será mantido:

- ✅ Estrutura do banco de dados (tabelas, índices)
- ✅ Migrations aplicadas
- ✅ Configurações do sistema

---

## 🏢 Inicializar Banco de Produção

Após limpar (ou em um banco novo), inicialize com seus dados reais:

```bash
tsx server/init-production-db.ts
```

### Informações que serão solicitadas:

1. **Dados da Empresa:**
   - Nome da empresa
   - Slug (URL-friendly, ex: "minha-imobiliaria")
   - Email de contato
   - Telefone
   - Endereço

2. **Primeiro Administrador:**
   - Nome do admin
   - Email do admin
   - Senha

### Exemplo de execução:

```bash
$ tsx server/init-production-db.ts

🚀 Initializing PRODUCTION database...
⚠️  This will create ONLY essential data, NO demo/mock data

📝 Creating first tenant...
Please enter your company information:

Company Name: Imobiliária Premium
Company Slug: premium
Company Email: contato@premium.com.br
Company Phone: (11) 3000-0000
Company Address: Av. Paulista, 1000 - São Paulo, SP

Admin Name: José Silva
Admin Email: jose@premium.com.br
Admin Password: ********

✅ Tenant "Imobiliária Premium" created
✅ Default roles created
✅ Default finance categories created
✅ Tenant settings created
✅ AI settings created
✅ Notification preferences created
✅ Admin user "José Silva" created

🎉 Production database initialized successfully!

📋 Login credentials:
   Email: jose@premium.com.br
   Password: ********

🌐 Access your system at: /login
```

---

## ⚙️ Configurações Padrão

O script `init-production-db.ts` cria automaticamente:

### 1. **Roles (Funções de Usuário)**

- 👑 **Administrador** - Acesso total
- 👔 **Gestor** - Gestão geral sem exclusões
- 🏠 **Corretor** - Foco em imóveis e leads
- 💰 **Financeiro** - Gestão financeira e locações

### 2. **Categorias Financeiras**

**Receitas:**

- Comissão de Venda
- Taxa de Administração
- Taxa de Locação
- Multas e Juros
- Serviços Extras

**Despesas:**

- Salários e Encargos
- Marketing e Publicidade
- Manutenção de Imóveis
- Escritório e Infraestrutura
- Taxas e Impostos
- Comissões a Pagar
- Serviços Profissionais

### 3. **Configurações IA**

- 🌐 Idioma: pt-BR
- 💼 Tom: Profissional
- ✅ Corretores podem editar sugestões da IA
- 📝 Presets para cada módulo (propriedades, leads, contratos, etc.)

### 4. **Preferências de Notificação**

Notificações automáticas para:

- 📧 Novo lead criado
- 📊 Mudança de status de lead
- 💳 Pagamentos de aluguel (vencendo, vencidos, recebidos)
- 📄 Contratos (expirando, assinados)
- 🏠 Visitas agendadas

### 5. **Configurações do Tenant**

- ⏰ Fuso horário: America/Sao_Paulo
- 🕐 Horário comercial padrão (Seg-Sex 9h-18h, Sáb 9h-13h)
- 🌐 Portal público configurado
- 🔍 SEO básico configurado

---

## 📊 Próximos Passos

Após inicializar o banco com dados reais:

### 1. **Login no Sistema**

```
URL: http://localhost:5000/login
Email: [seu-email-admin]
Senha: [senha-definida]
```

### 2. **Trocar Senha**

⚠️ **IMPORTANTE:** Troque a senha do administrador no primeiro login!

- Vá em **Configurações** → **Usuários**
- Altere sua senha

### 3. **Personalizar Tenant**

- **Logo:** Faça upload do logo da sua empresa
- **Cores:** Ajuste cores primária e secundária
- **Informações:** Complete telefone, email, endereço
- **Redes Sociais:** Configure links (Facebook, Instagram, etc.)

### 4. **Criar Usuários Reais**

- Vá em **Configurações** → **Usuários** → **Novo Usuário**
- Crie contas para seus corretores, gestores, etc.
- Atribua as roles apropriadas

### 5. **Cadastrar Imóveis Reais**

- Vá em **Imóveis** → **Novo Imóvel**
- Cadastre seus imóveis reais
- Adicione fotos, descrições detalhadas

### 6. **Configurar Integrações**

- **Email:** Configure SMTP para envio de emails
- **WhatsApp:** Configure API do WhatsApp Business
- **Pagamentos:** Configure Stripe ou Mercado Pago
- **Mapas:** Adicione Google Maps API Key
- **E-Signature:** Configure ClickSign se necessário

### 7. **Importar Dados Existentes** (Opcional)

Se você tem dados de outro sistema, crie scripts de importação:

```typescript
// exemplo: import-properties.ts
import { storage } from "./server/storage";

async function importProperties() {
  const properties = [
    // seus dados aqui
  ];

  for (const prop of properties) {
    await storage.createProperty({
      tenantId: "seu-tenant-id",
      ...prop,
    });
  }
}
```

---

## 🔒 Segurança em Produção

### Variáveis de Ambiente Obrigatórias

Configure no arquivo `.env`:

```bash
# Database (use PostgreSQL em produção)
DATABASE_URL=postgresql://user:password@localhost:5432/imobibase

# Session
SESSION_SECRET=seu-secret-muito-seguro-aqui

# APIs (configure conforme necessário)
GOOGLE_MAPS_API_KEY=sua-key
ANTHROPIC_API_KEY=sua-key
CLICKSIGN_API_KEY=sua-key
TWILIO_ACCOUNT_SID=sua-sid
TWILIO_AUTH_TOKEN=seu-token

# Email
SMTP_HOST=smtp.seuservidor.com
SMTP_PORT=587
SMTP_USER=seu-email
SMTP_PASS=sua-senha

# File Storage (recomendado: Supabase)
SUPABASE_URL=sua-url
SUPABASE_SERVICE_KEY=sua-key
```

### Boas Práticas

1. ✅ Use PostgreSQL em produção (mais robusto que SQLite)
2. ✅ Configure backups automáticos do banco
3. ✅ Use HTTPS (SSL/TLS)
4. ✅ Configure rate limiting no servidor
5. ✅ Monitore logs de erro
6. ✅ Mantenha dependências atualizadas

---

## 📞 Suporte

Se tiver problemas durante a configuração:

1. Verifique os logs: `tail -f logs/imobibase.log`
2. Consulte a documentação em `/docs`
3. Verifique issues no repositório

---

## ✅ Checklist de Produção

- [ ] Banco de dados limpo (sem dados demo)
- [ ] Tenant real criado
- [ ] Usuário administrador criado
- [ ] Senha do admin trocada
- [ ] Logo da empresa enviado
- [ ] Cores personalizadas
- [ ] Usuários reais criados
- [ ] Roles configuradas
- [ ] Imóveis reais cadastrados
- [ ] Integrações configuradas (email, WhatsApp, etc.)
- [ ] Variáveis de ambiente em produção
- [ ] PostgreSQL configurado
- [ ] Backups automáticos
- [ ] SSL/HTTPS habilitado
- [ ] Monitoramento ativo

---

**Pronto!** Seu sistema está configurado com dados reais e pronto para uso em produção! 🎉

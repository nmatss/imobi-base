# 🚀 Quick Start - Production Database

Guia rápido para configurar o banco de dados com **dados reais** (sem dados demo).

## Opção 1: Banco Novo (Recomendado)

Se você está começando do zero:

```bash
# 1. Aplicar schema do banco
npm run db:push:sqlite

# 2. Inicializar com seus dados
npm run db:init:production
```

Siga as instruções interativas para inserir:

- Nome da sua imobiliária
- Email, telefone, endereço
- Dados do primeiro administrador

## Opção 2: Limpar Dados Demo Existentes

Se você já tem o banco com dados demo e quer começar limpo:

```bash
# 1. Limpar dados demo (CUIDADO: deleta tudo!)
npm run db:clean

# 2. Inicializar com dados reais
npm run db:init:production
```

## Opção 3: Manter Dados Demo (Desenvolvimento)

Se está desenvolvendo e quer dados de teste:

```bash
# Popular banco com dados demo
npm run db:seed:demo
```

## 📋 Após Inicializar

1. **Login:**
   - Acesse: `http://localhost:5000/login`
   - Use email/senha que você definiu

2. **Primeiro Passo:**
   - **IMPORTANTE:** Troque sua senha em Configurações → Usuários

3. **Personalizar:**
   - Logo da empresa
   - Cores (primária/secundária)
   - Informações de contato

4. **Criar Usuários:**
   - Adicione corretores, gestores, etc.
   - Configure permissões (roles)

5. **Cadastrar Imóveis:**
   - Seus imóveis reais
   - Fotos profissionais
   - Descrições completas

## 🔧 Scripts Disponíveis

```bash
# Banco de dados
npm run db:push:sqlite        # Aplicar schema SQLite
npm run db:init:production    # Inicializar com dados reais
npm run db:clean              # Limpar todos os dados
npm run db:seed:demo          # Popular com dados demo

# Desenvolvimento
npm run dev                   # Rodar em desenvolvimento
npm run build                 # Build para produção
npm run start                 # Rodar em produção
```

## 📚 Documentação Completa

Para guia detalhado, veja: [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)

## ⚠️ Importante

- ✅ Use PostgreSQL em produção (mais robusto)
- ✅ Configure variáveis de ambiente (`.env`)
- ✅ Faça backups regulares do banco
- ✅ Use HTTPS em produção
- ✅ Monitore logs e erros

## 🆘 Problemas?

Se algo der errado:

1. Verifique logs: `tail -f logs/imobibase.log`
2. Consulte [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)
3. Abra uma issue no repositório

---

**Pronto para produção!** 🎉

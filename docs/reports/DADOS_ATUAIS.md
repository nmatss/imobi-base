# 📊 Status Atual do Banco de Dados

Última verificação: $(date)

## Dados Existentes

Seu banco de dados atual contém **dados de demonstração**:

- **Tenants:** 1 registro
  - ImobiBase Demo (imobibase-demo)
- **Usuários:** 5 registros
- **Propriedades:** 6 registros
- **Leads:** 5 registros

## ⚠️ Atenção

Estes são **dados DEMO** criados automaticamente para desenvolvimento e testes.

## 🎯 Próximos Passos

### Para usar em PRODUÇÃO com dados REAIS:

1. **Limpar dados demo:**

   ```bash
   npm run db:clean
   ```

2. **Inicializar com seus dados:**
   ```bash
   npm run db:init:production
   ```

### Para continuar DESENVOLVENDO com dados demo:

- Os dados atuais já estão prontos para uso
- Login: admin@demo.com / demo123
- Você pode adicionar mais dados demo com:
  ```bash
  npm run db:seed:demo
  ```

## 📋 Verificar Dados

Para verificar o que está no banco a qualquer momento:

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/imobibase.db', { readonly: true });

const tables = ['tenants', 'users', 'properties', 'leads'];
tables.forEach(table => {
  const count = db.prepare(\`SELECT COUNT(*) as count FROM \${table}\`).get();
  console.log(\`\${table}: \${count.count} registros\`);
});

db.close();
"
```

---

Veja [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) para guia completo.

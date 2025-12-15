# Sistema de Permissões - ImobiBase

Sistema completo de gerenciamento de permissões baseado em roles implementado para o ImobiBase.

## Estrutura de Permissões

As permissões são organizadas por módulos, cada um com suas ações específicas:

```typescript
interface RolePermissions {
  properties: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  leads: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  calendar: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  contracts: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  sales: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  rentals: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  financial: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    viewValues: boolean; // Permissão especial para ver valores financeiros
  };
  reports: {
    view: boolean;
    export: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
    manageUsers: boolean;
  };
}
```

## Roles Padrão

O sistema cria automaticamente 4 roles padrão quando um tenant é criado:

### 1. Administrador
- **Todas as permissões**: Acesso total ao sistema
- Pode gerenciar usuários, configurações e todos os módulos
- Ideal para: Proprietários da imobiliária, gestores principais

### 2. Gestor
- **Quase todas as permissões**, exceto:
  - Não pode deletar contratos, vendas e aluguéis
  - Não pode editar configurações do sistema
  - Não pode gerenciar usuários
- Ideal para: Gerentes de equipe, coordenadores

### 3. Corretor
- **Foco em vendas e leads**:
  - Pode criar e editar imóveis
  - Pode gerenciar leads e vendas
  - Pode visualizar contratos e aluguéis (sem editar)
  - Não tem acesso ao módulo financeiro
  - Não pode exportar relatórios
- Ideal para: Corretores de imóveis, vendedores

### 4. Financeiro
- **Foco no módulo financeiro**:
  - Acesso total ao módulo financeiro
  - Pode visualizar e editar aluguéis
  - Pode visualizar todos os outros módulos (sem editar)
  - Pode exportar relatórios
- Ideal para: Equipe financeira, contadores

## Implementação no Frontend

### 1. Hook usePermissions

```typescript
import { usePermissions } from '@/lib/permissions';

function MyComponent() {
  const { can, hasPermission, isAdmin } = usePermissions();

  // Verificar permissão no formato 'module.action'
  if (can('properties.create')) {
    // Usuário pode criar imóveis
  }

  // Verificar permissão separadamente
  if (hasPermission('leads', 'edit')) {
    // Usuário pode editar leads
  }

  // Verificar se é admin
  if (isAdmin()) {
    // Usuário é administrador
  }
}
```

### 2. Componente PermissionGate

Use o componente `PermissionGate` para controlar renderização baseado em permissões:

```tsx
import { PermissionGate } from '@/components/PermissionGate';

// Exemplo 1: Esconder botão se não tem permissão
<PermissionGate permission="properties.create">
  <Button>Novo Imóvel</Button>
</PermissionGate>

// Exemplo 2: Com fallback
<PermissionGate
  permission="financial.viewValues"
  fallback={<p>***</p>}
>
  <MoneyDisplay value={1000} />
</PermissionGate>

// Exemplo 3: Requer múltiplas permissões
<PermissionGate allPermissions={['financial.view', 'financial.viewValues']}>
  <FinancialChart />
</PermissionGate>

// Exemplo 4: Requer pelo menos uma permissão
<PermissionGate anyPermissions={['properties.edit', 'properties.delete']}>
  <ActionsMenu />
</PermissionGate>
```

### 3. Componente PermissionGuard (para rotas)

```tsx
import { PermissionGuard } from '@/components/PermissionGate';

function FinancialPage() {
  return (
    <PermissionGuard
      permission="financial.view"
      unauthorizedMessage="Você não tem acesso ao módulo financeiro"
    >
      <div>Conteúdo da página financeira</div>
    </PermissionGuard>
  );
}
```

## Implementação no Backend

### 1. Middleware requirePermission

```typescript
// Exemplo de uso em routes.ts
app.post(
  "/api/properties",
  requireAuth,
  requirePermission('properties', 'create'),
  async (req, res) => {
    // Criar imóvel
  }
);

app.delete(
  "/api/properties/:id",
  requireAuth,
  requirePermission('properties', 'delete'),
  async (req, res) => {
    // Deletar imóvel
  }
);
```

### 2. Seed de Roles Padrão

```typescript
// Criar roles padrão para um tenant
await storage.seedDefaultRoles(tenantId);
```

## Endpoints da API

### Gerenciamento de Roles

```bash
# Listar todas as roles do tenant
GET /api/user-roles

# Buscar role específica
GET /api/user-roles/:id

# Criar nova role
POST /api/user-roles
{
  "name": "Atendente",
  "permissions": {
    "properties": { "view": true, "create": false, ... },
    ...
  }
}

# Atualizar role
PATCH /api/user-roles/:id

# Deletar role
DELETE /api/user-roles/:id

# Criar roles padrão
POST /api/user-roles/seed-defaults
```

## Fluxo de Autorização

1. **Usuário faz login**
   - Sistema retorna dados do usuário incluindo `roleId`

2. **Frontend busca permissões**
   - Hook `usePermissions` busca role via `/api/user-roles/:roleId`
   - Permissões são armazenadas em cache (React Query)

3. **Verificação de permissões**
   - Componentes usam `PermissionGate` ou hook `usePermissions`
   - Backend usa middleware `requirePermission`

4. **Fallback para sistema legado**
   - Se usuário não tem `roleId`, usa permissões do campo `role` (admin/user)
   - Garante compatibilidade com dados existentes

## Migrando Código Existente

### Antes:
```tsx
// Sem controle de permissões
<Button onClick={createProperty}>Novo Imóvel</Button>
```

### Depois:
```tsx
// Com controle de permissões
<PermissionGate permission="properties.create">
  <Button onClick={createProperty}>Novo Imóvel</Button>
</PermissionGate>
```

### Backend - Antes:
```typescript
app.post("/api/properties", requireAuth, async (req, res) => {
  // Qualquer usuário autenticado pode criar
});
```

### Backend - Depois:
```typescript
app.post(
  "/api/properties",
  requireAuth,
  requirePermission('properties', 'create'),
  async (req, res) => {
    // Apenas usuários com permissão podem criar
  }
);
```

## Boas Práticas

1. **Frontend**: Sempre use `PermissionGate` para esconder UI que o usuário não deveria acessar
2. **Backend**: Sempre use `requirePermission` middleware para proteger endpoints
3. **Nunca confie apenas no frontend**: Sempre valide permissões no backend
4. **Use permissões granulares**: Prefira `properties.create` ao invés de apenas verificar role
5. **Teste com diferentes roles**: Certifique-se de testar funcionalidades com todos os tipos de usuários

## Testando o Sistema

1. Crie um tenant
2. Execute o seed de roles: `POST /api/user-roles/seed-defaults`
3. Crie usuários e atribua roles diferentes
4. Teste cada funcionalidade com cada tipo de usuário
5. Verifique que:
   - UI esconde botões/ações quando usuário não tem permissão
   - Backend retorna 403 quando usuário tenta acessar sem permissão
   - Roles padrão funcionam conforme esperado

## Arquivos Modificados/Criados

- `/home/nic20/ProjetosWeb/ImobiBase/shared/schema.ts` - Interface RolePermissions
- `/home/nic20/ProjetosWeb/ImobiBase/client/src/lib/permissions.ts` - Hooks de permissões
- `/home/nic20/ProjetosWeb/ImobiBase/client/src/components/PermissionGate.tsx` - Componente de controle
- `/home/nic20/ProjetosWeb/ImobiBase/server/storage.ts` - Função seedDefaultRoles
- `/home/nic20/ProjetosWeb/ImobiBase/server/routes.ts` - Middleware requirePermission e endpoints
- `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/properties/list.tsx` - Exemplo de uso
- `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/leads/kanban.tsx` - Exemplo de uso

## Próximos Passos

1. Adicionar campo `roleId` na tabela `users`
2. Criar interface de gerenciamento de roles no frontend
3. Adicionar `PermissionGate` em todas as páginas principais
4. Adicionar `requirePermission` em todos os endpoints críticos
5. Criar página de gerenciamento de usuários com atribuição de roles
6. Implementar logs de auditoria de ações baseadas em permissões

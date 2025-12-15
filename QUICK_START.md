# Quick Start Guide - Multi-Tenant Architecture

## Files Created

### Schema Files (COMPLETED)
- ✅ `/home/nic20/ProjetosWeb/ImobiBase/shared/schema-sqlite.ts` - Updated with 7 new tables
- ✅ `/home/nic20/ProjetosWeb/ImobiBase/shared/schema.ts` - Updated with 7 new tables

### Server Files (REFERENCE IMPLEMENTATIONS)
- ✅ `/home/nic20/ProjetosWeb/ImobiBase/server/storage-extensions.ts` - Storage method implementations
- ✅ `/home/nic20/ProjetosWeb/ImobiBase/server/routes-extensions.ts` - API route implementations
- ✅ `/home/nic20/ProjetosWeb/ImobiBase/server/seed-defaults.ts` - Default data configurations

### Client Files (COMPLETED)
- ✅ `/home/nic20/ProjetosWeb/ImobiBase/client/src/lib/permissions.ts` - Permission management
- ✅ `/home/nic20/ProjetosWeb/ImobiBase/client/src/lib/ai-context.ts` - AI context utilities

### Documentation
- ✅ `/home/nic20/ProjetosWeb/ImobiBase/MULTI_TENANT_IMPLEMENTATION.md` - Complete guide

## New Tables Added

1. **tenant_settings** - Extended tenant configuration
2. **user_roles** - Role definitions per tenant
3. **user_permissions** - User-role assignments
4. **integration_configs** - External integrations
5. **notification_preferences** - Notification settings
6. **ai_settings** - AI configuration
7. **saved_reports** - Saved report configs

## Integration Steps

### Step 1: Database Migration
```bash
# The schemas are already updated, you need to migrate the database
# For development (SQLite), the tables will be created automatically
# For production (PostgreSQL), run migrations
```

### Step 2: Storage Methods
Copy the method implementations from `server/storage-extensions.ts` into `server/storage.ts`:

1. Add the type imports at the top
2. Add the interface methods to `IStorage` interface
3. Add the implementations to `DbStorage` class

### Step 3: API Routes
Copy the route handlers from `server/routes-extensions.ts` into `server/routes.ts`:

1. Add the schema imports
2. Paste the route handlers before `return httpServer`

### Step 4: Seed Data
Update `server/seed.ts`:

```typescript
import { setupNewTenant } from "./seed-defaults";

// After creating tenant1
await setupNewTenant(storage, tenant1);

// After creating tenant2
await setupNewTenant(storage, tenant2);
```

### Step 5: Client Setup
In your main App component:

```typescript
import { PermissionProvider } from '@/lib/permissions';

function App() {
  return (
    <PermissionProvider>
      {/* Your existing app */}
    </PermissionProvider>
  );
}
```

## Quick Usage Examples

### Permission Checking
```typescript
import { usePermissions, PermissionGate } from '@/lib/permissions';

function MyComponent() {
  const { hasPermission } = usePermissions();

  return (
    <div>
      <PermissionGate permission="properties_create">
        <button>New Property</button>
      </PermissionGate>

      {hasPermission('properties_delete') && <button>Delete</button>}
    </div>
  );
}
```

### AI Context Generation
```typescript
import { getPropertyAIContext, generateAIPrompt } from '@/lib/ai-context';

const context = getPropertyAIContext(property, tenant, 'property_description');
const prompt = generateAIPrompt(context);
// Send to AI service
```

### API Usage Examples

#### Get Tenant Settings
```typescript
const response = await fetch('/api/tenant/settings');
const settings = await response.json();
```

#### Update Tenant Settings
```typescript
await fetch('/api/tenant/settings', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cnpj: '12.345.678/0001-90',
    creci: 'CRECI 12345-J',
    pixKey: 'pix@imobiliaria.com'
  })
});
```

#### List Roles
```typescript
const response = await fetch('/api/roles');
const roles = await response.json();
```

#### Create Role
```typescript
await fetch('/api/roles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Custom Role',
    description: 'Custom permissions',
    permissions: {
      properties_view: true,
      properties_edit: true,
      // ... other permissions
    }
  })
});
```

## Default Roles Created

When you run seed with `setupNewTenant()`:

1. **Administrador** - Full access
2. **Gestor** - Management, limited deletion
3. **Corretor** - Properties and leads
4. **Financeiro** - Finance and rentals

Each with complete permission matrices defined in `seed-defaults.ts`.

## Default Finance Categories

Income categories:
- Comissão de Venda
- Taxa de Administração
- Taxa de Locação
- Multas e Juros
- Serviços Extras

Expense categories:
- Salários e Encargos
- Marketing e Publicidade
- Manutenção de Imóveis
- Escritório e Infraestrutura
- Taxas e Impostos
- Comissões a Pagar
- Serviços Profissionais

## Important Notes

### Multi-Tenant Isolation
Every query automatically filters by `tenantId` from the authenticated user. This ensures complete data isolation between tenants.

### Admin-Only Operations
These operations require admin role:
- Updating tenant settings
- Managing roles
- Configuring integrations
- Setting notification preferences
- Configuring AI settings

### Permission System
The permission system uses a hierarchical structure:
- Roles define base permissions
- Users are assigned to roles
- Custom permissions can override role permissions

### Integration Pattern
Integrations use a flexible JSON config pattern:
- No schema changes needed for new integrations
- Status tracking for connection health
- Type-based retrieval

## Testing

After integration, test:

1. Create a new tenant → Verify default roles are created
2. Create a user → Assign role → Check permissions work
3. Update tenant settings → Verify persistence
4. Create integration config → Verify save/load
5. Use PermissionGate → Verify conditional rendering
6. Generate AI context → Verify structured output

## Troubleshooting

**Issue: Permission Provider not working**
- Ensure app is wrapped in `<PermissionProvider>`
- Check that `/api/auth/me` returns user data

**Issue: Routes return 404**
- Verify routes are added to `routes.ts`
- Check route order (more specific before general)

**Issue: Storage methods not found**
- Ensure methods are added to both interface and class
- Check imports are correct

**Issue: Seed fails**
- Verify all storage methods are implemented
- Check that schemas are imported correctly

## Next Steps

1. Run database migrations
2. Integrate storage methods
3. Add API routes
4. Update seed file
5. Wrap app in PermissionProvider
6. Build settings UI pages
7. Test thoroughly

See `MULTI_TENANT_IMPLEMENTATION.md` for complete details.

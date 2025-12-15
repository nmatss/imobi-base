# Multi-Tenant Architecture Implementation Guide

This document provides a comprehensive overview of the multi-tenant architecture improvements implemented for ImobiBase.

## Overview

The implementation adds robust multi-tenant capabilities with:
- Extended tenant configuration (company data, branding, banking)
- Role-based permission system
- Integration management
- Notification preferences
- AI settings per tenant
- Saved reports functionality

## Changes Made

### 1. Schema Updates

#### New Tables Added

**Both `shared/schema.ts` (PostgreSQL) and `shared/schema-sqlite.ts` (SQLite) updated:**

1. **tenant_settings**: Extended tenant configuration
   - Company data: CNPJ, municipal registration, CRECI
   - Banking: bank name, agency, account, PIX key
   - Business settings: hours, timezone
   - Branding: colors, logos, favicon
   - Domain settings: custom domain, subdomain
   - Social links: Facebook, Instagram, LinkedIn, YouTube
   - Portal settings: broker display, WhatsApp float, lead forms

2. **user_roles**: Permission roles within tenants
   - Each tenant has its own roles
   - Permissions stored as JSON
   - Default roles marked with flag

3. **user_permissions**: Links users to roles
   - Allows custom permission overrides
   - Tenant isolation through user relationship

4. **integration_configs**: External integrations per tenant
   - Types: portal, whatsapp, email, signature, BI
   - Configuration stored as JSON
   - Status tracking: connected, disconnected, error

5. **notification_preferences**: Notification settings
   - Event-based notifications
   - Channel selection: email, WhatsApp, push
   - Role-based recipients

6. **ai_settings**: AI configuration per tenant
   - Language and tone settings
   - Module-specific presets
   - Broker edit permissions

7. **saved_reports**: User-saved report configurations
   - Report type and filters as JSON
   - Favorite marking
   - User and tenant isolation

### 2. Storage Layer

**File: `server/storage-extensions.ts`**

Contains interface definitions and example implementations for:
- Tenant Settings CRUD
- User Roles management
- User Permissions management
- Integration Configs management
- Notification Preferences bulk update
- AI Settings management
- Saved Reports CRUD

**Integration Instructions:**

1. Add types to imports in `server/storage.ts`:
```typescript
import type {
  TenantSettings, InsertTenantSettings,
  UserRole, InsertUserRole,
  UserPermission, InsertUserPermission,
  IntegrationConfig, InsertIntegrationConfig,
  NotificationPreference, InsertNotificationPreference,
  AISettings, InsertAISettings,
  SavedReport, InsertSavedReport
} from "@shared/schema-sqlite";
```

2. Add method signatures to `IStorage` interface (copy from storage-extensions.ts)

3. Add implementations to `DbStorage` class (examples provided in storage-extensions.ts)

### 3. API Routes

**File: `server/routes-extensions.ts`**

Contains complete route implementations for:

- **Tenant Settings** (`/api/tenant/settings`)
  - GET: Retrieve settings
  - PATCH: Update settings (admin only)

- **User Roles** (`/api/roles`)
  - GET: List roles
  - POST: Create role (admin only)
  - PATCH: Update role (admin only)
  - DELETE: Delete role (admin only, non-default only)
  - GET `/api/permissions/matrix`: Get permission structure

- **Integrations** (`/api/integrations`)
  - GET: List all integrations
  - GET `/:type`: Get specific integration
  - PATCH `/:type`: Update integration config (admin only)

- **Notifications** (`/api/notifications/preferences`)
  - GET: Get preferences
  - PATCH: Update preferences (admin only)

- **AI Settings** (`/api/ai/settings`)
  - GET: Get AI settings
  - PATCH: Update AI settings (admin only)

- **Saved Reports** (`/api/reports/saved`)
  - GET: List user's saved reports
  - POST: Create saved report
  - PATCH `/:id`: Update saved report
  - DELETE `/:id`: Delete saved report
  - POST `/:id/favorite`: Toggle favorite

**Integration Instructions:**

Copy the route implementations from `routes-extensions.ts` into `server/routes.ts` after the existing routes, before the `return httpServer` statement.

### 4. Seed Data

**File: `server/seed-defaults.ts`**

Provides default configurations for new tenants:

- **Default Roles**: Administrador, Gestor, Corretor, Financeiro
  - Complete permission matrices for each role
  - Marked as system defaults

- **Finance Categories**: Real estate specific
  - Income: Commissions, fees, services
  - Expenses: Salaries, marketing, maintenance, etc.

- **AI Presets**: Module-specific configurations
  - Properties, Leads, Contracts, Rentals, Sales, Financial, Reports

- **Notification Preferences**: Event-based defaults
  - Lead events, payment events, contract events, property events

- **Helper Functions**:
  - `seedDefaultRoles(storage, tenantId)`
  - `seedDefaultFinanceCategories(storage, tenantId)`
  - `seedDefaultNotificationPreferences(storage, tenantId)`
  - `setupNewTenant(storage, tenant)` - Complete setup

**Integration Instructions:**

In `server/seed.ts`, after creating each tenant:

```typescript
import { setupNewTenant } from "./seed-defaults";

// After creating tenant1
await setupNewTenant(storage, tenant1);

// After creating tenant2
await setupNewTenant(storage, tenant2);
```

### 5. Client-Side Utilities

#### Permission Management (`client/src/lib/permissions.ts`)

Complete permission management system:

- **Permissions Interface**: All available permissions organized by module
- **Default Role Permissions**: Pre-defined permission sets
- **PermissionProvider**: React context provider
- **usePermissions Hook**: Access permission state
- **PermissionGate Component**: Conditional rendering

**Usage Example:**

```typescript
import { PermissionProvider, usePermissions, PermissionGate } from '@/lib/permissions';

// Wrap your app
<PermissionProvider>
  <App />
</PermissionProvider>

// Use in components
function PropertyActions() {
  const { hasPermission } = usePermissions();

  return (
    <div>
      <PermissionGate permission="properties_edit">
        <button>Edit Property</button>
      </PermissionGate>

      {hasPermission('properties_delete') && (
        <button>Delete</button>
      )}
    </div>
  );
}
```

#### AI Context Utilities (`client/src/lib/ai-context.ts`)

Structured context generation for AI prompts:

- **Property Context**: Descriptions, SEO, social media
- **Lead Context**: Follow-ups, qualification, nurturing
- **Rental Context**: Collection reminders, adjustments, renewals
- **Sale Context**: Proposals, negotiations, closing
- **Financial Context**: Analysis, trends, forecasts
- **Report Context**: Summaries, insights, recommendations

**Usage Example:**

```typescript
import { getPropertyAIContext, generateAIPrompt } from '@/lib/ai-context';

const context = getPropertyAIContext(
  property,
  tenant,
  'property_description'
);

const prompt = generateAIPrompt(
  context,
  'Focus on luxury amenities and location benefits'
);

// Send prompt to AI service
const description = await callAI(prompt);
```

## Data Isolation Pattern

All new tables follow the multi-tenant data isolation pattern:

1. **Tenant Foreign Key**: Every table has `tenant_id` referencing `tenants.id`
2. **Query Filtering**: All queries filter by `tenantId` from authenticated user
3. **Access Control**: API routes verify tenant ownership before operations
4. **Default Data**: Each tenant gets its own default configurations

## Permission System

### Permission Structure

Permissions are organized by module and operation:
- `{module}_{operation}`: e.g., `properties_create`, `leads_delete`
- Stored as JSON object with boolean values
- Custom overrides supported per user

### Default Roles

1. **Administrador**: Full system access
2. **Gestor**: Management access, limited deletion
3. **Corretor**: Properties and leads focus
4. **Financeiro**: Financial and rental focus

### Permission Categories

- Properties (5 permissions)
- Leads (5 permissions)
- Contracts (5 permissions)
- Financials (5 permissions)
- Rentals (5 permissions)
- Sales (4 permissions)
- Users & Roles (5 permissions)
- Settings (4 permissions)
- Reports (3 permissions)

## Integration Configuration Pattern

Integrations are configured per tenant with:
- Type identifier (portal, whatsapp, email, etc.)
- JSON configuration object
- Status tracking (connected, disconnected, error)
- Last sync timestamp

This allows flexible integration without schema changes.

## System-Wide UX Consistency

All pages should follow these patterns:

### Breadcrumbs
Always show: "Imobiliária / Page Name"

### Primary Actions
Consistent buttons:
- "Novo Imóvel"
- "Novo Lead"
- "Agendar Visita"
- "Registrar Venda"
- etc.

### Loading States
Use Skeleton components for initial loads

### Empty States
Show helpful messages with icons/illustrations

### Toast Messages
Consistent success/error messaging

## Portal/Public Site Settings

The `portalSettings` JSON field in `tenant_settings` controls:
- `showBrokers`: Display broker team page
- `showWhatsApp`: Floating WhatsApp button
- `showLeadForm`: Contact form visibility
- `enableVirtualTours`: Virtual tour feature

SEO settings per city/neighborhood can be customized via:
- `seoTitle`: Template with variables
- `seoDescription`: City-specific descriptions

## Next Steps

To complete the implementation:

1. **Database Migration**:
   - Run migrations to create new tables
   - Or rebuild database from updated schemas

2. **Storage Methods**:
   - Copy implementations from `storage-extensions.ts` to `storage.ts`
   - Add to IStorage interface and DbStorage class

3. **API Routes**:
   - Copy route handlers from `routes-extensions.ts` to `routes.ts`
   - Import necessary schema types

4. **Seed Updates**:
   - Import and call `setupNewTenant()` in seed.ts
   - Run seed to populate default data

5. **Client Integration**:
   - Wrap app with PermissionProvider
   - Use PermissionGate and usePermissions in components
   - Implement AI context in relevant forms

6. **UI Pages**:
   - Create settings pages for tenant configuration
   - Add role management interface
   - Build integration configuration screens

## Testing Checklist

- [ ] Tenant isolation verified (users can only see their tenant's data)
- [ ] Default roles created for new tenants
- [ ] Permission checks work correctly
- [ ] Integration configs save and load properly
- [ ] Notification preferences update correctly
- [ ] AI settings persist and apply
- [ ] Saved reports CRUD operations work
- [ ] Client permission gates hide/show correctly
- [ ] AI context generation produces valid prompts

## Security Notes

- All routes enforce authentication via `requireAuth` middleware
- Tenant isolation checked on every operation
- Admin-only routes verified via role check
- Default roles cannot be deleted
- User permissions include tenant verification via user lookup

## Performance Considerations

- Indexes should be added on:
  - `tenant_id` columns (all new tables)
  - `user_id` in user_permissions
  - `role_id` in user_permissions
  - `integration_type` in integration_configs
  - `event_type` in notification_preferences

## Documentation

Key concepts explained in code comments:
- Multi-tenant data isolation pattern
- Permission system structure
- Integration configuration approach
- AI context generation

All new files include comprehensive JSDoc comments explaining purpose and usage.

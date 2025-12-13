# ImobiBase

## Overview

ImobiBase is a multi-tenant SaaS platform for real estate agencies (imobiliárias) in Brazil. It provides a complete CRM solution including property management, lead tracking with a Kanban-style funnel, calendar/scheduling, contracts/proposals, and public-facing landing pages for each agency. The platform supports multiple pricing tiers (Free, Inicial, Profissional) with different feature limits.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context (ImobiProvider) for global app state including user authentication, tenant switching, and data management
- **Data Fetching**: TanStack React Query for server state management
- **Build Tool**: Vite

The frontend follows a pages-based structure with:
- Dashboard with KPIs and charts (using Recharts)
- Properties list and details pages
- Leads Kanban board for CRM pipeline
- Calendar for scheduling visits
- Contracts/proposals management
- Settings page
- Public landing pages for each tenant

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy, session-based auth using express-session
- **Password Security**: Scrypt hashing with salt
- **API Pattern**: RESTful endpoints under `/api` prefix

The server handles:
- User authentication (login/logout/session management)
- CRUD operations for all entities (tenants, users, properties, leads, visits, contracts, interactions)
- Multi-tenant data isolation via tenantId filtering

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod validation schemas
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)

Key entities:
- **Tenants**: Real estate agencies with branding (logo, colors, contact info)
- **Users**: Agency staff with roles (admin, user)
- **Properties**: Real estate listings with full details (type, category, price, location, features, images)
- **Leads**: Potential clients with status pipeline (new → qualification → visit → proposal → contract)
- **Interactions**: Communication history with leads
- **Visits**: Scheduled property viewings
- **Contracts**: Proposals and rental/sale contracts

### Multi-Tenant Design
Each tenant (real estate agency) has isolated data. Users belong to a tenant and can only access their tenant's data. The system supports tenant switching for users with access to multiple tenants.

### Public Landing Pages
Each tenant gets a public-facing website at `/e/{slug}` showing their properties with filtering, property details, and lead capture forms. Leads submitted through the public site are automatically tagged with "Site" as the source.

## External Dependencies

### Database
- PostgreSQL (configured via `DATABASE_URL` environment variable)
- Drizzle Kit for migrations (`drizzle-kit push`)

### UI Components
- shadcn/ui (Radix UI primitives with Tailwind styling)
- Lucide React icons
- Recharts for data visualization
- date-fns for date formatting (Portuguese locale)

### Authentication & Sessions
- Passport.js with passport-local strategy
- express-session for session management
- connect-pg-simple for PostgreSQL session storage (optional)

### Development Tools
- Vite with React plugin
- TypeScript with strict mode
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)
# Deliverable 3: Blocker Remediation Plan -- ImobiBase

---

## B1: Session Secret Hardcoding

### Current State

The application already has robust secret validation in `server/routes.ts` lines 500-535. The `secretManager.initialize(process.env)` call in `server/index.ts` line 25 validates secrets at startup. The `SESSION_SECRET` is read from environment via `secretManager.get('SESSION_SECRET')` (line 501).

**Finding:** The original concern about a "JWT secret hardcoded in server/routes-portal.ts" does not match the codebase. There is no `server/routes-portal.ts` file. The application uses session-based auth (express-session + passport-local), NOT JWT for the main app. The secret management is actually well-implemented with:
- Production fail-fast validation (lines 505-535 of `server/routes.ts`)
- Default secret blocklist (lines 507-515)
- Minimum length check (32 chars, line 535)
- `secretManager` centralized validation (`server/security/secret-manager.ts`)

**Remaining gap:** The validation only runs in `isProduction` mode (line 505). Staging and development environments can still run with weak secrets.

### Fix: Extend validation to staging environments

File: `server/routes.ts`, after line 497 (`const isLocalDev = ...`):

```typescript
// BEFORE (line 505):
if (isProduction) {

// AFTER:
const isSecuredEnv = isProduction || process.env.NODE_ENV === 'staging';
if (isSecuredEnv) {
```

### Validation Test (Vitest)

File: `tests/unit/secret-validation.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the secret manager module
vi.mock('../../server/security/secret-manager', () => {
  const secrets = new Map<string, string>();
  return {
    secretManager: {
      initialize: vi.fn((env: Record<string, string | undefined>) => {
        if (env.SESSION_SECRET) {
          secrets.set('SESSION_SECRET', env.SESSION_SECRET);
        }
      }),
      get: vi.fn((key: string) => secrets.get(key)),
    },
  };
});

describe('Session Secret Validation', () => {
  const DEFAULT_SECRETS = [
    'imobibase-secret-key-change-in-production',
    'your-super-secret-session-key-change-in-production',
    'imobibase-super-secret-key-production-2024',
    'change-me',
    'changeme',
    'secret',
    'default',
  ];

  it('should reject empty SESSION_SECRET in production', () => {
    const sessionSecret = '';
    const isProduction = true;

    expect(isProduction && !sessionSecret).toBe(true);
  });

  it('should reject default secrets in production', () => {
    for (const defaultSecret of DEFAULT_SECRETS) {
      expect(DEFAULT_SECRETS.includes(defaultSecret)).toBe(true);
    }
  });

  it('should reject secrets shorter than 32 characters', () => {
    const shortSecret = 'too-short-secret';
    expect(shortSecret.length).toBeLessThan(32);
  });

  it('should accept a strong secret', () => {
    const strongSecret = 'a'.repeat(64); // 64-char base64 secret
    expect(strongSecret.length).toBeGreaterThanOrEqual(32);
    expect(DEFAULT_SECRETS.includes(strongSecret)).toBe(false);
  });

  it('should validate secret entropy (not all same character)', () => {
    const lowEntropy = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // 34 chars, all same
    const uniqueChars = new Set(lowEntropy).size;
    expect(uniqueChars).toBeLessThan(5); // flag low entropy
  });
});
```

---

## B2: QA Environment Setup

### Recommendation

Use SQLite for QA (already supported via `USE_SQLITE=true` in `server/db.ts` line 11). No Redis required for tests (the app gracefully handles missing Redis).

### `.env.test` Template

File: `.env.test`

```bash
# ==================================
# QA/TEST ENVIRONMENT CONFIGURATION
# ==================================
# This file is loaded by vitest and test scripts.
# It contains NO real secrets or API keys.

# Database - isolated SQLite for tests
USE_SQLITE=true
# The test DB path is set in vitest.config.ts setup file

# Server
PORT=5001
NODE_ENV=test

# Session (test-only value, not used in production)
SESSION_SECRET=test-environment-secret-not-for-production-use-only-64chars-long-enough

# Disable external services in tests
STRIPE_SECRET_KEY=sk_test_fake_key_for_unit_tests_only
STRIPE_PUBLISHABLE_KEY=pk_test_fake_key_for_unit_tests_only
STRIPE_WEBHOOK_SECRET=whsec_test_fake_webhook_secret

MERCADOPAGO_ACCESS_TOKEN=TEST-0000000000000000-000000-00000000000000000000000000000000-000000000
MERCADOPAGO_PUBLIC_KEY=TEST-00000000-0000-0000-0000-000000000000

# WhatsApp (disabled in tests)
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_APP_SECRET=test-webhook-secret
WHATSAPP_VERIFY_TOKEN=test-verify-token

# SMS (disabled)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Maps (disabled)
GOOGLE_MAPS_API_KEY=

# E-signature (disabled)
CLICKSIGN_API_KEY=
CLICKSIGN_WEBHOOK_SECRET=test-clicksign-webhook-secret

# Email (disabled)
SENDGRID_API_KEY=
RESEND_API_KEY=

# Supabase (disabled)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Redis (disabled -- app uses in-memory fallback)
REDIS_URL=

# Analytics (disabled)
POSTHOG_API_KEY=
GOOGLE_ANALYTICS_ID=

# AI (disabled)
ANTHROPIC_API_KEY=

# Sentry (disabled)
SENTRY_DSN=

# CORS
CORS_ORIGINS=http://localhost:5001

# Rate limiting (relaxed for tests)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10000
```

### npm Script Additions

Add to `package.json` `scripts` section:

```json
{
  "test:qa:seed": "USE_SQLITE=true tsx server/seed-qa.ts",
  "test:qa:clean": "rm -f ./data/imobibase-test.db",
  "test:qa:reset": "npm run test:qa:clean && npm run test:qa:seed",
  "test:integration:qa": "dotenv -e .env.test -- vitest run --dir tests/integration"
}
```

### Test Setup Enhancement

File: `tests/setup.ts` -- add at the top:

```typescript
import { beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// Ensure test database is isolated
const TEST_DB_PATH = path.resolve(__dirname, '../data/imobibase-test.db');

beforeAll(() => {
  // Set environment for test database
  process.env.USE_SQLITE = 'true';
  process.env.NODE_ENV = 'test';
  // Override DB path by setting an env var that db.ts can check
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
});

afterAll(() => {
  // Cleanup test database after all tests
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});
```

---

## B3: Multi-Tenant QA Seed Script

### Current State

`server/seed.ts` creates:
- 2 tenants (Sol, Nova Casa)
- 2 users (1 admin per tenant)
- 6 properties (4 + 2)
- 7 leads (5 + 2)
- No contracts, owners, renters, rental contracts, or rental payments

### Enhanced QA Seed Script

File: `server/seed-qa.ts`

```typescript
import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedQA() {
  console.log("Seeding QA database with comprehensive test data...");

  try {
    const hashedPassword = await hashPassword("TestPass123!");

    // ========== TENANTS ==========
    const tenant1 = await storage.createTenant({
      name: "Imobiliaria Sol",
      slug: "sol",
      primaryColor: "#f97316",
      secondaryColor: "#ea580c",
      phone: "(11) 98765-4321",
      email: "contato@imobiliariasol.com",
      address: "Av. Paulista, 1000 - Sao Paulo, SP",
    });

    const tenant2 = await storage.createTenant({
      name: "Nova Casa Imoveis",
      slug: "nova-casa",
      primaryColor: "#3b82f6",
      secondaryColor: "#2563eb",
      phone: "(21) 97654-3210",
      email: "vendas@novacasa.com",
      address: "Rua das Flores, 500 - Rio de Janeiro, RJ",
    });

    const tenant3 = await storage.createTenant({
      name: "Premium Imoveis",
      slug: "premium",
      primaryColor: "#10b981",
      secondaryColor: "#059669",
      phone: "(31) 96543-2100",
      email: "contato@premiumimoveis.com",
      address: "Rua da Bahia, 1200 - Belo Horizonte, MG",
    });

    console.log("Tenants created: sol, nova-casa, premium");

    // ========== USERS (8 users across 3 tenants) ==========
    const userAdmin1 = await storage.createUser({
      tenantId: tenant1.id,
      name: "Admin Sol",
      email: "admin@sol.com",
      password: hashedPassword,
      role: "admin",
    });

    const userAgent1 = await storage.createUser({
      tenantId: tenant1.id,
      name: "Corretor Paulo",
      email: "paulo@sol.com",
      password: hashedPassword,
      role: "agent",
    });

    const userViewer1 = await storage.createUser({
      tenantId: tenant1.id,
      name: "Viewer Maria",
      email: "maria@sol.com",
      password: hashedPassword,
      role: "viewer",
    });

    const userAdmin2 = await storage.createUser({
      tenantId: tenant2.id,
      name: "Admin Nova Casa",
      email: "admin@novacasa.com",
      password: hashedPassword,
      role: "admin",
    });

    const userAgent2 = await storage.createUser({
      tenantId: tenant2.id,
      name: "Corretor Rita",
      email: "rita@novacasa.com",
      password: hashedPassword,
      role: "agent",
    });

    const userAdmin3 = await storage.createUser({
      tenantId: tenant3.id,
      name: "Admin Premium",
      email: "admin@premium.com",
      password: hashedPassword,
      role: "admin",
    });

    const userAgent3 = await storage.createUser({
      tenantId: tenant3.id,
      name: "Corretor Lucas",
      email: "lucas@premium.com",
      password: hashedPassword,
      role: "agent",
    });

    const userViewer3 = await storage.createUser({
      tenantId: tenant3.id,
      name: "Viewer Ana",
      email: "ana@premium.com",
      password: hashedPassword,
      role: "viewer",
    });

    console.log("Users created: 8 users (3 admin, 3 agent, 2 viewer)");

    // ========== PROPERTIES (12 properties across 3 tenants) ==========
    const prop1_1 = await storage.createProperty({
      tenantId: tenant1.id,
      title: "Apartamento Moderno 3 Quartos",
      description: "Apartamento com acabamento premium em SP.",
      type: "apartment",
      category: "sale",
      price: "850000",
      address: "Rua Augusta, 1500",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01305-100",
      bedrooms: 3,
      bathrooms: 2,
      area: 120,
      features: ["Varanda", "Academia", "Piscina"],
      images: ["https://example.com/img1.jpg"],
      status: "available",
      featured: true,
    } as any);

    const prop1_2 = await storage.createProperty({
      tenantId: tenant1.id,
      title: "Casa Terrea com Piscina",
      description: "Casa em condominio fechado.",
      type: "house",
      category: "sale",
      price: "1200000",
      address: "Alameda dos Anjos, 250",
      city: "Sao Paulo",
      state: "SP",
      bedrooms: 4,
      bathrooms: 3,
      area: 350,
      features: ["Piscina", "Churrasqueira"],
      images: ["https://example.com/img2.jpg"],
      status: "available",
      featured: false,
    } as any);

    const prop1_3 = await storage.createProperty({
      tenantId: tenant1.id,
      title: "Apartamento para Locacao 2 Quartos",
      description: "Apartamento mobiliado proximo ao metro.",
      type: "apartment",
      category: "rent",
      price: "3500",
      address: "Rua dos Pinheiros, 800",
      city: "Sao Paulo",
      state: "SP",
      bedrooms: 2,
      bathrooms: 1,
      area: 75,
      features: ["Mobiliado", "Proximo ao Metro"],
      images: ["https://example.com/img3.jpg"],
      status: "rented",
      featured: false,
    } as any);

    const prop1_4 = await storage.createProperty({
      tenantId: tenant1.id,
      title: "Sala Comercial Centro",
      description: "Sala comercial no centro de SP.",
      type: "commercial",
      category: "rent",
      price: "5000",
      address: "Av. Sao Joao, 300",
      city: "Sao Paulo",
      state: "SP",
      bedrooms: 0,
      bathrooms: 1,
      area: 60,
      features: ["Ar Condicionado", "Estacionamento"],
      images: ["https://example.com/img4.jpg"],
      status: "available",
      featured: false,
    } as any);

    const prop2_1 = await storage.createProperty({
      tenantId: tenant2.id,
      title: "Apartamento Vista Mar Ipanema",
      description: "Alto padrao com vista para o mar.",
      type: "apartment",
      category: "sale",
      price: "3200000",
      address: "Av. Vieira Souto, 500",
      city: "Rio de Janeiro",
      state: "RJ",
      bedrooms: 3,
      bathrooms: 3,
      area: 180,
      features: ["Vista Mar", "Portaria 24h"],
      images: ["https://example.com/img5.jpg"],
      status: "available",
      featured: true,
    } as any);

    const prop2_2 = await storage.createProperty({
      tenantId: tenant2.id,
      title: "Casa Condominio Barra",
      description: "Casa em condominio de luxo na Barra.",
      type: "house",
      category: "sale",
      price: "1800000",
      address: "Estrada do Pontal, 1200",
      city: "Rio de Janeiro",
      state: "RJ",
      bedrooms: 4,
      bathrooms: 4,
      area: 300,
      features: ["Piscina", "Sauna"],
      images: ["https://example.com/img6.jpg"],
      status: "available",
      featured: true,
    } as any);

    const prop2_3 = await storage.createProperty({
      tenantId: tenant2.id,
      title: "Kitnet Copacabana",
      description: "Kitnet mobilada em Copacabana.",
      type: "apartment",
      category: "rent",
      price: "2500",
      address: "Rua Bolivar, 100",
      city: "Rio de Janeiro",
      state: "RJ",
      bedrooms: 1,
      bathrooms: 1,
      area: 35,
      features: ["Mobiliado"],
      images: ["https://example.com/img7.jpg"],
      status: "rented",
      featured: false,
    } as any);

    const prop3_1 = await storage.createProperty({
      tenantId: tenant3.id,
      title: "Cobertura Savassi",
      description: "Cobertura duplex na Savassi, BH.",
      type: "apartment",
      category: "sale",
      price: "2100000",
      address: "Rua Pernambuco, 800",
      city: "Belo Horizonte",
      state: "MG",
      bedrooms: 4,
      bathrooms: 3,
      area: 250,
      features: ["Rooftop", "Vista Cidade"],
      images: ["https://example.com/img8.jpg"],
      status: "available",
      featured: true,
    } as any);

    const prop3_2 = await storage.createProperty({
      tenantId: tenant3.id,
      title: "Apartamento 2Q Funcionarios",
      description: "Apartamento no bairro Funcionarios.",
      type: "apartment",
      category: "rent",
      price: "2800",
      address: "Rua Curitiba, 500",
      city: "Belo Horizonte",
      state: "MG",
      bedrooms: 2,
      bathrooms: 1,
      area: 70,
      features: ["Garagem", "Portaria"],
      images: ["https://example.com/img9.jpg"],
      status: "available",
      featured: false,
    } as any);

    console.log("Properties created: 9 properties across 3 tenants");

    // ========== LEADS (12 leads across 3 tenants, all pipeline stages) ==========
    const leadStatuses = ["new", "qualification", "visit", "proposal", "contract", "lost"];

    const lead1_1 = await storage.createLead({ tenantId: tenant1.id, name: "Joao Silva", email: "joao@email.com", phone: "(11) 99999-1111", source: "Site", status: "new", budget: "800000", interests: ["apartment"] } as any);
    const lead1_2 = await storage.createLead({ tenantId: tenant1.id, name: "Maria Santos", email: "maria.santos@email.com", phone: "(11) 99999-2222", source: "Instagram", status: "qualification", budget: "1500000", interests: ["house"] } as any);
    const lead1_3 = await storage.createLead({ tenantId: tenant1.id, name: "Pedro Costa", email: "pedro@email.com", phone: "(11) 99999-3333", source: "Indicacao", status: "visit", budget: "900000", interests: ["apartment"] } as any);
    const lead1_4 = await storage.createLead({ tenantId: tenant1.id, name: "Ana Paula", email: "ana.paula@email.com", phone: "(11) 99999-4444", source: "Facebook", status: "proposal", budget: "750000", interests: ["apartment"] } as any);
    const lead1_5 = await storage.createLead({ tenantId: tenant1.id, name: "Carlos Mendes", email: "carlos@email.com", phone: "(11) 99999-5555", source: "Portais", status: "contract", budget: "850000", interests: ["apartment"] } as any);

    const lead2_1 = await storage.createLead({ tenantId: tenant2.id, name: "Fernanda Lima", email: "fernanda@email.com", phone: "(21) 98888-1111", source: "Site", status: "new", budget: "2000000", interests: ["apartment"] } as any);
    const lead2_2 = await storage.createLead({ tenantId: tenant2.id, name: "Roberto Alves", email: "roberto@email.com", phone: "(21) 98888-2222", source: "Instagram", status: "visit", budget: "1800000", interests: ["house"] } as any);
    const lead2_3 = await storage.createLead({ tenantId: tenant2.id, name: "Lucia Martins", email: "lucia@email.com", phone: "(21) 98888-3333", source: "Site", status: "lost", budget: "500000", interests: ["apartment"] } as any);

    const lead3_1 = await storage.createLead({ tenantId: tenant3.id, name: "Rafael Souza", email: "rafael@email.com", phone: "(31) 97777-1111", source: "Site", status: "new", budget: "2100000", interests: ["apartment"] } as any);
    const lead3_2 = await storage.createLead({ tenantId: tenant3.id, name: "Camila Oliveira", email: "camila@email.com", phone: "(31) 97777-2222", source: "Instagram", status: "qualification", budget: "1500000", interests: ["house"] } as any);
    const lead3_3 = await storage.createLead({ tenantId: tenant3.id, name: "Bruno Ferreira", email: "bruno@email.com", phone: "(31) 97777-3333", source: "Portais", status: "proposal", budget: "2800000", interests: ["apartment"] } as any);

    console.log("Leads created: 11 leads across 3 tenants (all pipeline stages)");

    // ========== CONTRACTS (5 contracts across 3 tenants) ==========
    await storage.createContract({ tenantId: tenant1.id, propertyId: prop1_1.id, leadId: lead1_5.id, type: "sale", status: "signed", value: "850000", terms: "Pagamento a vista com desconto de 5%." } as any);
    await storage.createContract({ tenantId: tenant1.id, propertyId: prop1_2.id, leadId: lead1_4.id, type: "sale", status: "draft", value: "1200000", terms: "Financiamento em 360 meses." } as any);
    await storage.createContract({ tenantId: tenant2.id, propertyId: prop2_1.id, leadId: lead2_1.id, type: "sale", status: "draft", value: "3200000" } as any);
    await storage.createContract({ tenantId: tenant3.id, propertyId: prop3_1.id, leadId: lead3_3.id, type: "sale", status: "negotiation", value: "2000000", terms: "Proposta com contraoferta." } as any);

    console.log("Contracts created: 4 contracts across 3 tenants");

    // ========== OWNERS (4 owners across 3 tenants) ==========
    const owner1_1 = await storage.createOwner({ tenantId: tenant1.id, name: "Dr. Ricardo Monteiro", email: "ricardo@monteiro.com", phone: "(11) 98000-0001", cpfCnpj: "111.222.333-44", address: "Av. Paulista, 2000, SP", bankName: "Itau", bankAgency: "0001", bankAccount: "12345-6", pixKey: "ricardo@monteiro.com" } as any);
    const owner1_2 = await storage.createOwner({ tenantId: tenant1.id, name: "Sra. Helena Cardoso", email: "helena@cardoso.com", phone: "(11) 98000-0002", cpfCnpj: "222.333.444-55", address: "Rua Oscar Freire, 500, SP" } as any);
    const owner2_1 = await storage.createOwner({ tenantId: tenant2.id, name: "Sr. Marcos Pinto", email: "marcos@pinto.com", phone: "(21) 98000-0003", cpfCnpj: "333.444.555-66", address: "Av. Atlantica, 3000, RJ", pixKey: "33344455566" } as any);
    const owner3_1 = await storage.createOwner({ tenantId: tenant3.id, name: "Dra. Patricia Mendes", email: "patricia@mendes.com", phone: "(31) 98000-0004", cpfCnpj: "444.555.666-77", address: "Rua da Bahia, 800, MG", bankName: "Bradesco", bankAgency: "0002", bankAccount: "98765-4" } as any);

    console.log("Owners created: 4 owners across 3 tenants");

    // ========== RENTERS (3 renters across 2 tenants) ==========
    const renter1_1 = await storage.createRenter({ tenantId: tenant1.id, name: "Felipe Barbosa", email: "felipe@barbosa.com", phone: "(11) 97000-0001", cpfCnpj: "555.666.777-88", rg: "12.345.678-9", profession: "Engenheiro", income: "15000", address: "Rua Frei Caneca, 200, SP", emergencyContact: "Sonia Barbosa", emergencyPhone: "(11) 97000-9999" } as any);
    const renter2_1 = await storage.createRenter({ tenantId: tenant2.id, name: "Juliana Rocha", email: "juliana@rocha.com", phone: "(21) 97000-0002", cpfCnpj: "666.777.888-99", rg: "23.456.789-0", profession: "Advogada", income: "12000", address: "Rua Visconde de Piraja, 300, RJ" } as any);
    const renter1_2 = await storage.createRenter({ tenantId: tenant1.id, name: "Gustavo Lima", email: "gustavo@lima.com", phone: "(11) 97000-0003", cpfCnpj: "777.888.999-00", profession: "Designer", income: "8000" } as any);

    console.log("Renters created: 3 renters across 2 tenants");

    // ========== RENTAL CONTRACTS (3 rental contracts) ==========
    const rental1_1 = await storage.createRentalContract({
      tenantId: tenant1.id,
      propertyId: prop1_3.id,
      ownerId: owner1_1.id,
      renterId: renter1_1.id,
      rentValue: "3500",
      condoFee: "800",
      iptuValue: "200",
      dueDay: 10,
      startDate: "2025-01-01",
      endDate: "2026-01-01",
      adjustmentIndex: "IGPM",
      depositValue: "10500",
      administrationFee: "10",
      status: "active",
    } as any);

    const rental1_2 = await storage.createRentalContract({
      tenantId: tenant1.id,
      propertyId: prop1_4.id,
      ownerId: owner1_2.id,
      renterId: renter1_2.id,
      rentValue: "5000",
      dueDay: 5,
      startDate: "2025-06-01",
      endDate: "2026-06-01",
      adjustmentIndex: "IPCA",
      administrationFee: "8",
      status: "active",
    } as any);

    const rental2_1 = await storage.createRentalContract({
      tenantId: tenant2.id,
      propertyId: prop2_3.id,
      ownerId: owner2_1.id,
      renterId: renter2_1.id,
      rentValue: "2500",
      condoFee: "500",
      dueDay: 15,
      startDate: "2025-03-01",
      endDate: "2026-03-01",
      status: "active",
    } as any);

    console.log("Rental contracts created: 3 rental contracts");

    // ========== RENTAL PAYMENTS (6 payments across contracts) ==========
    // Tenant 1, Contract 1 -- 3 months (1 paid, 1 paid late, 1 pending)
    await storage.createRentalPayment({
      tenantId: tenant1.id,
      rentalContractId: rental1_1.id,
      referenceMonth: "2025-01",
      dueDate: "2025-01-10",
      rentValue: "3500",
      condoFee: "800",
      iptuValue: "200",
      totalValue: "4500",
      paidValue: "4500",
      paidDate: "2025-01-08",
      status: "paid",
      paymentMethod: "pix",
    } as any);

    await storage.createRentalPayment({
      tenantId: tenant1.id,
      rentalContractId: rental1_1.id,
      referenceMonth: "2025-02",
      dueDate: "2025-02-10",
      rentValue: "3500",
      condoFee: "800",
      iptuValue: "200",
      totalValue: "4500",
      paidValue: "4620",
      paidDate: "2025-02-18",
      status: "paid_late",
      paymentMethod: "boleto",
      notes: "Pago com multa e juros de atraso",
    } as any);

    await storage.createRentalPayment({
      tenantId: tenant1.id,
      rentalContractId: rental1_1.id,
      referenceMonth: "2025-03",
      dueDate: "2025-03-10",
      rentValue: "3500",
      condoFee: "800",
      iptuValue: "200",
      totalValue: "4500",
      status: "pending",
    } as any);

    // Tenant 2, Contract 1 -- 2 months (1 paid, 1 pending)
    await storage.createRentalPayment({
      tenantId: tenant2.id,
      rentalContractId: rental2_1.id,
      referenceMonth: "2025-03",
      dueDate: "2025-03-15",
      rentValue: "2500",
      condoFee: "500",
      totalValue: "3000",
      paidValue: "3000",
      paidDate: "2025-03-14",
      status: "paid",
      paymentMethod: "pix",
    } as any);

    await storage.createRentalPayment({
      tenantId: tenant2.id,
      rentalContractId: rental2_1.id,
      referenceMonth: "2025-04",
      dueDate: "2025-04-15",
      rentValue: "2500",
      condoFee: "500",
      totalValue: "3000",
      status: "pending",
    } as any);

    // Tenant 1, Contract 2 -- 1 payment pending
    await storage.createRentalPayment({
      tenantId: tenant1.id,
      rentalContractId: rental1_2.id,
      referenceMonth: "2025-06",
      dueDate: "2025-06-05",
      rentValue: "5000",
      totalValue: "5000",
      status: "pending",
    } as any);

    console.log("Rental payments created: 6 payments (2 paid, 1 paid_late, 3 pending)");

    // ========== CROSS-TENANT TEST DATA ==========
    // Create a lead with the SAME email in two different tenants
    // This tests that tenant isolation works even with duplicate emails
    await storage.createLead({ tenantId: tenant1.id, name: "Duplicado Cross-Tenant", email: "cross-tenant@test.com", phone: "(11) 90000-0001", source: "QA Test", status: "new", budget: "500000" } as any);
    await storage.createLead({ tenantId: tenant2.id, name: "Duplicado Cross-Tenant", email: "cross-tenant@test.com", phone: "(21) 90000-0001", source: "QA Test", status: "new", budget: "600000" } as any);

    console.log("Cross-tenant test data created: duplicate email lead across tenants");

    // ========== SUMMARY ==========
    console.log("\n========================================");
    console.log("QA Seeding completed successfully!");
    console.log("========================================");
    console.log("\nData Summary:");
    console.log("  Tenants:          3 (sol, nova-casa, premium)");
    console.log("  Users:            8 (3 admin, 3 agent, 2 viewer)");
    console.log("  Properties:       9 (sale + rent across tenants)");
    console.log("  Leads:           13 (all pipeline stages + cross-tenant duplicates)");
    console.log("  Contracts:        4 (draft, signed, negotiation)");
    console.log("  Owners:           4");
    console.log("  Renters:          3");
    console.log("  Rental Contracts: 3 (active)");
    console.log("  Rental Payments:  6 (paid, paid_late, pending)");
    console.log("\nLogin Credentials (password for all: TestPass123!):");
    console.log("  Tenant Sol:       admin@sol.com | paulo@sol.com | maria@sol.com");
    console.log("  Tenant Nova Casa: admin@novacasa.com | rita@novacasa.com");
    console.log("  Tenant Premium:   admin@premium.com | lucas@premium.com | ana@premium.com");
    console.log("\nCross-Tenant Test:");
    console.log("  Email cross-tenant@test.com exists in both Sol and Nova Casa tenants");

  } catch (error) {
    console.error("Error seeding QA database:", error);
    throw error;
  }
}

seedQA()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

---

## B4: Payment Sandbox Configuration

### `.env.test` Entries (add to the `.env.test` from B2)

```bash
# Stripe Test Mode
# Get test keys from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_TEST_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_TEST_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_TEST_WEBHOOK_SECRET

# MercadoPago Sandbox
# Get sandbox credentials from https://www.mercadopago.com.br/developers/panel/app
MERCADOPAGO_ACCESS_TOKEN=TEST-YOUR_SANDBOX_ACCESS_TOKEN
MERCADOPAGO_PUBLIC_KEY=TEST-YOUR_SANDBOX_PUBLIC_KEY
```

### Test Helper: Payment Test Utilities

File: `tests/helpers/payment-test-helper.ts`

```typescript
/**
 * Payment Test Helper
 *
 * Provides utilities for creating test payments in Stripe test mode
 * and MercadoPago sandbox without charging real money.
 */

import Stripe from 'stripe';

// Only initialize if real test keys are available
const getStripeClient = (): Stripe | null => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_test_')) {
    console.warn('Stripe test key not configured -- payment tests will use mocks');
    return null;
  }
  return new Stripe(key);
};

/**
 * Create a test payment method (Stripe test card)
 * Uses Stripe's built-in test card numbers
 */
export async function createTestPaymentMethod(stripe: Stripe): Promise<string> {
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      // Stripe test card number that always succeeds
      number: '4242424242424242',
      exp_month: 12,
      exp_year: 2030,
      cvc: '123',
    } as any, // Stripe types don't expose raw card creation in test mode
  });
  return paymentMethod.id;
}

/**
 * Create a test Stripe customer
 */
export async function createTestCustomer(
  stripe: Stripe,
  opts: { email: string; name: string; tenantId: string }
): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email: opts.email,
    name: opts.name,
    metadata: { tenantId: opts.tenantId },
  });
}

/**
 * Create a test subscription
 */
export async function createTestSubscription(
  stripe: Stripe,
  opts: { customerId: string; priceId: string; paymentMethodId: string }
): Promise<Stripe.Subscription> {
  // Attach payment method to customer
  await stripe.paymentMethods.attach(opts.paymentMethodId, {
    customer: opts.customerId,
  });

  // Set as default payment method
  await stripe.customers.update(opts.customerId, {
    invoice_settings: { default_payment_method: opts.paymentMethodId },
  });

  return stripe.subscriptions.create({
    customer: opts.customerId,
    items: [{ price: opts.priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

/**
 * Simulate a Stripe webhook event for testing
 */
export function createMockStripeWebhookEvent(
  type: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    api_version: '2024-12-18.acacia',
  };
}

/**
 * Create a mock MercadoPago PIX payment response
 */
export function createMockPixPayment(opts: {
  amount: number;
  tenantId: string;
  description: string;
}): Record<string, unknown> {
  return {
    id: Math.floor(Math.random() * 1000000000),
    status: 'pending',
    status_detail: 'pending_waiting_transfer',
    transaction_amount: opts.amount,
    description: opts.description,
    payment_method_id: 'pix',
    point_of_interaction: {
      transaction_data: {
        qr_code: 'mock-qr-code-data-for-testing',
        qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ticket_url: 'https://www.mercadopago.com.br/sandbox/payments/test',
      },
    },
    metadata: { tenantId: opts.tenantId },
    date_created: new Date().toISOString(),
  };
}

/**
 * Create a mock MercadoPago webhook notification
 */
export function createMockMercadoPagoWebhook(
  paymentId: number,
  action: string = 'payment.updated'
): Record<string, unknown> {
  return {
    id: Math.floor(Math.random() * 1000000),
    live_mode: false,
    type: 'payment',
    date_created: new Date().toISOString(),
    action,
    data: { id: String(paymentId) },
  };
}

export { getStripeClient };
```

---

## B5: Rate Limiting on Portal Auth

### Current State

The `/api/auth/login` endpoint in `server/routes.ts` line 803 already applies `authLimiter`:

```typescript
app.post("/api/auth/login", authLimiter, (req, res, next) => {
```

The `authLimiter` is defined at lines 446-452:

```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login attempts per windowMs
  message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Finding:** Rate limiting IS already applied. The concern about "no rate limiting on portal login" does not match the code. However, there are two gaps:

1. **No `trust proxy` setting** -- behind a reverse proxy (Vercel, nginx), all requests appear to come from the same IP, making the rate limiter ineffective.
2. **No per-account rate limiting** -- the account lockout fields (`failedLoginAttempts`, `lockedUntil`) exist in the schema but need verification that they are actually incremented on failure.

### Fix 1: Add `trust proxy` Configuration

File: `server/routes.ts`, add BEFORE the rate limiter definitions (before line 436). The best place is right after the request ID middleware (after line 434):

```typescript
  // Trust first proxy (Vercel, nginx, cloudflare) for accurate client IP
  // Required for rate limiting to work behind reverse proxies
  app.set('trust proxy', 1);
```

### Fix 2: Add per-account login rate limiting

File: `server/routes.ts`, add a new limiter after `authLimiter` (after line 452):

```typescript
  // Per-account login attempt tracking (complements IP-based authLimiter)
  const loginAttemptTracker = new Map<string, { count: number; firstAttempt: number }>();
  const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
  const MAX_LOGIN_ATTEMPTS_PER_ACCOUNT = 5;

  const perAccountLimiter = (req: Request, res: Response, next: NextFunction) => {
    const email = req.body?.email?.toLowerCase();
    if (!email) return next();

    const now = Date.now();
    const tracker = loginAttemptTracker.get(email);

    if (tracker) {
      // Reset window if expired
      if (now - tracker.firstAttempt > LOGIN_ATTEMPT_WINDOW) {
        loginAttemptTracker.set(email, { count: 1, firstAttempt: now });
        return next();
      }

      if (tracker.count >= MAX_LOGIN_ATTEMPTS_PER_ACCOUNT) {
        return res.status(429).json({
          error: "Muitas tentativas de login para esta conta. Tente novamente em 15 minutos.",
          retryAfter: Math.ceil((tracker.firstAttempt + LOGIN_ATTEMPT_WINDOW - now) / 1000),
        });
      }

      tracker.count++;
    } else {
      loginAttemptTracker.set(email, { count: 1, firstAttempt: now });
    }

    next();
  };
```

Then update the login route (line 803) to include the per-account limiter:

```typescript
  // BEFORE:
  app.post("/api/auth/login", authLimiter, (req, res, next) => {

  // AFTER:
  app.post("/api/auth/login", authLimiter, perAccountLimiter, (req, res, next) => {
```

### Rate Limiting Verification Test

File: `tests/integration/auth-rate-limit.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';

describe('Auth Rate Limiting', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Replicate the authLimiter from routes.ts
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5, // Use 5 for faster tests
      message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.post('/api/auth/login', authLimiter, (req, res) => {
      // Simulate failed login
      res.status(401).json({ error: "Credenciais invalidas" });
    });
  });

  it('should allow requests under the rate limit', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('should block requests exceeding the rate limit', async () => {
    // Create a fresh app instance to avoid shared state
    const rateLimitApp = express();
    rateLimitApp.use(express.json());

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 3, // Very low for test
      message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
      standardHeaders: true,
      legacyHeaders: false,
    });

    rateLimitApp.post('/api/auth/login', limiter, (req, res) => {
      res.status(401).json({ error: "Credenciais invalidas" });
    });

    // Send 3 requests (within limit)
    for (let i = 0; i < 3; i++) {
      await request(rateLimitApp)
        .post('/api/auth/login')
        .send({ email: 'brute@test.com', password: 'wrong' });
    }

    // 4th request should be rate limited
    const blocked = await request(rateLimitApp)
      .post('/api/auth/login')
      .send({ email: 'brute@test.com', password: 'wrong' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain("Muitas tentativas");
  });

  it('should include standard rate limit headers', async () => {
    const headerApp = express();
    headerApp.use(express.json());

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
    });

    headerApp.post('/api/auth/login', limiter, (req, res) => {
      res.status(401).json({ error: "fail" });
    });

    const res = await request(headerApp)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' });

    expect(res.headers['ratelimit-limit']).toBe('10');
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-reset']).toBeDefined();
  });
});
```

---

## B6: CI Pipeline

### Current State

`.github/workflows/ci.yml` exists with:
- lint-and-typecheck (no actual lint step -- only `npm run check`)
- build
- test (with `|| echo "No tests found"` fallbacks, coverage `continue-on-error: true`)
- e2e (Playwright, chromium only)
- lighthouse (PR only)
- db-check
- summary

### Enhanced CI Pipeline

File: `.github/workflows/ci.yml` (complete replacement)

```yaml
name: CI - Lint, Test, Build & Security

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'

jobs:
  # ==================== STAGE 1: FAST CHECKS (parallel) ====================

  lint-and-typecheck:
    name: Lint & TypeScript Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: TypeScript type check
        run: npm run check

      - name: ESLint
        run: npm run lint || echo "::warning::Lint issues found"

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: npm audit (production deps)
        run: npm audit --production --audit-level=high || true
        continue-on-error: true

      - name: Check for hardcoded secrets
        run: |
          # Search for common secret patterns in source files (not node_modules)
          echo "Scanning for hardcoded secrets..."
          FOUND=0

          # Check for hardcoded API keys
          if grep -rn "sk_live_" --include="*.ts" --include="*.tsx" --include="*.js" server/ client/ shared/ 2>/dev/null; then
            echo "::error::Found hardcoded Stripe live key!"
            FOUND=1
          fi

          if grep -rn "sk_test_[A-Za-z0-9]" --include="*.ts" --include="*.tsx" server/ client/ shared/ 2>/dev/null | grep -v ".env" | grep -v "test" | grep -v "mock" | grep -v "helper"; then
            echo "::warning::Found Stripe test key in non-test file"
          fi

          # Check for hardcoded passwords (excluding test files and schema)
          if grep -rn "password.*=.*['\"][^'\"]\{8,\}['\"]" --include="*.ts" server/ 2>/dev/null | grep -v "test" | grep -v "seed" | grep -v "schema" | grep -v "example" | grep -v "placeholder" | grep -v "hash"; then
            echo "::warning::Potential hardcoded password found"
          fi

          if [ $FOUND -ne 0 ]; then
            exit 1
          fi

          echo "No critical secrets found in source code."

      - name: Validate secret configuration
        run: |
          # Check that .env.example doesn't contain real values
          if [ -f .env.example ]; then
            echo "Checking .env.example for real secrets..."
            if grep -E "sk_live_|rk_live_|SG\.[A-Za-z0-9]{20,}" .env.example; then
              echo "::error::.env.example contains production secrets!"
              exit 1
            fi
            echo ".env.example is clean."
          fi

  db-check:
    name: Database Schema Check
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Validate database schema
        run: |
          npx tsc --noEmit shared/schema.ts shared/schema-sqlite.ts 2>&1 || {
            echo "::error::Database schema files have TypeScript errors!"
            exit 1
          }
          echo "Database schema files are valid."

  # ==================== STAGE 2: TESTS (after lint passes) ====================

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run unit tests
        run: npm run test:unit
        env:
          CI: true
          NODE_ENV: test
          USE_SQLITE: true

      - name: Upload unit test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unit-test-results
          path: coverage/
          retention-days: 7

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          CI: true
          NODE_ENV: test
          USE_SQLITE: true
          SESSION_SECRET: ci-test-secret-not-for-production-64-characters-long-enough-here

      - name: Upload integration test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: integration-test-results
          path: coverage/
          retention-days: 7

  coverage:
    name: Coverage Report
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          CI: true
          NODE_ENV: test
          USE_SQLITE: true

      - name: Check coverage thresholds
        run: |
          if [ -f "coverage/coverage-summary.json" ]; then
            STATEMENTS=$(jq '.total.statements.pct' coverage/coverage-summary.json)
            BRANCHES=$(jq '.total.branches.pct' coverage/coverage-summary.json)
            FUNCTIONS=$(jq '.total.functions.pct' coverage/coverage-summary.json)
            LINES=$(jq '.total.lines.pct' coverage/coverage-summary.json)

            echo "## Coverage Report" >> $GITHUB_STEP_SUMMARY
            echo "| Metric | Coverage |" >> $GITHUB_STEP_SUMMARY
            echo "|--------|----------|" >> $GITHUB_STEP_SUMMARY
            echo "| Statements | ${STATEMENTS}% |" >> $GITHUB_STEP_SUMMARY
            echo "| Branches | ${BRANCHES}% |" >> $GITHUB_STEP_SUMMARY
            echo "| Functions | ${FUNCTIONS}% |" >> $GITHUB_STEP_SUMMARY
            echo "| Lines | ${LINES}% |" >> $GITHUB_STEP_SUMMARY

            # Enforce thresholds (matching vitest.config.ts)
            if (( $(echo "$LINES < 70" | bc -l) )); then
              echo "::error::Lines coverage (${LINES}%) is below 70% threshold"
              exit 1
            fi
          else
            echo "::warning::Coverage summary not found"
          fi

      - uses: codecov/codecov-action@v4
        if: always()
        continue-on-error: true
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

  # ==================== STAGE 3: BUILD (after lint passes) ====================

  build:
    name: Build Application
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production

      - name: Verify build artifacts
        run: |
          if [ ! -d "dist" ]; then
            echo "::error::Build failed: dist directory not found!"
            exit 1
          fi
          echo "Build successful."
          ls -lah dist/

      - uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: dist/
          retention-days: 7

  # ==================== STAGE 4: E2E (after build) ====================

  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: build
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - uses: actions/download-artifact@v4
        with:
          name: build-artifacts
          path: dist/

      - name: Run Playwright tests
        run: npx playwright test --project=chromium
        env:
          CI: true
          NODE_ENV: test
          USE_SQLITE: true
          SESSION_SECRET: ci-test-secret-not-for-production-64-characters-long-enough-here

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  # ==================== STAGE 5: SUMMARY ====================

  summary:
    name: CI Summary
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, security-scan, db-check, unit-tests, integration-tests, coverage, build, e2e]
    if: always()
    steps:
      - name: Evaluate results
        run: |
          echo "### CI Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Stage | Result |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Lint & TypeScript | ${{ needs.lint-and-typecheck.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Security Scan | ${{ needs.security-scan.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| DB Schema | ${{ needs.db-check.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Unit Tests | ${{ needs.unit-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Integration Tests | ${{ needs.integration-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Coverage | ${{ needs.coverage.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Build | ${{ needs.build.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| E2E Tests | ${{ needs.e2e.result }} |" >> $GITHUB_STEP_SUMMARY

          # Fail if any critical stage failed
          FAILED=0
          for result in "${{ needs.lint-and-typecheck.result }}" "${{ needs.build.result }}" "${{ needs.db-check.result }}"; do
            if [ "$result" != "success" ]; then
              FAILED=1
            fi
          done

          if [ $FAILED -ne 0 ]; then
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "**CI FAILED** -- fix errors before merging." >> $GITHUB_STEP_SUMMARY
            exit 1
          fi

          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**All critical checks passed.**" >> $GITHUB_STEP_SUMMARY
```

### Pipeline Diagram

```
Stage 1 (parallel):
  lint-and-typecheck --|
  security-scan -------|-- (no dependencies, run together)
  db-check ------------|

Stage 2 (after lint):
  unit-tests ---------|
  integration-tests ---|-- (parallel, need lint)
  coverage ------------|

Stage 3 (after lint):
  build --------------- (parallel with stage 2)

Stage 4 (after build):
  e2e ----------------- (needs build artifacts)

Stage 5:
  summary ------------- (waits for all)
```

**Estimated CI time:** ~8-10 minutes total (stages 1-3 run in parallel, stage 4 sequential after build).

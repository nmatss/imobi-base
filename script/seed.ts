import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { nanoid } from "nanoid";
import * as schema from "../shared/schema-sqlite";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("Iniciando seed do banco de dados SQLite...\n");

  // Create/connect to SQLite database
  const sqlite = new Database("./data/imobibase.db");
  sqlite.pragma("journal_mode = WAL");

  const db = drizzle(sqlite, { schema });

  // Create tables
  console.log("Criando tabelas...");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo TEXT,
      primary_color TEXT NOT NULL DEFAULT '#0066cc',
      secondary_color TEXT NOT NULL DEFAULT '#333333',
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      price TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip_code TEXT,
      bedrooms INTEGER,
      bathrooms INTEGER,
      area INTEGER,
      features TEXT,
      images TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      budget TEXT,
      interests TEXT,
      notes TEXT,
      assigned_to TEXT REFERENCES users(id),
      preferred_type TEXT,
      preferred_category TEXT,
      preferred_city TEXT,
      preferred_neighborhood TEXT,
      min_bedrooms INTEGER,
      max_bedrooms INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      property_id TEXT NOT NULL REFERENCES properties(id),
      lead_id TEXT REFERENCES leads(id),
      scheduled_for TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      assigned_to TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      property_id TEXT NOT NULL REFERENCES properties(id),
      lead_id TEXT NOT NULL REFERENCES leads(id),
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      value TEXT NOT NULL,
      terms TEXT,
      signed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      tenant_id TEXT REFERENCES tenants(id),
      subscribed_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS owners (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      cpf_cnpj TEXT,
      address TEXT,
      bank_name TEXT,
      bank_agency TEXT,
      bank_account TEXT,
      pix_key TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS renters (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      cpf_cnpj TEXT,
      rg TEXT,
      profession TEXT,
      income TEXT,
      address TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rental_contracts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      property_id TEXT NOT NULL REFERENCES properties(id),
      owner_id TEXT NOT NULL REFERENCES owners(id),
      renter_id TEXT NOT NULL REFERENCES renters(id),
      rent_value TEXT NOT NULL,
      condo_fee TEXT,
      iptu_value TEXT,
      due_day INTEGER NOT NULL DEFAULT 10,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      adjustment_index TEXT DEFAULT 'IGPM',
      deposit_value TEXT,
      administration_fee TEXT DEFAULT '10',
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rental_payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      rental_contract_id TEXT NOT NULL REFERENCES rental_contracts(id),
      reference_month TEXT NOT NULL,
      due_date TEXT NOT NULL,
      rent_value TEXT NOT NULL,
      condo_fee TEXT,
      iptu_value TEXT,
      extra_charges TEXT,
      discounts TEXT,
      total_value TEXT NOT NULL,
      paid_value TEXT,
      paid_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_proposals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      property_id TEXT NOT NULL REFERENCES properties(id),
      lead_id TEXT NOT NULL REFERENCES leads(id),
      proposed_value TEXT NOT NULL,
      validity_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS property_sales (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      property_id TEXT NOT NULL REFERENCES properties(id),
      buyer_lead_id TEXT NOT NULL REFERENCES leads(id),
      seller_id TEXT REFERENCES owners(id),
      broker_id TEXT REFERENCES users(id),
      sale_value TEXT NOT NULL,
      sale_date TEXT NOT NULL,
      commission_rate TEXT DEFAULT '6',
      commission_value TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS finance_categories (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT DEFAULT '#6b7280',
      is_system_generated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS finance_entries (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      category_id TEXT REFERENCES finance_categories(id),
      source_type TEXT,
      source_id TEXT,
      description TEXT NOT NULL,
      amount TEXT NOT NULL,
      flow TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lead_tags (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lead_tag_links (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      tag_id TEXT NOT NULL REFERENCES lead_tags(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      lead_id TEXT NOT NULL REFERENCES leads(id),
      assigned_to TEXT REFERENCES users(id),
      due_at TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
  console.log("Tabelas criadas com sucesso!\n");

  const now = new Date().toISOString();

  // Create demo tenant
  console.log("Criando tenant de demonstração...");
  const tenantId = nanoid();
  await db.insert(schema.tenants).values({
    id: tenantId,
    name: "Imobiliária Demo",
    slug: "demo",
    primaryColor: "#0066cc",
    secondaryColor: "#333333",
    phone: "(11) 99999-9999",
    email: "contato@imobiliariademo.com.br",
    address: "Rua das Flores, 123 - Centro, São Paulo - SP",
    createdAt: now,
  });

  // Create demo user (password: demo123)
  console.log("Criando usuário de demonstração...");
  const userId = nanoid();
  const hashedPassword = await hashPassword("demo123");
  await db.insert(schema.users).values({
    id: userId,
    tenantId,
    name: "Administrador Demo",
    email: "admin@demo.com",
    password: hashedPassword,
    role: "admin",
    createdAt: now,
  });

  // Create demo properties
  console.log("Criando imóveis de demonstração...");
  const properties = [
    {
      id: nanoid(),
      tenantId,
      title: "Apartamento de Luxo - Vila Mariana",
      description: "Lindo apartamento com vista panorâmica, 3 suítes, varanda gourmet e 2 vagas de garagem. Condomínio com piscina, academia e salão de festas.",
      type: "apartment",
      category: "sale",
      price: "850000",
      address: "Rua Domingos de Morais, 1500",
      city: "São Paulo",
      state: "SP",
      zipCode: "04010-100",
      bedrooms: 3,
      bathrooms: 3,
      area: 120,
      features: JSON.stringify(["Piscina", "Academia", "Salão de festas", "Portaria 24h"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]),
      status: "available",
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      tenantId,
      title: "Casa em Condomínio - Alphaville",
      description: "Casa espaçosa em condomínio fechado, 4 quartos sendo 2 suítes, jardim amplo, churrasqueira e piscina privativa.",
      type: "house",
      category: "sale",
      price: "1500000",
      address: "Alameda dos Ipês, 200",
      city: "Barueri",
      state: "SP",
      zipCode: "06453-000",
      bedrooms: 4,
      bathrooms: 4,
      area: 350,
      features: JSON.stringify(["Piscina privativa", "Churrasqueira", "Jardim", "Segurança 24h"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"]),
      status: "available",
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      tenantId,
      title: "Studio Moderno - Pinheiros",
      description: "Studio compacto e moderno, ideal para jovens profissionais. Próximo ao metrô e comércios.",
      type: "apartment",
      category: "rent",
      price: "2500",
      address: "Rua dos Pinheiros, 800",
      city: "São Paulo",
      state: "SP",
      zipCode: "05422-001",
      bedrooms: 1,
      bathrooms: 1,
      area: 35,
      features: JSON.stringify(["Mobiliado", "Ar condicionado", "Internet inclusa"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"]),
      status: "available",
      featured: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      tenantId,
      title: "Cobertura Duplex - Moema",
      description: "Cobertura duplex com terraço gourmet, 4 suítes, piscina privativa e vista para o parque Ibirapuera.",
      type: "apartment",
      category: "sale",
      price: "3200000",
      address: "Av. Ibirapuera, 2500",
      city: "São Paulo",
      state: "SP",
      zipCode: "04029-100",
      bedrooms: 4,
      bathrooms: 5,
      area: 400,
      features: JSON.stringify(["Terraço gourmet", "Piscina privativa", "Home office", "Adega"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"]),
      status: "available",
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const property of properties) {
    await db.insert(schema.properties).values(property as any);
  }

  // Create demo leads
  console.log("Criando leads de demonstração...");
  const leads = [
    {
      id: nanoid(),
      tenantId,
      name: "João Silva",
      email: "joao.silva@email.com",
      phone: "(11) 98765-4321",
      source: "website",
      status: "new",
      budget: "900000",
      preferredType: "apartment",
      preferredCategory: "sale",
      preferredCity: "São Paulo",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      tenantId,
      name: "Maria Santos",
      email: "maria.santos@email.com",
      phone: "(11) 91234-5678",
      source: "referral",
      status: "qualification",
      budget: "3000",
      preferredType: "apartment",
      preferredCategory: "rent",
      preferredCity: "São Paulo",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      tenantId,
      name: "Carlos Oliveira",
      email: "carlos.oliveira@email.com",
      phone: "(11) 97777-8888",
      source: "portal",
      status: "visit",
      budget: "1800000",
      preferredType: "house",
      preferredCategory: "sale",
      preferredCity: "Barueri",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const lead of leads) {
    await db.insert(schema.leads).values(lead as any);
  }

  // Create demo tags
  console.log("Criando tags de demonstração...");
  const tags = [
    { id: nanoid(), tenantId, name: "VIP", color: "#f59e0b", createdAt: now },
    { id: nanoid(), tenantId, name: "Urgente", color: "#ef4444", createdAt: now },
    { id: nanoid(), tenantId, name: "Investidor", color: "#10b981", createdAt: now },
  ];

  for (const tag of tags) {
    await db.insert(schema.leadTags).values(tag);
  }

  console.log("\n===========================================");
  console.log("Seed concluído com sucesso!");
  console.log("===========================================\n");
  console.log("Credenciais de acesso:");
  console.log("  Email: admin@demo.com");
  console.log("  Senha: demo123");
  console.log("\nLanding page pública: http://localhost:5000/e/demo");
  console.log("===========================================\n");

  sqlite.close();
}

seed().catch(console.error);

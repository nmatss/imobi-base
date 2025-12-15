import pkg from "pg";
const { Pool } = pkg;

// Connection string from environment variable
const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  console.log("Conectando ao Supabase...");

  const client = await pool.connect();

  try {
    // 1. Listar e deletar todas as tabelas existentes
    console.log("\n1. Listando tabelas existentes...");

    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
      AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
    `);

    const existingTables = tablesResult.rows.map(r => r.tablename);
    console.log("Tabelas encontradas:", existingTables);

    if (existingTables.length > 0) {
      console.log("\n2. Deletando tabelas existentes...");

      // Desabilitar verificação de foreign keys temporariamente
      await client.query("SET session_replication_role = 'replica';");

      for (const table of existingTables) {
        console.log(`   Deletando: ${table}`);
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      }

      // Reabilitar verificação de foreign keys
      await client.query("SET session_replication_role = 'origin';");

      console.log("   Todas as tabelas foram deletadas!");
    }

    // 3. Criar as novas tabelas
    console.log("\n3. Criando novas tabelas...");

    await client.query(`
      -- Tabela de Tenants (Imobiliárias)
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        logo TEXT,
        primary_color TEXT NOT NULL DEFAULT '#0066cc',
        secondary_color TEXT NOT NULL DEFAULT '#333333',
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Usuários
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        avatar TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Imóveis
      CREATE TABLE IF NOT EXISTS properties (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        price DECIMAL(12, 2) NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip_code TEXT,
        bedrooms INTEGER,
        bathrooms INTEGER,
        area INTEGER,
        features TEXT[],
        images TEXT[],
        status TEXT NOT NULL DEFAULT 'available',
        featured BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Leads
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        budget DECIMAL(12, 2),
        interests TEXT[],
        notes TEXT,
        assigned_to VARCHAR(255) REFERENCES users(id),
        preferred_type TEXT,
        preferred_category TEXT,
        preferred_city TEXT,
        preferred_neighborhood TEXT,
        min_bedrooms INTEGER,
        max_bedrooms INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Interações com Leads
      CREATE TABLE IF NOT EXISTS interactions (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Tags de Leads
      CREATE TABLE IF NOT EXISTS lead_tags (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#3b82f6',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Links Lead-Tag
      CREATE TABLE IF NOT EXISTS lead_tag_links (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        tag_id VARCHAR(255) NOT NULL REFERENCES lead_tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Follow-ups
      CREATE TABLE IF NOT EXISTS follow_ups (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        assigned_to VARCHAR(255) REFERENCES users(id),
        due_at TIMESTAMP NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Visitas
      CREATE TABLE IF NOT EXISTS visits (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        lead_id VARCHAR(255) REFERENCES leads(id),
        scheduled_for TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        assigned_to VARCHAR(255) REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Contratos
      CREATE TABLE IF NOT EXISTS contracts (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        value DECIMAL(12, 2) NOT NULL,
        terms TEXT,
        signed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Proprietários
      CREATE TABLE IF NOT EXISTS owners (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Inquilinos
      CREATE TABLE IF NOT EXISTS renters (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        cpf_cnpj TEXT,
        rg TEXT,
        profession TEXT,
        income DECIMAL(12, 2),
        address TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Contratos de Aluguel
      CREATE TABLE IF NOT EXISTS rental_contracts (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        owner_id VARCHAR(255) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
        renter_id VARCHAR(255) NOT NULL REFERENCES renters(id) ON DELETE CASCADE,
        rent_value DECIMAL(12, 2) NOT NULL,
        condo_fee DECIMAL(12, 2),
        iptu_value DECIMAL(12, 2),
        due_day INTEGER NOT NULL DEFAULT 10,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        adjustment_index TEXT DEFAULT 'IGPM',
        deposit_value DECIMAL(12, 2),
        administration_fee DECIMAL(5, 2) DEFAULT 10,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Pagamentos de Aluguel
      CREATE TABLE IF NOT EXISTS rental_payments (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        rental_contract_id VARCHAR(255) NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
        reference_month TEXT NOT NULL,
        due_date DATE NOT NULL,
        rent_value DECIMAL(12, 2) NOT NULL,
        condo_fee DECIMAL(12, 2),
        iptu_value DECIMAL(12, 2),
        extra_charges DECIMAL(12, 2),
        discounts DECIMAL(12, 2),
        total_value DECIMAL(12, 2) NOT NULL,
        paid_value DECIMAL(12, 2),
        paid_date DATE,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Propostas de Venda
      CREATE TABLE IF NOT EXISTS sale_proposals (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        proposed_value DECIMAL(12, 2) NOT NULL,
        validity_date DATE,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Vendas de Imóveis
      CREATE TABLE IF NOT EXISTS property_sales (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        buyer_lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        seller_id VARCHAR(255) REFERENCES owners(id),
        broker_id VARCHAR(255) REFERENCES users(id),
        sale_value DECIMAL(12, 2) NOT NULL,
        sale_date DATE NOT NULL,
        commission_rate DECIMAL(5, 2) DEFAULT 6,
        commission_value DECIMAL(12, 2),
        status TEXT NOT NULL DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Categorias Financeiras
      CREATE TABLE IF NOT EXISTS finance_categories (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        color TEXT DEFAULT '#6b7280',
        is_system_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Lançamentos Financeiros
      CREATE TABLE IF NOT EXISTS finance_entries (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        category_id VARCHAR(255) REFERENCES finance_categories(id),
        source_type TEXT,
        source_id VARCHAR(255),
        description TEXT NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        flow TEXT NOT NULL,
        entry_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de Newsletter
      CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT NOT NULL UNIQUE,
        tenant_id VARCHAR(255) REFERENCES tenants(id),
        subscribed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        active BOOLEAN NOT NULL DEFAULT true
      );

      -- Tabela de Sessões (para express-session com connect-pg-simple)
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL COLLATE "default",
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL,
        PRIMARY KEY ("sid")
      );

      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    console.log("   Todas as tabelas foram criadas!");

    // 4. Verificar tabelas criadas
    console.log("\n4. Verificando tabelas criadas...");
    const newTablesResult = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      ORDER BY tablename
    `);

    console.log("Tabelas no banco de dados:");
    newTablesResult.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.tablename}`);
    });

    console.log("\nBanco de dados configurado com sucesso!");

  } catch (error) {
    console.error("Erro:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase()
  .then(() => {
    console.log("\nScript finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nErro fatal:", error);
    process.exit(1);
  });

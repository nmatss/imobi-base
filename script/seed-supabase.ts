import pkg from "pg";
const { Pool } = pkg;
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

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

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("Conectando ao Supabase para seed...");

  const client = await pool.connect();

  try {
    // Limpar dados existentes
    console.log("\n1. Limpando dados existentes...");
    await client.query("DELETE FROM finance_entries");
    await client.query("DELETE FROM finance_categories");
    await client.query("DELETE FROM property_sales");
    await client.query("DELETE FROM sale_proposals");
    await client.query("DELETE FROM rental_payments");
    await client.query("DELETE FROM rental_contracts");
    await client.query("DELETE FROM renters");
    await client.query("DELETE FROM owners");
    await client.query("DELETE FROM contracts");
    await client.query("DELETE FROM visits");
    await client.query("DELETE FROM follow_ups");
    await client.query("DELETE FROM lead_tag_links");
    await client.query("DELETE FROM lead_tags");
    await client.query("DELETE FROM interactions");
    await client.query("DELETE FROM leads");
    await client.query("DELETE FROM properties");
    await client.query("DELETE FROM users");
    await client.query("DELETE FROM tenants");
    console.log("   Dados limpos!");

    // Criar Tenants
    console.log("\n2. Criando imobiliárias (tenants)...");

    const tenant1Result = await client.query(`
      INSERT INTO tenants (name, slug, primary_color, secondary_color, phone, email, address)
      VALUES ('Imobiliária Sol', 'sol', '#f97316', '#ea580c', '(11) 98765-4321', 'contato@imobiliariasol.com', 'Av. Paulista, 1000 - São Paulo, SP')
      RETURNING id
    `);
    const tenant1Id = tenant1Result.rows[0].id;

    const tenant2Result = await client.query(`
      INSERT INTO tenants (name, slug, primary_color, secondary_color, phone, email, address)
      VALUES ('Nova Casa Imóveis', 'nova-casa', '#3b82f6', '#2563eb', '(21) 97654-3210', 'vendas@novacasa.com', 'Rua das Flores, 500 - Rio de Janeiro, RJ')
      RETURNING id
    `);
    const tenant2Id = tenant2Result.rows[0].id;

    const tenant3Result = await client.query(`
      INSERT INTO tenants (name, slug, primary_color, secondary_color, phone, email, address)
      VALUES ('Imobiliária Demo', 'demo', '#0066cc', '#333333', '(11) 99999-9999', 'contato@imobiliariademo.com.br', 'Rua das Flores, 123 - Centro, São Paulo - SP')
      RETURNING id
    `);
    const tenant3Id = tenant3Result.rows[0].id;

    console.log("   3 imobiliárias criadas!");

    // Criar Usuários
    console.log("\n3. Criando usuários...");
    const hashedPassword = await hashPassword("password");
    const hashedDemo = await hashPassword("demo123");

    const user1Result = await client.query(`
      INSERT INTO users (tenant_id, name, email, password, role)
      VALUES ($1, 'Admin Sol', 'admin@sol.com', $2, 'admin')
      RETURNING id
    `, [tenant1Id, hashedPassword]);
    const user1Id = user1Result.rows[0].id;

    await client.query(`
      INSERT INTO users (tenant_id, name, email, password, role)
      VALUES ($1, 'Admin Nova Casa', 'admin@novacasa.com', $2, 'admin')
    `, [tenant2Id, hashedPassword]);

    await client.query(`
      INSERT INTO users (tenant_id, name, email, password, role)
      VALUES ($1, 'Administrador Demo', 'admin@demo.com', $2, 'admin')
    `, [tenant3Id, hashedDemo]);

    console.log("   3 usuários criados!");

    // Criar Imóveis
    console.log("\n4. Criando imóveis...");

    // Imóveis para Imobiliária Sol
    const properties1 = [
      {
        title: "Apartamento Moderno 3 Quartos",
        description: "Lindo apartamento com acabamento premium, varanda gourmet e vista panorâmica. Condomínio completo com piscina, academia e salão de festas.",
        type: "apartment",
        category: "sale",
        price: 850000,
        address: "Rua Augusta, 1500",
        city: "São Paulo",
        state: "SP",
        zip_code: "01305-100",
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        features: ["Varanda", "Academia", "Piscina", "Salão de Festas"],
        images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
        status: "available",
        featured: true
      },
      {
        title: "Casa Térrea com Piscina",
        description: "Casa espaçosa em condomínio fechado, com piscina aquecida, churrasqueira e amplo jardim.",
        type: "house",
        category: "sale",
        price: 1200000,
        address: "Alameda dos Anjos, 250",
        city: "São Paulo",
        state: "SP",
        zip_code: "04500-000",
        bedrooms: 4,
        bathrooms: 3,
        area: 350,
        features: ["Piscina", "Churrasqueira", "Jardim", "Garagem 3 vagas"],
        images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"],
        status: "available",
        featured: true
      },
      {
        title: "Cobertura Duplex Luxo",
        description: "Cobertura duplex com rooftop privativo, hidromassagem e vista para a cidade.",
        type: "apartment",
        category: "sale",
        price: 2500000,
        address: "Av. Beira Mar, 3000",
        city: "São Paulo",
        state: "SP",
        zip_code: "01400-000",
        bedrooms: 5,
        bathrooms: 4,
        area: 400,
        features: ["Rooftop", "Hidromassagem", "Vista Panorâmica", "Garagem 4 vagas"],
        images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"],
        status: "available",
        featured: true
      },
      {
        title: "Apartamento para Locação 2 Quartos",
        description: "Apartamento mobiliado em ótima localização, próximo ao metrô.",
        type: "apartment",
        category: "rent",
        price: 3500,
        address: "Rua dos Pinheiros, 800",
        city: "São Paulo",
        state: "SP",
        zip_code: "05422-001",
        bedrooms: 2,
        bathrooms: 1,
        area: 75,
        features: ["Mobiliado", "Próximo ao Metrô"],
        images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
        status: "available",
        featured: false
      }
    ];

    for (const prop of properties1) {
      await client.query(`
        INSERT INTO properties (tenant_id, title, description, type, category, price, address, city, state, zip_code, bedrooms, bathrooms, area, features, images, status, featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [tenant1Id, prop.title, prop.description, prop.type, prop.category, prop.price, prop.address, prop.city, prop.state, prop.zip_code, prop.bedrooms, prop.bathrooms, prop.area, prop.features, prop.images, prop.status, prop.featured]);
    }

    // Imóveis para Nova Casa
    const properties2 = [
      {
        title: "Apartamento Vista Mar Ipanema",
        description: "Apartamento de alto padrão com vista privilegiada para o mar de Ipanema.",
        type: "apartment",
        category: "sale",
        price: 3200000,
        address: "Av. Vieira Souto, 500",
        city: "Rio de Janeiro",
        state: "RJ",
        zip_code: "22420-002",
        bedrooms: 3,
        bathrooms: 3,
        area: 180,
        features: ["Vista Mar", "Portaria 24h", "Lazer Completo"],
        images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"],
        status: "available",
        featured: true
      },
      {
        title: "Casa Condomínio Barra",
        description: "Casa linda em condomínio de luxo na Barra da Tijuca.",
        type: "house",
        category: "sale",
        price: 1800000,
        address: "Estrada do Pontal, 1200",
        city: "Rio de Janeiro",
        state: "RJ",
        zip_code: "22790-000",
        bedrooms: 4,
        bathrooms: 4,
        area: 300,
        features: ["Piscina", "Sauna", "Segurança 24h"],
        images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"],
        status: "available",
        featured: true
      }
    ];

    for (const prop of properties2) {
      await client.query(`
        INSERT INTO properties (tenant_id, title, description, type, category, price, address, city, state, zip_code, bedrooms, bathrooms, area, features, images, status, featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [tenant2Id, prop.title, prop.description, prop.type, prop.category, prop.price, prop.address, prop.city, prop.state, prop.zip_code, prop.bedrooms, prop.bathrooms, prop.area, prop.features, prop.images, prop.status, prop.featured]);
    }

    // Imóveis para Demo (tenant3)
    const properties3 = [
      {
        title: "Apartamento Centro 2 Quartos",
        description: "Apartamento bem localizado no centro da cidade, próximo a comércio, escolas e transporte público. Ideal para casais ou pequenas famílias.",
        type: "apartment",
        category: "sale",
        price: 450000,
        address: "Rua Central, 200",
        city: "São Paulo",
        state: "SP",
        zip_code: "01010-100",
        bedrooms: 2,
        bathrooms: 1,
        area: 65,
        features: ["Portaria 24h", "Próximo ao Metrô"],
        images: ["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"],
        status: "available",
        featured: true
      },
      {
        title: "Casa com Quintal Amplo",
        description: "Casa térrea com quintal grande, ideal para família com crianças ou pets. Bairro tranquilo e residencial.",
        type: "house",
        category: "sale",
        price: 680000,
        address: "Rua das Palmeiras, 45",
        city: "Guarulhos",
        state: "SP",
        zip_code: "07000-000",
        bedrooms: 3,
        bathrooms: 2,
        area: 180,
        features: ["Quintal", "Churrasqueira", "Garagem 2 vagas"],
        images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"],
        status: "available",
        featured: true
      },
      {
        title: "Kitnet Mobiliada para Aluguel",
        description: "Kitnet compacta e funcional, totalmente mobiliada, pronta para morar. Excelente para estudantes ou profissionais solteiros.",
        type: "apartment",
        category: "rent",
        price: 1800,
        address: "Av. Brasil, 1500",
        city: "São Paulo",
        state: "SP",
        zip_code: "01430-001",
        bedrooms: 1,
        bathrooms: 1,
        area: 30,
        features: ["Mobiliado", "Internet Inclusa"],
        images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
        status: "available",
        featured: false
      },
      {
        title: "Sala Comercial 50m²",
        description: "Sala comercial em prédio empresarial com recepção compartilhada, ar condicionado central e estacionamento rotativo.",
        type: "commercial",
        category: "rent",
        price: 2500,
        address: "Av. Paulista, 2000",
        city: "São Paulo",
        state: "SP",
        zip_code: "01310-200",
        bedrooms: 0,
        bathrooms: 1,
        area: 50,
        features: ["Ar Condicionado", "Recepção", "Estacionamento"],
        images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"],
        status: "available",
        featured: false
      },
      {
        title: "Cobertura Duplex Vista Mar",
        description: "Cobertura espetacular com vista para o mar, piscina privativa e área gourmet completa. Alto padrão de acabamento.",
        type: "apartment",
        category: "sale",
        price: 2800000,
        address: "Av. Atlântica, 500",
        city: "Santos",
        state: "SP",
        zip_code: "11000-000",
        bedrooms: 4,
        bathrooms: 4,
        area: 350,
        features: ["Piscina Privativa", "Vista Mar", "Área Gourmet", "4 vagas"],
        images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"],
        status: "reserved",
        featured: true
      },
      {
        title: "Terreno em Condomínio",
        description: "Terreno plano em condomínio fechado com infraestrutura completa. Pronto para construir.",
        type: "land",
        category: "sale",
        price: 350000,
        address: "Condomínio Verde Vale, Lote 15",
        city: "Cotia",
        state: "SP",
        zip_code: "06700-000",
        bedrooms: 0,
        bathrooms: 0,
        area: 500,
        features: ["Condomínio Fechado", "Área de Lazer", "Segurança 24h"],
        images: [],
        status: "available",
        featured: false
      }
    ];

    for (const prop of properties3) {
      await client.query(`
        INSERT INTO properties (tenant_id, title, description, type, category, price, address, city, state, zip_code, bedrooms, bathrooms, area, features, images, status, featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [tenant3Id, prop.title, prop.description, prop.type, prop.category, prop.price, prop.address, prop.city, prop.state, prop.zip_code, prop.bedrooms, prop.bathrooms, prop.area, prop.features, prop.images, prop.status, prop.featured]);
    }

    console.log("   12 imóveis criados!");

    // Criar Leads
    console.log("\n5. Criando leads...");

    const leads1 = [
      { name: "João Silva", email: "joao@email.com", phone: "(11) 99999-1111", source: "Site", status: "new", budget: 800000 },
      { name: "Maria Santos", email: "maria@email.com", phone: "(11) 99999-2222", source: "Instagram", status: "qualification", budget: 1500000 },
      { name: "Pedro Costa", email: "pedro@email.com", phone: "(11) 99999-3333", source: "Indicação", status: "visit", budget: 900000 },
      { name: "Ana Paula", email: "ana@email.com", phone: "(11) 99999-4444", source: "Facebook", status: "proposal", budget: 750000 },
      { name: "Carlos Mendes", email: "carlos@email.com", phone: "(11) 99999-5555", source: "Portais", status: "contract", budget: 850000 }
    ];

    for (const lead of leads1) {
      await client.query(`
        INSERT INTO leads (tenant_id, name, email, phone, source, status, budget)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [tenant1Id, lead.name, lead.email, lead.phone, lead.source, lead.status, lead.budget]);
    }

    const leads2 = [
      { name: "Fernanda Lima", email: "fernanda@email.com", phone: "(21) 98888-1111", source: "Site", status: "new", budget: 2000000 },
      { name: "Roberto Alves", email: "roberto@email.com", phone: "(21) 98888-2222", source: "Instagram", status: "visit", budget: 1800000 }
    ];

    for (const lead of leads2) {
      await client.query(`
        INSERT INTO leads (tenant_id, name, email, phone, source, status, budget)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [tenant2Id, lead.name, lead.email, lead.phone, lead.source, lead.status, lead.budget]);
    }

    // Leads para Demo (tenant3)
    const leads3 = [
      { name: "Lucas Ferreira", email: "lucas@teste.com", phone: "(11) 97777-1111", source: "Site", status: "new", budget: 500000 },
      { name: "Mariana Costa", email: "mariana@teste.com", phone: "(11) 97777-2222", source: "Instagram", status: "qualification", budget: 700000 },
      { name: "Ricardo Silva", email: "ricardo@teste.com", phone: "(11) 97777-3333", source: "Facebook", status: "visit", budget: 600000 },
      { name: "Juliana Santos", email: "juliana@teste.com", phone: "(11) 97777-4444", source: "Indicação", status: "proposal", budget: 800000 },
      { name: "Paulo Oliveira", email: "paulo@teste.com", phone: "(11) 97777-5555", source: "Portais", status: "new", budget: 450000 },
      { name: "Camila Rodrigues", email: "camila@teste.com", phone: "(11) 97777-6666", source: "Site", status: "contract", budget: 2500000 }
    ];

    for (const lead of leads3) {
      await client.query(`
        INSERT INTO leads (tenant_id, name, email, phone, source, status, budget)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [tenant3Id, lead.name, lead.email, lead.phone, lead.source, lead.status, lead.budget]);
    }

    console.log("   13 leads criados!");

    // Criar Tags
    console.log("\n6. Criando tags...");

    await client.query(`
      INSERT INTO lead_tags (tenant_id, name, color) VALUES
      ($1, 'VIP', '#f59e0b'),
      ($1, 'Urgente', '#ef4444'),
      ($1, 'Investidor', '#10b981'),
      ($1, 'Primeira Compra', '#8b5cf6')
    `, [tenant1Id]);

    await client.query(`
      INSERT INTO lead_tags (tenant_id, name, color) VALUES
      ($1, 'Premium', '#f59e0b'),
      ($1, 'Hot Lead', '#ef4444')
    `, [tenant2Id]);

    // Tags para Demo (tenant3)
    await client.query(`
      INSERT INTO lead_tags (tenant_id, name, color) VALUES
      ($1, 'Quente', '#ef4444'),
      ($1, 'Morno', '#f59e0b'),
      ($1, 'Frio', '#3b82f6'),
      ($1, 'Investidor', '#10b981'),
      ($1, 'Primeira Compra', '#8b5cf6')
    `, [tenant3Id]);

    console.log("   11 tags criadas!");

    // Criar Categorias Financeiras
    console.log("\n7. Criando categorias financeiras...");

    await client.query(`
      INSERT INTO finance_categories (tenant_id, name, type, color, is_system_generated) VALUES
      ($1, 'Comissão de Vendas', 'income', '#22c55e', true),
      ($1, 'Taxa de Administração', 'income', '#3b82f6', true),
      ($1, 'Aluguel Recebido', 'income', '#10b981', true),
      ($1, 'Despesas Operacionais', 'expense', '#ef4444', false),
      ($1, 'Marketing', 'expense', '#f97316', false),
      ($1, 'Salários', 'expense', '#8b5cf6', false)
    `, [tenant1Id]);

    await client.query(`
      INSERT INTO finance_categories (tenant_id, name, type, color, is_system_generated) VALUES
      ($1, 'Comissão de Vendas', 'income', '#22c55e', true),
      ($1, 'Taxa de Administração', 'income', '#3b82f6', true),
      ($1, 'Aluguel Recebido', 'income', '#10b981', true)
    `, [tenant2Id]);

    // Categorias financeiras para Demo (tenant3)
    await client.query(`
      INSERT INTO finance_categories (tenant_id, name, type, color, is_system_generated) VALUES
      ($1, 'Comissão de Vendas', 'income', '#22c55e', true),
      ($1, 'Taxa de Administração', 'income', '#3b82f6', true),
      ($1, 'Aluguel Recebido', 'income', '#10b981', true),
      ($1, 'Despesas Operacionais', 'expense', '#ef4444', false),
      ($1, 'Marketing Digital', 'expense', '#f97316', false)
    `, [tenant3Id]);

    console.log("   14 categorias financeiras criadas!");

    console.log("\n========================================");
    console.log("SEED CONCLUÍDO COM SUCESSO!");
    console.log("========================================");
    console.log("\nCredenciais de acesso:");
    console.log("----------------------------------------");
    console.log("Imobiliária Sol:    admin@sol.com / password");
    console.log("Nova Casa Imóveis:  admin@novacasa.com / password");
    console.log("Demo:               admin@demo.com / demo123");
    console.log("----------------------------------------");
    console.log("\nLanding pages públicas:");
    console.log("/e/sol");
    console.log("/e/nova-casa");
    console.log("/e/demo");
    console.log("========================================\n");

  } catch (error) {
    console.error("Erro:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  });

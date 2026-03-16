import { storage } from "./storage";
import bcrypt from "bcryptjs";

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create Tenants
    const tenant1 = await storage.createTenant({
      name: "Imobiliária Sol",
      slug: "sol",
      primaryColor: "#f97316",
      secondaryColor: "#ea580c",
      phone: "(11) 98765-4321",
      email: "contato@imobiliariasol.com",
      address: "Av. Paulista, 1000 - São Paulo, SP",
    });

    const tenant2 = await storage.createTenant({
      name: "Nova Casa Imóveis",
      slug: "nova-casa",
      primaryColor: "#3b82f6",
      secondaryColor: "#2563eb",
      phone: "(21) 97654-3210",
      email: "vendas@novacasa.com",
      address: "Rua das Flores, 500 - Rio de Janeiro, RJ",
    });

    console.log("✅ Tenants created");

    // Create Users
    const hashedPassword = await hashPassword("password");
    
    const user1 = await storage.createUser({
      tenantId: tenant1.id,
      name: "Admin Sol",
      email: "admin@sol.com",
      password: hashedPassword,
      role: "admin",
    });

    const user2 = await storage.createUser({
      tenantId: tenant2.id,
      name: "Admin Nova Casa",
      email: "admin@novacasa.com",
      password: hashedPassword,
      role: "admin",
    });

    console.log("✅ Users created");

    // Create Properties for Tenant 1
    const properties1 = [
      {
        tenantId: tenant1.id,
        title: "Apartamento Moderno 3 Quartos",
        description: "Lindo apartamento com acabamento premium, varanda gourmet e vista panorâmica. Condomínio completo com piscina, academia e salão de festas.",
        type: "apartment",
        category: "sale",
        price: "850000",
        address: "Rua Augusta, 1500",
        city: "São Paulo",
        state: "SP",
        zipCode: "01305-100",
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        features: ["Varanda", "Academia", "Piscina", "Salão de Festas"],
        images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
        status: "available",
        featured: true,
      },
      {
        tenantId: tenant1.id,
        title: "Casa Térrea com Piscina",
        description: "Casa espaçosa em condomínio fechado, com piscina aquecida, churrasqueira e amplo jardim.",
        type: "house",
        category: "sale",
        price: "1200000",
        address: "Alameda dos Anjos, 250",
        city: "São Paulo",
        state: "SP",
        bedrooms: 4,
        bathrooms: 3,
        area: 350,
        features: ["Piscina", "Churrasqueira", "Jardim", "Garagem 3 vagas"],
        images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"],
        status: "available",
        featured: false,
      },
      {
        tenantId: tenant1.id,
        title: "Cobertura Duplex Luxo",
        description: "Cobertura duplex com rooftop privativo, hidromassagem e vista para o mar.",
        type: "apartment",
        category: "sale",
        price: "2500000",
        address: "Av. Beira Mar, 3000",
        city: "São Paulo",
        state: "SP",
        bedrooms: 5,
        bathrooms: 4,
        area: 400,
        features: ["Rooftop", "Hidromassagem", "Vista Mar", "Garagem 4 vagas"],
        images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"],
        status: "available",
        featured: true,
      },
      {
        tenantId: tenant1.id,
        title: "Apartamento para Locação 2 Quartos",
        description: "Apartamento mobiliado em ótima localização, próximo ao metrô.",
        type: "apartment",
        category: "rent",
        price: "3500",
        address: "Rua dos Pinheiros, 800",
        city: "São Paulo",
        state: "SP",
        bedrooms: 2,
        bathrooms: 1,
        area: 75,
        features: ["Mobiliado", "Próximo ao Metrô"],
        images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
        status: "available",
        featured: false,
      },
    ];

    for (const prop of properties1) {
      await storage.createProperty(prop as any);
    }

    // Create Properties for Tenant 2
    const properties2 = [
      {
        tenantId: tenant2.id,
        title: "Apartamento Vista Mar Ipanema",
        description: "Apartamento de alto padrão com vista privilegiada para o mar de Ipanema.",
        type: "apartment",
        category: "sale",
        price: "3200000",
        address: "Av. Vieira Souto, 500",
        city: "Rio de Janeiro",
        state: "RJ",
        bedrooms: 3,
        bathrooms: 3,
        area: 180,
        features: ["Vista Mar", "Portaria 24h", "Lazer Completo"],
        images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"],
        status: "available",
        featured: true,
      },
      {
        tenantId: tenant2.id,
        title: "Casa Condomínio Barra",
        description: "Casa linda em condomínio de luxo na Barra da Tijuca.",
        type: "house",
        category: "sale",
        price: "1800000",
        address: "Estrada do Pontal, 1200",
        city: "Rio de Janeiro",
        state: "RJ",
        bedrooms: 4,
        bathrooms: 4,
        area: 300,
        features: ["Piscina", "Sauna", "Segurança 24h"],
        images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"],
        status: "available",
        featured: true,
      },
    ];

    for (const prop of properties2) {
      await storage.createProperty(prop as any);
    }

    console.log("✅ Properties created");

    // Create Leads for Tenant 1
    const leads1 = [
      {
        tenantId: tenant1.id,
        name: "João Silva",
        email: "joao@email.com",
        phone: "(11) 99999-1111",
        source: "Site",
        status: "new",
        budget: "800000",
        interests: ["apartment"],
      },
      {
        tenantId: tenant1.id,
        name: "Maria Santos",
        email: "maria@email.com",
        phone: "(11) 99999-2222",
        source: "Instagram",
        status: "qualification",
        budget: "1500000",
        interests: ["house"],
      },
      {
        tenantId: tenant1.id,
        name: "Pedro Costa",
        email: "pedro@email.com",
        phone: "(11) 99999-3333",
        source: "Indicação",
        status: "visit",
        budget: "900000",
        interests: ["apartment"],
      },
      {
        tenantId: tenant1.id,
        name: "Ana Paula",
        email: "ana@email.com",
        phone: "(11) 99999-4444",
        source: "Facebook",
        status: "proposal",
        budget: "750000",
        interests: ["apartment"],
      },
      {
        tenantId: tenant1.id,
        name: "Carlos Mendes",
        email: "carlos@email.com",
        phone: "(11) 99999-5555",
        source: "Portais",
        status: "contract",
        budget: "850000",
        interests: ["apartment"],
      },
    ];

    for (const lead of leads1) {
      await storage.createLead(lead as any);
    }

    // Create Leads for Tenant 2
    const leads2 = [
      {
        tenantId: tenant2.id,
        name: "Fernanda Lima",
        email: "fernanda@email.com",
        phone: "(21) 98888-1111",
        source: "Site",
        status: "new",
        budget: "2000000",
        interests: ["apartment"],
      },
      {
        tenantId: tenant2.id,
        name: "Roberto Alves",
        email: "roberto@email.com",
        phone: "(21) 98888-2222",
        source: "Instagram",
        status: "visit",
        budget: "1800000",
        interests: ["house"],
      },
    ];

    for (const lead of leads2) {
      await storage.createLead(lead as any);
    }

    console.log("✅ Leads created");

    console.log("\n🎉 Seeding completed successfully!");
    console.log("\nLogin credentials:");
    console.log("Tenant 1 (Sol): admin@sol.com / password");
    console.log("Tenant 2 (Nova Casa): admin@novacasa.com / password");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

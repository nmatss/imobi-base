/**
 * SCRIPT DE SEED - USUÁRIOS E DADOS DE TESTE
 *
 * Cria dados de teste completos para desenvolvimento e demonstração:
 * - Tenant de demonstração
 * - Usuários com diferentes roles
 * - Propriedades de exemplo
 * - Leads e interações
 * - Visitas agendadas
 * - Contratos
 */

import { db } from "../server/db";
import * as schema from "../shared/schema-sqlite";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

// Cores para logging
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const log = (message: string, color: string = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Função para hash de senha
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function seed() {
  log("\n🌱 Iniciando seed de dados de teste...\n", colors.bright);

  try {
    // 1. CRIAR TENANT DE DEMONSTRAÇÃO
    log("📊 Criando tenant de demonstração...", colors.cyan);

    const tenantId = nanoid();
    await db.insert(schema.tenants).values({
      id: tenantId,
      name: "ImobiBase Demo",
      slug: "imobibase-demo",
      logo: null,
      primaryColor: "#0066cc",
      secondaryColor: "#333333",
      phone: "(11) 98765-4321",
      email: "contato@imobibase-demo.com.br",
      address: "Av. Paulista, 1000 - São Paulo, SP",
    });

    log(`✅ Tenant criado: ImobiBase Demo (ID: ${tenantId})`, colors.green);

    // 2. CRIAR USUÁRIOS DE TESTE
    log("\n👥 Criando usuários de teste...", colors.cyan);

    const users = [
      {
        id: nanoid(),
        tenantId,
        name: "Admin Demo",
        email: "admin@demo.com",
        password: await hashPassword("admin123"),
        role: "admin",
        emailVerified: true,
        avatar: null,
      },
      {
        id: nanoid(),
        tenantId,
        name: "Carlos Silva",
        email: "carlos@demo.com",
        password: await hashPassword("carlos123"),
        role: "broker",
        emailVerified: true,
        avatar: null,
      },
      {
        id: nanoid(),
        tenantId,
        name: "Ana Santos",
        email: "ana@demo.com",
        password: await hashPassword("ana123"),
        role: "broker",
        emailVerified: true,
        avatar: null,
      },
      {
        id: nanoid(),
        tenantId,
        name: "João Oliveira",
        email: "joao@demo.com",
        password: await hashPassword("joao123"),
        role: "user",
        emailVerified: true,
        avatar: null,
      },
      {
        id: nanoid(),
        tenantId,
        name: "Maria Costa",
        email: "maria@demo.com",
        password: await hashPassword("maria123"),
        role: "user",
        emailVerified: true,
        avatar: null,
      },
    ];

    for (const user of users) {
      await db.insert(schema.users).values(user);
      log(`  ✓ ${user.name} (${user.email}) - Role: ${user.role}`, colors.green);
    }

    const [adminUser, carlosUser, anaUser, joaoUser, mariaUser] = users;

    // 3. CRIAR PROPRIETÁRIOS (OWNERS)
    log("\n🏠 Criando proprietários...", colors.cyan);

    const owners = [
      {
        id: nanoid(),
        tenantId,
        name: "Roberto Mendes",
        email: "roberto.mendes@email.com",
        phone: "(11) 91234-5678",
        cpfCnpj: "123.456.789-00",
        address: "Rua das Flores, 123 - São Paulo, SP",
        bankName: "Banco do Brasil",
        bankAgency: "1234-5",
        bankAccount: "12345-6",
        pixKey: "roberto.mendes@email.com",
        notes: "Proprietário de múltiplos imóveis",
      },
      {
        id: nanoid(),
        tenantId,
        name: "Imobiliária Prime Ltda",
        email: "contato@imobiliariaprime.com.br",
        phone: "(11) 3000-9999",
        cpfCnpj: "12.345.678/0001-90",
        address: "Av. Brigadeiro Faria Lima, 3000 - São Paulo, SP",
        bankName: "Itaú",
        bankAgency: "4567",
        bankAccount: "98765-4",
        pixKey: "12.345.678/0001-90",
        notes: "Grande investidor imobiliário",
      },
    ];

    for (const owner of owners) {
      await db.insert(schema.owners).values(owner);
      log(`  ✓ ${owner.name}`, colors.green);
    }

    // 4. CRIAR PROPRIEDADES
    log("\n🏢 Criando propriedades...", colors.cyan);

    const properties = [
      {
        id: nanoid(),
        tenantId,
        title: "Apartamento Moderno no Jardins",
        description: "Apartamento de alto padrão com 3 suítes, varanda gourmet, 2 vagas na garagem. Condomínio com piscina, academia e salão de festas.",
        type: "apartment",
        category: "sale",
        price: "850000",
        address: "Rua Haddock Lobo, 500",
        city: "São Paulo",
        state: "SP",
        zipCode: "01414-001",
        bedrooms: 3,
        bathrooms: 3,
        area: 120,
        features: JSON.stringify(["Varanda", "Piscina", "Academia", "Garagem"]),
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"
        ]),
        status: "available",
        featured: true,
      },
      {
        id: nanoid(),
        tenantId,
        title: "Casa Espaçosa em Condomínio Fechado",
        description: "Casa com 4 quartos, sendo 2 suítes, sala ampla, cozinha planejada, quintal e área gourmet. Condomínio com segurança 24h.",
        type: "house",
        category: "sale",
        price: "1200000",
        address: "Rua das Palmeiras, 789",
        city: "São Paulo",
        state: "SP",
        zipCode: "05418-001",
        bedrooms: 4,
        bathrooms: 3,
        area: 250,
        features: JSON.stringify(["Quintal", "Área Gourmet", "Segurança 24h", "Piscina"]),
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
        ]),
        status: "available",
        featured: true,
      },
      {
        id: nanoid(),
        tenantId,
        title: "Apartamento para Locação - Vila Mariana",
        description: "Apartamento de 2 quartos, sala, cozinha americana, 1 vaga. Prédio com elevador e portaria 24h.",
        type: "apartment",
        category: "rent",
        price: "3500",
        address: "Rua Domingos de Morais, 2000",
        city: "São Paulo",
        state: "SP",
        zipCode: "04035-000",
        bedrooms: 2,
        bathrooms: 1,
        area: 65,
        features: JSON.stringify(["Elevador", "Portaria 24h", "Garagem"]),
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"
        ]),
        status: "available",
        featured: false,
      },
      {
        id: nanoid(),
        tenantId,
        title: "Studio Compacto - Próximo ao Metrô",
        description: "Studio moderno, mobiliado, ideal para solteiros ou casal sem filhos. Localização privilegiada.",
        type: "apartment",
        category: "rent",
        price: "2200",
        address: "Av. Paulista, 1500",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-100",
        bedrooms: 1,
        bathrooms: 1,
        area: 35,
        features: JSON.stringify(["Mobiliado", "Próximo ao Metrô"]),
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800"
        ]),
        status: "available",
        featured: false,
      },
      {
        id: nanoid(),
        tenantId,
        title: "Cobertura Duplex com Vista Panorâmica",
        description: "Cobertura duplex de luxo com 4 suítes, terraço com piscina privativa, churrasqueira e vista para a cidade. 4 vagas.",
        type: "apartment",
        category: "sale",
        price: "2500000",
        address: "Rua Groenlândia, 100",
        city: "São Paulo",
        state: "SP",
        zipCode: "01434-000",
        bedrooms: 4,
        bathrooms: 5,
        area: 320,
        features: JSON.stringify(["Piscina Privativa", "Terraço", "Vista Panorâmica", "Churrasqueira", "4 Vagas"]),
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
          "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
        ]),
        status: "available",
        featured: true,
      },
      {
        id: nanoid(),
        tenantId,
        title: "Terreno Comercial - Zona Sul",
        description: "Terreno comercial de 500m² em área nobre, ideal para construção de edifício comercial ou residencial.",
        type: "land",
        category: "sale",
        price: "1500000",
        address: "Av. Santo Amaro, 5000",
        city: "São Paulo",
        state: "SP",
        zipCode: "04702-000",
        bedrooms: null,
        bathrooms: null,
        area: 500,
        features: JSON.stringify(["Localização Nobre", "Esquina"]),
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"
        ]),
        status: "available",
        featured: false,
      },
    ];

    for (const property of properties) {
      await db.insert(schema.properties).values(property);
      log(`  ✓ ${property.title} - ${property.category === 'sale' ? 'Venda' : 'Locação'}: R$ ${Number(property.price).toLocaleString('pt-BR')}`, colors.green);
    }

    // 5. CRIAR LEADS
    log("\n👤 Criando leads...", colors.cyan);

    const leads = [
      {
        id: nanoid(),
        tenantId,
        name: "Patricia Rodrigues",
        email: "patricia.rodrigues@email.com",
        phone: "(11) 99876-5432",
        source: "Site",
        status: "new",
        budget: "800000",
        notes: "Procura apartamento de 3 quartos no Jardins",
        assignedTo: carlosUser.id,
        preferredType: "apartment",
        preferredCategory: "sale",
        preferredCity: "São Paulo",
        preferredNeighborhood: "Jardins",
        minBedrooms: 3,
        maxBedrooms: 3,
      },
      {
        id: nanoid(),
        tenantId,
        name: "Fernando Alves",
        email: "fernando.alves@email.com",
        phone: "(11) 98765-4321",
        source: "Instagram",
        status: "contacted",
        budget: "3000",
        notes: "Quer alugar apartamento próximo ao metrô",
        assignedTo: anaUser.id,
        preferredType: "apartment",
        preferredCategory: "rent",
        preferredCity: "São Paulo",
        preferredNeighborhood: "Vila Mariana",
        minBedrooms: 2,
        maxBedrooms: 2,
      },
      {
        id: nanoid(),
        tenantId,
        name: "Luciana Martins",
        email: "luciana.martins@email.com",
        phone: "(11) 97654-3210",
        source: "WhatsApp",
        status: "qualified",
        budget: "1500000",
        notes: "Interessada em casa em condomínio fechado",
        assignedTo: carlosUser.id,
        preferredType: "house",
        preferredCategory: "sale",
        preferredCity: "São Paulo",
        preferredNeighborhood: "Morumbi",
        minBedrooms: 4,
        maxBedrooms: 5,
      },
      {
        id: nanoid(),
        tenantId,
        name: "Ricardo Souza",
        email: "ricardo.souza@email.com",
        phone: "(11) 96543-2109",
        source: "Portal",
        status: "proposal",
        budget: "2200",
        notes: "Proposta enviada para studio na Paulista",
        assignedTo: anaUser.id,
        preferredType: "apartment",
        preferredCategory: "rent",
        preferredCity: "São Paulo",
        preferredNeighborhood: "Bela Vista",
        minBedrooms: 1,
        maxBedrooms: 1,
      },
      {
        id: nanoid(),
        tenantId,
        name: "Camila Ferreira",
        email: "camila.ferreira@email.com",
        phone: "(11) 95432-1098",
        source: "Indicação",
        status: "new",
        budget: "2000000",
        notes: "Busca cobertura de alto padrão",
        assignedTo: carlosUser.id,
        preferredType: "apartment",
        preferredCategory: "sale",
        preferredCity: "São Paulo",
        preferredNeighborhood: "Jardins",
        minBedrooms: 4,
        maxBedrooms: 4,
      },
    ];

    for (const lead of leads) {
      await db.insert(schema.leads).values(lead);
      log(`  ✓ ${lead.name} - Status: ${lead.status} - Budget: R$ ${Number(lead.budget).toLocaleString('pt-BR')}`, colors.green);
    }

    // 6. CRIAR INTERAÇÕES
    log("\n💬 Criando interações...", colors.cyan);

    const interactions = [
      {
        id: nanoid(),
        leadId: leads[0].id,
        userId: carlosUser.id,
        type: "call",
        content: "Primeiro contato realizado. Cliente interessado em agendar visita.",
      },
      {
        id: nanoid(),
        leadId: leads[1].id,
        userId: anaUser.id,
        type: "whatsapp",
        content: "Enviado catálogo de apartamentos disponíveis para locação.",
      },
      {
        id: nanoid(),
        leadId: leads[2].id,
        userId: carlosUser.id,
        type: "email",
        content: "E-mail enviado com detalhes das casas em condomínio fechado.",
      },
      {
        id: nanoid(),
        leadId: leads[3].id,
        userId: anaUser.id,
        type: "visit",
        content: "Visita realizada ao studio na Paulista. Cliente gostou muito.",
      },
    ];

    for (const interaction of interactions) {
      await db.insert(schema.interactions).values(interaction);
    }
    log(`  ✓ ${interactions.length} interações criadas`, colors.green);

    // 7. CRIAR VISITAS AGENDADAS
    log("\n📅 Criando visitas agendadas...", colors.cyan);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(10, 0, 0, 0);

    const visits = [
      {
        id: nanoid(),
        tenantId,
        propertyId: properties[0].id,
        leadId: leads[0].id,
        scheduledFor: tomorrow.toISOString(),
        status: "scheduled",
        notes: "Cliente solicitou visita no período da tarde",
        assignedTo: carlosUser.id,
      },
      {
        id: nanoid(),
        tenantId,
        propertyId: properties[1].id,
        leadId: leads[2].id,
        scheduledFor: nextWeek.toISOString(),
        status: "scheduled",
        notes: "Visita agendada para conhecer a casa",
        assignedTo: carlosUser.id,
      },
      {
        id: nanoid(),
        tenantId,
        propertyId: properties[3].id,
        leadId: leads[3].id,
        scheduledFor: new Date().toISOString(),
        status: "completed",
        notes: "Visita realizada com sucesso. Cliente demonstrou interesse.",
        assignedTo: anaUser.id,
      },
    ];

    for (const visit of visits) {
      await db.insert(schema.visits).values(visit);
      log(`  ✓ Visita agendada para ${new Date(visit.scheduledFor).toLocaleDateString('pt-BR')} - Status: ${visit.status}`, colors.green);
    }

    // 8. CRIAR CONTRATOS
    log("\n📄 Criando contratos...", colors.cyan);

    const contracts = [
      {
        id: nanoid(),
        tenantId,
        propertyId: properties[2].id,
        leadId: leads[1].id,
        type: "rent",
        status: "active",
        value: "3500",
        terms: "Contrato de locação de 12 meses, renovável. Reajuste anual pelo IGP-M.",
        signedAt: new Date().toISOString(),
      },
      {
        id: nanoid(),
        tenantId,
        propertyId: properties[3].id,
        leadId: leads[3].id,
        type: "rent",
        status: "draft",
        value: "2200",
        terms: "Contrato de locação de 12 meses. Aguardando análise de documentação.",
        signedAt: null,
      },
    ];

    for (const contract of contracts) {
      await db.insert(schema.contracts).values(contract);
      log(`  ✓ Contrato ${contract.type === 'rent' ? 'Locação' : 'Venda'} - Status: ${contract.status} - Valor: R$ ${Number(contract.value).toLocaleString('pt-BR')}`, colors.green);
    }

    // 9. CRIAR INQUILINOS
    log("\n🏘️ Criando inquilinos...", colors.cyan);

    const renters = [
      {
        id: nanoid(),
        tenantId,
        name: "Fernando Alves",
        email: "fernando.alves@email.com",
        phone: "(11) 98765-4321",
        cpfCnpj: "987.654.321-00",
        rg: "12.345.678-9",
        profession: "Engenheiro",
        income: "12000",
        address: "Rua Domingos de Morais, 2000 - São Paulo, SP",
        emergencyContact: "Mariana Alves",
        emergencyPhone: "(11) 99999-8888",
        notes: "Inquilino pontual, sem histórico de inadimplência",
      },
    ];

    for (const renter of renters) {
      await db.insert(schema.renters).values(renter);
      log(`  ✓ ${renter.name}`, colors.green);
    }

    // RESUMO FINAL
    log("\n" + "=".repeat(60), colors.bright);
    log("✅ SEED CONCLUÍDO COM SUCESSO!", colors.green + colors.bright);
    log("=".repeat(60), colors.bright);

    log("\n📊 RESUMO DOS DADOS CRIADOS:", colors.cyan + colors.bright);
    log(`  • 1 Tenant: ImobiBase Demo`, colors.yellow);
    log(`  • ${users.length} Usuários (1 admin, 2 brokers, 2 users)`, colors.yellow);
    log(`  • ${owners.length} Proprietários`, colors.yellow);
    log(`  • ${properties.length} Propriedades`, colors.yellow);
    log(`  • ${leads.length} Leads`, colors.yellow);
    log(`  • ${interactions.length} Interações`, colors.yellow);
    log(`  • ${visits.length} Visitas`, colors.yellow);
    log(`  • ${contracts.length} Contratos`, colors.yellow);
    log(`  • ${renters.length} Inquilinos`, colors.yellow);

    log("\n🔑 CREDENCIAIS DE ACESSO:", colors.cyan + colors.bright);
    log("─".repeat(60), colors.cyan);

    users.forEach((user) => {
      const password = user.email.split('@')[0] + '123';
      log(`  📧 ${user.email}`, colors.blue);
      log(`  🔒 ${password}`, colors.green);
      log(`  👤 Role: ${user.role}`, colors.yellow);
      log(`  ──────────────────────────────────────`, colors.cyan);
    });

    log("\n🌐 ACESSE O SISTEMA:", colors.cyan + colors.bright);
    log(`  http://localhost:5000`, colors.blue + colors.bright);

    log("\n💡 DICA:", colors.yellow + colors.bright);
    log(`  Use o usuário admin@demo.com (senha: admin123) para acesso completo ao sistema.\n`, colors.yellow);

  } catch (error) {
    log("\n❌ ERRO AO EXECUTAR SEED:", colors.bright);
    console.error(error);
    process.exit(1);
  }
}

// Executar seed
seed()
  .then(() => {
    log("\n🎉 Script finalizado com sucesso!\n", colors.green + colors.bright);
    process.exit(0);
  })
  .catch((error) => {
    log("\n💥 Erro fatal:", colors.bright);
    console.error(error);
    process.exit(1);
  });

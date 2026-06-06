/**
 * PRODUCTION DATABASE INITIALIZATION
 * This script initializes the database with ONLY essential data, NO demo/mock data
 * Run with: tsx server/init-production-db.ts
 */

import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { setupNewTenant } from "./seed-defaults";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function initProductionDatabase() {
  console.log("🚀 Initializing PRODUCTION database...");
  console.log("⚠️  This will create ONLY essential data, NO demo/mock data\n");

  try {
    // Check if any tenants exist
    const existingTenants = await storage.getAllTenants();

    if (existingTenants.length > 0) {
      console.log("⚠️  Database already contains tenants:");
      existingTenants.forEach((tenant: any) => {
        console.log(`   - ${tenant.name} (${tenant.slug})`);
      });

      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question("\nDo you want to continue? This will NOT delete existing data (y/N): ", resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== "y") {
        console.log("❌ Initialization cancelled");
        process.exit(0);
      }
    }

    // Create your first real tenant (customize this with your own data)
    console.log("\n📝 Creating first tenant...");
    console.log("Please enter your company information:\n");

    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };

    const companyName = await askQuestion("Company Name: ");
    const companySlug = await askQuestion("Company Slug (URL-friendly): ");
    const companyEmail = await askQuestion("Company Email: ");
    const companyPhone = await askQuestion("Company Phone: ");
    const companyAddress = await askQuestion("Company Address: ");

    const adminName = await askQuestion("\nAdmin Name: ");
    const adminEmail = await askQuestion("Admin Email: ");
    const adminPassword = await askQuestion("Admin Password: ");

    rl.close();

    if (!companyName || !companySlug || !adminEmail || !adminPassword) {
      console.log("❌ Required fields missing");
      process.exit(1);
    }

    // Create tenant
    const tenant = await storage.createTenant({
      name: companyName,
      slug: companySlug,
      primaryColor: "#0066cc",
      secondaryColor: "#333333",
      phone: companyPhone || null,
      email: companyEmail || null,
      address: companyAddress || null,
    });

    console.log(`✅ Tenant "${tenant.name}" created`);

    // Setup default configurations for the tenant
    await setupNewTenant(storage, tenant);

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);
    const adminUser = await storage.createUser({
      tenantId: tenant.id,
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });

    console.log(`✅ Admin user "${adminUser.name}" created`);

    console.log("\n🎉 Production database initialized successfully!");
    console.log("\n📋 Login credentials:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`\n🌐 Access your system at: /login`);
    console.log(`\nNote: This password is shown only once. Please change it after first login.`);

  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initProductionDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { initProductionDatabase };

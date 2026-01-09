/**
 * CLEAN DEMO DATA
 * This script removes all demo/seed data from the database
 * Use with caution - this will delete data!
 */

import { db, schema } from "./db";
import { sql } from "drizzle-orm";

async function cleanDemoData() {
  console.log("🧹 Cleaning demo data from database...");
  console.log("⚠️  WARNING: This will DELETE all current data!\n");

  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question("Are you SURE you want to continue? Type 'DELETE ALL' to confirm: ", resolve);
  });
  rl.close();

  if (answer !== "DELETE ALL") {
    console.log("❌ Cancelled - no data was deleted");
    process.exit(0);
  }

  try {
    console.log("\n🗑️  Deleting data in order (respecting foreign keys)...\n");

    // Delete in reverse order of dependencies
    const tables = [
      "savedReports",
      "notificationPreferences",
      "integrationConfigs",
      "userRoles",
      "aiSettings",
      "tenantSettings",
      "followUps",
      "leadTagLinks",
      "leadTags",
      "financeEntries",
      "financeCategories",
      "propertySales",
      "saleProposals",
      "rentalTransfers",
      "rentalPayments",
      "rentalContracts",
      "renters",
      "owners",
      "newsletters",
      "contracts",
      "visits",
      "interactions",
      "leads",
      "properties",
      "users",
      "tenants",
    ];

    for (const tableName of tables) {
      const table = (schema as any)[tableName];
      if (table) {
        const result = await db.delete(table);
        console.log(`   ✓ Cleaned: ${tableName}`);
      }
    }

    console.log("\n✅ All demo data removed successfully!");
    console.log("\n📋 Next steps:");
    console.log("   1. Run: tsx server/init-production-db.ts");
    console.log("   2. Enter your real company information");
    console.log("   3. Start using the system with real data\n");

  } catch (error) {
    console.error("❌ Error cleaning data:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { cleanDemoData };

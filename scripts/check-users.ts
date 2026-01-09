import { db } from "../server/db";
import * as schema from "../shared/schema-sqlite";

async function checkUsers() {
  console.log("🔍 Verificando usuários no banco de dados...\n");

  try {
    const users = await db.select().from(schema.users);

    console.log(`Total de usuários: ${users.length}\n`);

    users.forEach((user) => {
      console.log("─".repeat(60));
      console.log(`ID: ${user.id}`);
      console.log(`Nome: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Email Verified: ${user.emailVerified}`);
      console.log(`Password Hash (first 50 chars): ${user.password.substring(0, 50)}...`);
      console.log("");
    });

    process.exit(0);
  } catch (error) {
    console.error("Erro ao verificar usuários:", error);
    process.exit(1);
  }
}

checkUsers();

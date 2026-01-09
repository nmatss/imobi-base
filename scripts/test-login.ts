import { db } from "../server/db";
import * as schema from "../shared/schema-sqlite";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function testLogin() {
  console.log("🔐 Testando autenticação com bcryptjs...\n");

  const testCredentials = [
    { email: "admin@demo.com", password: "admin123" },
    { email: "carlos@demo.com", password: "carlos123" },
    { email: "ana@demo.com", password: "ana123" },
    { email: "joao@demo.com", password: "joao123" },
    { email: "maria@demo.com", password: "maria123" },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const cred of testCredentials) {
    try {
      // Buscar usuário no banco
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, cred.email))
        .get();

      if (!user) {
        console.log(`❌ Usuário não encontrado: ${cred.email}`);
        failCount++;
        continue;
      }

      // Testar comparação de senha
      const isValid = await bcrypt.compare(cred.password, user.password);

      if (isValid) {
        console.log(`✅ Login bem-sucedido: ${cred.email}`);
        successCount++;
      } else {
        console.log(`❌ Senha inválida para: ${cred.email}`);
        console.log(`   Hash armazenado: ${user.password.substring(0, 20)}...`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ Erro ao testar ${cred.email}:`, error);
      failCount++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 Resultado do teste:`);
  console.log(`   ✅ Sucessos: ${successCount}`);
  console.log(`   ❌ Falhas: ${failCount}`);
  console.log(`${"=".repeat(60)}\n`);

  if (successCount === testCredentials.length) {
    console.log("🎉 Todos os testes passaram! Sistema de autenticação está funcionando corretamente.");
    process.exit(0);
  } else {
    console.log("⚠️  Alguns testes falharam. Verifique os logs acima.");
    process.exit(1);
  }
}

testLogin();

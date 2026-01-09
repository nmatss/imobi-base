import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Script para rotação de secrets
 *
 * Uso: npm run rotate:secrets
 */

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('base64');
}

function rotateSecrets(): void {
  console.log('🔄 Starting secret rotation...\n');

  const newSecrets = {
    SESSION_SECRET: generateSecret(64),
    CSRF_SECRET: generateSecret(32),
    ENCRYPTION_KEY: generateSecret(32),
  };

  console.log('Generated new secrets:');
  console.log('');
  console.log('# Add these to your .env file:');
  console.log('');

  for (const [key, value] of Object.entries(newSecrets)) {
    console.log(`${key}=${value}`);
  }

  console.log('');
  console.log('⚠️  IMPORTANT:');
  console.log('1. Update .env file with new secrets');
  console.log('2. Update secrets in production environment (Vercel, AWS, etc)');
  console.log('3. Restart all application instances');
  console.log('4. Test that application works with new secrets');
  console.log('5. Store old secrets securely for rollback if needed');
  console.log('');

  // Opcional: salvar em arquivo temporário
  const backupPath = path.join(__dirname, '../.secrets-backup.txt');
  const content = Object.entries(newSecrets)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  fs.writeFileSync(backupPath, content, { mode: 0o600 });
  console.log(`Secrets saved to: ${backupPath}`);
  console.log('⚠️  Delete this file after updating production!');
}

rotateSecrets();

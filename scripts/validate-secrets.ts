import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Script para validar secrets sem iniciar aplicação
 *
 * Uso: npm run validate:secrets
 */

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env') });

interface SecretConfig {
  required: boolean;
  minLength?: number;
  pattern?: RegExp;
  description: string;
}

const SECRET_CONFIGS: Record<string, SecretConfig> = {
  SESSION_SECRET: {
    required: true,
    minLength: 32,
    description: 'Express session secret for signing cookies',
  },
  DATABASE_URL: {
    required: true,
    pattern: /^postgresql:\/\//,
    description: 'PostgreSQL connection string',
  },
  STRIPE_SECRET_KEY: {
    required: false,
    pattern: /^sk_(test|live)_/,
    description: 'Stripe API secret key',
  },
  WHATSAPP_API_TOKEN: {
    required: false,
    minLength: 20,
    description: 'WhatsApp Business API token',
  },
  GOOGLE_MAPS_API_KEY: {
    required: false,
    pattern: /^AIza/,
    description: 'Google Maps API key',
  },
  SENDGRID_API_KEY: {
    required: false,
    pattern: /^SG\./,
    description: 'SendGrid API key for emails',
  },
};

function validateSecrets(): void {
  console.log('🔍 Validating secrets...\n');

  const errors: string[] = [];
  const warnings: string[] = [];
  const success: string[] = [];

  for (const [key, config] of Object.entries(SECRET_CONFIGS)) {
    const value = process.env[key];

    // Verificar se secret obrigatório está presente
    if (config.required && !value) {
      errors.push(`❌ ${key}: Missing required secret - ${config.description}`);
      continue;
    }

    if (!value) {
      warnings.push(`⚠️  ${key}: Optional secret not configured`);
      continue;
    }

    // Validar comprimento mínimo
    if (config.minLength && value.length < config.minLength) {
      errors.push(
        `❌ ${key}: Too short (minimum ${config.minLength} characters, got ${value.length})`
      );
      continue;
    }

    // Validar padrão
    if (config.pattern && !config.pattern.test(value)) {
      errors.push(
        `❌ ${key}: Invalid format (expected pattern: ${config.pattern})`
      );
      continue;
    }

    success.push(`✅ ${key}: Valid`);
  }

  // Exibir resultados
  if (success.length > 0) {
    console.log('Valid secrets:');
    success.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(msg => console.log(`   ${msg}`));
    console.log('');

    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Cannot run in production with invalid secrets');
      process.exit(1);
    } else {
      console.error('🚨 Fix these errors before deploying to production');
      process.exit(1);
    }
  }

  console.log('✅ All secrets validated successfully!');
}

validateSecrets();

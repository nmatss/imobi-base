/**
 * Secret Manager - Gerenciamento centralizado de secrets
 *
 * Em produção, deveria usar:
 * - AWS Secrets Manager
 * - GCP Secret Manager
 * - HashiCorp Vault
 * - Azure Key Vault
 *
 * Esta implementação é um wrapper que facilita migração futura
 */

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

class SecretManager {
  private secrets: Map<string, string> = new Map();

  /**
   * Inicializa e valida todos os secrets
   */
  initialize(env: NodeJS.ProcessEnv): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [key, config] of Object.entries(SECRET_CONFIGS)) {
      const value = env[key];

      // Verificar se secret obrigatório está presente
      if (config.required && !value) {
        errors.push(`Missing required secret: ${key} - ${config.description}`);
        continue;
      }

      if (!value) {
        if (process.env.NODE_ENV === 'production') {
          warnings.push(`Optional secret not configured: ${key}`);
        }
        continue;
      }

      // Validar comprimento mínimo
      if (config.minLength && value.length < config.minLength) {
        errors.push(
          `Secret ${key} too short. ` +
          `Minimum ${config.minLength} characters, got ${value.length}`
        );
      }

      // Validar padrão
      if (config.pattern && !config.pattern.test(value)) {
        errors.push(
          `Secret ${key} has invalid format. ` +
          `Expected pattern: ${config.pattern}`
        );
      }

      // Armazenar secret
      this.secrets.set(key, value);
    }

    // Reportar erros
    if (errors.length > 0) {
      console.error('🚨 SECRET VALIDATION ERRORS:');
      errors.forEach(err => console.error(`   - ${err}`));

      if (process.env.NODE_ENV === 'production') {
        console.error('');
        console.error('Application cannot start in production with invalid secrets');
        process.exit(1);
      }
    }

    // Reportar warnings
    if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
      console.warn('⚠️  SECRET WARNINGS:');
      warnings.forEach(warn => console.warn(`   - ${warn}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All secrets validated successfully');
    }
  }

  /**
   * Obtém um secret (com fallback para process.env)
   */
  get(key: string): string | undefined {
    return this.secrets.get(key) || process.env[key];
  }

  /**
   * Verifica se secret está configurado
   */
  has(key: string): boolean {
    return this.secrets.has(key) || !!process.env[key];
  }

  /**
   * Lista todos os secrets configurados (sem valores)
   */
  list(): string[] {
    return Array.from(this.secrets.keys());
  }
}

export const secretManager = new SecretManager();

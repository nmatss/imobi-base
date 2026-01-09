#!/usr/bin/env tsx
/**
 * Generate a cryptographically secure SESSION_SECRET
 *
 * This script generates a random 64-byte secret encoded as base64,
 * suitable for use as a SESSION_SECRET in production.
 *
 * Usage:
 *   npm run generate:secret
 *   tsx scripts/generate-session-secret.ts
 */

import { randomBytes } from 'crypto';

function generateSessionSecret(): void {
  // Generate 64 bytes (512 bits) of random data
  const secret = randomBytes(64).toString('base64');

  console.log('');
  console.log('========================================');
  console.log('  SESSION_SECRET Generator');
  console.log('========================================');
  console.log('');
  console.log('Generated SESSION_SECRET:');
  console.log('');
  console.log(secret);
  console.log('');
  console.log('========================================');
  console.log('  Configuration Instructions');
  console.log('========================================');
  console.log('');
  console.log('Add this to your .env file:');
  console.log('');
  console.log(`SESSION_SECRET=${secret}`);
  console.log('');
  console.log('========================================');
  console.log('  Security Information');
  console.log('========================================');
  console.log('');
  console.log('Length:', secret.length, 'characters');
  console.log('Entropy:', 64 * 8, 'bits (512 bits)');
  console.log('Format: base64');
  console.log('');
  console.log('⚠️  IMPORTANT SECURITY NOTES:');
  console.log('   1. Never commit this secret to version control');
  console.log('   2. Use different secrets for each environment');
  console.log('   3. Store securely in environment variables');
  console.log('   4. Rotate secrets periodically (e.g., every 90 days)');
  console.log('   5. Keep a backup of your secret in a secure vault');
  console.log('');
  console.log('========================================');
  console.log('');
}

// Run the generator
generateSessionSecret();

#!/usr/bin/env tsx
/**
 * Database Migration Runner
 * Runs all SQL migrations in the migrations/ folder
 * Used by CI/CD pipeline for automated deployments
 */

import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for better logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface MigrationRecord {
  filename: string;
  executed_at: Date;
}

// DB-2: o RLS e aplicado explicitamente (db:rls:apply), apos os pre-requisitos do
// runbook (role nao-owner). Tanto o parent quanto as child tables ficam gated; antes
// o child_tables vazava para o fluxo normal de db:migrate, podendo aplicar RLS nas
// tabelas-filho antes do parent/policies. A ordem alfabetica garante parent primeiro
// ("RLS_enable.sql" < "RLS_enable_child_tables.sql").
const RLS_MIGRATION_FILENAMES = ['RLS_enable.sql', 'RLS_enable_child_tables.sql'];
function isRlsMigration(filename: string): boolean {
  return RLS_MIGRATION_FILENAMES.includes(filename);
}

async function runMigrations(options: { includeRls?: boolean; onlyRls?: boolean } = {}) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log('❌ ERROR: DATABASE_URL environment variable is not set', 'red');
    process.exit(1);
  }

  log('🔄 Starting database migrations...', 'cyan');
  log(`📊 Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`, 'blue');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    log('✅ Database connection successful', 'green');

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    log('✅ Migrations tracking table ready', 'green');

    // Get list of already executed migrations
    const { rows: executedMigrations } = await pool.query<MigrationRecord>(
      'SELECT filename, executed_at FROM _migrations ORDER BY executed_at'
    );

    const executedFiles = new Set(executedMigrations.map(m => m.filename));
    log(`📋 Already executed: ${executedFiles.size} migrations`, 'blue');

    // Get all migration files
    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .filter(f => !f.includes('README'))
      .filter(f => options.includeRls || !isRlsMigration(f))
      .filter(f => !options.onlyRls || isRlsMigration(f))
      .sort(); // Alphabetical order ensures chronological execution

    log(`📁 Found ${sqlFiles.length} migration files`, 'blue');
    if (!options.includeRls) {
      const skipped = RLS_MIGRATION_FILENAMES.filter(f => files.includes(f));
      if (skipped.length > 0) {
        log(`🛡️  Skipping ${skipped.join(', ')}; apply explicitly with "npm run db:rls:apply" after the RLS runbook prerequisites`, 'yellow');
      }
    }

    // Filter out already executed migrations
    const pendingMigrations = sqlFiles.filter(f => !executedFiles.has(f));

    if (pendingMigrations.length === 0) {
      log('✨ No new migrations to run. Database is up to date!', 'green');
      await pool.end();
      return;
    }

    log(`\n🚀 Running ${pendingMigrations.length} pending migrations:\n`, 'yellow');

    // Execute each pending migration
    for (const filename of pendingMigrations) {
      const filePath = join(migrationsDir, filename);
      log(`⏳ Executing: ${filename}`, 'cyan');

      try {
        const sql = await readFile(filePath, 'utf-8');

        // Start transaction
        await pool.query('BEGIN');

        try {
          // Execute migration
          await pool.query(sql);

          // Record successful execution
          await pool.query(
            'INSERT INTO _migrations (filename) VALUES ($1)',
            [filename]
          );

          // Commit transaction
          await pool.query('COMMIT');

          log(`   ✅ ${filename} - SUCCESS`, 'green');
        } catch (error) {
          // Rollback on error
          await pool.query('ROLLBACK');
          throw error;
        }
      } catch (error) {
        log(`   ❌ ${filename} - FAILED`, 'red');
        if (error instanceof Error) {
          log(`   Error: ${error.message}`, 'red');
        }
        throw new Error(`Migration failed: ${filename}`);
      }
    }

    log('\n✅ All migrations completed successfully!', 'green');

    // Show summary
    const { rows: allMigrations } = await pool.query<MigrationRecord>(
      'SELECT filename, executed_at FROM _migrations ORDER BY executed_at DESC LIMIT 5'
    );

    log('\n📊 Last 5 migrations:', 'cyan');
    allMigrations.forEach(m => {
      const date = new Date(m.executed_at).toISOString().split('T')[0];
      log(`   • ${m.filename} (${date})`, 'blue');
    });

  } catch (error) {
    log('\n❌ Migration failed!', 'red');
    if (error instanceof Error) {
      log(`Error: ${error.message}`, 'red');
      if (error.stack) {
        log(`\nStack trace:\n${error.stack}`, 'red');
      }
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Rollback functionality
async function rollbackMigration(filename?: string) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log('❌ ERROR: DATABASE_URL environment variable is not set', 'red');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    log('⚠️  ROLLBACK MODE', 'yellow');

    if (filename) {
      // Rollback specific migration
      log(`🔄 Rolling back migration: ${filename}`, 'yellow');
      await pool.query('DELETE FROM _migrations WHERE filename = $1', [filename]);
      log(`✅ Removed ${filename} from migration history`, 'green');
      log('⚠️  Note: SQL changes are NOT automatically reversed. Manual intervention may be required.', 'yellow');
    } else {
      // Rollback last migration
      const { rows } = await pool.query<MigrationRecord>(
        'SELECT filename FROM _migrations ORDER BY executed_at DESC LIMIT 1'
      );

      if (rows.length === 0) {
        log('No migrations to rollback', 'yellow');
        return;
      }

      const lastMigration = rows[0].filename;
      log(`🔄 Rolling back last migration: ${lastMigration}`, 'yellow');
      await pool.query('DELETE FROM _migrations WHERE filename = $1', [lastMigration]);
      log(`✅ Removed ${lastMigration} from migration history`, 'green');
      log('⚠️  Note: SQL changes are NOT automatically reversed. Manual intervention may be required.', 'yellow');
    }
  } catch (error) {
    log('❌ Rollback failed!', 'red');
    if (error instanceof Error) {
      log(`Error: ${error.message}`, 'red');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI handling
const args = process.argv.slice(2);
const command = args[0];

if (command === 'rollback') {
  const filename = args[1];
  rollbackMigration(filename);
} else if (command === 'rls') {
  runMigrations({ includeRls: true, onlyRls: true });
} else if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`
Database Migration Tool

Usage:
  npm run db:migrate              - Run all pending migrations
  npm run db:rls:apply            - Apply RLS (parent + child tables) explicitly
  npm run db:migrate rollback     - Rollback last migration
  npm run db:migrate rollback FILENAME.sql - Rollback specific migration
  npm run db:migrate help         - Show this help

Environment Variables:
  DATABASE_URL - PostgreSQL connection string (required)

Examples:
  DATABASE_URL=postgres://... npm run db:migrate
  npm run db:migrate rollback add-performance-indexes.sql
  `);
} else {
  runMigrations();
}

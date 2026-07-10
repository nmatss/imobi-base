import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('go-live readiness gate', () => {
  it('exposes deploy/static/strict npm scripts', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['ops:go-live:verify']).toBe(
      'tsx script/verify-go-live-readiness.ts'
    );
    expect(packageJson.scripts['check:scripts']).toBe('tsc -p tsconfig.scripts.json');
    expect(packageJson.scripts['ops:go-live:verify:static']).toBe(
      'GO_LIVE_VERIFY_MODE=static tsx script/verify-go-live-readiness.ts'
    );
    expect(packageJson.scripts['ops:go-live:verify:strict']).toBe(
      'GO_LIVE_VERIFY_MODE=strict tsx script/verify-go-live-readiness.ts'
    );
  });

  it('runs the go-live deploy gate before production deploy', () => {
    const workflow = read('.github/workflows/deploy-production.yml');
    const cronIndex = workflow.indexOf('npm run ops:cron:verify');
    const goLiveIndex = workflow.indexOf('npm run ops:go-live:verify:strict');
    const deployIndex = workflow.indexOf('vercel deploy --prebuilt --prod');

    expect(cronIndex).toBeGreaterThan(-1);
    expect(goLiveIndex).toBeGreaterThan(cronIndex);
    expect(deployIndex).toBeGreaterThan(goLiveIndex);
  });

  it('binds Vercel project metadata and typechecks operational scripts in CI', () => {
    const workflow = read('.github/workflows/deploy-production.yml');

    expect(workflow).toContain('VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}');
    expect(workflow).toContain('VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}');
    expect(workflow).toContain('npm run check:scripts');
  });

  it('strict mode requires real operational proof before enterprise go-live', () => {
    const source = read('script/verify-go-live-readiness.ts');

    expect(source).toContain('GO_LIVE_RESTORE_DRILL_VERIFIED');
    expect(source).toContain('GO_LIVE_RUN_RESTORE_DRILL');
    expect(source).toContain('GO_LIVE_PENTEST_VERIFIED');
    expect(source).toContain('GO_LIVE_RUN_PENTEST');
    expect(source).toContain('await checkRedisConnectivity();');
    expect(source).toContain('isPublicServiceUrl(value, ["rediss:"])');
    expect(source).toContain('await checkDatabaseReadiness();');
    expect(source).toContain('RLS runtime verification');
    expect(source).toContain('webhook_events RLS');
    expect(source).toContain('newsletter opt-out columns');
    expect(source).toContain('newsletter active email index');
    expect(source).toContain('newsletter opt-out migration record');
    expect(source).toContain('WhatsApp phoneNumberId uniqueness migration');
    expect(source).toContain('WhatsApp phoneNumberId unique index');
    expect(source).toContain('WhatsApp phoneNumberId migration record');
    expect(source).toContain('migrations audit table');
    expect(source).toContain('_migrations must exist');
    expect(source).toContain('critical migration missing from _migrations audit table');
    expect(source).toContain('summarizeCommandOutput(output)');
  });

  it('static mode verifies repo wiring without requiring production secrets', () => {
    const source = read('script/verify-go-live-readiness.ts');

    expect(source).toContain('const mode = getMode();');
    expect(source).toContain('if (mode !== "static")');
    expect(source).toContain('20260617_002_newsletter_opt_out.sql');
    expect(source).toContain('20260618_001_whatsapp_phone_number_unique.sql');
    expect(source).toContain('npm run ops:go-live:verify:strict');
    expect(source).toContain('await runCommand("Cron manifest"');
  });

  it('requires a partial unique index for WhatsApp phoneNumberId routing', () => {
    const migration = read('migrations/20260618_001_whatsapp_phone_number_unique.sql');

    expect(migration).toContain('uq_integration_configs_whatsapp_phone_number_id');
    expect(migration).toContain("integration_name = 'whatsapp'");
    expect(migration).toContain("config->>'phoneNumberId'");
    expect(migration).toContain('IS NOT NULL');
  });

  it('executes the static gate without production secrets', () => {
    const result = spawnSync('npm', ['run', 'ops:go-live:verify:static'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, CI: 'true' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('Go Live readiness (static)');
  }, 30000);

  it('rejects local services and fake live keys in deploy mode', () => {
    const result = spawnSync('npx', ['tsx', 'script/verify-go-live-readiness.ts'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        GO_LIVE_VERIFY_MODE: 'deploy',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/imobibase',
        REDIS_URL: 'redis://127.0.0.1:6379',
        SESSION_SECRET: '0123456789abcdef0123456789abcdef',
        CRON_SECRET: 'abcdef0123456789abcdef0123456789',
        APP_URL: 'https://imobibase.com.br',
        STRIPE_SECRET_KEY: 'sk_live_fake_key_that_should_not_pass_123456',
        STRIPE_WEBHOOK_SECRET: 'whsec_fake_key_that_should_not_pass',
        WHATSAPP_APP_SECRET: 'meta-app-secret-for-test',
        WHATSAPP_VERIFY_TOKEN: 'meta-verify-token-for-test',
        BACKUP_OPTIONAL: 'true',
        SUPABASE_PITR_ENABLED: 'true',
      },
    });

    const output = result.stdout + result.stderr;
    expect(result.status).not.toBe(0);
    expect(output).toContain('[FAIL] env:DATABASE_URL');
    expect(output).toContain('[FAIL] env:REDIS_URL');
    expect(output).toContain('[FAIL] env:STRIPE_SECRET_KEY');
    expect(output).toContain('[FAIL] env:STRIPE_WEBHOOK_SECRET');
  }, 30000);
});

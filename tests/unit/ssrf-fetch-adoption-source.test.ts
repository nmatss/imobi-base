import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('external fetch SSRF guard adoption', () => {
  it('uses the safe external fetch wrapper for security webhooks', () => {
    const source = readSource('server/security/webhooks.ts');

    expect(source).toContain("import { fetchExternalUrl } from './url-validator';");
    expect(source).toContain('await fetchExternalUrl(config.url');
    expect(source).toContain('maxRedirects: 0');
    expect(source).not.toContain('await fetch(config.url');
  });

  it('uses the safe external fetch wrapper for WhatsApp media downloads', () => {
    const source = readSource('server/integrations/whatsapp/business-api.ts');

    expect(source).toContain(
      'import { fetchExternalUrl } from "../../security/url-validator";'
    );
    expect(source).toContain('await fetchExternalUrl(mediaUrl');
    expect(source).not.toContain('validateExternalUrl(mediaUrl)');
    expect(source).not.toContain('await fetch(mediaUrl');
  });

  it('uses the safe external fetch wrapper for ClickSign document downloads', () => {
    const source = readSource('server/integrations/clicksign/document-service.ts');

    expect(source).toContain(
      "import { fetchExternalUrl, validateUrlWithWhitelist } from '../../security/url-validator';"
    );
    expect(source).toContain('await fetchExternalUrl(document.downloads.original_file_url');
    expect(source).toContain('await fetchExternalUrl(document.downloads.signed_file_url');
    expect(source).toContain('maxRedirects: 0');
    expect(source).toContain('timeoutMs: 30_000');
    expect(source).not.toContain('await fetch(document.downloads.original_file_url');
    expect(source).not.toContain('await fetch(document.downloads.signed_file_url');
  });

  it('uses the safe external fetch wrapper for durable backup uploads', () => {
    const source = readSource('server/jobs/processors/backup-processor.ts');

    expect(source).toContain("import { fetchExternalUrl } from '../../security/url-validator';");
    expect(source).toContain('await fetchExternalUrl(uploadUrl');
    expect(source).toContain('maxRedirects: 0');
    expect(source).toContain('timeoutMs: 60_000');
    expect(source).not.toContain('await fetch(uploadUrl');
  });

  it('uses the safe external fetch wrapper for remote restore drill downloads', () => {
    const source = readSource('script/restore-drill.ts');

    expect(source).toContain('import { fetchExternalUrl } from "../server/security/url-validator";');
    expect(source).toContain('await fetchExternalUrl(backupUrl');
    expect(source).toContain('maxRedirects: 3');
    expect(source).toContain('timeoutMs: 60_000');
    expect(source).not.toContain('await fetch(backupUrl');
  });

  it('resolves DNS before queuing WhatsApp media URLs', () => {
    const source = readSource('server/routes-whatsapp.ts');

    expect(source).toContain('import { validateExternalUrlResolved }');
    expect(source).toContain('await validateExternalUrlResolved(mediaUrl)');
  });
});

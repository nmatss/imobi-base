/**
 * File Upload Security — Integração REAL
 *
 * Substitui a antiga suíte que montava um app Express MOCK self-contained
 * (`createTestApp`) e por isso dava "falso verde": nunca exercitava o validador
 * real do projeto nem a rota real de upload.
 *
 * Aqui exercitamos CÓDIGO DE PRODUÇÃO em duas frentes:
 *
 *  1. ROTA REAL (`POST /api/files/upload` de server/routes-files.ts):
 *     subimos o app real com `buildRealApp()`, registramos as rotas de arquivo
 *     (`registerFileRoutes`, que não é montada por `registerRoutes`), fazemos
 *     login real (passport + sessão + CSRF Double-Submit) e enviamos arquivos
 *     maliciosos via multipart. A rota usa o validador real (`validateFile` ->
 *     `comprehensiveFileValidation` -> `validateFileContent`) e rejeita ANTES de
 *     tocar no Supabase, então os 400 são 100% reais.
 *
 *  2. VALIDADOR REAL direto (`comprehensiveFileValidation`, `validateFileContent`
 *     e helpers): para os casos que (a) o transporte multipart não consegue
 *     carregar (null byte no filename quebra o header da parte) ou (b) exigiriam
 *     prosseguir para o Supabase (arquivo VÁLIDO aceito). Usamos magic bytes
 *     reais de JPEG/PNG/PDF/ZIP e um PHP-com-.jpg que deve ser rejeitado.
 *
 * BUG REAL CORRIGIDO (server/security/file-validator.ts):
 *   `fileTypeFromBuffer(buffer)` recebia um `Buffer`. A lib `file-type` valida o
 *   argumento com `instanceof Uint8Array`; sob jsdom (ambiente do Vitest) o
 *   `Uint8Array` global difere do usado pela lib e o `Buffer` falha com
 *   "Expected the input argument to be of type Uint8Array or ArrayBuffer, got
 *   object". Normalizamos para um `Uint8Array` do realm atual antes da chamada.
 *   Sem isso, validateFileContent caía no catch e rejeitava ATÉ imagens válidas.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import bcrypt from 'bcryptjs';
import {
  comprehensiveFileValidation,
  validateFileContent,
  isExtensionDangerous,
  hasDoubleExtension,
  hasNullByteInjection,
  sanitizeFilename,
} from '../../../server/security/file-validator';
import {
  prepareTestEnv,
  setupFreshDatabase,
  restoreDatabase,
  buildRealApp,
  flushRateLimitKeys,
} from '../../helpers/tenant-isolation-app';

// Precisa rodar ANTES de qualquer import de server/* (feito dentro de buildRealApp).
prepareTestEnv();

// ---------------------------------------------------------------------------
// Buffers reais (magic bytes verdadeiros) usados em vários casos.
// ---------------------------------------------------------------------------
const JPEG_HEADER = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const PDF_HEADER = Buffer.from('%PDF-1.4\n');
const ZIP_HEADER = Buffer.from([0x50, 0x4B, 0x03, 0x04]);

const realJpeg = (): Buffer => Buffer.concat([JPEG_HEADER, Buffer.alloc(1000)]);
const realPng = (): Buffer => Buffer.concat([PNG_HEADER, Buffer.alloc(1000)]);
const realPdf = (): Buffer => Buffer.concat([PDF_HEADER, Buffer.alloc(1000)]);
const realZip = (): Buffer => Buffer.concat([ZIP_HEADER, Buffer.alloc(100)]);

// =====================================================================================
// PARTE 1 — ROTA REAL DE UPLOAD (server/routes-files.ts) autenticada
// =====================================================================================
describe('File Upload Security — ROTA REAL (POST /api/files/upload)', () => {
  let app: Express;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storage: any;
  let closeDb: () => Promise<void>;
  let agent: ReturnType<typeof request.agent>;
  let csrfToken: string;

  const PASSWORD = 'SenhaForteDeTeste123!';

  beforeAll(async () => {
    // tests/setup.ts roda um beforeAll global que pode encurtar SESSION_SECRET.
    prepareTestEnv();
    setupFreshDatabase();

    const built = await buildRealApp();
    app = built.app;
    storage = built.storage;
    closeDb = built.closeDb;

    // registerRoutes NÃO monta as rotas de arquivo; registramos no app real.
    const fileRoutes = await import('../../../server/routes-files');
    fileRoutes.registerFileRoutes(app);

    const tenant = await storage.createTenant({
      name: 'Imobiliária Upload',
      slug: `imob-upload-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      email: 'contato-upload@example.com',
      primaryColor: '#0066cc',
      secondaryColor: '#333333',
    });
    const email = `user-upload-${Date.now()}@example.com`;
    await storage.createUser({
      tenantId: tenant.id,
      name: 'Corretor Upload',
      email,
      password: await bcrypt.hash(PASSWORD, 10),
      role: 'admin',
    });

    await flushRateLimitKeys();

    agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(loginRes.status).toBe(200);
    csrfToken = loginRes.body.csrfToken;
    expect(csrfToken).toBeTruthy();
  }, 30000);

  afterAll(async () => {
    try {
      if (closeDb) await closeDb();
    } finally {
      restoreDatabase();
    }
  });

  /** Helper de upload autenticado pela rota real. */
  function upload(
    filename: string,
    content: Buffer,
    fileType: string,
  ): request.Test {
    return agent
      .post('/api/files/upload')
      .set('x-csrf-token', csrfToken)
      .field('fileType', fileType)
      .attach('file', content, filename);
  }

  describe('Autenticação e CSRF', () => {
    it('rejeita upload sem autenticação/CSRF', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .attach('file', realJpeg(), 'a.jpg');
      // CSRF (403) ou auth (401) — nunca aceita (200).
      expect([401, 403]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });
  });

  describe('Detecção de arquivos maliciosos pela rota real', () => {
    it('rejeita web shell PHP (.php) por extensão perigosa', async () => {
      const res = await upload('shell.php', Buffer.from('<?php system($_GET["cmd"]); ?>'), 'document');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('extension is not allowed');
    });

    it('rejeita executável (.exe) por extensão perigosa', async () => {
      const res = await upload('malware.exe', Buffer.from('MZ'), 'document');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('extension is not allowed');
    });

    it('rejeita script shell (.sh) por extensão perigosa', async () => {
      const res = await upload('evil.sh', Buffer.from('#!/bin/bash\nrm -rf /'), 'document');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('extension is not allowed');
    });
  });

  describe('Ataque de dupla extensão pela rota real', () => {
    it('rejeita image.jpg.php (segunda extensão perigosa)', async () => {
      const res = await upload('image.jpg.php', Buffer.from('<?php echo "pwned"; ?>'), 'document');
      expect(res.status).toBe(400);
      // .php é pego como extensão perigosa (a verificação de extensão roda antes).
      expect(res.body.error).toContain('extension is not allowed');
    });

    it('rejeita document.pdf.exe', async () => {
      const res = await upload('document.pdf.exe', Buffer.from('MZ'), 'document');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('extension is not allowed');
    });
  });

  describe('Magic bytes / spoofing de Content-Type pela rota real', () => {
    it('rejeita PHP disfarçado de .jpg (conteúdo não é imagem)', async () => {
      const res = await upload('fake-image.jpg', Buffer.from('<?php echo "fake"; ?>'), 'image');
      expect(res.status).toBe(400);
      // file-type não detecta -> "Could not detect file type".
      expect(res.body.error).toBeTruthy();
    });

    it('rejeita PDF declarado como .jpg (mismatch de tipo detectado)', async () => {
      const res = await upload('fake.jpg', realPdf(), 'image');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('mismatch');
    });

    it('rejeita HTML disfarçado de .png', async () => {
      const html = Buffer.from('<!DOCTYPE html><html><body><script>alert(1)</script></body></html>');
      const res = await upload('malicious.png', html, 'image');
      expect(res.status).toBe(400);
    });
  });

  describe('Segurança de SVG pela rota real', () => {
    it('rejeita SVG com JavaScript embutido (sanitizer real)', async () => {
      const maliciousSvg = Buffer.from(
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(\'XSS\')</script></svg>',
      );
      // fileType 'logo' é o único que aceita image/svg+xml na config.
      const res = await upload('malicious.svg', maliciousSvg, 'logo');
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });
  });
});

// =====================================================================================
// PARTE 2 — VALIDADOR REAL direto (buffers reais; casos não-transportáveis via HTTP
//           ou que exigiriam prosseguir ao Supabase)
// =====================================================================================
describe('File Upload Security — VALIDADOR REAL (file-validator.ts)', () => {
  describe('Aceitação de arquivos legítimos (magic bytes reais)', () => {
    it('aceita JPEG válido e detecta image/jpeg', async () => {
      const r = await comprehensiveFileValidation(realJpeg(), 'valid-image.jpg', 'image/jpeg');
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
      expect(r.detectedType).toContain('image');
    });

    it('aceita PNG válido e detecta image/png', async () => {
      const r = await comprehensiveFileValidation(realPng(), 'valid-image.png', 'image/png');
      expect(r.valid).toBe(true);
      expect(r.detectedType).toContain('image');
    });

    it('aceita PDF válido e detecta application/pdf', async () => {
      const r = await comprehensiveFileValidation(realPdf(), 'document.pdf', 'application/pdf');
      expect(r.valid).toBe(true);
      expect(r.detectedType).toContain('pdf');
    });

    it('aceita ZIP válido', async () => {
      const r = await comprehensiveFileValidation(realZip(), 'archive.zip', 'application/zip');
      expect(r.valid).toBe(true);
      expect(r.detectedType).toContain('zip');
    });
  });

  describe('Detecção de mismatch de tipo (validateFileContent real)', () => {
    it('rejeita PHP disfarçado de .jpg (não detectável)', async () => {
      const r = await comprehensiveFileValidation(
        Buffer.from('<?php echo "fake"; ?>'),
        'fake-image.jpg',
        'image/jpeg',
      );
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('rejeita PDF declarado como image/jpeg (mismatch)', async () => {
      const r = await comprehensiveFileValidation(realPdf(), 'fake.jpg', 'image/jpeg');
      expect(r.valid).toBe(false);
      expect(r.errors.some((e) => e.includes('mismatch'))).toBe(true);
      expect(r.detectedType).toBe('application/pdf');
    });

    it('validateFileContent confirma o tipo correto quando bate', async () => {
      const r = await validateFileContent(realPng(), 'image/png', '.png');
      expect(r.valid).toBe(true);
      expect(r.detectedType).toBe('image/png');
    });
  });

  describe('Detecção de script embutido em imagem (warnings reais)', () => {
    it('emite warning para PHP embutido em JPEG', async () => {
      const malicious = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.from('<?php system("whoami"); ?>'),
        Buffer.alloc(500),
      ]);
      const r = await comprehensiveFileValidation(malicious, 'image-with-php.jpg', 'image/jpeg');
      // file-type ainda detecta como jpeg (magic bytes válidos), então valida,
      // mas o scanner de conteúdo precisa marcar o conteúdo suspeito.
      expect(r.valid).toBe(true);
      expect(r.warnings.some((w) => w.includes('Suspicious content'))).toBe(true);
    });

    it('emite warning para eval() embutido em JPEG', async () => {
      const malicious = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.from('eval(atob("malicious"))'),
        Buffer.alloc(500),
      ]);
      const r = await comprehensiveFileValidation(malicious, 'image-with-eval.jpg', 'image/jpeg');
      expect(r.warnings.some((w) => w.includes('Suspicious content'))).toBe(true);
    });
  });

  describe('Validação de tamanho', () => {
    it('rejeita arquivo vazio', async () => {
      const r = await comprehensiveFileValidation(Buffer.alloc(0), 'empty.txt', 'text/plain');
      expect(r.valid).toBe(false);
      expect(r.errors).toContain('File is empty');
    });

    it('rejeita arquivo acima do máximo absoluto (100MB)', async () => {
      const huge = Buffer.alloc(101 * 1024 * 1024);
      const r = await comprehensiveFileValidation(huge, 'huge.txt', 'text/plain');
      expect(r.valid).toBe(false);
      expect(r.errors.some((e) => e.includes('exceeds'))).toBe(true);
    });
  });

  describe('Helpers de extensão/nome (lógica pura)', () => {
    it('isExtensionDangerous detecta extensões perigosas', () => {
      expect(isExtensionDangerous('shell.php')).toBe(true);
      expect(isExtensionDangerous('malware.exe')).toBe(true);
      expect(isExtensionDangerous('evil.sh')).toBe(true);
      expect(isExtensionDangerous('shell.aspx')).toBe(true);
      expect(isExtensionDangerous('shell.jsp')).toBe(true);
      expect(isExtensionDangerous('photo.jpg')).toBe(false);
    });

    it('hasDoubleExtension detecta extensão dupla perigosa', () => {
      expect(hasDoubleExtension('image.jpg.php')).toBe(true);
      expect(hasDoubleExtension('readme.txt.sh.php')).toBe(true);
      expect(hasDoubleExtension('document.pdf.exe')).toBe(true);
      expect(hasDoubleExtension('photo.jpg')).toBe(false);
      expect(hasDoubleExtension('archive.tar.gz')).toBe(false);
    });

    it('hasNullByteInjection detecta null byte literal e URL-encoded', () => {
      // Estes casos NÃO são transportáveis via multipart (o header da parte
      // quebra com "Malformed part header"), por isso são testados na função.
      expect(hasNullByteInjection('image.jpg\x00.php')).toBe(true);
      expect(hasNullByteInjection('image.jpg%00.php')).toBe(true);
      expect(hasNullByteInjection('photo.jpg')).toBe(false);
    });

    it('comprehensiveFileValidation acumula erro de null byte no nome', async () => {
      const r = await comprehensiveFileValidation(realJpeg(), 'image.jpg\x00.php', 'image/jpeg');
      expect(r.valid).toBe(false);
      expect(r.errors.some((e) => e.includes('null bytes'))).toBe(true);
    });
  });

  describe('Sanitização de filename (sanitizeFilename real)', () => {
    it('remove tentativa de path traversal', () => {
      const out = sanitizeFilename('../../../etc/passwd');
      expect(out).not.toContain('../');
      expect(out).not.toContain('/');
    });

    it('remove caracteres perigosos (< >)', () => {
      const out = sanitizeFilename('test<script>.jpg');
      expect(out).not.toContain('<');
      expect(out).not.toContain('>');
    });

    it('remove null bytes do nome', () => {
      const out = sanitizeFilename('image.jpg\x00.php');
      expect(out).not.toContain('\x00');
      expect(out).not.toContain('%00');
    });

    it('limita o comprimento a 255 caracteres', () => {
      const longName = `${'a'.repeat(300)}.jpg`;
      const out = sanitizeFilename(longName);
      expect(out.length).toBeLessThanOrEqual(255);
    });
  });
});

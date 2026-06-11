/**
 * SSRF (Server-Side Request Forgery) Protection — Integração com o GUARD REAL
 *
 * ANTES: este arquivo montava um app Express self-contained (createTestApp) com
 * rotas inventadas (/api/webhooks/fetch, /api/users/avatar, /api/import) que NÃO
 * existem no produto. Isso dava "falso verde": validava um wrapper de teste, não
 * o código real.
 *
 * AGORA: exercitamos diretamente o GUARD REAL `validateExternalUrl` /
 * `validateUrlWithWhitelist` de `server/security/url-validator.ts` — exatamente a
 * função que ClickSign (document-service) e WhatsApp (business-api / routes-whatsapp
 * `POST /api/whatsapp/send-media`) chamam para barrar SSRF antes de fazer fetch de
 * URL externa. As asserções refletem o COMPORTAMENTO REAL do guard.
 *
 * Por que não subir uma rota HTTP via buildRealApp? A única rota que aceita URL
 * externa e roda o guard (`/api/whatsapp/send-media`) é registrada em
 * `server/index.ts` (registerWhatsAppRoutes), NÃO em `registerRoutes` (que o
 * harness monta), e fica atrás de `checkFeatureAccess('whatsapp')` + auth + plan
 * limits + filas (Redis). O guard em si é a unidade de defesa SSRF e é 100%
 * exercitado chamando a função real exportada — sem mock.
 *
 * LIMITAÇÕES REAIS DO GUARD (bugs em código compartilhado fora do meu track de
 * edição — server/security/url-validator.ts pertence ao meu track, MAS há um
 * teste unitário existente em server/security/__tests__/url-validator.test.ts que
 * documenta e CONGELA o comportamento atual como `valid: true` para IPv6 loopback
 * com um TODO explícito; corrigir o guard quebraria aquela suíte fora do meu
 * arquivo). Por isso os casos genuinamente NÃO protegidos hoje ficam marcados com
 * it.skip + ticket, mantendo a suíte verde sem esconder a lacuna. Ver bloco
 * "Lacunas conhecidas do guard" e o relatório.
 */
import { describe, it, expect } from 'vitest';
import {
  validateExternalUrl,
  validateUrlWithWhitelist,
} from '../../../server/security/url-validator';

describe('SSRF Protection — GUARD REAL (validateExternalUrl)', () => {
  describe('Localhost / Loopback', () => {
    it('bloqueia http://localhost', () => {
      const r = validateExternalUrl('http://localhost:3000/admin');
      expect(r.valid).toBe(false);
      // hostname "localhost" cai na lista BLOCKED_HOSTS -> mensagem genérica.
      expect(r.error).toContain('internal resources');
    });

    it('bloqueia http://127.0.0.1', () => {
      const r = validateExternalUrl('http://127.0.0.1:8080/secrets');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('internal resources');
    });

    it('bloqueia faixa loopback 127.x.x.x (ex.: 127.0.0.2)', () => {
      const r = validateExternalUrl('http://127.0.0.2/x');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('private IP');
    });

    it('bloqueia 0.0.0.0', () => {
      const r = validateExternalUrl('http://0.0.0.0:6379/redis');
      expect(r.valid).toBe(false);
      // 0.0.0.0 está em BLOCKED_HOSTS -> mensagem de internal resources.
      expect(r.error).toContain('internal resources');
    });
  });

  describe('Faixas de IP privado', () => {
    it('bloqueia 10.0.0.0/8', () => {
      const r = validateExternalUrl('http://10.0.0.1/internal');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('private IP');
    });

    it('bloqueia 172.16.0.0/12 (limites inferior e superior)', () => {
      const lower = validateExternalUrl('http://172.16.0.1/admin');
      const upper = validateExternalUrl('http://172.31.255.255/data');
      expect(lower.valid).toBe(false);
      expect(upper.valid).toBe(false);
      expect(lower.error).toContain('private IP');
    });

    it('NÃO trata 172.15/172.32 como privado (fora da faixa /12)', () => {
      // Sanidade da fronteira: 172.15.x e 172.32.x são endereços públicos.
      expect(validateExternalUrl('http://172.15.0.1/').valid).toBe(true);
      expect(validateExternalUrl('http://172.32.0.1/').valid).toBe(true);
    });

    it('bloqueia 192.168.0.0/16', () => {
      const r = validateExternalUrl('http://192.168.1.1/router');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('private IP');
    });

    it('bloqueia link-local 169.254.0.0/16', () => {
      const r = validateExternalUrl('http://169.254.1.1/metadata');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('private IP');
    });
  });

  describe('Endpoints de metadados de cloud', () => {
    it('bloqueia AWS IMDS 169.254.169.254', () => {
      const r = validateExternalUrl('http://169.254.169.254/latest/meta-data/');
      expect(r.valid).toBe(false);
      // 169.254.169.254 está em BLOCKED_HOSTS (match exato) antes do check de IP.
      expect(r.error).toContain('internal resources');
    });

    it('bloqueia AWS IMDSv2 IPv6 fd00:ec2::254', () => {
      const r = validateExternalUrl('http://[fd00:ec2::254]/latest/meta-data/');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('internal resources');
    });

    it('bloqueia GCP metadata.google.internal', () => {
      const r = validateExternalUrl('http://metadata.google.internal/computeMetadata/v1/');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('internal resources');
    });

    it('bloqueia subdomínio de host bloqueado (foo.metadata.google.internal)', () => {
      // O guard usa hostname === blocked || hostname.endsWith(`.${blocked}`).
      const r = validateExternalUrl('http://foo.metadata.google.internal/');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('internal resources');
    });
  });

  describe('Protocolos perigosos', () => {
    it('bloqueia file://', () => {
      const r = validateExternalUrl('file:///etc/passwd');
      expect(r.valid).toBe(false);
      // Protocolo não permitido cai no check 1 (ALLOWED_PROTOCOLS) primeiro.
      expect(r.error).toContain('not allowed');
    });

    it('bloqueia ftp://', () => {
      const r = validateExternalUrl('ftp://internal-ftp.local/files');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('not allowed');
    });

    it('bloqueia gopher://', () => {
      const r = validateExternalUrl('gopher://internal.local:70/');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('not allowed');
    });

    it('permite somente http:// e https://', () => {
      expect(validateExternalUrl('https://example.com/api/data').valid).toBe(true);
      expect(validateExternalUrl('http://example.com/api/data').valid).toBe(true);
    });
  });

  describe('Tentativas de bypass que o guard REALMENTE barra', () => {
    it('bloqueia credenciais embutidas (user@127.0.0.1) — host real é o IP', () => {
      // new URL("http://example.com@127.0.0.1/") => hostname "127.0.0.1".
      const r = validateExternalUrl('http://example.com@127.0.0.1/admin');
      expect(r.valid).toBe(false);
    });

    it('bloqueia credenciais embutidas para localhost (user:pass@localhost)', () => {
      const r = validateExternalUrl('http://user:pass@localhost/file.pdf');
      expect(r.valid).toBe(false);
    });

    it('bloqueia IP decimal (2130706433 normaliza para 127.0.0.1)', () => {
      // Node normaliza o host: URL("http://2130706433/").hostname === "127.0.0.1".
      const r = validateExternalUrl('http://2130706433/');
      expect(r.valid).toBe(false);
    });

    it('bloqueia IP hexadecimal (0x7f000001 normaliza para 127.0.0.1)', () => {
      const r = validateExternalUrl('http://0x7f000001/');
      expect(r.valid).toBe(false);
    });

    it('bloqueia IP octal (0177.0.0.1 normaliza para 127.0.0.1)', () => {
      const r = validateExternalUrl('http://0177.0.0.1/');
      expect(r.valid).toBe(false);
    });
  });

  describe('URLs malformadas (new URL lança e o guard captura)', () => {
    // Apenas casos em que `new URL()` realmente lança. "https://.com" é aceito
    // pelo parser e NÃO é barrado pelo guard atual (ver "Lacunas conhecidas").
    const throwing = ['not-a-url', 'http://', '//example.com', 'http://exam ple.com'];

    for (const url of throwing) {
      it(`rejeita URL malformada: ${JSON.stringify(url)}`, () => {
        const r = validateExternalUrl(url);
        expect(r.valid).toBe(false);
        expect(r.error).toContain('Invalid URL format');
      });
    }

    it('rejeita string vazia', () => {
      const r = validateExternalUrl('');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('Invalid URL format');
    });
  });

  describe('URLs externas legítimas são permitidas', () => {
    const valid = [
      'https://api.github.com/users',
      'https://www.google.com',
      'https://example.org/webhook',
      'http://example.com/api',
      'https://s3.amazonaws.com/bucket/file.pdf',
      // URL típica de mídia do WhatsApp (caminho real que passa pelo guard).
      'https://lookaside.fbsbx.com/whatsapp_business/attachments/123',
    ];

    for (const url of valid) {
      it(`permite ${url}`, () => {
        expect(validateExternalUrl(url).valid).toBe(true);
      });
    }
  });

  describe('validateUrlWithWhitelist (caminho REAL do ClickSign)', () => {
    const allowed = ['example.com', 'api.trusted.com'];

    it('permite domínio da whitelist', () => {
      expect(validateUrlWithWhitelist('https://example.com/file.pdf', allowed).valid).toBe(true);
    });

    it('permite subdomínio de domínio da whitelist', () => {
      expect(validateUrlWithWhitelist('https://cdn.example.com/file.pdf', allowed).valid).toBe(true);
    });

    it('bloqueia domínio fora da whitelist', () => {
      const r = validateUrlWithWhitelist('https://malicious.com/file.pdf', allowed);
      expect(r.valid).toBe(false);
      expect(r.error).toContain('not in the allowed list');
    });

    it('mantém defesa SSRF mesmo com whitelist (localhost permanece bloqueado)', () => {
      // Mesmo que "localhost" não esteja na whitelist, a defesa base roda antes.
      const r = validateUrlWithWhitelist('http://localhost/file.pdf', allowed);
      expect(r.valid).toBe(false);
    });

    it('mantém defesa SSRF para IP privado mesmo com whitelist', () => {
      const r = validateUrlWithWhitelist('http://192.168.1.1/file.pdf', allowed);
      expect(r.valid).toBe(false);
    });
  });

  /**
   * Lacunas conhecidas do guard REAL (NÃO mascaradas — registradas como skip).
   *
   * Estes vetores de SSRF NÃO são barrados pela implementação atual de
   * `server/security/url-validator.ts`. O guard pertence ao meu track, mas há um
   * teste unitário em `server/security/__tests__/url-validator.test.ts` (fora do
   * meu arquivo de edição) que congela essas exatas respostas como `valid: true`
   * com TODO explícito ("Enhance validator to block IPv6 private addresses").
   * Corrigir o guard quebraria aquela suíte. Deixo aqui como it.skip com o
   * comportamento ESPERADO (deveria bloquear) + ticket, para a lacuna ficar
   * visível e rastreável sem deixar a suíte vermelha.
   *
   * Ticket sugerido: SEC-SSRF-IPV6 / SEC-SSRF-MALFORMED-HOST.
   */
  describe('Lacunas de SSRF (corrigidas no guard)', () => {
    it('bloqueia IPv6 loopback [::1] (SEC-SSRF-IPV6)', () => {
      const r = validateExternalUrl('http://[::1]:3000/admin');
      expect(r.valid).toBe(false);
    });

    it('bloqueia hostname malformado "https://.com" (SEC-SSRF-MALFORMED-HOST)', () => {
      const r = validateExternalUrl('https://.com');
      expect(r.valid).toBe(false);
    });
  });
});

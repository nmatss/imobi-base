import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { URL } from 'url';

export interface URLValidationResult {
  valid: boolean;
  error?: string;
}

export type DnsLookup = (
  hostname: string
) => Promise<Array<{ address: string; family: number }>>;

export interface SafeExternalFetchOptions extends RequestInit {
  maxRedirects?: number;
  timeoutMs?: number;
  dnsLookup?: DnsLookup;
}

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal', // GCP metadata
  'fd00:ec2::254', // AWS IMDSv2 IPv6
  '::1', // IPv6 loopback
  '::', // IPv6 unspecified
];

const ALLOWED_PROTOCOLS = ['https:', 'http:'];

function normalizeHostname(hostname: string): string {
  const rawHostname = hostname.toLowerCase();
  return rawHostname.startsWith('[') && rawHostname.endsWith(']')
    ? rawHostname.slice(1, -1)
    : rawHostname;
}

function isBlockedHostname(hostname: string): boolean {
  return BLOCKED_HOSTS.some(
    blocked => hostname === blocked || hostname.endsWith(`.${blocked}`)
  );
}

function isPrivateAddress(address: string): boolean {
  return isPrivateIP(address) || isPrivateIPv6(address);
}

async function defaultDnsLookup(hostname: string) {
  return lookup(hostname, { all: true, verbatim: true });
}

/**
 * Valida URL externa para prevenir SSRF
 */
export function validateExternalUrl(urlString: string): URLValidationResult {
  try {
    const url = new URL(urlString);

    // 1. Verificar protocolo
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        valid: false,
        error: `Protocol ${url.protocol} not allowed. Only HTTP/HTTPS permitted.`,
      };
    }

    // 2. Bloquear file:// e outros protocolos perigosos
    if (url.protocol === 'file:' || url.protocol === 'ftp:') {
      return {
        valid: false,
        error: 'File and FTP protocols are forbidden',
      };
    }

    // 3. Verificar hosts bloqueados
    // url.hostname mantém os colchetes em IPv6 (ex.: "[fd00:ec2::254]"), o que
    // impediria o match exato contra entradas de BLOCKED_HOSTS sem colchetes.
    // Normalizamos removendo os colchetes para comparar literais IPv6.
    const hostname = normalizeHostname(url.hostname);

    if (isBlockedHostname(hostname)) {
      return {
        valid: false,
        error: 'Access to internal resources is forbidden',
      };
    }

    // 3b. Bloquear hostname malformado (labels vazios), ex.: ".com", "a..b"
    if (
      !hostname ||
      hostname.startsWith('.') ||
      hostname.endsWith('.') ||
      hostname.includes('..')
    ) {
      return {
        valid: false,
        error: 'Malformed hostname',
      };
    }

    // 4. Verificar IPs privados (IPv4)
    if (isPrivateIP(hostname)) {
      return {
        valid: false,
        error: 'Access to private IP addresses is forbidden',
      };
    }

    // 4b. Verificar IPv6 loopback/privado/link-local (fora dos literais já em BLOCKED_HOSTS)
    if (isPrivateIPv6(hostname)) {
      return {
        valid: false,
        error: 'Access to private IPv6 addresses is forbidden',
      };
    }

    // 5. Bloquear redirect infinito (verificar se não aponta para localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return {
        valid: false,
        error: 'Localhost access is forbidden',
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: `Invalid URL format: ${error.message}`,
    };
  }
}

/**
 * Valida URL externa resolvendo DNS antes de qualquer fetch.
 * Isso bloqueia DNS rebinding simples e domínios que apontem para IPs privados.
 */
export async function validateExternalUrlResolved(
  urlString: string,
  dnsLookup: DnsLookup = defaultDnsLookup
): Promise<URLValidationResult> {
  const basicValidation = validateExternalUrl(urlString);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  try {
    const url = new URL(urlString);
    const hostname = normalizeHostname(url.hostname);

    if (isIP(hostname)) {
      return { valid: true };
    }

    const addresses = await dnsLookup(hostname);
    if (!addresses.length) {
      return {
        valid: false,
        error: 'DNS resolution returned no addresses',
      };
    }

    const privateAddress = addresses.find(result => isPrivateAddress(result.address));
    if (privateAddress) {
      return {
        valid: false,
        error: `DNS resolves to private IP address ${privateAddress.address}`,
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: `DNS resolution failed: ${error.message}`,
    };
  }
}

/**
 * Fetch seguro para URLs externas:
 * - valida protocolo/host/IP literal;
 * - resolve DNS antes de conectar;
 * - desabilita redirect automatico e valida cada Location manualmente;
 * - bloqueia redirect de POST/PUT/PATCH/DELETE para evitar vazamento de payload.
 */
export async function fetchExternalUrl(
  urlString: string,
  options: SafeExternalFetchOptions = {}
): Promise<Response> {
  const {
    maxRedirects = 3,
    timeoutMs,
    dnsLookup,
    signal,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeout = timeoutMs
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined;

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  let currentUrl = urlString;
  let redirects = 0;

  try {
    while (true) {
      const validation = await validateExternalUrlResolved(currentUrl, dnsLookup);
      if (!validation.valid) {
        throw new Error(`Unsafe external URL: ${validation.error}`);
      }

      const response = await fetch(currentUrl, {
        ...fetchOptions,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) {
        return response;
      }

      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`External URL redirect without Location header (${response.status})`);
      }

      if (redirects >= maxRedirects) {
        throw new Error(`External URL exceeded ${maxRedirects} redirects`);
      }

      const method = String(fetchOptions.method || 'GET').toUpperCase();
      if (method !== 'GET' && method !== 'HEAD') {
        throw new Error('External URL redirects are not allowed for non-idempotent requests');
      }

      currentUrl = new URL(location, currentUrl).toString();
      redirects += 1;
    }
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

/**
 * Verifica se hostname é IPv6 loopback/privado/link-local.
 * Cobre ::1 (loopback), :: (unspecified), fc00::/7 (ULA, prefixos fc/fd) e
 * fe80::/10 (link-local). Recebe o hostname já sem colchetes.
 */
function isPrivateIPv6(hostname: string): boolean {
  if (!hostname.includes(':')) return false;
  const h = hostname.toLowerCase();
  if (h === '::1' || h === '::') return true;
  if (h.startsWith('::ffff:')) {
    const mapped = h.slice('::ffff:'.length);
    return isPrivateIP(mapped);
  }
  // ULA fc00::/7 -> primeiro hextet começa com fc ou fd
  if (/^f[cd][0-9a-f]{0,2}:/.test(h)) return true;
  // link-local fe80::/10 -> fe8x..feb x
  if (/^fe[89ab][0-9a-f]?:/.test(h)) return true;
  return false;
}

/**
 * Verifica se hostname é IP privado
 */
function isPrivateIP(hostname: string): boolean {
  // Verificar se é IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

  if (!ipv4Regex.test(hostname)) {
    // Não é IPv4, verificar se é hostname perigoso
    return false;
  }

  const parts = hostname.split('.').map(Number);

  // Validar cada octeto
  if (parts.some(part => part < 0 || part > 255 || isNaN(part))) {
    return true; // IP inválido, bloquear
  }

  // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 127.0.0.0/8 (127.0.0.0 - 127.255.255.255) - loopback
  if (parts[0] === 127) return true;

  // 0.0.0.0/8 (0.0.0.0 - 0.255.255.255)
  if (parts[0] === 0) return true;

  // 169.254.0.0/16 (169.254.0.0 - 169.254.255.255) - link-local
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 224.0.0.0/4 (224.0.0.0 - 239.255.255.255) - multicast
  if (parts[0] >= 224 && parts[0] <= 239) return true;

  // 240.0.0.0/4 (240.0.0.0 - 255.255.255.255) - reserved
  if (parts[0] >= 240) return true;

  return false;
}

/**
 * Valida URL com lista branca de domínios
 */
export function validateUrlWithWhitelist(
  urlString: string,
  allowedDomains: string[]
): URLValidationResult {
  const basicValidation = validateExternalUrl(urlString);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    const isAllowed = allowedDomains.some(domain => {
      const normalizedDomain = domain.toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `Domain ${hostname} is not in the allowed list`,
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

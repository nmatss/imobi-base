import { URL } from 'url';

export interface URLValidationResult {
  valid: boolean;
  error?: string;
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
    const rawHostname = url.hostname.toLowerCase();
    const hostname =
      rawHostname.startsWith('[') && rawHostname.endsWith(']')
        ? rawHostname.slice(1, -1)
        : rawHostname;

    for (const blocked of BLOCKED_HOSTS) {
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return {
          valid: false,
          error: 'Access to internal resources is forbidden',
        };
      }
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
 * Verifica se hostname é IPv6 loopback/privado/link-local.
 * Cobre ::1 (loopback), :: (unspecified), fc00::/7 (ULA, prefixos fc/fd) e
 * fe80::/10 (link-local). Recebe o hostname já sem colchetes.
 */
function isPrivateIPv6(hostname: string): boolean {
  if (!hostname.includes(':')) return false;
  const h = hostname.toLowerCase();
  if (h === '::1' || h === '::') return true;
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

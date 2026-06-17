const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://imobibase.com.br",
  "https://www.imobibase.com.br",
  "https://*.imobibase.com.br",
  "https://imobibase.com",
  "https://www.imobibase.com",
  "https://*.imobibase.com",
];

interface CorsEnv {
  NODE_ENV?: string;
  CORS_ORIGINS?: string;
  ALLOWED_ORIGINS?: string;
}

function splitOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsOrigins(
  env: CorsEnv = process.env as CorsEnv,
): string[] {
  const configuredOrigins = [
    ...splitOrigins(env.CORS_ORIGINS),
    ...splitOrigins(env.ALLOWED_ORIGINS),
  ];

  const origins = configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_CORS_ORIGINS;
  return [...new Set(origins)];
}

export function isCorsOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;

  return allowedOrigins.some((allowedOrigin) => {
    if (!allowedOrigin.includes("*")) {
      return allowedOrigin === origin;
    }

    const pattern = allowedOrigin
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^.]+");
    return new RegExp(`^${pattern}$`).test(origin);
  });
}

export function getCorsProductionWarnings(
  env: CorsEnv = process.env as CorsEnv,
): string[] {
  if (env.NODE_ENV !== "production") return [];

  const warnings: string[] = [];
  const origins = getCorsOrigins(env);

  if (!env.CORS_ORIGINS && env.ALLOWED_ORIGINS) {
    warnings.push("ALLOWED_ORIGINS is deprecated; set CORS_ORIGINS with the same values.");
  }

  if (!env.CORS_ORIGINS && !env.ALLOWED_ORIGINS) {
    warnings.push("CORS_ORIGINS is not configured; runtime is using built-in defaults.");
  }

  if (origins.some((origin) => origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    warnings.push("Localhost origins are allowed in production.");
  }

  return warnings;
}

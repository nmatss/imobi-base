import { AsyncLocalStorage } from "node:async_hooks";
import type { Pool, PoolClient } from "pg";

type QueryFunction = (...args: unknown[]) => Promise<unknown>;

interface TenantRlsContext {
  tenantId?: string;
  userId?: string;
  authEmail?: string;
  passwordResetTokenHash?: string;
  emailVerificationTokenHash?: string;
  clicksignDocumentKey?: string;
  digitalSignatureToken?: string;
  publicPropertyIds?: string[];
  propertyComparisonId?: string;
  whatsappPhoneNumberId?: string;
}

const tenantRlsContext = new AsyncLocalStorage<TenantRlsContext>();
const poolInstalledSymbol = Symbol.for("imobibase.rls.poolInstalled");
const clientInstalledSymbol = Symbol.for("imobibase.rls.clientInstalled");

export function getTenantRlsContext(): TenantRlsContext | null {
  return tenantRlsContext.getStore() ?? null;
}

export function runWithTenantRlsContext<T>(tenantId: string, callback: () => T): T {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("tenantId is required to enable PostgreSQL RLS context");
  }

  return tenantRlsContext.run({ tenantId }, callback);
}

export function runWithUserRlsContext<T>(userId: string, callback: () => T): T {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId is required to enable PostgreSQL RLS context");
  }

  return tenantRlsContext.run({ userId }, callback);
}

export function runWithAuthEmailRlsContext<T>(email: string, callback: () => T): T {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("email is required to enable PostgreSQL auth RLS context");
  }

  return tenantRlsContext.run({ authEmail: normalizedEmail }, callback);
}

export function runWithPasswordResetTokenRlsContext<T>(tokenHash: string, callback: () => T): T {
  if (!tokenHash || typeof tokenHash !== "string") {
    throw new Error("tokenHash is required to enable PostgreSQL password-reset RLS context");
  }

  return tenantRlsContext.run({ passwordResetTokenHash: tokenHash }, callback);
}

export function runWithEmailVerificationTokenRlsContext<T>(tokenHash: string, callback: () => T): T {
  if (!tokenHash || typeof tokenHash !== "string") {
    throw new Error("tokenHash is required to enable PostgreSQL email-verification RLS context");
  }

  return tenantRlsContext.run({ emailVerificationTokenHash: tokenHash }, callback);
}

export function runWithClickSignDocumentRlsContext<T>(documentKey: string, callback: () => T): T {
  if (!documentKey || typeof documentKey !== "string") {
    throw new Error("documentKey is required to enable PostgreSQL ClickSign RLS context");
  }

  return tenantRlsContext.run({ clicksignDocumentKey: documentKey }, callback);
}

export function runWithDigitalSignatureTokenRlsContext<T>(token: string, callback: () => T): T {
  if (!token || typeof token !== "string") {
    throw new Error("token is required to enable PostgreSQL digital-signature RLS context");
  }

  return tenantRlsContext.run({ digitalSignatureToken: token }, callback);
}

export function runWithPublicPropertyIdsRlsContext<T>(propertyIds: string[], callback: () => T): T {
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
    throw new Error("propertyIds are required to enable PostgreSQL public-property RLS context");
  }

  const normalizedIds = [...new Set(propertyIds)];
  if (
    normalizedIds.some(
      (id) => typeof id !== "string" || !id.trim() || id.includes(","),
    )
  ) {
    throw new Error("propertyIds must be non-empty strings without commas");
  }

  return tenantRlsContext.run({ publicPropertyIds: normalizedIds }, callback);
}

export function runWithPropertyComparisonRlsContext<T>(
  comparisonId: string,
  callback: () => T,
): T {
  if (!comparisonId || typeof comparisonId !== "string") {
    throw new Error("comparisonId is required to enable PostgreSQL comparison RLS context");
  }

  return tenantRlsContext.run({ propertyComparisonId: comparisonId }, callback);
}

export function runWithWhatsAppPhoneNumberRlsContext<T>(
  phoneNumberId: string,
  callback: () => T,
): T {
  if (!phoneNumberId || typeof phoneNumberId !== "string") {
    throw new Error("phoneNumberId is required to enable PostgreSQL WhatsApp RLS context");
  }

  return tenantRlsContext.run({ whatsappPhoneNumberId: phoneNumberId }, callback);
}

export function installTenantRlsOnPool(pool: Pool): void {
  const patchedPool = pool as unknown as {
    [poolInstalledSymbol]?: boolean;
    query: QueryFunction;
    connect: (...args: unknown[]) => Promise<PoolClient>;
  };

  if (patchedPool[poolInstalledSymbol]) return;

  const originalQuery = patchedPool.query.bind(pool);
  const originalConnect = patchedPool.connect.bind(pool);

  patchedPool.query = async (...args: unknown[]) => {
    if (!shouldApplyTenantContext(args)) {
      return originalQuery(...args);
    }

    const context = getTenantRlsContext()!;
    const client = (await originalConnect()) as PoolClient;
    const clientQuery = client.query.bind(client) as QueryFunction;

    try {
      await clientQuery("begin");
      await setLocalRlsContext(clientQuery, context);
      const result = await clientQuery(...args);
      await clientQuery("commit");
      return result;
    } catch (error) {
      try {
        await clientQuery("rollback");
      } catch {
        // Preserve the original query error.
      }
      throw error;
    } finally {
      client.release();
    }
  };

  patchedPool.connect = async (...args: unknown[]) => {
    const client = (await originalConnect(...args)) as PoolClient;
    return installTenantRlsOnClient(client);
  };

  Object.defineProperty(patchedPool, poolInstalledSymbol, {
    value: true,
    enumerable: false,
  });
}

function installTenantRlsOnClient(client: PoolClient): PoolClient {
  const patchedClient = client as unknown as {
    [clientInstalledSymbol]?: boolean;
    query: QueryFunction;
  };

  if (patchedClient[clientInstalledSymbol]) return client;

  const originalQuery = patchedClient.query.bind(client);
  let transactionDepth = 0;

  patchedClient.query = async (...args: unknown[]) => {
    const sqlText = normalizeQueryText(args);
    const context = getTenantRlsContext();

    if (!context || hasCallback(args) || !sqlText) {
      return originalQuery(...args);
    }

    if (isBegin(sqlText)) {
      const result = await originalQuery(...args);
      await setLocalRlsContext(originalQuery, context);
      transactionDepth += 1;
      return result;
    }

    if (isTransactionEnd(sqlText)) {
      try {
        return await originalQuery(...args);
      } finally {
        transactionDepth = Math.max(0, transactionDepth - 1);
      }
    }

    if (!isTenantScopedStatement(sqlText) || transactionDepth > 0) {
      return originalQuery(...args);
    }

    await originalQuery("begin");
    try {
      await setLocalRlsContext(originalQuery, context);
      const result = await originalQuery(...args);
      await originalQuery("commit");
      return result;
    } catch (error) {
      try {
        await originalQuery("rollback");
      } catch {
        // Preserve the original query error.
      }
      throw error;
    }
  };

  Object.defineProperty(patchedClient, clientInstalledSymbol, {
    value: true,
    enumerable: false,
  });

  return client;
}

function shouldApplyTenantContext(args: unknown[]): boolean {
  const context = getTenantRlsContext();
  if (!context || !hasRlsContextValues(context) || hasCallback(args)) return false;

  return isTenantScopedStatement(normalizeQueryText(args));
}

function hasCallback(args: unknown[]): boolean {
  return args.some((arg) => typeof arg === "function");
}

function normalizeQueryText(args: unknown[]): string {
  const query = args[0];
  let text = "";
  if (typeof query === "string") {
    text = query;
  } else if (query && typeof query === "object" && "text" in query) {
    const queryText = (query as { text?: unknown }).text;
    text = typeof queryText === "string" ? queryText : "";
  }

  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function isTenantScopedStatement(sqlText: string): boolean {
  if (!sqlText) return false;
  if (isBegin(sqlText) || isTransactionEnd(sqlText)) return false;
  if (/^(savepoint|release savepoint|rollback to savepoint)\b/.test(sqlText)) return false;
  if (/^(set|reset|show)\b/.test(sqlText)) return false;
  if (/^select set_config\(/.test(sqlText)) return false;

  return true;
}

function isBegin(sqlText: string): boolean {
  return /^begin\b|^start transaction\b/.test(sqlText);
}

function isTransactionEnd(sqlText: string): boolean {
  return /^commit\b|^rollback\b/.test(sqlText);
}

async function setLocalTenantId(query: QueryFunction, tenantId: string): Promise<void> {
  await query("select set_config('app.tenant_id', $1, true)", [tenantId]);
}

async function setLocalUserId(query: QueryFunction, userId: string): Promise<void> {
  await query("select set_config('app.user_id', $1, true)", [userId]);
}

async function setLocalAuthEmail(query: QueryFunction, email: string): Promise<void> {
  await query("select set_config('app.auth_email', $1, true)", [email]);
}

async function setLocalPasswordResetTokenHash(query: QueryFunction, tokenHash: string): Promise<void> {
  await query("select set_config('app.password_reset_token_hash', $1, true)", [tokenHash]);
}

async function setLocalEmailVerificationTokenHash(query: QueryFunction, tokenHash: string): Promise<void> {
  await query("select set_config('app.email_verification_token_hash', $1, true)", [tokenHash]);
}

async function setLocalClickSignDocumentKey(query: QueryFunction, documentKey: string): Promise<void> {
  await query("select set_config('app.clicksign_document_key', $1, true)", [documentKey]);
}

async function setLocalDigitalSignatureToken(query: QueryFunction, token: string): Promise<void> {
  await query("select set_config('app.digital_signature_token', $1, true)", [token]);
}

async function setLocalPublicPropertyIds(query: QueryFunction, propertyIds: string[]): Promise<void> {
  await query("select set_config('app.public_property_ids', $1, true)", [propertyIds.join(",")]);
}

async function setLocalPropertyComparisonId(query: QueryFunction, comparisonId: string): Promise<void> {
  await query("select set_config('app.property_comparison_id', $1, true)", [comparisonId]);
}

async function setLocalWhatsAppPhoneNumberId(query: QueryFunction, phoneNumberId: string): Promise<void> {
  await query("select set_config('app.whatsapp_phone_number_id', $1, true)", [phoneNumberId]);
}

async function setLocalRlsContext(query: QueryFunction, context: TenantRlsContext): Promise<void> {
  if (context.tenantId) await setLocalTenantId(query, context.tenantId);
  if (context.userId) await setLocalUserId(query, context.userId);
  if (context.authEmail) await setLocalAuthEmail(query, context.authEmail);
  if (context.passwordResetTokenHash) {
    await setLocalPasswordResetTokenHash(query, context.passwordResetTokenHash);
  }
  if (context.emailVerificationTokenHash) {
    await setLocalEmailVerificationTokenHash(query, context.emailVerificationTokenHash);
  }
  if (context.clicksignDocumentKey) {
    await setLocalClickSignDocumentKey(query, context.clicksignDocumentKey);
  }
  if (context.digitalSignatureToken) {
    await setLocalDigitalSignatureToken(query, context.digitalSignatureToken);
  }
  if (context.publicPropertyIds) {
    await setLocalPublicPropertyIds(query, context.publicPropertyIds);
  }
  if (context.propertyComparisonId) {
    await setLocalPropertyComparisonId(query, context.propertyComparisonId);
  }
  if (context.whatsappPhoneNumberId) {
    await setLocalWhatsAppPhoneNumberId(query, context.whatsappPhoneNumberId);
  }
}

function hasRlsContextValues(context: TenantRlsContext): boolean {
  return Boolean(
    context.tenantId ||
      context.userId ||
      context.authEmail ||
      context.passwordResetTokenHash ||
      context.emailVerificationTokenHash ||
      context.clicksignDocumentKey ||
      context.digitalSignatureToken ||
      context.publicPropertyIds?.length ||
      context.propertyComparisonId ||
      context.whatsappPhoneNumberId,
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

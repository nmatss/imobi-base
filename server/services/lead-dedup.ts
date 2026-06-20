/**
 * Lead de-duplication helpers.
 *
 * The Postgres uniqueness guarantee lives in migration
 * `20260620_005_leads_dedup_indexes.sql`:
 *
 *   CREATE UNIQUE INDEX leads_tenant_phone_uniq
 *     ON leads(tenant_id, regexp_replace(phone, '\D', '', 'g'))  -- digits only
 *     WHERE phone IS NOT NULL AND deleted_at IS NULL;
 *
 *   CREATE UNIQUE INDEX leads_tenant_email_uniq
 *     ON leads(tenant_id, lower(email))
 *     WHERE email IS NOT NULL AND deleted_at IS NULL;
 *
 * `storage.findLeadByDedup` matches the stored column value with `eq(...)`, so
 * the normalization applied here MUST collapse a value to the exact same canonical
 * form the index buckets on, otherwise lookups silently miss existing rows.
 *
 * - normalizePhone: digits only — IDENTICAL to `regexp_replace(phone, '\D', '', 'g')`.
 *   We also strip a leading Brazilian country code (55) when the remaining number is
 *   a full local number (10 or 11 digits) so that "+55 11 99999-9999" and
 *   "11 99999-9999" collapse to the same bucket. This is a pure superset of the
 *   digits-only rule (still digits only); callers that persist the lead should store
 *   the same normalized phone so the partial unique index keeps protecting them.
 * - normalizeEmail: lower(trim(email)) — IDENTICAL to `lower(email)` (trim is a
 *   client-side safety net; the DB never stores leading/trailing whitespace).
 */

/** Digits-only, matching `regexp_replace(phone, '\D', '', 'g')`. */
export function digitsOnly(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

/**
 * Canonical phone bucket for dedup.
 * Returns digits only (index-compatible). Strips a leading 55 country code when the
 * rest is a complete Brazilian local number (10 = landline w/ DDD, 11 = mobile w/ DDD
 * 9-digit), so the "+55" and bare-DDD forms of the same number collapse together.
 */
export function normalizePhone(value: string | null | undefined): string | undefined {
  const digits = digitsOnly(value);
  if (!digits) return undefined;

  // 13 digits = 55 + DDD(2) + 9-digit mobile; 12 = 55 + DDD(2) + 8-digit landline.
  if (digits.length === 13 && digits.startsWith("55")) {
    return digits.slice(2);
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

/** Canonical email bucket for dedup — IDENTICAL to `lower(email)` (with a trim guard). */
export function normalizeEmail(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export interface NormalizedLeadKeys {
  normalizedPhone?: string;
  normalizedEmail?: string;
}

/** Convenience: normalize whatever phone/email a lead payload carries. */
export function normalizeLeadKeys(input: {
  phone?: string | null;
  email?: string | null;
}): NormalizedLeadKeys {
  return {
    normalizedPhone: normalizePhone(input.phone),
    normalizedEmail: normalizeEmail(input.email),
  };
}

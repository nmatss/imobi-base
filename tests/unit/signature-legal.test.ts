/**
 * Behavioral tests for the signature-legal feature.
 *
 * Three legal-blocker capabilities are exercised against the REAL implementation
 * (no shims for the crypto / parsing under test):
 *
 *   1. HMAC-SHA256 tamper evidence — audit.ts signs each audit event and
 *      verifyAuditTrailIntegrity() recomputes the HMAC to detect any mutation of
 *      a persisted, signature-relevant field. We drive the genuine sign path
 *      (logEvent) and the genuine verify path (verifyAuditTrailIntegrity) through
 *      a stubbed `db`, so the HMAC math itself (node:crypto) is real.
 *
 *   2. parseCertificate() — real node:crypto X509Certificate parsing extracts the
 *      subject (holderName), issuer, serial and validity window from a freshly
 *      generated, currently-valid self-signed certificate.
 *
 *   3. certificate-storage persistence round-trip — storeCertificate() maps the
 *      DigitalCertificate into the leaner signature_certificates row and reads it
 *      back via getCertificate(), deriving status from the stored validity.
 *
 *   4. An expired certificate (static fixture) is rejected by both
 *      parseCertificate (expired=true) and validateParsedCertificate.
 *
 * The `db` and `storage` layers are stubbed; everything legal-load-bearing
 * (HMAC, X.509 parsing, validity comparison, row mapping) runs for real.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// A dedicated, stable signing secret so audit.ts uses the real explicit-key
// branch (NOT the insecure dev fallback) and the sign/verify keys match.
process.env.AUDIT_SIGNING_SECRET = "test-audit-signing-secret-stable-32bytes";

// ---------------------------------------------------------------------------
// In-memory `db` stub.
//
// audit.ts uses two shapes:
//   - db.insert(table).values(row)                       (logEvent persistence)
//   - db.select().from(table).where(cond).orderBy(col)   (verify / report reads)
//
// We capture inserted audit_logs rows and replay them on select, so the SAME
// HMAC the production code computed at sign time is the one re-verified.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const state = {
    auditRows: [] as Array<Record<string, any>>,
  };

  const makeSelectQuery = () => {
    const query: any = {
      // rest-param + any so tsc never complains about the call-site args.
      from: vi.fn((..._a: any[]) => query),
      where: vi.fn((..._a: any[]) => query),
      orderBy: vi.fn((..._a: any[]) => query),
      then: (
        resolve: (value: unknown[]) => unknown,
        reject: (reason?: unknown) => unknown,
      ) => Promise.resolve(state.auditRows).then(resolve, reject),
    };
    return query;
  };

  const db = {
    select: vi.fn((..._a: any[]) => makeSelectQuery()),
    insert: vi.fn((..._a: any[]) => ({
      values: vi.fn(async (row: Record<string, any>) => {
        // Mimic the DB assigning an id; preserve everything else verbatim.
        state.auditRows.push({ id: `row-${state.auditRows.length + 1}`, ...row });
        return undefined;
      }),
    })),
  };

  const schema = {
    auditLogs: { __name: "audit_logs" },
    contracts: { __name: "contracts" },
  };

  return { db, schema, state };
});

vi.mock("../../server/db", () => ({
  db: mocks.db,
  schema: mocks.schema,
  isSqlite: true,
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => ({ op: "and", conditions }),
  eq: (column: unknown, value: unknown) => ({ op: "eq", column, value }),
}));

// ---------------------------------------------------------------------------
// In-memory `storage` stub for the certificate persistence round-trip.
// Stores the row exactly as written and returns it (with an id) on read.
// ---------------------------------------------------------------------------
const certStore = vi.hoisted(() => {
  const rows = new Map<string, Record<string, any>>();
  return {
    rows,
    storeCertificate: vi.fn(async (data: Record<string, any>) => {
      const id = `cert-${rows.size + 1}`;
      const row = { id, createdAt: new Date(), ...data };
      rows.set(id, row);
      return row;
    }),
    getCertificate: vi.fn(async (id: string) => rows.get(id)),
    getUserCertificates: vi.fn(async (..._a: any[]) => Array.from(rows.values())),
  };
});

vi.mock("../../server/storage", () => ({
  storage: {
    storeCertificate: certStore.storeCertificate,
    getCertificate: certStore.getCertificate,
    getUserCertificates: certStore.getUserCertificates,
  },
}));

const { auditTrailService } = await import(
  "../../server/integrations/clicksign/audit"
);
const { certificateStorage } = await import(
  "../../server/integrations/clicksign/certificate-storage"
);

// A genuinely expired self-signed certificate (notAfter = 2020-03-01).
// Immutable fixture — an expired cert never stops being expired.
const EXPIRED_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDAjCCAeqgAwIBAgIGAKvN7xI0MA0GCSqGSIb3DQEBCwUAMEIxFzAVBgNVBAMM
Dk1hcmlhIEV4cGlyYWRhMRowGAYDVQQKDBFJbW9iaUJhc2UgVGVzdCBDQTELMAkG
A1UEBhMCQlIwHhcNMjAwMTAxMDAwMDAwWhcNMjAwMzAxMDAwMDAwWjBCMRcwFQYD
VQQDDA5NYXJpYSBFeHBpcmFkYTEaMBgGA1UECgwRSW1vYmlCYXNlIFRlc3QgQ0Ex
CzAJBgNVBAYTAkJSMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApTaM
7jyOlX1og3CYcpqDjhDXJMWq8p7fiKEaIfYUL/vrNnLL0PrNsZ2vV8jCaiPzzEHy
BZLB+m0N8PZ1vb1qynhSIxZb+XG72Tf/Tn7a0a5iAl1VfISUyVFa9U2zyjJLl0we
okvmWH8WbmRices7xDiGwbuCeqe6g9dgaXZGn0KKwA2PBSk4vwmFOgjoW+yX+VgB
aAWgCWb9wnPnO+gI/l7gP34pGoNCdV5lah2/ZGQuQMsEbptvjLOFt6YyBjRYr62G
yxqAas8QzDhoB6P3tQdIhESuMAq8iBGFA+WGsA+zmC0GrNgQNnJX/qEzIcc23yiX
0RGS0+MvsUKZYyZCdQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQBA009mm8SL0Wgj
+wc8ntVUf77HA7tbSztJfr4INVfNvOqVCs8reK4hI09KR+bc9ahg+N8h0P+bZYZP
KseT4VQSXG6cAMKIZPVYFqtvcv0tzEZCIvuwmBjVQX6o86DoJI1yQaC1IN7G4X3l
PrBeh8fFU8d3+JVwoquqPaA8hdymernUqlWE+A32UKDexyBAVgfr7cfXWjehHyn9
qBjy8VjkMrAgIxfqPMDOCuaWfb50ZY5q/f9YmJ3r5uq2/f1I9sYTZk6W5JlyGGBd
SXYLCBQ1HnW8xBQG4Y16UKix45+rwkZRCfFEVHSaSNylgROnu0OWsiMBJ8qxG0Lc
qvAiRGfz
-----END CERTIFICATE-----`;

// Generate a currently-valid self-signed certificate at runtime so the validity
// window straddles "now" without depending on a frozen clock.
function generateValidCertPem(subjectCN: string): string {
  const dir = mkdtempSync(join(tmpdir(), "sig-legal-"));
  try {
    execFileSync(
      "openssl",
      [
        "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-keyout", join(dir, "key.pem"),
        "-out", join(dir, "cert.pem"),
        "-days", "365",
        "-subj", `/CN=${subjectCN}/O=ImobiBase/C=BR`,
      ],
      { stdio: ["ignore", "ignore", "ignore"] },
    );
    // Read it back as PEM text.
    const pem = execFileSync("cat", [join(dir, "cert.pem")], { encoding: "utf8" });
    return pem;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let validCertPem: string;

beforeEach(() => {
  mocks.state.auditRows.length = 0;
  certStore.rows.clear();
  vi.clearAllMocks();
});

afterAll(() => {
  delete process.env.AUDIT_SIGNING_SECRET;
});

describe("signature-legal :: HMAC-SHA256 tamper evidence", () => {
  it("signs an audit event and verifies its integrity end-to-end (untampered = valid)", async () => {
    await auditTrailService.logDocumentSigned({
      tenantId: "tenant-a",
      documentId: "doc-1",
      signerId: "signer-1",
      signerName: "Joao Silva",
      signerEmail: "joao@example.com",
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
      certificateId: "cert-xyz",
    });

    // Exactly one signed row was persisted with a non-empty HMAC.
    expect(mocks.state.auditRows).toHaveLength(1);
    const sig = mocks.state.auditRows[0].metadata.digitalSignature as string;
    expect(sig).toMatch(/^[0-9a-f]{64}$/); // 32-byte SHA-256 hex

    const result = await auditTrailService.verifyAuditTrailIntegrity("doc-1");
    expect(result.valid).toBe(true);
    expect(result.checkedEvents).toBe(1);
    expect(result.tamperedEvents).toEqual([]);
    expect(result.unsignedEvents).toEqual([]);
  });

  it("detects tampering when a signed field is mutated after persistence", async () => {
    await auditTrailService.logDocumentSigned({
      tenantId: "tenant-a",
      documentId: "doc-2",
      signerId: "signer-9",
      signerName: "Original Name",
      signerEmail: "orig@example.com",
    });

    // Baseline: untampered trail verifies clean.
    const clean = await auditTrailService.verifyAuditTrailIntegrity("doc-2");
    expect(clean.valid).toBe(true);

    // Adulterate a signed field (the action) WITHOUT re-signing — exactly the
    // attack the HMAC exists to catch. The stored signature now no longer
    // matches the recomputed HMAC over the mutated row.
    mocks.state.auditRows[0].action = "TAMPERED";

    const tampered = await auditTrailService.verifyAuditTrailIntegrity("doc-2");
    expect(tampered.valid).toBe(false);
    expect(tampered.tamperedEvents).toContain(mocks.state.auditRows[0].id);
    expect(tampered.checkedEvents).toBe(1);
  });

  it("detects tampering when metadata inside the signed payload is altered", async () => {
    await auditTrailService.logDocumentSigned({
      tenantId: "tenant-a",
      documentId: "doc-3",
      signerId: "signer-7",
      signerName: "Carlos",
      signerEmail: "carlos@example.com",
    });

    // Flip a metadata value that participates in the canonical HMAC payload.
    mocks.state.auditRows[0].metadata.signerEmail = "attacker@evil.com";

    const result = await auditTrailService.verifyAuditTrailIntegrity("doc-3");
    expect(result.valid).toBe(false);
    expect(result.tamperedEvents).toHaveLength(1);
  });

  it("flags rows with no signature as unsigned (not verifiable), not tampered", async () => {
    // Simulate a legacy row persisted before HMAC signing existed.
    mocks.state.auditRows.push({
      id: "legacy-row",
      tenantId: "tenant-a",
      entityType: "document",
      entityId: "doc-4",
      action: "VIEW",
      metadata: { eventType: "document_viewed" }, // no digitalSignature
    });

    const result = await auditTrailService.verifyAuditTrailIntegrity("doc-4");
    expect(result.valid).toBe(false);
    expect(result.unsignedEvents).toEqual(["legacy-row"]);
    expect(result.tamperedEvents).toEqual([]);
  });
});

describe("signature-legal :: parseCertificate extracts real subject/validity", () => {
  it("extracts subject (holderName), issuer, serial and validity from a valid cert", () => {
    validCertPem = generateValidCertPem("Joao Silva");
    const parsed = certificateStorage.parseCertificate(validCertPem);

    expect(parsed.parseError).toBeUndefined();
    // node:crypto returns the DN with newline-separated RDNs.
    expect(parsed.holderName).toContain("CN=Joao Silva");
    expect(parsed.holderName).toContain("O=ImobiBase");
    expect(parsed.issuer).toContain("CN=Joao Silva"); // self-signed
    expect(parsed.serialNumber).toMatch(/^[0-9A-F]+$/);

    // Real validity window straddles "now".
    const now = new Date();
    expect(parsed.validFrom).toBeInstanceOf(Date);
    expect(parsed.validUntil).toBeInstanceOf(Date);
    expect((parsed.validFrom as Date).getTime()).toBeLessThanOrEqual(now.getTime());
    expect((parsed.validUntil as Date).getTime()).toBeGreaterThan(now.getTime());

    expect(parsed.expired).toBe(false);
    expect(parsed.status).toBe("active");
    expect(parsed.fingerprint).toMatch(/^[0-9A-F:]+$/);
  });

  it("returns a parseError (no throw) for non-certificate input", () => {
    const parsed = certificateStorage.parseCertificate("not a certificate");
    expect(parsed.parseError).toBeTruthy();
    expect(parsed.holderName).toBeUndefined();
  });

  it("validateParsedCertificate accepts a valid cert but warns on chain/CRL", () => {
    const pem = validCertPem ?? generateValidCertPem("Valida");
    const validation = certificateStorage.validateParsedCertificate(pem);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    // Stdlib parsing cannot prove ICP-Brasil chain/revocation — must warn.
    expect(validation.warnings.join(" ")).toMatch(/CRL\/OCSP|cadeia ICP-Brasil/i);
  });
});

describe("signature-legal :: expired certificate is rejected", () => {
  it("parseCertificate marks an expired cert as expired", () => {
    const parsed = certificateStorage.parseCertificate(EXPIRED_CERT_PEM);

    expect(parsed.parseError).toBeUndefined();
    expect(parsed.holderName).toContain("CN=Maria Expirada");
    expect((parsed.validUntil as Date).getTime()).toBeLessThan(Date.now());
    expect(parsed.expired).toBe(true);
    expect(parsed.status).toBe("expired");
  });

  it("validateParsedCertificate rejects an expired cert with an explicit error", () => {
    const validation = certificateStorage.validateParsedCertificate(EXPIRED_CERT_PEM);

    expect(validation.valid).toBe(false);
    expect(validation.errors.join(" ")).toContain("expirado");
  });
});

describe("signature-legal :: certificate-storage persistence round-trip", () => {
  it("persists a certificate and reads it back, deriving status from validity", async () => {
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const validFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stored = await certificateStorage.storeCertificate({
      tenantId: "tenant-a",
      userId: "user-1",
      certificateType: "ICP-Brasil",
      holderName: "CN=Joao Silva,O=ImobiBase,C=BR",
      issuer: "AC SOLUTI",
      serialNumber: "0C106ABD",
      validFrom,
      validUntil,
      status: "active",
      certificateData: validCertPem ?? generateValidCertPem("Joao Silva"),
    });

    // storeCertificate received the mapped row (subject<-holderName, validTo<-validUntil).
    expect(certStore.storeCertificate).toHaveBeenCalledTimes(1);
    const written = certStore.storeCertificate.mock.calls[0][0] as Record<string, any>;
    expect(written.subject).toBe("CN=Joao Silva,O=ImobiBase,C=BR");
    expect(written.serialNumber).toBe("0C106ABD");
    expect(written.tenantId).toBe("tenant-a");
    expect(written.certificatePem).toBeTruthy();

    // Read-back maps the lean row to the rich DigitalCertificate and derives status.
    const fetched = await certificateStorage.getCertificate(stored.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.holderName).toBe("CN=Joao Silva,O=ImobiBase,C=BR");
    expect(fetched!.issuer).toBe("AC SOLUTI");
    expect(fetched!.validUntil.getTime()).toBe(validUntil.getTime());
    expect(fetched!.status).toBe("active");
  });

  it("derives 'expired' status when the stored validTo is in the past", async () => {
    const stored = await certificateStorage.storeCertificate({
      tenantId: "tenant-a",
      userId: "user-1",
      certificateType: "ICP-Brasil",
      holderName: "CN=Maria Expirada",
      issuer: "AC SOLUTI",
      serialNumber: "ABCDEF1234",
      validFrom: new Date("2020-01-01T00:00:00Z"),
      validUntil: new Date("2020-03-01T00:00:00Z"),
      status: "active",
      certificateData: EXPIRED_CERT_PEM,
    });

    const fetched = await certificateStorage.getCertificate(stored.id);
    expect(fetched!.status).toBe("expired");
  });

  it("refuses to store a certificate without PEM data", async () => {
    await expect(
      certificateStorage.storeCertificate({
        tenantId: "tenant-a",
        userId: "user-1",
        certificateType: "ICP-Brasil",
        holderName: "No PEM",
        issuer: "AC SOLUTI",
        serialNumber: "00",
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 1000),
        status: "active",
        certificateData: undefined,
      }),
    ).rejects.toThrow(/PEM/i);
    expect(certStore.storeCertificate).not.toHaveBeenCalled();
  });
});

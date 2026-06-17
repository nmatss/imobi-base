import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCorsOrigins,
  getCorsProductionWarnings,
  isCorsOriginAllowed,
} from "../../server/config/cors";

describe("CORS configuration", () => {
  it("uses CORS_ORIGINS as canonical config and keeps ALLOWED_ORIGINS compatibility", () => {
    const origins = getCorsOrigins({
      CORS_ORIGINS: "https://imobibase.com.br, https://app.imobibase.com.br",
      ALLOWED_ORIGINS: "https://legacy.imobibase.com.br,https://app.imobibase.com.br",
    });

    expect(origins).toEqual([
      "https://imobibase.com.br",
      "https://app.imobibase.com.br",
      "https://legacy.imobibase.com.br",
    ]);
  });

  it("supports exact origins and wildcard subdomains", () => {
    const origins = [
      "https://imobibase.com.br",
      "https://*.imobibase.com.br",
    ];

    expect(isCorsOriginAllowed("https://imobibase.com.br", origins)).toBe(true);
    expect(isCorsOriginAllowed("https://app.imobibase.com.br", origins)).toBe(true);
    expect(isCorsOriginAllowed("https://deep.app.imobibase.com.br", origins)).toBe(false);
    expect(isCorsOriginAllowed("https://evil.com.br", origins)).toBe(false);
  });

  it("warns when production is using legacy or localhost origins", () => {
    expect(
      getCorsProductionWarnings({
        NODE_ENV: "production",
        CORS_ORIGINS: "",
        ALLOWED_ORIGINS: "http://localhost:5000,https://imobibase.com.br",
      }),
    ).toEqual([
      "ALLOWED_ORIGINS is deprecated; set CORS_ORIGINS with the same values.",
      "Localhost origins are allowed in production.",
    ]);
  });

  it("does not allow localhost or legacy .com origins by default in production", () => {
    const origins = getCorsOrigins({ NODE_ENV: "production" });

    expect(origins).toEqual([
      "https://imobibase.com.br",
      "https://www.imobibase.com.br",
      "https://*.imobibase.com.br",
    ]);
    expect(isCorsOriginAllowed("http://localhost:5000", origins)).toBe(false);
    expect(isCorsOriginAllowed("https://imobibase.com", origins)).toBe(false);
  });
});

describe("Vercel API handler error envelope", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not leak startup error details in production", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const tempDir = mkdtempSync(join(tmpdir(), "imobibase-api-handler-"));
    tempDirs.push(tempDir);
    const tempIndex = join(tempDir, "index.mjs");
    const tempRunner = join(tempDir, "runner.mjs");
    copyFileSync(resolve(process.cwd(), "api/index.mjs"), tempIndex);
    writeFileSync(
      tempRunner,
      `
        process.env.NODE_ENV = "production";
        const mod = await import("./index.mjs");
        let responseBody = "";
        const response = {
          statusCode: 200,
          setHeader() {},
          end(body) { responseBody = body; },
        };
        await mod.default({}, response);
        process.stdout.write(JSON.stringify({
          statusCode: response.statusCode,
          body: JSON.parse(responseBody),
        }));
      `,
    );

    let result: { statusCode: number; body: unknown };
    try {
      const stdout = execFileSync(process.execPath, [tempRunner], {
        cwd: tempDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      result = JSON.parse(stdout) as { statusCode: number; body: unknown };
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    expect(result.statusCode).toBe(500);
    expect(result.body).toEqual({
      message: "Service temporarily unavailable",
    });
  });
});

describe("Vercel API handler middleware parity", () => {
  it("registers cookie parsing and authorization preflight headers in serverless runtime", () => {
    const source = execFileSync("sed", ["-n", "1,120p", "server/api-handler.ts"], {
      encoding: "utf8",
    });

    expect(source).toContain('import cookieParser from "cookie-parser"');
    expect(source).toContain("app.use(cookieParser())");
    expect(source).toContain("Authorization, X-CSRF-Token");
  });
});

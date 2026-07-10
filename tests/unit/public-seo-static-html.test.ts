import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateStaticPublicHtml } from "../../script/generate-static-public-html";

let tempDir: string | undefined;

describe("static public HTML generation", () => {
  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("writes route-specific SEO heads without duplicate descriptions", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "imobibase-seo-"));
    await writeFile(
      join(tempDir, "index.html"),
      `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Base</title>
  <meta name="description" content="base" />
  <meta property="og:title" content="base" />
</head>
<body><div id="root"></div><script type="module" src="/assets/app.js"></script></body>
</html>`,
      "utf8",
    );

    const files = await generateStaticPublicHtml(tempDir);
    expect(files.length).toBeGreaterThan(5);

    const crmHtml = await import("node:fs/promises").then((fs) =>
      fs.readFile(join(tempDir!, "crm-imobiliario", "index.html"), "utf8"),
    );

    expect(crmHtml).toContain("<title>CRM imobiliário | Leads, funil, visitas e WhatsApp | ImobiBase</title>");
    expect(crmHtml).toContain('href="https://imobibase.com.br/crm-imobiliario"');
    expect(crmHtml.match(/<meta name="description"/g)).toHaveLength(1);
    expect(crmHtml).not.toContain("dashboard-mockup-1280.avif");

    const homeHtml = await import("node:fs/promises").then((fs) =>
      fs.readFile(join(tempDir!, "index.html"), "utf8"),
    );
    expect(homeHtml).toContain("dashboard-mockup-1280.avif");
  });
});

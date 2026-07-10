import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  validateEmails,
  generateTrackingParams,
  addTrackingToUrls,
  generateMessageId,
  formatEmailAddress,
  extractEmailAddress,
  sanitizeEmailContent,
  truncateText,
  htmlToPlainText,
  parseBounceNotification,
  EmailRateLimiter,
  validateTemplateVariables,
  formatCurrency,
  formatDate,
} from "../../server/email/utils";

/**
 * Testes comportamentais para os utilitários de email (server/email/utils.ts).
 *
 * Foco nas funções de validação, formatação, template e tracking que ainda
 * não eram cobertas (o fluxo de unsubscribe já é testado em
 * tests/unit/backend/email-unsubscribe-token.test.ts).
 *
 * Todas as funções aqui são puras / sem dependência de DB.
 */

describe("isValidEmail", () => {
  it("aceita endereços bem formados", () => {
    expect(isValidEmail("client@example.com")).toBe(true);
    expect(isValidEmail("a.b+tag@sub.domain.com.br")).toBe(true);
  });

  it("rejeita endereços sem @ ou sem domínio com ponto", () => {
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("user@nodot")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejeita endereços com espaços em branco", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail("user@exa mple.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("validateEmails", () => {
  it("particiona a lista em válidos e inválidos preservando a ordem", () => {
    const result = validateEmails([
      "good@example.com",
      "bad",
      "also.good@x.io",
      "@nope.com",
    ]);
    expect(result.valid).toEqual(["good@example.com", "also.good@x.io"]);
    expect(result.invalid).toEqual(["bad", "@nope.com"]);
  });

  it("retorna arrays vazios para entrada vazia", () => {
    expect(validateEmails([])).toEqual({ valid: [], invalid: [] });
  });
});

describe("generateTrackingParams", () => {
  it("monta uma query string utm a partir dos campos presentes", () => {
    const qs = generateTrackingParams({
      campaign: "promo",
      source: "newsletter",
      medium: "email",
      content: "cta-top",
    });
    const parsed = new URLSearchParams(qs);
    expect(parsed.get("utm_campaign")).toBe("promo");
    expect(parsed.get("utm_source")).toBe("newsletter");
    expect(parsed.get("utm_medium")).toBe("email");
    expect(parsed.get("utm_content")).toBe("cta-top");
  });

  it("ignora campos ausentes e retorna string vazia sem nenhum campo", () => {
    expect(generateTrackingParams({})).toBe("");
    const qs = generateTrackingParams({ campaign: "x" });
    expect(qs).toBe("utm_campaign=x");
  });

  it("faz url-encode de valores com caracteres especiais", () => {
    const qs = generateTrackingParams({ campaign: "verão & cia" });
    const parsed = new URLSearchParams(qs);
    expect(parsed.get("utm_campaign")).toBe("verão & cia");
    expect(qs).not.toContain(" & ");
  });
});

describe("addTrackingToUrls", () => {
  it("anexa params com '?' a urls sem query existente", () => {
    const html = '<a href="https://imobibase.com/imovel">Ver</a>';
    const out = addTrackingToUrls(html, { campaign: "promo" });
    expect(out).toContain('href="https://imobibase.com/imovel?utm_campaign=promo"');
  });

  it("anexa params com '&' a urls que já têm query string", () => {
    const html = '<a href="https://imobibase.com/imovel?id=1">Ver</a>';
    const out = addTrackingToUrls(html, { source: "news" });
    expect(out).toContain('href="https://imobibase.com/imovel?id=1&utm_source=news"');
  });

  it("retorna o html intacto quando não há params de tracking", () => {
    const html = '<a href="https://imobibase.com">x</a>';
    expect(addTrackingToUrls(html, {})).toBe(html);
  });

  it("preserva hrefs que não são urls absolutas válidas", () => {
    const html = '<a href="/relativo">x</a>';
    const out = addTrackingToUrls(html, { campaign: "promo" });
    expect(out).toBe(html);
  });

  it("processa múltiplos links na mesma string", () => {
    const html =
      '<a href="https://a.com">a</a><a href="https://b.com?q=1">b</a>';
    const out = addTrackingToUrls(html, { medium: "email" });
    expect(out).toContain("https://a.com?utm_medium=email");
    expect(out).toContain("https://b.com?q=1&utm_medium=email");
  });
});

describe("generateMessageId", () => {
  it("gera um id no formato RFC com domínio padrão", () => {
    const id = generateMessageId();
    expect(id).toMatch(/^<\d+\.[0-9a-f]{16}@imobibase\.com>$/);
  });

  it("usa o domínio fornecido", () => {
    const id = generateMessageId("mail.exemplo.com.br");
    expect(id.endsWith("@mail.exemplo.com.br>")).toBe(true);
  });

  it("gera ids distintos em chamadas consecutivas", () => {
    expect(generateMessageId()).not.toBe(generateMessageId());
  });
});

describe("formatEmailAddress / extractEmailAddress", () => {
  it("formata com nome entre aspas e ângulos quando há nome", () => {
    expect(formatEmailAddress("a@b.com", "Fulano")).toBe('"Fulano" <a@b.com>');
  });

  it("retorna apenas o email quando não há nome", () => {
    expect(formatEmailAddress("a@b.com")).toBe("a@b.com");
  });

  it("extrai o email de uma string formatada", () => {
    expect(extractEmailAddress('"Fulano" <a@b.com>')).toBe("a@b.com");
  });

  it("retorna a string original quando não há ângulos", () => {
    expect(extractEmailAddress("a@b.com")).toBe("a@b.com");
  });

  it("é o inverso de formatEmailAddress no caso com nome", () => {
    const formatted = formatEmailAddress("user@x.io", "Nome");
    expect(extractEmailAddress(formatted)).toBe("user@x.io");
  });
});

describe("sanitizeEmailContent", () => {
  it("remove tags <script> e seu conteúdo", () => {
    const html = '<p>oi</p><script>alert(1)</script><p>tchau</p>';
    const out = sanitizeEmailContent(html);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>oi</p>");
    expect(out).toContain("<p>tchau</p>");
  });

  it("remove handlers de evento inline", () => {
    const html = '<img src="x" onerror="alert(1)">';
    const out = sanitizeEmailContent(html);
    expect(out).not.toContain("onerror");
  });

  it("neutraliza hrefs com protocolo javascript:", () => {
    const html = '<a href="javascript:alert(1)">x</a>';
    const out = sanitizeEmailContent(html);
    expect(out).toContain('href="#"');
    expect(out).not.toContain("javascript:");
  });

  it("preserva conteúdo seguro", () => {
    const html = '<a href="https://ok.com">link</a><b>bold</b>';
    expect(sanitizeEmailContent(html)).toBe(html);
  });
});

describe("truncateText", () => {
  it("não altera textos dentro do limite", () => {
    expect(truncateText("curto", 10)).toBe("curto");
    expect(truncateText("exato", 5)).toBe("exato");
  });

  it("trunca e adiciona reticências respeitando o tamanho máximo", () => {
    const out = truncateText("texto muito longo aqui", 10);
    expect(out).toBe("texto m...");
    expect(out.length).toBe(10);
  });
});

describe("htmlToPlainText", () => {
  it("remove tags e normaliza espaços", () => {
    const html = "<p>Olá <b>mundo</b></p>";
    expect(htmlToPlainText(html)).toBe("Olá mundo");
  });

  it("converte <br> em quebra de linha", () => {
    expect(htmlToPlainText("linha1<br>linha2")).toContain("linha1");
    expect(htmlToPlainText("linha1<br>linha2")).toContain("linha2");
  });

  it("descarta o conteúdo de <style> e <script>", () => {
    const html = "<style>.x{color:red}</style><script>evil()</script><p>ok</p>";
    const out = htmlToPlainText(html);
    expect(out).toBe("ok");
    expect(out).not.toContain("color:red");
    expect(out).not.toContain("evil");
  });

  it("decodifica entidades html comuns", () => {
    expect(htmlToPlainText("a &amp; b &lt; c &gt; d &quot;e&quot;")).toBe(
      'a & b < c > d "e"',
    );
    expect(htmlToPlainText("Tom&#39;s")).toBe("Tom's");
  });

  it("retorna string vazia para html composto só por tags", () => {
    expect(htmlToPlainText("<div></div>")).toBe("");
  });
});

describe("parseBounceNotification", () => {
  it("mapeia campos diretos do payload", () => {
    const ts = new Date("2026-01-01T00:00:00Z");
    const result = parseBounceNotification({
      email: "bounce@x.com",
      bounceType: "soft",
      reason: "mailbox full",
      timestamp: ts.toISOString(),
    });
    expect(result).not.toBeNull();
    expect(result!.email).toBe("bounce@x.com");
    expect(result!.bounceType).toBe("soft");
    expect(result!.reason).toBe("mailbox full");
    expect(result!.timestamp.getTime()).toBe(ts.getTime());
  });

  it("usa campos alternativos (recipient, diagnosticCode) como fallback", () => {
    const result = parseBounceNotification({
      recipient: "alt@x.com",
      diagnosticCode: "550 no such user",
    });
    expect(result!.email).toBe("alt@x.com");
    expect(result!.reason).toBe("550 no such user");
  });

  it("assume bounce 'hard' e timestamp atual quando ausentes", () => {
    const before = Date.now();
    const result = parseBounceNotification({ email: "h@x.com" });
    expect(result!.bounceType).toBe("hard");
    expect(result!.timestamp.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("EmailRateLimiter", () => {
  it("permite envios até o limite e bloqueia o excedente", () => {
    const limiter = new EmailRateLimiter(3, 60000);
    expect(limiter.canSend("tenant-1")).toBe(true);
    expect(limiter.canSend("tenant-1")).toBe(true);
    expect(limiter.canSend("tenant-1")).toBe(true);
    expect(limiter.canSend("tenant-1")).toBe(false);
  });

  it("mantém buckets independentes por identificador", () => {
    const limiter = new EmailRateLimiter(1, 60000);
    expect(limiter.canSend("a")).toBe(true);
    expect(limiter.canSend("a")).toBe(false);
    expect(limiter.canSend("b")).toBe(true);
  });

  it("libera novamente após o reset da janela", () => {
    const limiter = new EmailRateLimiter(1, 60000);
    expect(limiter.canSend("x")).toBe(true);
    expect(limiter.canSend("x")).toBe(false);
    limiter.reset("x");
    expect(limiter.canSend("x")).toBe(true);
  });

  it("reabre o bucket quando a janela de tempo expira", () => {
    const limiter = new EmailRateLimiter(1, -1); // janela já expirada
    expect(limiter.canSend("x")).toBe(true);
    // resetTime já está no passado, então a próxima chamada cria novo bucket
    expect(limiter.canSend("x")).toBe(true);
  });

  it("getRemainingTime retorna 0 para identificador desconhecido e valor positivo após uso", () => {
    const limiter = new EmailRateLimiter(5, 60000);
    expect(limiter.getRemainingTime("nada")).toBe(0);
    limiter.canSend("y");
    expect(limiter.getRemainingTime("y")).toBeGreaterThan(0);
    expect(limiter.getRemainingTime("y")).toBeLessThanOrEqual(60000);
  });
});

describe("validateTemplateVariables", () => {
  it("considera válido quando todas as variáveis existem no data", () => {
    const result = validateTemplateVariables("Olá {{nome}}, plano {{plano}}", {
      nome: "Ana",
      plano: "Pro",
    });
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("lista variáveis ausentes", () => {
    const result = validateTemplateVariables("{{a}} {{b}} {{c}}", { a: 1 });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["b", "c"]);
  });

  it("considera presente uma chave com valor undefined (usa 'in')", () => {
    const result = validateTemplateVariables("{{x}}", { x: undefined });
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("é válido para templates sem placeholders", () => {
    expect(validateTemplateVariables("sem variáveis", {})).toEqual({
      valid: true,
      missing: [],
    });
  });
});

describe("formatCurrency", () => {
  it("formata valores em BRL por padrão", () => {
    const out = formatCurrency(1234.5);
    expect(out).toContain("R$");
    expect(out).toContain("1.234,5");
  });

  it("respeita a moeda informada", () => {
    const out = formatCurrency(10, "USD");
    expect(out).toContain("10");
    expect(out).toMatch(/US\$|\$/);
  });

  it("formata zero", () => {
    expect(formatCurrency(0)).toContain("0,00");
  });
});

describe("formatDate", () => {
  it("formato 'long' usa o mês por extenso em pt-BR", () => {
    const out = formatDate(new Date("2026-03-15T12:00:00Z"), "long");
    expect(out).toContain("2026");
    expect(out.toLowerCase()).toContain("março");
  });

  it("formato 'short' usa dd/mm/aaaa numérico", () => {
    const out = formatDate(new Date("2026-03-05T12:00:00Z"), "short");
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(out).toContain("2026");
  });

  it("aceita data em formato string", () => {
    const out = formatDate("2026-12-25T12:00:00Z", "short");
    expect(out).toContain("2026");
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

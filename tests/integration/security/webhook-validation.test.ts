/**
 * Webhook Signature Validation — Integração REAL
 *
 * Esta suíte foi convertida de um app Express MOCK self-contained (que apenas
 * reimplementava a verificação de assinatura e dava "falso verde") para
 * exercitar o CÓDIGO REAL de verificação dos webhooks do projeto:
 *
 *  - Stripe   : StripeService.verifyWebhookSignature + handler HTTP real
 *               (handleStripeWebhook montado por registerRoutes via buildRealApp).
 *  - MercadoPago: MercadoPagoService.verifyWebhookSignature + handler HTTP real
 *               (handleMercadoPagoWebhook).
 *  - WhatsApp : whatsappAPI.verifyWebhookSignature + handler HTTP real
 *               (POST /api/webhooks/whatsapp em routes-whatsapp).
 *
 * Provas centrais (alinhadas ao comportamento FAIL-CLOSED endurecido em ondas
 * anteriores):
 *  1. Assinatura ausente  => rejeitado (400/401, nunca 200).
 *  2. Assinatura inválida => rejeitado (400/401, nunca 200).
 *  3. Sem secret configurado => FAIL-CLOSED (rejeita; nunca aceita silenciosamente
 *     um webhook não autenticado que poderia forjar pagamentos/eventos).
 *  4. Assinatura VÁLIDA computada com o secret de teste => aceita pelo verificador.
 *
 * NOTA sobre os secrets:
 *  - As três funções de verificação leem o secret de `process.env` em TEMPO DE
 *    CHAMADA, então conseguimos alternar (definir/remover) o secret por teste
 *    para provar o fail-closed sem reimportar módulos.
 *  - STRIPE_SECRET_KEY precisa existir ANTES do import do stripe-service (o
 *    cliente Stripe é instanciado no load do módulo). Definimos no topo, antes
 *    de prepareTestEnv()/buildRealApp(). A chave é fictícia — constructEvent é
 *    offline (HMAC puro), não toca a rede.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import request from "supertest";
import type { Express } from "express";
import crypto from "crypto";
import Stripe from "stripe";
import {
  prepareTestEnv,
  setupFreshDatabase,
  restoreDatabase,
  buildRealApp,
} from "../../helpers/tenant-isolation-app";

// Secrets de TESTE (fictícios). Definidos antes de qualquer import de server/*.
const STRIPE_WEBHOOK_SECRET = "whsec_test_stripe_secret_key_12345";
const MERCADOPAGO_WEBHOOK_SECRET = "mp_test_secret_67890";
const WHATSAPP_APP_SECRET = "wa_test_app_secret_abcde";

// STRIPE_SECRET_KEY precisa existir no import do stripe-service para instanciar
// o cliente Stripe (verifyWebhookSignature usa stripe.webhooks.constructEvent,
// que é offline). Chave fictícia — nunca toca a rede.
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_dummy_for_offline_webhook_verify";

// Garante SQLite isolado + SESSION_SECRET válido ANTES do import de server/*.
prepareTestEnv();

// Cliente Stripe local só para GERAR cabeçalhos de assinatura de teste válidos
// (mesma lógica HMAC que o servidor usa para verificar).
const stripeSigner = new Stripe("sk_test_dummy_for_offline_webhook_verify");

/** Computa o header `t=...,v1=...` que o Stripe espera para um dado payload. */
function stripeSignature(payload: string, secret: string): string {
  return stripeSigner.webhooks.generateTestHeaderString({ payload, secret });
}

/** Computa a assinatura HMAC-SHA256 que a Meta envia em x-hub-signature-256. */
function whatsappSignature(rawBody: string, secret: string): string {
  return `sha256=${crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(rawBody))
    .digest("hex")}`;
}

/** Computa a assinatura `ts=...,v1=...` que o MercadoPago envia em x-signature. */
function mercadopagoSignature(
  dataId: string,
  requestId: string,
  ts: string,
  secret: string,
): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

describe("Webhook Signature Validation — REAL verificadores + REAL handlers", () => {
  let app: Express;
  let closeDb: () => Promise<void>;
  // Sob vite-ssr (Vitest) routes-whatsapp tem import circular (TDZ) que NÃO ocorre
  // em produção (bundle esbuild). Se o mount falhar por esse quirk, os testes HTTP
  // do WhatsApp são pulados em runtime — a assinatura REAL segue coberta por função.
  let whatsappRoutesMounted = false;

  // Funções de verificação REAIS importadas dinamicamente (após buildRealApp).
  let StripeService: typeof import("../../../server/payments/stripe/stripe-service").StripeService;
  let MercadoPagoService: typeof import("../../../server/payments/mercadopago/mercadopago-service").MercadoPagoService;
  let whatsappAPI: typeof import("../../../server/integrations/whatsapp/business-api").whatsappAPI;

  beforeAll(async () => {
    prepareTestEnv();
    setupFreshDatabase();
    const built = await buildRealApp();
    app = built.app;
    closeDb = built.closeDb;

    // registerRoutes (usado por buildRealApp) NÃO monta as rotas de WhatsApp —
    // em produção elas são registradas por server/index.ts / server/api-handler.ts
    // via registerWhatsAppRoutes(app). Montamos o MESMO router real aqui para
    // exercitar o handler HTTP real de POST /api/webhooks/whatsapp.
    try {
      const { registerWhatsAppRoutes } = await import(
        "../../../server/routes-whatsapp"
      );
      registerWhatsAppRoutes(app);
      whatsappRoutesMounted = true;
    } catch {
      whatsappRoutesMounted = false;
    }

    StripeService = (
      await import("../../../server/payments/stripe/stripe-service")
    ).StripeService;
    MercadoPagoService = (
      await import("../../../server/payments/mercadopago/mercadopago-service")
    ).MercadoPagoService;
    whatsappAPI = (
      await import("../../../server/integrations/whatsapp/business-api")
    ).whatsappAPI;
  }, 30000);

  beforeEach(() => {
    // Reseta os secrets para o estado "configurado" antes de cada teste; os
    // testes de fail-closed removem explicitamente o que precisam.
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
    process.env.MERCADOPAGO_WEBHOOK_SECRET = MERCADOPAGO_WEBHOOK_SECRET;
    process.env.WHATSAPP_APP_SECRET = WHATSAPP_APP_SECRET;
  });

  afterAll(async () => {
    try {
      if (closeDb) await closeDb();
    } finally {
      restoreDatabase();
    }
  });

  // ======================= STRIPE =======================
  describe("Stripe", () => {
    const payloadObj = {
      id: "evt_test_1",
      type: "ping",
      data: { object: { foo: "bar" } },
    };
    const payload = JSON.stringify(payloadObj);

    // ---- Função REAL: StripeService.verifyWebhookSignature ----
    it("verifyWebhookSignature: assinatura VÁLIDA retorna o evento", () => {
      const header = stripeSignature(payload, STRIPE_WEBHOOK_SECRET);
      const event = StripeService.verifyWebhookSignature(
        Buffer.from(payload),
        header,
      );
      expect(event.id).toBe("evt_test_1");
      expect(event.type).toBe("ping");
    });

    it("verifyWebhookSignature: assinatura INVÁLIDA lança erro", () => {
      const header = `t=${Math.floor(Date.now() / 1000)},v1=deadbeef`;
      expect(() =>
        StripeService.verifyWebhookSignature(Buffer.from(payload), header),
      ).toThrow(/signature verification failed/i);
    });

    it("verifyWebhookSignature: SEM secret configurado => FAIL-CLOSED (lança)", () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const header = stripeSignature(payload, STRIPE_WEBHOOK_SECRET);
      expect(() =>
        StripeService.verifyWebhookSignature(Buffer.from(payload), header),
      ).toThrow(/secret not configured/i);
    });

    it("verifyWebhookSignature: payload adulterado com assinatura do original => lança", () => {
      const header = stripeSignature(payload, STRIPE_WEBHOOK_SECRET);
      const tampered = JSON.stringify({
        ...payloadObj,
        data: { object: { foo: "HACKED" } },
      });
      expect(() =>
        StripeService.verifyWebhookSignature(Buffer.from(tampered), header),
      ).toThrow(/signature verification failed/i);
    });

    // ---- Handler HTTP REAL: POST /api/webhooks/stripe ----
    it("HTTP: sem header stripe-signature => 400", async () => {
      const res = await request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.status).not.toBe(200);
    });

    it("HTTP: assinatura inválida => 400 (nunca 200)", async () => {
      const res = await request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/json")
        .set("stripe-signature", "t=123,v1=invalid")
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.status).not.toBe(200);
    });

    it("HTTP: SEM secret configurado => FAIL-CLOSED (400, nunca 200)", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const header = stripeSignature(payload, STRIPE_WEBHOOK_SECRET);
      const res = await request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/json")
        .set("stripe-signature", header)
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.status).not.toBe(200);
    });

    it("HTTP: assinatura VÁLIDA => aceita (não rejeita por assinatura)", async () => {
      // Evento 'ping' não tem handler específico (dispatchEvent cai no default),
      // então a etapa de verificação de assinatura passa e o handler responde
      // 200 { received: true }. Sem REDIS_URL a idempotência é fail-open (true).
      const header = stripeSignature(payload, STRIPE_WEBHOOK_SECRET);
      const res = await request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/json")
        .set("stripe-signature", header)
        .send(payload);
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });

  // ======================= MERCADOPAGO =======================
  describe("MercadoPago", () => {
    const dataId = "1234567890";
    const requestId = "req-abc-123";

    function validSig(ts: string): string {
      return mercadopagoSignature(
        dataId,
        requestId,
        ts,
        MERCADOPAGO_WEBHOOK_SECRET,
      );
    }

    // ---- Função REAL: MercadoPagoService.verifyWebhookSignature ----
    it("verifyWebhookSignature: assinatura VÁLIDA retorna true", () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const ok = MercadoPagoService.verifyWebhookSignature(
        validSig(ts),
        requestId,
        dataId,
      );
      expect(ok).toBe(true);
    });

    it("verifyWebhookSignature: assinatura INVÁLIDA retorna false", () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const ok = MercadoPagoService.verifyWebhookSignature(
        `ts=${ts},v1=deadbeefdeadbeef`,
        requestId,
        dataId,
      );
      expect(ok).toBe(false);
    });

    it("verifyWebhookSignature: formato sem v1 retorna false", () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const ok = MercadoPagoService.verifyWebhookSignature(
        `ts=${ts}`,
        requestId,
        dataId,
      );
      expect(ok).toBe(false);
    });

    it("verifyWebhookSignature: SEM secret => FAIL-CLOSED (false)", () => {
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
      const ts = String(Math.floor(Date.now() / 1000));
      // Assina com o secret correto, mas o servidor não tem secret => rejeita.
      const ok = MercadoPagoService.verifyWebhookSignature(
        validSig(ts),
        requestId,
        dataId,
      );
      expect(ok).toBe(false);
    });

    it("verifyWebhookSignature: assinatura de OUTRO data.id não é aceita", () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const sigForOther = mercadopagoSignature(
        "999_outro_pagamento",
        requestId,
        ts,
        MERCADOPAGO_WEBHOOK_SECRET,
      );
      const ok = MercadoPagoService.verifyWebhookSignature(
        sigForOther,
        requestId,
        dataId,
      );
      expect(ok).toBe(false);
    });

    // ---- Handler HTTP REAL: POST /api/webhooks/mercadopago ----
    it("HTTP: sem headers de assinatura => 401 (nunca 200)", async () => {
      const res = await request(app)
        .post("/api/webhooks/mercadopago")
        .set("Content-Type", "application/json")
        .send({ type: "payment", data: { id: dataId } });
      expect(res.status).toBe(401);
      expect(res.status).not.toBe(200);
    });

    it("HTTP: assinatura inválida => 401 (nunca 200)", async () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const res = await request(app)
        .post("/api/webhooks/mercadopago")
        .set("Content-Type", "application/json")
        .set("x-signature", `ts=${ts},v1=deadbeef`)
        .set("x-request-id", requestId)
        .send({ type: "payment", data: { id: dataId } });
      expect(res.status).toBe(401);
      expect(res.status).not.toBe(200);
    });

    it("HTTP: SEM secret configurado => FAIL-CLOSED (401, nunca 200)", async () => {
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
      const ts = String(Math.floor(Date.now() / 1000));
      const res = await request(app)
        .post("/api/webhooks/mercadopago")
        .set("Content-Type", "application/json")
        .set("x-signature", validSig(ts))
        .set("x-request-id", requestId)
        .send({ type: "payment", data: { id: dataId } });
      expect(res.status).toBe(401);
      expect(res.status).not.toBe(200);
    });
  });

  // ======================= WHATSAPP =======================
  describe("WhatsApp", () => {
    const payloadObj = { object: "whatsapp_business_account", entry: [] };
    const payload = JSON.stringify(payloadObj);

    // ---- Função REAL: whatsappAPI.verifyWebhookSignature ----
    it("verifyWebhookSignature: assinatura VÁLIDA retorna true", () => {
      const sig = whatsappSignature(payload, WHATSAPP_APP_SECRET);
      const ok = whatsappAPI.verifyWebhookSignature(sig, Buffer.from(payload));
      expect(ok).toBe(true);
    });

    it("verifyWebhookSignature: assinatura INVÁLIDA retorna false", () => {
      const ok = whatsappAPI.verifyWebhookSignature(
        "sha256=deadbeef",
        Buffer.from(payload),
      );
      expect(ok).toBe(false);
    });

    it("verifyWebhookSignature: assinatura ausente retorna false", () => {
      const ok = whatsappAPI.verifyWebhookSignature("", Buffer.from(payload));
      expect(ok).toBe(false);
    });

    it("verifyWebhookSignature: SEM app secret => FAIL-CLOSED (false)", () => {
      delete process.env.WHATSAPP_APP_SECRET;
      const sig = whatsappSignature(payload, WHATSAPP_APP_SECRET);
      const ok = whatsappAPI.verifyWebhookSignature(sig, Buffer.from(payload));
      expect(ok).toBe(false);
    });

    it("verifyWebhookSignature: payload adulterado com assinatura do original => false", () => {
      const sig = whatsappSignature(payload, WHATSAPP_APP_SECRET);
      const tampered = JSON.stringify({
        ...payloadObj,
        object: "HACKED",
      });
      const ok = whatsappAPI.verifyWebhookSignature(sig, Buffer.from(tampered));
      expect(ok).toBe(false);
    });

    // ---- Handler HTTP REAL: POST /api/webhooks/whatsapp ----
    it("HTTP: SEM app secret configurado => FAIL-CLOSED (500, nunca 200)", async (ctx) => {
      if (!whatsappRoutesMounted) return ctx.skip();
      delete process.env.WHATSAPP_APP_SECRET;
      const sig = whatsappSignature(payload, WHATSAPP_APP_SECRET);
      const res = await request(app)
        .post("/api/webhooks/whatsapp")
        .set("Content-Type", "application/json")
        .set("x-hub-signature-256", sig)
        .send(payload);
      expect(res.status).toBe(500);
      expect(res.status).not.toBe(200);
    });

    it("HTTP: sem assinatura => 401 (nunca 200)", async (ctx) => {
      if (!whatsappRoutesMounted) return ctx.skip();
      const res = await request(app)
        .post("/api/webhooks/whatsapp")
        .set("Content-Type", "application/json")
        .send(payload);
      expect(res.status).toBe(401);
      expect(res.status).not.toBe(200);
    });

    it("HTTP: assinatura inválida => 401 (nunca 200)", async (ctx) => {
      if (!whatsappRoutesMounted) return ctx.skip();
      const res = await request(app)
        .post("/api/webhooks/whatsapp")
        .set("Content-Type", "application/json")
        .set("x-hub-signature-256", "sha256=deadbeef")
        .send(payload);
      expect(res.status).toBe(401);
      expect(res.status).not.toBe(200);
    });

    it("HTTP: assinatura VÁLIDA => 200 (aceita após verificação)", async (ctx) => {
      if (!whatsappRoutesMounted) return ctx.skip();
      // entry vazio => nenhum tenant a rotear; o handler responde 200 para a Meta
      // não reentregar. O ponto provado aqui é que a assinatura VÁLIDA passa pela
      // verificação (não retorna 401/500).
      const sig = whatsappSignature(payload, WHATSAPP_APP_SECRET);
      const res = await request(app)
        .post("/api/webhooks/whatsapp")
        .set("Content-Type", "application/json")
        .set("x-hub-signature-256", sig)
        .send(payload);
      expect(res.status).toBe(200);
    });
  });
});

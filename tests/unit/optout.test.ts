import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Testes comportamentais para o gerenciador de opt-out de SMS
 * (server/integrations/sms/optout.ts).
 *
 * CONTEXTO IMPORTANTE DO SOURCE
 * A tabela `smsOptOuts` ainda NÃO existe no schema; o módulo declara
 * `const smsOptOuts: any = null` como placeholder. Toda consulta que
 * referencia `smsOptOuts.<campo>` (ex.: `eq(smsOptOuts.phoneNumber, ...)`)
 * lança `TypeError` ao montar a cláusula, ANTES de qualquer IO. O design do
 * módulo trata isso com try/catch + valores fail-safe. Logo, hoje, todos os
 * métodos de persistência degradam graciosamente (não escrevem nada) e os
 * métodos de leitura retornam defaults seguros.
 *
 * Estes testes travam exatamente esse CONTRATO REAL e observável:
 *  - Detecção de keywords (lógica pura): STOP/START, case-insensitive,
 *    trim, PT-BR, precedência STOP>START, e null para texto comum.
 *  - Fail-safe de compliance: na dúvida, isOptedOut=false (não bloqueia),
 *    e filterOptedOutNumbers NÃO descarta destinatários por engano.
 *  - Short-circuit de lista vazia (sem tocar no db).
 *  - Mensagens estáticas de compliance e singleton.
 *
 * Mockamos `server/db` apenas para garantir que nenhum IO real ocorra;
 * o comportamento sob teste independe do retorno do mock porque o source
 * falha antes de usá-lo (placeholder null). Onde o comportamento é
 * verificável (short-circuit de lista vazia), asseguramos que o db não é
 * sequer chamado.
 */

const dbMock = {
  select: vi.fn(() => {
    throw new Error("db.select should not be reached in current placeholder state");
  }),
  insert: vi.fn(() => {
    throw new Error("db.insert should not be reached");
  }),
  update: vi.fn(() => {
    throw new Error("db.update should not be reached");
  }),
};

vi.mock("../../server/db", () => ({
  get db() {
    return dbMock;
  },
}));

import {
  SMSOptOutManager,
  getSMSOptOutManager,
} from "../../server/integrations/sms/optout";

let mgr: SMSOptOutManager;
beforeEach(() => {
  vi.clearAllMocks();
  mgr = new SMSOptOutManager();
});

describe("SMSOptOutManager - processIncomingMessage (detecção de keywords, lógica pura)", () => {
  it("detecta STOP (inglês) e retorna 'stop'", async () => {
    await expect(mgr.processIncomingMessage("+5511999990000", "STOP")).resolves.toBe(
      "stop",
    );
  });

  it("é case-insensitive: 'stop' minúsculo também é opt-out", async () => {
    await expect(mgr.processIncomingMessage("+5511999990000", "stop")).resolves.toBe(
      "stop",
    );
  });

  it("faz trim de espaços ao redor da mensagem", async () => {
    await expect(
      mgr.processIncomingMessage("+5511999990000", "   STOP   "),
    ).resolves.toBe("stop");
  });

  it("detecta STOP como substring de uma frase", async () => {
    await expect(
      mgr.processIncomingMessage("+5511999990000", "por favor STOP isso"),
    ).resolves.toBe("stop");
  });

  it("aceita keywords de opt-out em PT-BR (PARAR, CANCELAR, SAIR)", async () => {
    for (const word of ["PARAR", "cancelar", "Sair"]) {
      const r = await mgr.processIncomingMessage("+5511999990000", word);
      expect(r, `keyword ${word}`).toBe("stop");
    }
  });

  it("reconhece outras keywords de STOP (UNSUBSCRIBE, CANCEL, END, QUIT)", async () => {
    for (const word of ["UNSUBSCRIBE", "CANCEL", "END", "QUIT", "STOPALL"]) {
      const r = await mgr.processIncomingMessage("+5511999990000", word);
      expect(r, `keyword ${word}`).toBe("stop");
    }
  });

  it("detecta START e retorna 'start' (não 'stop')", async () => {
    await expect(mgr.processIncomingMessage("+5511999990000", "START")).resolves.toBe(
      "start",
    );
  });

  it("aceita keywords de opt-in em PT-BR (SIM, INICIAR, COMECAR)", async () => {
    for (const word of ["SIM", "iniciar", "Comecar"]) {
      const r = await mgr.processIncomingMessage("+5511999990000", word);
      expect(r, `keyword ${word}`).toBe("start");
    }
  });

  it("reconhece outras keywords de START (YES, SUBSCRIBE)", async () => {
    for (const word of ["YES", "SUBSCRIBE"]) {
      const r = await mgr.processIncomingMessage("+5511999990000", word);
      expect(r, `keyword ${word}`).toBe("start");
    }
  });

  it("colisão de substring: 'UNSTOP' contém 'STOP' e a checagem STOP vem primeiro, então classifica como 'stop'", async () => {
    // Comportamento real do source (.includes + STOP antes de START).
    // Documentado aqui para travar a regressão; é um efeito do uso de
    // includes() em vez de match exato.
    await expect(mgr.processIncomingMessage("+5511999990000", "UNSTOP")).resolves.toBe(
      "stop",
    );
  });

  it("retorna null para mensagem comum sem keyword", async () => {
    await expect(
      mgr.processIncomingMessage("+5511999990000", "ola tudo bem?"),
    ).resolves.toBeNull();
  });

  it("retorna null para string vazia", async () => {
    await expect(mgr.processIncomingMessage("+5511999990000", "")).resolves.toBeNull();
  });

  it("STOP tem precedência sobre START quando ambos aparecem na mensagem", async () => {
    await expect(
      mgr.processIncomingMessage("+5511999990000", "quero START mas tambem STOP"),
    ).resolves.toBe("stop");
  });
});

describe("SMSOptOutManager - contrato fail-safe (placeholder de schema, sem IO)", () => {
  it("isOptedOut retorna false na dúvida (fail-open para não bloquear envio)", async () => {
    // Fail-safe: o comentário do source diz 'don't block if check fails'.
    await expect(mgr.isOptedOut("+5511911112222")).resolves.toBe(false);
  });

  it("optOut retorna false quando a persistência não está disponível", async () => {
    const ok = await mgr.optOut({
      phoneNumber: "+5511900000001",
      reason: "user_request",
      optedOutAt: new Date(),
    });
    expect(ok).toBe(false);
  });

  it("optIn retorna false quando a persistência não está disponível", async () => {
    const ok = await mgr.optIn({ phoneNumber: "+5511900000002", source: "web" });
    expect(ok).toBe(false);
  });

  it("processIncomingMessage ainda classifica o keyword mesmo quando o opt-out não persiste", async () => {
    // O valor de retorno (classificação) é independente do sucesso da escrita.
    await expect(mgr.processIncomingMessage("+5511900000003", "STOP")).resolves.toBe(
      "stop",
    );
  });

  it("filterOptedOutNumbers NÃO descarta destinatários por engano em caso de falha (fail-safe)", async () => {
    const all = ["+5511900000001", "+5511900000002", "+5511900000003"];
    const result = await mgr.filterOptedOutNumbers(all);
    // Em falha, retorna a lista original (melhor enviar do que perder leads).
    expect(result).toEqual(all);
  });

  it("bulkOptOut retorna 0 quando nenhuma escrita tem sucesso", async () => {
    const count = await mgr.bulkOptOut(["+551190000001", "+551190000002"], "admin");
    expect(count).toBe(0);
  });

  it("bulkOptIn retorna 0 quando nenhuma escrita tem sucesso", async () => {
    const count = await mgr.bulkOptIn(["+551190000001", "+551190000002"]);
    expect(count).toBe(0);
  });

  it("getStats retorna zeros sem lançar", async () => {
    await expect(mgr.getStats()).resolves.toEqual({
      totalOptedOut: 0,
      totalOptedIn: 0,
      optOutsByReason: {},
    });
  });

  it("exportOptOutList retorna lista vazia sem lançar", async () => {
    await expect(mgr.exportOptOutList()).resolves.toEqual([]);
  });

  it("getHistory retorna lista vazia sem lançar", async () => {
    await expect(mgr.getHistory("+5511900000001")).resolves.toEqual([]);
  });
});

describe("SMSOptOutManager - filterOptedOutNumbers (short-circuit)", () => {
  it("retorna [] imediatamente para lista vazia, sem nunca tocar no db", async () => {
    const result = await mgr.filterOptedOutNumbers([]);
    expect(result).toEqual([]);
    expect(dbMock.select).not.toHaveBeenCalled();
  });
});

describe("SMSOptOutManager - mensagens estáticas de compliance", () => {
  it("confirmação de opt-out diz como voltar (responder START)", () => {
    const msg = mgr.getOptOutConfirmationMessage();
    expect(msg).toContain("START");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("confirmação de opt-in diz como cancelar (responder STOP)", () => {
    expect(mgr.getOptInConfirmationMessage()).toContain("STOP");
  });

  it("instruções de opt-out instruem responder STOP", () => {
    expect(mgr.getOptOutInstructions()).toContain("STOP");
  });
});

describe("SMSOptOutManager - singleton", () => {
  it("getSMSOptOutManager retorna sempre a mesma instância", () => {
    const a = getSMSOptOutManager();
    const b = getSMSOptOutManager();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(SMSOptOutManager);
  });
});

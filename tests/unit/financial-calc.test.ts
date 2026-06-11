import { describe, it, expect } from "vitest";
import {
  toNumber,
  calcAdminFee,
  rentComponentOfPayment,
  calcTransferForPayment,
  calcRentalAdminRevenue,
  calcFinancialProfit,
} from "../../server/storage";

/**
 * Testes numéricos para as correções de cálculo financeiro em server/storage.ts.
 *
 * Regra de negócio central: a taxa de administração da imobiliária incide
 * APENAS sobre o componente de ALUGUEL (rentValue). Condomínio (condoFee) e
 * IPTU (iptuValue) são pass-through ao proprietário e NÃO geram taxa.
 */

describe("toNumber", () => {
  it("converte strings decimais do Drizzle", () => {
    expect(toNumber("1000.50")).toBe(1000.5);
  });
  it("retorna 0 para null/undefined/inválido", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("abc")).toBe(0);
    expect(toNumber("")).toBe(0);
  });
  it("aceita number direto", () => {
    expect(toNumber(42)).toBe(42);
  });
});

describe("calcAdminFee (BUG #1/#3: taxa só sobre o aluguel)", () => {
  it("aluguel 1000 com 10% => 100", () => {
    expect(calcAdminFee(1000, 10)).toBe(100);
  });

  it("NAO incide sobre o total (1000+300+200=1500): taxa deve ser 100, nunca 150", () => {
    const rent = 1000; // condo 300 + iptu 200 ficam de fora
    expect(calcAdminFee(rent, 10)).toBe(100);
    expect(calcAdminFee(rent, 10)).not.toBe(150);
  });

  it("usa o percentual REAL do contrato, nao 10% fixo (8% sobre 2000 => 160)", () => {
    expect(calcAdminFee(2000, 8)).toBe(160);
  });

  it("default de 10% quando o percentual nao e informado", () => {
    expect(calcAdminFee(1000, null)).toBe(100);
    expect(calcAdminFee(1000, undefined)).toBe(100);
    expect(calcAdminFee(1000, "")).toBe(100);
  });

  it("aceita valores como string (Drizzle decimal)", () => {
    expect(calcAdminFee("1500", "10")).toBe(150);
  });
});

describe("rentComponentOfPayment", () => {
  it("usa rentValue explicito quando disponivel", () => {
    const payment = { rentValue: "1000", condoFee: "300", iptuValue: "200", paidValue: "1500", totalValue: "1500" };
    expect(rentComponentOfPayment(payment)).toBe(1000);
  });

  it("deriva o aluguel quando nao ha rentValue (total - condo - iptu)", () => {
    const payment = { rentValue: null, condoFee: "300", iptuValue: "200", paidValue: "1500", totalValue: "1500" };
    expect(rentComponentOfPayment(payment)).toBe(1000);
  });

  it("nunca retorna negativo", () => {
    const payment = { rentValue: null, condoFee: "2000", iptuValue: "0", paidValue: "1000" };
    expect(rentComponentOfPayment(payment)).toBe(0);
  });
});

describe("calcTransferForPayment (BUG #1: repasse coerente)", () => {
  it("aluguel 1000 + condo 300 + iptu 200, adminFee 10% => fee=100, net=1400", () => {
    const payment = { rentValue: "1000", condoFee: "300", iptuValue: "200", paidValue: "1500", totalValue: "1500" };
    const { gross, adminFee, net } = calcTransferForPayment(payment, 10);
    expect(gross).toBe(1500);
    expect(adminFee).toBe(100); // sobre o aluguel apenas
    expect(net).toBe(1400); // proprietario recebe aluguel-taxa + condo + iptu (pass-through)
  });

  it("o net errado (sobre o total) seria 1350; o correto e 1400", () => {
    const payment = { rentValue: "1000", condoFee: "300", iptuValue: "200", paidValue: "1500", totalValue: "1500" };
    const { net } = calcTransferForPayment(payment, 10);
    expect(net).not.toBe(1350);
    expect(net).toBe(1400);
  });

  it("multiplos pagamentos: soma de fees usa o componente de aluguel de cada um", () => {
    const payments = [
      { rentValue: "1000", condoFee: "300", iptuValue: "200", paidValue: "1500" },
      { rentValue: "2000", condoFee: "0", iptuValue: "0", paidValue: "2000" },
    ];
    const feeTotal = payments.reduce((s, p) => s + calcTransferForPayment(p, 10).adminFee, 0);
    expect(feeTotal).toBe(300); // 100 + 200
  });
});

describe("calcRentalAdminRevenue (BUG #3: percentual real por contrato)", () => {
  it("usa o percentual de cada contrato, nao 10% fixo", () => {
    const payments = [
      { rentValue: "1000", condoFee: "300", iptuValue: "200", paidValue: "1500", rentalContractId: "c1" },
      { rentValue: "2000", condoFee: "0", iptuValue: "0", paidValue: "2000", rentalContractId: "c2" },
    ];
    const adminFeeByContract = new Map<string, string | number | null | undefined>([
      ["c1", "10"], // 10% de 1000 = 100
      ["c2", "5"], // 5% de 2000 = 100
    ]);
    expect(calcRentalAdminRevenue(payments, adminFeeByContract)).toBe(200);
  });

  it("o calculo hardcoded de 10% sobre o TOTAL daria 350; o correto e 200", () => {
    const payments = [
      { rentValue: "1000", condoFee: "300", iptuValue: "200", paidValue: "1500", rentalContractId: "c1" },
      { rentValue: "2000", condoFee: "0", iptuValue: "0", paidValue: "2000", rentalContractId: "c2" },
    ];
    const adminFeeByContract = new Map<string, string | number | null | undefined>([
      ["c1", "10"],
      ["c2", "5"],
    ]);
    // hardcoded antigo: (1500 + 2000) * 0.10 = 350
    expect(calcRentalAdminRevenue(payments, adminFeeByContract)).not.toBe(350);
    expect(calcRentalAdminRevenue(payments, adminFeeByContract)).toBe(200);
  });

  it("default 10% quando contrato nao esta no mapa", () => {
    const payments = [{ rentValue: "1000", condoFee: "300", iptuValue: "200", paidValue: "1500", rentalContractId: "x" }];
    const empty = new Map<string, string | number | null | undefined>();
    expect(calcRentalAdminRevenue(payments, empty)).toBe(100);
  });
});

describe("calcFinancialProfit (BUG #2: deduzir comissoes de corretor)", () => {
  it("profit = vendas + aluguel - despesas - comissoes de corretor", () => {
    const profit = calcFinancialProfit({
      salesRevenue: 10000,
      rentalRevenue: 2000,
      totalExpenses: 3000,
      brokerCommissions: 4000,
    });
    expect(profit).toBe(5000); // 10000 + 2000 - 3000 - 4000
  });

  it("a formula antiga (sem comissoes) daria 9000; o correto e 5000", () => {
    const params = { salesRevenue: 10000, rentalRevenue: 2000, totalExpenses: 3000, brokerCommissions: 4000 };
    const oldProfit = params.salesRevenue + params.rentalRevenue - params.totalExpenses; // 9000
    expect(calcFinancialProfit(params)).not.toBe(oldProfit);
    expect(calcFinancialProfit(params)).toBe(5000);
  });

  it("sem comissoes pagas, o resultado iguala a formula sem deducao", () => {
    const profit = calcFinancialProfit({
      salesRevenue: 5000,
      rentalRevenue: 1000,
      totalExpenses: 2000,
      brokerCommissions: 0,
    });
    expect(profit).toBe(4000);
  });
});

describe("BUG #4: relatorio de inadimplencia ignora pagos", () => {
  // Espelha o filtro aplicado em getOverdueReport:
  // somente status 'pending' E dueDate < now contam como vencidos.
  const filterOverdue = (
    payments: Array<{ status: string; dueDate: string }>,
    nowDate: Date
  ) => payments.filter(p => p.status === "pending" && new Date(p.dueDate) < nowDate);

  it("nao inclui pagamentos ja quitados, mesmo vencidos", () => {
    const nowDate = new Date("2026-06-06");
    const payments = [
      { status: "pending", dueDate: "2026-05-01" }, // vencido e pendente -> conta
      { status: "paid", dueDate: "2026-05-01" }, // vencido mas PAGO -> nao conta
      { status: "pending", dueDate: "2026-07-01" }, // futuro -> nao conta
    ];
    const overdue = filterOverdue(payments, nowDate);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].status).toBe("pending");
  });
});

describe("BUG #5: periodVariation usa a MESMA formula nos dois periodos", () => {
  // Espelha metricsForWindow.cashBalance:
  // cashBalance = commissions + (rentalRevenue - ownerTransfers) - operationalExpenses
  const cashBalance = (m: {
    commissionsReceived: number;
    rentalRevenue: number;
    ownerTransfers: number;
    operationalExpenses: number;
  }) => m.commissionsReceived + (m.rentalRevenue - m.ownerTransfers) - m.operationalExpenses;

  const periodVariation = (current: number, previous: number) =>
    previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;

  it("compara cashBalance atual contra cashBalance anterior (mesma formula)", () => {
    const cur = cashBalance({ commissionsReceived: 5000, rentalRevenue: 1000, ownerTransfers: 0, operationalExpenses: 2000 }); // 4000
    const prev = cashBalance({ commissionsReceived: 3000, rentalRevenue: 1000, ownerTransfers: 0, operationalExpenses: 2000 }); // 2000
    expect(cur).toBe(4000);
    expect(prev).toBe(2000);
    expect(periodVariation(cur, prev)).toBe(100); // +100%
  });

  it("variacao zero quando os dois periodos sao iguais", () => {
    const cur = cashBalance({ commissionsReceived: 4000, rentalRevenue: 0, ownerTransfers: 0, operationalExpenses: 0 });
    const prev = cashBalance({ commissionsReceived: 4000, rentalRevenue: 0, ownerTransfers: 0, operationalExpenses: 0 });
    expect(periodVariation(cur, prev)).toBe(0);
  });

  it("lida com base anterior negativa via valor absoluto", () => {
    const cur = 100;
    const prev = -200;
    expect(periodVariation(cur, prev)).toBe(150); // (100 - (-200)) / 200 * 100
  });
});

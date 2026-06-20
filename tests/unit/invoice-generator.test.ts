import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes comportamentais para server/payments/invoice-generator.ts.
 *
 * Foco: geração de fatura — cálculo de valores, datas de vencimento e
 * formatação. O módulo importa `../storage` (que abre conexão de DB) e
 * `@sentry/node`; ambos são mockados para isolar a lógica pura de geração.
 */

// Mock do storage para não tocar no banco. createInvoiceFromSubscription
// consulta tenant + settings; controlamos as respostas por teste.
const getTenantById = vi.fn();
const getTenantSettings = vi.fn();

vi.mock('../../server/storage', () => ({
  storage: {
    getTenantById: (...args: unknown[]) => getTenantById(...args),
    getTenantSettings: (...args: unknown[]) => getTenantSettings(...args),
  },
}));

// Sentry não deve interferir nos asserts de erro.
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

import { InvoiceGenerator, type InvoiceData } from '../../server/payments/invoice-generator';

function baseInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
  return {
    invoiceNumber: 'INV-TEST-202606-000001',
    invoiceDate: new Date('2026-06-20T10:00:00Z'),
    tenantId: 'tenant-abcd-1234',
    tenantName: 'Imobiliária Exemplo',
    tenantEmail: 'billing@exemplo.com',
    items: [
      { description: 'Plano Pro - Monthly Subscription', quantity: 1, unitPrice: 199.9, total: 199.9 },
    ],
    subtotal: 199.9,
    total: 199.9,
    currency: 'BRL',
    paymentStatus: 'paid',
    ...overrides,
  };
}

function pdfHeader(buf: Buffer): string {
  return buf.subarray(0, 5).toString('latin1');
}

beforeEach(() => {
  getTenantById.mockReset();
  getTenantSettings.mockReset();
});

describe('InvoiceGenerator.generatePDF', () => {
  it('retorna um Buffer com cabeçalho %PDF válido', () => {
    const buf = InvoiceGenerator.generatePDF(baseInvoice());
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    expect(pdfHeader(buf)).toBe('%PDF-');
  });

  it('gera PDF mesmo sem campos opcionais (dueDate, tax, discount, cnpj, notes)', () => {
    const buf = InvoiceGenerator.generatePDF(
      baseInvoice({
        dueDate: undefined,
        tax: undefined,
        discount: undefined,
        tenantCnpj: undefined,
        notes: undefined,
        paymentMethod: undefined,
      }),
    );
    expect(pdfHeader(buf)).toBe('%PDF-');
  });

  it('gera PDF com todos os campos opcionais preenchidos', () => {
    const buf = InvoiceGenerator.generatePDF(
      baseInvoice({
        dueDate: new Date('2026-07-20T10:00:00Z'),
        tenantAddress: 'Rua X, 100 - São Paulo/SP',
        tenantCnpj: '12.345.678/0001-90',
        tax: 20,
        discount: 10,
        notes: 'Observação longa que deve ser quebrada em múltiplas linhas pelo splitTextToSize do jsPDF para caber na largura da página do documento.',
        paymentMethod: 'Cartão de crédito',
        currency: 'USD',
        subtotal: 200,
        total: 210,
      }),
    );
    expect(pdfHeader(buf)).toBe('%PDF-');
  });

  it.each(['paid', 'pending', 'overdue'] as const)(
    'gera PDF para o status de pagamento "%s"',
    (paymentStatus) => {
      const buf = InvoiceGenerator.generatePDF(baseInvoice({ paymentStatus }));
      expect(pdfHeader(buf)).toBe('%PDF-');
    },
  );

  it('lança erro tipado quando o invoiceDate é inválido (data sem toLocaleDateString utilizável)', () => {
    // invoiceDate undefined força acesso a .toLocaleDateString em undefined,
    // que é capturado e re-lançado como "Failed to generate PDF: ...".
    const broken = baseInvoice();
    // @ts-expect-error forçando entrada inválida para exercitar o catch
    broken.invoiceDate = undefined;
    expect(() => InvoiceGenerator.generatePDF(broken)).toThrowError(/Failed to generate PDF/);
  });

  it('suporta múltiplos itens na fatura sem quebrar', () => {
    const buf = InvoiceGenerator.generatePDF(
      baseInvoice({
        items: [
          { description: 'Plano Pro', quantity: 1, unitPrice: 199.9, total: 199.9 },
          { description: 'Usuário adicional', quantity: 3, unitPrice: 29.9, total: 89.7 },
          { description: 'Suporte premium', quantity: 1, unitPrice: 49, total: 49 },
        ],
        subtotal: 338.6,
        total: 338.6,
      }),
    );
    expect(pdfHeader(buf)).toBe('%PDF-');
  });
});

describe('InvoiceGenerator.generateInvoiceNumber', () => {
  it('segue o formato INV-<PREFIX>-<YYYYMM>-<6 dígitos>', () => {
    const date = new Date('2026-06-20T10:00:00Z');
    const num = InvoiceGenerator.generateInvoiceNumber('abcd1234efgh', date);
    expect(num).toMatch(/^INV-[A-Z0-9]{4}-\d{6}-\d{6}$/);
  });

  it('usa os 4 primeiros caracteres do tenantId em maiúsculas como prefixo', () => {
    const num = InvoiceGenerator.generateInvoiceNumber('abcd1234', new Date('2026-06-20'));
    expect(num.split('-')[1]).toBe('ABCD');
  });

  it('codifica ano e mês com mês 1-based e zero-padding', () => {
    // Janeiro de 2026 => "202601" (mês 0-based + 1, padded a 2 dígitos).
    const num = InvoiceGenerator.generateInvoiceNumber('xyzw', new Date(2026, 0, 15));
    expect(num.split('-')[2]).toBe('202601');

    const numDec = InvoiceGenerator.generateInvoiceNumber('xyzw', new Date(2026, 11, 15));
    expect(numDec.split('-')[2]).toBe('202612');
  });

  it('gera números distintos em chamadas separadas (timestamp embutido)', () => {
    const date = new Date('2026-06-20');
    const a = InvoiceGenerator.generateInvoiceNumber('tenant1', date);
    // Avança o relógio para garantir timestamp diferente nos últimos 6 dígitos.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 5000));
    const b = InvoiceGenerator.generateInvoiceNumber('tenant1', date);
    vi.useRealTimers();
    expect(a).not.toBe(b);
  });
});

describe('InvoiceGenerator.createInvoiceFromSubscription', () => {
  it('gera o PDF e define dueDate exatamente um mês após a invoiceDate', async () => {
    getTenantById.mockResolvedValue({
      name: 'Imob Teste',
      email: 'a@b.com',
      address: 'Rua 1',
    });
    getTenantSettings.mockResolvedValue({ cnpj: '11.111.111/0001-11' });

    // Espiona generatePDF para inspecionar os dados calculados sem precisar
    // parsear o PDF binário.
    const spy = vi.spyOn(InvoiceGenerator, 'generatePDF');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T12:00:00Z'));

    const buf = await InvoiceGenerator.createInvoiceFromSubscription(
      'tenant-xyz',
      'Plano Pro',
      199.9,
      'BRL',
      'paid',
    );

    vi.useRealTimers();

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);

    const data = spy.mock.calls[0][0];
    const invoiceMonth = data.invoiceDate.getMonth();
    const dueMonth = data.dueDate!.getMonth();
    // Junho (5) -> Julho (6): exatamente +1 mês.
    expect((dueMonth - invoiceMonth + 12) % 12).toBe(1);

    spy.mockRestore();
  });

  it('mapeia amount para item único, subtotal e total iguais', async () => {
    getTenantById.mockResolvedValue({ name: 'Imob', email: 'x@y.com', address: null });
    getTenantSettings.mockResolvedValue(null);

    const spy = vi.spyOn(InvoiceGenerator, 'generatePDF');

    await InvoiceGenerator.createInvoiceFromSubscription('t-1', 'Plano Start', 99.5, 'BRL');

    const data = spy.mock.calls[0][0];
    expect(data.subtotal).toBe(99.5);
    expect(data.total).toBe(99.5);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({
      quantity: 1,
      unitPrice: 99.5,
      total: 99.5,
      description: 'Plano Start - Monthly Subscription',
    });
    expect(data.currency).toBe('BRL');
    // paymentStatus default é 'paid'.
    expect(data.paymentStatus).toBe('paid');

    spy.mockRestore();
  });

  it('propaga o paymentStatus informado (ex: pending)', async () => {
    getTenantById.mockResolvedValue({ name: 'Imob', email: 'x@y.com', address: null });
    getTenantSettings.mockResolvedValue(null);

    const spy = vi.spyOn(InvoiceGenerator, 'generatePDF');

    await InvoiceGenerator.createInvoiceFromSubscription('t-2', 'Plano Pro', 199.9, 'BRL', 'pending');

    expect(spy.mock.calls[0][0].paymentStatus).toBe('pending');
    spy.mockRestore();
  });

  it('lança "Tenant not found" quando o tenant não existe', async () => {
    getTenantById.mockResolvedValue(null);

    await expect(
      InvoiceGenerator.createInvoiceFromSubscription('inexistente', 'Plano Pro', 199.9, 'BRL'),
    ).rejects.toThrow('Tenant not found');
  });

  it('usa string vazia quando o tenant não tem email e omite cnpj quando settings é null', async () => {
    getTenantById.mockResolvedValue({ name: 'Sem Email', email: null, address: null });
    getTenantSettings.mockResolvedValue(null);

    const spy = vi.spyOn(InvoiceGenerator, 'generatePDF');

    await InvoiceGenerator.createInvoiceFromSubscription('t-3', 'Plano Pro', 50, 'BRL');

    const data = spy.mock.calls[0][0];
    expect(data.tenantEmail).toBe('');
    expect(data.tenantCnpj).toBeUndefined();
    expect(data.invoiceNumber).toMatch(/^INV-/);

    spy.mockRestore();
  });
});

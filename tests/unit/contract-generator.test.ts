import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Behavioral tests for the ClickSign contract generator.
 *
 * Two concerns are covered:
 *  1. PDF generation (generateRentalContract / generateSaleContract) — these are
 *     effectively pure: they take structured contract data and return a PDF
 *     Buffer with no DB/network. We assert on the produced PDF shape and on the
 *     fact that generation tolerates optional fields.
 *  2. Signature orchestration (send*ForSignature) — these assemble signer
 *     payloads (roles, ordering, deadlines, filenames) and delegate to the
 *     ClickSign DocumentService/SignerService. Those collaborators are mocked so
 *     we can assert the exact field assembly and tenant/contract wiring.
 */

// Mock the ClickSign collaborators so no real API calls happen. The
// ContractGenerator instantiates these eagerly as class fields, so the mocks
// must be in place before the module is imported.
const {
  uploadDocument,
  createSignatureList,
  addRentalContractSigners,
  addSaleContractSigners,
  sendInvitations,
} = vi.hoisted(() => ({
  uploadDocument: vi.fn(),
  createSignatureList: vi.fn(),
  addRentalContractSigners: vi.fn(),
  addSaleContractSigners: vi.fn(),
  sendInvitations: vi.fn(),
}));

vi.mock('../../server/integrations/clicksign/document-service', () => ({
  DocumentService: class {
    uploadDocument = uploadDocument;
    createSignatureList = createSignatureList;
  },
}));

vi.mock('../../server/integrations/clicksign/signer-service', () => ({
  SignerService: class {
    addRentalContractSigners = addRentalContractSigners;
    addSaleContractSigners = addSaleContractSigners;
    sendInvitations = sendInvitations;
  },
}));

import {
  ContractGenerator,
  contractGenerator,
  type RentalContractData,
  type SaleContractData,
} from '../../server/integrations/clicksign/contract-generator';

function makeRentalData(overrides: Partial<RentalContractData> = {}): RentalContractData {
  return {
    landlord: {
      name: 'Maria Locadora',
      cpf: '111.111.111-11',
      address: 'Rua A, 100',
      email: 'maria@example.com',
      phone: '+5511999990000',
    },
    tenant: {
      name: 'João Locatário',
      cpf: '222.222.222-22',
      address: 'Rua B, 200',
      email: 'joao@example.com',
    },
    property: {
      address: 'Av. Central, 500',
      type: 'residential',
    },
    financial: {
      rentalValue: 2500,
      dueDay: 5,
      iptuIncluded: true,
      condoIncluded: false,
    },
    contract: {
      duration: 12,
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-12-31T00:00:00Z'),
      renewalType: 'automatic',
    },
    ...overrides,
  };
}

function makeSaleData(overrides: Partial<SaleContractData> = {}): SaleContractData {
  return {
    seller: {
      name: 'Carlos Vendedor',
      cpf: '333.333.333-33',
      address: 'Rua C, 300',
      email: 'carlos@example.com',
    },
    buyer: {
      name: 'Ana Compradora',
      cpf: '444.444.444-44',
      address: 'Rua D, 400',
      email: 'ana@example.com',
    },
    property: {
      address: 'Praça X, 1',
      description: 'Apartamento com 2 quartos',
      area: 75,
    },
    financial: {
      salePrice: 500000,
      paymentMethod: 'financiamento bancário',
    },
    ...overrides,
  };
}

function isPdfBuffer(buf: Buffer): boolean {
  // PDF files always begin with the "%PDF-" magic header.
  return Buffer.isBuffer(buf) && buf.subarray(0, 5).toString('latin1') === '%PDF-';
}

describe('ContractGenerator — PDF generation', () => {
  const generator = new ContractGenerator();

  it('produces a non-empty PDF buffer for a rental contract', async () => {
    const buffer = await generator.generateRentalContract(makeRentalData());

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(isPdfBuffer(buffer)).toBe(true);
  });

  it('produces a non-empty PDF buffer for a sale contract', async () => {
    const buffer = await generator.generateSaleContract(makeSaleData());

    expect(isPdfBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('handles optional rental fields (no deposit, no witnesses, commercial type)', async () => {
    const data = makeRentalData({
      property: { address: 'Loja 1', type: 'commercial' },
      financial: { rentalValue: 9000, dueDay: 10, iptuIncluded: false, condoIncluded: true },
      witnesses: undefined,
    });

    const buffer = await generator.generateRentalContract(data);
    expect(isPdfBuffer(buffer)).toBe(true);
  });

  it('handles a rental contract with a deposit and multiple witnesses', async () => {
    const data = makeRentalData({
      financial: { rentalValue: 2500, dueDay: 5, deposit: 5000, iptuIncluded: true, condoIncluded: true },
      witnesses: [
        { name: 'Test 1', cpf: '555.555.555-55', email: 't1@example.com' },
        { name: 'Test 2', cpf: '666.666.666-66', email: 't2@example.com' },
      ],
    });

    const buffer = await generator.generateRentalContract(data);
    expect(isPdfBuffer(buffer)).toBe(true);
  });

  it('handles a sale contract with downpayment, installments, registration and realtor', async () => {
    const data = makeSaleData({
      property: {
        address: 'Praça X, 1',
        description: 'Casa térrea ampla com quintal e área gourmet integrada à sala de estar',
        area: 200,
        registrationNumber: 'M-12345',
      },
      financial: {
        salePrice: 600000,
        paymentMethod: 'parcelado',
        downPayment: 120000,
        installments: 48,
      },
      realtor: { name: 'Corretor Silva', creci: 'SP-99999', email: 'corretor@example.com' },
    });

    const buffer = await generator.generateSaleContract(data);
    expect(isPdfBuffer(buffer)).toBe(true);
  });

  it('exports a ready-to-use singleton instance', async () => {
    expect(contractGenerator).toBeInstanceOf(ContractGenerator);
    const buffer = await contractGenerator.generateRentalContract(makeRentalData());
    expect(isPdfBuffer(buffer)).toBe(true);
  });
});

describe('ContractGenerator — rental signature orchestration', () => {
  const generator = new ContractGenerator();

  beforeEach(() => {
    uploadDocument.mockResolvedValue({ key: 'doc-key-1' });
    createSignatureList.mockResolvedValue({ key: 'list-key-1' });
    addRentalContractSigners.mockResolvedValue([{ key: 'signer-1' }, { key: 'signer-2' }]);
    sendInvitations.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uploads the generated PDF with tenant/contract-scoped path and filename', async () => {
    await generator.sendRentalContractForSignature(makeRentalData(), 'CT-2026-001');

    expect(uploadDocument).toHaveBeenCalledTimes(1);
    const uploadArg = uploadDocument.mock.calls[0][0];

    expect(uploadArg.path).toBe('/contracts/rental/CT-2026-001.pdf');
    expect(uploadArg.filename).toBe('Contrato_Locacao_CT-2026-001.pdf');
    expect(uploadArg.locale).toBe('pt-BR');
    expect(uploadArg.sequence_enabled).toBe(true);
    expect(uploadArg.auto_close).toBe(true);

    // Uploaded content must be the base64 of a real PDF buffer.
    const decoded = Buffer.from(uploadArg.content_base64, 'base64');
    expect(isPdfBuffer(decoded)).toBe(true);
  });

  it('sets a deadline roughly 30 days in the future', async () => {
    const before = Date.now();
    await generator.sendRentalContractForSignature(makeRentalData(), 'CT-2');
    const after = Date.now();

    const deadline = new Date(uploadDocument.mock.calls[0][0].deadline_at).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    expect(deadline).toBeGreaterThanOrEqual(before + thirtyDays - 5000);
    expect(deadline).toBeLessThanOrEqual(after + thirtyDays + 5000);
  });

  it('assembles landlord and tenant signers with correct roles and sequential order', async () => {
    await generator.sendRentalContractForSignature(makeRentalData(), 'CT-3');

    expect(addRentalContractSigners).toHaveBeenCalledTimes(1);
    const [docKey, listKey, landlordSigner, tenantSigner, witnesses, config] =
      addRentalContractSigners.mock.calls[0];

    expect(docKey).toBe('doc-key-1');
    expect(listKey).toBe('list-key-1');

    expect(landlordSigner).toMatchObject({
      name: 'Maria Locadora',
      email: 'maria@example.com',
      cpf: '111.111.111-11',
      role: 'Locador',
    });
    expect(tenantSigner).toMatchObject({
      name: 'João Locatário',
      email: 'joao@example.com',
      role: 'Locatário',
    });

    // No witnesses provided -> undefined is forwarded.
    expect(witnesses).toBeUndefined();

    expect(config.order).toBe('sequential');
    expect(config.refusable).toBe(true);
  });

  it('maps witnesses into numbered signer roles when present', async () => {
    const data = makeRentalData({
      witnesses: [
        { name: 'Test 1', cpf: '555.555.555-55', email: 't1@example.com' },
        { name: 'Test 2', cpf: '666.666.666-66', email: 't2@example.com' },
      ],
    });

    await generator.sendRentalContractForSignature(data, 'CT-4');

    const witnesses = addRentalContractSigners.mock.calls[0][4];
    expect(witnesses).toHaveLength(2);
    expect(witnesses[0]).toMatchObject({ name: 'Test 1', role: 'Testemunha 1' });
    expect(witnesses[1]).toMatchObject({ name: 'Test 2', role: 'Testemunha 2' });
  });

  it('creates the signature list and sends invitations, returning the keys', async () => {
    const result = await generator.sendRentalContractForSignature(makeRentalData(), 'CT-5');

    expect(createSignatureList).toHaveBeenCalledWith('doc-key-1', expect.stringContaining('CT-5'));
    expect(sendInvitations).toHaveBeenCalledWith('list-key-1');

    expect(result).toEqual({
      documentKey: 'doc-key-1',
      listKey: 'list-key-1',
      signers: [{ key: 'signer-1' }, { key: 'signer-2' }],
    });
  });

  it('propagates upload failures and does not send invitations', async () => {
    uploadDocument.mockRejectedValueOnce(new Error('ClickSign 500'));

    await expect(
      generator.sendRentalContractForSignature(makeRentalData(), 'CT-6'),
    ).rejects.toThrow('ClickSign 500');

    expect(sendInvitations).not.toHaveBeenCalled();
  });
});

describe('ContractGenerator — sale signature orchestration', () => {
  const generator = new ContractGenerator();

  beforeEach(() => {
    uploadDocument.mockResolvedValue({ key: 'sale-doc' });
    createSignatureList.mockResolvedValue({ key: 'sale-list' });
    addSaleContractSigners.mockResolvedValue([{ key: 's' }]);
    sendInvitations.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uploads with sale-scoped path/filename and a valid PDF payload', async () => {
    await generator.sendSaleContractForSignature(makeSaleData(), 'SALE-1');

    const uploadArg = uploadDocument.mock.calls[0][0];
    expect(uploadArg.path).toBe('/contracts/sale/SALE-1.pdf');
    expect(uploadArg.filename).toBe('Contrato_Compra_Venda_SALE-1.pdf');
    expect(uploadArg.sequence_enabled).toBe(true);

    const decoded = Buffer.from(uploadArg.content_base64, 'base64');
    expect(isPdfBuffer(decoded)).toBe(true);
  });

  it('assembles seller/buyer signers and omits realtor when absent', async () => {
    await generator.sendSaleContractForSignature(makeSaleData(), 'SALE-2');

    const [, , sellerSigner, buyerSigner, realtorSigner, config] =
      addSaleContractSigners.mock.calls[0];

    expect(sellerSigner).toMatchObject({ name: 'Carlos Vendedor', role: 'Vendedor' });
    expect(buyerSigner).toMatchObject({ name: 'Ana Compradora', role: 'Comprador' });
    expect(realtorSigner).toBeUndefined();
    expect(config.order).toBe('sequential');
  });

  it('includes the realtor signer with the Corretor role when present', async () => {
    const data = makeSaleData({
      realtor: { name: 'Corretor Silva', creci: 'SP-99999', email: 'corretor@example.com' },
    });

    await generator.sendSaleContractForSignature(data, 'SALE-3');

    const realtorSigner = addSaleContractSigners.mock.calls[0][4];
    expect(realtorSigner).toMatchObject({
      name: 'Corretor Silva',
      email: 'corretor@example.com',
      role: 'Corretor',
    });
  });

  it('returns the document/list keys and signer payload', async () => {
    const result = await generator.sendSaleContractForSignature(makeSaleData(), 'SALE-4');

    expect(result).toEqual({
      documentKey: 'sale-doc',
      listKey: 'sale-list',
      signers: [{ key: 's' }],
    });
    expect(sendInvitations).toHaveBeenCalledWith('sale-list');
  });
});

/**
 * Contract Generator
 * Generates legal contracts from templates with ClickSign integration
 */

import { jsPDF } from 'jspdf';
import { templateManager } from './template-manager';
import { DocumentService } from './document-service';
import { SignerService } from './signer-service';
import type { SignerInfo, SigningConfig } from './signer-service';

export interface RentalContractData {
  landlord: {
    name: string;
    cpf: string;
    address: string;
    email: string;
    phone?: string;
  };
  tenant: {
    name: string;
    cpf: string;
    address: string;
    email: string;
    phone?: string;
  };
  property: {
    address: string;
    description?: string;
    type: string; // residential, commercial
  };
  financial: {
    rentalValue: number;
    dueDay: number;
    deposit?: number;
    iptuIncluded: boolean;
    condoIncluded: boolean;
  };
  contract: {
    duration: number; // months
    startDate: Date;
    endDate: Date;
    renewalType: 'automatic' | 'manual' | 'none';
  };
  witnesses?: Array<{
    name: string;
    cpf: string;
    email: string;
  }>;
}

export interface SaleContractData {
  seller: {
    name: string;
    cpf: string;
    address: string;
    email: string;
    phone?: string;
  };
  buyer: {
    name: string;
    cpf: string;
    address: string;
    email: string;
    phone?: string;
  };
  property: {
    address: string;
    description: string;
    registrationNumber?: string;
    area: number;
  };
  financial: {
    salePrice: number;
    paymentMethod: string;
    downPayment?: number;
    installments?: number;
  };
  realtor?: {
    name: string;
    creci: string;
    email: string;
  };
}

export class ContractGenerator {
  private documentService = new DocumentService();
  private signerService = new SignerService();

  /**
   * Generate rental contract PDF
   */
  async generateRentalContract(data: RentalContractData): Promise<Buffer> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add contract header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONTRATO DE LOCAÇÃO DE IMÓVEL', 105, 20, { align: 'center' });

    // Add watermark
    this.addWatermark(pdf);

    // Landlord section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LOCADOR', 20, 40);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${data.landlord.name}`, 20, 50);
    pdf.text(`CPF: ${data.landlord.cpf}`, 20, 56);
    pdf.text(`Endereço: ${data.landlord.address}`, 20, 62);

    // Tenant section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LOCATÁRIO', 20, 75);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${data.tenant.name}`, 20, 85);
    pdf.text(`CPF: ${data.tenant.cpf}`, 20, 91);
    pdf.text(`Endereço: ${data.tenant.address}`, 20, 97);

    // Property section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('IMÓVEL', 20, 110);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Endereço: ${data.property.address}`, 20, 120);
    pdf.text(`Tipo: ${data.property.type === 'residential' ? 'Residencial' : 'Comercial'}`, 20, 126);

    // Financial terms
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONDIÇÕES FINANCEIRAS', 20, 139);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Valor do Aluguel: R$ ${data.financial.rentalValue.toFixed(2)}`, 20, 149);
    pdf.text(`Vencimento: Dia ${data.financial.dueDay} de cada mês`, 20, 155);
    if (data.financial.deposit) {
      pdf.text(`Caução: R$ ${data.financial.deposit.toFixed(2)}`, 20, 161);
    }
    pdf.text(`IPTU: ${data.financial.iptuIncluded ? 'Incluído' : 'Não incluído'}`, 20, 167);
    pdf.text(`Condomínio: ${data.financial.condoIncluded ? 'Incluído' : 'Não incluído'}`, 20, 173);

    // Contract terms
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRAZO DO CONTRATO', 20, 186);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Duração: ${data.contract.duration} meses`, 20, 196);
    pdf.text(`Início: ${data.contract.startDate.toLocaleDateString('pt-BR')}`, 20, 202);
    pdf.text(`Término: ${data.contract.endDate.toLocaleDateString('pt-BR')}`, 20, 208);
    pdf.text(`Renovação: ${data.contract.renewalType === 'automatic' ? 'Automática' : 'Manual'}`, 20, 214);

    // Add clauses
    pdf.addPage();
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CLÁUSULAS CONTRATUAIS', 20, 20);

    const clauses = this.getRentalContractClauses(data);
    let yPos = 30;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    clauses.forEach((clause, index) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }

      const lines = pdf.splitTextToSize(
        `CLÁUSULA ${index + 1}ª - ${clause}`,
        170
      );

      pdf.text(lines, 20, yPos);
      yPos += lines.length * 5 + 5;
    });

    // Signature section
    pdf.addPage();
    this.addSignatureSection(pdf, data);

    // Return PDF as buffer
    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Generate sale contract PDF
   */
  async generateSaleContract(data: SaleContractData): Promise<Buffer> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONTRATO DE COMPRA E VENDA DE IMÓVEL', 105, 20, { align: 'center' });

    this.addWatermark(pdf);

    // Seller section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VENDEDOR', 20, 40);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${data.seller.name}`, 20, 50);
    pdf.text(`CPF: ${data.seller.cpf}`, 20, 56);

    // Buyer section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('COMPRADOR', 20, 69);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${data.buyer.name}`, 20, 79);
    pdf.text(`CPF: ${data.buyer.cpf}`, 20, 85);

    // Property details
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('IMÓVEL', 20, 98);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Endereço: ${data.property.address}`, 20, 108);
    pdf.text(`Área: ${data.property.area} m²`, 20, 114);
    if (data.property.registrationNumber) {
      pdf.text(`Matrícula: ${data.property.registrationNumber}`, 20, 120);
    }

    // Financial details
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VALOR E FORMA DE PAGAMENTO', 20, 133);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Valor Total: R$ ${data.financial.salePrice.toFixed(2)}`, 20, 143);
    pdf.text(`Forma de Pagamento: ${data.financial.paymentMethod}`, 20, 149);

    if (data.financial.downPayment) {
      pdf.text(`Entrada: R$ ${data.financial.downPayment.toFixed(2)}`, 20, 155);
    }

    // Add sale contract clauses
    pdf.addPage();
    const clauses = this.getSaleContractClauses(data);
    let yPos = 20;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    clauses.forEach((clause, index) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }

      const lines = pdf.splitTextToSize(`CLÁUSULA ${index + 1}ª - ${clause}`, 170);
      pdf.text(lines, 20, yPos);
      yPos += lines.length * 5 + 5;
    });

    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Send rental contract for signature via ClickSign
   */
  async sendRentalContractForSignature(
    contractData: RentalContractData,
    contractId: string
  ): Promise<{
    documentKey: string;
    listKey: string;
    signers: any[];
  }> {
    // Generate PDF
    const pdfBuffer = await this.generateRentalContract(contractData);
    const base64Content = pdfBuffer.toString('base64');

    // Upload to ClickSign
    const document = await this.documentService.uploadDocument({
      path: `/contracts/rental/${contractId}.pdf`,
      filename: `Contrato_Locacao_${contractId}.pdf`,
      content_base64: base64Content,
      auto_close: true,
      locale: 'pt-BR',
      sequence_enabled: true, // Landlord signs first
      deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    // Create signature list
    const list = await this.documentService.createSignatureList(
      document.key,
      `Assinaturas - Contrato ${contractId}`
    );

    // Add signers (landlord first, then tenant, then witnesses)
    const landlordSigner: SignerInfo = {
      name: contractData.landlord.name,
      email: contractData.landlord.email,
      cpf: contractData.landlord.cpf,
      phone: contractData.landlord.phone,
      role: 'Locador',
    };

    const tenantSigner: SignerInfo = {
      name: contractData.tenant.name,
      email: contractData.tenant.email,
      cpf: contractData.tenant.cpf,
      phone: contractData.tenant.phone,
      role: 'Locatário',
    };

    const witnesses: SignerInfo[] = contractData.witnesses?.map((w, i) => ({
      name: w.name,
      email: w.email,
      cpf: w.cpf,
      role: `Testemunha ${i + 1}`,
    })) || [];

    const signingConfig: SigningConfig = {
      order: 'sequential',
      refusable: true,
      customMessage: 'Por favor, revise e assine o contrato de locação.',
    };

    const signers = await this.signerService.addRentalContractSigners(
      document.key,
      list.key,
      landlordSigner,
      tenantSigner,
      witnesses.length > 0 ? witnesses : undefined,
      signingConfig
    );

    // Send invitations
    await this.signerService.sendInvitations(list.key);

    return {
      documentKey: document.key,
      listKey: list.key,
      signers,
    };
  }

  /**
   * Add watermark to PDF
   */
  private addWatermark(pdf: jsPDF): void {
    pdf.setFontSize(40);
    pdf.setTextColor(220, 220, 220);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ASSINATURA DIGITAL', 105, 150, {
      align: 'center',
      angle: 45,
    });
    pdf.setTextColor(0, 0, 0);
  }

  /**
   * Add signature section to PDF
   */
  private addSignatureSection(pdf: jsPDF, data: RentalContractData): void {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ASSINATURAS', 20, 20);

    const city = 'São Paulo'; // TODO: Get from property data
    const date = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${city}, ${date}`, 20, 30);

    // Landlord signature
    pdf.text('_'.repeat(50), 20, 50);
    pdf.text(`${data.landlord.name} - Locador`, 20, 56);
    pdf.text(`CPF: ${data.landlord.cpf}`, 20, 62);

    // Tenant signature
    pdf.text('_'.repeat(50), 20, 80);
    pdf.text(`${data.tenant.name} - Locatário`, 20, 86);
    pdf.text(`CPF: ${data.tenant.cpf}`, 20, 92);

    // Witnesses
    if (data.witnesses && data.witnesses.length > 0) {
      data.witnesses.forEach((witness, index) => {
        const yPos = 110 + index * 30;
        pdf.text('_'.repeat(50), 20, yPos);
        pdf.text(`${witness.name} - Testemunha ${index + 1}`, 20, yPos + 6);
        pdf.text(`CPF: ${witness.cpf}`, 20, yPos + 12);
      });
    }
  }

  /**
   * Get rental contract clauses
   */
  private getRentalContractClauses(data: RentalContractData): string[] {
    return [
      'DO OBJETO: O presente contrato tem por objeto a locação do imóvel descrito no preâmbulo deste instrumento.',
      `DO PRAZO: O prazo de locação é de ${data.contract.duration} meses, iniciando-se em ${data.contract.startDate.toLocaleDateString('pt-BR')} e encerrando-se em ${data.contract.endDate.toLocaleDateString('pt-BR')}.`,
      `DO ALUGUEL: O LOCATÁRIO pagará ao LOCADOR o valor mensal de R$ ${data.financial.rentalValue.toFixed(2)}, todo dia ${data.financial.dueDay} de cada mês.`,
      'DOS REAJUSTES: O valor do aluguel será reajustado anualmente pelo IGP-M ou índice que venha a substituí-lo.',
      'DA DESTINAÇÃO: O imóvel destina-se exclusivamente para fins residenciais, sendo vedada qualquer alteração sem autorização prévia do LOCADOR.',
      'DAS BENFEITORIAS: Quaisquer benfeitorias ou alterações no imóvel deverão ser previamente autorizadas pelo LOCADOR, não cabendo ao LOCATÁRIO direito de retenção ou indenização.',
      'DA ENTREGA DO IMÓVEL: Ao término da locação, o LOCATÁRIO deverá devolver o imóvel nas mesmas condições em que recebeu, ressalvada a deterioração natural pelo uso.',
      'DO INADIMPLEMENTO: O não pagamento do aluguel no prazo estipulado implicará em multa de 10% sobre o valor devido, além de juros de mora de 1% ao mês.',
      'DA RESCISÃO: Qualquer das partes poderá rescindir o contrato mediante aviso prévio de 30 dias, ficando sujeita à multa equivalente a 3 aluguéis.',
      'DO FORO: Fica eleito o foro da comarca do imóvel para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato.',
    ];
  }

  /**
   * Get sale contract clauses
   */
  private getSaleContractClauses(data: SaleContractData): string[] {
    return [
      'DO OBJETO: O presente contrato tem por objeto a compra e venda do imóvel descrito, livre e desembaraçado de qualquer ônus.',
      `DO PREÇO: O preço total da venda é de R$ ${data.financial.salePrice.toFixed(2)}, a ser pago na forma estipulada.`,
      'DAS GARANTIAS: O VENDEDOR garante que o imóvel está livre de ônus, débitos fiscais, condominiais ou de qualquer natureza.',
      'DA POSSE: A posse do imóvel será transferida ao COMPRADOR mediante o pagamento integral do preço.',
      'DA DOCUMENTAÇÃO: O VENDEDOR se compromete a fornecer toda a documentação necessária para a transferência da propriedade.',
      'DAS DESPESAS: As despesas com escritura, registro e impostos serão divididas igualmente entre as partes.',
      'DO INADIMPLEMENTO: O não cumprimento das obrigações por qualquer das partes sujeita o inadimplente ao pagamento de multa de 10% sobre o valor do contrato.',
      'DO FORO: Fica eleito o foro da comarca do imóvel para dirimir quaisquer dúvidas ou controvérsias.',
    ];
  }
}

export const contractGenerator = new ContractGenerator();

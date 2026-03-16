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

    // Add contract header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONTRATO DE COMPRA E VENDA DE IMÓVEL', 105, 20, { align: 'center' });

    // Add watermark
    this.addWatermark(pdf);

    // Qualificação das partes - Vendedor
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VENDEDOR(A)', 20, 40);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${data.seller.name}`, 20, 50);
    pdf.text(`CPF: ${data.seller.cpf}`, 20, 56);
    pdf.text(`Endereço: ${data.seller.address}`, 20, 62);
    pdf.text(`E-mail: ${data.seller.email}`, 20, 68);
    if (data.seller.phone) {
      pdf.text(`Telefone: ${data.seller.phone}`, 20, 74);
    }

    // Qualificação das partes - Comprador
    const buyerStartY = data.seller.phone ? 87 : 81;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('COMPRADOR(A)', 20, buyerStartY);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${data.buyer.name}`, 20, buyerStartY + 10);
    pdf.text(`CPF: ${data.buyer.cpf}`, 20, buyerStartY + 16);
    pdf.text(`Endereço: ${data.buyer.address}`, 20, buyerStartY + 22);
    pdf.text(`E-mail: ${data.buyer.email}`, 20, buyerStartY + 28);
    if (data.buyer.phone) {
      pdf.text(`Telefone: ${data.buyer.phone}`, 20, buyerStartY + 34);
    }

    // Descrição do Imóvel
    let propertyStartY = buyerStartY + (data.buyer.phone ? 47 : 41);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRIÇÃO DO IMÓVEL', 20, propertyStartY);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Endereço: ${data.property.address}`, 20, propertyStartY + 10);
    const descriptionLines = pdf.splitTextToSize(`Descrição: ${data.property.description}`, 170);
    pdf.text(descriptionLines, 20, propertyStartY + 16);
    let currentY = propertyStartY + 16 + descriptionLines.length * 5;
    pdf.text(`Área Total: ${data.property.area} m²`, 20, currentY + 2);
    currentY += 8;
    if (data.property.registrationNumber) {
      pdf.text(`Matrícula no Registro de Imóveis: ${data.property.registrationNumber}`, 20, currentY);
      currentY += 6;
    }

    // Preço e Condições de Pagamento
    currentY += 7;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PREÇO E CONDIÇÕES DE PAGAMENTO', 20, currentY);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    currentY += 10;
    pdf.text(`Valor Total de Venda: R$ ${data.financial.salePrice.toFixed(2)}`, 20, currentY);
    currentY += 6;
    pdf.text(`Forma de Pagamento: ${data.financial.paymentMethod}`, 20, currentY);
    currentY += 6;

    if (data.financial.downPayment) {
      pdf.text(`Valor da Entrada (Sinal): R$ ${data.financial.downPayment.toFixed(2)}`, 20, currentY);
      currentY += 6;
    }

    if (data.financial.installments) {
      const remaining = data.financial.salePrice - (data.financial.downPayment || 0);
      const installmentValue = remaining / data.financial.installments;
      pdf.text(`Parcelas: ${data.financial.installments}x de R$ ${installmentValue.toFixed(2)}`, 20, currentY);
      currentY += 6;
    }

    // Corretor (if present)
    if (data.realtor) {
      currentY += 7;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CORRETOR(A) DE IMÓVEIS', 20, currentY);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      currentY += 10;
      pdf.text(`Nome: ${data.realtor.name}`, 20, currentY);
      currentY += 6;
      pdf.text(`CRECI: ${data.realtor.creci}`, 20, currentY);
      currentY += 6;
      pdf.text(`E-mail: ${data.realtor.email}`, 20, currentY);
    }

    // Cláusulas Contratuais
    pdf.addPage();
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CLÁUSULAS CONTRATUAIS', 20, 20);

    const clauses = this.getSaleContractClauses(data);
    let yPos = 30;

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

    // Signature section
    pdf.addPage();
    this.addSaleSignatureSection(pdf, data);

    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Send sale contract for signature via ClickSign
   */
  async sendSaleContractForSignature(
    contractData: SaleContractData,
    contractId: string
  ): Promise<{
    documentKey: string;
    listKey: string;
    signers: any[];
  }> {
    // Generate PDF
    const pdfBuffer = await this.generateSaleContract(contractData);
    const base64Content = pdfBuffer.toString('base64');

    // Upload to ClickSign
    const document = await this.documentService.uploadDocument({
      path: `/contracts/sale/${contractId}.pdf`,
      filename: `Contrato_Compra_Venda_${contractId}.pdf`,
      content_base64: base64Content,
      auto_close: true,
      locale: 'pt-BR',
      sequence_enabled: true, // Seller signs first
      deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    // Create signature list
    const list = await this.documentService.createSignatureList(
      document.key,
      `Assinaturas - Contrato de Venda ${contractId}`
    );

    // Add signers (seller first, then buyer, then realtor if present)
    const sellerSigner: SignerInfo = {
      name: contractData.seller.name,
      email: contractData.seller.email,
      cpf: contractData.seller.cpf,
      phone: contractData.seller.phone,
      role: 'Vendedor',
    };

    const buyerSigner: SignerInfo = {
      name: contractData.buyer.name,
      email: contractData.buyer.email,
      cpf: contractData.buyer.cpf,
      phone: contractData.buyer.phone,
      role: 'Comprador',
    };

    const realtorSigner: SignerInfo | undefined = contractData.realtor
      ? {
          name: contractData.realtor.name,
          email: contractData.realtor.email,
          role: 'Corretor',
        }
      : undefined;

    const signingConfig: SigningConfig = {
      order: 'sequential',
      refusable: true,
      customMessage: 'Por favor, revise e assine o contrato de compra e venda.',
    };

    const signers = await this.signerService.addSaleContractSigners(
      document.key,
      list.key,
      sellerSigner,
      buyerSigner,
      realtorSigner,
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
   * Add signature section to sale contract PDF
   */
  private addSaleSignatureSection(pdf: jsPDF, data: SaleContractData): void {
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

    // Seller signature
    pdf.text('_'.repeat(50), 20, 50);
    pdf.text(`${data.seller.name} - Vendedor(a)`, 20, 56);
    pdf.text(`CPF: ${data.seller.cpf}`, 20, 62);

    // Buyer signature
    pdf.text('_'.repeat(50), 20, 80);
    pdf.text(`${data.buyer.name} - Comprador(a)`, 20, 86);
    pdf.text(`CPF: ${data.buyer.cpf}`, 20, 92);

    // Realtor signature (if present)
    if (data.realtor) {
      pdf.text('_'.repeat(50), 20, 110);
      pdf.text(`${data.realtor.name} - Corretor(a) de Imóveis`, 20, 116);
      pdf.text(`CRECI: ${data.realtor.creci}`, 20, 122);
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
    const installmentText = data.financial.installments
      ? `, sendo o saldo restante de R$ ${(data.financial.salePrice - (data.financial.downPayment || 0)).toFixed(2)} dividido em ${data.financial.installments} parcelas iguais e sucessivas`
      : '';

    const downPaymentText = data.financial.downPayment
      ? `, mediante entrada (sinal) de R$ ${data.financial.downPayment.toFixed(2)}${installmentText}`
      : '';

    return [
      `DO OBJETO: O presente contrato tem por objeto a compra e venda do imóvel situado em ${data.property.address}, com área de ${data.property.area} m²${data.property.registrationNumber ? `, registrado sob matrícula nº ${data.property.registrationNumber}` : ''}, livre e desembaraçado de qualquer ônus, dívida, hipoteca ou gravame de qualquer natureza.`,
      `DO PREÇO E CONDIÇÕES DE PAGAMENTO: O preço total da venda é de R$ ${data.financial.salePrice.toFixed(2)} (${this.numberToWords(data.financial.salePrice)}), a ser pago através de ${data.financial.paymentMethod}${downPaymentText}.`,
      'DAS GARANTIAS DO VENDEDOR: O VENDEDOR declara e garante que: (a) é legítimo proprietário do imóvel; (b) o imóvel encontra-se livre e desembaraçado de quaisquer ônus reais, penhoras, arrestos, sequestros ou gravames; (c) não existem débitos fiscais, condominiais ou de qualquer outra natureza pendentes sobre o imóvel; (d) não há ações judiciais que possam afetar a propriedade ou a posse do imóvel.',
      'DA ENTREGA E TRANSFERÊNCIA DA POSSE: A posse direta do imóvel será transferida ao COMPRADOR no prazo de até 30 (trinta) dias após a assinatura da escritura definitiva de compra e venda, ou mediante o pagamento integral do preço, o que ocorrer por último. O imóvel será entregue em perfeitas condições de uso e habitabilidade.',
      'DA ESCRITURA E REGISTRO: As partes se comprometem a lavrar a escritura pública de compra e venda no prazo de até 60 (sessenta) dias a contar da assinatura deste instrumento particular. O VENDEDOR se obriga a fornecer toda a documentação necessária para a lavratura da escritura e posterior registro junto ao Cartório de Registro de Imóveis competente.',
      'DA DOCUMENTAÇÃO: O VENDEDOR se compromete a providenciar e apresentar ao COMPRADOR, às suas expensas, as certidões negativas de débitos municipais (IPTU), certidões de ônus reais, certidões de ações cíveis e fiscais, certidão negativa de débitos trabalhistas e demais documentos exigidos por lei para a formalização da transferência.',
      'DAS DESPESAS E TRIBUTOS: As despesas com a lavratura da escritura pública, registro imobiliário e ITBI (Imposto de Transmissão de Bens Imóveis) serão de responsabilidade do COMPRADOR. As despesas com certidões e documentação do VENDEDOR correrão por conta deste.',
      'DA MULTA POR INADIMPLEMENTO: O descumprimento de qualquer obrigação prevista neste contrato sujeitará a parte inadimplente ao pagamento de multa equivalente a 10% (dez por cento) sobre o valor total da venda, sem prejuízo de perdas e danos e honorários advocatícios de 20% (vinte por cento) sobre o valor da causa.',
      'DA RESCISÃO: O presente contrato poderá ser rescindido por qualquer das partes em caso de descumprimento das obrigações aqui pactuadas, mediante notificação extrajudicial com antecedência mínima de 30 (trinta) dias. Em caso de rescisão por culpa do COMPRADOR, o sinal será retido pelo VENDEDOR a título de indenização. Em caso de rescisão por culpa do VENDEDOR, este devolverá ao COMPRADOR o sinal em dobro, conforme dispõe o art. 418 do Código Civil.',
      'DA EVICÇÃO: O VENDEDOR responderá pela evicção do imóvel, nos termos dos artigos 447 a 457 do Código Civil Brasileiro, assegurando ao COMPRADOR a restituição integral do preço pago, acrescido de perdas e danos.',
      'DAS DISPOSIÇÕES GERAIS: As partes declaram que o presente contrato é celebrado de livre e espontânea vontade, sem qualquer vício de consentimento, e que estão cientes de todas as cláusulas e condições nele contidas. Qualquer alteração ao presente contrato somente será válida se feita por escrito e assinada por ambas as partes.',
      'DO FORO: Fica eleito o foro da comarca de localização do imóvel para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, com renúncia expressa de qualquer outro, por mais privilegiado que seja.',
    ];
  }

  /**
   * Convert number to Brazilian Portuguese words (simplified)
   */
  private numberToWords(value: number): string {
    const formatted = value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    return `${formatted} reais`;
  }
}

export const contractGenerator = new ContractGenerator();

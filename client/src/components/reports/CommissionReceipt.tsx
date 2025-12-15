import { formatCurrency, formatDate, formatDocument } from "@/lib/report-generators";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, FileText } from "lucide-react";

interface Company {
  name: string;
  logo?: string;
  cnpj: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface Broker {
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
}

interface CommissionData {
  id: string;
  type: "sale" | "rental";
  propertyTitle: string;
  propertyAddress?: string;
  clientName: string;
  transactionValue: string | number;
  commissionRate: string | number;
  commissionValue: string | number;
  date: string;
  description?: string;
}

interface CommissionReceiptProps {
  commission: CommissionData;
  broker: Broker;
  company: Company;
}

export default function CommissionReceipt({
  commission,
  broker,
  company,
}: CommissionReceiptProps) {
  const receiptNumber = `RPA-${commission.id.slice(0, 8).toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString("pt-BR");

  return (
    <div
      id="commission-receipt"
      className="p-8 max-w-3xl mx-auto bg-white text-black print:shadow-none"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* Header with Company Info */}
      <div className="text-center border-b-2 border-gray-300 pb-6 mb-8">
        {company.logo ? (
          <img
            src={company.logo}
            alt={company.name}
            className="h-16 mx-auto mb-3"
          />
        ) : (
          <Building2 className="h-16 w-16 mx-auto mb-3 text-gray-600" />
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {company.name}
        </h1>
        {company.cnpj && (
          <p className="text-sm text-gray-600">
            CNPJ: {formatDocument(company.cnpj)}
          </p>
        )}
        {company.address && (
          <p className="text-xs text-gray-600 mt-1">{company.address}</p>
        )}
        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-600">
          {company.phone && <span>Tel: {company.phone}</span>}
          {company.email && <span>Email: {company.email}</span>}
        </div>
      </div>

      {/* Receipt Title and Number */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg mb-3">
          <FileText className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">
            {receiptNumber}
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
          Recibo de Pagamento Autônomo - RPA
        </h2>
        <p className="text-sm text-gray-600 mt-1">Comissão de Corretagem</p>
      </div>

      {/* Broker Information */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">
          Dados do Corretor
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Nome Completo</p>
            <p className="text-sm font-medium text-gray-900">{broker.name}</p>
          </div>
          {broker.cpf && (
            <div>
              <p className="text-xs text-gray-500 mb-1">CPF</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDocument(broker.cpf)}
              </p>
            </div>
          )}
          {broker.email && (
            <div>
              <p className="text-xs text-gray-500 mb-1">E-mail</p>
              <p className="text-sm font-medium text-gray-900">{broker.email}</p>
            </div>
          )}
          {broker.phone && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Telefone</p>
              <p className="text-sm font-medium text-gray-900">{broker.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="mb-8 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">
          Detalhes da Transação
        </h3>

        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-sm text-gray-600">Tipo de Operação:</span>
          <span className="text-sm font-medium text-gray-900">
            {commission.type === "sale" ? "Venda de Imóvel" : "Locação de Imóvel"}
          </span>
        </div>

        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-sm text-gray-600">Imóvel:</span>
          <span className="text-sm font-medium text-gray-900 text-right max-w-md">
            {commission.propertyTitle}
          </span>
        </div>

        {commission.propertyAddress && (
          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="text-sm text-gray-600">Endereço:</span>
            <span className="text-sm font-medium text-gray-900 text-right max-w-md">
              {commission.propertyAddress}
            </span>
          </div>
        )}

        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-sm text-gray-600">Cliente:</span>
          <span className="text-sm font-medium text-gray-900">
            {commission.clientName}
          </span>
        </div>

        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-sm text-gray-600">Valor da Transação:</span>
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(commission.transactionValue)}
          </span>
        </div>

        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-sm text-gray-600">Taxa de Comissão:</span>
          <span className="text-sm font-medium text-gray-900">
            {commission.commissionRate}%
          </span>
        </div>

        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-sm text-gray-600">Data da Operação:</span>
          <span className="text-sm font-medium text-gray-900">
            {formatDate(commission.date)}
          </span>
        </div>

        {commission.description && (
          <div className="py-3 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Observações:</p>
            <p className="text-sm text-gray-900">{commission.description}</p>
          </div>
        )}
      </div>

      {/* Total Value - Highlighted */}
      <div className="mb-10 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide">
            Valor Total da Comissão
          </p>
          <p className="text-4xl font-bold text-green-700">
            {formatCurrency(commission.commissionValue)}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            ({numeroParaExtenso(commission.commissionValue)})
          </p>
        </div>
      </div>

      {/* Declaration */}
      <div className="mb-10 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-700 leading-relaxed">
          Recebi de <strong>{company.name}</strong>, inscrita no CNPJ{" "}
          {company.cnpj && formatDocument(company.cnpj)}, a quantia de{" "}
          <strong>{formatCurrency(commission.commissionValue)}</strong> referente
          à comissão de corretagem pela{" "}
          {commission.type === "sale" ? "venda" : "locação"} do imóvel{" "}
          <strong>{commission.propertyTitle}</strong>.
        </p>
      </div>

      {/* Signatures */}
      <div className="mt-16 grid grid-cols-2 gap-12">
        <div className="text-center">
          <Separator className="mb-4 bg-gray-900" />
          <p className="text-sm font-medium text-gray-900">{broker.name}</p>
          <p className="text-xs text-gray-600 mt-1">Corretor Autônomo</p>
          {broker.cpf && (
            <p className="text-xs text-gray-600">CPF: {formatDocument(broker.cpf)}</p>
          )}
        </div>
        <div className="text-center">
          <Separator className="mb-4 bg-gray-900" />
          <p className="text-sm font-medium text-gray-900">{company.name}</p>
          <p className="text-xs text-gray-600 mt-1">Empresa Contratante</p>
          {company.cnpj && (
            <p className="text-xs text-gray-600">
              CNPJ: {formatDocument(company.cnpj)}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          Recibo emitido em {currentDate}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Este documento comprova o pagamento da comissão de corretagem
        </p>
      </div>
    </div>
  );
}

// Helper function to convert number to words (simplified Brazilian Portuguese)
function numeroParaExtenso(valor: string | number): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  if (isNaN(num)) return "valor inválido";

  // This is a simplified version. For production, use a library like extenso
  const inteiro = Math.floor(num);
  const centavos = Math.round((num - inteiro) * 100);

  if (inteiro === 0 && centavos === 0) return "zero reais";

  let extenso = `${inteiro} reais`;
  if (centavos > 0) {
    extenso += ` e ${centavos} centavos`;
  }

  return extenso;
}

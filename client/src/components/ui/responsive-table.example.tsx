/**
 * EXEMPLO DE USO - ResponsiveTable Component
 *
 * Este arquivo demonstra como usar o componente ResponsiveTable
 * para criar tabelas que se transformam automaticamente em cards no mobile.
 */

import React from "react";
import { ResponsiveTable } from "./responsive-table";
import { Badge } from "./badge";
import { Button } from "./button";
import { Phone, Mail, ExternalLink } from "lucide-react";

// ==================== EXEMPLO 1: LISTA DE LEADS ====================

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "converted";
  budget: number;
  createdAt: string;
}

const mockLeads: Lead[] = [
  {
    id: "1",
    name: "João Silva",
    email: "joao@email.com",
    phone: "(11) 99999-9999",
    source: "Instagram",
    status: "new",
    budget: 500000,
    createdAt: "2025-12-28",
  },
  {
    id: "2",
    name: "Maria Santos",
    email: "maria@email.com",
    phone: "(11) 98888-8888",
    source: "Site",
    status: "contacted",
    budget: 750000,
    createdAt: "2025-12-27",
  },
];

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-amber-700 text-white border-amber-800", // WCAG AA: 4.6:1 contrast
  qualified: "bg-purple-100 text-purple-700 border-purple-200",
  converted: "bg-green-100 text-green-700 border-green-200",
};

const STATUS_LABELS = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  converted: "Convertido",
};

export function LeadsTableExample() {
  return (
    <ResponsiveTable
      columns={[
        { key: "name", label: "Nome" },
        { key: "email", label: "E-mail", hideOnMobile: true },
        { key: "phone", label: "Telefone", hideOnMobile: true },
        {
          key: "source",
          label: "Origem",
          render: (lead: Lead) => (
            <Badge variant="outline">{lead.source}</Badge>
          )
        },
        {
          key: "budget",
          label: "Orçamento",
          render: (lead: Lead) => (
            <span className="font-semibold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(lead.budget)}
            </span>
          )
        },
        {
          key: "status",
          label: "Status",
          render: (lead: Lead) => (
            <Badge className={STATUS_COLORS[lead.status]}>
              {STATUS_LABELS[lead.status]}
            </Badge>
          )
        },
      ]}
      data={mockLeads}
      renderCard={(lead) => (
        <div className="p-4 bg-card rounded-lg border space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{lead.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{lead.email}</p>
            </div>
            <Badge className={STATUS_COLORS[lead.status]}>
              {STATUS_LABELS[lead.status]}
            </Badge>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="font-medium">{lead.phone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Origem</p>
              <Badge variant="outline" className="text-xs">{lead.source}</Badge>
            </div>
          </div>

          {/* Budget */}
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Orçamento</p>
            <p className="text-lg font-bold text-primary">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(lead.budget)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              Ligar
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      )}
      emptyMessage="Nenhum lead encontrado"
    />
  );
}

// ==================== EXEMPLO 2: LISTA DE PROPOSTAS ====================

interface Proposal {
  id: string;
  code: string;
  client: string;
  property: string;
  value: number;
  status: "pending" | "accepted" | "rejected";
  expiresAt: string;
}

const mockProposals: Proposal[] = [
  {
    id: "1",
    code: "PROP-2025-001",
    client: "João Silva",
    property: "Apto 3 quartos - Jardins",
    value: 850000,
    status: "pending",
    expiresAt: "2025-12-31",
  },
];

export function ProposalsTableExample() {
  return (
    <ResponsiveTable
      columns={[
        { key: "code", label: "Código" },
        { key: "client", label: "Cliente" },
        { key: "property", label: "Imóvel", hideOnMobile: true },
        {
          key: "value",
          label: "Valor",
          className: "text-right",
          render: (proposal: Proposal) => (
            <span className="font-bold text-primary">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(proposal.value)}
            </span>
          )
        },
        {
          key: "status",
          label: "Status",
          render: (proposal: Proposal) => {
            const colors = {
              pending: "bg-amber-700 text-white", // WCAG AA: 4.6:1 contrast
              accepted: "bg-green-100 text-green-700",
              rejected: "bg-red-100 text-red-700",
            };
            const labels = {
              pending: "Pendente",
              accepted: "Aceita",
              rejected: "Rejeitada",
            };
            return (
              <Badge className={colors[proposal.status]}>
                {labels[proposal.status]}
              </Badge>
            );
          }
        },
      ]}
      data={mockProposals}
      renderCard={(proposal) => (
        <div className="p-4 bg-card rounded-lg border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Código</p>
              <p className="font-semibold">{proposal.code}</p>
            </div>
            <Badge className={
              proposal.status === "pending" ? "bg-amber-700 text-white" : // WCAG AA: 4.6:1 contrast
              proposal.status === "accepted" ? "bg-green-100 text-green-700" :
              "bg-red-100 text-red-700"
            }>
              {proposal.status === "pending" ? "Pendente" :
               proposal.status === "accepted" ? "Aceita" : "Rejeitada"}
            </Badge>
          </div>

          <h3 className="font-medium text-sm mb-1">{proposal.client}</h3>
          <p className="text-sm text-muted-foreground mb-3">{proposal.property}</p>

          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-xl font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                }).format(proposal.value)}
              </p>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver detalhes
            </Button>
          </div>
        </div>
      )}
    />
  );
}

// ==================== EXEMPLO 3: USO SIMPLES (SEM CUSTOM CARD) ====================

interface SimpleItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

const mockItems: SimpleItem[] = [
  { id: "1", name: "Produto A", category: "Categoria 1", price: 99.90, stock: 15 },
  { id: "2", name: "Produto B", category: "Categoria 2", price: 149.90, stock: 8 },
];

export function SimpleTableExample() {
  return (
    <ResponsiveTable
      columns={[
        { key: "name", label: "Nome" },
        { key: "category", label: "Categoria" },
        {
          key: "price",
          label: "Preço",
          render: (item: SimpleItem) => `R$ ${item.price.toFixed(2)}`
        },
        { key: "stock", label: "Estoque" },
      ]}
      data={mockItems}
      // Sem renderCard customizado - usa o card padrão automático
    />
  );
}

// ==================== USO NA APLICAÇÃO ====================

/**
 * Para usar estes exemplos em suas páginas:
 *
 * import { LeadsTableExample } from "@/components/ui/responsive-table.example";
 *
 * export default function LeadsPage() {
 *   return (
 *     <div className="p-6">
 *       <h1>Meus Leads</h1>
 *       <LeadsTableExample />
 *     </div>
 *   );
 * }
 */

// @ts-nocheck
/**
 * EXEMPLO DE INTEGRAÇÃO DOS NOVOS COMPONENTES
 *
 * Este arquivo demonstra como integrar os componentes SalesPipeline,
 * ProposalCard e SalesFunnel na página de vendas existente.
 */

import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SalesPipeline, type PipelineStage, type SaleOpportunity } from "./SalesPipeline";
import { ProposalCard, type ProposalCardProps } from "./ProposalCard";
import { SalesFunnel, type FunnelStage } from "./SalesFunnel";
import { useImobi } from "@/lib/imobi-context";

/**
 * Adapter para converter dados do contexto para o formato do pipeline
 */
function useSalesPipelineData() {
  const { proposals, properties, leads } = useImobi();

  const pipelineStages: PipelineStage[] = useMemo(() => {
    // Define os estágios do pipeline
    const stageDefinitions = [
      { id: "initial", name: "Interesse Inicial", color: "blue" },
      { id: "proposal", name: "Proposta Enviada", color: "indigo" },
      { id: "negotiation", name: "Negociação", color: "purple" },
      { id: "approval", name: "Aprovação Financeira", color: "pink" },
      { id: "closing", name: "Fechamento", color: "green" },
    ];

    // Mapear propostas para estágios
    return stageDefinitions.map((stageDef) => {
      const stageProposals = proposals
        .filter((p: any) => {
          // Mapear status da proposta para estágios
          switch (p.status) {
            case "pending":
              return stageDef.id === "initial" || stageDef.id === "proposal";
            case "negotiating":
              return stageDef.id === "negotiation";
            case "accepted":
              return stageDef.id === "approval" || stageDef.id === "closing";
            default:
              return false;
          }
        })
        .map((proposal: any): SaleOpportunity => {
          const property = properties.find((pr) => pr.id === proposal.propertyId);
          const lead = leads.find((l) => l.id === proposal.leadId);

          return {
            id: proposal.id,
            property: {
              id: proposal.propertyId,
              address: property?.address || "Endereço não disponível",
              imageUrl: undefined, // Adicionar se houver imagens
              askingPrice: parseFloat(property?.price || "0"),
            },
            buyer: {
              name: lead?.name || "Cliente",
              avatar: undefined,
            },
            proposedValue: parseFloat(proposal.proposedValue),
            stage: stageDef.id,
            daysInStage: Math.floor(
              (Date.now() - new Date(proposal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            ),
            createdAt: new Date(proposal.createdAt),
          };
        });

      const totalValue = stageProposals.reduce(
        (sum: number, opp: SaleOpportunity) => sum + opp.proposedValue,
        0
      );

      return {
        id: stageDef.id,
        name: stageDef.name,
        opportunities: stageProposals,
        totalValue,
        color: stageDef.color,
      };
    });
  }, [proposals, properties, leads]);

  return pipelineStages;
}

/**
 * Adapter para converter dados do contexto para o formato das propostas
 */
function useProposalsData() {
  const { proposals, properties, leads } = useImobi();

  const proposalCards: ProposalCardProps[] = useMemo(() => {
    return proposals.map((proposal: any) => {
      const property = properties.find((p: any) => p.id === proposal.propertyId);
      const lead = leads.find((l) => l.id === proposal.leadId);

      return {
        id: proposal.id,
        property: {
          address: property?.address || "Endereço não disponível",
          askingPrice: parseFloat(property?.price || "0"),
          imageUrl: undefined,
        },
        buyer: {
          name: lead?.name || "Cliente",
          contact: lead?.phone || lead?.email || "Contato não disponível",
          avatar: undefined,
        },
        proposedValue: parseFloat(proposal.proposedValue),
        status: proposal.status as "pending" | "accepted" | "rejected" | "negotiating",
        createdAt: new Date(proposal.createdAt),
        notes: proposal.notes || undefined,
        // Opcional: adicionar se disponível
        downPayment: undefined,
        financing: undefined,
        deadline: proposal.validityDate ? new Date(proposal.validityDate) : undefined,
      };
    });
  }, [proposals, properties, leads]);

  return proposalCards;
}

/**
 * Adapter para converter dados do contexto para o formato do funil
 */
function useFunnelData() {
  const { proposals } = useImobi();

  const funnelStages: FunnelStage[] = useMemo(() => {
    // Agrupar por estágio
    const stageStats = {
      initial: { count: 0, value: 0, days: [] as number[] },
      proposal: { count: 0, value: 0, days: [] as number[] },
      negotiation: { count: 0, value: 0, days: [] as number[] },
      approval: { count: 0, value: 0, days: [] as number[] },
      closing: { count: 0, value: 0, days: [] as number[] },
    };

    proposals.forEach((p: any) => {
      const value = parseFloat(p.proposedValue);
      const days = Math.floor(
        (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      let stage: keyof typeof stageStats;
      switch (p.status) {
        case "pending":
          stage = "proposal";
          break;
        case "negotiating":
          stage = "negotiation";
          break;
        case "accepted":
          stage = "approval";
          break;
        default:
          return;
      }

      stageStats[stage].count++;
      stageStats[stage].value += value;
      stageStats[stage].days.push(days);
    });

    return [
      {
        id: "initial",
        name: "Interesse Inicial",
        count: stageStats.initial.count || proposals.length, // Simplificado
        value: stageStats.initial.value || proposals.reduce((sum: number, p: any) => sum + parseFloat(p.proposedValue), 0),
        averageDays: stageStats.initial.days.length > 0
          ? Math.round(stageStats.initial.days.reduce((a, b) => a + b, 0) / stageStats.initial.days.length)
          : 0,
      },
      {
        id: "proposal",
        name: "Proposta Enviada",
        count: stageStats.proposal.count,
        value: stageStats.proposal.value,
        averageDays: stageStats.proposal.days.length > 0
          ? Math.round(stageStats.proposal.days.reduce((a, b) => a + b, 0) / stageStats.proposal.days.length)
          : 7,
      },
      {
        id: "negotiation",
        name: "Negociação",
        count: stageStats.negotiation.count,
        value: stageStats.negotiation.value,
        averageDays: stageStats.negotiation.days.length > 0
          ? Math.round(stageStats.negotiation.days.reduce((a, b) => a + b, 0) / stageStats.negotiation.days.length)
          : 14,
      },
      {
        id: "approval",
        name: "Aprovação Financeira",
        count: stageStats.approval.count,
        value: stageStats.approval.value,
        averageDays: stageStats.approval.days.length > 0
          ? Math.round(stageStats.approval.days.reduce((a, b) => a + b, 0) / stageStats.approval.days.length)
          : 21,
      },
      {
        id: "closing",
        name: "Fechamento",
        count: stageStats.closing.count,
        value: stageStats.closing.value,
        averageDays: stageStats.closing.days.length > 0
          ? Math.round(stageStats.closing.days.reduce((a, b) => a + b, 0) / stageStats.closing.days.length)
          : 30,
      },
    ];
  }, [proposals]);

  return funnelStages;
}

/**
 * Componente de exemplo mostrando a nova estrutura da página
 */
export function VendasPageExample() {
  const pipelineStages = useSalesPipelineData();
  const proposalCards = useProposalsData();
  const funnelData = useFunnelData();

  const handleMoveStage = (opportunityId: string, newStage: string) => {
    console.log("Move opportunity", opportunityId, "to stage", newStage);
    // Implementar lógica de movimentação
  };

  const handleViewOpportunity = (opportunityId: string) => {
    console.log("View opportunity", opportunityId);
    // Implementar visualização de detalhes
  };

  const handleContactBuyer = (buyerId: string) => {
    console.log("Contact buyer", buyerId);
    // Implementar contato com comprador
  };

  const handleAcceptProposal = (proposalId: string) => {
    console.log("Accept proposal", proposalId);
    // Implementar aceitação
  };

  const handleCounterOffer = (proposalId: string) => {
    console.log("Counter offer", proposalId);
    // Implementar contra-proposta
  };

  const handleRejectProposal = (proposalId: string) => {
    console.log("Reject proposal", proposalId);
    // Implementar rejeição
  };

  const handleViewDetails = (proposalId: string) => {
    console.log("View details", proposalId);
    // Implementar visualização de detalhes
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Vendas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão de pipeline e propostas
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Oportunidade
        </Button>
      </div>

      {/* Funil Visual */}
      <SalesFunnel stages={funnelData} />

      {/* Tabs: Pipeline | Propostas | Contratos */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="proposals">Propostas</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <SalesPipeline
            stages={pipelineStages}
            onMoveStage={handleMoveStage}
            onViewOpportunity={handleViewOpportunity}
            onContactBuyer={handleContactBuyer}
          />
        </TabsContent>

        {/* Propostas Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposalCards.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                {...proposal}
                onAccept={handleAcceptProposal}
                onCounterOffer={handleCounterOffer}
                onReject={handleRejectProposal}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        </TabsContent>

        {/* Contratos Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="text-center py-12 text-muted-foreground">
            Lista de contratos assinados (implementar)
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * COMO INTEGRAR NA PÁGINA PRINCIPAL (vendas/index.tsx)
 *
 * 1. Importar os componentes:
 *    import { SalesPipeline } from "./SalesPipeline";
 *    import { ProposalCard } from "./ProposalCard";
 *    import { SalesFunnel } from "./SalesFunnel";
 *
 * 2. Usar os hooks de adapter:
 *    const pipelineStages = useSalesPipelineData();
 *    const proposalCards = useProposalsData();
 *    const funnelData = useFunnelData();
 *
 * 3. Adicionar uma nova aba no Tabs existente ou substituir a estrutura atual:
 *    <TabsContent value="pipeline">
 *      <SalesFunnel stages={funnelData} />
 *      <SalesPipeline
 *        stages={pipelineStages}
 *        onMoveStage={handleMoveStage}
 *        onViewOpportunity={handleViewOpportunity}
 *        onContactBuyer={handleContactBuyer}
 *      />
 *    </TabsContent>
 *
 * 4. Para a aba de propostas:
 *    <TabsContent value="proposals">
 *      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 *        {proposalCards.map(proposal => (
 *          <ProposalCard
 *            key={proposal.id}
 *            {...proposal}
 *            onAccept={handleAcceptProposal}
 *            onCounterOffer={handleCounterOffer}
 *            onReject={handleRejectProposal}
 *            onViewDetails={handleViewDetails}
 *          />
 *        ))}
 *      </div>
 *    </TabsContent>
 */

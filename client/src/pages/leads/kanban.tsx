import { useState } from "react";
import { useImobi, Lead, LeadStatus } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Phone, Mail, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: "new", label: "Novo", color: "bg-blue-500" },
  { id: "qualification", label: "Qualificação", color: "bg-indigo-500" },
  { id: "visit", label: "Visita", color: "bg-orange-500" },
  { id: "proposal", label: "Proposta", color: "bg-purple-500" },
  { id: "contract", label: "Contrato", color: "bg-green-500" },
];

export default function LeadsKanban() {
  const { leads, tenant } = useImobi();

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((l) => l.status === status);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Funil de Vendas</h1>
          <p className="text-muted-foreground">Arraste os leads para avançar no processo</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Lead
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex h-full gap-4 min-w-[1200px]">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex-1 flex flex-col min-w-[280px] bg-secondary/30 rounded-xl border border-border/50">
              <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/50 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <span className="font-semibold text-sm">{column.label}</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 min-w-[20px] justify-center">
                    {getLeadsByStatus(column.id).length}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {getLeadsByStatus(column.id).map((lead) => (
                  <Card key={lead.id} className="cursor-grab active:cursor-grabbing hover-elevate transition-all border-l-4" style={{ borderLeftColor: tenant?.primaryColor }}>
                    <CardHeader className="p-3 pb-2 space-y-0">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="text-[10px] font-normal mb-2 bg-background/50">
                          {lead.source}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Mover para...</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Arquivar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-sm font-medium leading-tight">
                        {lead.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-2 text-xs text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <Mail className="h-3 w-3" />
                         <span className="truncate">{lead.email}</span>
                      </div>
                      {lead.budget && (
                        <div className="mt-2 pt-2 border-t border-border/50 font-medium text-foreground">
                          Orçamento: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumSignificantDigits: 3 }).format(Number(lead.budget))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] opacity-70">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                        {/* Avatar placeholder for owner */}
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                          A
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

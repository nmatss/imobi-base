import { useImobi, LeadStatus } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Phone, Mail, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: "new", label: "Novo", color: "bg-blue-500" },
  { id: "qualification", label: "Qualificação", color: "bg-indigo-500" },
  { id: "visit", label: "Visita", color: "bg-orange-500" },
  { id: "proposal", label: "Proposta", color: "bg-purple-500" },
  { id: "contract", label: "Contrato", color: "bg-green-500" },
];

function formatBudget(budget: string | null) {
  if (!budget) return null;
  const num = parseFloat(budget);
  if (isNaN(num)) return budget;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num);
}

export default function LeadsKanban() {
  const { leads, tenant } = useImobi();

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((l) => l.status === status);
  };

  if (leads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 data-testid="text-leads-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Funil de Vendas</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Gerencie seus leads e oportunidades</p>
          </div>
          <Button data-testid="button-new-lead" className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
        <div data-testid="empty-state-leads" className="text-center py-16 sm:py-20 bg-muted/20 rounded-xl border border-dashed">
          <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum lead cadastrado</h3>
          <p className="text-muted-foreground mb-4 text-sm px-4">Comece adicionando seu primeiro lead.</p>
          <Button variant="outline">Adicionar Lead</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div>
          <h1 data-testid="text-leads-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Funil de Vendas</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Arraste os leads para avançar no processo</p>
        </div>
        <Button data-testid="button-new-lead" className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Novo Lead
        </Button>
      </div>

      {/* Mobile: Stacked cards */}
      <div className="block sm:hidden space-y-4 overflow-y-auto flex-1 pb-4">
        {COLUMNS.map((column) => {
          const columnLeads = getLeadsByStatus(column.id);
          if (columnLeads.length === 0) return null;
          
          return (
            <div key={column.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <span className="font-semibold text-sm">{column.label}</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {columnLeads.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {columnLeads.map((lead) => (
                  <Card key={lead.id} data-testid={`card-lead-${lead.id}`} className="border-l-4" style={{ borderLeftColor: tenant?.primaryColor }}>
                    <CardHeader className="p-3 pb-2 space-y-0">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="text-[10px] font-normal bg-background/50">
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
                      <CardTitle className="text-sm font-medium leading-tight mt-1">
                        {lead.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.budget && (
                        <div className="font-medium text-foreground pt-1">
                          Orçamento: {formatBudget(lead.budget)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Horizontal kanban */}
      <div className="hidden sm:block flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex h-full gap-4 pb-4 min-w-max">
            {COLUMNS.map((column) => (
              <div key={column.id} className="flex flex-col w-[280px] lg:w-[300px] bg-secondary/30 rounded-xl border border-border/50 shrink-0">
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

                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {getLeadsByStatus(column.id).map((lead) => (
                    <Card key={lead.id} data-testid={`card-lead-${lead.id}`} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: tenant?.primaryColor }}>
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
                            Orçamento: {formatBudget(lead.budget)}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] opacity-70">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </span>
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}

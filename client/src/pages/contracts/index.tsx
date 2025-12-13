import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Send, Check, X, FileCheck, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ContractsPage() {
  const { contracts, leads, properties, tenant } = useImobi();

  const getContractDetails = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return null;
    const lead = leads.find(l => l.id === contract.leadId);
    const property = properties.find(p => p.id === contract.propertyId);
    return { ...contract, lead, property };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-700 border-gray-200";
      case "sent": return "bg-blue-100 text-blue-700 border-blue-200";
      case "signed": return "bg-green-100 text-green-700 border-green-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Rascunho";
      case "sent": return "Enviado";
      case "signed": return "Assinado";
      case "rejected": return "Rejeitado";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Propostas e Contratos</h1>
          <p className="text-muted-foreground">Gerencie documentos e fechamentos</p>
        </div>
        <Button className="gap-2">
          <FileText className="h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      <div className="grid gap-6">
        {contracts.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
            <FileCheck className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma proposta criada</h3>
            <p className="text-muted-foreground mb-4">Comece criando uma proposta para um lead interessado.</p>
            <Button variant="outline">Criar Proposta</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contracts.map((contract) => {
              const details = getContractDetails(contract.id);
              if (!details) return null;

              return (
                <Card key={contract.id} className="hover-elevate transition-all group border-l-4" style={{ borderLeftColor: tenant?.colors.primary }}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold leading-tight">
                        {details.property?.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Ref: {details.property?.id.toUpperCase()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(contract.status)} border shadow-sm`}>
                      {getStatusLabel(contract.status)}
                    </Badge>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="py-2 border-t border-b border-dashed space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{details.lead?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor Proposto:</span>
                        <span className="font-bold text-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data:</span>
                        <span>{new Date(contract.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-2 text-xs">
                        <Download className="w-3 h-3" /> PDF
                      </Button>
                      
                      {contract.status === 'draft' && (
                        <Button size="sm" className="flex-1 gap-2 text-xs">
                          <Send className="w-3 h-3" /> Enviar
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Histórico</DropdownMenuItem>
                          {contract.status === 'sent' && (
                             <>
                               <DropdownMenuItem className="text-green-600">Marcar como Assinado</DropdownMenuItem>
                               <DropdownMenuItem className="text-red-600">Marcar como Rejeitado</DropdownMenuItem>
                             </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

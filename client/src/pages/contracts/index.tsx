import { useState } from "react";
import { useImobi, Contract } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Send, FileCheck, MoreVertical, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

function formatPrice(price: string) {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export default function ContractsPage() {
  const { contracts, leads, properties, tenant, refetchContracts } = useImobi();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: "",
    leadId: "",
    type: "sale",
    value: "",
    terms: "",
  });

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

  const openCreateModal = () => {
    setFormData({
      propertyId: "",
      leadId: "",
      type: "sale",
      value: "",
      terms: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        propertyId: formData.propertyId,
        leadId: formData.leadId,
        type: formData.type,
        value: formData.value,
        terms: formData.terms || null,
        status: "draft",
      };

      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar contrato");
      }

      toast({
        title: "Proposta criada",
        description: "A proposta foi criada com sucesso.",
      });

      setIsModalOpen(false);
      await refetchContracts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (contractId: string, status: "sent" | "signed" | "rejected") => {
    try {
      const payload: any = { status };
      if (status === "signed") {
        payload.signedAt = new Date().toISOString();
      }

      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao atualizar contrato");

      const statusLabels: Record<string, string> = {
        sent: "enviado",
        signed: "assinado",
        rejected: "rejeitado",
      };

      toast({
        title: "Contrato atualizado",
        description: `O contrato foi marcado como ${statusLabels[status]}.`,
      });

      await refetchContracts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-contracts-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Propostas e Contratos</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie documentos e fechamentos</p>
        </div>
        <Button data-testid="button-new-contract" className="gap-2 w-full sm:w-auto" onClick={openCreateModal}>
          <FileText className="h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      <div className="grid gap-6">
        {contracts.length === 0 ? (
          <div data-testid="empty-state-contracts" className="text-center py-16 sm:py-20 bg-muted/20 rounded-xl border border-dashed">
            <FileCheck className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma proposta criada</h3>
            <p className="text-muted-foreground mb-4 text-sm px-4">Comece criando uma proposta para um lead interessado.</p>
            <Button variant="outline" onClick={openCreateModal}>Criar Proposta</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {contracts.map((contract) => {
              const details = getContractDetails(contract.id);
              if (!details) return null;

              return (
                <Card key={contract.id} data-testid={`card-contract-${contract.id}`} className="hover:shadow-lg transition-all group border-l-4" style={{ borderLeftColor: tenant?.primaryColor }}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2 p-3 sm:p-4">
                    <div className="space-y-1 min-w-0 flex-1 mr-2">
                      <CardTitle className="text-sm sm:text-base font-bold leading-tight truncate">
                        {details.property?.title}
                      </CardTitle>
                      <CardDescription className="text-xs truncate">
                        Ref: {details.property?.id.slice(0, 8).toUpperCase()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(contract.status)} border shadow-sm text-xs shrink-0`}>
                      {getStatusLabel(contract.status)}
                    </Badge>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 p-3 sm:p-4 pt-0">
                    <div className="py-2 border-t border-b border-dashed space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium truncate ml-2">{details.lead?.name}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium">{contract.type === "sale" ? "Venda" : "Aluguel"}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-bold text-foreground">
                          {formatPrice(contract.value)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1 sm:gap-2 text-xs">
                        <Download className="w-3 h-3" /> <span className="hidden sm:inline">PDF</span>
                      </Button>
                      
                      {contract.status === 'draft' && (
                        <Button 
                          size="sm" 
                          className="flex-1 gap-1 sm:gap-2 text-xs"
                          onClick={() => handleUpdateStatus(contract.id, "sent")}
                          data-testid={`button-send-contract-${contract.id}`}
                        >
                          <Send className="w-3 h-3" /> <span className="hidden sm:inline">Enviar</span>
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid={`button-contract-menu-${contract.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Histórico</DropdownMenuItem>
                          {contract.status === 'sent' && (
                             <>
                               <DropdownMenuItem 
                                 className="text-green-600"
                                 onClick={() => handleUpdateStatus(contract.id, "signed")}
                               >
                                 Marcar como Assinado
                               </DropdownMenuItem>
                               <DropdownMenuItem 
                                 className="text-red-600"
                                 onClick={() => handleUpdateStatus(contract.id, "rejected")}
                               >
                                 Marcar como Rejeitado
                               </DropdownMenuItem>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-contract">Nova Proposta</DialogTitle>
            <DialogDescription>Crie uma proposta para um imóvel e cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Imóvel *</Label>
              <Select 
                value={formData.propertyId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v }))}
              >
                <SelectTrigger data-testid="select-contract-property">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title} - {formatPrice(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadId">Cliente *</Label>
              <Select 
                value={formData.leadId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, leadId: v }))}
              >
                <SelectTrigger data-testid="select-contract-lead">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger data-testid="select-contract-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="rent">Aluguel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$) *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  data-testid="input-contract-value"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms">Termos/Condições</Label>
              <Textarea
                id="terms"
                data-testid="input-contract-terms"
                value={formData.terms}
                onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                rows={3}
                placeholder="Condições especiais, prazo, forma de pagamento..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.propertyId || !formData.leadId || !formData.value} 
                data-testid="button-submit-contract"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Proposta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

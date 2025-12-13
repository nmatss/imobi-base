import { useState, useEffect } from "react";
import { useImobi, User as UserType } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, FileText, CheckCircle, Plus, Loader2, MoreVertical, Calendar, Building2, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type SaleProposal = {
  id: string;
  tenantId: string;
  propertyId: string;
  leadId: string;
  proposedValue: string;
  validityDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

type PropertySale = {
  id: string;
  tenantId: string;
  propertyId: string;
  buyerLeadId: string;
  sellerId: string | null;
  brokerId: string | null;
  saleValue: string;
  saleDate: string;
  commissionRate: string | null;
  commissionValue: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function VendasPage() {
  const { leads, properties, tenant } = useImobi();
  const { toast } = useToast();
  
  const [proposals, setProposals] = useState<SaleProposal[]>([]);
  const [sales, setSales] = useState<PropertySale[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [proposalForm, setProposalForm] = useState({
    propertyId: "",
    leadId: "",
    proposedValue: "",
    validityDate: "",
    notes: "",
  });
  
  const [saleForm, setSaleForm] = useState({
    propertyId: "",
    buyerLeadId: "",
    brokerId: "",
    saleValue: "",
    saleDate: new Date().toISOString().split("T")[0],
    commissionRate: "6",
    notes: "",
  });

  const fetchData = async () => {
    try {
      const [proposalsRes, salesRes, usersRes] = await Promise.all([
        fetch("/api/sale-proposals", { credentials: "include" }),
        fetch("/api/property-sales", { credentials: "include" }),
        fetch("/api/users", { credentials: "include" }),
      ]);
      
      if (proposalsRes.ok) {
        setProposals(await proposalsRes.json());
      }
      if (salesRes.ok) {
        setSales(await salesRes.json());
      }
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        propertyId: proposalForm.propertyId,
        leadId: proposalForm.leadId,
        proposedValue: proposalForm.proposedValue,
        validityDate: proposalForm.validityDate || null,
        notes: proposalForm.notes || null,
        status: "pending",
      };
      
      const res = await fetch("/api/sale-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar proposta");
      }
      
      toast({
        title: "Proposta criada",
        description: "A proposta de venda foi registrada com sucesso.",
      });
      
      setIsProposalModalOpen(false);
      setProposalForm({ propertyId: "", leadId: "", proposedValue: "", validityDate: "", notes: "" });
      fetchData();
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

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const saleValue = parseFloat(saleForm.saleValue);
      const commissionRate = parseFloat(saleForm.commissionRate) || 6;
      const commissionValue = (saleValue * commissionRate / 100).toFixed(2);
      
      const payload = {
        propertyId: saleForm.propertyId,
        buyerLeadId: saleForm.buyerLeadId,
        brokerId: saleForm.brokerId || null,
        saleValue: saleForm.saleValue,
        saleDate: new Date(saleForm.saleDate).toISOString(),
        commissionRate: saleForm.commissionRate,
        commissionValue: commissionValue,
        notes: saleForm.notes || null,
        status: "completed",
      };
      
      const res = await fetch("/api/property-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao registrar venda");
      }
      
      toast({
        title: "Venda registrada",
        description: "A venda foi registrada com sucesso.",
      });
      
      setIsSaleModalOpen(false);
      setSaleForm({ propertyId: "", buyerLeadId: "", brokerId: "", saleValue: "", saleDate: new Date().toISOString().split("T")[0], commissionRate: "6", notes: "" });
      fetchData();
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

  const handleUpdateProposalStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/sale-proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error("Erro ao atualizar proposta");
      
      toast({
        title: "Status atualizado",
        description: `Proposta marcada como ${status === "accepted" ? "aceita" : status === "rejected" ? "rejeitada" : status}.`,
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      accepted: "bg-green-100 text-green-700 border-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      completed: "bg-blue-100 text-blue-700 border-blue-200",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      accepted: "Aceita",
      rejected: "Rejeitada",
      completed: "Concluída",
    };
    return <Badge className={colors[status] || "bg-gray-100 text-gray-700"} variant="outline">{labels[status] || status}</Badge>;
  };

  const totalSalesValue = sales.reduce((acc, s) => acc + parseFloat(s.saleValue || "0"), 0);
  const totalCommissions = sales.reduce((acc, s) => acc + parseFloat(s.commissionValue || "0"), 0);
  const pendingProposals = proposals.filter(p => p.status === "pending").length;
  const acceptedProposals = proposals.filter(p => p.status === "accepted").length;

  const availableProperties = properties.filter(p => p.status === "available" && p.category === "sale");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground">Gerencie propostas e vendas de imóveis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsProposalModalOpen(true)} data-testid="button-new-proposal">
            <FileText className="h-4 w-4 mr-2" />
            Nova Proposta
          </Button>
          <Button onClick={() => setIsSaleModalOpen(true)} data-testid="button-new-sale">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Venda
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-sales">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalSalesValue)}</div>
            <p className="text-xs text-muted-foreground">{sales.length} vendas realizadas</p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-total-commissions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalCommissions)}</div>
            <p className="text-xs text-muted-foreground">Total de comissões</p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-pending-proposals">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingProposals}</div>
            <p className="text-xs text-muted-foreground">Aguardando resposta</p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-accepted-proposals">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Aceitas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedProposals}</div>
            <p className="text-xs text-muted-foreground">Prontas para fechamento</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="proposals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proposals" data-testid="tab-proposals">Propostas ({proposals.length})</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">Vendas Concluídas ({sales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-4">
          {proposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma proposta</h3>
                <p className="text-muted-foreground mb-4">Crie sua primeira proposta de venda</p>
                <Button onClick={() => setIsProposalModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Proposta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {proposals.map((proposal) => {
                const property = properties.find(p => p.id === proposal.propertyId);
                const lead = leads.find(l => l.id === proposal.leadId);
                return (
                  <Card key={proposal.id} data-testid={`card-proposal-${proposal.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{property?.title || "Imóvel não encontrado"}</span>
                            {getStatusBadge(proposal.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {lead?.name || "Lead não encontrado"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(proposal.createdAt)}
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-primary">
                            {formatPrice(proposal.proposedValue)}
                          </div>
                          {proposal.notes && (
                            <p className="text-sm text-muted-foreground">{proposal.notes}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-proposal-actions-${proposal.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {proposal.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => handleUpdateProposalStatus(proposal.id, "accepted")}>
                                  Marcar como Aceita
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateProposalStatus(proposal.id, "rejected")}>
                                  Marcar como Rejeitada
                                </DropdownMenuItem>
                              </>
                            )}
                            {proposal.status === "accepted" && (
                              <DropdownMenuItem onClick={() => {
                                setSaleForm({
                                  propertyId: proposal.propertyId,
                                  buyerLeadId: proposal.leadId,
                                  brokerId: "",
                                  saleValue: proposal.proposedValue,
                                  saleDate: new Date().toISOString().split("T")[0],
                                  commissionRate: "6",
                                  notes: "",
                                });
                                setIsSaleModalOpen(true);
                              }}>
                                Converter em Venda
                              </DropdownMenuItem>
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
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          {sales.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma venda</h3>
                <p className="text-muted-foreground mb-4">Registre sua primeira venda</p>
                <Button onClick={() => setIsSaleModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Venda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sales.map((sale) => {
                const property = properties.find(p => p.id === sale.propertyId);
                const buyer = leads.find(l => l.id === sale.buyerLeadId);
                const broker = users?.find(u => u.id === sale.brokerId);
                return (
                  <Card key={sale.id} data-testid={`card-sale-${sale.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{property?.title || "Imóvel não encontrado"}</span>
                            <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">Concluída</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Comprador: {buyer?.name || "Não informado"}
                            </span>
                            {broker && (
                              <span>Corretor: {broker.name}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(sale.saleDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Valor da Venda</p>
                              <p className="text-lg font-semibold text-primary">{formatPrice(sale.saleValue)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Comissão ({sale.commissionRate}%)</p>
                              <p className="text-lg font-semibold text-green-600">{formatPrice(sale.commissionValue || "0")}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Proposta de Venda</DialogTitle>
            <DialogDescription>Registre uma proposta de compra para um imóvel</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProposal} className="space-y-4">
            <div className="space-y-2">
              <Label>Imóvel</Label>
              <Select value={proposalForm.propertyId} onValueChange={(v) => setProposalForm({ ...proposalForm, propertyId: v })}>
                <SelectTrigger data-testid="select-proposal-property">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title} - {p.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Lead (Comprador)</Label>
              <Select value={proposalForm.leadId} onValueChange={(v) => setProposalForm({ ...proposalForm, leadId: v })}>
                <SelectTrigger data-testid="select-proposal-lead">
                  <SelectValue placeholder="Selecione o lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} - {l.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Valor Proposto (R$)</Label>
              <Input 
                type="number" 
                value={proposalForm.proposedValue} 
                onChange={(e) => setProposalForm({ ...proposalForm, proposedValue: e.target.value })}
                placeholder="500000"
                required
                data-testid="input-proposal-value"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Validade da Proposta</Label>
              <Input 
                type="date" 
                value={proposalForm.validityDate} 
                onChange={(e) => setProposalForm({ ...proposalForm, validityDate: e.target.value })}
                data-testid="input-proposal-validity"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={proposalForm.notes} 
                onChange={(e) => setProposalForm({ ...proposalForm, notes: e.target.value })}
                placeholder="Condições, forma de pagamento..."
                data-testid="input-proposal-notes"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProposalModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-proposal">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Proposta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Venda</DialogTitle>
            <DialogDescription>Registre uma venda concluída</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSale} className="space-y-4">
            <div className="space-y-2">
              <Label>Imóvel</Label>
              <Select value={saleForm.propertyId} onValueChange={(v) => setSaleForm({ ...saleForm, propertyId: v })}>
                <SelectTrigger data-testid="select-sale-property">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {properties.filter(p => p.category === "sale").map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title} - {p.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Comprador (Lead)</Label>
              <Select value={saleForm.buyerLeadId} onValueChange={(v) => setSaleForm({ ...saleForm, buyerLeadId: v })}>
                <SelectTrigger data-testid="select-sale-buyer">
                  <SelectValue placeholder="Selecione o comprador" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} - {l.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Corretor Responsável</Label>
              <Select value={saleForm.brokerId} onValueChange={(v) => setSaleForm({ ...saleForm, brokerId: v })}>
                <SelectTrigger data-testid="select-sale-broker">
                  <SelectValue placeholder="Selecione o corretor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor da Venda (R$)</Label>
                <Input 
                  type="number" 
                  value={saleForm.saleValue} 
                  onChange={(e) => setSaleForm({ ...saleForm, saleValue: e.target.value })}
                  placeholder="500000"
                  required
                  data-testid="input-sale-value"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Taxa de Comissão (%)</Label>
                <Input 
                  type="number" 
                  value={saleForm.commissionRate} 
                  onChange={(e) => setSaleForm({ ...saleForm, commissionRate: e.target.value })}
                  placeholder="6"
                  step="0.1"
                  data-testid="input-sale-commission"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Data da Venda</Label>
              <Input 
                type="date" 
                value={saleForm.saleDate} 
                onChange={(e) => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                required
                data-testid="input-sale-date"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={saleForm.notes} 
                onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                placeholder="Detalhes da negociação..."
                data-testid="input-sale-notes"
              />
            </div>
            
            {saleForm.saleValue && saleForm.commissionRate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Comissão calculada:</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatPrice(parseFloat(saleForm.saleValue) * parseFloat(saleForm.commissionRate) / 100)}
                </p>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSaleModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-sale">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Registrar Venda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

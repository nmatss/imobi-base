import { useState, useEffect } from "react";
import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Home, 
  Users, 
  FileText, 
  DollarSign, 
  Plus, 
  Loader2, 
  MoreVertical, 
  Phone, 
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart2,
  Download,
  Filter,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Owner = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string;
  cpfCnpj: string | null;
  address: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  pixKey: string | null;
  notes: string | null;
  createdAt: string;
};

type Renter = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string;
  cpfCnpj: string | null;
  rg: string | null;
  profession: string | null;
  income: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  createdAt: string;
};

type RentalContract = {
  id: string;
  tenantId: string;
  propertyId: string;
  ownerId: string;
  renterId: string;
  rentValue: string;
  condoFee: string | null;
  iptuValue: string | null;
  dueDay: number;
  startDate: string;
  endDate: string;
  adjustmentIndex: string | null;
  depositValue: string | null;
  administrationFee: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

type RentalPayment = {
  id: string;
  tenantId: string;
  rentalContractId: string;
  referenceMonth: string;
  dueDate: string;
  rentValue: string;
  condoFee: string | null;
  iptuValue: string | null;
  extraCharges: string | null;
  discounts: string | null;
  totalValue: string;
  paidValue: string | null;
  paidDate: string | null;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
};

function formatPrice(price: string | null) {
  if (!price) return "-";
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('pt-BR');
}

export default function RentalsPage() {
  const { properties, tenant } = useImobi();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("owners");
  
  const [owners, setOwners] = useState<Owner[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isRenterModalOpen, setIsRenterModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [ownerForm, setOwnerForm] = useState({
    name: "", email: "", phone: "", cpfCnpj: "", address: "",
    bankName: "", bankAgency: "", bankAccount: "", pixKey: "", notes: ""
  });
  
  const [renterForm, setRenterForm] = useState({
    name: "", email: "", phone: "", cpfCnpj: "", rg: "", profession: "",
    income: "", address: "", emergencyContact: "", emergencyPhone: "", notes: ""
  });
  
  const [contractForm, setContractForm] = useState({
    propertyId: "", ownerId: "", renterId: "", rentValue: "", condoFee: "",
    iptuValue: "", dueDay: "10", startDate: "", endDate: "", adjustmentIndex: "IGPM",
    depositValue: "", administrationFee: "10", notes: ""
  });
  
  const [paymentForm, setPaymentForm] = useState({
    rentalContractId: "", referenceMonth: "", dueDate: "", rentValue: "",
    condoFee: "", iptuValue: "", extraCharges: "", discounts: "", totalValue: "", notes: ""
  });

  const [reportFilters, setReportFilters] = useState({
    ownerId: "",
    renterId: "",
    status: "",
    startDate: "",
    endDate: ""
  });
  const [ownerReport, setOwnerReport] = useState<any[]>([]);
  const [renterReport, setRenterReport] = useState<any[]>([]);
  const [paymentsReport, setPaymentsReport] = useState<any[]>([]);
  const [overdueReport, setOverdueReport] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ownersRes, rentersRes, contractsRes, paymentsRes] = await Promise.all([
        fetch("/api/owners", { credentials: "include" }),
        fetch("/api/renters", { credentials: "include" }),
        fetch("/api/rental-contracts", { credentials: "include" }),
        fetch("/api/rental-payments", { credentials: "include" }),
      ]);
      
      if (ownersRes.ok) setOwners(await ownersRes.json());
      if (rentersRes.ok) setRenters(await rentersRes.json());
      if (contractsRes.ok) setRentalContracts(await contractsRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: ownerForm.name,
          phone: ownerForm.phone,
          email: ownerForm.email || null,
          cpfCnpj: ownerForm.cpfCnpj || null,
          address: ownerForm.address || null,
          bankName: ownerForm.bankName || null,
          bankAgency: ownerForm.bankAgency || null,
          bankAccount: ownerForm.bankAccount || null,
          pixKey: ownerForm.pixKey || null,
          notes: ownerForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar locador");
      toast({ title: "Locador criado", description: "O locador foi cadastrado com sucesso." });
      setIsOwnerModalOpen(false);
      setOwnerForm({ name: "", email: "", phone: "", cpfCnpj: "", address: "", bankName: "", bankAgency: "", bankAccount: "", pixKey: "", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/renters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: renterForm.name,
          phone: renterForm.phone,
          email: renterForm.email || null,
          cpfCnpj: renterForm.cpfCnpj || null,
          rg: renterForm.rg || null,
          profession: renterForm.profession || null,
          income: renterForm.income || null,
          address: renterForm.address || null,
          emergencyContact: renterForm.emergencyContact || null,
          emergencyPhone: renterForm.emergencyPhone || null,
          notes: renterForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar inquilino");
      toast({ title: "Inquilino criado", description: "O inquilino foi cadastrado com sucesso." });
      setIsRenterModalOpen(false);
      setRenterForm({ name: "", email: "", phone: "", cpfCnpj: "", rg: "", profession: "", income: "", address: "", emergencyContact: "", emergencyPhone: "", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rental-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          propertyId: contractForm.propertyId,
          ownerId: contractForm.ownerId,
          renterId: contractForm.renterId,
          rentValue: contractForm.rentValue,
          condoFee: contractForm.condoFee || null,
          iptuValue: contractForm.iptuValue || null,
          dueDay: parseInt(contractForm.dueDay),
          startDate: new Date(contractForm.startDate).toISOString(),
          endDate: new Date(contractForm.endDate).toISOString(),
          adjustmentIndex: contractForm.adjustmentIndex || null,
          depositValue: contractForm.depositValue || null,
          administrationFee: contractForm.administrationFee || null,
          notes: contractForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar contrato");
      toast({ title: "Contrato criado", description: "O contrato de aluguel foi criado com sucesso." });
      setIsContractModalOpen(false);
      setContractForm({ propertyId: "", ownerId: "", renterId: "", rentValue: "", condoFee: "", iptuValue: "", dueDay: "10", startDate: "", endDate: "", adjustmentIndex: "IGPM", depositValue: "", administrationFee: "10", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rental-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rentalContractId: paymentForm.rentalContractId,
          referenceMonth: paymentForm.referenceMonth,
          dueDate: new Date(paymentForm.dueDate).toISOString(),
          rentValue: paymentForm.rentValue,
          condoFee: paymentForm.condoFee || null,
          iptuValue: paymentForm.iptuValue || null,
          extraCharges: paymentForm.extraCharges || null,
          discounts: paymentForm.discounts || null,
          totalValue: paymentForm.totalValue,
          notes: paymentForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar pagamento");
      toast({ title: "Pagamento criado", description: "O pagamento foi registrado com sucesso." });
      setIsPaymentModalOpen(false);
      setPaymentForm({ rentalContractId: "", referenceMonth: "", dueDate: "", rentValue: "", condoFee: "", iptuValue: "", extraCharges: "", discounts: "", totalValue: "", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;
      
      const res = await fetch(`/api/rental-payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "paid",
          paidValue: payment.totalValue,
          paidDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar pagamento");
      toast({ title: "Pagamento confirmado", description: "O pagamento foi marcado como pago." });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getPaymentStatusBadge = (status: string, dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    
    if (status === "paid") {
      return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Pago</Badge>;
    }
    if (due < now) {
      return <Badge className="bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Atrasado</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
  };

  const getOwnerName = (ownerId: string) => owners.find(o => o.id === ownerId)?.name || "-";
  const getRenterName = (renterId: string) => renters.find(r => r.id === renterId)?.name || "-";
  const getPropertyTitle = (propertyId: string) => properties.find(p => p.id === propertyId)?.title || "-";

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const params = new URLSearchParams();
      if (reportFilters.ownerId) params.set("ownerId", reportFilters.ownerId);
      if (reportFilters.renterId) params.set("renterId", reportFilters.renterId);
      if (reportFilters.status) params.set("status", reportFilters.status);
      if (reportFilters.startDate) params.set("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.set("endDate", reportFilters.endDate);

      const [ownersRes, rentersRes, paymentsRes, overdueRes] = await Promise.all([
        fetch(`/api/reports/owners?${params}`, { credentials: "include" }),
        fetch(`/api/reports/renters?${params}`, { credentials: "include" }),
        fetch(`/api/reports/payments-detailed?${params}`, { credentials: "include" }),
        fetch("/api/reports/overdue", { credentials: "include" }),
      ]);

      if (ownersRes.ok) setOwnerReport(await ownersRes.json());
      if (rentersRes.ok) setRenterReport(await rentersRes.json());
      if (paymentsRes.ok) setPaymentsReport(await paymentsRes.json());
      if (overdueRes.ok) setOverdueReport(await overdueRes.json());
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({ title: "Erro", description: "Erro ao carregar relatórios", variant: "destructive" });
    } finally {
      setLoadingReports(false);
    }
  };

  const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`${filename}.pdf`);
      toast({ title: "PDF exportado", description: "Relatório salvo com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao exportar PDF", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReports();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-rentals-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Administração de Aluguéis</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie locadores, inquilinos, contratos e pagamentos</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{owners.length}</p>
                <p className="text-sm text-muted-foreground">Locadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{renters.length}</p>
                <p className="text-sm text-muted-foreground">Inquilinos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rentalContracts.filter(c => c.status === "active").length}</p>
                <p className="text-sm text-muted-foreground">Contratos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{payments.filter(p => p.status === "pending").length}</p>
                <p className="text-sm text-muted-foreground">Pagamentos Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="owners" data-testid="tab-owners">Locadores</TabsTrigger>
          <TabsTrigger value="renters" data-testid="tab-renters">Inquilinos</TabsTrigger>
          <TabsTrigger value="contracts" data-testid="tab-contracts">Contratos</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="owners" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="button-new-owner" onClick={() => setIsOwnerModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Locador
            </Button>
          </div>
          {owners.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
              <Home className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-lg font-medium">Nenhum locador cadastrado</h3>
              <p className="text-muted-foreground mb-4 text-sm">Cadastre os proprietários dos imóveis.</p>
              <Button variant="outline" onClick={() => setIsOwnerModalOpen(true)}>Cadastrar Locador</Button>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((owner) => (
                    <TableRow key={owner.id} data-testid={`row-owner-${owner.id}`}>
                      <TableCell className="font-medium">{owner.name}</TableCell>
                      <TableCell>{owner.phone}</TableCell>
                      <TableCell>{owner.email || "-"}</TableCell>
                      <TableCell>{owner.cpfCnpj || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="renters" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="button-new-renter" onClick={() => setIsRenterModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Inquilino
            </Button>
          </div>
          {renters.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
              <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-lg font-medium">Nenhum inquilino cadastrado</h3>
              <p className="text-muted-foreground mb-4 text-sm">Cadastre os inquilinos para os contratos.</p>
              <Button variant="outline" onClick={() => setIsRenterModalOpen(true)}>Cadastrar Inquilino</Button>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Profissão</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renters.map((renter) => (
                    <TableRow key={renter.id} data-testid={`row-renter-${renter.id}`}>
                      <TableCell className="font-medium">{renter.name}</TableCell>
                      <TableCell>{renter.phone}</TableCell>
                      <TableCell>{renter.email || "-"}</TableCell>
                      <TableCell>{renter.profession || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="button-new-rental-contract" onClick={() => setIsContractModalOpen(true)} className="gap-2" disabled={owners.length === 0 || renters.length === 0}>
              <Plus className="h-4 w-4" /> Novo Contrato
            </Button>
          </div>
          {rentalContracts.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-lg font-medium">Nenhum contrato de aluguel</h3>
              <p className="text-muted-foreground mb-4 text-sm">Cadastre locadores e inquilinos primeiro.</p>
              {owners.length > 0 && renters.length > 0 && (
                <Button variant="outline" onClick={() => setIsContractModalOpen(true)}>Criar Contrato</Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {rentalContracts.map((contract) => (
                <Card key={contract.id} data-testid={`card-rental-contract-${contract.id}`} className="hover:shadow-lg transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{getPropertyTitle(contract.propertyId)}</CardTitle>
                        <CardDescription>
                          {getOwnerName(contract.ownerId)} → {getRenterName(contract.renterId)}
                        </CardDescription>
                      </div>
                      <Badge variant={contract.status === "active" ? "default" : "secondary"}>
                        {contract.status === "active" ? "Ativo" : contract.status === "ended" ? "Encerrado" : "Cancelado"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Aluguel</p>
                        <p className="font-semibold">{formatPrice(contract.rentValue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vencimento</p>
                        <p className="font-medium">Dia {contract.dueDay}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Início</p>
                        <p className="font-medium">{formatDate(contract.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Término</p>
                        <p className="font-medium">{formatDate(contract.endDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="button-new-payment" onClick={() => setIsPaymentModalOpen(true)} className="gap-2" disabled={rentalContracts.length === 0}>
              <Plus className="h-4 w-4" /> Novo Pagamento
            </Button>
          </div>
          {payments.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-lg font-medium">Nenhum pagamento registrado</h3>
              <p className="text-muted-foreground mb-4 text-sm">Registre os pagamentos dos aluguéis.</p>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-medium">{payment.referenceMonth}</TableCell>
                      <TableCell>{formatDate(payment.dueDate)}</TableCell>
                      <TableCell>{formatPrice(payment.totalValue)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(payment.status, payment.dueDate)}</TableCell>
                      <TableCell>
                        {payment.status === "pending" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleMarkAsPaid(payment.id)}
                            data-testid={`button-mark-paid-${payment.id}`}
                          >
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Filtros</CardTitle>
                </div>
                <Button onClick={fetchReports} disabled={loadingReports} data-testid="button-apply-filters">
                  {loadingReports ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Aplicar Filtros
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Locador</Label>
                  <Select value={reportFilters.ownerId} onValueChange={(v) => setReportFilters(prev => ({ ...prev, ownerId: v === "all" ? "" : v }))}>
                    <SelectTrigger data-testid="select-report-owner"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inquilino</Label>
                  <Select value={reportFilters.renterId} onValueChange={(v) => setReportFilters(prev => ({ ...prev, renterId: v === "all" ? "" : v }))}>
                    <SelectTrigger data-testid="select-report-renter"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={reportFilters.status} onValueChange={(v) => setReportFilters(prev => ({ ...prev, status: v === "all" ? "" : v }))}>
                    <SelectTrigger data-testid="select-report-status"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pagos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input type="date" value={reportFilters.startDate} onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))} data-testid="input-report-start-date" />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input type="date" value={reportFilters.endDate} onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))} data-testid="input-report-end-date" />
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingReports ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card id="report-owners">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">Performance por Locador</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportToPDF("report-owners", "relatorio-locadores")} data-testid="button-export-owners">
                      <Download className="h-4 w-4 mr-2" /> Exportar PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {ownerReport.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Locador</TableHead>
                          <TableHead>Contratos Ativos</TableHead>
                          <TableHead>Total Recebido</TableHead>
                          <TableHead>Total Pendente</TableHead>
                          <TableHead>Taxa Adimplência</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ownerReport.map((row: any) => (
                          <TableRow key={row.ownerId} data-testid={`row-report-owner-${row.ownerId}`}>
                            <TableCell className="font-medium">{row.ownerName}</TableCell>
                            <TableCell>{row.activeContracts}</TableCell>
                            <TableCell className="text-green-600">{formatPrice(String(row.totalReceived))}</TableCell>
                            <TableCell className="text-orange-600">{formatPrice(String(row.totalPending))}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {row.paymentRate >= 80 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                )}
                                <span className={row.paymentRate >= 80 ? "text-green-600" : "text-red-600"}>
                                  {row.paymentRate?.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card id="report-renters">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg">Performance por Inquilino</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportToPDF("report-renters", "relatorio-inquilinos")} data-testid="button-export-renters">
                      <Download className="h-4 w-4 mr-2" /> Exportar PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renterReport.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Inquilino</TableHead>
                          <TableHead>Contratos Ativos</TableHead>
                          <TableHead>Total Pago</TableHead>
                          <TableHead>Total Pendente</TableHead>
                          <TableHead>Média Atraso (dias)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renterReport.map((row: any) => (
                          <TableRow key={row.renterId} data-testid={`row-report-renter-${row.renterId}`}>
                            <TableCell className="font-medium">{row.renterName}</TableCell>
                            <TableCell>{row.activeContracts}</TableCell>
                            <TableCell className="text-green-600">{formatPrice(String(row.totalPaid))}</TableCell>
                            <TableCell className="text-orange-600">{formatPrice(String(row.totalPending))}</TableCell>
                            <TableCell>
                              <span className={row.avgDelayDays > 5 ? "text-red-600" : "text-green-600"}>
                                {row.avgDelayDays?.toFixed(1) || "0"} dias
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card id="report-payments">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg">Pagamentos Detalhados</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportToPDF("report-payments", "relatorio-pagamentos")} data-testid="button-export-payments">
                      <Download className="h-4 w-4 mr-2" /> Exportar PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {paymentsReport.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referência</TableHead>
                          <TableHead>Imóvel</TableHead>
                          <TableHead>Inquilino</TableHead>
                          <TableHead>Locador</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsReport.slice(0, 20).map((row: any) => (
                          <TableRow key={row.paymentId} data-testid={`row-report-payment-${row.paymentId}`}>
                            <TableCell className="font-medium">{row.referenceMonth}</TableCell>
                            <TableCell>{row.propertyTitle}</TableCell>
                            <TableCell>{row.renterName}</TableCell>
                            <TableCell>{row.ownerName}</TableCell>
                            <TableCell>{formatDate(row.dueDate)}</TableCell>
                            <TableCell>{formatPrice(String(row.totalValue))}</TableCell>
                            <TableCell>{getPaymentStatusBadge(row.status, row.dueDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {paymentsReport.length > 20 && (
                    <p className="text-muted-foreground text-center text-sm mt-4">Mostrando 20 de {paymentsReport.length} registros</p>
                  )}
                </CardContent>
              </Card>

              <Card id="report-overdue">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <CardTitle className="text-lg">Inadimplência</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportToPDF("report-overdue", "relatorio-inadimplencia")} data-testid="button-export-overdue">
                      <Download className="h-4 w-4 mr-2" /> Exportar PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!overdueReport ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-orange-200 bg-orange-50">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-orange-600">{formatPrice(String(overdueReport.range0to30?.total || 0))}</p>
                              <p className="text-sm text-muted-foreground mt-1">0 a 30 dias</p>
                              <p className="text-xs text-muted-foreground">{overdueReport.range0to30?.count || 0} pagamentos</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-red-200 bg-red-50">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-red-600">{formatPrice(String(overdueReport.range31to60?.total || 0))}</p>
                              <p className="text-sm text-muted-foreground mt-1">31 a 60 dias</p>
                              <p className="text-xs text-muted-foreground">{overdueReport.range31to60?.count || 0} pagamentos</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-red-400 bg-red-100">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-red-700">{formatPrice(String(overdueReport.range61plus?.total || 0))}</p>
                              <p className="text-sm text-muted-foreground mt-1">61+ dias</p>
                              <p className="text-xs text-muted-foreground">{overdueReport.range61plus?.count || 0} pagamentos</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      {overdueReport.details && overdueReport.details.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Inquilino</TableHead>
                              <TableHead>Imóvel</TableHead>
                              <TableHead>Referência</TableHead>
                              <TableHead>Vencimento</TableHead>
                              <TableHead>Dias Atraso</TableHead>
                              <TableHead>Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {overdueReport.details.slice(0, 10).map((row: any, idx: number) => (
                              <TableRow key={idx} data-testid={`row-overdue-${idx}`}>
                                <TableCell className="font-medium">{row.renterName}</TableCell>
                                <TableCell>{row.propertyTitle}</TableCell>
                                <TableCell>{row.referenceMonth}</TableCell>
                                <TableCell>{formatDate(row.dueDate)}</TableCell>
                                <TableCell className="text-red-600 font-semibold">{row.daysOverdue} dias</TableCell>
                                <TableCell>{formatPrice(String(row.totalValue))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isOwnerModalOpen} onOpenChange={setIsOwnerModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Locador</DialogTitle>
            <DialogDescription>Cadastre um proprietário de imóvel.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOwner} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input value={ownerForm.name} onChange={(e) => setOwnerForm(prev => ({ ...prev, name: e.target.value }))} required data-testid="input-owner-name" />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={ownerForm.phone} onChange={(e) => setOwnerForm(prev => ({ ...prev, phone: e.target.value }))} required data-testid="input-owner-phone" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={ownerForm.email} onChange={(e) => setOwnerForm(prev => ({ ...prev, email: e.target.value }))} data-testid="input-owner-email" />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input value={ownerForm.cpfCnpj} onChange={(e) => setOwnerForm(prev => ({ ...prev, cpfCnpj: e.target.value }))} data-testid="input-owner-cpf" />
              </div>
              <div className="space-y-2">
                <Label>PIX</Label>
                <Input value={ownerForm.pixKey} onChange={(e) => setOwnerForm(prev => ({ ...prev, pixKey: e.target.value }))} data-testid="input-owner-pix" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOwnerModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || !ownerForm.name || !ownerForm.phone} data-testid="button-submit-owner">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenterModalOpen} onOpenChange={setIsRenterModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Inquilino</DialogTitle>
            <DialogDescription>Cadastre um inquilino.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRenter} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input value={renterForm.name} onChange={(e) => setRenterForm(prev => ({ ...prev, name: e.target.value }))} required data-testid="input-renter-name" />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={renterForm.phone} onChange={(e) => setRenterForm(prev => ({ ...prev, phone: e.target.value }))} required data-testid="input-renter-phone" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={renterForm.email} onChange={(e) => setRenterForm(prev => ({ ...prev, email: e.target.value }))} data-testid="input-renter-email" />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input value={renterForm.cpfCnpj} onChange={(e) => setRenterForm(prev => ({ ...prev, cpfCnpj: e.target.value }))} data-testid="input-renter-cpf" />
              </div>
              <div className="space-y-2">
                <Label>Profissão</Label>
                <Input value={renterForm.profession} onChange={(e) => setRenterForm(prev => ({ ...prev, profession: e.target.value }))} data-testid="input-renter-profession" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenterModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || !renterForm.name || !renterForm.phone} data-testid="button-submit-renter">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Contrato de Aluguel</DialogTitle>
            <DialogDescription>Crie um contrato vinculando imóvel, locador e inquilino.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateContract} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Imóvel *</Label>
                <Select value={contractForm.propertyId} onValueChange={(v) => setContractForm(prev => ({ ...prev, propertyId: v }))}>
                  <SelectTrigger data-testid="select-contract-property"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Locador *</Label>
                <Select value={contractForm.ownerId} onValueChange={(v) => setContractForm(prev => ({ ...prev, ownerId: v }))}>
                  <SelectTrigger data-testid="select-contract-owner"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Inquilino *</Label>
                <Select value={contractForm.renterId} onValueChange={(v) => setContractForm(prev => ({ ...prev, renterId: v }))}>
                  <SelectTrigger data-testid="select-contract-renter"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {renters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor do Aluguel *</Label>
                <Input type="number" step="0.01" value={contractForm.rentValue} onChange={(e) => setContractForm(prev => ({ ...prev, rentValue: e.target.value }))} required data-testid="input-contract-rent" />
              </div>
              <div className="space-y-2">
                <Label>Dia Vencimento *</Label>
                <Input type="number" min="1" max="31" value={contractForm.dueDay} onChange={(e) => setContractForm(prev => ({ ...prev, dueDay: e.target.value }))} required data-testid="input-contract-due-day" />
              </div>
              <div className="space-y-2">
                <Label>Início *</Label>
                <Input type="date" value={contractForm.startDate} onChange={(e) => setContractForm(prev => ({ ...prev, startDate: e.target.value }))} required data-testid="input-contract-start" />
              </div>
              <div className="space-y-2">
                <Label>Término *</Label>
                <Input type="date" value={contractForm.endDate} onChange={(e) => setContractForm(prev => ({ ...prev, endDate: e.target.value }))} required data-testid="input-contract-end" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsContractModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || !contractForm.propertyId || !contractForm.ownerId || !contractForm.renterId || !contractForm.rentValue} data-testid="button-submit-rental-contract">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Contrato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Pagamento</DialogTitle>
            <DialogDescription>Registre um pagamento de aluguel.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Contrato *</Label>
                <Select value={paymentForm.rentalContractId} onValueChange={(v) => {
                  const contract = rentalContracts.find(c => c.id === v);
                  setPaymentForm(prev => ({
                    ...prev,
                    rentalContractId: v,
                    rentValue: contract?.rentValue || "",
                    condoFee: contract?.condoFee || "",
                    iptuValue: contract?.iptuValue || "",
                    totalValue: String(Number(contract?.rentValue || 0) + Number(contract?.condoFee || 0) + Number(contract?.iptuValue || 0))
                  }));
                }}>
                  <SelectTrigger data-testid="select-payment-contract"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {rentalContracts.filter(c => c.status === "active").map(c => (
                      <SelectItem key={c.id} value={c.id}>{getPropertyTitle(c.propertyId)} - {getRenterName(c.renterId)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês Referência *</Label>
                <Input placeholder="Ex: 2024-01" value={paymentForm.referenceMonth} onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceMonth: e.target.value }))} required data-testid="input-payment-month" />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={paymentForm.dueDate} onChange={(e) => setPaymentForm(prev => ({ ...prev, dueDate: e.target.value }))} required data-testid="input-payment-due" />
              </div>
              <div className="space-y-2">
                <Label>Valor Total *</Label>
                <Input type="number" step="0.01" value={paymentForm.totalValue} onChange={(e) => setPaymentForm(prev => ({ ...prev, totalValue: e.target.value }))} required data-testid="input-payment-total" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || !paymentForm.rentalContractId || !paymentForm.referenceMonth || !paymentForm.totalValue} data-testid="button-submit-payment">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

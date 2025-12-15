import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Search,
  MoreVertical,
  Phone,
  Mail,
  FileText,
  MessageCircle,
  History,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Renter, RentalContract, RentalPayment } from "../../types";
import { formatPrice } from "../../types";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";

interface InquilinosTabProps {
  renters: Renter[];
  contracts: RentalContract[];
  payments: RentalPayment[];
  onCreateRenter: () => void;
  onViewRenter: (renter: Renter) => void;
  onEditRenter: (renter: Renter) => void;
  onSendCollection: (renter: Renter) => void;
  loading?: boolean;
}

export function InquilinosTab({
  renters,
  contracts,
  payments,
  onCreateRenter,
  onViewRenter,
  onEditRenter,
  onSendCollection,
  loading,
}: InquilinosTabProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedRenter, setSelectedRenter] = useState<Renter | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const filteredRenters = renters.filter((renter) =>
    renter.name.toLowerCase().includes(searchText.toLowerCase()) ||
    renter.cpfCnpj?.toLowerCase().includes(searchText.toLowerCase()) ||
    renter.phone.includes(searchText)
  );

  // Compute stats for each renter
  const rentersWithStats = filteredRenters.map((renter) => {
    const renterContracts = contracts.filter((c) => c.renterId === renter.id);
    const activeContracts = renterContracts.filter((c) => c.status === "active");
    const contractIds = renterContracts.map((c) => c.id);
    const renterPayments = payments.filter((p) => contractIds.includes(p.rentalContractId));

    // Calculate total monthly value from active contracts
    const totalMonthlyValue = activeContracts.reduce((sum, c) => {
      return sum + Number(c.rentValue || 0) + Number(c.condoFee || 0) + Number(c.iptuValue || 0);
    }, 0);

    // Check for overdue payments
    const now = new Date();
    const overduePayments = renterPayments.filter(
      (p) => p.status === "pending" && new Date(p.dueDate) < now
    );
    const isDelinquent = overduePayments.length > 0;

    // Calculate average days late for paid payments
    const paidPayments = renterPayments.filter((p) => p.status === "paid" && p.paidDate);
    let avgDaysLate = 0;
    if (paidPayments.length > 0) {
      const totalDaysLate = paidPayments.reduce((sum, p) => {
        const dueDate = new Date(p.dueDate);
        const paidDate = new Date(p.paidDate!);
        const daysLate = Math.max(0, Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        return sum + daysLate;
      }, 0);
      avgDaysLate = Math.round(totalDaysLate / paidPayments.length);
    }

    return {
      ...renter,
      contracts: renterContracts,
      activeContracts: activeContracts.length,
      totalMonthlyValue,
      isDelinquent,
      avgDaysLate,
      overdueCount: overduePayments.length,
    };
  });

  const openHistory = (renter: Renter) => {
    setSelectedRenter(renter);
    setIsHistoryOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar inquilino..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>
        <Button onClick={onCreateRenter} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Novo Inquilino</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Table - Desktop */}
      <div className="hidden sm:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Contratos</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Valor Mensal</TableHead>
                <TableHead className="text-center">Dias Atraso Médio</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : rentersWithStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum inquilino encontrado
                  </TableCell>
                </TableRow>
              ) : (
                rentersWithStats.map((renter) => (
                  <TableRow key={renter.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{renter.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {renter.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{renter.activeContracts}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {renter.isDelinquent ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Inadimplente
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Adimplente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(renter.totalMonthlyValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renter.avgDaysLate > 0 ? (
                        <span className={renter.avgDaysLate > 5 ? "text-red-600" : "text-yellow-600"}>
                          {renter.avgDaysLate} dias
                        </span>
                      ) : (
                        <span className="text-green-600">0 dias</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewRenter(renter)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditRenter(renter)}>
                            <User className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openHistory(renter)}>
                            <History className="h-4 w-4 mr-2" />
                            Ver Histórico
                          </DropdownMenuItem>
                          {renter.isDelinquent && (
                            <DropdownMenuItem onClick={() => onSendCollection(renter)}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Enviar Cobrança
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Cards - Mobile Enhanced */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : rentersWithStats.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum inquilino encontrado
            </CardContent>
          </Card>
        ) : (
          rentersWithStats.map((renter) => (
            <Card key={renter.id} className="rounded-xl border-2 hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">{renter.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {renter.isDelinquent ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Inadimplente
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Adimplente
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewRenter(renter)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditRenter(renter)}>
                        <User className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openHistory(renter)}>
                        <History className="h-4 w-4 mr-2" />
                        Ver Histórico
                      </DropdownMenuItem>
                      {renter.isDelinquent && (
                        <DropdownMenuItem onClick={() => onSendCollection(renter)}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Enviar Cobrança
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{renter.phone}</span>
                  </div>
                  {renter.email && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{renter.email}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valor Mensal Total</span>
                    <span className="text-xl font-bold">{formatPrice(renter.totalMonthlyValue)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{renter.activeContracts}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Contratos Ativos</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${
                    renter.avgDaysLate > 5 ? "bg-red-50" : renter.avgDaysLate > 0 ? "bg-yellow-50" : "bg-green-50"
                  }`}>
                    <p className={`text-2xl font-bold ${
                      renter.avgDaysLate > 5 ? "text-red-600" : renter.avgDaysLate > 0 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {renter.avgDaysLate}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">Dias Atraso Médio</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <WhatsAppButton
                    phone={renter.phone}
                    onClick={() => onSendCollection(renter)}
                    variant="with-text"
                    size="md"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-h-[44px]"
                    onClick={() => window.open(`tel:${renter.phone}`)}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Ligar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* History Sheet */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>Histórico - {selectedRenter?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Funcionalidade de histórico será implementada em breve.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

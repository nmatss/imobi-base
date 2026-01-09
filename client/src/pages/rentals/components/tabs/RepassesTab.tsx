import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  MoreVertical,
  CheckCircle2,
  Clock,
  Download,
  DollarSign,
  Loader2,
  FileText,
  Calendar,
} from "lucide-react";
import type { RentalTransfer, Owner } from "../../types";
import { formatPrice, formatMonth, getStatusColor, getStatusLabel } from "../../types";

interface RepassesTabProps {
  transfers: RentalTransfer[];
  owners: Owner[];
  onGenerateTransfers: (referenceMonth: string) => Promise<void>;
  onMarkAsPaid: (transfer: RentalTransfer) => void;
  onViewTransfer: (transfer: RentalTransfer) => void;
  onExportTransfer: (transfer: RentalTransfer) => void;
  loading?: boolean;
  isGenerating?: boolean;
}

export function RepassesTab({
  transfers,
  owners,
  onGenerateTransfers,
  onMarkAsPaid,
  onViewTransfer,
  onExportTransfer,
  loading,
  isGenerating,
}: RepassesTabProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const ownersMap = new Map(owners.map((o) => [o.id, o]));

  // Enrich transfers with owner data
  const enrichedTransfers = transfers.map((transfer) => ({
    ...transfer,
    owner: ownersMap.get(transfer.ownerId),
  }));

  // Filter transfers
  const filteredTransfers = enrichedTransfers.filter((transfer) => {
    const matchesSearch =
      !searchText ||
      transfer.owner?.name.toLowerCase().includes(searchText.toLowerCase()) ||
      transfer.referenceMonth.includes(searchText);
    const matchesStatus = !statusFilter || transfer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalPending = filteredTransfers
    .filter((t) => t.status === "pending")
    .reduce((sum, t) => sum + Number(t.netAmount || 0), 0);
  const totalPaid = filteredTransfers
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + Number(t.netAmount || 0), 0);

  const handleGenerateTransfers = async () => {
    await onGenerateTransfers(selectedMonth);
    setIsGenerateModalOpen(false);
  };

  // Generate month options for the last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: formatMonth(value) };
  });

  return (
    <div className="space-y-4">
      {/* Summary Cards - Enhanced */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-xl border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">Pendentes</p>
                <p className="text-lg sm:text-xl font-bold text-orange-600 truncate">{formatPrice(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">Pagos</p>
                <p className="text-lg sm:text-xl font-bold text-green-600 truncate">{formatPrice(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por locador ou mês..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 min-h-[44px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsGenerateModalOpen(true)} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Gerar Repasses</span>
          <span className="sm:hidden">Gerar</span>
        </Button>
      </div>

      {/* Table - Desktop */}
      <div className="hidden sm:block">
        <Card>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Locador</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Taxa Admin</TableHead>
                    <TableHead className="text-right">Deduções</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum repasse encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>
                      <p className="font-medium">{transfer.owner?.name || "N/A"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatMonth(transfer.referenceMonth)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(transfer.grossAmount)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{formatPrice(transfer.administrationFee)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{formatPrice(
                        Number(transfer.maintenanceDeductions || 0) +
                          Number(transfer.otherDeductions || 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatPrice(transfer.netAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getStatusColor(transfer.status)}>
                        {transfer.status === "paid" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {getStatusLabel(transfer.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewTransfer(transfer)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {transfer.status === "pending" && (
                            <DropdownMenuItem onClick={() => onMarkAsPaid(transfer)}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Marcar como Pago
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onExportTransfer(transfer)}>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>

      {/* Cards - Mobile Enhanced */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : filteredTransfers.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum repasse encontrado
            </CardContent>
          </Card>
        ) : (
          filteredTransfers.map((transfer) => (
            <Card key={transfer.id} className="rounded-xl border-2 hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">{transfer.owner?.name || "N/A"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {formatMonth(transfer.referenceMonth)}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(transfer.status)}`}>
                        {transfer.status === "paid" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {getStatusLabel(transfer.status)}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewTransfer(transfer)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      {transfer.status === "pending" && (
                        <DropdownMenuItem onClick={() => onMarkAsPaid(transfer)}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Marcar como Pago
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onExportTransfer(transfer)}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <span className="text-xs text-blue-700 font-medium">Valor Bruto</span>
                    <span className="text-base font-bold text-blue-600">{formatPrice(transfer.grossAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <span className="text-xs text-red-700 font-medium">Total Deduções</span>
                    <span className="text-base font-bold text-red-600">
                      -{formatPrice(
                        Number(transfer.administrationFee || 0) +
                          Number(transfer.maintenanceDeductions || 0) +
                          Number(transfer.otherDeductions || 0)
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200">
                    <span className="text-sm text-green-700 font-semibold">Valor Líquido</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(transfer.netAmount)}
                    </span>
                  </div>
                </div>

                {transfer.status === "pending" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700"
                      onClick={() => onMarkAsPaid(transfer)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Marcar Pago
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] p-0"
                      onClick={() => onExportTransfer(transfer)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Generate Transfers Modal */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerar Repasses do Mês</DialogTitle>
            <DialogDescription>
              Selecione o mês de referência para gerar os repasses de todos os locadores.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateTransfers} disabled={isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gerar Repasses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

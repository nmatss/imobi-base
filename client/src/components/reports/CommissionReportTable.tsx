import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/report-generators";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Home,
  MoreHorizontal,
  Receipt,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Commission {
  id: string;
  date: string;
  type: "sale" | "rental";
  propertyTitle: string;
  propertyAddress?: string;
  clientName: string;
  transactionValue: string | number;
  commissionRate: string | number;
  commissionValue: string | number;
  brokerName: string;
  brokerId?: string;
  status: "pending" | "paid";
  createdAt?: string;
}

interface CommissionReportTableProps {
  commissions: Commission[];
  onViewReceipt: (commission: Commission) => void;
  onMarkAsPaid?: (ids: string[]) => void;
  onApprove?: (ids: string[]) => void;
  selectable?: boolean;
}

type SortField = "date" | "value" | "commission" | "broker" | "status";
type SortOrder = "asc" | "desc";

export default function CommissionReportTable({
  commissions,
  onViewReceipt,
  onMarkAsPaid,
  onApprove,
  selectable = false,
}: CommissionReportTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Sorting logic
  const sortedCommissions = useMemo(() => {
    const sorted = [...commissions].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "value":
          comparison =
            parseFloat(String(a.transactionValue)) -
            parseFloat(String(b.transactionValue));
          break;
        case "commission":
          comparison =
            parseFloat(String(a.commissionValue)) -
            parseFloat(String(b.commissionValue));
          break;
        case "broker":
          comparison = a.brokerName.localeCompare(b.brokerName);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [commissions, sortField, sortOrder]);

  // Calculate totals
  const totals = useMemo(() => {
    const all = commissions.reduce(
      (sum, c) => sum + parseFloat(String(c.commissionValue)),
      0
    );
    const pending = commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + parseFloat(String(c.commissionValue)), 0);
    const paid = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + parseFloat(String(c.commissionValue)), 0);

    return { all, pending, paid };
  }, [commissions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === commissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(commissions.map((c) => c.id)));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Batch Actions */}
      {selectable && selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedIds.size} comissão(ões) selecionada(s)
          </p>
          <div className="flex gap-2">
            {onApprove && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onApprove(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar Selecionadas
              </Button>
            )}
            {onMarkAsPaid && (
              <Button
                size="sm"
                onClick={() => {
                  onMarkAsPaid(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Pagas
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-3">
        {sortedCommissions.map((commission) => (
          <Card key={commission.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {selectable && (
                      <Checkbox
                        checked={selectedIds.has(commission.id)}
                        onCheckedChange={() => toggleSelect(commission.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {commission.propertyTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(commission.date)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={commission.status === "paid" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {commission.status === "paid" ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Pago
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </>
                    )}
                  </Badge>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium truncate">{commission.clientName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Corretor</p>
                    <p className="font-medium truncate">{commission.brokerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Transação</p>
                    <p className="font-medium">
                      {formatCurrency(commission.transactionValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taxa</p>
                    <p className="font-medium">{commission.commissionRate}%</p>
                  </div>
                </div>

                {/* Commission Value */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Comissão</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(commission.commissionValue)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {commission.type === "sale" ? (
                        <>
                          <Building2 className="h-3 w-3 mr-1" />
                          Venda
                        </>
                      ) : (
                        <>
                          <Home className="h-3 w-3 mr-1" />
                          Locação
                        </>
                      )}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewReceipt(commission)}
                    >
                      <Receipt className="h-3 w-3 mr-1" />
                      Recibo
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto -mx-4 lg:mx-0 rounded-lg border">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[900px]">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="text-left text-xs font-medium text-muted-foreground">
              {selectable && (
                <th className="p-3 w-12">
                  <Checkbox
                    checked={
                      commissions.length > 0 &&
                      selectedIds.size === commissions.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
              )}
              <th
                className="p-3 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center gap-1">
                  Data
                  <SortIcon field="date" />
                </div>
              </th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Imóvel</th>
              <th className="p-3">Cliente</th>
              <th
                className="p-3 text-right cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("value")}
              >
                <div className="flex items-center justify-end gap-1">
                  Valor
                  <SortIcon field="value" />
                </div>
              </th>
              <th className="p-3 text-right">Taxa</th>
              <th
                className="p-3 text-right cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("commission")}
              >
                <div className="flex items-center justify-end gap-1">
                  Comissão
                  <SortIcon field="commission" />
                </div>
              </th>
              <th
                className="p-3 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("broker")}
              >
                <div className="flex items-center gap-1">
                  Corretor
                  <SortIcon field="broker" />
                </div>
              </th>
              <th
                className="p-3 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedCommissions.map((commission) => (
              <tr
                key={commission.id}
                className="text-sm hover:bg-muted/30 transition-colors"
              >
                {selectable && (
                  <td className="p-3">
                    <Checkbox
                      checked={selectedIds.has(commission.id)}
                      onCheckedChange={() => toggleSelect(commission.id)}
                    />
                  </td>
                )}
                <td className="p-3 whitespace-nowrap">
                  {formatDate(commission.date)}
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">
                    {commission.type === "sale" ? (
                      <>
                        <Building2 className="h-3 w-3 mr-1" />
                        Venda
                      </>
                    ) : (
                      <>
                        <Home className="h-3 w-3 mr-1" />
                        Locação
                      </>
                    )}
                  </Badge>
                </td>
                <td className="p-3 max-w-xs">
                  <div className="truncate font-medium">
                    {commission.propertyTitle}
                  </div>
                  {commission.propertyAddress && (
                    <div className="text-xs text-muted-foreground truncate">
                      {commission.propertyAddress}
                    </div>
                  )}
                </td>
                <td className="p-3 truncate max-w-[150px]">
                  {commission.clientName}
                </td>
                <td className="p-3 text-right whitespace-nowrap font-medium">
                  {formatCurrency(commission.transactionValue)}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {commission.commissionRate}%
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <span className="font-bold text-green-600">
                    {formatCurrency(commission.commissionValue)}
                  </span>
                </td>
                <td className="p-3 truncate max-w-[120px]">
                  {commission.brokerName}
                </td>
                <td className="p-3">
                  <Badge
                    variant={commission.status === "paid" ? "default" : "secondary"}
                    className="gap-1"
                  >
                    {commission.status === "paid" ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Pago
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        Pendente
                      </>
                    )}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewReceipt(commission)}>
                        <Receipt className="h-4 w-4 mr-2" />
                        Ver Recibo
                      </DropdownMenuItem>
                      {commission.status === "pending" && onMarkAsPaid && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onMarkAsPaid([commission.id])}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Pago
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals Row */}
          <tfoot className="border-t-2 bg-muted/50 font-semibold">
            <tr className="text-sm">
              <td
                colSpan={selectable ? 8 : 7}
                className="p-3 text-right text-muted-foreground"
              >
                Total Geral:
              </td>
              <td className="p-3 text-right whitespace-nowrap text-green-700">
                {formatCurrency(totals.all)}
              </td>
              <td colSpan={2}></td>
            </tr>
            <tr className="text-xs text-muted-foreground">
              <td
                colSpan={selectable ? 8 : 7}
                className="p-3 text-right"
              >
                Pendente:
              </td>
              <td className="p-3 text-right whitespace-nowrap text-orange-600">
                {formatCurrency(totals.pending)}
              </td>
              <td colSpan={2}></td>
            </tr>
            <tr className="text-xs text-muted-foreground">
              <td
                colSpan={selectable ? 8 : 7}
                className="p-3 text-right"
              >
                Pago:
              </td>
              <td className="p-3 text-right whitespace-nowrap text-green-600">
                {formatCurrency(totals.paid)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

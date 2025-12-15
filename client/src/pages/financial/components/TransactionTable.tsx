import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  CheckCircle,
  Edit,
  Copy,
  ExternalLink,
  ArrowUpCircle,
  ArrowDownCircle,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinanceTransaction } from "../types";
import { TRANSACTION_STATUS_CONFIG, ORIGIN_TYPE_LABELS } from "../types";

type Props = {
  transactions: FinanceTransaction[];
  onMarkAsPaid?: (id: string) => void;
  onEdit?: (transaction: FinanceTransaction) => void;
  onDuplicate?: (transaction: FinanceTransaction) => void;
  onViewOrigin?: (transaction: FinanceTransaction) => void;
  isLoading?: boolean;
  showSearch?: boolean;
  title?: string;
};

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export default function TransactionTable({
  transactions,
  onMarkAsPaid,
  onEdit,
  onDuplicate,
  onViewOrigin,
  isLoading,
  showSearch = true,
  title,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        {title && (
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
            {showSearch && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transações..."
                  className="pl-8 h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {format(new Date(transaction.entryDate), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {transaction.description}
                      </div>
                      {transaction.notes && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {transaction.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.flow === 'in' ? (
                          <>
                            <ArrowUpCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Receita</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownCircle className="h-4 w-4 text-red-600" />
                            <span className="text-red-600">Despesa</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.category ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: transaction.category.color,
                            color: transaction.category.color,
                          }}
                        >
                          {transaction.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TRANSACTION_STATUS_CONFIG[transaction.status]?.color || ""}
                      >
                        {TRANSACTION_STATUS_CONFIG[transaction.status]?.label || transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.originType ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onViewOrigin?.(transaction)}
                        >
                          {ORIGIN_TYPE_LABELS[transaction.originType] || transaction.originType}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">Manual</span>
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
                          {transaction.status === 'scheduled' && onMarkAsPaid && (
                            <>
                              <DropdownMenuItem onClick={() => onMarkAsPaid(transaction.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como pago
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(transaction)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {onDuplicate && (
                            <DropdownMenuItem onClick={() => onDuplicate(transaction)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
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
        </div>

        {/* Mobile: Enhanced Cards */}
        <div className="md:hidden space-y-3 p-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Nenhuma transação encontrada</p>
              <p className="text-xs mt-1">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-0">
                  <div className="p-4 space-y-3">
                    {/* Header: Date and Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {format(new Date(transaction.entryDate), "dd/MM/yy")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`${TRANSACTION_STATUS_CONFIG[transaction.status]?.color || ""} text-[10px] px-1.5 py-0.5`}
                        >
                          {TRANSACTION_STATUS_CONFIG[transaction.status]?.label || transaction.status}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {transaction.status === 'scheduled' && onMarkAsPaid && (
                            <>
                              <DropdownMenuItem onClick={() => onMarkAsPaid(transaction.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como pago
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(transaction)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {onDuplicate && (
                            <DropdownMenuItem onClick={() => onDuplicate(transaction)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Description and Amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {transaction.flow === 'in' ? (
                            <ArrowUpCircle className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-red-600 shrink-0" />
                          )}
                          <p className="font-medium text-sm truncate">
                            {transaction.description}
                          </p>
                        </div>
                        {transaction.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                            {transaction.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-base ${transaction.flow === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.flow === 'in' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Category and Origin Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {transaction.category && (
                        <Badge
                          variant="outline"
                          className="text-xs px-2 py-0.5"
                          style={{
                            borderColor: transaction.category.color,
                            color: transaction.category.color,
                          }}
                        >
                          {transaction.category.name}
                        </Badge>
                      )}
                      {transaction.originType && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {ORIGIN_TYPE_LABELS[transaction.originType]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

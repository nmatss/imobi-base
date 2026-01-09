import React from "react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinanceTransaction } from "../types";
import { TRANSACTION_STATUS_CONFIG, ORIGIN_TYPE_LABELS } from "../types";
import { cn } from "@/lib/utils";

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

const iconA11yProps = { "aria-hidden": true, focusable: false } as const;

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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      transactions
        .map(t => t.category?.name)
        .filter((name): name is string => name !== undefined && name !== null)
    );
    return Array.from(categories);
  }, [transactions]);

  // Apply all filters
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(t => t.flow === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category?.name === categoryFilter);
    }

    return filtered;
  }, [transactions, searchTerm, typeFilter, statusFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all" || searchTerm !== "";

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <Card role="status" aria-label="Carregando transações">
        {title && (
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <div className="h-6 bg-muted animate-pulse rounded w-48" />
          </CardHeader>
        )}
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3">
            {/* Table header skeleton */}
            <div className="grid grid-cols-6 gap-4 pb-2 border-b">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded" />
            </div>
            {/* Table rows skeleton */}
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="grid grid-cols-6 gap-4 items-center">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                <div className="h-6 bg-muted animate-pulse rounded-full w-20" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </div>
            ))}
          </div>
          <span className="sr-only">Carregando transações...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader className="p-3 sm:p-6 pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
              {showSearch && (
                <div className="relative w-full sm:w-64">
                  <Search
                    {...iconA11yProps}
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                  />
                  <Input
                    placeholder="Buscar transações..."
                    className="pl-8 h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleFilterChange();
                    }}
                  />
                </div>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="h-9 w-[140px] text-sm">
                    <Filter {...iconA11yProps} className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="in">Receita</SelectItem>
                    <SelectItem value="out">Despesa</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="h-9 w-[140px] text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="scheduled">Previsto</SelectItem>
                    <SelectItem value="completed">Realizado</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>

                {uniqueCategories.length > 0 && (
                  <Select
                    value={categoryFilter}
                    onValueChange={(value) => {
                      setCategoryFilter(value);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger className="h-9 w-[160px] text-sm">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {uniqueCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 px-2 text-xs"
                  >
                    <X {...iconA11yProps} className="h-3.5 w-3.5 mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* Results count */}
              <div className="text-xs text-muted-foreground">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'resultado' : 'resultados'}
              </div>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <Table className="min-w-[800px]">
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
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
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
                            <ArrowUpCircle
                              {...iconA11yProps}
                              className="h-4 w-4 text-green-600"
                            />
                            <span className="text-green-600">Receita</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownCircle
                              {...iconA11yProps}
                              className="h-4 w-4 text-red-600"
                            />
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
                          <ExternalLink {...iconA11yProps} className="ml-1 h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">Manual</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical {...iconA11yProps} className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {transaction.status === 'scheduled' && onMarkAsPaid && (
                            <>
                              <DropdownMenuItem onClick={() => onMarkAsPaid(transaction.id)}>
                                <CheckCircle {...iconA11yProps} className="mr-2 h-4 w-4" />
                                Marcar como pago
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(transaction)}>
                              <Edit {...iconA11yProps} className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {onDuplicate && (
                            <DropdownMenuItem onClick={() => onDuplicate(transaction)}>
                              <Copy {...iconA11yProps} className="mr-2 h-4 w-4" />
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
        </div>

        {/* Mobile: Enhanced Cards */}
        <div className="md:hidden space-y-3 p-3">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search {...iconA11yProps} className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Nenhuma transação encontrada</p>
              <p className="text-xs mt-1">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            paginatedTransactions.map((transaction) => (
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
                            <MoreVertical {...iconA11yProps} className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {transaction.status === 'scheduled' && onMarkAsPaid && (
                            <>
                              <DropdownMenuItem onClick={() => onMarkAsPaid(transaction.id)}>
                                <CheckCircle {...iconA11yProps} className="mr-2 h-4 w-4" />
                                Marcar como pago
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(transaction)}>
                              <Edit {...iconA11yProps} className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {onDuplicate && (
                            <DropdownMenuItem onClick={() => onDuplicate(transaction)}>
                              <Copy {...iconA11yProps} className="mr-2 h-4 w-4" />
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
                            <ArrowUpCircle
                              {...iconA11yProps}
                              className="h-4 w-4 text-green-600 shrink-0"
                            />
                          ) : (
                            <ArrowDownCircle
                              {...iconA11yProps}
                              className="h-4 w-4 text-red-600 shrink-0"
                            />
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

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-0 py-4 border-t">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Itens por página:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Page info */}
            <div className="text-xs text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft {...iconA11yProps} className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft {...iconA11yProps} className="h-4 w-4" />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="icon"
                      className={cn(
                        "h-8 w-8 text-xs",
                        currentPage === pageNum && "pointer-events-none"
                      )}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="text-muted-foreground px-1">...</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight {...iconA11yProps} className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight {...iconA11yProps} className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

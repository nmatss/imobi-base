import React, { useState } from "react";
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
  Building2,
  DollarSign,
  CreditCard,
  Loader2,
} from "lucide-react";
import type { Owner, RentalContract, RentalTransfer, Property } from "../../types";
import { formatPrice, formatMonth, getStatusColor, getStatusLabel } from "../../types";

interface LocadoresTabProps {
  owners: Owner[];
  contracts: RentalContract[];
  transfers: RentalTransfer[];
  properties: Property[];
  onCreateOwner: () => void;
  onEditOwner: (owner: Owner) => void;
  onGenerateTransfer: (owner: Owner) => void;
  loading?: boolean;
}

export function LocadoresTab({
  owners,
  contracts,
  transfers,
  properties,
  onCreateOwner,
  onEditOwner,
  onGenerateTransfer,
  loading,
}: LocadoresTabProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  const filteredOwners = owners.filter((owner) =>
    owner.name.toLowerCase().includes(searchText.toLowerCase()) ||
    owner.cpfCnpj?.toLowerCase().includes(searchText.toLowerCase()) ||
    owner.phone.includes(searchText)
  );

  // Compute stats for each owner
  const ownersWithStats = filteredOwners.map((owner) => {
    const ownerContracts = contracts.filter((c) => c.ownerId === owner.id);
    const activeContracts = ownerContracts.filter((c) => c.status === "active");
    const propertyIds = new Set(ownerContracts.map((c) => c.propertyId));
    const pendingTransfers = transfers.filter(
      (t) => t.ownerId === owner.id && t.status === "pending"
    );
    const pendingAmount = pendingTransfers.reduce(
      (sum, t) => sum + Number(t.netAmount || 0),
      0
    );

    return {
      ...owner,
      propertyCount: propertyIds.size,
      activeContracts: activeContracts.length,
      pendingTransfer: pendingAmount,
    };
  });

  const openStatement = (owner: Owner) => {
    setSelectedOwner(owner);
    setIsStatementOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar locador..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>
        <Button onClick={onCreateOwner} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Novo Locador</span>
          <span className="sm:hidden">Novo</span>
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
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead className="text-center">Imóveis</TableHead>
                    <TableHead className="text-right">Repasse Pendente</TableHead>
                    <TableHead>Conta Bancária</TableHead>
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
              ) : ownersWithStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum locador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                ownersWithStats.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{owner.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {owner.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{owner.cpfCnpj || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{owner.propertyCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {owner.pendingTransfer > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {formatPrice(owner.pendingTransfer)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {owner.bankName ? (
                        <div className="text-xs">
                          <p>{owner.bankName}</p>
                          <p className="text-muted-foreground">
                            Ag: {owner.bankAgency} | Cc: {owner.bankAccount}
                          </p>
                        </div>
                      ) : owner.pixKey ? (
                        <div className="text-xs">
                          <p>PIX: {owner.pixKey}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Não cadastrada</span>
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
                          <DropdownMenuItem onClick={() => onEditOwner(owner)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStatement(owner)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Ver Extrato
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onGenerateTransfer(owner)}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Gerar Repasse
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
        ) : ownersWithStats.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum locador encontrado
            </CardContent>
          </Card>
        ) : (
          ownersWithStats.map((owner) => (
            <Card key={owner.id} className="rounded-xl border-2 hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">{owner.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{owner.cpfCnpj || "-"}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditOwner(owner)}>
                        <Building2 className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openStatement(owner)}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Ver Extrato
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onGenerateTransfer(owner)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Gerar Repasse
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{owner.phone}</span>
                  </div>
                  {owner.email && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{owner.propertyCount}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Imóveis</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{owner.activeContracts}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Contratos</p>
                  </div>
                </div>

                {owner.pendingTransfer > 0 && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-700 font-medium">Repasse Pendente</span>
                      <span className="text-lg font-bold text-orange-600">
                        {formatPrice(owner.pendingTransfer)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-h-[44px]"
                    onClick={() => {
                      const phone = owner.phone.replace(/\D/g, "");
                      window.open(`https://wa.me/55${phone}`, "_blank");
                    }}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Contato
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-h-[44px]"
                    onClick={() => onGenerateTransfer(owner)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Repasse
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Statement Sheet */}
      <Sheet open={isStatementOpen} onOpenChange={setIsStatementOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Extrato - {selectedOwner?.name}</SheetTitle>
          </SheetHeader>
          {selectedOwner && (() => {
            const ownerTransfers = transfers
              .filter((t) => t.ownerId === selectedOwner.id)
              .sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth));
            const totalPaid = ownerTransfers
              .filter((t) => t.status === "paid")
              .reduce((sum, t) => sum + Number(t.netAmount || 0), 0);
            const totalPending = ownerTransfers
              .filter((t) => t.status === "pending")
              .reduce((sum, t) => sum + Number(t.netAmount || 0), 0);

            return (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-green-700 font-medium">Repassado</p>
                    <p className="text-lg font-bold text-green-600">{formatPrice(totalPaid)}</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <p className="text-xs text-orange-700 font-medium">Pendente</p>
                    <p className="text-lg font-bold text-orange-600">{formatPrice(totalPending)}</p>
                  </div>
                </div>

                {ownerTransfers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum repasse registrado para este locador.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ownerTransfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="text-sm font-medium">{formatMonth(transfer.referenceMonth)}</p>
                          <p className="text-xs text-muted-foreground">
                            Bruto: {formatPrice(Number(transfer.grossAmount || 0))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatPrice(Number(transfer.netAmount || 0))}</p>
                          <Badge className={`${getStatusColor(transfer.status)} text-[10px]`}>
                            {getStatusLabel(transfer.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  DollarSign,
  Home,
  Receipt,
  Award,
  Percent,
  Building2,
} from "lucide-react";
import TransactionTable from "./TransactionTable";
import CommissionsTab from "./CommissionsTab";
import type { FinanceTransaction } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  transactions: FinanceTransaction[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMarkAsPaid?: (id: string) => void;
  onEdit?: (transaction: FinanceTransaction) => void;
  onDuplicate?: (transaction: FinanceTransaction) => void;
  onViewOrigin?: (transaction: FinanceTransaction) => void;
  isLoading?: boolean;
  period?: string;
};

export default function FinancialTabs({
  transactions,
  activeTab,
  onTabChange,
  onMarkAsPaid,
  onEdit,
  onDuplicate,
  onViewOrigin,
  isLoading,
  period,
}: Props) {
  const generalTransactions = transactions;
  const salesTransactions = transactions.filter(t => t.originType === 'sale');
  const rentalsTransactions = transactions.filter(t => t.originType === 'rental');
  const transfersTransactions = transactions.filter(t => t.originType === 'transfer');
  const commissionsTransactions = transactions.filter(t => t.originType === 'commission');

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      {/* Mobile: Horizontal scroll tabs with badges */}
      <div className="md:hidden">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto h-auto p-1 gap-1">
            <TabsTrigger value="general" className="flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[44px]">
              <LayoutGrid className="h-4 w-4" />
              <span className="text-xs">Geral</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                {generalTransactions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[44px]">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Vendas</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                {salesTransactions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rentals" className="flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[44px]">
              <Home className="h-4 w-4" />
              <span className="text-xs">Aluguéis</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                {rentalsTransactions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[44px]">
              <Receipt className="h-4 w-4" />
              <span className="text-xs">Repasses</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                {transfersTransactions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="broker-commissions" className="flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[44px]">
              <Percent className="h-4 w-4" />
              <span className="text-xs">Comissões</span>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Desktop: Full tabs */}
      <div className="hidden md:block">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="general" className="flex items-center gap-2 py-3">
            <LayoutGrid className="h-4 w-4" />
            <span>Geral</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {generalTransactions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2 py-3">
            <Building2 className="h-4 w-4" />
            <span>Vendas</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {salesTransactions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rentals" className="flex items-center gap-2 py-3">
            <Home className="h-4 w-4" />
            <span>Aluguéis</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {rentalsTransactions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2 py-3">
            <Receipt className="h-4 w-4" />
            <span>Repasses</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {transfersTransactions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="broker-commissions" className="flex items-center gap-2 py-3">
            <Percent className="h-4 w-4" />
            <span>Comissões</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="mt-4">
        <TabsContent value="general" className="m-0">
          <TransactionTable
            transactions={generalTransactions}
            onMarkAsPaid={onMarkAsPaid}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onViewOrigin={onViewOrigin}
            isLoading={isLoading}
            title="Todas as Transações"
          />
        </TabsContent>

        <TabsContent value="sales" className="m-0">
          <TransactionTable
            transactions={salesTransactions}
            onMarkAsPaid={onMarkAsPaid}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onViewOrigin={onViewOrigin}
            isLoading={isLoading}
            title="Transações de Vendas"
          />
        </TabsContent>

        <TabsContent value="rentals" className="m-0">
          <TransactionTable
            transactions={rentalsTransactions}
            onMarkAsPaid={onMarkAsPaid}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onViewOrigin={onViewOrigin}
            isLoading={isLoading}
            title="Transações de Aluguéis"
          />
        </TabsContent>

        <TabsContent value="transfers" className="m-0">
          <TransactionTable
            transactions={transfersTransactions}
            onMarkAsPaid={onMarkAsPaid}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onViewOrigin={onViewOrigin}
            isLoading={isLoading}
            title="Repasses a Proprietários"
          />
        </TabsContent>

        <TabsContent value="broker-commissions" className="m-0">
          <CommissionsTab period={period} />
        </TabsContent>
      </div>
    </Tabs>
  );
}

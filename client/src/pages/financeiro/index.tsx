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
import { TrendingUp, TrendingDown, DollarSign, Plus, Loader2, MoreVertical, Calendar, Wallet, ArrowUpCircle, ArrowDownCircle, Tag, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type FinanceCategory = {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  color: string | null;
  isSystemGenerated: boolean;
  createdAt: string;
};

type FinanceEntry = {
  id: string;
  tenantId: string;
  categoryId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  description: string;
  amount: string;
  flow: string;
  entryDate: string;
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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function FinanceiroPage() {
  const { tenant } = useImobi();
  const { toast } = useToast();

  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterFlow, setFilterFlow] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const [entryForm, setEntryForm] = useState({
    categoryId: "",
    description: "",
    amount: "",
    flow: "income",
    entryDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "income",
    color: "#3b82f6",
  });

  const fetchData = async () => {
    try {
      const [categoriesRes, entriesRes] = await Promise.all([
        fetch("/api/finance-categories", { credentials: "include" }),
        fetch("/api/finance-entries", { credentials: "include" }),
      ]);

      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }
      if (entriesRes.ok) {
        setEntries(await entriesRes.json());
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

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        categoryId: entryForm.categoryId || null,
        description: entryForm.description,
        amount: entryForm.amount,
        flow: entryForm.flow,
        entryDate: new Date(entryForm.entryDate).toISOString(),
        notes: entryForm.notes || null,
      };

      const res = await fetch("/api/finance-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar lançamento");
      }

      toast({
        title: "Lançamento criado",
        description: "O lançamento financeiro foi registrado com sucesso.",
      });

      setIsEntryModalOpen(false);
      setEntryForm({ categoryId: "", description: "", amount: "", flow: "income", entryDate: new Date().toISOString().split("T")[0], notes: "" });
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: categoryForm.name,
        type: categoryForm.type,
        color: categoryForm.color,
      };

      const res = await fetch("/api/finance-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar categoria");
      }

      toast({
        title: "Categoria criada",
        description: "A categoria financeira foi criada com sucesso.",
      });

      setIsCategoryModalOpen(false);
      setCategoryForm({ name: "", type: "income", color: "#3b82f6" });
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

  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/finance-entries/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao excluir lançamento");

      toast({
        title: "Lançamento excluído",
        description: "O lançamento foi removido com sucesso.",
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

  const filteredEntries = entries.filter((entry) => {
    const entryMonth = entry.entryDate.slice(0, 7);
    const matchesMonth = entryMonth === filterMonth;
    const matchesFlow = filterFlow === "all" || entry.flow === filterFlow;
    return matchesMonth && matchesFlow;
  });

  const totalIncome = filteredEntries.filter((e) => e.flow === "income").reduce((acc, e) => acc + parseFloat(e.amount || "0"), 0);
  const totalExpense = filteredEntries.filter((e) => e.flow === "expense").reduce((acc, e) => acc + parseFloat(e.amount || "0"), 0);
  const balance = totalIncome - totalExpense;

  const categoryData = categories.map((cat) => {
    const total = filteredEntries
      .filter((e) => e.categoryId === cat.id)
      .reduce((acc, e) => acc + parseFloat(e.amount || "0"), 0);
    return { name: cat.name, value: total, color: cat.color || "#6b7280" };
  }).filter((c) => c.value > 0);

  const monthlyData = (() => {
    const months: Record<string, { income: number; expense: number }> = {};
    entries.forEach((entry) => {
      const month = entry.entryDate.slice(0, 7);
      if (!months[month]) months[month] = { income: 0, expense: 0 };
      if (entry.flow === "income") {
        months[month].income += parseFloat(entry.amount || "0");
      } else {
        months[month].expense += parseFloat(entry.amount || "0");
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        receitas: data.income,
        despesas: data.expense,
      }));
  })();

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
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Controle de receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)} data-testid="button-new-category">
            <Tag className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
          <Button onClick={() => setIsEntryModalOpen(true)} data-testid="button-new-entry">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-income">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPrice(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">Entradas no período</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-expense">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPrice(totalExpense)}</div>
            <p className="text-xs text-muted-foreground">Saídas no período</p>
          </CardContent>
        </Card>

        <Card data-testid="card-balance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPrice(balance)}
            </div>
            <p className="text-xs text-muted-foreground">Resultado do período</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas x Despesas</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatPrice(value)} />
                    <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                    <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Categoria</CardTitle>
            <CardDescription>Distribuição no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatPrice(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Lançamentos</CardTitle>
              <CardDescription>Histórico de movimentações</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-40"
                data-testid="filter-month"
              />
              <Select value={filterFlow} onValueChange={setFilterFlow}>
                <SelectTrigger className="w-32" data-testid="filter-flow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum lançamento</h3>
              <p className="text-muted-foreground mb-4">Registre seu primeiro lançamento financeiro</p>
              <Button onClick={() => setIsEntryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries
                .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
                .map((entry) => {
                  const category = categories.find((c) => c.id === entry.categoryId);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      data-testid={`entry-row-${entry.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            entry.flow === "income" ? "bg-green-100" : "bg-red-100"
                          }`}
                        >
                          {entry.flow === "income" ? (
                            <ArrowUpCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{entry.description}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDate(entry.entryDate)}</span>
                            {category && (
                              <>
                                <span>•</span>
                                <Badge
                                  variant="outline"
                                  style={{ borderColor: category.color || "#6b7280", color: category.color || "#6b7280" }}
                                >
                                  {category.name}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg font-semibold ${
                            entry.flow === "income" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {entry.flow === "income" ? "+" : "-"} {formatPrice(entry.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEntry(entry.id)}
                          data-testid={`button-delete-entry-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
            <DialogDescription>Registre uma receita ou despesa</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={entryForm.flow === "income" ? "default" : "outline"}
                className={entryForm.flow === "income" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setEntryForm({ ...entryForm, flow: "income" })}
                data-testid="button-flow-income"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Receita
              </Button>
              <Button
                type="button"
                variant={entryForm.flow === "expense" ? "default" : "outline"}
                className={entryForm.flow === "expense" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setEntryForm({ ...entryForm, flow: "expense" })}
                data-testid="button-flow-expense"
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Despesa
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                placeholder="Ex: Comissão venda Apt 101"
                required
                data-testid="input-entry-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={entryForm.amount}
                onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                placeholder="1500.00"
                step="0.01"
                required
                data-testid="input-entry-amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={entryForm.categoryId}
                onValueChange={(v) => setEntryForm({ ...entryForm, categoryId: v })}
              >
                <SelectTrigger data-testid="select-entry-category">
                  <SelectValue placeholder="Selecione uma categoria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.type === entryForm.flow || c.type === "both")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || "#6b7280" }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={entryForm.entryDate}
                onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })}
                required
                data-testid="input-entry-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={entryForm.notes}
                onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                placeholder="Detalhes adicionais..."
                data-testid="input-entry-notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEntryModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-entry">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Lançamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma categoria para organizar seus lançamentos</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Comissões, Aluguel, Marketing..."
                required
                data-testid="input-category-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={categoryForm.type}
                onValueChange={(v) => setCategoryForm({ ...categoryForm, type: v })}
              >
                <SelectTrigger data-testid="select-category-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      categoryForm.color === color ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCategoryForm({ ...categoryForm, color })}
                    data-testid={`color-${color}`}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-category">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Categoria
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  BarChart3,
  MapPin,
  FileText,
  History,
  Minus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";

// Brazilian currency formatter
const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);

// Property types and conditions
const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Casa" },
  { value: "commercial", label: "Comercial" },
  { value: "land", label: "Terreno" },
];

const CATEGORIES = [
  { value: "sale", label: "Venda" },
  { value: "rent", label: "Aluguel" },
];

const CONDITIONS = [
  { value: "new", label: "Novo" },
  { value: "excellent", label: "Excelente" },
  { value: "good", label: "Bom" },
  { value: "fair", label: "Regular" },
  { value: "needs_renovation", label: "Precisa de reforma" },
];

const FEATURES_LIST = [
  "Piscina",
  "Academia",
  "Varanda",
  "Churrasqueira",
  "Playground",
  "Salao de Festas",
  "Sauna",
  "Portaria 24h",
  "Elevador",
  "Jardim",
  "Vista para o Mar",
  "Ar Condicionado",
  "Mobiliado",
  "Seguranca",
];

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

interface ValuationForm {
  propertyType: string;
  category: string;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  condition: string;
  yearBuilt: string;
  features: string[];
}

const defaultForm: ValuationForm = {
  propertyType: "apartment",
  category: "sale",
  city: "",
  state: "SP",
  neighborhood: "",
  address: "",
  area: "",
  bedrooms: "",
  bathrooms: "",
  parkingSpaces: "",
  condition: "good",
  yearBuilt: "",
  features: [],
};

export default function AVMPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("avaliar");
  const [form, setForm] = useState<ValuationForm>(defaultForm);
  const [result, setResult] = useState<any>(null);
  const [detailDialog, setDetailDialog] = useState<any>(null);

  // Fetch valuation history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/avm/history"],
    queryFn: async () => {
      const res = await fetch("/api/avm/history", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar historico");
      return res.json();
    },
  });

  // Fetch market indices
  const { data: indices = [], isLoading: indicesLoading } = useQuery({
    queryKey: ["/api/avm/market-indices"],
    queryFn: async () => {
      const res = await fetch("/api/avm/market-indices", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar indices");
      return res.json();
    },
  });

  // Fetch price map data
  const { data: priceMap = [] } = useQuery({
    queryKey: ["/api/avm/price-map"],
    queryFn: async () => {
      const res = await fetch("/api/avm/price-map", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar mapa de precos");
      return res.json();
    },
  });

  // Evaluate mutation
  const evaluateMutation = useMutation({
    mutationFn: async (data: ValuationForm) => {
      const res = await fetch("/api/avm/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          propertyType: data.propertyType,
          category: data.category,
          city: data.city,
          state: data.state,
          neighborhood: data.neighborhood || undefined,
          address: data.address || undefined,
          area: parseFloat(data.area),
          bedrooms: data.bedrooms ? parseInt(data.bedrooms) : undefined,
          bathrooms: data.bathrooms ? parseInt(data.bathrooms) : undefined,
          parkingSpaces: data.parkingSpaces ? parseInt(data.parkingSpaces) : undefined,
          features: data.features.length > 0 ? data.features : undefined,
          condition: data.condition || undefined,
          yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao avaliar");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/avm/history"] });
      toast.success("Avaliacao realizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao realizar avaliacao");
    },
  });

  // Recalculate indices
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/avm/recalculate-indices", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao recalcular");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/avm/market-indices"] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error("Erro ao recalcular indices");
    },
  });

  // Delete valuation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/avm/history/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao excluir");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avm/history"] });
      toast.success("Avaliacao excluida");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city || !form.area) {
      toast.error("Preencha cidade e area");
      return;
    }
    evaluateMutation.mutate(form);
  };

  const toggleFeature = (feature: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBg = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 70) return "Alta";
    if (score >= 40) return "Moderada";
    return "Baixa";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendLabel = (trend: string) => {
    if (trend === "up") return "Em alta";
    if (trend === "down") return "Em baixa";
    return "Estavel";
  };

  // Prepare chart data for price map
  const priceMapChartData = priceMap
    .slice(0, 15)
    .map((item: any) => ({
      name: item.neighborhood?.substring(0, 20) || "N/A",
      preco: Math.round(item.avgPricePerSqm),
      count: item.count,
    }))
    .sort((a: any, b: any) => b.preco - a.preco);

  // Prepare indices time series
  const indicesTimeSeries = indices.reduce((acc: any[], idx: any) => {
    const existing = acc.find((a) => a.period === idx.period);
    if (existing) {
      existing[idx.propertyType] = idx.avgPricePerSqm;
    } else {
      acc.push({
        period: idx.period,
        [idx.propertyType]: idx.avgPricePerSqm,
      });
    }
    return acc;
  }, []);

  // Group indices by type for summary cards
  const latestIndices = indices.reduce((acc: any, idx: any) => {
    const key = `${idx.propertyType}-${idx.category}`;
    if (!acc[key] || idx.period > acc[key].period) {
      acc[key] = idx;
    }
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-primary" />
            Avaliacoes de Imoveis (AVM)
          </h1>
          <p className="text-muted-foreground mt-1">
            Modelo automatizado de avaliacao de imoveis com base em dados de mercado
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="avaliar" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Avaliar</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historico</span>
          </TabsTrigger>
          <TabsTrigger value="mercado" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Mercado</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== AVALIAR TAB ==================== */}
        <TabsContent value="avaliar" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Valuation Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Nova Avaliacao
                </CardTitle>
                <CardDescription>
                  Preencha os dados do imovel para obter uma estimativa de valor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type & Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo do Imovel *</Label>
                      <Select
                        value={form.propertyType}
                        onValueChange={(v) => setForm({ ...form, propertyType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select
                        value={form.category}
                        onValueChange={(v) => setForm({ ...form, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cidade *</Label>
                      <Input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="Ex: Sao Paulo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado *</Label>
                      <Select
                        value={form.state}
                        onValueChange={(v) => setForm({ ...form, state: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input
                        value={form.neighborhood}
                        onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                        placeholder="Ex: Jardins"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Endereco</Label>
                      <Input
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="Rua, numero"
                      />
                    </div>
                  </div>

                  {/* Characteristics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Area (m2) *</Label>
                      <Input
                        type="number"
                        value={form.area}
                        onChange={(e) => setForm({ ...form, area: e.target.value })}
                        placeholder="80"
                        required
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quartos</Label>
                      <Input
                        type="number"
                        value={form.bedrooms}
                        onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
                        placeholder="2"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Banheiros</Label>
                      <Input
                        type="number"
                        value={form.bathrooms}
                        onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                        placeholder="1"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vagas</Label>
                      <Input
                        type="number"
                        value={form.parkingSpaces}
                        onChange={(e) => setForm({ ...form, parkingSpaces: e.target.value })}
                        placeholder="1"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Condition & Year */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estado de Conservacao</Label>
                      <Select
                        value={form.condition}
                        onValueChange={(v) => setForm({ ...form, condition: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ano de Construcao</Label>
                      <Input
                        type="number"
                        value={form.yearBuilt}
                        onChange={(e) => setForm({ ...form, yearBuilt: e.target.value })}
                        placeholder="2010"
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <Label>Diferenciais</Label>
                    <div className="flex flex-wrap gap-2">
                      {FEATURES_LIST.map((feature) => (
                        <Badge
                          key={feature}
                          variant={form.features.includes(feature) ? "default" : "outline"}
                          className="cursor-pointer select-none transition-colors"
                          onClick={() => toggleFeature(feature)}
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={evaluateMutation.isPending}
                  >
                    {evaluateMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-2" />
                    )}
                    {evaluateMutation.isPending ? "Calculando..." : "Calcular Avaliacao"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results Panel */}
            <div className="space-y-6">
              {result?.result ? (
                <ResultsPanel result={result.result} />
              ) : (
                <Card className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center text-muted-foreground space-y-3 p-8">
                    <Calculator className="h-16 w-16 mx-auto opacity-20" />
                    <p className="text-lg font-medium">Nenhuma avaliacao realizada</p>
                    <p className="text-sm">
                      Preencha o formulario ao lado e clique em "Calcular Avaliacao" para obter
                      uma estimativa de valor do imovel.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ==================== HISTORICO TAB ==================== */}
        <TabsContent value="historico" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historico de Avaliacoes
              </CardTitle>
              <CardDescription>
                {history.length} avaliacao(oes) realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto opacity-20 mb-3" />
                  <p>Nenhuma avaliacao realizada ainda</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Localizacao</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Valor Estimado</TableHead>
                        <TableHead className="text-right">Confianca</TableHead>
                        <TableHead>Tendencia</TableHead>
                        <TableHead className="text-right">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item: any) => (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="text-sm">
                            {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {PROPERTY_TYPES.find((t) => t.value === item.propertyType)?.label || item.propertyType}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {item.city}/{item.state}
                          </TableCell>
                          <TableCell>{item.area}m2</TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.estimatedValue ? formatBRL(item.estimatedValue) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getConfidenceColor(item.confidenceScore || 0)}>
                              {item.confidenceScore?.toFixed(1) || 0}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getTrendIcon(item.marketTrend)}
                              <span className="text-xs">{getTrendLabel(item.marketTrend)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDetailDialog(item)}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  if (confirm("Excluir esta avaliacao?")) {
                                    deleteMutation.mutate(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== MERCADO TAB ==================== */}
        <TabsContent value="mercado" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(latestIndices).slice(0, 4).map((idx: any, i: number) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {PROPERTY_TYPES.find((t) => t.value === idx.propertyType)?.label || idx.propertyType}
                        {" - "}
                        {idx.category === "sale" ? "Venda" : "Aluguel"}
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        R$ {formatNumber(Math.round(idx.avgPricePerSqm || 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">/m2 medio</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(idx.trend)}
                      <span className={`text-xs font-medium ${
                        idx.trend === "up" ? "text-green-600" :
                        idx.trend === "down" ? "text-red-600" : "text-gray-500"
                      }`}>
                        {idx.trendPercentage ? `${idx.trendPercentage > 0 ? "+" : ""}${idx.trendPercentage.toFixed(1)}%` : "0%"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{idx.city} ({idx.sampleSize} imoveis)</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {Object.keys(latestIndices).length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto opacity-20 mb-3" />
                  <p>Nenhum indice de mercado disponivel</p>
                  <p className="text-sm mt-1">Clique em "Recalcular Indices" para gerar dados a partir dos imoveis cadastrados</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recalculate Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending}
            >
              {recalculateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recalcular Indices
            </Button>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price per sqm by neighborhood */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preco por m2 por Regiao</CardTitle>
                <CardDescription>Comparativo de precos por localizacao</CardDescription>
              </CardHeader>
              <CardContent>
                {priceMapChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={priceMapChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: any) => [formatBRL(value), "Preco/m2"]}
                        labelFormatter={(label) => `Regiao: ${label}`}
                      />
                      <Bar dataKey="preco" radius={[0, 4, 4, 0]}>
                        {priceMapChartData.map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    <p className="text-sm">Sem dados suficientes para exibir grafico</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market trend over time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tendencia de Mercado</CardTitle>
                <CardDescription>Evolucao do preco por m2 ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                {indicesTimeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={indicesTimeSeries} margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: any) => [formatBRL(value), "Preco/m2"]} />
                      <Legend />
                      {Object.keys(indicesTimeSeries[0] || {})
                        .filter((k) => k !== "period")
                        .map((key, i) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={PROPERTY_TYPES.find((t) => t.value === key)?.label || key}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    <p className="text-sm">Sem dados suficientes para exibir grafico</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Market Indices Table */}
          {indices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Indices de Mercado Detalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Preco Medio/m2</TableHead>
                        <TableHead className="text-right">Preco Mediano</TableHead>
                        <TableHead className="text-center">Amostra</TableHead>
                        <TableHead>Tendencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indices.slice(0, 20).map((idx: any) => (
                        <TableRow key={idx.id}>
                          <TableCell>{idx.period}</TableCell>
                          <TableCell>{idx.city}/{idx.state}</TableCell>
                          <TableCell>
                            {PROPERTY_TYPES.find((t) => t.value === idx.propertyType)?.label || idx.propertyType}
                          </TableCell>
                          <TableCell>{idx.category === "sale" ? "Venda" : "Aluguel"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {idx.avgPricePerSqm ? formatBRL(idx.avgPricePerSqm) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {idx.medianPrice ? formatBRL(idx.medianPrice) : "-"}
                          </TableCell>
                          <TableCell className="text-center">{idx.sampleSize || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getTrendIcon(idx.trend)}
                              <span className="text-xs">
                                {idx.trendPercentage ? `${idx.trendPercentage > 0 ? "+" : ""}${idx.trendPercentage.toFixed(1)}%` : ""}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      {detailDialog && (
        <DetailDialog
          valuation={detailDialog}
          onClose={() => setDetailDialog(null)}
        />
      )}
    </div>
  );
}

// ====================== RESULTS PANEL ======================

function ResultsPanel({ result }: { result: any }) {
  const confidenceColor = result.confidenceScore >= 70 ? "text-green-600" :
    result.confidenceScore >= 40 ? "text-yellow-600" : "text-red-600";
  const confidenceBg = result.confidenceScore >= 70 ? "bg-green-500" :
    result.confidenceScore >= 40 ? "bg-yellow-500" : "bg-red-500";
  const confidenceLabel = result.confidenceScore >= 70 ? "Alta" :
    result.confidenceScore >= 40 ? "Moderada" : "Baixa";

  const adjustmentEntries = Object.entries(result.adjustments || {});
  const adjustmentLabels: Record<string, string> = {
    area: "Area",
    bedrooms: "Dormitorios",
    bathrooms: "Banheiros",
    parking: "Vagas",
    features: "Diferenciais",
    condition: "Conservacao",
    age: "Idade do Imovel",
  };

  return (
    <div className="space-y-4">
      {/* Main Value */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-1">Valor Estimado</p>
          <p className="text-4xl font-bold text-primary">
            {formatBRL(result.estimatedValue)}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Min: </span>
              <span className="font-medium">{formatBRL(result.minValue)}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Max: </span>
              <span className="font-medium">{formatBRL(result.maxValue)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <Badge variant="secondary" className="gap-1">
              R$ {formatNumber(Math.round(result.pricePerSqm))}/m2
            </Badge>
            <div className="flex items-center gap-1 text-sm">
              {result.marketTrend === "up" ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : result.marketTrend === "down" ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Minus className="h-4 w-4 text-gray-500" />
              )}
              <span>
                Mercado{" "}
                {result.marketTrend === "up" ? "em alta" : result.marketTrend === "down" ? "em baixa" : "estavel"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Gauge */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Indice de Confianca</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${confidenceColor}`}>
                {result.confidenceScore.toFixed(1)}%
              </span>
              <Badge
                variant={result.confidenceScore >= 70 ? "default" : result.confidenceScore >= 40 ? "secondary" : "destructive"}
              >
                {confidenceLabel}
              </Badge>
            </div>
          </div>

          {/* Custom gauge */}
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${confidenceBg}`}
              style={{ width: `${Math.min(100, result.confidenceScore)}%` }}
            />
            {/* Markers */}
            <div className="absolute inset-0 flex">
              <div className="w-[40%] border-r border-white/50" />
              <div className="w-[30%] border-r border-white/50" />
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Baixa</span>
            <span>Moderada</span>
            <span>Alta</span>
          </div>

          {result.confidenceScore < 40 && (
            <div className="mt-3 flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Poucos dados comparaveis disponveis ({result.comparables?.length || 0} imoveis).
                A estimativa pode variar significativamente. Recomenda-se uma avaliacao presencial.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjustments */}
      {adjustmentEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ajustes Aplicados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adjustmentEntries.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-sm">{adjustmentLabels[key] || key}</span>
                  <span
                    className={`text-sm font-medium ${
                      (value as number) > 0 ? "text-green-600" : (value as number) < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {(value as number) > 0 ? "+" : ""}
                    {(value as number).toFixed(1)}%
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span
                  className={`text-sm font-bold ${
                    Object.values(result.adjustments).reduce((s: number, v: any) => s + v, 0) > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {Object.values(result.adjustments).reduce((s: number, v: any) => s + v, 0) > 0 ? "+" : ""}
                  {(Object.values(result.adjustments).reduce((s: number, v: any) => s + v, 0) as number).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparables */}
      {result.comparables && result.comparables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Imoveis Comparaveis ({result.comparables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {result.comparables.slice(0, 8).map((comp: any, i: number) => (
                <div
                  key={comp.id || i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{comp.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {comp.address} - {comp.city}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs">{comp.area}m2</span>
                      {comp.bedrooms != null && <span className="text-xs">{comp.bedrooms} quartos</span>}
                      <span className="text-xs font-medium">
                        R$ {formatNumber(Math.round(comp.pricePerSqm))}/m2
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatBRL(comp.price)}</p>
                    <Badge
                      variant={comp.similarityScore >= 70 ? "default" : comp.similarityScore >= 50 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {comp.similarityScore}% similar
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Methodology */}
      {result.methodology && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Metodologia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {result.methodology}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ====================== DETAIL DIALOG ======================

function DetailDialog({
  valuation,
  onClose,
}: {
  valuation: any;
  onClose: () => void;
}) {
  let comparables: any[] = [];
  let adjustments: Record<string, number> = {};

  try {
    if (valuation.comparablesData) {
      comparables = JSON.parse(valuation.comparablesData);
    }
  } catch {}

  try {
    if (valuation.adjustments) {
      adjustments = JSON.parse(valuation.adjustments);
    }
  } catch {}

  const result = {
    estimatedValue: valuation.estimatedValue,
    minValue: valuation.minValue,
    maxValue: valuation.maxValue,
    pricePerSqm: valuation.pricePerSqm,
    confidenceScore: valuation.confidenceScore || 0,
    comparables,
    adjustments,
    marketTrend: valuation.marketTrend || "stable",
    methodology: valuation.methodology || "",
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes da Avaliacao
          </DialogTitle>
          <DialogDescription>
            {PROPERTY_TYPES.find((t) => t.value === valuation.propertyType)?.label || valuation.propertyType}
            {" em "}
            {valuation.city}/{valuation.state}
            {" - "}
            {new Date(valuation.createdAt).toLocaleDateString("pt-BR")}
          </DialogDescription>
        </DialogHeader>
        <ResultsPanel result={result} />
      </DialogContent>
    </Dialog>
  );
}

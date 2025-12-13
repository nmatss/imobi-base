import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useImobi } from "@/lib/imobi-context";
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Home,
  Loader2,
  Download,
  Calendar,
  FileText,
  Users,
  Clock,
  ArrowRight
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList
} from "recharts";

type ReportData = {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  paymentsByMonth: { month: string; received: number; pending: number }[];
  occupancyRate: number;
  activeContracts: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

const LEAD_STATUS_CONFIG = [
  { id: "new", label: "Novo", color: "#3b82f6" },
  { id: "qualification", label: "Qualificação", color: "#8b5cf6" },
  { id: "visit", label: "Visita", color: "#f97316" },
  { id: "proposal", label: "Proposta", color: "#eab308" },
  { id: "contract", label: "Contrato", color: "#22c55e" },
];

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function ReportsPage() {
  const { leads } = useImobi();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(0);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/rentals?startDate=${startDate}&endDate=${endDate}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchUsers();
  }, []);

  const handleApplyFilters = () => {
    fetchReport();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    
    const headers = ["Mês", "Recebido", "Pendente"];
    const rows = reportData.paymentsByMonth.map(item => [
      item.month,
      item.received.toString(),
      item.pending.toString()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_alugueis_${startDate}_${endDate}.csv`;
    link.click();
  };

  const pieData = reportData ? [
    { name: 'Recebido', value: reportData.totalReceived },
    { name: 'Pendente', value: reportData.totalPending },
    { name: 'Atrasado', value: reportData.totalOverdue },
  ].filter(item => item.value > 0) : [];

  const handleExportPDF = async () => {
    if (!reportRef.current || !reportData) return;
    
    setIsExporting(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const headerHeight = 25;
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - headerHeight - margin;
      
      const imgRatio = canvas.width / canvas.height;
      const scaledWidth = availableWidth;
      const scaledHeight = scaledWidth / imgRatio;
      
      pdf.setFontSize(16);
      pdf.text('Relatório de Aluguéis', pdfWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`Período: ${startDate} a ${endDate}`, pdfWidth / 2, 18, { align: 'center' });
      
      if (scaledHeight <= availableHeight) {
        pdf.addImage(imgData, 'PNG', margin, headerHeight, scaledWidth, scaledHeight);
      } else {
        let yOffset = 0;
        let pageNumber = 0;
        const pixelsPerMm = canvas.height / scaledHeight;
        
        while (yOffset < canvas.height) {
          if (pageNumber > 0) {
            pdf.addPage();
          }
          
          const sourceY = yOffset;
          const sourceHeight = Math.min(availableHeight * pixelsPerMm, canvas.height - yOffset);
          const destHeight = sourceHeight / pixelsPerMm;
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = sourceHeight;
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
            const pageImgData = tempCanvas.toDataURL('image/png');
            pdf.addImage(pageImgData, 'PNG', margin, pageNumber === 0 ? headerHeight : margin, scaledWidth, destHeight);
          }
          
          yOffset += sourceHeight;
          pageNumber++;
        }
      }
      
      pdf.save(`relatorio_alugueis_${startDate}_${endDate}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const funnelData = useMemo(() => {
    return LEAD_STATUS_CONFIG.map(status => {
      const count = leads.filter(l => l.status === status.id).length;
      return {
        name: status.label,
        value: count,
        fill: status.color,
      };
    });
  }, [leads]);

  const funnelConversionRates = useMemo(() => {
    const total = leads.length;
    if (total === 0) return [];
    
    return LEAD_STATUS_CONFIG.map((status, index) => {
      const currentCount = leads.filter(l => l.status === status.id).length;
      const previousCount = index === 0 ? total : 
        LEAD_STATUS_CONFIG.slice(0, index).reduce((acc, s) => 
          acc + leads.filter(l => l.status === s.id).length, 0);
      
      const progressedCount = LEAD_STATUS_CONFIG.slice(index).reduce((acc, s) => 
        acc + leads.filter(l => l.status === s.id).length, 0);
      
      const conversionRate = total > 0 ? (progressedCount / total) * 100 : 0;
      
      return {
        stage: status.label,
        count: currentCount,
        color: status.color,
        conversionRate: conversionRate.toFixed(1),
      };
    });
  }, [leads]);

  const agentPerformance = useMemo(() => {
    const performanceMap: Record<string, {
      name: string;
      totalLeads: number;
      newLeads: number;
      qualificationLeads: number;
      visitLeads: number;
      proposalLeads: number;
      contractLeads: number;
      conversionRate: number;
    }> = {};

    leads.forEach(lead => {
      const agentId = lead.assignedTo || "unassigned";
      const agent = users.find(u => u.id === agentId);
      const agentName = agent?.name || "Não atribuído";

      if (!performanceMap[agentId]) {
        performanceMap[agentId] = {
          name: agentName,
          totalLeads: 0,
          newLeads: 0,
          qualificationLeads: 0,
          visitLeads: 0,
          proposalLeads: 0,
          contractLeads: 0,
          conversionRate: 0,
        };
      }

      performanceMap[agentId].totalLeads++;
      switch (lead.status) {
        case "new": performanceMap[agentId].newLeads++; break;
        case "qualification": performanceMap[agentId].qualificationLeads++; break;
        case "visit": performanceMap[agentId].visitLeads++; break;
        case "proposal": performanceMap[agentId].proposalLeads++; break;
        case "contract": performanceMap[agentId].contractLeads++; break;
      }
    });

    return Object.values(performanceMap).map(agent => ({
      ...agent,
      conversionRate: agent.totalLeads > 0 
        ? ((agent.contractLeads / agent.totalLeads) * 100).toFixed(1) 
        : "0.0"
    })).sort((a, b) => b.totalLeads - a.totalLeads);
  }, [leads, users]);

  const timeAnalysis = useMemo(() => {
    const now = new Date();
    const timeInStage: Record<string, { total: number; count: number }> = {};
    
    LEAD_STATUS_CONFIG.forEach(status => {
      timeInStage[status.id] = { total: 0, count: 0 };
    });

    leads.forEach(lead => {
      const createdAt = new Date(lead.createdAt);
      const updatedAt = new Date(lead.updatedAt);
      const daysInCurrentStage = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (timeInStage[lead.status]) {
        timeInStage[lead.status].total += daysInCurrentStage;
        timeInStage[lead.status].count++;
      }
    });

    return LEAD_STATUS_CONFIG.map(status => ({
      stage: status.label,
      avgDays: timeInStage[status.id].count > 0 
        ? Math.round(timeInStage[status.id].total / timeInStage[status.id].count)
        : 0,
      count: timeInStage[status.id].count,
      color: status.color,
    }));
  }, [leads]);

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
          <h1 data-testid="text-reports-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Análises e métricas do seu negócio</p>
        </div>
      </div>

      <Tabs defaultValue="funnel" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="funnel" data-testid="tab-funnel">Funil de Vendas</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="time" data-testid="tab-time">Tempo no Funil</TabsTrigger>
          <TabsTrigger value="rentals" data-testid="tab-rentals">Aluguéis</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {funnelData.map((stage, index) => (
              <Card key={stage.name}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${stage.fill}20` }}>
                      <Users className="h-5 w-5" style={{ color: stage.fill }} />
                    </div>
                    <div>
                      <p data-testid={`text-funnel-count-${index}`} className="text-2xl font-bold">{stage.value}</p>
                      <p className="text-sm text-muted-foreground">{stage.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Taxa de Conversão por Etapa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelConversionRates.map((item, index) => (
                    <div key={item.stage} className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{item.stage}</span>
                          <span className="text-sm text-muted-foreground">{item.count} leads</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${item.conversionRate}%`,
                              backgroundColor: item.color 
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.conversionRate}% do total chegaram até aqui
                        </p>
                      </div>
                      {index < funnelConversionRates.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Performance por Corretor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lead encontrado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Corretor</th>
                        <th className="text-center py-3 px-2 font-medium">Total</th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1" />
                          Novos
                        </th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1" />
                          Qualif.
                        </th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1" />
                          Visita
                        </th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1" />
                          Proposta
                        </th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1" />
                          Contrato
                        </th>
                        <th className="text-center py-3 px-4 font-medium">Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentPerformance.map((agent, index) => (
                        <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium" data-testid={`text-agent-name-${index}`}>{agent.name}</td>
                          <td className="text-center py-3 px-2 font-bold">{agent.totalLeads}</td>
                          <td className="text-center py-3 px-2">{agent.newLeads}</td>
                          <td className="text-center py-3 px-2">{agent.qualificationLeads}</td>
                          <td className="text-center py-3 px-2">{agent.visitLeads}</td>
                          <td className="text-center py-3 px-2">{agent.proposalLeads}</td>
                          <td className="text-center py-3 px-2">{agent.contractLeads}</td>
                          <td className="text-center py-3 px-4">
                            <span 
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                parseFloat(agent.conversionRate) >= 20 
                                  ? 'bg-green-100 text-green-800' 
                                  : parseFloat(agent.conversionRate) >= 10 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                              data-testid={`text-agent-conversion-${index}`}
                            >
                              {agent.conversionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leads por Corretor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="newLeads" name="Novos" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="qualificationLeads" name="Qualificação" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="visitLeads" name="Visita" stackId="a" fill="#f97316" />
                    <Bar dataKey="proposalLeads" name="Proposta" stackId="a" fill="#eab308" />
                    <Bar dataKey="contractLeads" name="Contrato" stackId="a" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {timeAnalysis.map((stage, index) => (
              <Card key={stage.stage}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${stage.color}20` }}>
                      <Clock className="h-5 w-5" style={{ color: stage.color }} />
                    </div>
                    <div>
                      <p data-testid={`text-time-avg-${index}`} className="text-2xl font-bold">{stage.avgDays}d</p>
                      <p className="text-sm text-muted-foreground">{stage.stage}</p>
                      <p className="text-xs text-muted-foreground">{stage.count} leads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" /> Tempo Médio em Cada Etapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis label={{ value: 'Dias', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} dias`, 'Tempo médio']}
                    />
                    <Bar dataKey="avgDays" radius={[4, 4, 0, 0]}>
                      {timeAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise de Tempo no Funil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {timeAnalysis.map((stage, index) => (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${stage.color}20` }}
                    >
                      <span className="text-lg font-bold" style={{ color: stage.color }}>{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-sm text-muted-foreground">{stage.count} leads atualmente</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Tempo médio: <strong>{stage.avgDays} dias</strong>
                        </span>
                      </div>
                    </div>
                    {index < timeAnalysis.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      Tempo total médio no funil: <strong>
                        {timeAnalysis.reduce((acc, s) => acc + s.avgDays, 0)} dias
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rentals" className="space-y-6">
          <div className="flex gap-2 justify-end">
            <Button data-testid="button-export-csv" onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button data-testid="button-export-pdf" onClick={handleExportPDF} disabled={isExporting} className="gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isExporting ? "Gerando..." : "Exportar PDF"}
            </Button>
          </div>

          <div ref={reportRef} className="space-y-6 bg-background">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data Inicial</Label>
                    <Input
                      id="startDate"
                      data-testid="input-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Final</Label>
                    <Input
                      id="endDate"
                      data-testid="input-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <Button data-testid="button-apply-filters" onClick={handleApplyFilters}>Aplicar Filtros</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p data-testid="text-total-received" className="text-2xl font-bold">{formatCurrency(reportData?.totalReceived || 0)}</p>
                      <p className="text-sm text-muted-foreground">Total Recebido</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <TrendingUp className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p data-testid="text-total-pending" className="text-2xl font-bold">{formatCurrency(reportData?.totalPending || 0)}</p>
                      <p className="text-sm text-muted-foreground">Total Pendente</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p data-testid="text-total-overdue" className="text-2xl font-bold">{formatCurrency(reportData?.totalOverdue || 0)}</p>
                      <p className="text-sm text-muted-foreground">Total Atrasado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Home className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p data-testid="text-occupancy-rate" className="text-2xl font-bold">{reportData?.occupancyRate?.toFixed(1) || 0}%</p>
                      <p className="text-sm text-muted-foreground">Taxa de Ocupação</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Receitas por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData?.paymentsByMonth || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar dataKey="received" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pending" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição de Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Nenhum dado de pagamento disponível
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData?.paymentsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="received" name="Recebido" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                      <Line type="monotone" dataKey="pending" name="Pendente" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Contratos Ativos</p>
                    <p data-testid="text-active-contracts" className="text-2xl font-bold">{reportData?.activeContracts || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Taxa de Inadimplência</p>
                    <p className="text-2xl font-bold">
                      {reportData && (reportData.totalReceived + reportData.totalOverdue) > 0
                        ? ((reportData.totalOverdue / (reportData.totalReceived + reportData.totalOverdue)) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold">
                      {reportData?.activeContracts && reportData.activeContracts > 0
                        ? formatCurrency(reportData.totalReceived / reportData.activeContracts)
                        : formatCurrency(0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Período</p>
                    <p className="text-lg font-medium">{startDate} a {endDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

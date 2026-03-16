import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  MessageSquare,
  Users,
  Calendar,
  Settings,
  TestTube,
  ArrowRight,
  Phone,
  Send,
  Flame,
  Thermometer,
  Snowflake,
  X,
  Plus,
  Trash2,
  RefreshCw,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ==================== TYPES ====================

interface IsaConversation {
  id: string;
  tenantId: string;
  leadId: string | null;
  phoneNumber: string;
  leadName: string | null;
  status: string;
  qualificationData: string | null;
  interestedPropertyIds: string | null;
  temperature: string | null;
  assignedAgentId: string | null;
  transferredAt: string | null;
  visitScheduledId: string | null;
  conversationStage: string | null;
  messageCount: number | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface IsaMessage {
  id: string;
  conversationId: string;
  direction: string;
  content: string;
  messageType: string;
  sentAt: string;
}

interface IsaStats {
  total: number;
  active: number;
  qualified: number;
  transferred: number;
  closed: number;
  hot: number;
  warm: number;
  cold: number;
  visitsScheduled: number;
  conversionRate: number;
}

interface IsaSettings {
  id?: string;
  enabled: boolean;
  greeting: string;
  personality: string;
  workingHours: string;
  autoQualify: boolean;
  autoScheduleVisits: boolean;
  transferToHumanThreshold: number;
  faqResponses: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

// ==================== API HELPERS ====================

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ==================== COMPONENTS ====================

function TemperatureBadge({ temperature }: { temperature: string | null }) {
  switch (temperature) {
    case "hot":
      return <Badge variant="destructive" className="gap-1"><Flame className="h-3 w-3" /> Quente</Badge>;
    case "warm":
      return <Badge variant="default" className="gap-1 bg-orange-500"><Thermometer className="h-3 w-3" /> Morno</Badge>;
    case "cold":
      return <Badge variant="secondary" className="gap-1"><Snowflake className="h-3 w-3" /> Frio</Badge>;
    default:
      return <Badge variant="outline" className="gap-1">Desconhecido</Badge>;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    active: { label: "Ativo", className: "bg-green-100 text-green-700 border-green-200" },
    qualified: { label: "Qualificado", className: "bg-blue-100 text-blue-700 border-blue-200" },
    transferred: { label: "Transferido", className: "bg-purple-100 text-purple-700 border-purple-200" },
    closed: { label: "Fechado", className: "bg-gray-100 text-gray-700 border-gray-200" },
  };
  const v = variants[status] || { label: status, className: "" };
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

// ==================== DASHBOARD TAB ====================

function DashboardTab() {
  const [stats, setStats] = useState<IsaStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<IsaStats>("/api/isa/stats")
      .then(setStats)
      .catch(() => toast.error("Erro ao carregar estatisticas"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-4 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Total de Conversas", value: stats.total, icon: MessageSquare, color: "text-blue-600" },
    { label: "Leads Qualificados", value: stats.qualified + stats.transferred, icon: Users, color: "text-green-600" },
    { label: "Visitas Agendadas", value: stats.visitsScheduled, icon: Calendar, color: "text-purple-600" },
    { label: "Taxa de Conversao", value: `${stats.conversionRate}%`, icon: ArrowUpRight, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
                <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Quentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats.hot}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Mornos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{stats.warm}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Frios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-blue-400" />
              <span className="text-2xl font-bold">{stats.cold}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversas por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-2xl font-bold text-green-700">{stats.active}</p>
              <p className="text-sm text-green-600">Ativas</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">{stats.qualified}</p>
              <p className="text-sm text-blue-600">Qualificadas</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-2xl font-bold text-purple-700">{stats.transferred}</p>
              <p className="text-sm text-purple-600">Transferidas</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-2xl font-bold text-gray-700">{stats.closed}</p>
              <p className="text-sm text-gray-600">Fechadas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CONVERSATIONS TAB ====================

function ConversationsTab() {
  const [conversations, setConversations] = useState<IsaConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<IsaConversation | null>(null);
  const [messages, setMessages] = useState<IsaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(() => {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    fetchApi<IsaConversation[]>(`/api/isa/conversations${params}`)
      .then(setConversations)
      .catch(() => toast.error("Erro ao carregar conversas"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (conv: IsaConversation) => {
    setSelectedConversation(conv);
    try {
      const state = await fetchApi<{ messages: IsaMessage[] }>(`/api/isa/conversations/${conv.id}`);
      setMessages(state.messages || []);
    } catch {
      toast.error("Erro ao carregar mensagens");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTransfer = async (id: string) => {
    try {
      await fetchApi(`/api/isa/conversations/${id}/transfer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      toast.success("Conversa transferida com sucesso");
      loadConversations();
      setSelectedConversation(null);
    } catch {
      toast.error("Erro ao transferir conversa");
    }
  };

  const handleClose = async (id: string) => {
    try {
      await fetchApi(`/api/isa/conversations/${id}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      toast.success("Conversa fechada com sucesso");
      loadConversations();
      setSelectedConversation(null);
    } catch {
      toast.error("Erro ao fechar conversa");
    }
  };

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Conversation List */}
      <Card className="w-full md:w-1/3 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <Button variant="ghost" size="icon" onClick={loadConversations}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="qualified">Qualificados</SelectItem>
              <SelectItem value="transferred">Transferidos</SelectItem>
              <SelectItem value="closed">Fechados</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Nenhuma conversa encontrada</div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${
                    selectedConversation?.id === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">
                      {conv.leadName || conv.phoneNumber}
                    </span>
                    <TemperatureBadge temperature={conv.temperature} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {conv.phoneNumber}
                    </div>
                    <StatusBadge status={conv.status} />
                  </div>
                  {conv.lastMessageAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(conv.lastMessageAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </button>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat View */}
      <Card className="hidden md:flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {selectedConversation.leadName || selectedConversation.phoneNumber}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Phone className="h-3 w-3" /> {selectedConversation.phoneNumber}
                    <span className="mx-1">|</span>
                    Etapa: {selectedConversation.conversationStage || "greeting"}
                    {selectedConversation.messageCount && (
                      <>
                        <span className="mx-1">|</span>
                        {selectedConversation.messageCount} msgs
                      </>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedConversation.status === "active" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleTransfer(selectedConversation.id)}>
                        <ArrowRight className="h-4 w-4 mr-1" /> Transferir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleClose(selectedConversation.id)}>
                        <X className="h-4 w-4 mr-1" /> Fechar
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <TemperatureBadge temperature={selectedConversation.temperature} />
                <StatusBadge status={selectedConversation.status} />
                {selectedConversation.qualificationData && (() => {
                  try {
                    const qd = JSON.parse(selectedConversation.qualificationData);
                    return <Badge variant="outline">Score: {qd.score || 0}/100</Badge>;
                  } catch { return null; }
                })()}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                          msg.direction === "outbound"
                            ? "bg-green-100 text-green-900 border border-green-200"
                            : "bg-blue-100 text-blue-900 border border-blue-200"
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {msg.direction === "outbound" ? (
                            <Bot className="h-3 w-3" />
                          ) : (
                            <Phone className="h-3 w-3" />
                          )}
                          <span className="text-[10px] font-medium opacity-70">
                            {msg.direction === "outbound" ? "ISA" : "Lead"}
                          </span>
                          <span className="text-[10px] opacity-50 ml-auto">
                            {new Date(msg.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione uma conversa para visualizar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ==================== SETTINGS TAB ====================

function SettingsTab() {
  const [settings, setSettings] = useState<IsaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [workingHours, setWorkingHours] = useState({ start: "08:00", end: "20:00", days: [1, 2, 3, 4, 5] });

  useEffect(() => {
    fetchApi<IsaSettings>("/api/isa/settings")
      .then(s => {
        setSettings(s);
        try {
          const wh = typeof s.workingHours === "string" ? JSON.parse(s.workingHours) : s.workingHours;
          if (wh) setWorkingHours(wh);
        } catch { /* ignore */ }
        try {
          const fq = typeof s.faqResponses === "string" ? JSON.parse(s.faqResponses) : s.faqResponses;
          if (Array.isArray(fq)) setFaqs(fq);
        } catch { /* ignore */ }
      })
      .catch(() => toast.error("Erro ao carregar configuracoes"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await fetchApi<IsaSettings>("/api/isa/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          workingHours: JSON.stringify(workingHours),
          faqResponses: JSON.stringify(faqs),
        }),
      });
      setSettings(updated);
      toast.success("Configuracoes salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configuracoes");
    } finally {
      setSaving(false);
    }
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const toggleDay = (day: number) => {
    setWorkingHours(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort(),
    }));
  };

  if (loading) return <div className="text-center text-muted-foreground py-8">Carregando...</div>;
  if (!settings) return null;

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            ISA Virtual
          </CardTitle>
          <CardDescription>Ative ou desative a assistente virtual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="isa-enabled">ISA ativa</Label>
            <Switch
              id="isa-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Greeting & Personality */}
      <Card>
        <CardHeader>
          <CardTitle>Mensagem de Boas-Vindas</CardTitle>
          <CardDescription>Personalize a saudacao inicial. Use {"{companyName}"} para inserir o nome da empresa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={settings.greeting}
            onChange={(e) => setSettings({ ...settings, greeting: e.target.value })}
            rows={3}
            placeholder="Ola! Sou a assistente virtual..."
          />
          <div>
            <Label>Personalidade</Label>
            <Select
              value={settings.personality}
              onValueChange={(value) => setSettings({ ...settings, personality: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="friendly">Amigavel</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Horario de Funcionamento</CardTitle>
          <CardDescription>Defina quando a ISA deve operar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Inicio</Label>
              <Input
                type="time"
                value={workingHours.start}
                onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="time"
                value={workingHours.end}
                onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Dias ativos</Label>
            <div className="flex gap-2 mt-2">
              {dayNames.map((name, i) => (
                <Button
                  key={i}
                  variant={workingHours.days.includes(i) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(i)}
                  className="w-10 h-10 p-0"
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Qualification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Qualificacao</CardTitle>
          <CardDescription>Configure o comportamento de qualificacao de leads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Qualificacao automatica (BANT)</Label>
              <p className="text-xs text-muted-foreground">Qualifica automaticamente usando Budget, Authority, Need, Timeline</p>
            </div>
            <Switch
              checked={settings.autoQualify}
              onCheckedChange={(checked) => setSettings({ ...settings, autoQualify: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Agendar visitas automaticamente</Label>
              <p className="text-xs text-muted-foreground">Agenda visitas para leads quentes automaticamente</p>
            </div>
            <Switch
              checked={settings.autoScheduleVisits}
              onCheckedChange={(checked) => setSettings({ ...settings, autoScheduleVisits: checked })}
            />
          </div>
          <div>
            <Label>Limite de mensagens para transferir</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Apos esse numero de mensagens, a conversa e transferida para um humano
            </p>
            <Input
              type="number"
              min={5}
              max={50}
              value={settings.transferToHumanThreshold}
              onChange={(e) => setSettings({ ...settings, transferToHumanThreshold: parseInt(e.target.value) || 10 })}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* FAQ Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Perguntas Frequentes</CardTitle>
              <CardDescription>Adicione respostas personalizadas para perguntas comuns</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addFaq}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma FAQ personalizada. Clique em "Adicionar" para criar.
            </p>
          ) : (
            faqs.map((faq, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <Label className="text-xs">Pergunta {i + 1}</Label>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFaq(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <Input
                  placeholder="Ex: Como funciona o financiamento?"
                  value={faq.question}
                  onChange={(e) => updateFaq(i, "question", e.target.value)}
                />
                <Textarea
                  placeholder="Resposta..."
                  value={faq.answer}
                  onChange={(e) => updateFaq(i, "answer", e.target.value)}
                  rows={2}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Configuracoes"}
        </Button>
      </div>
    </div>
  );
}

// ==================== TEST TAB ====================

function TestTab() {
  const [testPhone, setTestPhone] = useState(`test_${Date.now()}`);
  const [messages, setMessages] = useState<Array<{ direction: string; content: string; time: string }>>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationInfo, setConversationInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { direction: "inbound", content: userMessage, time: new Date().toLocaleTimeString("pt-BR") }]);

    setSending(true);
    try {
      const result = await fetchApi<{ response: string; conversationState: any }>("/api/isa/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: testPhone, message: userMessage }),
      });

      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      setMessages(prev => [...prev, { direction: "outbound", content: result.response, time: new Date().toLocaleTimeString("pt-BR") }]);
      setConversationInfo(result.conversationState);
    } catch {
      toast.error("Erro ao enviar mensagem de teste");
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setTestPhone(`test_${Date.now()}`);
    setMessages([]);
    setConversationInfo(null);
    toast.info("Conversa de teste reiniciada");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Chat Simulator */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Simulador de Chat
              </CardTitle>
              <CardDescription>Teste as respostas da ISA em tempo real</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-1" /> Nova Conversa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Envie uma mensagem para testar a ISA</p>
                  <p className="text-xs mt-1">Tente: "Ola", "Quero comprar um apartamento", etc.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.direction === "outbound" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.direction === "outbound"
                        ? "bg-green-100 text-green-900 border border-green-200"
                        : "bg-blue-100 text-blue-900 border border-blue-200"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      {msg.direction === "outbound" ? (
                        <Bot className="h-3 w-3" />
                      ) : (
                        <span className="text-[10px]">Voce</span>
                      )}
                      <span className="text-[10px] opacity-50 ml-auto">{msg.time}</span>
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-green-100 text-green-900 border border-green-200 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      <span className="text-[10px]">ISA digitando...</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-3 flex gap-2">
            <Input
              placeholder="Digite uma mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversation State */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Estado da Conversa</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {conversationInfo ? (
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Etapa</Label>
                <p className="font-medium">{conversationInfo.stage || "greeting"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Temperatura</Label>
                <div className="mt-1">
                  <TemperatureBadge temperature={conversationInfo.temperature} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Score BANT</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-muted rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (conversationInfo.qualificationData?.score || 0) >= 70
                          ? "bg-red-500"
                          : (conversationInfo.qualificationData?.score || 0) >= 40
                          ? "bg-orange-500"
                          : "bg-blue-400"
                      }`}
                      style={{ width: `${conversationInfo.qualificationData?.score || 0}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs">{conversationInfo.qualificationData?.score || 0}/100</span>
                </div>
              </div>
              {conversationInfo.qualificationData?.budget && (
                <div>
                  <Label className="text-xs text-muted-foreground">Orcamento (B)</Label>
                  <p className="font-medium">{conversationInfo.qualificationData.budget}</p>
                </div>
              )}
              {conversationInfo.qualificationData?.authority && (
                <div>
                  <Label className="text-xs text-muted-foreground">Autoridade (A)</Label>
                  <p className="font-medium">{conversationInfo.qualificationData.authority}</p>
                </div>
              )}
              {conversationInfo.qualificationData?.need && (
                <div>
                  <Label className="text-xs text-muted-foreground">Necessidade (N)</Label>
                  <p className="font-medium">{conversationInfo.qualificationData.need}</p>
                </div>
              )}
              {conversationInfo.qualificationData?.timeline && (
                <div>
                  <Label className="text-xs text-muted-foreground">Prazo (T)</Label>
                  <p className="font-medium">{conversationInfo.qualificationData.timeline}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <StatusBadge status={conversationInfo.conversation?.status || "active"} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Mensagens</Label>
                <p className="font-medium">{conversationInfo.conversation?.messageCount || 0}</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Envie uma mensagem para ver o estado da conversa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function IsaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            ISA Virtual
          </h1>
          <p className="text-muted-foreground mt-1">
            Assistente virtual de vendas internas via WhatsApp
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-1">
            <BarChart className="h-4 w-4 hidden sm:inline" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-1">
            <MessageSquare className="h-4 w-4 hidden sm:inline" />
            Conversas
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-4 w-4 hidden sm:inline" />
            Config
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-1">
            <TestTube className="h-4 w-4 hidden sm:inline" />
            Testar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="conversations" className="mt-6">
          <ConversationsTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <TestTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Missing import - using inline
function BarChart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}

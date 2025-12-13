import { useState, useEffect } from "react";
import { useImobi, LeadStatus, Lead } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Phone, Mail, Users, ArrowRight, Loader2, MessageSquare, PhoneCall, Calendar, FileText, Send, Tag, Bell, Clock, X, Check, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: "new", label: "Novo", color: "bg-blue-500" },
  { id: "qualification", label: "Qualificação", color: "bg-indigo-500" },
  { id: "visit", label: "Visita", color: "bg-orange-500" },
  { id: "proposal", label: "Proposta", color: "bg-purple-500" },
  { id: "contract", label: "Contrato", color: "bg-green-500" },
];

function formatBudget(budget: string | null) {
  if (!budget) return null;
  const num = parseFloat(budget);
  if (isNaN(num)) return budget;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num);
}

type LeadFormData = {
  name: string;
  email: string;
  phone: string;
  source: string;
  budget: string;
  notes: string;
};

const initialFormData: LeadFormData = {
  name: "",
  email: "",
  phone: "",
  source: "Site",
  budget: "",
  notes: "",
};

type Interaction = {
  id: string;
  leadId: string;
  userId: string;
  type: string;
  content: string;
  createdAt: string;
};

type LeadTag = {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  createdAt: string;
};

type FollowUp = {
  id: string;
  tenantId: string;
  leadId: string;
  assignedTo: string | null;
  dueAt: string;
  type: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
};

const INTERACTION_TYPES = [
  { value: "call", label: "Ligação", icon: PhoneCall },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "visit", label: "Visita", icon: Calendar },
  { value: "note", label: "Anotação", icon: FileText },
];

const FOLLOW_UP_TYPES = [
  { value: "call", label: "Ligar" },
  { value: "email", label: "Enviar e-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visit", label: "Agendar visita" },
  { value: "proposal", label: "Enviar proposta" },
  { value: "other", label: "Outro" },
];

const TAG_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function LeadsKanban() {
  const { leads, tenant, refetchLeads, user } = useImobi();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [newInteractionType, setNewInteractionType] = useState("note");
  const [newInteractionContent, setNewInteractionContent] = useState("");
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);

  // Tags state
  const [allTags, setAllTags] = useState<LeadTag[]>([]);
  const [leadTags, setLeadTags] = useState<LeadTag[]>([]);
  const [leadTagsMap, setLeadTagsMap] = useState<Record<string, LeadTag[]>>({});
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Follow-ups state
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leadFollowUps, setLeadFollowUps] = useState<FollowUp[]>([]);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [newFollowUpType, setNewFollowUpType] = useState("call");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newFollowUpNotes, setNewFollowUpNotes] = useState("");
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);

  useEffect(() => {
    fetchAllTags();
    fetchAllFollowUps();
  }, []);

  useEffect(() => {
    if (leads.length > 0) {
      fetchAllLeadTags();
    }
  }, [leads]);

  useEffect(() => {
    if (editingLead) {
      fetchInteractions(editingLead.id);
      fetchLeadTags(editingLead.id);
      fetchLeadFollowUps(editingLead.id);
    } else {
      setInteractions([]);
      setLeadTags([]);
      setLeadFollowUps([]);
    }
  }, [editingLead]);

  const fetchAllTags = async () => {
    try {
      const res = await fetch("/api/lead-tags", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAllTags(data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const fetchAllLeadTags = async () => {
    try {
      const res = await fetch("/api/leads/tags/batch", { credentials: "include" });
      if (res.ok) {
        const map = await res.json();
        setLeadTagsMap(map);
      }
    } catch (error) {
      console.error("Failed to fetch lead tags batch:", error);
    }
  };

  const fetchLeadTags = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/tags`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLeadTags(data);
      }
    } catch (error) {
      console.error("Failed to fetch lead tags:", error);
    }
  };

  const fetchAllFollowUps = async () => {
    try {
      const res = await fetch("/api/follow-ups", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data);
      }
    } catch (error) {
      console.error("Failed to fetch follow-ups:", error);
    }
  };

  const fetchLeadFollowUps = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/follow-ups`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLeadFollowUps(data);
      }
    } catch (error) {
      console.error("Failed to fetch lead follow-ups:", error);
    }
  };

  const fetchInteractions = async (leadId: string) => {
    setLoadingInteractions(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/interactions`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setInteractions(data);
      }
    } catch (error) {
      console.error("Failed to fetch interactions:", error);
    } finally {
      setLoadingInteractions(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!editingLead || !newInteractionContent.trim()) return;
    
    setIsAddingInteraction(true);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadId: editingLead.id,
          type: newInteractionType,
          content: newInteractionContent,
        }),
      });

      if (res.ok) {
        toast({ title: "Interação registrada", description: "A interação foi adicionada ao histórico do lead." });
        setNewInteractionContent("");
        await fetchInteractions(editingLead.id);
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível registrar a interação.", variant: "destructive" });
    } finally {
      setIsAddingInteraction(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);
    try {
      const res = await fetch("/api/lead-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newTagName, color: newTagColor }),
      });
      if (res.ok) {
        toast({ title: "Tag criada", description: `A tag "${newTagName}" foi criada.` });
        setNewTagName("");
        await fetchAllTags();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível criar a tag.", variant: "destructive" });
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleToggleTagOnLead = async (tagId: string, isAssigned: boolean) => {
    if (!editingLead) return;
    try {
      if (isAssigned) {
        await fetch(`/api/leads/${editingLead.id}/tags/${tagId}`, { method: "DELETE", credentials: "include" });
      } else {
        await fetch(`/api/leads/${editingLead.id}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tagId }),
        });
      }
      await fetchLeadTags(editingLead.id);
      await fetchAllLeadTags();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar a tag.", variant: "destructive" });
    }
  };

  const handleCreateFollowUp = async () => {
    if (!editingLead || !newFollowUpDate) return;
    setIsCreatingFollowUp(true);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadId: editingLead.id,
          type: newFollowUpType,
          dueAt: new Date(newFollowUpDate).toISOString(),
          notes: newFollowUpNotes || null,
          status: "pending",
        }),
      });
      if (res.ok) {
        toast({ title: "Lembrete criado", description: "O lembrete foi agendado." });
        setNewFollowUpDate("");
        setNewFollowUpNotes("");
        setIsFollowUpModalOpen(false);
        await fetchLeadFollowUps(editingLead.id);
        await fetchAllFollowUps();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível criar o lembrete.", variant: "destructive" });
    } finally {
      setIsCreatingFollowUp(false);
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    try {
      await fetch(`/api/follow-ups/${followUpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed", completedAt: new Date().toISOString() }),
      });
      toast({ title: "Lembrete concluído" });
      if (editingLead) await fetchLeadFollowUps(editingLead.id);
      await fetchAllFollowUps();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível concluir o lembrete.", variant: "destructive" });
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      await fetch(`/api/follow-ups/${followUpId}`, { method: "DELETE", credentials: "include" });
      toast({ title: "Lembrete removido" });
      if (editingLead) await fetchLeadFollowUps(editingLead.id);
      await fetchAllFollowUps();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível remover o lembrete.", variant: "destructive" });
    }
  };

  const getLeadsByStatus = (status: LeadStatus) => {
    let filtered = leads.filter((l) => l.status === status);
    if (filterTags.length > 0) {
      filtered = filtered.filter((l) => {
        const tags = leadTagsMap[l.id] || [];
        return filterTags.some((ft) => tags.some((t) => t.id === ft));
      });
    }
    return filtered;
  };

  const getLeadFollowUpIndicator = (leadId: string) => {
    const pending = followUps.filter((f) => f.leadId === leadId && f.status === "pending");
    if (pending.length === 0) return null;
    const overdue = pending.some((f) => new Date(f.dueAt) < new Date());
    return { count: pending.length, overdue };
  };

  const openCreateModal = () => {
    setEditingLead(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      budget: lead.budget || "",
      notes: lead.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: formData.source,
        budget: formData.budget || null,
        notes: formData.notes || null,
        status: editingLead?.status || "new",
      };

      const url = editingLead ? `/api/leads/${editingLead.id}` : "/api/leads";
      const method = editingLead ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar lead");
      }

      toast({
        title: editingLead ? "Lead atualizado" : "Lead criado",
        description: editingLead ? "O lead foi atualizado com sucesso." : "O lead foi cadastrado com sucesso.",
      });

      setIsModalOpen(false);
      setFormData(initialFormData);
      setEditingLead(null);
      await refetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveToStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao mover lead");
      }

      const statusLabel = COLUMNS.find(c => c.id === newStatus)?.label || newStatus;
      toast({ title: "Lead movido", description: `O lead foi movido para "${statusLabel}".` });

      await refetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleArchive = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erro ao arquivar lead");
      toast({ title: "Lead arquivado", description: "O lead foi removido do funil." });
      await refetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const LeadCard = ({ lead, isMobile = false }: { lead: Lead; isMobile?: boolean }) => {
    const tags = leadTagsMap[lead.id] || [];
    const followUpIndicator = getLeadFollowUpIndicator(lead.id);
    
    return (
      <Card 
        key={lead.id} 
        data-testid={`card-lead-${lead.id}`} 
        className={`${isMobile ? "" : "cursor-grab active:cursor-grabbing hover:shadow-md"} transition-all border-l-4`} 
        style={{ borderLeftColor: tenant?.primaryColor }}
      >
        <CardHeader className="p-3 pb-2 space-y-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-normal bg-background/50">
                {lead.source}
              </Badge>
              {followUpIndicator && (
                <Badge 
                  variant={followUpIndicator.overdue ? "destructive" : "secondary"} 
                  className="text-[10px] h-5 px-1.5 gap-0.5"
                  data-testid={`badge-followup-${lead.id}`}
                >
                  <Bell className="h-2.5 w-2.5" />
                  {followUpIndicator.count}
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground" data-testid={`button-lead-menu-${lead.id}`}>
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditModal(lead)}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowRight className="w-3 h-3 mr-2" />
                    Mover para
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {COLUMNS.filter(c => c.id !== lead.status).map(col => (
                      <DropdownMenuItem 
                        key={col.id} 
                        onClick={() => handleMoveToStatus(lead.id, col.id)}
                        data-testid={`button-move-lead-${lead.id}-to-${col.id}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${col.color} mr-2`} />
                        {col.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => handleArchive(lead.id)}>
                  Arquivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardTitle className="text-sm font-medium leading-tight mt-1">
            {lead.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-2 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-white"
                  style={{ backgroundColor: tag.color }}
                  data-testid={`tag-${tag.id}-on-lead-${lead.id}`}
                >
                  {tag.name}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
              )}
            </div>
          )}
          {lead.budget && (
            <div className={`${isMobile ? "pt-1" : "mt-2 pt-2 border-t border-border/50"} font-medium text-foreground`}>
              Orçamento: {formatBudget(lead.budget)}
            </div>
          )}
          {!isMobile && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] opacity-70">
                {new Date(lead.createdAt).toLocaleDateString()}
              </span>
              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                {lead.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const TagsFilter = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-filter-tags">
          <Filter className="h-4 w-4" />
          Filtrar
          {filterTags.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {filterTags.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-2">
          <div className="font-medium text-sm">Filtrar por Tags</div>
          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tag criada ainda.</p>
          ) : (
            <div className="space-y-2">
              {allTags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`filter-${tag.id}`}
                    checked={filterTags.includes(tag.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterTags([...filterTags, tag.id]);
                      } else {
                        setFilterTags(filterTags.filter((t) => t !== tag.id));
                      }
                    }}
                    data-testid={`checkbox-filter-tag-${tag.id}`}
                  />
                  <label htmlFor={`filter-${tag.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </label>
                </div>
              ))}
            </div>
          )}
          {filterTags.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setFilterTags([])}>
              Limpar filtros
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  if (leads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 data-testid="text-leads-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Funil de Vendas</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Gerencie seus leads e oportunidades</p>
          </div>
          <Button data-testid="button-new-lead" className="gap-2 w-full sm:w-auto" onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
        <div data-testid="empty-state-leads" className="text-center py-16 sm:py-20 bg-muted/20 rounded-xl border border-dashed">
          <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum lead cadastrado</h3>
          <p className="text-muted-foreground mb-4 text-sm px-4">Comece adicionando seu primeiro lead.</p>
          <Button variant="outline" onClick={openCreateModal}>Adicionar Lead</Button>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Lead</DialogTitle>
              <DialogDescription>Preencha os dados do novo lead.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" data-testid="input-lead-name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" data-testid="input-lead-email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input id="phone" data-testid="input-lead-phone" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Origem</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}>
                    <SelectTrigger data-testid="select-lead-source"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Site">Site</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Portal">Portal Imobiliário</SelectItem>
                      <SelectItem value="Telefone">Telefone</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Orçamento (R$)</Label>
                  <Input id="budget" type="number" data-testid="input-lead-budget" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" data-testid="input-lead-notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-submit-lead">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Cadastrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div>
          <h1 data-testid="text-leads-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Funil de Vendas</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Clique no menu do lead para mover entre etapas</p>
        </div>
        <div className="flex gap-2">
          <TagsFilter />
          <Button data-testid="button-new-lead" className="gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Mobile: Stacked cards */}
      <div className="block sm:hidden space-y-4 overflow-y-auto flex-1 pb-4">
        {COLUMNS.map((column) => {
          const columnLeads = getLeadsByStatus(column.id);
          if (columnLeads.length === 0) return null;
          
          return (
            <div key={column.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <span className="font-semibold text-sm">{column.label}</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {columnLeads.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {columnLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} isMobile />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Horizontal kanban */}
      <div className="hidden sm:block flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex h-full gap-4 pb-4 min-w-max">
            {COLUMNS.map((column) => (
              <div key={column.id} className="flex flex-col w-[280px] lg:w-[300px] bg-secondary/30 rounded-xl border border-border/50 shrink-0">
                <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/50 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <span className="font-semibold text-sm">{column.label}</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 min-w-[20px] justify-center">
                      {getLeadsByStatus(column.id).length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openCreateModal}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {getLeadsByStatus(column.id).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Main Lead Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={editingLead ? "max-w-3xl max-h-[90vh] overflow-y-auto" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-lead">
              {editingLead ? "Editar Lead" : "Novo Lead"}
            </DialogTitle>
            <DialogDescription>
              {editingLead ? "Atualize os dados, gerencie tags e veja o histórico." : "Preencha os dados do novo lead."}
            </DialogDescription>
          </DialogHeader>
          
          {editingLead ? (
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="data">Dados</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
                <TabsTrigger value="followups">Lembretes ({leadFollowUps.filter(f => f.status === "pending").length})</TabsTrigger>
                <TabsTrigger value="history">Histórico ({interactions.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="data">
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input id="name" data-testid="input-lead-name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input id="email" type="email" data-testid="input-lead-email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input id="phone" data-testid="input-lead-phone" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="source">Origem</Label>
                      <Select value={formData.source} onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}>
                        <SelectTrigger data-testid="select-lead-source"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Site">Site</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="Indicação">Indicação</SelectItem>
                          <SelectItem value="Portal">Portal Imobiliário</SelectItem>
                          <SelectItem value="Telefone">Telefone</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">Orçamento (R$)</Label>
                      <Input id="budget" type="number" data-testid="input-lead-budget" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea id="notes" data-testid="input-lead-notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting} data-testid="button-submit-lead">
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="tags" className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="font-medium text-sm">Tags do Lead</div>
                  {allTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma tag criada ainda. Crie uma abaixo.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const isAssigned = leadTags.some((lt) => lt.id === tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleToggleTagOnLead(tag.id, isAssigned)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm transition-all ${
                              isAssigned ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            style={isAssigned ? { backgroundColor: tag.color } : {}}
                            data-testid={`button-toggle-tag-${tag.id}`}
                          >
                            {isAssigned && <Check className="h-3 w-3" />}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="font-medium text-sm">Criar Nova Tag</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome da tag"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="flex-1"
                      data-testid="input-new-tag-name"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" style={{ backgroundColor: newTagColor }} data-testid="button-tag-color">
                          <Tag className="h-4 w-4 text-white" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-5 gap-1">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-6 h-6 rounded-full ${newTagColor === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewTagColor(color)}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button onClick={handleCreateTag} disabled={isCreatingTag || !newTagName.trim()} data-testid="button-create-tag">
                      {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="followups" className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm">Lembretes</div>
                    <Button size="sm" variant="outline" onClick={() => setIsFollowUpModalOpen(true)} data-testid="button-add-followup">
                      <Plus className="h-4 w-4 mr-1" /> Novo Lembrete
                    </Button>
                  </div>
                  {leadFollowUps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum lembrete agendado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leadFollowUps.map((fu) => {
                        const isOverdue = fu.status === "pending" && new Date(fu.dueAt) < new Date();
                        const typeLabel = FOLLOW_UP_TYPES.find((t) => t.value === fu.type)?.label || fu.type;
                        return (
                          <div
                            key={fu.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              fu.status === "completed" ? "bg-muted/30 opacity-60" : isOverdue ? "border-destructive bg-destructive/5" : "bg-muted/50"
                            }`}
                            data-testid={`followup-${fu.id}`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              fu.status === "completed" ? "bg-green-100 text-green-600" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                            }`}>
                              {fu.status === "completed" ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[10px]">
                                  {typeLabel}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(fu.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                                {isOverdue && fu.status === "pending" && (
                                  <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>
                                )}
                                {fu.status === "completed" && (
                                  <Badge variant="outline" className="text-[10px]">Concluído</Badge>
                                )}
                              </div>
                              {fu.notes && <p className="text-sm">{fu.notes}</p>}
                            </div>
                            {fu.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCompleteFollowUp(fu.id)} data-testid={`button-complete-followup-${fu.id}`}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFollowUp(fu.id)} data-testid={`button-delete-followup-${fu.id}`}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Novo Lembrete</DialogTitle>
                      <DialogDescription>Agende um lembrete para este lead.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={newFollowUpType} onValueChange={setNewFollowUpType}>
                          <SelectTrigger data-testid="select-followup-type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FOLLOW_UP_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data e Hora</Label>
                        <Input
                          type="datetime-local"
                          value={newFollowUpDate}
                          onChange={(e) => setNewFollowUpDate(e.target.value)}
                          data-testid="input-followup-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Observações (opcional)</Label>
                        <Textarea
                          value={newFollowUpNotes}
                          onChange={(e) => setNewFollowUpNotes(e.target.value)}
                          rows={2}
                          data-testid="input-followup-notes"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsFollowUpModalOpen(false)}>Cancelar</Button>
                      <Button onClick={handleCreateFollowUp} disabled={isCreatingFollowUp || !newFollowUpDate} data-testid="button-submit-followup">
                        {isCreatingFollowUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Agendar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <Select value={newInteractionType} onValueChange={setNewInteractionType}>
                    <SelectTrigger className="w-36" data-testid="select-interaction-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERACTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="h-3 w-3" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Descreva a interação..."
                      value={newInteractionContent}
                      onChange={(e) => setNewInteractionContent(e.target.value)}
                      data-testid="input-interaction-content"
                    />
                    <Button size="icon" onClick={handleAddInteraction} disabled={isAddingInteraction || !newInteractionContent.trim()} data-testid="button-add-interaction">
                      {isAddingInteraction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {loadingInteractions ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </div>
                  ) : interactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="empty-state-interactions">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma interação registrada</p>
                    </div>
                  ) : (
                    interactions.map((interaction) => {
                      const typeInfo = INTERACTION_TYPES.find((t) => t.value === interaction.type) || INTERACTION_TYPES[4];
                      const IconComp = typeInfo.icon;
                      return (
                        <div key={interaction.id} className="flex gap-3 p-3 rounded-lg bg-muted/50" data-testid={`interaction-${interaction.id}`}>
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <IconComp className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-[10px]">{typeInfo.label}</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(interaction.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm">{interaction.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" data-testid="input-lead-name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" data-testid="input-lead-email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input id="phone" data-testid="input-lead-phone" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Origem</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}>
                    <SelectTrigger data-testid="select-lead-source"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Site">Site</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Portal">Portal Imobiliário</SelectItem>
                      <SelectItem value="Telefone">Telefone</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Orçamento (R$)</Label>
                  <Input id="budget" type="number" data-testid="input-lead-budget" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" data-testid="input-lead-notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-submit-lead">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Cadastrar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useImobi, LeadStatus, Lead } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import {
  Plus, MoreHorizontal, Phone, Mail, Users, ArrowRight, Loader2, MessageSquare, PhoneCall,
  Calendar, FileText, Send, Tag, Bell, Clock, X, Check, Filter, Home, MapPin, Bed,
  AlertTriangle, Flame, TrendingUp, TrendingDown, Eye, ChevronRight, GripVertical,
  Search, SlidersHorizontal, Save, Bookmark, Building2, DollarSign, User, Timer,
  AlertCircle, CheckCircle2, ArrowUpRight, Sparkles, RefreshCw, ExternalLink
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes, isToday, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";
import { PermissionGate } from "@/components/PermissionGate";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { QuickSendModal } from "@/components/whatsapp/QuickSendModal";

// ==================== TYPES ====================

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

type MatchedProperty = {
  property: {
    id: string;
    title: string;
    price: string;
    city: string;
    type: string;
    category: string;
    bedrooms: number | null;
    images: string[] | null;
  };
  score: number;
  matchReasons: string[];
};

type SavedView = {
  id: string;
  name: string;
  filters: FilterState;
};

type FilterState = {
  search: string;
  sources: string[];
  stages: LeadStatus[];
  tags: string[];
  budgetMin: number;
  budgetMax: number;
  daysWithoutContact: number | null;
  assignedTo: string | null;
};

// ==================== CONSTANTS ====================

const COLUMNS: { id: LeadStatus; label: string; color: string; bgColor: string }[] = [
  { id: "new", label: "Novo", color: "#3b82f6", bgColor: "bg-blue-500" },
  { id: "qualification", label: "Em Contato", color: "#8b5cf6", bgColor: "bg-purple-500" },
  { id: "visit", label: "Visita", color: "#f97316", bgColor: "bg-orange-500" },
  { id: "proposal", label: "Proposta", color: "#eab308", bgColor: "bg-yellow-500" },
  { id: "contract", label: "Fechado", color: "#22c55e", bgColor: "bg-green-500" },
];

const SOURCES = ["Site", "WhatsApp", "Instagram", "Facebook", "Indicação", "Portal", "Telefone", "Outro"];

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

const WHATSAPP_TEMPLATES = [
  { name: "Boas-vindas", message: "Olá! Obrigado pelo interesse. Como posso ajudar?" },
  { name: "Agendar visita", message: "Gostaria de agendar uma visita ao imóvel?" },
  { name: "Enviar proposta", message: "Preparei uma proposta personalizada para você." },
];

const DEFAULT_FILTERS: FilterState = {
  search: "",
  sources: [],
  stages: [],
  tags: [],
  budgetMin: 0,
  budgetMax: 10000000,
  daysWithoutContact: null,
  assignedTo: null,
};

type LeadFormData = {
  name: string;
  email: string;
  phone: string;
  source: string;
  budget: string;
  notes: string;
  preferredType: string;
  preferredCategory: string;
  preferredCity: string;
  preferredNeighborhood: string;
  minBedrooms: string;
  maxBedrooms: string;
};

const initialFormData: LeadFormData = {
  name: "",
  email: "",
  phone: "",
  source: "Site",
  budget: "",
  notes: "",
  preferredType: "",
  preferredCategory: "",
  preferredCity: "",
  preferredNeighborhood: "",
  minBedrooms: "",
  maxBedrooms: "",
};

// ==================== HELPERS ====================

function formatBudget(budget: string | null) {
  if (!budget) return null;
  const num = parseFloat(budget);
  if (isNaN(num)) return budget;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(num);
}

function formatBudgetShort(budget: string | null) {
  if (!budget) return null;
  const num = parseFloat(budget);
  if (isNaN(num)) return budget;
  if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `R$ ${(num / 1000).toFixed(0)}k`;
  return `R$ ${num}`;
}

function getTimeWithoutContact(lead: Lead): { days: number; hours: number; isUrgent: boolean; label: string } {
  const lastUpdate = new Date(lead.updatedAt);
  const now = new Date();
  const days = differenceInDays(now, lastUpdate);
  const hours = differenceInHours(now, lastUpdate);
  const minutes = differenceInMinutes(now, lastUpdate);

  let label = "";
  if (days > 0) label = `${days}d`;
  else if (hours > 0) label = `${hours}h`;
  else label = `${minutes}min`;

  return {
    days,
    hours,
    isUrgent: (lead.status === "new" && hours >= 2) || (lead.status !== "new" && days >= 2),
    label,
  };
}

function isHotLead(lead: Lead, followUps: FollowUp[], interactions: Interaction[]): boolean {
  const budget = parseFloat(lead.budget || "0");
  const hasHighBudget = budget >= 500000;
  const recentInteractions = interactions.filter(
    (i) => i.leadId === lead.id && differenceInDays(new Date(), new Date(i.createdAt)) <= 7
  ).length;
  const hasMultipleContacts = recentInteractions >= 2;
  const isInAdvancedStage = ["visit", "proposal"].includes(lead.status);
  const hasPendingFollowUp = followUps.some((f) => f.leadId === lead.id && f.status === "pending");

  return hasHighBudget || hasMultipleContacts || isInAdvancedStage || (lead.status === "new" && hasPendingFollowUp);
}

// ==================== MAIN COMPONENT ====================

export default function LeadsKanban() {
  const { leads, tenant, properties, refetchLeads, user } = useImobi();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // UI State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Filters
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState("");

  // Data State
  const [allTags, setAllTags] = useState<LeadTag[]>([]);
  const [leadTagsMap, setLeadTagsMap] = useState<Record<string, LeadTag[]>>({});
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [allInteractions, setAllInteractions] = useState<Interaction[]>([]);

  // Detail Panel State
  const [leadInteractions, setLeadInteractions] = useState<Interaction[]>([]);
  const [leadFollowUps, setLeadFollowUps] = useState<FollowUp[]>([]);
  const [leadTags, setLeadTags] = useState<LeadTag[]>([]);
  const [matchedProperties, setMatchedProperties] = useState<MatchedProperty[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Interaction Form
  const [newInteractionType, setNewInteractionType] = useState("note");
  const [newInteractionContent, setNewInteractionContent] = useState("");
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);

  // Follow-up Form
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [newFollowUpType, setNewFollowUpType] = useState("call");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newFollowUpNotes, setNewFollowUpNotes] = useState("");
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);

  // Tag Form
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Drag state
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // WhatsApp Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppRecipient, setWhatsAppRecipient] = useState<{ name: string; phone: string } | null>(null);

  // ==================== EFFECTS ====================

  useEffect(() => {
    fetchAllTags();
    fetchAllFollowUps();
    loadSavedViews();
  }, []);

  useEffect(() => {
    if (leads.length > 0) {
      fetchAllLeadTags();
    }
  }, [leads]);

  useEffect(() => {
    if (selectedLead) {
      loadLeadDetails(selectedLead.id);
    } else {
      setLeadInteractions([]);
      setLeadFollowUps([]);
      setLeadTags([]);
      setMatchedProperties([]);
    }
  }, [selectedLead]);

  // ==================== DATA FETCHING ====================

  const fetchAllTags = async () => {
    try {
      const res = await fetch("/api/lead-tags", { credentials: "include" });
      if (res.ok) setAllTags(await res.json());
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const fetchAllLeadTags = async () => {
    try {
      const res = await fetch("/api/leads/tags/batch", { credentials: "include" });
      if (res.ok) setLeadTagsMap(await res.json());
    } catch (error) {
      console.error("Failed to fetch lead tags batch:", error);
    }
  };

  const fetchAllFollowUps = async () => {
    try {
      const res = await fetch("/api/follow-ups", { credentials: "include" });
      if (res.ok) setFollowUps(await res.json());
    } catch (error) {
      console.error("Failed to fetch follow-ups:", error);
    }
  };

  const loadLeadDetails = async (leadId: string) => {
    setLoadingDetail(true);
    try {
      const [interactionsRes, followUpsRes, tagsRes, matchedRes] = await Promise.all([
        fetch(`/api/leads/${leadId}/interactions`, { credentials: "include" }),
        fetch(`/api/leads/${leadId}/follow-ups`, { credentials: "include" }),
        fetch(`/api/leads/${leadId}/tags`, { credentials: "include" }),
        fetch(`/api/leads/${leadId}/matched-properties`, { credentials: "include" }),
      ]);

      if (interactionsRes.ok) setLeadInteractions(await interactionsRes.json());
      if (followUpsRes.ok) setLeadFollowUps(await followUpsRes.json());
      if (tagsRes.ok) setLeadTags(await tagsRes.json());
      if (matchedRes.ok) setMatchedProperties(await matchedRes.json());
    } catch (error) {
      console.error("Failed to load lead details:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ==================== VIEWS ====================

  const loadSavedViews = () => {
    const saved = localStorage.getItem("lead-views");
    if (saved) setSavedViews(JSON.parse(saved));
  };

  const saveView = () => {
    if (!newViewName.trim()) return;
    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName,
      filters: { ...filters },
    };
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem("lead-views", JSON.stringify(updated));
    setNewViewName("");
    toast({ title: "Visão salva", description: `"${newViewName}" foi salva com sucesso.` });
  };

  const applyView = (view: SavedView) => {
    setFilters(view.filters);
    setActiveView(view.id);
  };

  const deleteView = (viewId: string) => {
    const updated = savedViews.filter((v) => v.id !== viewId);
    setSavedViews(updated);
    localStorage.setItem("lead-views", JSON.stringify(updated));
    if (activeView === viewId) setActiveView(null);
  };

  // ==================== FILTERING ====================

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          lead.name.toLowerCase().includes(searchLower) ||
          lead.email.toLowerCase().includes(searchLower) ||
          lead.phone.includes(filters.search);
        if (!matchesSearch) return false;
      }

      // Sources
      if (filters.sources.length > 0 && !filters.sources.includes(lead.source)) return false;

      // Stages
      if (filters.stages.length > 0 && !filters.stages.includes(lead.status)) return false;

      // Tags
      if (filters.tags.length > 0) {
        const leadTagIds = (leadTagsMap[lead.id] || []).map((t) => t.id);
        if (!filters.tags.some((tagId) => leadTagIds.includes(tagId))) return false;
      }

      // Budget
      const budget = parseFloat(lead.budget || "0");
      if (budget < filters.budgetMin || budget > filters.budgetMax) return false;

      // Days without contact
      if (filters.daysWithoutContact !== null) {
        const { days } = getTimeWithoutContact(lead);
        if (days < filters.daysWithoutContact) return false;
      }

      return true;
    });
  }, [leads, filters, leadTagsMap]);

  const getLeadsByStatus = (status: LeadStatus) => {
    return filteredLeads.filter((l) => l.status === status);
  };

  // ==================== HOT LEADS & SLA ====================

  const hotLeads = useMemo(() => {
    return filteredLeads
      .filter((lead) => isHotLead(lead, followUps, allInteractions))
      .slice(0, 5);
  }, [filteredLeads, followUps, allInteractions]);

  const slaAlerts = useMemo(() => {
    const newLeadsNoContact = filteredLeads.filter((l) => {
      if (l.status !== "new") return false;
      const hours = differenceInHours(new Date(), new Date(l.createdAt));
      return hours >= 2;
    });

    const leadsWithoutUpdate = filteredLeads.filter((l) => {
      if (l.status === "contract") return false;
      const days = differenceInDays(new Date(), new Date(l.updatedAt));
      return days >= 3;
    });

    const overdueFollowUps = followUps.filter((f) => {
      return f.status === "pending" && isPast(new Date(f.dueAt)) && !isToday(new Date(f.dueAt));
    });

    return {
      newLeadsNoContact: newLeadsNoContact.length,
      leadsWithoutUpdate: leadsWithoutUpdate.length,
      overdueFollowUps: overdueFollowUps.length,
      total: newLeadsNoContact.length + leadsWithoutUpdate.length + overdueFollowUps.length,
    };
  }, [filteredLeads, followUps]);

  const columnStats = useMemo(() => {
    // Calculate week-over-week change (simplified - just shows current count)
    return COLUMNS.map((col) => ({
      ...col,
      count: getLeadsByStatus(col.id).length,
      change: 0, // Would need historical data to calculate
    }));
  }, [filteredLeads]);

  // ==================== HANDLERS ====================

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lead.id);
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    // If moving to "visit", open schedule modal
    if (newStatus === "visit" && draggedLead.status !== "visit") {
      toast({
        title: "Agendar visita",
        description: "Acesse a agenda para agendar uma visita para este lead.",
        action: (
          <Button size="sm" variant="outline" onClick={() => setLocation("/calendar")}>
            Ir para Agenda
          </Button>
        ),
      });
    }

    // If moving to "proposal" or "contract", show guidance
    if (newStatus === "proposal" || newStatus === "contract") {
      toast({
        title: newStatus === "proposal" ? "Criar proposta" : "Criar contrato",
        description: `Acesse o módulo de ${newStatus === "proposal" ? "propostas" : "contratos"} para finalizar.`,
        action: (
          <Button size="sm" variant="outline" onClick={() => setLocation("/contracts")}>
            Ir para Contratos
          </Button>
        ),
      });
    }

    try {
      const res = await fetch(`/api/leads/${draggedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const statusLabel = COLUMNS.find((c) => c.id === newStatus)?.label || newStatus;
        toast({ title: "Lead movido", description: `Lead movido para "${statusLabel}".` });
        await refetchLeads();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível mover o lead.", variant: "destructive" });
    }

    setDraggedLead(null);
  };

  const handleMoveToStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast({ title: "Lead movido" });
        await refetchLeads();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível mover o lead.", variant: "destructive" });
    }
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
        status: selectedLead?.status || "new",
        preferredType: formData.preferredType || null,
        preferredCategory: formData.preferredCategory || null,
        preferredCity: formData.preferredCity || null,
        preferredNeighborhood: formData.preferredNeighborhood || null,
        minBedrooms: formData.minBedrooms ? parseInt(formData.minBedrooms) : null,
        maxBedrooms: formData.maxBedrooms ? parseInt(formData.maxBedrooms) : null,
      };

      const url = selectedLead ? `/api/leads/${selectedLead.id}` : "/api/leads";
      const method = selectedLead ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar lead");

      toast({ title: selectedLead ? "Lead atualizado" : "Lead criado" });
      setIsCreateModalOpen(false);
      setFormData(initialFormData);
      await refetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!selectedLead || !newInteractionContent.trim()) return;

    setIsAddingInteraction(true);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadId: selectedLead.id,
          type: newInteractionType,
          content: newInteractionContent,
        }),
      });

      if (res.ok) {
        toast({ title: "Interação registrada" });
        setNewInteractionContent("");
        await loadLeadDetails(selectedLead.id);
      }
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setIsAddingInteraction(false);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!selectedLead || !newFollowUpDate) return;
    setIsCreatingFollowUp(true);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadId: selectedLead.id,
          type: newFollowUpType,
          dueAt: new Date(newFollowUpDate).toISOString(),
          notes: newFollowUpNotes || null,
          status: "pending",
        }),
      });
      if (res.ok) {
        toast({ title: "Lembrete criado" });
        setNewFollowUpDate("");
        setNewFollowUpNotes("");
        setIsFollowUpModalOpen(false);
        await loadLeadDetails(selectedLead.id);
        await fetchAllFollowUps();
      }
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
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
      if (selectedLead) await loadLeadDetails(selectedLead.id);
      await fetchAllFollowUps();
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleToggleTag = async (tagId: string, isAssigned: boolean) => {
    if (!selectedLead) return;
    try {
      if (isAssigned) {
        await fetch(`/api/leads/${selectedLead.id}/tags/${tagId}`, { method: "DELETE", credentials: "include" });
      } else {
        await fetch(`/api/leads/${selectedLead.id}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tagId }),
        });
      }
      await loadLeadDetails(selectedLead.id);
      await fetchAllLeadTags();
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
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
        toast({ title: "Tag criada" });
        setNewTagName("");
        await fetchAllTags();
      }
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleArchive = async (leadId: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, { method: "DELETE", credentials: "include" });
      toast({ title: "Lead arquivado" });
      setIsDetailOpen(false);
      setSelectedLead(null);
      await refetchLeads();
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const openWhatsApp = (lead: Lead, message?: string) => {
    setWhatsAppRecipient({ name: lead.name, phone: lead.phone });
    setIsWhatsAppModalOpen(true);
  };

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActiveView(null);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.sources.length > 0 ||
      filters.stages.length > 0 ||
      filters.tags.length > 0 ||
      filters.budgetMin > 0 ||
      filters.budgetMax < 10000000 ||
      filters.daysWithoutContact !== null
    );
  }, [filters]);

  // ==================== BULK ACTIONS ====================

  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    if (isBulkMode) {
      setSelectedLeads(new Set());
    }
  };

  const toggleLeadSelection = (leadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    const allVisibleIds = filteredLeads.map((l) => l.id);
    setSelectedLeads(new Set(allVisibleIds));
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

  const handleBulkMoveToStatus = async (status: LeadStatus) => {
    if (selectedLeads.size === 0) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedLeads).map((leadId) =>
        fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        })
      );
      await Promise.all(promises);
      toast({
        title: "Leads movidos",
        description: `${selectedLeads.size} lead(s) movido(s) para ${COLUMNS.find((c) => c.id === status)?.label}`,
      });
      setSelectedLeads(new Set());
      setIsBulkMode(false);
      await refetchLeads();
    } catch (error) {
      toast({ title: "Erro ao mover leads", variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkAddTag = async (tagId: string) => {
    if (selectedLeads.size === 0) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedLeads).map((leadId) =>
        fetch(`/api/leads/${leadId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tagId }),
        })
      );
      await Promise.all(promises);
      toast({
        title: "Tags adicionadas",
        description: `Tag adicionada a ${selectedLeads.size} lead(s)`,
      });
      await fetchAllLeadTags();
    } catch (error) {
      toast({ title: "Erro ao adicionar tags", variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRemoveTag = async (tagId: string) => {
    if (selectedLeads.size === 0) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedLeads).map((leadId) =>
        fetch(`/api/leads/${leadId}/tags/${tagId}`, {
          method: "DELETE",
          credentials: "include",
        })
      );
      await Promise.all(promises);
      toast({
        title: "Tags removidas",
        description: `Tag removida de ${selectedLeads.size} lead(s)`,
      });
      await fetchAllLeadTags();
    } catch (error) {
      toast({ title: "Erro ao remover tags", variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedLeads.size === 0) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedLeads).map((leadId) =>
        fetch(`/api/leads/${leadId}`, {
          method: "DELETE",
          credentials: "include",
        })
      );
      await Promise.all(promises);
      toast({
        title: "Leads arquivados",
        description: `${selectedLeads.size} lead(s) arquivado(s)`,
      });
      setSelectedLeads(new Set());
      setIsBulkMode(false);
      await refetchLeads();
    } catch (error) {
      toast({ title: "Erro ao arquivar leads", variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkWhatsApp = (templateIndex?: number) => {
    if (selectedLeads.size === 0) return;
    const selectedLeadsList = leads.filter((l) => selectedLeads.has(l.id));

    // Open WhatsApp for each selected lead
    selectedLeadsList.forEach((lead, index) => {
      setTimeout(() => {
        const message = templateIndex !== undefined ? WHATSAPP_TEMPLATES[templateIndex].message : undefined;
        openWhatsApp(lead, message);
      }, index * 500); // Stagger openings to avoid browser blocking
    });
  };

  // ==================== COMPONENTS ====================

  const LeadCard = ({ lead, isMobile = false }: { lead: Lead; isMobile?: boolean }) => {
    const tags = leadTagsMap[lead.id] || [];
    const pendingFollowUps = followUps.filter((f) => f.leadId === lead.id && f.status === "pending");
    const hasOverdue = pendingFollowUps.some((f) => isPast(new Date(f.dueAt)));
    const timeInfo = getTimeWithoutContact(lead);
    const isHot = isHotLead(lead, followUps, allInteractions);
    const topProperty = matchedProperties.find((m) => m.property.id)?.property;
    const isSelected = selectedLeads.has(lead.id);

    return (
      <Card
        draggable={!isMobile && !isBulkMode}
        onDragStart={(e) => handleDragStart(e, lead)}
        onDragEnd={() => setDraggedLead(null)}
        className={`
          ${!isMobile && !isBulkMode ? "cursor-grab active:cursor-grabbing touch-none select-none" : ""}
          transition-all border-l-4 hover:shadow-md active:scale-[0.98]
          ${draggedLead?.id === lead.id ? "opacity-50 scale-95" : ""}
          ${isHot ? "ring-2 ring-orange-400 ring-offset-1" : ""}
          ${isSelected ? "ring-2 ring-primary ring-offset-1 bg-primary/5" : ""}
          ${isMobile ? "min-h-[120px]" : ""}
        `}
        style={{ borderLeftColor: COLUMNS.find((c) => c.id === lead.status)?.color }}
        onClick={() => isBulkMode ? toggleLeadSelection(lead.id) : openLeadDetail(lead)}
      >
        <CardContent className="p-3 sm:p-4 space-y-2.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {isBulkMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleLeadSelection(lead.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mr-1 shrink-0"
                />
              )}
              {isHot && <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
              <span className="font-medium text-sm truncate">{lead.name}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 shrink-0 active:scale-95 transition-transform">
                  <MoreHorizontal className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openLeadDetail(lead); }}>
                  <Eye className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openWhatsApp(lead); }}>
                  <MessageSquare className="h-3.5 w-3.5 mr-2" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowRight className="h-3.5 w-3.5 mr-2" /> Mover para
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {COLUMNS.filter((c) => c.id !== lead.status).map((col) => (
                      <DropdownMenuItem
                        key={col.id}
                        onClick={(e) => { e.stopPropagation(); handleMoveToStatus(lead.id, col.id); }}
                      >
                        <div className={`w-2 h-2 rounded-full ${col.bgColor} mr-2`} />
                        {col.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleArchive(lead.id); }}
                >
                  Arquivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{lead.source}</Badge>
            {pendingFollowUps.length > 0 && (
              <Badge variant={hasOverdue ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 gap-0.5">
                <Bell className="h-2.5 w-2.5" />
                {pendingFollowUps.length}
              </Badge>
            )}
            {timeInfo.isUrgent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">
                <Clock className="h-2.5 w-2.5 mr-0.5" />
                {timeInfo.label}
              </Badge>
            )}
          </div>

          {/* Budget & Property Interest */}
          <div className="flex items-center justify-between gap-2 text-xs">
            {lead.budget && (
              <span className="font-medium text-primary">{formatBudgetShort(lead.budget)}</span>
            )}
            {lead.preferredType && (
              <span className="text-muted-foreground truncate">{lead.preferredType}</span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 rounded text-[10px] text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
              )}
            </div>
          )}

          {/* Footer - Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate flex-1">
              {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })}
            </span>
            <div className="flex gap-1 shrink-0">
              <WhatsAppButton
                phone={lead.phone}
                onClick={() => openWhatsApp(lead)}
                size="sm"
                className="h-9 w-9 sm:h-8 sm:w-8"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-8 sm:w-8 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.phone}`); }}
                title="Ligar"
              >
                <Phone className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const FilterPanel = () => (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Search */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome, email ou telefone..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Sources */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Origem</Label>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((source) => (
            <Button
              key={source}
              variant={filters.sources.includes(source) ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  sources: f.sources.includes(source)
                    ? f.sources.filter((s) => s !== source)
                    : [...f.sources, source],
                }))
              }
            >
              {source}
            </Button>
          ))}
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Etapa do Funil</Label>
        <div className="flex flex-wrap gap-1.5">
          {COLUMNS.map((col) => (
            <Button
              key={col.id}
              variant={filters.stages.includes(col.id) ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  stages: f.stages.includes(col.id)
                    ? f.stages.filter((s) => s !== col.id)
                    : [...f.stages, col.id],
                }))
              }
            >
              <div className={`w-2 h-2 rounded-full ${col.bgColor}`} />
              {col.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <Button
                key={tag.id}
                variant={filters.tags.includes(tag.id) ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                style={filters.tags.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    tags: f.tags.includes(tag.id)
                      ? f.tags.filter((t) => t !== tag.id)
                      : [...f.tags, tag.id],
                  }))
                }
              >
                {tag.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Budget Range */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">
          Orçamento: {formatBudget(filters.budgetMin.toString())} - {formatBudget(filters.budgetMax.toString())}
        </Label>
        <div className="px-2">
          <Slider
            value={[filters.budgetMin, filters.budgetMax]}
            onValueChange={([min, max]) => setFilters((f) => ({ ...f, budgetMin: min, budgetMax: max }))}
            min={0}
            max={10000000}
            step={50000}
            className="w-full"
          />
        </div>
      </div>

      {/* Days without contact */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Tempo sem contato</Label>
        <Select
          value={filters.daysWithoutContact?.toString() || "any"}
          onValueChange={(v) => setFilters((f) => ({ ...f, daysWithoutContact: v === "any" ? null : parseInt(v) }))}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Qualquer</SelectItem>
            <SelectItem value="1">1+ dia</SelectItem>
            <SelectItem value="3">3+ dias</SelectItem>
            <SelectItem value="7">7+ dias</SelectItem>
            <SelectItem value="14">14+ dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" className="flex-1" onClick={clearFilters}>
          Limpar
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Save className="h-3.5 w-3.5" /> Salvar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <Label className="text-xs">Nome da visão</Label>
              <Input
                placeholder="Ex: Leads quentes"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="h-8"
              />
              <Button size="sm" className="w-full" onClick={saveView} disabled={!newViewName.trim()}>
                Salvar visão
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs font-medium">Visões salvas</Label>
          <div className="space-y-1">
            {savedViews.map((view) => (
              <div
                key={view.id}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  activeView === view.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                }`}
              >
                <button
                  className="flex items-center gap-2 text-sm flex-1 text-left"
                  onClick={() => applyView(view)}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${activeView === view.id ? "text-primary" : ""}`} />
                  {view.name}
                </button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteView(view.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ==================== RENDER ====================

  if (leads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold">CRM de Vendas</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus leads e oportunidades</p>
          </div>
          <PermissionGate permission="leads.create">
            <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4" /> Novo Lead
            </Button>
          </PermissionGate>
        </div>

        <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
          <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum lead cadastrado</h3>
          <p className="text-muted-foreground mb-4 text-sm">Comece adicionando seu primeiro lead.</p>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>
            Adicionar Lead
          </Button>
        </div>

        {/* Create Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData((f) => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orçamento (R$)</Label>
                  <Input type="number" value={formData.budget} onChange={(e) => setFormData((f) => ({ ...f, budget: e.target.value }))} />
                </div>
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
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
    <div className="h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-heading font-bold truncate">CRM de Vendas</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} {hasActiveFilters && "(filtrado)"}
            </p>
          </div>
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            {/* Bulk Mode Toggle - Touch Optimized */}
            <Button
              variant={isBulkMode ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5 h-9 sm:h-10 min-w-[44px] active:scale-95 transition-transform"
              onClick={toggleBulkMode}
            >
              {isBulkMode ? (
                <CheckCircle2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              ) : (
                <div className="h-4 w-4 sm:h-3.5 sm:w-3.5 rounded-sm border border-current" />
              )}
              <span className="hidden sm:inline">{isBulkMode ? "Sair seleção" : "Selecionar"}</span>
            </Button>

            {/* Filters Sheet - Mobile First */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 sm:h-10 min-w-[44px] active:scale-95 transition-transform relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {hasActiveFilters && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] sm:static sm:h-5 sm:w-auto sm:px-1.5">
                      <span className="hidden sm:inline">!</span>
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto p-4 sm:p-6">
                <SheetHeader className="mb-4 sm:mb-6">
                  <SheetTitle className="text-lg sm:text-xl">Filtros e Segmentação</SheetTitle>
                  <SheetDescription className="text-sm">Filtre leads por origem, etapa, orçamento e mais</SheetDescription>
                </SheetHeader>
                <FilterPanel />
              </SheetContent>
            </Sheet>
            <Button className="gap-1.5 h-9" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Lead</span>
            </Button>
          </div>
        </div>

        {/* SLA Alerts */}
        {slaAlerts.total > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {slaAlerts.newLeadsNoContact > 0 && (
              <Badge variant="destructive" className="shrink-0 gap-1.5 py-1 px-2.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs">{slaAlerts.newLeadsNoContact} leads novos sem contato</span>
              </Badge>
            )}
            {slaAlerts.leadsWithoutUpdate > 0 && (
              <Badge variant="outline" className="shrink-0 gap-1.5 py-1 px-2.5 text-amber-600 border-amber-300">
                <Timer className="h-3.5 w-3.5" />
                <span className="text-xs">{slaAlerts.leadsWithoutUpdate} sem atualização há 3+ dias</span>
              </Badge>
            )}
            {slaAlerts.overdueFollowUps > 0 && (
              <Badge variant="outline" className="shrink-0 gap-1.5 py-1 px-2.5 text-red-600 border-red-300">
                <Bell className="h-3.5 w-3.5" />
                <span className="text-xs">{slaAlerts.overdueFollowUps} lembretes atrasados</span>
              </Badge>
            )}
          </div>
        )}

        {/* Hot Leads Section - Touch Optimized */}
        {hotLeads.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              <span className="text-sm sm:text-base font-medium">Leads Quentes</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{hotLeads.length}</Badge>
            </div>
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {hotLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-orange-50 border-orange-200 min-w-[220px] sm:min-w-[260px] shrink-0 cursor-pointer hover:bg-orange-100 active:bg-orange-200 transition-colors active:scale-[0.98]"
                  onClick={() => openLeadDetail(lead)}
                >
                  <div
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: COLUMNS.find((c) => c.id === lead.status)?.color }}
                  >
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-medium truncate">{lead.name}</p>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      {lead.budget && <span className="font-medium text-orange-600">{formatBudgetShort(lead.budget)}</span>}
                      <span className="truncate">{COLUMNS.find((c) => c.id === lead.status)?.label}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-8 sm:w-8 shrink-0 text-green-600 hover:bg-green-100 active:bg-green-200"
                    onClick={(e) => { e.stopPropagation(); openWhatsApp(lead); }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Column Stats - Mobile Optimized */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-5 md:gap-3">
          {columnStats.map((col) => (
            <div
              key={col.id}
              className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg border bg-card min-w-[110px] sm:min-w-0 shrink-0 sm:shrink hover:border-primary/20 transition-colors"
            >
              <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${col.bgColor} flex items-center justify-center shrink-0 shadow-sm`}>
                <span className="text-white text-sm sm:text-base font-bold">{col.count}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate font-medium">{col.label}</p>
                {col.change !== 0 && (
                  <div className={`flex items-center gap-0.5 text-[10px] ${col.change > 0 ? "text-green-600" : "text-red-600"}`}>
                    {col.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(col.change)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Horizontal Scroll Kanban with Snap Points */}
      <div className="block md:hidden flex-1 overflow-hidden pb-4">
        {/* Swipe Indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={`h-1.5 rounded-full transition-all ${
                col.id === "new" ? "w-6 opacity-100" : "w-1.5 opacity-40"
              }`}
              style={{ backgroundColor: col.color }}
            />
          ))}
        </div>

        {/* Horizontal Scroll Container */}
        <ScrollArea className="w-full h-full">
          <div className="flex gap-3 pb-4 px-1">
            {COLUMNS.map((column) => {
              const columnLeads = getLeadsByStatus(column.id);

              return (
                <div
                  key={column.id}
                  className="snap-center min-w-[85vw] xs:min-w-[90vw] shrink-0 flex flex-col rounded-xl border bg-muted/30 border-border/50 max-h-full"
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  {/* Sticky Column Header */}
                  <div className="sticky top-0 z-20 p-3 border-b border-border/50 flex items-center justify-between bg-card/95 backdrop-blur-sm rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${column.bgColor} shrink-0`} />
                      <span className="font-semibold text-sm truncate">{column.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                        {columnLeads.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Column Content */}
                  <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-0">
                    {columnLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} isMobile />
                    ))}
                    {columnLeads.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className={`w-12 h-12 rounded-full ${column.bgColor} opacity-20 mx-auto mb-3`} />
                        <p className="text-xs">Nenhum lead nesta etapa</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-2" />
        </ScrollArea>
      </div>

      {/* Tablet/Desktop: Kanban */}
      <div className="hidden md:block flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex h-full gap-3 pb-4 min-w-max md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:min-w-0">
            {COLUMNS.map((column) => (
              <div
                key={column.id}
                className={`flex flex-col md:w-auto w-[280px] xl:w-[300px] rounded-xl border shrink-0 md:shrink transition-all ${
                  dragOverColumn === column.id
                    ? "bg-primary/5 border-primary border-2"
                    : "bg-muted/30 border-border/50"
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/95 rounded-t-xl backdrop-blur-sm sticky top-0 z-20">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`w-3 h-3 rounded-full ${column.bgColor} shrink-0`} />
                    <span className="font-semibold text-sm truncate">{column.label}</span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                      {getLeadsByStatus(column.id).length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-0">
                  {getLeadsByStatus(column.id).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                  {getLeadsByStatus(column.id).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className={`w-12 h-12 rounded-full ${column.bgColor} opacity-20 mx-auto mb-3`} />
                      <p className="text-xs">Arraste leads aqui</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-2" />
        </ScrollArea>
      </div>

      {/* Bulk Actions Bar - Mobile Optimized */}
      {isBulkMode && selectedLeads.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <Card className="shadow-2xl border-2 border-primary/20 bg-background/98 backdrop-blur-md">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Selection Info */}
                <div className="flex items-center gap-2 justify-between sm:justify-start">
                  <Badge variant="secondary" className="gap-1.5 text-xs sm:text-sm h-8 px-3">
                    <Check className="h-3.5 w-3.5" />
                    {selectedLeads.size} selecionado{selectedLeads.size !== 1 ? "s" : ""}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs hidden sm:inline-flex"
                      onClick={selectAllVisible}
                    >
                      Todos ({filteredLeads.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={clearSelection}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                <Separator className="w-full sm:hidden" />

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                  {/* Move to Status */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs sm:text-sm">
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mover</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      {COLUMNS.map((col) => (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={() => handleBulkMoveToStatus(col.id)}
                          disabled={bulkActionLoading}
                        >
                          <div className={`w-2 h-2 rounded-full ${col.bgColor} mr-2`} />
                          {col.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Add Tags */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs sm:text-sm">
                        <Tag className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Tags</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Plus className="h-3.5 w-3.5 mr-2" />
                          Adicionar Tag
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {allTags.length === 0 ? (
                            <DropdownMenuItem disabled>Nenhuma tag disponível</DropdownMenuItem>
                          ) : (
                            allTags.map((tag) => (
                              <DropdownMenuItem
                                key={tag.id}
                                onClick={() => handleBulkAddTag(tag.id)}
                                disabled={bulkActionLoading}
                              >
                                <div
                                  className="w-3 h-3 rounded mr-2"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <X className="h-3.5 w-3.5 mr-2" />
                          Remover Tag
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {allTags.length === 0 ? (
                            <DropdownMenuItem disabled>Nenhuma tag disponível</DropdownMenuItem>
                          ) : (
                            allTags.map((tag) => (
                              <DropdownMenuItem
                                key={tag.id}
                                onClick={() => handleBulkRemoveTag(tag.id)}
                                disabled={bulkActionLoading}
                              >
                                <div
                                  className="w-3 h-3 rounded mr-2"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* WhatsApp */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs sm:text-sm bg-green-50 hover:bg-green-100 border-green-200">
                        <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                        <span className="hidden sm:inline text-green-700">WhatsApp</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onClick={() => handleBulkWhatsApp()}>
                        <Send className="h-3.5 w-3.5 mr-2" />
                        Abrir conversa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {WHATSAPP_TEMPLATES.map((tpl, idx) => (
                        <DropdownMenuItem key={idx} onClick={() => handleBulkWhatsApp(idx)}>
                          <MessageSquare className="h-3.5 w-3.5 mr-2" />
                          {tpl.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Archive */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs sm:text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleBulkArchive}
                    disabled={bulkActionLoading}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Arquivar</span>
                  </Button>
                </div>

                {/* Close Bulk Mode */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => { setIsBulkMode(false); setSelectedLeads(new Set()); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {bulkActionLoading && (
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Lead Modal - Mobile Optimized */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Novo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={formData.phone} onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData((f) => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Orçamento (R$)</Label>
                <Input type="number" value={formData.budget} onChange={(e) => setFormData((f) => ({ ...f, budget: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Preferências de Imóvel</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={formData.preferredType} onValueChange={(v) => setFormData((f) => ({ ...f, preferredType: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Qualquer</SelectItem>
                      <SelectItem value="Apartamento">Apartamento</SelectItem>
                      <SelectItem value="Casa">Casa</SelectItem>
                      <SelectItem value="Terreno">Terreno</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Interesse</Label>
                  <Select value={formData.preferredCategory} onValueChange={(v) => setFormData((f) => ({ ...f, preferredCategory: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Qualquer</SelectItem>
                      <SelectItem value="Venda">Comprar</SelectItem>
                      <SelectItem value="Aluguel">Alugar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Cidade</Label>
                  <Input className="h-9" value={formData.preferredCity} onChange={(e) => setFormData((f) => ({ ...f, preferredCity: e.target.value }))} placeholder="Ex: São Paulo" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Quartos (mín)</Label>
                  <Input className="h-9" type="number" value={formData.minBedrooms} onChange={(e) => setFormData((f) => ({ ...f, minBedrooms: e.target.value }))} />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Sheet - Full Screen Mobile */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[500px] lg:w-[600px] xl:w-[700px] p-0 flex flex-col h-full max-h-screen md:max-h-[95vh]"
        >
          {selectedLead && (
            <>
              {/* Header */}
              <div className="p-4 sm:p-6 border-b bg-muted/30">
                <div className="flex items-start gap-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{ backgroundColor: COLUMNS.find((c) => c.id === selectedLead.status)?.color }}
                  >
                    {selectedLead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold truncate">{selectedLead.name}</h2>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <Badge style={{ backgroundColor: COLUMNS.find((c) => c.id === selectedLead.status)?.color }}>
                        {COLUMNS.find((c) => c.id === selectedLead.status)?.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{selectedLead.source}</Badge>
                      {isHotLead(selectedLead, followUps, allInteractions) && (
                        <Badge className="bg-orange-500 gap-1">
                          <Flame className="h-3 w-3" /> Quente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => openWhatsApp(selectedLead)}>
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(`tel:${selectedLead.phone}`)}>
                    <Phone className="h-4 w-4" /> Ligar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLocation("/calendar")}>
                    <Calendar className="h-4 w-4" /> Agendar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLocation("/contracts")}>
                    <FileText className="h-4 w-4" /> Proposta
                  </Button>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
                    <TabsTrigger value="info" className="text-xs sm:text-sm">Info</TabsTrigger>
                    <TabsTrigger value="properties" className="text-xs sm:text-sm">
                      Imóveis ({matchedProperties.length})
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="text-xs sm:text-sm">
                      Timeline ({leadInteractions.length})
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="text-xs sm:text-sm">
                      Tarefas ({leadFollowUps.filter((f) => f.status === "pending").length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Info Tab */}
                  <TabsContent value="info" className="p-4 space-y-4 mt-0">
                    {/* Contact Info */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm">Contato</h3>
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedLead.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{selectedLead.email}</span>
                        </div>
                        {selectedLead.budget && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatBudget(selectedLead.budget)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Preferences */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm">Preferências de Imóvel</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedLead.preferredType && (
                          <div>
                            <span className="text-muted-foreground text-xs">Tipo</span>
                            <p>{selectedLead.preferredType}</p>
                          </div>
                        )}
                        {selectedLead.preferredCategory && (
                          <div>
                            <span className="text-muted-foreground text-xs">Interesse</span>
                            <p>{selectedLead.preferredCategory}</p>
                          </div>
                        )}
                        {selectedLead.preferredCity && (
                          <div>
                            <span className="text-muted-foreground text-xs">Cidade</span>
                            <p>{selectedLead.preferredCity}</p>
                          </div>
                        )}
                        {(selectedLead.minBedrooms || selectedLead.maxBedrooms) && (
                          <div>
                            <span className="text-muted-foreground text-xs">Quartos</span>
                            <p>{selectedLead.minBedrooms || 0} - {selectedLead.maxBedrooms || "+"}</p>
                          </div>
                        )}
                      </div>
                      {!selectedLead.preferredType && !selectedLead.preferredCity && (
                        <p className="text-sm text-muted-foreground">Nenhuma preferência cadastrada</p>
                      )}
                    </div>

                    <Separator />

                    {/* Tags */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm">Tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {allTags.map((tag) => {
                          const isAssigned = leadTags.some((lt) => lt.id === tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => handleToggleTag(tag.id, isAssigned)}
                              className={`px-2 py-1 rounded text-xs transition-all ${
                                isAssigned ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                              style={isAssigned ? { backgroundColor: tag.color } : {}}
                            >
                              {isAssigned && <Check className="h-3 w-3 inline mr-1" />}
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nova tag"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="h-8 flex-1"
                        />
                        <Button size="sm" className="h-8" onClick={handleCreateTag} disabled={isCreatingTag || !newTagName.trim()}>
                          {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Notes */}
                    {selectedLead.notes && (
                      <div className="space-y-2">
                        <h3 className="font-medium text-sm">Observações</h3>
                        <p className="text-sm text-muted-foreground">{selectedLead.notes}</p>
                      </div>
                    )}

                    {/* WhatsApp Templates */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        Mensagens Rápidas
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 px-3 justify-start text-left"
                          onClick={() => openWhatsApp(selectedLead, `Olá ${selectedLead.name.split(" ")[0]}! Tudo bem? Vi que você tem interesse em imóveis. Como posso ajudar?`)}
                        >
                          <div>
                            <span className="text-xs font-medium block">Primeiro contato</span>
                            <span className="text-[10px] text-muted-foreground">Boas vindas</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 px-3 justify-start text-left"
                          onClick={() => openWhatsApp(selectedLead, `Olá ${selectedLead.name.split(" ")[0]}! Encontrei algumas opções que podem te interessar. Podemos marcar uma visita?`)}
                        >
                          <div>
                            <span className="text-xs font-medium block">Agendar visita</span>
                            <span className="text-[10px] text-muted-foreground">Convite</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 px-3 justify-start text-left"
                          onClick={() => openWhatsApp(selectedLead, `Olá ${selectedLead.name.split(" ")[0]}! Como foi a visita? Gostaria de saber sua opinião.`)}
                        >
                          <div>
                            <span className="text-xs font-medium block">Follow-up</span>
                            <span className="text-[10px] text-muted-foreground">Após visita</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 px-3 justify-start text-left"
                          onClick={() => openWhatsApp(selectedLead, `Olá ${selectedLead.name.split(" ")[0]}! Preparei uma proposta especial para você. Posso enviar os detalhes?`)}
                        >
                          <div>
                            <span className="text-xs font-medium block">Proposta</span>
                            <span className="text-[10px] text-muted-foreground">Oferta</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Properties Tab */}
                  <TabsContent value="properties" className="p-4 space-y-3 mt-0">
                    <h3 className="font-medium text-sm">Imóveis Recomendados</h3>
                    {loadingDetail ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : matchedProperties.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Home className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum imóvel encontrado</p>
                        <p className="text-xs">Preencha as preferências do lead</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matchedProperties.map((match) => (
                          <div
                            key={match.property.id}
                            className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setLocation(`/properties/${match.property.id}`)}
                          >
                            <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                              {match.property.images && match.property.images.length > 0 ? (
                                <img src={match.property.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Home className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm truncate">{match.property.title}</h4>
                                <Badge variant={match.score >= 80 ? "default" : "secondary"} className="shrink-0 text-[10px]">
                                  {match.score}%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                {match.property.city}
                                {match.property.bedrooms && (
                                  <>
                                    <Bed className="h-3 w-3 ml-1" />
                                    {match.property.bedrooms}q
                                  </>
                                )}
                              </div>
                              <p className="text-sm font-medium text-primary mt-1">
                                {formatBudget(match.property.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="p-4 space-y-4 mt-0">
                    {/* Add interaction */}
                    <div className="flex gap-2">
                      <Select value={newInteractionType} onValueChange={setNewInteractionType}>
                        <SelectTrigger className="w-28 h-9">
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
                      <Input
                        placeholder="Registrar interação..."
                        value={newInteractionContent}
                        onChange={(e) => setNewInteractionContent(e.target.value)}
                        className="flex-1 h-9"
                      />
                      <Button size="icon" className="h-9 w-9" onClick={handleAddInteraction} disabled={isAddingInteraction || !newInteractionContent.trim()}>
                        {isAddingInteraction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Interactions list */}
                    {loadingDetail ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : leadInteractions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma interação registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leadInteractions.map((interaction) => {
                          const typeInfo = INTERACTION_TYPES.find((t) => t.value === interaction.type) || INTERACTION_TYPES[4];
                          const IconComp = typeInfo.icon;
                          return (
                            <div key={interaction.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <IconComp className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-[10px]">{typeInfo.label}</Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(interaction.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-sm">{interaction.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Tasks Tab */}
                  <TabsContent value="tasks" className="p-4 space-y-4 mt-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-sm">Lembretes</h3>
                      <Button size="sm" variant="outline" onClick={() => setIsFollowUpModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Novo
                      </Button>
                    </div>

                    {loadingDetail ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : leadFollowUps.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum lembrete agendado</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leadFollowUps.map((fu) => {
                          const isOverdue = fu.status === "pending" && isPast(new Date(fu.dueAt));
                          const typeLabel = FOLLOW_UP_TYPES.find((t) => t.value === fu.type)?.label || fu.type;
                          return (
                            <div
                              key={fu.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                fu.status === "completed"
                                  ? "bg-muted/30 opacity-60"
                                  : isOverdue
                                  ? "border-destructive bg-destructive/5"
                                  : "bg-muted/50"
                              }`}
                            >
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                  fu.status === "completed"
                                    ? "bg-green-100 text-green-600"
                                    : isOverdue
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {fu.status === "completed" ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[10px]">
                                    {typeLabel}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(fu.dueAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </span>
                                  {isOverdue && fu.status === "pending" && (
                                    <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>
                                  )}
                                </div>
                                {fu.notes && <p className="text-sm">{fu.notes}</p>}
                              </div>
                              {fu.status === "pending" && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCompleteFollowUp(fu.id)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </ScrollArea>

              {/* Footer Actions */}
              <div className="p-4 border-t bg-muted/30 flex justify-between gap-2">
                <Button variant="destructive" size="sm" onClick={() => handleArchive(selectedLead.id)}>
                  Arquivar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      Mover para <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {COLUMNS.filter((c) => c.id !== selectedLead.status).map((col) => (
                      <DropdownMenuItem
                        key={col.id}
                        onClick={() => {
                          handleMoveToStatus(selectedLead.id, col.id);
                          setSelectedLead({ ...selectedLead, status: col.id });
                        }}
                      >
                        <div className={`w-2 h-2 rounded-full ${col.bgColor} mr-2`} />
                        {col.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Follow-up Modal */}
      <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Lembrete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newFollowUpType} onValueChange={setNewFollowUpType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data e Hora</Label>
              <Input type="datetime-local" value={newFollowUpDate} onChange={(e) => setNewFollowUpDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={newFollowUpNotes} onChange={(e) => setNewFollowUpNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsFollowUpModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFollowUp} disabled={isCreatingFollowUp || !newFollowUpDate}>
              {isCreatingFollowUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB - Floating Action Button (Mobile Only) */}
      <Button
        className="fixed bottom-20 right-4 md:hidden z-50 h-14 w-14 rounded-full shadow-2xl hover:shadow-3xl active:scale-95 transition-all"
        size="icon"
        onClick={() => setIsCreateModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* WhatsApp Quick Send Modal */}
      {whatsAppRecipient && (
        <QuickSendModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          recipientName={whatsAppRecipient.name}
          recipientPhone={whatsAppRecipient.phone}
          context={{
            name: whatsAppRecipient.name,
            company: tenant?.name || 'ImobiBase',
          }}
        />
      )}
    </div>
  );
}

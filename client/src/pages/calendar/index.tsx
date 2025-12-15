import { useState, useCallback, useMemo, useEffect } from "react";
import { useImobi, Visit, Lead, Property } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  User,
  Home,
  Phone,
  MessageCircle,
  AlertTriangle,
  Filter,
  Search,
  Building,
  Video,
  UserCircle,
  Bell,
  ThumbsUp,
  ThumbsDown,
  UserX,
  ExternalLink,
  History,
  Sparkles,
  Send,
  X,
  Eye,
  MoreHorizontal,
  RefreshCw,
  CalendarPlus,
  List,
  Navigation,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameMonth,
  getDay,
  differenceInMinutes,
  differenceInHours,
  isPast,
  isToday,
  addMinutes,
  startOfDay,
  endOfDay,
  parseISO,
  isTomorrow,
  isYesterday,
  addWeeks,
  subWeeks
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// Status colors and labels
const STATUS_CONFIG = {
  scheduled: {
    bg: "bg-blue-100",
    border: "border-blue-500",
    borderColor: "#3b82f6",
    text: "text-blue-700",
    label: "Agendada",
    icon: CalendarIcon
  },
  completed: {
    bg: "bg-green-100",
    border: "border-green-500",
    borderColor: "#22c55e",
    text: "text-green-700",
    label: "Realizada",
    icon: CheckCircle
  },
  cancelled: {
    bg: "bg-red-100",
    border: "border-red-500",
    borderColor: "#ef4444",
    text: "text-red-700",
    label: "Cancelada",
    icon: XCircle
  },
  rescheduled: {
    bg: "bg-amber-100",
    border: "border-amber-500",
    borderColor: "#f59e0b",
    text: "text-amber-700",
    label: "Reagendada",
    icon: RefreshCw
  },
  noshow: {
    bg: "bg-gray-100",
    border: "border-gray-500",
    borderColor: "#6b7280",
    text: "text-gray-700",
    label: "Não Compareceu",
    icon: UserX
  },
};

// Visit type config
const VISIT_TYPES = [
  { value: "presencial", label: "Presencial", icon: Building },
  { value: "virtual", label: "Virtual", icon: Video },
];

// Source/Channel config
const VISIT_CHANNELS = [
  { value: "site", label: "Site" },
  { value: "portal", label: "Portal" },
  { value: "indicacao", label: "Indicação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telefone", label: "Telefone" },
  { value: "presencial", label: "Presencial" },
];

// Feedback options
const FEEDBACK_OPTIONS = [
  { value: "interested", label: "Interessado", icon: ThumbsUp, color: "text-green-600" },
  { value: "not_interested", label: "Não Interessado", icon: ThumbsDown, color: "text-red-600" },
  { value: "thinking", label: "Pensando", icon: Clock, color: "text-amber-600" },
];

// AI Prompt templates for agenda
const AI_PROMPTS = [
  {
    id: "confirm",
    label: "Confirmar visita",
    icon: MessageCircle,
    template: (visit: VisitDetails) =>
      `Olá ${visit.lead?.name || "Cliente"}! Gostaria de confirmar sua visita agendada para ${format(new Date(visit.scheduledFor), "dd/MM 'às' HH:mm")} no imóvel ${visit.property?.title || ""}. Podemos contar com sua presença?`
  },
  {
    id: "remind",
    label: "Lembrete de visita",
    icon: Bell,
    template: (visit: VisitDetails) =>
      `Olá ${visit.lead?.name || "Cliente"}! Lembrando que sua visita está marcada para ${format(new Date(visit.scheduledFor), "'hoje às' HH:mm")} no ${visit.property?.address || ""}. Aguardamos você!`
  },
  {
    id: "feedback",
    label: "Pedir feedback pós-visita",
    icon: ThumbsUp,
    template: (visit: VisitDetails) =>
      `Olá ${visit.lead?.name || "Cliente"}! Foi um prazer recebê-lo na visita ao ${visit.property?.title || "imóvel"}. Gostaríamos de saber sua opinião: o que achou? Podemos agendar outra visita ou discutir propostas?`
  },
  {
    id: "reschedule",
    label: "Reagendar visita",
    icon: RefreshCw,
    template: (visit: VisitDetails) =>
      `Olá ${visit.lead?.name || "Cliente"}! Precisamos reagendar sua visita ao ${visit.property?.title || "imóvel"}. Qual seria o melhor horário para você esta semana?`
  },
];

type VisitDetails = Visit & {
  lead?: Lead;
  property?: Property;
};

type VisitStats = {
  scheduled: number;
  completed: number;
  cancelled: number;
  delayed: number;
  today: number;
  week: number;
};

type Filters = {
  search: string;
  status: string[];
  visitType: string;
  channel: string;
  agentId: string;
};

// Available time slots for scheduling
const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
];

export default function CalendarPage() {
  const { visits, leads, properties, user, refetchVisits } = useImobi();
  const { toast } = useToast();

  // View state - Mobile defaults to list/agenda view
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "list">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);

  // Detail panel state
  const [selectedVisit, setSelectedVisit] = useState<VisitDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: ["scheduled", "completed", "cancelled"],
    visitType: "",
    channel: "",
    agentId: "",
  });

  // Legend visibility state (clickable chips)
  const [visibleStatuses, setVisibleStatuses] = useState<string[]>(["scheduled", "completed", "cancelled"]);

  // Drag and drop
  const [draggedVisit, setDraggedVisit] = useState<Visit | null>(null);
  const [showRescheduleNotify, setShowRescheduleNotify] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<{ visit: Visit; newDate: Date } | null>(null);

  // AI Chat state
  const [aiMessage, setAiMessage] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Feedback dialog
  const [feedbackVisit, setFeedbackVisit] = useState<Visit | null>(null);
  const [feedbackValue, setFeedbackValue] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    propertyId: "",
    leadId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    visitType: "presencial",
    channel: "site",
    notes: "",
    assignedTo: user?.id || "",
  });

  // Get visit with lead and property details
  const getVisitDetails = useCallback((visit: Visit): VisitDetails => {
    const lead = leads.find(l => l.id === visit.leadId);
    const property = properties.find(p => p.id === visit.propertyId);
    return { ...visit, lead, property };
  }, [leads, properties]);

  // Calculate stats
  const stats = useMemo((): VisitStats => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 7);

    const todayVisits = visits.filter(v => {
      const date = new Date(v.scheduledFor);
      return date >= todayStart && date <= todayEnd;
    });

    const weekVisits = visits.filter(v => {
      const date = new Date(v.scheduledFor);
      return date >= weekStart && date < weekEnd;
    });

    const delayed = visits.filter(v => {
      if (v.status !== "scheduled") return false;
      const scheduled = new Date(v.scheduledFor);
      return isPast(scheduled) && !isToday(scheduled);
    }).length;

    return {
      scheduled: visits.filter(v => v.status === "scheduled").length,
      completed: visits.filter(v => v.status === "completed").length,
      cancelled: visits.filter(v => v.status === "cancelled").length,
      delayed,
      today: todayVisits.length,
      week: weekVisits.length,
    };
  }, [visits]);

  // Alerts
  const alerts = useMemo(() => {
    const now = new Date();
    const alerts: { type: string; message: string; visit?: Visit; count?: number }[] = [];

    // Visits starting in next 30 minutes
    const startingSoon = visits.filter(v => {
      if (v.status !== "scheduled") return false;
      const scheduled = new Date(v.scheduledFor);
      const minutesUntil = differenceInMinutes(scheduled, now);
      return minutesUntil > 0 && minutesUntil <= 30;
    });

    if (startingSoon.length > 0) {
      startingSoon.forEach(v => {
        const details = getVisitDetails(v);
        const minutesUntil = differenceInMinutes(new Date(v.scheduledFor), now);
        alerts.push({
          type: "soon",
          message: `Visita com ${details.lead?.name || "Cliente"} começa em ${minutesUntil} min`,
          visit: v
        });
      });
    }

    // Delayed visits (past scheduled time but still marked as scheduled)
    const delayedVisits = visits.filter(v => {
      if (v.status !== "scheduled") return false;
      const scheduled = new Date(v.scheduledFor);
      return isPast(scheduled) && !isToday(scheduled);
    });

    if (delayedVisits.length > 0) {
      alerts.push({
        type: "delayed",
        message: `${delayedVisits.length} visita(s) atrasada(s) sem atualização`,
        count: delayedVisits.length
      });
    }

    // Visits completed today without feedback
    const needsFeedback = visits.filter(v => {
      if (v.status !== "completed") return false;
      const scheduled = new Date(v.scheduledFor);
      return isToday(scheduled) && !v.notes?.includes("[FEEDBACK:");
    });

    if (needsFeedback.length > 0) {
      alerts.push({
        type: "feedback",
        message: `${needsFeedback.length} visita(s) sem feedback registrado`,
        count: needsFeedback.length
      });
    }

    return alerts;
  }, [visits, getVisitDetails]);

  // Filter visits
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      // Status filter (from legend chips)
      if (!visibleStatuses.includes(v.status)) return false;

      // Search filter
      if (filters.search) {
        const details = getVisitDetails(v);
        const searchLower = filters.search.toLowerCase();
        const matchesLead = details.lead?.name.toLowerCase().includes(searchLower);
        const matchesProperty = details.property?.title.toLowerCase().includes(searchLower) ||
                               details.property?.address.toLowerCase().includes(searchLower);
        if (!matchesLead && !matchesProperty) return false;
      }

      // Visit type filter
      if (filters.visitType && v.notes) {
        // We store type in notes as [TYPE:presencial] for now
        if (!v.notes.includes(`[TYPE:${filters.visitType}]`)) return false;
      }

      // Channel filter
      if (filters.channel && v.notes) {
        if (!v.notes.includes(`[CHANNEL:${filters.channel}]`)) return false;
      }

      return true;
    });
  }, [visits, filters, visibleStatuses, getVisitDetails]);

  // Week calculations
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Month calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDayOfWeek = getDay(monthStart);
  const daysInMonth: (Date | null)[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    daysInMonth.push(null);
  }

  let day = monthStart;
  while (day <= monthEnd) {
    daysInMonth.push(day);
    day = addDays(day, 1);
  }

  // Get visits for a specific date
  const getVisitsForDate = useCallback((date: Date) => {
    return filteredVisits.filter(v => isSameDay(new Date(v.scheduledFor), date));
  }, [filteredVisits]);

  // Get available time slots for a date (excluding already scheduled visits)
  const getAvailableSlots = useCallback((date: Date) => {
    const dateVisits = visits.filter(v =>
      v.status === "scheduled" &&
      isSameDay(new Date(v.scheduledFor), date)
    );

    const bookedTimes = dateVisits.map(v => format(new Date(v.scheduledFor), "HH:mm"));
    return TIME_SLOTS.filter(slot => !bookedTimes.includes(slot));
  }, [visits]);

  // Swipe handlers for date navigation
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextDate();
    }
    if (isRightSwipe) {
      handlePreviousDate();
    }
  };

  const handleNextDate = () => {
    if (viewMode === "day" || viewMode === "list") {
      setSelectedDate(addDays(selectedDate, 1));
    } else if (viewMode === "week") {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else if (viewMode === "month") {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const handlePreviousDate = () => {
    if (viewMode === "day" || viewMode === "list") {
      setSelectedDate(addDays(selectedDate, -1));
    } else if (viewMode === "week") {
      setSelectedDate(subWeeks(selectedDate, -1));
    } else if (viewMode === "month") {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  // Open create modal
  const openCreateModal = (date?: Date) => {
    setEditingVisit(null);
    setFormData({
      propertyId: "",
      leadId: "",
      date: format(date || new Date(), "yyyy-MM-dd"),
      time: "10:00",
      visitType: "presencial",
      channel: "site",
      notes: "",
      assignedTo: user?.id || "",
    });
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (visit: Visit) => {
    setEditingVisit(visit);
    const scheduledDate = new Date(visit.scheduledFor);

    // Parse existing metadata from notes
    let visitType = "presencial";
    let channel = "site";
    let cleanNotes = visit.notes || "";

    const typeMatch = cleanNotes.match(/\[TYPE:(\w+)\]/);
    if (typeMatch) {
      visitType = typeMatch[1];
      cleanNotes = cleanNotes.replace(/\[TYPE:\w+\]\s*/g, "");
    }

    const channelMatch = cleanNotes.match(/\[CHANNEL:(\w+)\]/);
    if (channelMatch) {
      channel = channelMatch[1];
      cleanNotes = cleanNotes.replace(/\[CHANNEL:\w+\]\s*/g, "");
    }

    cleanNotes = cleanNotes.replace(/\[FEEDBACK:[^\]]+\]\s*/g, "").trim();

    setFormData({
      propertyId: visit.propertyId,
      leadId: visit.leadId || "",
      date: format(scheduledDate, "yyyy-MM-dd"),
      time: format(scheduledDate, "HH:mm"),
      visitType,
      channel,
      notes: cleanNotes,
      assignedTo: visit.assignedTo || user?.id || "",
    });
    setIsModalOpen(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const scheduledFor = new Date(`${formData.date}T${formData.time}:00`);

      // Build notes with metadata
      let notesWithMeta = "";
      if (formData.visitType) notesWithMeta += `[TYPE:${formData.visitType}] `;
      if (formData.channel) notesWithMeta += `[CHANNEL:${formData.channel}] `;
      if (formData.notes) notesWithMeta += formData.notes;

      const payload = {
        propertyId: formData.propertyId,
        leadId: formData.leadId || null,
        scheduledFor: scheduledFor.toISOString(),
        notes: notesWithMeta.trim() || null,
        status: "scheduled",
        assignedTo: formData.assignedTo || null,
      };

      const url = editingVisit ? `/api/visits/${editingVisit.id}` : "/api/visits";
      const method = editingVisit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar visita");
      }

      toast({
        title: editingVisit ? "Visita atualizada" : "Visita agendada",
        description: editingVisit
          ? "A visita foi atualizada com sucesso."
          : "A visita foi agendada com sucesso.",
      });

      setIsModalOpen(false);
      await refetchVisits();
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

  // Update visit status
  const handleUpdateVisitStatus = async (visitId: string, status: string, additionalData?: any) => {
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, ...additionalData }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar visita");

      const statusLabels: Record<string, string> = {
        completed: "Visita marcada como realizada",
        cancelled: "Visita cancelada",
        noshow: "Cliente não compareceu",
      };

      toast({
        title: statusLabels[status] || "Visita atualizada",
        description: "Status atualizado com sucesso.",
      });

      await refetchVisits();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async () => {
    if (!feedbackVisit) return;

    try {
      // Get current notes and append feedback
      const currentNotes = feedbackVisit.notes || "";
      const feedbackTag = `[FEEDBACK:${feedbackValue}] ${feedbackNotes}`.trim();
      const updatedNotes = `${currentNotes} ${feedbackTag}`.trim();

      const res = await fetch(`/api/visits/${feedbackVisit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: updatedNotes }),
      });

      if (!res.ok) throw new Error("Erro ao registrar feedback");

      toast({
        title: "Feedback registrado",
        description: "O feedback da visita foi salvo.",
      });

      setFeedbackVisit(null);
      setFeedbackValue("");
      setFeedbackNotes("");
      await refetchVisits();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, visit: Visit) => {
    if (visit.status !== "scheduled") return;
    setDraggedVisit(visit);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedVisit && draggedVisit.status === "scheduled") {
      setRescheduleTarget({ visit: draggedVisit, newDate: targetDate });
      setShowRescheduleNotify(true);
    }
    setDraggedVisit(null);
  };

  const handleDragEnd = () => {
    setDraggedVisit(null);
  };

  // Confirm reschedule
  const confirmReschedule = async (notify: boolean) => {
    if (!rescheduleTarget) return;

    const { visit, newDate } = rescheduleTarget;
    const originalTime = format(new Date(visit.scheduledFor), "HH:mm");
    const newScheduledFor = new Date(`${format(newDate, "yyyy-MM-dd")}T${originalTime}:00`);

    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scheduledFor: newScheduledFor.toISOString() }),
      });

      if (!res.ok) throw new Error("Erro ao reagendar visita");

      toast({
        title: "Visita reagendada",
        description: `Visita movida para ${format(newDate, "d 'de' MMMM", { locale: ptBR })}.${notify ? " Cliente será notificado." : ""}`,
      });

      await refetchVisits();

      // If notify is true, prepare WhatsApp message
      if (notify) {
        const details = getVisitDetails(visit);
        const message = `Olá ${details.lead?.name || "Cliente"}! Sua visita foi reagendada para ${format(newScheduledFor, "dd/MM 'às' HH:mm")}. Aguardamos você!`;
        setAiMessage(message);
        setShowAiPanel(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShowRescheduleNotify(false);
      setRescheduleTarget(null);
    }
  };

  // Toggle status visibility
  const toggleStatusVisibility = (status: string) => {
    setVisibleStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Open detail panel
  const openDetailPanel = (visit: Visit) => {
    setSelectedVisit(getVisitDetails(visit));
    setIsDetailOpen(true);
  };

  // Send AI message to WhatsApp
  const sendToWhatsApp = (phone?: string) => {
    if (!phone || !aiMessage) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(aiMessage)}`;
    window.open(url, "_blank");
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.scheduled;
  };

  // Parse feedback from notes
  const parseFeedback = (notes: string | null) => {
    if (!notes) return null;
    const match = notes.match(/\[FEEDBACK:(\w+)\]\s*(.*)$/);
    if (match) {
      return { value: match[1], notes: match[2] };
    }
    return null;
  };

  // Visit card component - Enhanced for mobile
  const VisitCard = ({ visit, compact = false }: { visit: Visit; compact?: boolean }) => {
    const details = getVisitDetails(visit);
    const config = getStatusConfig(visit.status);
    const canDrag = visit.status === "scheduled";
    const isDelayed = visit.status === "scheduled" && isPast(new Date(visit.scheduledFor)) && !isToday(new Date(visit.scheduledFor));
    const isSoon = visit.status === "scheduled" && differenceInMinutes(new Date(visit.scheduledFor), new Date()) <= 30 && differenceInMinutes(new Date(visit.scheduledFor), new Date()) > 0;

    // Parse visit type from notes
    const visitType = visit.notes?.match(/\[TYPE:(\w+)\]/)?.[1];
    const TypeIcon = visitType === "virtual" ? Video : Building;

    if (compact) {
      return (
        <div
          draggable={canDrag}
          onDragStart={(e) => canDrag && handleDragStart(e, visit)}
          onDragEnd={handleDragEnd}
          onClick={() => openDetailPanel(visit)}
          className={cn(
            "p-1 rounded text-[10px] truncate transition-all cursor-pointer border-l-4",
            config.bg,
            config.text,
            canDrag && "hover:shadow-sm active:scale-95",
            isDelayed && "ring-2 ring-red-400",
            isSoon && "ring-2 ring-amber-400 animate-pulse"
          )}
          style={{ borderLeftColor: config.borderColor }}
        >
          <div className="flex items-center gap-1">
            {canDrag && <GripVertical className="h-2.5 w-2.5 opacity-50 shrink-0" />}
            <span className="font-medium">{format(new Date(visit.scheduledFor), "HH:mm")}</span>
            <TypeIcon className="h-2.5 w-2.5 shrink-0" />
          </div>
          <div className="truncate text-[9px] opacity-80">
            {details.lead?.name || "Cliente"}
          </div>
        </div>
      );
    }

    return (
      <div
        draggable={canDrag}
        onDragStart={(e) => canDrag && handleDragStart(e, visit)}
        onDragEnd={handleDragEnd}
        onClick={() => openDetailPanel(visit)}
        className={cn(
          "p-3 rounded-lg border-l-4 bg-card hover:bg-accent transition-all cursor-pointer",
          canDrag && "cursor-grab active:cursor-grabbing hover:shadow-md active:scale-[0.98]",
          isDelayed && "ring-2 ring-red-400",
          isSoon && "ring-2 ring-amber-400 animate-pulse"
        )}
        style={{ borderLeftColor: config.borderColor }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {canDrag && <GripVertical className="h-4 w-4 opacity-50" />}
            <Clock className="h-4 w-4" />
            <span className="font-semibold text-sm">{format(new Date(visit.scheduledFor), "HH:mm")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TypeIcon className="h-3.5 w-3.5" />
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.bg, config.text)}>
              {config.label}
            </Badge>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm">{details.lead?.name || "Cliente não informado"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-80 truncate">
            <Home className="h-3.5 w-3.5 shrink-0" />
            <span>{details.property?.title || "Imóvel não informado"}</span>
          </div>
          {details.property?.address && (
            <div className="flex items-center gap-1.5 text-xs opacity-60 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{details.property.address}</span>
            </div>
          )}
        </div>

        {isDelayed && (
          <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Atrasada
          </div>
        )}
        {isSoon && (
          <div className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
            <Bell className="h-3.5 w-3.5" />
            Começa em breve
          </div>
        )}

        {/* Mobile quick actions */}
        <div className="flex gap-1.5 mt-3 sm:hidden">
          {details.lead?.phone && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${details.lead?.phone}`, "_blank");
              }}
            >
              <Phone className="h-3 w-3" />
            </Button>
          )}
          {details.property?.address && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                const address = encodeURIComponent(details.property?.address || "");
                window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank");
              }}
            >
              <Navigation className="h-3 w-3" />
            </Button>
          )}
          {visit.status === "scheduled" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(visit);
              }}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-foreground">Agenda de Visitas</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Gerencie visitas e compromissos</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 min-w-[44px]">
                  <Filter className="h-4 w-4" />
                  <span className="hidden xs:inline">Filtros</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Filtre as visitas por diferentes critérios</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nome do lead ou endereço..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="pl-9 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Visita</Label>
                    <Select value={filters.visitType} onValueChange={(v) => setFilters(f => ({ ...f, visitType: v }))}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os tipos</SelectItem>
                        {VISIT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Canal/Origem</Label>
                    <Select value={filters.channel} onValueChange={(v) => setFilters(f => ({ ...f, channel: v }))}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Todos os canais" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os canais</SelectItem>
                        {VISIT_CHANNELS.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => setFilters({
                      search: "",
                      status: ["scheduled", "completed", "cancelled"],
                      visitType: "",
                      channel: "",
                      agentId: "",
                    })}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-9 min-w-[44px]"
              onClick={() => setSelectedDate(new Date())}
            >
              <Clock className="h-4 w-4" />
              <span className="hidden xs:inline">Hoje</span>
            </Button>
          </div>
        </div>

        {/* Stats counters - Horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <div className="flex gap-2 sm:gap-3 min-w-max sm:grid sm:grid-cols-3 lg:grid-cols-6">
            <Card className="min-w-[120px] sm:min-w-0 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Agendadas</p>
                    <p className="text-xl font-bold text-blue-700">{stats.scheduled}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[120px] sm:min-w-0 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium">Realizadas</p>
                    <p className="text-xl font-bold text-green-700">{stats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[120px] sm:min-w-0 bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <XCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-red-600 font-medium">Canceladas</p>
                    <p className="text-xl font-bold text-red-700">{stats.cancelled}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[120px] sm:min-w-0 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Atrasadas</p>
                    <p className="text-xl font-bold text-amber-700">{stats.delayed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[120px] sm:min-w-0 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Hoje</p>
                    <p className="text-xl font-bold text-purple-700">{stats.today}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[120px] sm:min-w-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500 rounded-lg">
                    <CalendarPlus className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 font-medium">Semana</p>
                    <p className="text-xl font-bold text-indigo-700">{stats.week}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alert bar */}
        {alerts.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium shrink-0",
                    alert.type === "soon" && "bg-amber-100 text-amber-800",
                    alert.type === "delayed" && "bg-red-100 text-red-800",
                    alert.type === "feedback" && "bg-blue-100 text-blue-800"
                  )}
                >
                  {alert.type === "soon" && <Bell className="h-4 w-4" />}
                  {alert.type === "delayed" && <AlertTriangle className="h-4 w-4" />}
                  {alert.type === "feedback" && <MessageCircle className="h-4 w-4" />}
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Switcher - Mobile segmented control */}
        <div className="flex border-b">
          {[
            { value: "list", label: "Lista", icon: List },
            { value: "day", label: "Dia", icon: CalendarIcon },
            { value: "week", label: "Semana", icon: CalendarPlus },
            { value: "month", label: "Mês", icon: CalendarIcon },
          ].map((view) => (
            <button
              key={view.value}
              onClick={() => setViewMode(view.value as any)}
              className={cn(
                "flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
                viewMode === view.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <view.icon className="h-4 w-4" />
              <span className="hidden xs:inline">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* List/Agenda View - Mobile default */}
        {viewMode === "list" && (
          <div className="space-y-3">
            <Card>
              <CardHeader className="p-3 sm:p-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">
                    {isToday(selectedDate) && "Hoje"}
                    {isTomorrow(selectedDate) && "Amanhã"}
                    {isYesterday(selectedDate) && "Ontem"}
                    {!isToday(selectedDate) && !isTomorrow(selectedDate) && !isYesterday(selectedDate) &&
                      format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {getVisitsForDate(selectedDate).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm text-muted-foreground mb-4">Nenhuma visita agendada para este dia.</p>
                    <Button variant="outline" size="sm" onClick={() => openCreateModal(selectedDate)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agendar Visita
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getVisitsForDate(selectedDate)
                      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
                      .map(visit => (
                        <VisitCard key={visit.id} visit={visit} />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground py-2">
              Deslize para mudar de data
            </p>
          </div>
        )}

        {/* Day View - Timeline with hour slots */}
        {viewMode === "day" && (
          <Card>
            <CardHeader className="p-3 sm:p-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] sm:h-[600px]">
                <div className="relative">
                  {TIME_SLOTS.map((slot, index) => {
                    const slotVisits = getVisitsForDate(selectedDate).filter(v =>
                      format(new Date(v.scheduledFor), "HH:mm") === slot
                    );
                    const now = new Date();
                    const currentHour = format(now, "HH:mm");
                    const isCurrentTimeSlot = isToday(selectedDate) && slot === currentHour;

                    return (
                      <div
                        key={slot}
                        className={cn(
                          "h-16 sm:h-20 border-b relative flex",
                          isCurrentTimeSlot && "bg-primary/5"
                        )}
                      >
                        <div className="w-16 sm:w-20 flex-shrink-0 p-2 border-r text-xs text-muted-foreground font-medium">
                          {slot}
                        </div>
                        <div className="flex-1 p-2">
                          {slotVisits.length > 0 ? (
                            <div className="space-y-1">
                              {slotVisits.map(visit => (
                                <div key={visit.id} className="text-xs">
                                  <VisitCard visit={visit} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                const date = format(selectedDate, "yyyy-MM-dd");
                                setFormData(prev => ({ ...prev, date, time: slot }));
                                openCreateModal(selectedDate);
                              }}
                              className="w-full h-full text-left text-xs text-muted-foreground hover:bg-accent/50 rounded transition-colors px-2"
                            >
                              <Plus className="h-3 w-3 inline mr-1" />
                              <span className="hidden sm:inline">Agendar</span>
                            </button>
                          )}
                        </div>
                        {isCurrentTimeSlot && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Week View - Scrollable horizontally on mobile */}
        {viewMode === "week" && (
          <Card>
            <CardHeader className="p-3 sm:p-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">
                  Semana de {format(weekStart, "d 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              {/* Mobile: Horizontal scroll */}
              <div className="sm:hidden overflow-x-auto scrollbar-hide -mx-2 px-2">
                <div className="flex gap-2 pb-2" style={{ width: 'max-content' }}>
                  {weekDays.map((day, i) => {
                    const dayVisits = getVisitsForDate(day);
                    const isCurrentDay = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedDate(day)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                        className={cn(
                          "w-[280px] min-h-[200px] border rounded-lg p-3 cursor-pointer transition-all",
                          isSelected ? "bg-primary/5 border-primary ring-1 ring-primary" : "bg-card hover:border-primary/30",
                          draggedVisit && "border-dashed border-2 border-primary/50"
                        )}
                      >
                        <div className="text-center mb-3">
                          <div className="text-xs text-muted-foreground mb-1">
                            {format(day, "EEE", { locale: ptBR })}
                          </div>
                          <div className={cn(
                            "text-lg font-bold w-10 h-10 flex items-center justify-center rounded-full mx-auto",
                            isCurrentDay && "bg-primary text-primary-foreground"
                          )}>
                            {format(day, "d")}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {dayVisits.slice(0, 4).map(v => (
                            <VisitCard key={v.id} visit={v} />
                          ))}
                          {dayVisits.length > 4 && (
                            <div className="text-xs text-center text-muted-foreground py-1">
                              +{dayVisits.length - 4} mais
                            </div>
                          )}
                          {dayVisits.length === 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreateModal(day);
                              }}
                              className="w-full py-3 text-xs text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                            >
                              <Plus className="h-4 w-4 mx-auto" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: Grid */}
              <div className="hidden sm:grid grid-cols-7 gap-2">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                  <div key={day} className="text-xs font-medium text-muted-foreground py-2 text-center">
                    {day}
                  </div>
                ))}
                {weekDays.map((day, i) => {
                  const dayVisits = getVisitsForDate(day);
                  const isCurrentDay = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                      className={cn(
                        "min-h-[140px] border rounded-lg p-2 cursor-pointer transition-all",
                        isSelected ? "bg-primary/5 border-primary ring-1 ring-primary" : "bg-card hover:border-primary/30",
                        draggedVisit && "border-dashed border-2 border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-bold mb-2 w-8 h-8 flex items-center justify-center rounded-full mx-auto",
                        isCurrentDay && "bg-primary text-primary-foreground"
                      )}>
                        {format(day, "d")}
                      </div>

                      <div className="space-y-1">
                        {dayVisits.map(v => (
                          <VisitCard key={v.id} visit={v} compact />
                        ))}
                      </div>

                      {dayVisits.length === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateModal(day);
                          }}
                          className="w-full h-full min-h-[60px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-xs text-muted-foreground py-2 sm:hidden">
                Deslize horizontalmente para ver mais dias
              </p>
            </CardContent>
          </Card>
        )}

        {/* Month View - Compact with event dots */}
        {viewMode === "month" && (
          <Card>
            <CardHeader className="p-3 sm:p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle className="text-base sm:text-lg min-w-[160px] text-center">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="grid grid-cols-7 gap-1">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((day, i) => (
                  <div key={i} className="text-xs font-medium text-muted-foreground py-2 text-center">
                    {day}
                  </div>
                ))}
                {daysInMonth.map((day, i) => {
                  if (!day) {
                    return <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[80px]" />;
                  }

                  const dayVisits = getVisitsForDate(day);
                  const isCurrentDay = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedDate(day);
                        setViewMode("list");
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                      className={cn(
                        "min-h-[60px] sm:min-h-[80px] border rounded-lg p-1.5 cursor-pointer transition-all",
                        isSelected ? "bg-primary/5 border-primary ring-1 ring-primary" : "bg-card hover:border-primary/30",
                        !isCurrentMonth && "opacity-40",
                        draggedVisit && "border-dashed border-2"
                      )}
                    >
                      <div className={cn(
                        "text-xs sm:text-sm font-medium mb-1 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full mx-auto",
                        isCurrentDay && "bg-primary text-primary-foreground"
                      )}>
                        {format(day, "d")}
                      </div>

                      {/* Event dots - mobile friendly */}
                      {dayVisits.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {dayVisits.slice(0, 3).map((v, idx) => {
                            const config = getStatusConfig(v.status);
                            return (
                              <div
                                key={idx}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: config.borderColor }}
                              />
                            );
                          })}
                          {dayVisits.length > 3 && (
                            <div className="text-[8px] text-muted-foreground">
                              +{dayVisits.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-xs text-muted-foreground py-2 mt-2">
                Toque em um dia para ver as visitas
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* FAB - Floating Action Button for mobile */}
      <Button
        size="lg"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => openCreateModal()}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Create/Edit Visit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVisit ? "Editar Visita" : "Nova Visita"}</DialogTitle>
            <DialogDescription>
              {editingVisit ? "Atualize os dados da visita." : "Agende uma nova visita para um imóvel."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadId">Cliente *</Label>
                <Select
                  value={formData.leadId}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, leadId: v }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {l.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyId">Imóvel *</Label>
                <Select
                  value={formData.propertyId}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o imóvel" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          <span className="truncate">{p.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário *</Label>
                <Select
                  value={formData.time}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, time: v }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSlots(new Date(formData.date)).map(slot => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Visita</Label>
                <Select
                  value={formData.visitType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, visitType: v }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Canal/Origem</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, channel: v }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_CHANNELS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="resize-none"
                placeholder="Informações adicionais sobre a visita..."
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-11">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.propertyId || !formData.leadId} className="h-11">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingVisit ? "Salvar" : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Visit Detail Sheet - Full screen on mobile */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
          {selectedVisit && (
            <>
              <SheetHeader className="p-4 sm:p-6 border-b bg-muted/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <SheetTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      Detalhes da Visita
                    </SheetTitle>
                    <SheetDescription className="text-xs sm:text-sm mt-1">
                      {format(new Date(selectedVisit.scheduledFor), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </SheetDescription>
                  </div>
                  <Badge className={cn(getStatusConfig(selectedVisit.status).bg, getStatusConfig(selectedVisit.status).text)}>
                    {getStatusConfig(selectedVisit.status).label}
                  </Badge>
                </div>
              </SheetHeader>

              <Tabs defaultValue="info" className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start px-4 sm:px-6 pt-2 bg-transparent border-b rounded-none">
                  <TabsTrigger value="info" className="text-xs sm:text-sm">Informações</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs sm:text-sm">Histórico</TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs sm:text-sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AITOPIA
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  <TabsContent value="info" className="p-4 sm:p-6 space-y-4 mt-0">
                    {/* Lead info */}
                    <Card>
                      <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          Cliente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selectedVisit.lead?.name || "Não informado"}</span>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                            <a href={`/leads`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver no CRM
                            </a>
                          </Button>
                        </div>
                        {selectedVisit.lead?.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {selectedVisit.lead.phone}
                          </div>
                        )}
                        {selectedVisit.lead?.email && (
                          <div className="text-sm text-muted-foreground">{selectedVisit.lead.email}</div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-11"
                            onClick={() => {
                              if (selectedVisit.lead?.phone) {
                                window.open(`tel:${selectedVisit.lead.phone}`, "_blank");
                              }
                            }}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Ligar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-11 text-green-600"
                            onClick={() => {
                              if (selectedVisit.lead?.phone) {
                                const phone = selectedVisit.lead.phone.replace(/\D/g, "");
                                window.open(`https://wa.me/55${phone}`, "_blank");
                              }
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Property info */}
                    <Card>
                      <CardHeader className="p-3 sm:p-4 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          Imóvel
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selectedVisit.property?.title || "Não informado"}</span>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                            <a href={`/properties/${selectedVisit.propertyId}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver detalhes
                            </a>
                          </Button>
                        </div>
                        {selectedVisit.property?.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {selectedVisit.property.address}
                          </div>
                        )}
                        {selectedVisit.property?.price && (
                          <div className="text-sm font-medium text-primary">
                            R$ {parseFloat(selectedVisit.property.price).toLocaleString("pt-BR")}
                          </div>
                        )}
                        {selectedVisit.property?.address && (
                          <Button
                            variant="outline"
                            className="w-full h-11"
                            onClick={() => {
                              const address = encodeURIComponent(selectedVisit.property?.address || "");
                              window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank");
                            }}
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Abrir no Maps
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* Notes */}
                    {selectedVisit.notes && (
                      <Card>
                        <CardHeader className="p-3 sm:p-4 pb-2">
                          <CardTitle className="text-sm">Observações</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0">
                          <p className="text-sm text-muted-foreground">
                            {selectedVisit.notes
                              .replace(/\[TYPE:\w+\]\s*/g, "")
                              .replace(/\[CHANNEL:\w+\]\s*/g, "")
                              .replace(/\[FEEDBACK:[^\]]+\]\s*/g, "")
                              .trim() || "Sem observações"}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Quick actions */}
                    {selectedVisit.status === "scheduled" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Ações rápidas</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="h-11 text-xs text-green-600"
                            onClick={() => {
                              handleUpdateVisitStatus(selectedVisit.id, "completed");
                              setIsDetailOpen(false);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar Realizada
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11 text-xs text-gray-600"
                            onClick={() => {
                              handleUpdateVisitStatus(selectedVisit.id, "noshow");
                              setIsDetailOpen(false);
                            }}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Não Compareceu
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11 text-xs"
                            onClick={() => {
                              openEditModal(selectedVisit);
                              setIsDetailOpen(false);
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reagendar
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11 text-xs text-red-600"
                            onClick={() => {
                              handleUpdateVisitStatus(selectedVisit.id, "cancelled");
                              setIsDetailOpen(false);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedVisit.status === "completed" && (
                      <Button
                        variant="outline"
                        className="w-full h-11"
                        onClick={() => {
                          setFeedbackVisit(selectedVisit);
                          setIsDetailOpen(false);
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Registrar Feedback
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="p-4 sm:p-6 space-y-3 mt-0">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <CalendarIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Visita agendada</p>
                          <p className="text-xs text-muted-foreground">
                            Para {format(new Date(selectedVisit.scheduledFor), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                      </div>

                      {selectedVisit.status === "completed" && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Visita realizada</p>
                            <p className="text-xs text-muted-foreground">
                              Cliente visitou o imóvel
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedVisit.status === "cancelled" && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-red-100 rounded-full">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Visita cancelada</p>
                            <p className="text-xs text-muted-foreground">
                              A visita foi cancelada
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="p-4 sm:p-6 space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Mensagens prontas</Label>
                      <div className="grid gap-2">
                        {AI_PROMPTS.map(prompt => (
                          <Button
                            key={prompt.id}
                            variant="outline"
                            className="h-auto p-3 justify-start text-left"
                            onClick={() => setAiMessage(prompt.template(selectedVisit))}
                          >
                            <prompt.icon className="h-4 w-4 mr-3 shrink-0" />
                            <span className="text-sm">{prompt.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {aiMessage && (
                      <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground">Mensagem</Label>
                        <Textarea
                          value={aiMessage}
                          onChange={(e) => setAiMessage(e.target.value)}
                          rows={5}
                          className="text-sm resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 h-11"
                            onClick={() => sendToWhatsApp(selectedVisit.lead?.phone)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Enviar WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-11"
                            onClick={() => {
                              navigator.clipboard.writeText(aiMessage);
                              toast({ title: "Copiado!", description: "Mensagem copiada para área de transferência." });
                            }}
                          >
                            Copiar
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reschedule confirmation dialog */}
      <Dialog open={showRescheduleNotify} onOpenChange={setShowRescheduleNotify}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reagendar Visita</DialogTitle>
            <DialogDescription>
              Deseja notificar o cliente sobre o reagendamento?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => confirmReschedule(false)} className="h-11">
              Não notificar
            </Button>
            <Button onClick={() => confirmReschedule(true)} className="bg-green-600 hover:bg-green-700 h-11">
              <MessageCircle className="h-4 w-4 mr-2" />
              Notificar via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={!!feedbackVisit} onOpenChange={(open) => !open && setFeedbackVisit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Feedback</DialogTitle>
            <DialogDescription>
              Como foi a visita? O cliente demonstrou interesse?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {FEEDBACK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFeedbackValue(opt.value)}
                  className={cn(
                    "p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all min-h-[88px]",
                    feedbackValue === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <opt.icon className={cn("h-6 w-6", opt.color)} />
                  <span className="text-xs text-center">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Objeções, interesse em outros imóveis, próximos passos..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setFeedbackVisit(null)} className="h-11">
              Cancelar
            </Button>
            <Button onClick={handleFeedbackSubmit} disabled={!feedbackValue} className="h-11">
              Salvar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useCallback } from "react";
import { useImobi, Visit } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle, XCircle, Plus, Loader2, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS = {
  scheduled: { bg: "bg-blue-100", border: "border-blue-500", text: "text-blue-700", label: "Agendada" },
  completed: { bg: "bg-green-100", border: "border-green-500", text: "text-green-700", label: "Realizada" },
  cancelled: { bg: "bg-red-100", border: "border-red-500", text: "text-red-700", label: "Cancelada" },
};

export default function CalendarPage() {
  const { visits, leads, properties, refetchVisits } = useImobi();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedVisit, setDraggedVisit] = useState<Visit | null>(null);
  const [formData, setFormData] = useState({
    propertyId: "",
    leadId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    notes: "",
  });

  const getVisitDetails = (visitId: string) => {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return null;
    const lead = leads.find(l => l.id === visit.leadId);
    const property = properties.find(p => p.id === visit.propertyId);
    return { ...visit, lead, property };
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

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

  const getVisitsForDate = (date: Date) => {
    return visits.filter(v => isSameDay(new Date(v.scheduledFor), date));
  };

  const openCreateModal = (date?: Date) => {
    setFormData({
      propertyId: "",
      leadId: "",
      date: format(date || new Date(), "yyyy-MM-dd"),
      time: "10:00",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const scheduledFor = new Date(`${formData.date}T${formData.time}:00`);
      
      const payload = {
        propertyId: formData.propertyId,
        leadId: formData.leadId || null,
        scheduledFor: scheduledFor.toISOString(),
        notes: formData.notes || null,
        status: "scheduled",
      };

      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar visita");
      }

      toast({
        title: "Visita agendada",
        description: "A visita foi agendada com sucesso.",
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

  const handleUpdateVisitStatus = async (visitId: string, status: "completed" | "cancelled") => {
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar visita");

      toast({
        title: status === "completed" ? "Visita realizada" : "Visita cancelada",
        description: status === "completed" 
          ? "A visita foi marcada como realizada."
          : "A visita foi cancelada.",
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

  const handleRescheduleVisit = useCallback(async (visit: Visit, newDate: Date) => {
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
        description: `Visita movida para ${format(newDate, "d 'de' MMMM", { locale: ptBR })}.`,
      });

      await refetchVisits();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [refetchVisits, toast]);

  const handleDragStart = (e: React.DragEvent, visit: Visit) => {
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
      handleRescheduleVisit(draggedVisit, targetDate);
    }
    setDraggedVisit(null);
  };

  const handleDragEnd = () => {
    setDraggedVisit(null);
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.scheduled;
  };

  const VisitChip = ({ visit, compact = false }: { visit: Visit; compact?: boolean }) => {
    const details = getVisitDetails(visit.id);
    const colors = getStatusColor(visit.status);
    const canDrag = visit.status === "scheduled";
    
    return (
      <div
        draggable={canDrag}
        onDragStart={(e) => canDrag && handleDragStart(e, visit)}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedDate(new Date(visit.scheduledFor))}
        className={`
          ${colors.bg} ${colors.text} border-l-2 ${colors.border}
          text-[10px] p-1 rounded truncate transition-all
          ${canDrag ? "cursor-grab active:cursor-grabbing hover:shadow-sm" : "cursor-pointer"}
          ${compact ? "" : "flex items-center gap-1"}
        `}
        data-testid={`visit-chip-${visit.id}`}
      >
        {canDrag && !compact && <GripVertical className="h-2.5 w-2.5 opacity-50" />}
        <span>{format(new Date(visit.scheduledFor), "HH:mm")}</span>
        {!compact && details?.lead && (
          <span className="truncate ml-1">- {details.lead.name}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-calendar-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie suas visitas e compromissos</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "month")} className="hidden sm:block">
            <TabsList>
              <TabsTrigger value="week" data-testid="tab-week-view">Semana</TabsTrigger>
              <TabsTrigger value="month" data-testid="tab-month-view">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button data-testid="button-new-visit" className="gap-2 w-full sm:w-auto" onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4" /> Nova Visita
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium">Legenda:</span>
          {Object.entries(STATUS_COLORS).map(([key, value]) => (
            <Badge key={key} variant="outline" className={`${value.bg} ${value.text} text-[10px] ml-2`}>
              {value.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="p-3 sm:p-6 flex flex-row items-center justify-between">
            {viewMode === "week" ? (
              <CardTitle className="text-base sm:text-lg">
                Semana de {format(weekStart, "d 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base sm:text-lg min-w-[150px] text-center">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="sm:hidden">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "month")}>
                <TabsList className="h-8">
                  <TabsTrigger value="week" className="text-xs px-2">Semana</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-2">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {viewMode === "week" ? (
              <>
                <div className="block sm:hidden">
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    {["Ontem", "Hoje", "Amanhã"].map((day) => (
                      <div key={day} className="text-xs font-medium text-muted-foreground py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[-1, 0, 1].map((offset) => {
                      const day = addDays(new Date(), offset);
                      const dayVisits = getVisitsForDate(day);
                      const isToday = offset === 0;
                      const isSelected = isSameDay(day, selectedDate);
                      
                      return (
                        <div 
                          key={offset}
                          onClick={() => setSelectedDate(day)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day)}
                          className={`
                            min-h-[80px] border rounded-lg p-2 cursor-pointer transition-all hover:border-primary/50 relative
                            ${isSelected ? "bg-primary/5 border-primary" : "bg-card"}
                            ${draggedVisit ? "border-dashed border-2" : ""}
                          `}
                        >
                          <div className={`
                            text-sm font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full mx-auto
                            ${isToday ? "bg-primary text-primary-foreground" : ""}
                          `}>
                            {format(day, "d")}
                          </div>
                          
                          <div className="space-y-1">
                            {dayVisits.slice(0, 2).map(v => (
                              <VisitChip key={v.id} visit={v} compact />
                            ))}
                            {dayVisits.length > 2 && (
                              <div className="text-[9px] text-muted-foreground text-center">+{dayVisits.length - 2}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="hidden sm:block">
                  <div className="grid grid-cols-7 gap-2 text-center mb-4">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                      <div key={day} className="text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                    {weekDays.map((day, i) => {
                      const dayVisits = getVisitsForDate(day);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isSameDay(day, selectedDate);
                      
                      return (
                        <div 
                          key={i}
                          onClick={() => setSelectedDate(day)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day)}
                          className={`
                            min-h-[100px] border rounded-lg p-2 cursor-pointer transition-all hover:border-primary/50 relative
                            ${isSelected ? "bg-primary/5 border-primary" : "bg-card"}
                            ${draggedVisit ? "border-dashed border-2" : ""}
                          `}
                        >
                          <div className={`
                            text-sm font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full mx-auto
                            ${isToday ? "bg-primary text-primary-foreground" : ""}
                          `}>
                            {format(day, "d")}
                          </div>
                          
                          <div className="space-y-1">
                            {dayVisits.map(v => (
                              <VisitChip key={v.id} visit={v} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                  <div key={day} className="text-xs sm:text-sm font-medium text-muted-foreground py-2 text-center">
                    {day}
                  </div>
                ))}
                {daysInMonth.map((day, i) => {
                  if (!day) {
                    return <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[80px]" />;
                  }
                  
                  const dayVisits = getVisitsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  
                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                      className={`
                        min-h-[60px] sm:min-h-[80px] border rounded-lg p-1 sm:p-2 cursor-pointer transition-all hover:border-primary/50
                        ${isSelected ? "bg-primary/5 border-primary" : "bg-card"}
                        ${!isCurrentMonth ? "opacity-40" : ""}
                        ${draggedVisit ? "border-dashed border-2" : ""}
                      `}
                      data-testid={`day-cell-${format(day, "yyyy-MM-dd")}`}
                    >
                      <div className={`
                        text-xs sm:text-sm font-medium mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full mx-auto
                        ${isToday ? "bg-primary text-primary-foreground" : ""}
                      `}>
                        {format(day, "d")}
                      </div>
                      
                      <div className="space-y-0.5 sm:space-y-1">
                        {dayVisits.slice(0, 2).map(v => (
                          <VisitChip key={v.id} visit={v} compact />
                        ))}
                        {dayVisits.length > 2 && (
                          <div className="text-[8px] sm:text-[9px] text-muted-foreground text-center">+{dayVisits.length - 2}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col">
          <CardHeader className="border-b bg-muted/20 p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="truncate">{format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto max-h-[400px] sm:max-h-[500px]">
            {getVisitsForDate(selectedDate).length === 0 ? (
              <div data-testid="empty-state-daily-visits" className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 sm:p-6 text-center">
                <Clock className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Nenhuma visita agendada.</p>
                <Button variant="link" size="sm" className="mt-2" onClick={() => openCreateModal(selectedDate)}>
                  Agendar agora
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {getVisitsForDate(selectedDate)
                  .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
                  .map(visit => {
                    const details = getVisitDetails(visit.id);
                    const colors = getStatusColor(visit.status);
                    if (!details) return null;

                    return (
                      <div key={visit.id} data-testid={`card-daily-visit-${visit.id}`} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {format(new Date(visit.scheduledFor), "HH:mm")}
                          </Badge>
                          <Badge className={`text-xs shrink-0 ${colors.bg} ${colors.text}`}>
                            {colors.label}
                          </Badge>
                        </div>
                        
                        <h4 className="font-semibold text-sm mb-1">{details.lead?.name || "Cliente"}</h4>
                        <div className="flex items-center text-xs text-muted-foreground mb-2">
                           <MapPin className="w-3 h-3 mr-1 shrink-0" />
                           <span className="truncate">{details.property?.title || "Imóvel"}</span>
                        </div>
                        
                        {visit.notes && (
                          <div className="text-xs bg-muted p-2 rounded text-muted-foreground italic line-clamp-2">
                            "{visit.notes}"
                          </div>
                        )}

                        {visit.status === "scheduled" && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleUpdateVisitStatus(visit.id, "completed")}
                              data-testid={`button-complete-visit-${visit.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Realizada
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleUpdateVisitStatus(visit.id, "cancelled")}
                              data-testid={`button-cancel-visit-${visit.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-visit">Nova Visita</DialogTitle>
            <DialogDescription>Agende uma visita para um imóvel.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Imóvel *</Label>
              <Select 
                value={formData.propertyId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v }))}
              >
                <SelectTrigger data-testid="select-visit-property">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadId">Cliente</Label>
              <Select 
                value={formData.leadId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, leadId: v }))}
              >
                <SelectTrigger data-testid="select-visit-lead">
                  <SelectValue placeholder="Selecione o cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  data-testid="input-visit-date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário *</Label>
                <Input
                  id="time"
                  type="time"
                  data-testid="input-visit-time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                data-testid="input-visit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Informações adicionais sobre a visita..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || !formData.propertyId} data-testid="button-submit-visit">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Agendar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

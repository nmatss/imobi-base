import { useState } from "react";
import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle, XCircle, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function CalendarPage() {
  const { visits, leads, properties, refetchVisits } = useImobi();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-calendar-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie suas visitas e compromissos</p>
        </div>
        <Button data-testid="button-new-visit" className="gap-2 w-full sm:w-auto" onClick={() => openCreateModal()}>
          <Plus className="h-4 w-4" /> Nova Visita
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Semana de {format(weekStart, "d 'de' MMMM", { locale: ptBR })}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {/* Mobile: Show only 3 days */}
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
                      className={`
                        min-h-[80px] border rounded-lg p-2 cursor-pointer transition-all hover:border-primary/50 relative
                        ${isSelected ? "bg-primary/5 border-primary" : "bg-card"}
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
                          <div key={v.id} className="text-[9px] bg-secondary p-1 rounded truncate border-l-2 border-primary">
                            {format(new Date(v.scheduledFor), "HH:mm")}
                          </div>
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

            {/* Desktop: Full week view */}
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
                      className={`
                        min-h-[100px] border rounded-lg p-2 cursor-pointer transition-all hover:border-primary/50 relative
                        ${isSelected ? "bg-primary/5 border-primary" : "bg-card"}
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
                          <div key={v.id} className="text-[10px] bg-secondary p-1 rounded truncate border-l-2 border-primary">
                            {format(new Date(v.scheduledFor), "HH:mm")}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Schedule */}
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
                    if (!details) return null;

                    return (
                      <div key={visit.id} data-testid={`card-daily-visit-${visit.id}`} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {format(new Date(visit.scheduledFor), "HH:mm")}
                          </Badge>
                          <Badge className={`text-xs shrink-0
                            ${visit.status === 'completed' ? 'bg-green-100 text-green-700' : 
                              visit.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                              'bg-blue-100 text-blue-700'}
                          `}>
                            {visit.status === 'completed' ? 'Realizada' : 
                             visit.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
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

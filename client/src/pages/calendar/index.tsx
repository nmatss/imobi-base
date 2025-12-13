import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle, XCircle, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CalendarPage() {
  const { visits, leads, properties } = useImobi();
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-calendar-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie suas visitas e compromissos</p>
        </div>
        <Button data-testid="button-new-visit" className="gap-2 w-full sm:w-auto">
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
                {["Ontem", "Hoje", "Amanhã"].map((day, i) => (
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
                <Button variant="link" size="sm" className="mt-2">Agendar agora</Button>
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

                        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

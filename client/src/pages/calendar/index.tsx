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

  // Helper to get enriched visit data
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
    return visits.filter(v => isSameDay(new Date(v.date), date));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground">Gerencie suas visitas e compromissos</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nova Visita
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Semana de {format(weekStart, "d 'de' MMMM", { locale: ptBR })}</CardTitle>
          </CardHeader>
          <CardContent>
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
                          {format(new Date(v.date), "HH:mm")}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily Schedule */}
        <Card className="h-full flex flex-col">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto max-h-[500px]">
            {getVisitsForDate(selectedDate).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-6 text-center">
                <Clock className="w-8 h-8 mb-2 opacity-20" />
                <p>Nenhuma visita agendada para este dia.</p>
                <Button variant="link" size="sm" className="mt-2">Agendar agora</Button>
              </div>
            ) : (
              <div className="divide-y">
                {getVisitsForDate(selectedDate)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map(visit => {
                    const details = getVisitDetails(visit.id);
                    if (!details) return null;

                    return (
                      <div key={visit.id} className="p-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(visit.date), "HH:mm")}
                          </Badge>
                          <Badge className={`
                            ${visit.status === 'completed' ? 'bg-green-100 text-green-700' : 
                              visit.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                              'bg-blue-100 text-blue-700'}
                          `}>
                            {visit.status === 'completed' ? 'Realizada' : 
                             visit.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
                          </Badge>
                        </div>
                        
                        <h4 className="font-semibold text-sm mb-1">{details.lead?.name}</h4>
                        <div className="flex items-center text-xs text-muted-foreground mb-2">
                           <MapPin className="w-3 h-3 mr-1" />
                           <span className="truncate">{details.property?.title}</span>
                        </div>
                        
                        {visit.notes && (
                          <div className="text-xs bg-muted p-2 rounded text-muted-foreground italic">
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

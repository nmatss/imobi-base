import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { calendarEventSchema, type CalendarEventFormData } from "@/lib/form-schemas";
import { getErrorMessage } from "@/lib/form-helpers";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Clock, User, MapPin, Bell, Users, Sparkles, AlertCircle } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { EventType, EVENT_TYPE_CONFIG } from "./EventCard";
import { EVENT_TEMPLATES, EventTemplate } from "./EventTemplates";
import { cn } from "@/lib/utils";

export interface EventFormData {
  type: EventType;
  title: string;
  date: string;
  time: string;
  clientId?: string;
  propertyId?: string;
  location?: string;
  description?: string;
  duration: number;
  reminderMinutes?: number;
  participants?: string[];
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
  initialDate?: Date;
  clients?: Array<{ id: string; name: string }>;
  properties?: Array<{ id: string; title: string; address?: string }>;
}

export function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
  clients = [],
  properties = []
}: CreateEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [formData, setFormData] = useState<EventFormData>({
    type: 'visit',
    title: '',
    date: format(initialDate || new Date(), 'yyyy-MM-dd'),
    time: format(initialDate || new Date(), 'HH:mm'),
    duration: 30,
    reminderMinutes: 60,
    description: ''
  });

  const handleTemplateSelect = (template: EventTemplate) => {
    setSelectedTemplate(template.id);
    setFormData(prev => ({
      ...prev,
      type: template.type,
      title: template.label,
      duration: template.duration,
      reminderMinutes: template.reminderMinutes,
      description: template.defaultNotes || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.time) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Error submitting event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'visit',
      title: '',
      date: format(initialDate || new Date(), 'yyyy-MM-dd'),
      time: format(initialDate || new Date(), 'HH:mm'),
      duration: 30,
      reminderMinutes: 60,
      description: ''
    });
    setSelectedTemplate(null);
    onClose();
  };

  const endTime = formData.date && formData.time
    ? format(addMinutes(new Date(`${formData.date}T${formData.time}`), formData.duration), 'HH:mm')
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Criar Novo Evento
          </DialogTitle>
          <DialogDescription>
            Agende uma visita, reunião ou follow-up rapidamente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Templates Rápidos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Templates Rápidos</Label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENT_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  type="button"
                  variant={selectedTemplate === template.id ? "default" : "outline"}
                  className={cn(
                    "h-auto py-3 px-4 flex flex-col items-start gap-1",
                    selectedTemplate === template.id && "ring-2 ring-primary"
                  )}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <span className="font-medium text-xs">{template.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {template.duration} min • Lembrete {template.reminderMinutes} min antes
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Campos Principais */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="text-sm font-semibold">Informações Principais</h3>

            {/* Tipo de Evento */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Evento *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as EventType }))}
              >
                <SelectTrigger id="type" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: config.color }} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Visita ao apartamento 301"
                className="h-11"
                required
              />
            </div>

            {/* Data e Hora */}
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
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="h-11"
                  required
                />
              </div>
            </div>

            {/* Duração */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Select
                  value={formData.duration.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
                >
                  <SelectTrigger id="duration" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Término</Label>
                <Input
                  value={endTime}
                  readOnly
                  className="h-11 bg-muted"
                />
              </div>
            </div>

            {/* Cliente/Lead */}
            {clients.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="client">Cliente/Lead</Label>
                <Select
                  value={formData.clientId || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value || undefined }))}
                >
                  <SelectTrigger id="client" className="h-11">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {client.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Campos Opcionais (Accordion) */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="details" className="border-none">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="text-sm font-medium">Mais detalhes (opcional)</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {/* Propriedade */}
                {properties.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="property">Propriedade Relacionada</Label>
                    <Select
                      value={formData.propertyId || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, propertyId: value || undefined }))}
                    >
                      <SelectTrigger id="property" className="h-11">
                        <SelectValue placeholder="Selecione uma propriedade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {properties.map(property => (
                          <SelectItem key={property.id} value={property.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span>{property.title}</span>
                                {property.address && (
                                  <span className="text-xs text-muted-foreground">{property.address}</span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Localização */}
                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={formData.location || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Endereço ou local do evento"
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                {/* Lembrete */}
                <div className="space-y-2">
                  <Label htmlFor="reminder">Lembrete</Label>
                  <Select
                    value={formData.reminderMinutes?.toString() || ''}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      reminderMinutes: value ? parseInt(value) : undefined
                    }))}
                  >
                    <SelectTrigger id="reminder" className="h-11">
                      <SelectValue placeholder="Sem lembrete" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem lembrete</SelectItem>
                      <SelectItem value="5">5 minutos antes</SelectItem>
                      <SelectItem value="15">15 minutos antes</SelectItem>
                      <SelectItem value="30">30 minutos antes</SelectItem>
                      <SelectItem value="60">1 hora antes</SelectItem>
                      <SelectItem value="120">2 horas antes</SelectItem>
                      <SelectItem value="1440">1 dia antes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Descrição/Notas */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição/Notas</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Informações adicionais, observações ou lembretes..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Botões de Ação */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-11"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11"
              disabled={isSubmitting || !formData.title || !formData.date || !formData.time}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

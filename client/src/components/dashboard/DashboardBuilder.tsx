import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  LayoutDashboard, Plus, Trash2, Save, Settings, Move, Maximize2, Minimize2,
  BarChart3, PieChart, TrendingUp, Users, Home, DollarSign, Calendar,
  Target, Activity, Clock, Loader2, GripVertical, Edit2, Check, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Widget {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: Record<string, any>;
}

interface DashboardLayout {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

interface DashboardBuilderProps {
  userId: string;
  tenantId: string;
}

const widgetTypes = [
  { type: 'stats_card', label: 'Card de Estatística', icon: BarChart3, defaultSize: { w: 1, h: 1 } },
  { type: 'leads_funnel', label: 'Funil de Leads', icon: Target, defaultSize: { w: 2, h: 2 } },
  { type: 'properties_chart', label: 'Gráfico de Imóveis', icon: PieChart, defaultSize: { w: 2, h: 2 } },
  { type: 'revenue_chart', label: 'Receita', icon: DollarSign, defaultSize: { w: 2, h: 2 } },
  { type: 'recent_leads', label: 'Leads Recentes', icon: Users, defaultSize: { w: 2, h: 2 } },
  { type: 'recent_properties', label: 'Imóveis Recentes', icon: Home, defaultSize: { w: 2, h: 2 } },
  { type: 'tasks_list', label: 'Lista de Tarefas', icon: Calendar, defaultSize: { w: 1, h: 2 } },
  { type: 'activity_feed', label: 'Atividades', icon: Activity, defaultSize: { w: 1, h: 2 } },
  { type: 'sla_alerts', label: 'Alertas de SLA', icon: Clock, defaultSize: { w: 2, h: 1 } },
  { type: 'conversion_rate', label: 'Taxa de Conversão', icon: TrendingUp, defaultSize: { w: 1, h: 1 } },
];

const statsOptions = [
  { value: 'total_leads', label: 'Total de Leads' },
  { value: 'new_leads_today', label: 'Leads Hoje' },
  { value: 'new_leads_week', label: 'Leads Semana' },
  { value: 'total_properties', label: 'Total de Imóveis' },
  { value: 'active_properties', label: 'Imóveis Ativos' },
  { value: 'properties_for_sale', label: 'À Venda' },
  { value: 'properties_for_rent', label: 'Para Alugar' },
  { value: 'pending_tasks', label: 'Tarefas Pendentes' },
  { value: 'monthly_revenue', label: 'Receita Mensal' },
  { value: 'conversion_rate', label: 'Taxa de Conversão' },
];

export function DashboardBuilder({ userId, tenantId }: DashboardBuilderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showLayoutDialog, setShowLayoutDialog] = useState(false);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<DashboardLayout | null>(null);
  const [editingWidgets, setEditingWidgets] = useState<Widget[]>([]);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [selectedWidgetType, setSelectedWidgetType] = useState<string>('');
  const [widgetConfig, setWidgetConfig] = useState<Record<string, any>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: layouts, isLoading } = useQuery<DashboardLayout[]>({
    queryKey: ['dashboard-layouts', userId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard-layouts?userId=${userId}`);
      if (!res.ok) throw new Error('Erro ao carregar layouts');
      return res.json();
    },
  });

  const createLayoutMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/dashboard-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, userId, widgets: [] }),
      });
      if (!res.ok) throw new Error('Erro ao criar layout');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Sucesso', description: 'Layout criado!' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-layouts'] });
      setShowLayoutDialog(false);
      setNewLayoutName('');
      setSelectedLayout(data);
      setEditingWidgets([]);
      setIsEditing(true);
    },
  });

  const saveLayoutMutation = useMutation({
    mutationFn: async ({ layoutId, widgets }: { layoutId: string; widgets: Widget[] }) => {
      const res = await fetch(`/api/dashboard-layouts/${layoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets }),
      });
      if (!res.ok) throw new Error('Erro ao salvar layout');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Layout salvo!' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-layouts'] });
      setIsEditing(false);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (layoutId: string) => {
      const res = await fetch(`/api/dashboard-layouts/${layoutId}/default`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erro ao definir layout padrão');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layouts'] });
    },
  });

  const deleteLayoutMutation = useMutation({
    mutationFn: async (layoutId: string) => {
      const res = await fetch(`/api/dashboard-layouts/${layoutId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir layout');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Layout excluído.' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-layouts'] });
      setSelectedLayout(null);
    },
  });

  const startEditing = (layout: DashboardLayout) => {
    setSelectedLayout(layout);
    setEditingWidgets(layout.widgets || []);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingWidgets([]);
  };

  const saveChanges = () => {
    if (selectedLayout) {
      saveLayoutMutation.mutate({ layoutId: selectedLayout.id, widgets: editingWidgets });
    }
  };

  const addWidget = () => {
    const widgetType = widgetTypes.find(w => w.type === selectedWidgetType);
    if (!widgetType) return;

    const newWidget: Widget = {
      id: `widget_${Date.now()}`,
      type: selectedWidgetType,
      title: widgetConfig.title || widgetType.label,
      x: 0,
      y: editingWidgets.length * 2,
      width: widgetType.defaultSize.w,
      height: widgetType.defaultSize.h,
      config: widgetConfig,
    };

    setEditingWidgets([...editingWidgets, newWidget]);
    setShowWidgetDialog(false);
    setSelectedWidgetType('');
    setWidgetConfig({});
  };

  const removeWidget = (widgetId: string) => {
    setEditingWidgets(editingWidgets.filter(w => w.id !== widgetId));
  };

  const updateWidgetSize = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    const sizeMap = { small: { w: 1, h: 1 }, medium: { w: 2, h: 2 }, large: { w: 4, h: 2 } };
    setEditingWidgets(editingWidgets.map(w =>
      w.id === widgetId ? { ...w, width: sizeMap[size].w, height: sizeMap[size].h } : w
    ));
  };

  const getWidgetIcon = (type: string) => {
    const widget = widgetTypes.find(w => w.type === type);
    return widget?.icon || BarChart3;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Dashboard Customizável
          </h2>
          <p className="text-muted-foreground">
            Personalize seu dashboard com os widgets que você precisa
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={saveChanges} disabled={saveLayoutMutation.isPending}>
                {saveLayoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </>
          ) : (
            <Dialog open={showLayoutDialog} onOpenChange={setShowLayoutDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Layout
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Layout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Layout</Label>
                    <Input
                      placeholder="Ex: Meu Dashboard"
                      value={newLayoutName}
                      onChange={(e) => setNewLayoutName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowLayoutDialog(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createLayoutMutation.mutate(newLayoutName)}
                      disabled={!newLayoutName || createLayoutMutation.isPending}
                      className="flex-1"
                    >
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Layout Selector */}
      {!isEditing && layouts && layouts.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {layouts.map((layout) => (
            <Card
              key={layout.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedLayout?.id === layout.id ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setSelectedLayout(layout)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{layout.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {layout.widgets?.length || 0} widgets
                    </p>
                  </div>
                  {layout.isDefault && (
                    <Badge variant="secondary" className="ml-2">Padrão</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Layout Actions */}
      {!isEditing && selectedLayout && (
        <div className="flex items-center gap-2">
          <Button onClick={() => startEditing(selectedLayout)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar Layout
          </Button>
          {!selectedLayout.isDefault && (
            <Button
              variant="outline"
              onClick={() => setDefaultMutation.mutate(selectedLayout.id)}
            >
              <Check className="h-4 w-4 mr-2" />
              Definir como Padrão
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => deleteLayoutMutation.mutate(selectedLayout.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      )}

      {/* Widget Editor */}
      {isEditing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Widgets</h3>
            <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Widget
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Widget</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {widgetTypes.map((widget) => {
                      const Icon = widget.icon;
                      return (
                        <div
                          key={widget.type}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedWidgetType === widget.type
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-muted-foreground/50'
                          }`}
                          onClick={() => setSelectedWidgetType(widget.type)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-sm">{widget.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedWidgetType && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label>Título do Widget</Label>
                        <Input
                          placeholder="Título personalizado"
                          value={widgetConfig.title || ''}
                          onChange={(e) => setWidgetConfig({ ...widgetConfig, title: e.target.value })}
                        />
                      </div>

                      {selectedWidgetType === 'stats_card' && (
                        <div className="space-y-2">
                          <Label>Métrica</Label>
                          <Select
                            value={widgetConfig.metric}
                            onValueChange={(value) => setWidgetConfig({ ...widgetConfig, metric: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma métrica" />
                            </SelectTrigger>
                            <SelectContent>
                              {statsOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowWidgetDialog(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button onClick={addWidget} disabled={!selectedWidgetType} className="flex-1">
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Widget Grid */}
          {editingWidgets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                <h3 className="font-semibold mb-1">Nenhum widget adicionado</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione widgets para personalizar seu dashboard
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {editingWidgets.map((widget) => {
                const Icon = getWidgetIcon(widget.type);
                const colSpan = `md:col-span-${Math.min(widget.width, 2)} lg:col-span-${widget.width}`;
                const rowSpan = widget.height > 1 ? `row-span-${widget.height}` : '';

                return (
                  <Card
                    key={widget.id}
                    className={`relative group ${colSpan} ${rowSpan}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-sm">{widget.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateWidgetSize(widget.id, 'small')}
                          >
                            <Minimize2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateWidgetSize(widget.id, 'large')}
                          >
                            <Maximize2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeWidget(widget.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-24 bg-muted/30 rounded-lg flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">
                          Preview do Widget
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isEditing && (!layouts || layouts.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
            <h3 className="font-semibold mb-1">Nenhum layout criado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie um layout personalizado para seu dashboard
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

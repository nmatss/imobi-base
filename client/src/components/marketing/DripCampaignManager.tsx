import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, Send, Plus, Trash2, Play, Pause, Users, Clock,
  Target, TrendingUp, ArrowRight, Settings, Loader2, Eye,
  Copy, MoreVertical, ChevronDown, ChevronRight, Edit2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CampaignStep {
  id: string;
  orderIndex: number;
  type: 'email' | 'sms' | 'whatsapp' | 'wait';
  delayDays: number;
  delayHours: number;
  subject?: string;
  content: string;
  templateId?: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  triggerType: 'manual' | 'new_lead' | 'property_view' | 'form_submit';
  steps: CampaignStep[];
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
}

interface DripCampaignManagerProps {
  tenantId: string;
}

const triggerTypes = [
  { value: 'manual', label: 'Manual', description: 'Adicionar leads manualmente' },
  { value: 'new_lead', label: 'Novo Lead', description: 'Quando um lead é criado' },
  { value: 'property_view', label: 'Visualização', description: 'Quando visualiza um imóvel' },
  { value: 'form_submit', label: 'Formulário', description: 'Quando envia um formulário' },
];

const stepTypes = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: Send },
  { value: 'whatsapp', label: 'WhatsApp', icon: Send },
  { value: 'wait', label: 'Aguardar', icon: Clock },
];

export function DripCampaignManager({ tenantId }: DripCampaignManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    triggerType: 'manual',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['drip-campaigns', tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/drip-campaigns?tenantId=${tenantId}`);
      if (!res.ok) throw new Error('Erro ao carregar campanhas');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const res = await fetch('/api/drip-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, tenantId }),
      });
      if (!res.ok) throw new Error('Erro ao criar campanha');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Sucesso', description: 'Campanha criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
      setShowCreateDialog(false);
      setSelectedCampaign(data);
      setNewCampaign({ name: '', description: '', triggerType: 'manual' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ campaignId }: { campaignId: string }) => {
      const res = await fetch(`/api/drip-campaigns/${campaignId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao atualizar status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async ({ campaignId, step }: { campaignId: string; step: Partial<CampaignStep> }) => {
      const res = await fetch(`/api/drip-campaigns/${campaignId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(step),
      });
      if (!res.ok) throw new Error('Erro ao adicionar etapa');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Etapa adicionada!' });
      queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const res = await fetch(`/api/campaign-steps/${stepId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao remover etapa');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`/api/drip-campaigns/${campaignId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir campanha');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Campanha excluída.' });
      queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
      setSelectedCampaign(null);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-amber-700'; // WCAG AA: 4.6:1 contrast
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'paused': return 'Pausada';
      case 'completed': return 'Concluída';
      default: return 'Rascunho';
    }
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
            <Mail className="h-6 w-6" />
            Drip Campaigns
          </h2>
          <p className="text-muted-foreground">
            Automatize sequências de comunicação com leads
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Campanha</DialogTitle>
              <DialogDescription>
                Configure uma nova sequência automatizada
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Campanha</Label>
                <Input
                  placeholder="Ex: Boas-vindas Novos Leads"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Descreva o objetivo desta campanha..."
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gatilho</Label>
                <Select
                  value={newCampaign.triggerType}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, triggerType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        <div>
                          <span className="font-medium">{trigger.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {trigger.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newCampaign)}
                  disabled={!newCampaign.name || createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Campanha
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Campanhas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns?.filter(c => c.status === 'active').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns?.reduce((sum, c) => sum + (c.enrolledCount || 0), 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Inscritos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns?.reduce((sum, c) => sum + (c.completedCount || 0), 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {(!campaigns || campaigns.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
            <h3 className="font-semibold mb-1">Nenhuma campanha criada</h3>
            <p className="text-sm text-muted-foreground">
              Crie sua primeira campanha de drip marketing
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-0">
                {/* Campaign Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedCampaign(
                    expandedCampaign === campaign.id ? null : campaign.id
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="shrink-0">
                      {expandedCampaign === campaign.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground hidden sm:block">
                      <span>{campaign.steps?.length || 0} etapas</span>
                      <span className="mx-2">•</span>
                      <span>{campaign.enrolledCount || 0} inscritos</span>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {campaign.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatusMutation.mutate({ campaignId: campaign.id });
                          }}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : campaign.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatusMutation.mutate({ campaignId: campaign.id });
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCampaignMutation.mutate(campaign.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Campaign Steps */}
                {expandedCampaign === campaign.id && (
                  <div className="border-t px-4 py-4 bg-muted/30">
                    <div className="space-y-3">
                      {campaign.steps?.map((step, index) => {
                        const StepIcon = stepTypes.find(t => t.value === step.type)?.icon || Mail;
                        return (
                          <div key={step.id} className="flex items-center gap-3">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="p-2 bg-primary/10 rounded-full">
                                <StepIcon className="h-4 w-4 text-primary" />
                              </div>
                              {step.delayDays > 0 || step.delayHours > 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  +{step.delayDays > 0 && `${step.delayDays}d `}
                                  {step.delayHours > 0 && `${step.delayHours}h`}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Imediato</span>
                              )}
                            </div>
                            <div className="flex-1 p-3 bg-background rounded-lg border">
                              {step.subject && (
                                <p className="font-medium text-sm">{step.subject}</p>
                              )}
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {step.type === 'wait' ? `Aguardar ${step.delayDays} dias` : step.content}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive shrink-0"
                              onClick={() => deleteStepMutation.mutate(step.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}

                      {/* Add Step */}
                      <AddStepDialog
                        campaignId={campaign.id}
                        onAdd={(step) => addStepMutation.mutate({ campaignId: campaign.id, step })}
                        isPending={addStepMutation.isPending}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddStepDialog({
  campaignId,
  onAdd,
  isPending,
}: {
  campaignId: string;
  onAdd: (step: Partial<CampaignStep>) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState({
    type: 'email' as CampaignStep['type'],
    delayDays: 0,
    delayHours: 0,
    subject: '',
    content: '',
  });

  const handleAdd = () => {
    onAdd(step);
    setOpen(false);
    setStep({ type: 'email', delayDays: 0, delayHours: 0, subject: '', content: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Etapa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Etapa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={step.type}
              onValueChange={(value: CampaignStep['type']) => setStep({ ...step, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stepTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aguardar (dias)</Label>
              <Input
                type="number"
                min={0}
                value={step.delayDays}
                onChange={(e) => setStep({ ...step, delayDays: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Aguardar (horas)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={step.delayHours}
                onChange={(e) => setStep({ ...step, delayHours: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {step.type !== 'wait' && (
            <>
              {step.type === 'email' && (
                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input
                    placeholder="Assunto do email"
                    value={step.subject}
                    onChange={(e) => setStep({ ...step, subject: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  placeholder="Conteúdo da mensagem..."
                  rows={4}
                  value={step.content}
                  onChange={(e) => setStep({ ...step, content: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use variáveis: {'{{nome}}'}, {'{{email}}'}, {'{{telefone}}'}
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

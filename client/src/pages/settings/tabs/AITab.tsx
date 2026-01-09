import React, { useState, useEffect } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Home,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Zap,
  Globe,
  MessageSquare,
  Settings,
  Check,
  Info,
} from "lucide-react";
import type { AISettings } from "../types";

interface AITabProps {
  initialData: Partial<AISettings>;
  onSave: (data: Partial<AISettings>) => Promise<void>;
}

// Real estate specific presets - NO generic examples
const MODULE_PRESETS = {
  properties: {
    icon: <Home className="w-4 h-4" />,
    label: "Imóveis",
    color: "bg-blue-100 text-blue-700",
    presets: [
      { id: "property_description", label: "Gerar descrição de imóvel", enabled: true },
      { id: "property_title", label: "Criar título atrativo", enabled: true },
      { id: "property_highlights", label: "Destacar diferenciais", enabled: true },
      { id: "property_seo", label: "Otimizar para SEO", enabled: false },
      { id: "property_photos", label: "Sugerir melhorias nas fotos", enabled: false },
    ],
  },
  leads: {
    icon: <Users className="w-4 h-4" />,
    label: "Leads",
    color: "bg-green-100 text-green-700",
    presets: [
      { id: "lead_followup", label: "Mensagem de follow-up", enabled: true },
      { id: "lead_qualification", label: "Qualificação de lead", enabled: true },
      { id: "lead_response", label: "Resposta automática inicial", enabled: true },
      { id: "lead_approach", label: "Sugestão de abordagem", enabled: false },
      { id: "lead_reactivation", label: "Reativação de lead frio", enabled: false },
    ],
  },
  rentals: {
    icon: <FileText className="w-4 h-4" />,
    label: "Aluguéis",
    color: "bg-orange-100 text-orange-700",
    presets: [
      { id: "rental_collection", label: "Texto de cobrança de aluguel", enabled: true },
      { id: "rental_adjustment", label: "Aviso de reajuste anual", enabled: true },
      { id: "rental_notice", label: "Carta de aviso ao inquilino", enabled: true },
      { id: "rental_renewal", label: "Proposta de renovação", enabled: false },
      { id: "rental_termination", label: "Notificação de rescisão", enabled: false },
    ],
  },
  sales: {
    icon: <DollarSign className="w-4 h-4" />,
    label: "Vendas",
    color: "bg-purple-100 text-purple-700",
    presets: [
      { id: "sales_proposal", label: "Proposta comercial", enabled: true },
      { id: "sales_followup", label: "E-mail de acompanhamento", enabled: true },
      { id: "sales_presentation", label: "Apresentação de imóvel", enabled: true },
      { id: "sales_negotiation", label: "Argumentos de negociação", enabled: false },
      { id: "sales_closing", label: "Mensagem de fechamento", enabled: false },
    ],
  },
  financial: {
    icon: <BarChart3 className="w-4 h-4" />,
    label: "Financeiro",
    color: "bg-emerald-100 text-emerald-700",
    presets: [
      { id: "financial_summary", label: "Resumo mensal", enabled: true },
      { id: "financial_analysis", label: "Análise de despesas", enabled: true },
      { id: "financial_forecast", label: "Previsão de receita", enabled: false },
      { id: "financial_report", label: "Relatório customizado", enabled: false },
    ],
  },
};

const TONE_OPTIONS = [
  { value: "formal", label: "Formal", description: "Tom profissional e corporativo" },
  { value: "neutral", label: "Neutro", description: "Equilibrado e direto" },
  { value: "friendly", label: "Amigável", description: "Próximo e acolhedor" },
];

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
];

export function AITab({ initialData, onSave }: AITabProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<AISettings>>({
    aiActive: initialData.aiActive !== undefined ? initialData.aiActive : true,
    language: initialData.language || "pt-BR",
    tone: initialData.tone || "neutral",
    modulePresets: initialData.modulePresets || {},
    brokersCanEdit: initialData.brokersCanEdit !== undefined ? initialData.brokersCanEdit : true,
  });

  const [presetStates, setPresetStates] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    setFormData({
      aiActive: initialData.aiActive !== undefined ? initialData.aiActive : true,
      language: initialData.language || "pt-BR",
      tone: initialData.tone || "neutral",
      modulePresets: initialData.modulePresets || {},
      brokersCanEdit: initialData.brokersCanEdit !== undefined ? initialData.brokersCanEdit : true,
    });

    // Initialize preset states from saved data
    const initialStates: Record<string, Record<string, boolean>> = {};
    Object.entries(MODULE_PRESETS).forEach(([module, data]) => {
      initialStates[module] = {};
      data.presets.forEach((preset) => {
        const savedPresets = initialData.modulePresets?.[module as keyof typeof initialData.modulePresets];
        initialStates[module][preset.id] = savedPresets?.includes(preset.id) ?? preset.enabled;
      });
    });
    setPresetStates(initialStates);
  }, [initialData]);

  const handlePresetToggle = (module: string, presetId: string) => {
    setPresetStates((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [presetId]: !prev[module]?.[presetId],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert preset states to array format for saving
      const modulePresets: Record<string, string[]> = {};
      Object.entries(presetStates).forEach(([module, presets]) => {
        modulePresets[module] = Object.entries(presets)
          .filter(([_, enabled]) => enabled)
          .map(([id]) => id);
      });

      await onSave({
        ...formData,
        modulePresets,
      });

      toast({
        title: "Configurações salvas",
        description: "As configurações de IA foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Count enabled presets
  const enabledPresetsCount = Object.values(presetStates).reduce(
    (total, module) => total + Object.values(module).filter(Boolean).length,
    0
  );

  const totalPresetsCount = Object.values(MODULE_PRESETS).reduce(
    (total, module) => total + module.presets.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* AI Status Card */}
      <Card className={formData.aiActive ? "border-primary/30 bg-primary/5" : ""}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${formData.aiActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Assistente de IA</h3>
                <p className="text-sm text-muted-foreground">
                  {formData.aiActive
                    ? "A IA está ativa e auxiliando sua equipe"
                    : "A IA está desativada para todos os usuários"}
                </p>
                {formData.aiActive && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {enabledPresetsCount} de {totalPresetsCount} presets ativos
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <Switch
              checked={formData.aiActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, aiActive: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Settings */}
      <SettingsCard
        title="Configurações Gerais"
        description="Defina como a IA deve se comportar em toda a plataforma."
        onSave={handleSave}
        isSaving={isSaving}
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-medium">Idioma e Tom</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Idioma Padrão</Label>
            <Select
              value={formData.language}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, language: value }))
              }
              disabled={!formData.aiActive}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tom de Voz</Label>
            <Select
              value={formData.tone}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, tone: value }))
              }
              disabled={!formData.aiActive}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        - {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-medium">Presets por Módulo</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Escolha quais prompts rápidos estarão disponíveis para sua equipe em cada área do sistema.
        </p>

        <Accordion type="multiple" className="w-full">
          {Object.entries(MODULE_PRESETS).map(([module, data]) => {
            const enabledCount = Object.values(presetStates[module] || {}).filter(Boolean).length;
            return (
              <AccordionItem key={module} value={module}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${data.color}`}>
                      {data.icon}
                    </div>
                    <span className="font-medium">{data.label}</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {enabledCount}/{data.presets.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {data.presets.map((preset) => (
                      <label
                        key={preset.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          presetStates[module]?.[preset.id]
                            ? "border-primary/30 bg-primary/5"
                            : "hover:bg-accent/50"
                        } ${!formData.aiActive ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Checkbox
                          checked={presetStates[module]?.[preset.id] || false}
                          onCheckedChange={() => handlePresetToggle(module, preset.id)}
                          disabled={!formData.aiActive}
                        />
                        <span className="flex-1 text-sm">{preset.label}</span>
                        {presetStates[module]?.[preset.id] && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <span className="font-medium">Permissões</span>
        </div>

        <div
          className={`flex items-center justify-between p-4 rounded-lg border ${
            !formData.aiActive ? "opacity-50" : ""
          }`}
        >
          <div>
            <h3 className="font-medium text-sm">Corretores podem editar presets</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Permite que os corretores personalizem os templates de IA para suas necessidades
            </p>
          </div>
          <Switch
            checked={formData.brokersCanEdit}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, brokersCanEdit: checked }))
            }
            disabled={!formData.aiActive}
          />
        </div>
      </SettingsCard>

      {/* Informações sobre AITOPIA - Rodapé discreto */}
      <div className="mt-8 pt-6 border-t">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Info className="w-4 h-4" />
            <span className="font-medium">Sobre a IA no ImobiBase (AITOPIA)</span>
            <span className="ml-auto text-xs group-open:hidden">Clique para ver mais</span>
          </summary>
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AITOPIA - IA Especializada em Imobiliário
                </h4>
                <p className="text-sm text-slate-700 mb-3">
                  A AITOPIA é nossa tecnologia de inteligência artificial desenvolvida
                  especificamente para o mercado imobiliário brasileiro. Ela auxilia sua
                  equipe com tarefas específicas como:
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span>Criar descrições atrativas de imóveis otimizadas para SEO</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                    <span>Gerar mensagens de follow-up personalizadas para leads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span>Criar textos profissionais de cobrança e comunicações</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                    <span>Elaborar propostas comerciais e apresentações de vendas</span>
                  </li>
                </ul>
                <p className="text-xs text-slate-600 mt-4 italic">
                  Todos os presets são otimizados para o contexto brasileiro e podem
                  ser personalizados conforme suas necessidades.
                </p>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

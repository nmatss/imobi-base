import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Edit, DollarSign, Users, Building2, Plug } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

type Plan = {
  id: string;
  name: string;
  price: string;
  maxUsers: number;
  maxProperties: number;
  maxIntegrations: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    maxUsers: 5,
    maxProperties: 100,
    maxIntegrations: 3,
    features: [] as string[],
    isActive: true,
  });

  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const res = await fetch("/api/admin/plans", {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!selectedPlan) return;

    try {
      const res = await fetch(`/api/admin/plans/${selectedPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Plano atualizado com sucesso!");
        setEditModalOpen(false);
        setSelectedPlan(null);
        resetForm();
        fetchPlans();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao atualizar plano");
      }
    } catch (error) {
      toast.error("Erro ao atualizar plano");
    }
  }

  function openEditModal(plan: Plan) {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      maxUsers: plan.maxUsers,
      maxProperties: plan.maxProperties,
      maxIntegrations: plan.maxIntegrations,
      features: plan.features,
      isActive: plan.isActive,
    });
    setEditModalOpen(true);
  }

  function resetForm() {
    setFormData({
      name: "",
      price: "",
      maxUsers: 5,
      maxProperties: 100,
      maxIntegrations: 3,
      features: [],
      isActive: true,
    });
    setFeatureInput("");
  }

  function addFeature() {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput("");
    }
  }

  function removeFeature(index: number) {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Gerenciamento de Planos</h1>
        <p className="text-muted-foreground mt-1">
          Configure os planos de assinatura da plataforma
        </p>
      </div>

      {/* Cards de Planos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                {!plan.isActive && (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
              <CardDescription className="text-3xl font-bold text-primary">
                R$ {parseFloat(plan.price).toFixed(2)}
                <span className="text-sm text-muted-foreground font-normal">/mês</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Limites */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Até</span>
                  <span className="font-semibold">{plan.maxUsers} usuários</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Até</span>
                  <span className="font-semibold">{plan.maxProperties} imóveis</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Plug className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Até</span>
                  <span className="font-semibold">{plan.maxIntegrations} integrações</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Recursos:</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botão de Editar */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => openEditModal(plan)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Plano
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Editar Plano */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Atualize as configurações do plano
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Básico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço Mensal (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="99.90"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Máx. Usuários</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxProperties">Máx. Imóveis</Label>
                <Input
                  id="maxProperties"
                  type="number"
                  value={formData.maxProperties}
                  onChange={(e) => setFormData({ ...formData, maxProperties: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxIntegrations">Máx. Integrações</Label>
                <Input
                  id="maxIntegrations"
                  type="number"
                  value={formData.maxIntegrations}
                  onChange={(e) => setFormData({ ...formData, maxIntegrations: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recursos Inclusos</Label>
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="Digite um recurso e pressione Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <Button type="button" onClick={addFeature}>
                  Adicionar
                </Button>
              </div>
              {formData.features.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="flex-1 text-sm">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label>Plano Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Desative para ocultar o plano dos clientes
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

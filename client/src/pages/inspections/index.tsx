import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Plus,
  Loader2,
  Building2,
  Calendar,
  AlertTriangle,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  FileSignature,
} from "lucide-react";

type Inspection = {
  id: string;
  tenantId: string;
  propertyId: string;
  rentalContractId: string | null;
  type: string;
  status: string;
  inspectorName: string;
  renterName: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  overallCondition: string | null;
  totalDamages: number | null;
  createdAt: string;
};

type Property = {
  id: string;
  title: string;
  address: string;
  type: string;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<any> }> = {
  in_progress: { label: "Em Andamento", variant: "secondary", icon: Clock },
  completed: { label: "Concluida", variant: "default", icon: CheckCircle2 },
  signed: { label: "Assinada", variant: "outline", icon: FileSignature },
};

const typeLabels: Record<string, string> = {
  entry: "Entrada",
  exit: "Saida",
  periodic: "Periodica",
};

const conditionConfig: Record<string, { label: string; color: string }> = {
  excellent: { label: "Excelente", color: "bg-green-100 text-green-800" },
  good: { label: "Bom", color: "bg-blue-100 text-blue-800" },
  fair: { label: "Regular", color: "bg-yellow-100 text-yellow-800" },
  poor: { label: "Ruim", color: "bg-red-100 text-red-800" },
};

export default function InspectionsPage() {
  const { properties } = useImobi();
  const [, setLocation] = useLocation();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");

  // Create form state
  const [newInspection, setNewInspection] = useState({
    propertyId: "",
    type: "entry",
    inspectorName: "",
    renterName: "",
    scheduledDate: "",
    propertyType: "",
    previousInspectionId: "",
  });

  const fetchInspections = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterProperty !== "all") params.append("propertyId", filterProperty);
      if (filterType !== "all") params.append("type", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);

      const res = await fetch(`/api/inspections?${params.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        setInspections(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch inspections", e);
    } finally {
      setLoading(false);
    }
  }, [filterProperty, filterType, filterStatus]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Get existing entry inspections for the selected property (for exit inspection linking)
  const entryInspections = inspections.filter(
    (i) =>
      i.propertyId === newInspection.propertyId &&
      i.type === "entry" &&
      (i.status === "completed" || i.status === "signed")
  );

  const handleCreate = async () => {
    if (!newInspection.propertyId || !newInspection.inspectorName) return;

    setCreating(true);
    try {
      // Find property type
      const property = properties.find((p: Property) => p.id === newInspection.propertyId);

      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...newInspection,
          propertyType: property?.type || "apartment",
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setShowCreateDialog(false);
        setNewInspection({
          propertyId: "",
          type: "entry",
          inspectorName: "",
          renterName: "",
          scheduledDate: "",
          propertyType: "",
          previousInspectionId: "",
        });
        setLocation(`/vistorias/${created.id}`);
      }
    } catch (e) {
      console.error("Failed to create inspection", e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta vistoria?")) return;

    try {
      const res = await fetch(`/api/inspections/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        fetchInspections();
      }
    } catch (e) {
      console.error("Failed to delete inspection", e);
    }
  };

  const filteredInspections = inspections.filter((i) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const property = properties.find((p: Property) => p.id === i.propertyId);
      const matchesSearch =
        i.inspectorName?.toLowerCase().includes(query) ||
        i.renterName?.toLowerCase().includes(query) ||
        property?.title?.toLowerCase().includes(query) ||
        property?.address?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const getPropertyName = (propertyId: string) => {
    const property = properties.find((p: Property) => p.id === propertyId);
    return property?.title || property?.address || "Imovel";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vistorias</h1>
          <p className="text-muted-foreground mt-1">
            Gestao de vistorias digitais de imoveis
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Vistoria
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por imovel, vistoriador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluida</SelectItem>
                <SelectItem value="signed">Assinada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="entry">Entrada</SelectItem>
                <SelectItem value="exit">Saida</SelectItem>
                <SelectItem value="periodic">Periodica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProperty} onValueChange={setFilterProperty}>
              <SelectTrigger>
                <SelectValue placeholder="Imovel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Imoveis</SelectItem>
                {properties.map((p: Property) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title || p.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inspections List */}
      {filteredInspections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma vistoria encontrada</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Crie uma nova vistoria para comecar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInspections.map((inspection) => {
            const statusInfo = statusConfig[inspection.status] || statusConfig.in_progress;
            const StatusIcon = statusInfo.icon;
            const condition = conditionConfig[inspection.overallCondition || ""];

            return (
              <Card
                key={inspection.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setLocation(`/vistorias/${inspection.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {getPropertyName(inspection.propertyId)}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={statusInfo.variant} className="gap-1 text-xs">
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[inspection.type] || inspection.type}
                        </Badge>
                      </div>
                    </div>
                    {inspection.status === "in_progress" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(inspection.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">Vistoriador: {inspection.inspectorName}</span>
                  </div>
                  {inspection.renterName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4 shrink-0" />
                      <span className="truncate">Inquilino: {inspection.renterName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      {inspection.completedDate
                        ? new Date(inspection.completedDate).toLocaleDateString("pt-BR")
                        : inspection.scheduledDate
                        ? `Agendada: ${new Date(inspection.scheduledDate).toLocaleDateString("pt-BR")}`
                        : new Date(inspection.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    {condition ? (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${condition.color}`}>
                        {condition.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendente</span>
                    )}
                    {inspection.totalDamages && inspection.totalDamages > 0 ? (
                      <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        R$ {inspection.totalDamages.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Vistoria</DialogTitle>
            <DialogDescription>
              Preencha os dados para iniciar uma nova vistoria digital
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Imovel *</Label>
              <Select
                value={newInspection.propertyId}
                onValueChange={(v) =>
                  setNewInspection((prev) => ({ ...prev, propertyId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o imovel" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p: Property) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title || p.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Vistoria *</Label>
              <Select
                value={newInspection.type}
                onValueChange={(v) =>
                  setNewInspection((prev) => ({ ...prev, type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="exit">Saida</SelectItem>
                  <SelectItem value="periodic">Periodica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newInspection.type === "exit" && entryInspections.length > 0 && (
              <div className="space-y-2">
                <Label>Vistoria de Entrada (para comparacao)</Label>
                <Select
                  value={newInspection.previousInspectionId}
                  onValueChange={(v) =>
                    setNewInspection((prev) => ({ ...prev, previousInspectionId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a vistoria de entrada" />
                  </SelectTrigger>
                  <SelectContent>
                    {entryInspections.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        Entrada - {new Date(i.completedDate || i.createdAt).toLocaleDateString("pt-BR")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome do Vistoriador *</Label>
              <Input
                value={newInspection.inspectorName}
                onChange={(e) =>
                  setNewInspection((prev) => ({
                    ...prev,
                    inspectorName: e.target.value,
                  }))
                }
                placeholder="Nome completo do vistoriador"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome do Inquilino</Label>
              <Input
                value={newInspection.renterName}
                onChange={(e) =>
                  setNewInspection((prev) => ({
                    ...prev,
                    renterName: e.target.value,
                  }))
                }
                placeholder="Nome do inquilino (opcional)"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Agendada</Label>
              <Input
                type="date"
                value={newInspection.scheduledDate}
                onChange={(e) =>
                  setNewInspection((prev) => ({
                    ...prev,
                    scheduledDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newInspection.propertyId || !newInspection.inspectorName}
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Vistoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

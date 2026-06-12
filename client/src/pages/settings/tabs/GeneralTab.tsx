import { useState, useEffect } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/lib/toast-helpers";
import { AlertCircle, CheckCircle2, Building2, Landmark, Clock, Eraser, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCSRFToken } from "@/lib/queryClient";
import type { TenantSettings } from "../types";

interface GeneralTabProps {
  initialData: Partial<TenantSettings>;
  onSave: (data: Partial<TenantSettings>) => Promise<void>;
}

interface ValidationState {
  email: boolean;
  phone: boolean;
  cnpj: boolean;
}

export function GeneralTab({ initialData, onSave }: GeneralTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingDemo, setIsClearingDemo] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const [formData, setFormData] = useState<Partial<TenantSettings>>({
    name: initialData.name || "",
    cnpj: initialData.cnpj || "",
    inscricaoMunicipal: initialData.inscricaoMunicipal || "",
    creci: initialData.creci || "",
    phone: initialData.phone || "",
    email: initialData.email || "",
    address: initialData.address || "",
    bankName: initialData.bankName || "",
    bankAgency: initialData.bankAgency || "",
    bankAccount: initialData.bankAccount || "",
    pixKey: initialData.pixKey || "",
    businessHoursStart: initialData.businessHoursStart || "09:00",
    businessHoursEnd: initialData.businessHoursEnd || "18:00",
  });

  const [validation, setValidation] = useState<ValidationState>({
    email: true,
    phone: true,
    cnpj: true,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFormData({
      name: initialData.name || "",
      cnpj: initialData.cnpj || "",
      inscricaoMunicipal: initialData.inscricaoMunicipal || "",
      creci: initialData.creci || "",
      phone: initialData.phone || "",
      email: initialData.email || "",
      address: initialData.address || "",
      bankName: initialData.bankName || "",
      bankAgency: initialData.bankAgency || "",
      bankAccount: initialData.bankAccount || "",
      pixKey: initialData.pixKey || "",
      businessHoursStart: initialData.businessHoursStart || "09:00",
      businessHoursEnd: initialData.businessHoursEnd || "18:00",
    });
  }, [initialData]);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    const numbers = phone.replace(/\D/g, "");
    return numbers.length >= 10 && numbers.length <= 11;
  };

  const validateCNPJ = (cnpj: string): boolean => {
    if (!cnpj) return true;
    const numbers = cnpj.replace(/\D/g, "");
    return numbers.length === 14;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === "email") {
      setValidation((prev) => ({ ...prev, email: validateEmail(formData.email || "") }));
    } else if (field === "phone") {
      setValidation((prev) => ({ ...prev, phone: validatePhone(formData.phone || "") }));
    } else if (field === "cnpj") {
      setValidation((prev) => ({ ...prev, cnpj: validateCNPJ(formData.cnpj || "") }));
    }
  };

  const handleSave = async () => {
    // Validate all fields before saving
    const emailValid = validateEmail(formData.email || "");
    const phoneValid = validatePhone(formData.phone || "");
    const cnpjValid = validateCNPJ(formData.cnpj || "");

    setValidation({ email: emailValid, phone: phoneValid, cnpj: cnpjValid });
    setTouched({ email: true, phone: true, cnpj: true });

    if (!emailValid || !phoneValid || !cnpjValid) {
      toast.errors.validation("Corrija os campos destacados antes de salvar.");
      return;
    }

    if (!formData.name?.trim()) {
      toast.errors.validation("O nome da imobiliária é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      toast.crud.saved("Configurações");
    } catch (error) {
      toast.errors.operation("salvar as configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  const getFieldStatus = (field: keyof ValidationState) => {
    if (!touched[field]) return "default";
    return validation[field] ? "valid" : "invalid";
  };

  const handleClearDemoData = async () => {
    const confirmed = await confirm({
      title: "Limpar dados de exemplo?",
      description:
        'Todos os imóveis, leads, visitas e lançamentos financeiros marcados com o prefixo "[Exemplo]" serão removidos permanentemente. Seus dados reais não serão afetados.',
      confirmText: "Limpar dados de exemplo",
      variant: "destructive",
    });
    if (!confirmed) return;

    setIsClearingDemo(true);
    try {
      const csrfToken = getCSRFToken();
      const res = await fetch("/api/onboarding/demo-data", {
        method: "DELETE",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Falha ao remover dados de exemplo");
      const data = await res.json();
      const total = data?.removed
        ? data.removed.properties + data.removed.leads + data.removed.visits + data.removed.financeEntries
        : 0;
      if (total > 0) {
        toast.success(
          "Dados de exemplo removidos",
          `${data.removed.properties} imóveis, ${data.removed.leads} leads, ${data.removed.visits} visitas e ${data.removed.financeEntries} lançamentos excluídos.`
        );
      } else {
        toast.info("Nenhum dado de exemplo encontrado", "Sua conta não possui registros de demonstração.");
      }
    } catch (error) {
      toast.errors.operation("remover os dados de exemplo");
    } finally {
      setIsClearingDemo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <SettingsCard
        title="Dados da Empresa"
        description="Informações básicas e documentação da sua imobiliária."
        onSave={handleSave}
        isSaving={isSaving}
      >
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-medium">Identificação</span>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="flex items-center gap-1">
              Nome da Imobiliária
              <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
                Obrigatório
              </Badge>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Minha Imobiliária"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <div className="relative">
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cnpj: formatCNPJ(e.target.value),
                    }))
                  }
                  onBlur={() => handleBlur("cnpj")}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={cn(
                    "h-11 pr-10",
                    getFieldStatus("cnpj") === "invalid" && "border-destructive focus-visible:ring-destructive",
                    getFieldStatus("cnpj") === "valid" && formData.cnpj && "border-green-500 focus-visible:ring-green-500"
                  )}
                />
                {touched.cnpj && formData.cnpj && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validation.cnpj ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {touched.cnpj && !validation.cnpj && (
                <p className="text-xs text-destructive">CNPJ inválido</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
              <Input
                id="inscricaoMunicipal"
                value={formData.inscricaoMunicipal}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    inscricaoMunicipal: e.target.value,
                  }))
                }
                placeholder="00000000"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="creci">CRECI</Label>
            <Input
              id="creci"
              value={formData.creci}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, creci: e.target.value }))
              }
              placeholder="CRECI/UF 0000-J"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Número do registro no Conselho Regional de Corretores de Imóveis
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-medium">Contato</span>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                Telefone
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
                  Obrigatório
                </Badge>
              </Label>
              <div className="relative">
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: formatPhone(e.target.value),
                    }))
                  }
                  onBlur={() => handleBlur("phone")}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className={cn(
                    "h-11 pr-10",
                    getFieldStatus("phone") === "invalid" && "border-destructive focus-visible:ring-destructive",
                    getFieldStatus("phone") === "valid" && formData.phone && "border-green-500 focus-visible:ring-green-500"
                  )}
                />
                {touched.phone && formData.phone && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validation.phone ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {touched.phone && !validation.phone && (
                <p className="text-xs text-destructive">Telefone inválido</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                E-mail de Contato
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
                  Obrigatório
                </Badge>
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  onBlur={() => handleBlur("email")}
                  placeholder="contato@imobiliaria.com.br"
                  className={cn(
                    "h-11 pr-10",
                    getFieldStatus("email") === "invalid" && "border-destructive focus-visible:ring-destructive",
                    getFieldStatus("email") === "valid" && formData.email && "border-green-500 focus-visible:ring-green-500"
                  )}
                />
                {touched.email && formData.email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validation.email ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {touched.email && !validation.email && (
                <p className="text-xs text-destructive">E-mail inválido</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Endereço Completo</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="Rua, número - Bairro, Cidade/UF, CEP"
              className="h-11"
            />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Landmark className="w-5 h-5 text-primary" />
          <span className="font-medium">Dados Bancários</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Para recebimento de comissões e repasses
        </p>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bankName">Banco</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bankName: e.target.value }))
                }
                placeholder="Banco do Brasil"
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bankAgency">Agência</Label>
              <Input
                id="bankAgency"
                value={formData.bankAgency}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankAgency: e.target.value,
                  }))
                }
                placeholder="0000"
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bankAccount">Conta</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankAccount: e.target.value,
                  }))
                }
                placeholder="00000-0"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              value={formData.pixKey}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, pixKey: e.target.value }))
              }
              placeholder="CNPJ, e-mail, celular ou chave aleatória"
              className="h-11"
            />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <span className="font-medium">Horário de Atendimento</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="businessHoursStart">Abertura</Label>
            <Input
              id="businessHoursStart"
              type="time"
              value={formData.businessHoursStart}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  businessHoursStart: e.target.value,
                }))
              }
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="businessHoursEnd">Fechamento</Label>
            <Input
              id="businessHoursEnd"
              type="time"
              value={formData.businessHoursEnd}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  businessHoursEnd: e.target.value,
                }))
              }
              className="h-11"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            O horário de atendimento será exibido no seu site público e nas mensagens automáticas para clientes.
          </p>
        </div>
      </SettingsCard>

      {/* Demo Data */}
      <SettingsCard
        title="Dados de Exemplo"
        description="Remova os registros de demonstração criados durante o onboarding."
        showSaveButton={false}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Imóveis, leads, visitas e lançamentos financeiros com o prefixo{" "}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 align-middle">
              [Exemplo]
            </Badge>{" "}
            serão excluídos. Seus dados reais não serão afetados.
          </p>
          <Button
            variant="outline"
            onClick={handleClearDemoData}
            disabled={isClearingDemo}
            className="shrink-0 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            {isClearingDemo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eraser className="w-4 h-4" />
            )}
            Limpar dados de exemplo
          </Button>
        </div>
      </SettingsCard>

      {dialog}
    </div>
  );
}

import { useState, useEffect } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToastFeedback } from "@/hooks/useToastFeedback";
import { useUnsavedChanges, useFormDirtyState } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesBanner, UnsavedChangesBar } from "@/components/ui/unsaved-changes-banner";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { AlertCircle, CheckCircle2, Building2, Landmark, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
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

/**
 * EXEMPLO DE IMPLEMENTAÇÃO DE FEEDBACK VISUAL
 *
 * Este componente demonstra:
 * 1. Toast notifications para sucesso/erro
 * 2. Banner de mudanças não salvas
 * 3. Loading states em botões
 * 4. Confirmação ao sair sem salvar
 * 5. Validação visual de campos
 */
export function GeneralTabImproved({ initialData, onSave }: GeneralTabProps) {
  const toast = useToastFeedback();
  const [isSaving, setIsSaving] = useState(false);

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

  // Detectar mudanças automaticamente
  const { isDirty, resetForm } = useFormDirtyState(formData, initialData);

  // Gerenciar navegação com mudanças não salvas
  const { confirmNavigation, cancelNavigation, blocker } = useUnsavedChanges(isDirty);

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
    resetForm();
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
    const isEmailValid = validateEmail(formData.email || "");
    const isPhoneValid = validatePhone(formData.phone || "");
    const isCNPJValid = validateCNPJ(formData.cnpj || "");

    setValidation({
      email: isEmailValid,
      phone: isPhoneValid,
      cnpj: isCNPJValid,
    });

    setTouched({
      email: true,
      phone: true,
      cnpj: true,
    });

    if (!isEmailValid || !isPhoneValid || !isCNPJValid) {
      // Toast de erro de validação
      toast.error("Erro de validação", "Verifique os campos destacados em vermelho");
      return;
    }

    setIsSaving(true);

    try {
      await onSave(formData);

      // Toast de sucesso
      toast.success("Alterações salvas com sucesso!");

      // Resetar estado de dirty
      resetForm();

    } catch (error: any) {
      // Toast de erro
      toast.error(
        "Erro ao salvar configurações",
        error.message || "Por favor, tente novamente"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
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
    resetForm();
    toast.info("Alterações descartadas");
  };

  return (
    <>
      {/* Banner de mudanças não salvas - Sticky no topo */}
      <UnsavedChangesBanner
        show={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        isSaving={isSaving}
      />

      {/* Dialog de confirmação ao navegar */}
      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => !open && cancelNavigation()}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />

      {/* Barra colorida no topo do card */}
      <UnsavedChangesBar show={isDirty} />

      <div className="space-y-6">
        {/* Informações da Empresa */}
        <SettingsCard
          icon={Building2}
          title="Informações da Empresa"
          description="Dados principais da imobiliária"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Imobiliária *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Imobiliária Prime"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  onBlur={() => handleBlur("cnpj")}
                  placeholder="00.000.000/0000-00"
                  className={cn(
                    touched.cnpj && !validation.cnpj && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {touched.cnpj && !validation.cnpj && (
                  <div className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    CNPJ inválido (14 dígitos)
                  </div>
                )}
                {touched.cnpj && validation.cnpj && formData.cnpj && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    CNPJ válido
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="creci">CRECI</Label>
                <Input
                  id="creci"
                  value={formData.creci}
                  onChange={(e) => setFormData({ ...formData, creci: e.target.value })}
                  placeholder="Ex: 12345-F"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
              <Input
                id="inscricaoMunicipal"
                value={formData.inscricaoMunicipal}
                onChange={(e) => setFormData({ ...formData, inscricaoMunicipal: e.target.value })}
                placeholder="Ex: 123456789"
              />
            </div>
          </div>
        </SettingsCard>

        {/* Contato */}
        <SettingsCard
          icon={Phone}
          title="Contato"
          description="Telefone e e-mail para contato"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onBlur={() => handleBlur("phone")}
                placeholder="(11) 99999-9999"
                className={cn(
                  touched.phone && !validation.phone && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {touched.phone && !validation.phone && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  Telefone inválido
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => handleBlur("email")}
                placeholder="contato@imobiliaria.com"
                className={cn(
                  touched.email && !validation.email && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {touched.email && !validation.email && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  E-mail inválido
                </div>
              )}
            </div>
          </div>
        </SettingsCard>

        {/* Horário de Funcionamento */}
        <SettingsCard
          icon={Clock}
          title="Horário de Funcionamento"
          description="Defina o horário comercial"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessHoursStart">Abertura</Label>
              <Input
                id="businessHoursStart"
                type="time"
                value={formData.businessHoursStart}
                onChange={(e) => setFormData({ ...formData, businessHoursStart: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessHoursEnd">Fechamento</Label>
              <Input
                id="businessHoursEnd"
                type="time"
                value={formData.businessHoursEnd}
                onChange={(e) => setFormData({ ...formData, businessHoursEnd: e.target.value })}
              />
            </div>
          </div>
        </SettingsCard>

        {/* Botões de ação */}
        <div className="flex items-center justify-end gap-3 pt-4 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 border-t">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={!isDirty || isSaving}
          >
            Descartar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            isLoading={isSaving}
          >
            Salvar alterações
          </Button>
        </div>
      </div>
    </>
  );
}

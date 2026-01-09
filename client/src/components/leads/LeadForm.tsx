import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadFormData } from "@/lib/form-schemas";
import { useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { phoneMask, currencyMask, getErrorMessage } from "@/lib/form-helpers";
import type { Lead } from "@/lib/imobi-context";

// ==================== TYPES ====================

type LeadFormProps = {
  lead?: Lead;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const SOURCES = ["Site", "WhatsApp", "Instagram", "Facebook", "Indicação", "Portal", "Telefone", "Outro"];

// ==================== COMPONENT ====================

export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const isEditing = !!lead;

  // React Hook Form com Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: lead ? {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source as LeadFormData["source"],
      budget: lead.budget || "",
      notes: lead.notes || "",
      preferredType: (lead.preferredType || "") as LeadFormData["preferredType"],
      preferredCategory: (lead.preferredCategory || "") as LeadFormData["preferredCategory"],
      preferredCity: lead.preferredCity || "",
      preferredNeighborhood: lead.preferredNeighborhood || "",
      minBedrooms: lead.minBedrooms ?? undefined,
      maxBedrooms: lead.maxBedrooms ?? undefined,
    } : {
      name: "",
      email: "",
      phone: "",
      source: "Site" as const,
      budget: "",
      notes: "",
      preferredType: "" as const,
      preferredCategory: "" as const,
      preferredCity: "",
      preferredNeighborhood: "",
      minBedrooms: undefined,
      maxBedrooms: undefined,
    },
  });

  // React Query mutations
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

  // Form submission handler
  const onSubmit = async (data: LeadFormData) => {
    try {
      // Convert null to undefined for API compatibility
      const cleanedData = {
        ...data,
        minBedrooms: data.minBedrooms ?? undefined,
        maxBedrooms: data.maxBedrooms ?? undefined,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: lead.id,
          ...cleanedData,
        });
      } else {
        await createMutation.mutateAsync(cleanedData);
      }

      onSuccess?.();
    } catch (error) {
      // Error já é tratado pelos hooks (toast)
      console.error("Form submission error:", error);
    }
  };

  // Watch para aplicar máscaras
  const phoneValue = watch("phone");
  const budgetValue = watch("budget");

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-4">
      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nome <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Nome completo do lead"
          disabled={isSubmitting}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{getErrorMessage(errors.name)}</p>
        )}
      </div>

      {/* Email e Telefone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">
            E-mail <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="email@exemplo.com"
            disabled={isSubmitting}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{getErrorMessage(errors.email)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Telefone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            {...register("phone")}
            placeholder="(11) 98765-4321"
            disabled={isSubmitting}
            className={errors.phone ? "border-destructive" : ""}
            onChange={(e) => {
              const masked = phoneMask(e.target.value);
              setValue("phone", masked);
            }}
            value={phoneValue}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{getErrorMessage(errors.phone)}</p>
          )}
        </div>
      </div>

      {/* Origem e Orçamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">
            Origem <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("source")}
            onValueChange={(value) => setValue("source", value as any)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="source" className={errors.source ? "border-destructive" : ""}>
              <SelectValue placeholder="Selecione a origem" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.source && (
            <p className="text-sm text-destructive">{getErrorMessage(errors.source)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Orçamento</Label>
          <Input
            id="budget"
            {...register("budget")}
            placeholder="R$ 0,00"
            disabled={isSubmitting}
            className={errors.budget ? "border-destructive" : ""}
            onChange={(e) => {
              const masked = currencyMask(e.target.value);
              setValue("budget", masked);
            }}
            value={budgetValue}
          />
          {errors.budget && (
            <p className="text-sm text-destructive">{getErrorMessage(errors.budget)}</p>
          )}
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="Anotações sobre o lead..."
          rows={3}
          disabled={isSubmitting}
          className={errors.notes ? "border-destructive" : ""}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{getErrorMessage(errors.notes)}</p>
        )}
      </div>

      {/* Preferências do Lead */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Preferências do Lead</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="preferredType">Tipo de Imóvel</Label>
            <Select
              value={watch("preferredType") || ""}
              onValueChange={(value) => setValue("preferredType", value as any)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="preferredType">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Não especificado</SelectItem>
                <SelectItem value="house">Casa</SelectItem>
                <SelectItem value="apartment">Apartamento</SelectItem>
                <SelectItem value="commercial">Comercial</SelectItem>
                <SelectItem value="land">Terreno</SelectItem>
                <SelectItem value="farm">Sítio/Fazenda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredCategory">Categoria</Label>
            <Select
              value={watch("preferredCategory") || ""}
              onValueChange={(value) => setValue("preferredCategory", value as any)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="preferredCategory">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Não especificado</SelectItem>
                <SelectItem value="sale">Venda</SelectItem>
                <SelectItem value="rent">Aluguel</SelectItem>
                <SelectItem value="both">Venda ou Aluguel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="preferredCity">Cidade Preferida</Label>
            <Input
              id="preferredCity"
              {...register("preferredCity")}
              placeholder="Ex: São Paulo"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredNeighborhood">Bairro Preferido</Label>
            <Input
              id="preferredNeighborhood"
              {...register("preferredNeighborhood")}
              placeholder="Ex: Jardins"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minBedrooms">Quartos (Mínimo)</Label>
            <Input
              id="minBedrooms"
              type="number"
              {...register("minBedrooms", { valueAsNumber: true })}
              placeholder="0"
              min="0"
              disabled={isSubmitting}
              className={errors.minBedrooms ? "border-destructive" : ""}
            />
            {errors.minBedrooms && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.minBedrooms)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxBedrooms">Quartos (Máximo)</Label>
            <Input
              id="maxBedrooms"
              type="number"
              {...register("maxBedrooms", { valueAsNumber: true })}
              placeholder="0"
              min="0"
              disabled={isSubmitting}
              className={errors.maxBedrooms ? "border-destructive" : ""}
            />
            {errors.maxBedrooms && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.maxBedrooms)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        )}

        <Button type="submit" disabled={isSubmitting || (!isDirty && isEditing)}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Atualizar Lead" : "Criar Lead"}
        </Button>
      </div>
    </form>
  );
}

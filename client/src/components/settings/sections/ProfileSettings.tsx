import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { SettingsCard } from "@/pages/settings/components/SettingsCard";
import { SettingsFormField } from "../SettingsFormField";
import { ProfilePhotoUpload } from "../ProfilePhotoUpload";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-helpers";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  creci: string;
  bio: string;
  avatar?: string;
}

export function ProfileSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<ProfileData>({
    defaultValues: {
      name: "João Silva",
      email: "joao@imobiliaria.com",
      phone: "(11) 99999-9999",
      creci: "CRECI/SP 12345-F",
      bio: "",
      avatar: undefined,
    },
    mode: "onBlur", // Validate on blur for better UX
  });

  const formData = watch();

  const onSubmit = async (data: ProfileData) => {
    setIsSaving(true);
    try {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Atualizar dados no formulário (reset with new values)
      reset(data);

      toast.crud.updated("Perfil");
    } catch (error) {
      toast.errors.operation("salvar as alterações do perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    reset();
    toast.info("Alterações descartadas", "O formulário foi restaurado para o estado anterior.");
  };


  const handleAvatarChange = (url: string) => {
    setValue("avatar", url, { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner - Unsaved Changes */}
      {isDirty && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <p className="text-sm font-medium text-amber-900">
                Você tem alterações não salvas
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDiscard}
                className="text-sm font-medium text-amber-900 hover:text-amber-700 underline"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsCard
        title="Informações Pessoais"
        description="Gerencie seus dados pessoais e informações de perfil"
        onSave={handleSubmit(onSubmit)}
        isSaving={isSaving}
        hasUnsavedChanges={isDirty}
      >
        {/* Avatar Upload - 120x120px circular usando componente */}
        <div className="flex flex-col items-center pb-6 border-b">
          <ProfilePhotoUpload
            photoUrl={formData.avatar}
            userName={formData.name}
            onPhotoChange={handleAvatarChange}
            isUploading={isUploadingAvatar}
            onUploadStart={() => setIsUploadingAvatar(true)}
            onUploadEnd={() => setIsUploadingAvatar(false)}
          />
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Clique na imagem ou no botão para fazer upload. JPG ou PNG, máx. 2MB.
          </p>
        </div>

        {/* Form Fields - Grid 2 colunas com labels * para obrigatório */}
        <div className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", {
                  required: "Nome é obrigatório",
                  minLength: {
                    value: 3,
                    message: "Nome deve ter pelo menos 3 caracteres",
                  },
                  pattern: {
                    value: /^[a-zA-ZÀ-ÿ\s]+$/,
                    message: "Nome deve conter apenas letras",
                  },
                })}
                placeholder="Seu nome completo"
                className={cn(
                  "h-11",
                  errors.name && "border-destructive focus-visible:ring-destructive"
                )}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                E-mail <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email", {
                  required: "E-mail é obrigatório",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "E-mail inválido",
                  },
                  validate: {
                    notAdmin: (value) =>
                      value !== "admin@imobibase.com" || "Este e-mail já está em uso",
                  },
                })}
                placeholder="seu@email.com"
                className={cn(
                  "h-11",
                  errors.email && "border-destructive focus-visible:ring-destructive"
                )}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : "email-helper"}
              />
              {errors.email ? (
                <p id="email-error" className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              ) : (
                <p id="email-helper" className="text-xs text-muted-foreground">
                  Usado para login e notificações importantes
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone", {
                  pattern: {
                    value: /^(\(?\d{2}\)?\s?)?(\d{4,5}[-\s]?\d{4})$/,
                    message: "Telefone inválido. Use formato: (11) 99999-9999",
                  },
                  minLength: {
                    value: 10,
                    message: "Telefone deve ter pelo menos 10 dígitos",
                  },
                })}
                placeholder="(11) 99999-9999"
                className={cn(
                  "h-11",
                  errors.phone && "border-destructive focus-visible:ring-destructive"
                )}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : "phone-helper"}
              />
              {errors.phone ? (
                <p id="phone-error" className="text-sm text-destructive mt-1">
                  {errors.phone.message}
                </p>
              ) : (
                <p id="phone-helper" className="text-xs text-muted-foreground">
                  Telefone para contato com clientes
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="creci">CRECI</Label>
              <Input
                id="creci"
                {...register("creci", {
                  minLength: {
                    value: 5,
                    message: "CRECI deve ter pelo menos 5 caracteres",
                  },
                  pattern: {
                    value: /^CRECI\/[A-Z]{2}\s?\d{4,6}[-]?[A-Z]?$/i,
                    message: "Formato inválido. Use: CRECI/UF 12345-F",
                  },
                })}
                placeholder="CRECI/UF 12345-F"
                className={cn(
                  "h-11",
                  errors.creci && "border-destructive focus-visible:ring-destructive"
                )}
                aria-invalid={!!errors.creci}
                aria-describedby={errors.creci ? "creci-error" : "creci-helper"}
              />
              {errors.creci ? (
                <p id="creci-error" className="text-sm text-destructive mt-1">
                  {errors.creci.message}
                </p>
              ) : (
                <p id="creci-helper" className="text-xs text-muted-foreground">
                  Registro profissional de corretor de imóveis
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografia</Label>
            <textarea
              id="bio"
              {...register("bio", {
                maxLength: {
                  value: 500,
                  message: "Biografia deve ter no máximo 500 caracteres",
                },
              })}
              placeholder="Conte um pouco sobre você e sua experiência no mercado imobiliário..."
              maxLength={500}
              rows={4}
              className={cn(
                "w-full min-h-[100px] px-3 py-2 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                errors.bio && "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={!!errors.bio}
              aria-describedby={errors.bio ? "bio-error" : "bio-helper"}
            />
            {errors.bio ? (
              <p id="bio-error" className="text-sm text-destructive mt-1">
                {errors.bio.message}
              </p>
            ) : (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Será exibida no seu perfil público</span>
                <span>{formData.bio?.length || 0}/500</span>
              </div>
            )}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

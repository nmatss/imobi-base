import React, { useState } from "react";
import { SettingsCard } from "@/pages/settings/components/SettingsCard";
import { SettingsFormField } from "../SettingsFormField";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Upload, Image as ImageIcon, Loader2, Facebook, Instagram, Linkedin, Youtube, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyData {
  name: string;
  logo?: string;
  website: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
}

export function CompanySettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [initialData, setInitialData] = useState<CompanyData>({
    name: "Imobiliária Exemplo",
    logo: undefined,
    website: "https://www.exemplo.com.br",
    description: "",
    address: "Rua Exemplo, 123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567",
    phone: "(11) 3333-4444",
    email: "contato@exemplo.com.br",
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
  });
  const [formData, setFormData] = useState<CompanyData>(initialData);

  // Detectar mudanças no formulário
  React.useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
    setIsDirty(hasChanges);
  }, [formData, initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Atualizar dados iniciais após salvar
      setInitialData(formData);
      setIsDirty(false);

      toast({
        title: "Dados da empresa atualizados",
        description: "As informações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormData(initialData);
    setIsDirty(false);
    toast({
      title: "Alterações descartadas",
      description: "O formulário foi restaurado para o estado anterior.",
    });
  };

  const validateWebsite = (url: string): string | null => {
    if (!url) return null;

    try {
      new URL(url);
      return null;
    } catch {
      return "URL inválida. Use o formato: https://www.exemplo.com.br";
    }
  };

  const validateSocialUrl = (url: string, platform: string): string | null => {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      const platformDomains: Record<string, string[]> = {
        facebook: ["facebook.com", "fb.com"],
        instagram: ["instagram.com"],
        linkedin: ["linkedin.com"],
        youtube: ["youtube.com", "youtu.be"],
      };

      const validDomains = platformDomains[platform.toLowerCase()] || [];
      const isValid = validDomains.some((domain) => hostname.includes(domain));

      if (!isValid) {
        return `URL deve ser do ${platform}`;
      }

      return null;
    } catch {
      return "URL inválida";
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máx 1MB)
    if (file.size > 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 1MB.",
        variant: "destructive",
      });
      return;
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Simular upload
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({
          ...prev,
          logo: reader.result as string,
        }));

        toast({
          title: "Logo atualizado",
          description: "O logo da empresa foi atualizado com sucesso.",
        });
      };
      reader.readAsDataURL(file);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do logo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
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
        title="Informações da Empresa"
        description="Dados públicos da sua imobiliária"
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={isDirty}
      >
        {/* Logo Upload com Preview Real-time */}
        <div className="space-y-4 pb-6 border-b">
          <Label>Logo da Empresa</Label>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="relative group">
              <div
                className={cn(
                  "h-32 w-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden transition-all",
                  formData.logo && "border-solid border-primary/50 shadow-sm",
                  "group-hover:border-primary/50"
                )}
              >
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt="Logo da empresa"
                    className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50 transition-all group-hover:text-primary/50 group-hover:scale-110" />
                )}
              </div>

              {isUploadingLogo && (
                <div className="absolute inset-0 bg-background/90 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Enviando...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                Recomendado: PNG ou SVG com fundo transparente, até 1MB
              </p>
              <div className="flex gap-2">
                <label htmlFor="logo-upload">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isUploadingLogo}
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                      {isUploadingLogo ? "Enviando..." : "Fazer Upload"}
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                      />
                    </span>
                  </Button>
                </label>
                {formData.logo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, logo: undefined }))}
                    disabled={isUploadingLogo}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-medium">Informações Básicas</span>
          </div>

          <SettingsFormField
            label="Nome da Empresa"
            name="company-name"
            value={formData.name}
            onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
            placeholder="Nome da sua imobiliária"
            required
          />

          <SettingsFormField
            label="Website"
            name="website"
            type="url"
            value={formData.website}
            onChange={(value) => setFormData((prev) => ({ ...prev, website: value }))}
            validate={validateWebsite}
            placeholder="https://www.suaimobiliaria.com.br"
            helperText="Site oficial da sua imobiliária"
          />

          <SettingsFormField
            label="Descrição"
            name="description"
            type="textarea"
            value={formData.description}
            onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
            placeholder="Conte sobre sua imobiliária, anos de mercado, diferenciais..."
            helperText="Será exibida no site público e portais"
            maxLength={500}
            rows={4}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingsFormField
              label="Telefone"
              name="company-phone"
              type="tel"
              value={formData.phone}
              onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
              placeholder="(11) 3333-4444"
            />

            <SettingsFormField
              label="E-mail"
              name="company-email"
              type="email"
              value={formData.email}
              onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
              placeholder="contato@imobiliaria.com.br"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4 pt-6 border-t">
          <h4 className="font-medium">Endereço</h4>

          <SettingsFormField
            label="Logradouro"
            name="address"
            value={formData.address}
            onChange={(value) => setFormData((prev) => ({ ...prev, address: value }))}
            placeholder="Rua, Avenida, número, complemento"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SettingsFormField
              label="Cidade"
              name="city"
              value={formData.city}
              onChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
              placeholder="São Paulo"
            />

            <SettingsFormField
              label="Estado"
              name="state"
              value={formData.state}
              onChange={(value) => setFormData((prev) => ({ ...prev, state: value }))}
              placeholder="SP"
              maxLength={2}
            />

            <SettingsFormField
              label="CEP"
              name="zipCode"
              value={formData.zipCode}
              onChange={(value) => setFormData((prev) => ({ ...prev, zipCode: value }))}
              placeholder="01234-567"
            />
          </div>
        </div>

        {/* Social Media */}
        <div className="space-y-4 pt-6 border-t">
          <h4 className="font-medium">Redes Sociais</h4>
          <p className="text-sm text-muted-foreground">
            Links para suas redes sociais (serão exibidos no site público)
          </p>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                Facebook
              </Label>
              <SettingsFormField
                label=""
                name="facebook"
                type="url"
                value={formData.facebookUrl}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, facebookUrl: value }))
                }
                validate={(value) => validateSocialUrl(value, "Facebook")}
                placeholder="https://www.facebook.com/suaimobiliaria"
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-600" />
                Instagram
              </Label>
              <SettingsFormField
                label=""
                name="instagram"
                type="url"
                value={formData.instagramUrl}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, instagramUrl: value }))
                }
                validate={(value) => validateSocialUrl(value, "Instagram")}
                placeholder="https://www.instagram.com/suaimobiliaria"
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-blue-700" />
                LinkedIn
              </Label>
              <SettingsFormField
                label=""
                name="linkedin"
                type="url"
                value={formData.linkedinUrl}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, linkedinUrl: value }))
                }
                validate={(value) => validateSocialUrl(value, "LinkedIn")}
                placeholder="https://www.linkedin.com/company/suaimobiliaria"
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-600" />
                YouTube
              </Label>
              <SettingsFormField
                label=""
                name="youtube"
                type="url"
                value={formData.youtubeUrl}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, youtubeUrl: value }))
                }
                validate={(value) => validateSocialUrl(value, "YouTube")}
                placeholder="https://www.youtube.com/@suaimobiliaria"
              />
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

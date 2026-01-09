import React, { useState, useEffect } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  Upload,
  Globe,
  Eye,
  ExternalLink,
  Palette,
  Share2,
  Type,
  Image,
  Smartphone,
  Monitor,
  Rocket,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { BrandSettings } from "../types";

interface BrandTabProps {
  initialData: Partial<BrandSettings>;
  onSave: (data: Partial<BrandSettings>) => Promise<void>;
}

export function BrandTab({ initialData, onSave }: BrandTabProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<BrandSettings>>({
    logoUrl: initialData.logoUrl || "",
    primaryColor: initialData.primaryColor || "#0066cc",
    secondaryColor: initialData.secondaryColor || "#333333",
    faviconUrl: initialData.faviconUrl || "",
    customDomain: initialData.customDomain || "",
    subdomain: initialData.subdomain || "",
    facebookUrl: initialData.facebookUrl || "",
    instagramUrl: initialData.instagramUrl || "",
    linkedinUrl: initialData.linkedinUrl || "",
    youtubeUrl: initialData.youtubeUrl || "",
    footerText: initialData.footerText || "",
  });

  useEffect(() => {
    setFormData({
      logoUrl: initialData.logoUrl || "",
      primaryColor: initialData.primaryColor || "#0066cc",
      secondaryColor: initialData.secondaryColor || "#333333",
      faviconUrl: initialData.faviconUrl || "",
      customDomain: initialData.customDomain || "",
      subdomain: initialData.subdomain || "",
      facebookUrl: initialData.facebookUrl || "",
      instagramUrl: initialData.instagramUrl || "",
      linkedinUrl: initialData.linkedinUrl || "",
      youtubeUrl: initialData.youtubeUrl || "",
      footerText: initialData.footerText || "",
    });
    setHasUnsavedChanges(false);
  }, [initialData]);

  const handleChange = (field: keyof BrandSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setHasUnsavedChanges(false);
      toast({
        title: "Configurações salvas",
        description: "As configurações de marca foram atualizadas com sucesso.",
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

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onSave(formData);
      // Simulate publishing process
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHasUnsavedChanges(false);
      toast({
        title: "Site publicado",
        description: "Suas alterações estão agora visíveis no site público.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível publicar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePreview = () => {
    window.open(`/e/${formData.subdomain}`, "_blank");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem válida (PNG, JPG ou SVG).",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Simular upload (em produção, fazer upload real para servidor)
      const reader = new FileReader();
      reader.onload = () => {
        handleChange("logoUrl", reader.result as string);
        toast({
          title: "Logo atualizado",
          description: "O logo foi carregado com sucesso. Não esqueça de salvar as alterações.",
        });
      };
      reader.readAsDataURL(file);

      // Simular delay de upload
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

  // Preview component
  const SitePreview = () => (
    <div
      className={`bg-white rounded-lg border shadow-sm overflow-hidden transition-all ${
        previewMode === "mobile" ? "max-w-[320px] mx-auto" : "w-full"
      }`}
    >
      {/* Preview header */}
      <div
        className="h-12 flex items-center px-4 gap-3"
        style={{ backgroundColor: formData.primaryColor }}
      >
        {formData.logoUrl ? (
          <img
            src={formData.logoUrl}
            alt="Logo"
            className="h-8 w-8 object-contain rounded bg-white/10"
          />
        ) : (
          <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center">
            <Building className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="text-white font-medium text-sm truncate">
          {formData.subdomain || "minha-imobiliaria"}
        </span>
      </div>

      {/* Preview content */}
      <div className="p-4 space-y-3">
        <div className="h-24 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-xs text-gray-400">Banner</span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-16 bg-gray-100 rounded" />
          <div className="flex-1 h-16 bg-gray-100 rounded" />
          {previewMode === "desktop" && (
            <>
              <div className="flex-1 h-16 bg-gray-100 rounded" />
              <div className="flex-1 h-16 bg-gray-100 rounded" />
            </>
          )}
        </div>
      </div>

      {/* Preview footer */}
      <div
        className="px-4 py-3 text-xs"
        style={{ backgroundColor: formData.secondaryColor, color: "white" }}
      >
        {formData.footerText || "© 2025 Sua Imobiliária. Todos os direitos reservados."}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Preview Card - Only on larger screens */}
      <Card className="hidden lg:block border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Pré-visualização</span>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  Alterações não salvas
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`p-2 ${
                    previewMode === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`p-2 ${
                    previewMode === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={!formData.subdomain}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Site
              </Button>
            </div>
          </div>
          <SitePreview />
        </CardContent>
      </Card>

      {/* Logo and Identity */}
      <SettingsCard
        title="Identidade Visual"
        description="Personalize como sua imobiliária aparece no sistema e no site público."
        onSave={handleSave}
        isSaving={isSaving}
      >
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-5 h-5 text-primary" />
          <span className="font-medium">Logo</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="relative">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 shrink-0"
              style={{ borderColor: formData.primaryColor }}
            >
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <Building className="w-8 h-8 opacity-20" />
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
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap gap-2">
              <label htmlFor="logo-upload" className="cursor-pointer">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploadingLogo}
                  asChild
                >
                  <span>
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Fazer Upload
                      </>
                    )}
                  </span>
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  aria-label="Upload logo da empresa"
                />
              </label>
              {formData.logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleChange("logoUrl", "")}
                  disabled={isUploadingLogo}
                >
                  Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendado: 400x400px, PNG ou JPG com fundo transparente, máx. 2MB.
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <span className="font-medium">Cores</span>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cor Primária</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                className="w-14 h-11 rounded-md border shadow-sm cursor-pointer p-1"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                className="font-mono h-11 flex-1"
                placeholder="#0066cc"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Usado no cabeçalho, botões e links
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cor Secundária</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                className="w-14 h-11 rounded-md border shadow-sm cursor-pointer p-1"
              />
              <Input
                value={formData.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                className="font-mono h-11 flex-1"
                placeholder="#333333"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Usado no rodapé e elementos secundários
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-medium">Domínio</span>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Subdomínio do Portal</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="bg-muted px-3 py-2 rounded-md text-sm text-muted-foreground border whitespace-nowrap">
                /e/
              </div>
              <Input
                value={formData.subdomain}
                onChange={(e) =>
                  handleChange(
                    "subdomain",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                className="sm:max-w-[200px] h-10"
                placeholder="minha-imobiliaria"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreview}
                disabled={!formData.subdomain}
                className="shrink-0"
              >
                <Globe className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Seu site ficará disponível em: /e/{formData.subdomain || "seu-subdominio"}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Domínio Personalizado</Label>
            <Input
              value={formData.customDomain}
              onChange={(e) => handleChange("customDomain", e.target.value)}
              placeholder="www.minhaimobiliaria.com.br"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Configure seu DNS para apontar para nosso servidor (CNAME: portal.imobibase.com)
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-primary" />
          <span className="font-medium">Redes Sociais</span>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Facebook</Label>
            <Input
              value={formData.facebookUrl}
              onChange={(e) => handleChange("facebookUrl", e.target.value)}
              placeholder="https://facebook.com/sua-pagina"
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Instagram</Label>
            <Input
              value={formData.instagramUrl}
              onChange={(e) => handleChange("instagramUrl", e.target.value)}
              placeholder="https://instagram.com/seu-perfil"
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium">LinkedIn</Label>
            <Input
              value={formData.linkedinUrl}
              onChange={(e) => handleChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/company/sua-empresa"
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium">YouTube</Label>
            <Input
              value={formData.youtubeUrl}
              onChange={(e) => handleChange("youtubeUrl", e.target.value)}
              placeholder="https://youtube.com/@seu-canal"
              className="h-11"
            />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-primary" />
          <span className="font-medium">Rodapé</span>
        </div>

        <div className="grid gap-2">
          <Label>Texto do Rodapé</Label>
          <Textarea
            value={formData.footerText}
            onChange={(e) => handleChange("footerText", e.target.value)}
            placeholder="© 2025 Sua Imobiliária. CRECI/SP 12345. Todos os direitos reservados."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Este texto aparecerá no rodapé do seu site público
          </p>
        </div>
      </SettingsCard>

      {/* Publish Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10 shrink-0">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium sm:font-semibold text-base">Publicar Alterações</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {hasUnsavedChanges
                    ? "Você tem alterações não publicadas"
                    : "Seu site está atualizado"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!formData.subdomain}
                className="flex-1 sm:flex-none h-11 sm:h-10"
              >
                <Eye className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Visualizar</span>
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || !hasUnsavedChanges}
                className="flex-1 sm:flex-none h-11 sm:h-10"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Publicando...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 sm:mr-2" />
                    <span>Publicar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

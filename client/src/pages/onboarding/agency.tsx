import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { SeoHead } from "@/components/seo/SeoHead";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Onboarding pós-SSO: o usuário acabou de entrar com Google/Microsoft e uma
 * imobiliária provisória foi criada. Aqui ele confirma o nome e o identificador
 * (slug) público da imobiliária antes de seguir para o painel.
 */
export default function AgencyOnboardingPage() {
  const { user, tenant, loading } = useImobi();
  const [, setLocation] = useLocation();

  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Guards de acesso.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    // Onboarding já concluído → vai direto ao painel.
    if (tenant && (tenant as { onboardingCompleted?: boolean }).onboardingCompleted) {
      setLocation("/dashboard");
    }
  }, [loading, user, tenant, setLocation]);

  // Pré-preenche a partir do tenant provisório / nome do usuário.
  useEffect(() => {
    if (!tenant) return;
    const defaultName =
      tenant.name && !/^Imobiliária\s|^Minha Imobiliária$/i.test(tenant.name)
        ? tenant.name
        : user?.name
          ? `Imobiliária ${user.name.split(" ")[0]}`
          : tenant.name || "";
    setCompanyName((prev) => prev || defaultName);
    setSlug((prev) => prev || tenant.slug || "");
  }, [tenant, user]);

  const effectiveSlug = useMemo(
    () => (slugTouched ? slug : slugify(companyName || slug)),
    [slugTouched, slug, companyName],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const finalSlug = slugify(effectiveSlug);
    if (companyName.trim().length < 2) {
      setError("Informe o nome da imobiliária.");
      return;
    }
    if (finalSlug.length < 3) {
      setError("O identificador deve ter pelo menos 3 caracteres.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiRequest("POST", "/api/auth/complete-onboarding", {
        companyName: companyName.trim(),
        slug: finalSlug,
        phone: phone.trim() || undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Não foi possível concluir o cadastro.");
      }
      // Recarrega para atualizar tenant/CSRF a partir de /api/auth/me.
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao concluir cadastro.");
      setIsSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <SeoHead
        title="Configurar imobiliária | ImobiBase"
        description="Finalize a configuração da sua imobiliária no ImobiBase."
        path="/onboarding/agency"
        noindex
      />
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo wordmarkClassName="text-xl" iconClassName="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">Vamos configurar sua imobiliária</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Olá{user.name ? `, ${user.name.split(" ")[0]}` : ""}! Confirme os dados da sua
              imobiliária para finalizar o cadastro.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-medium">Nome da imobiliária</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex.: Imobiliária Horizonte"
              required
              className="h-12"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-medium">Identificador público (slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">imobibase.com/e/</span>
              <Input
                id="slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="horizonte"
                required
                className="h-12"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Usado no endereço do seu site público. Apenas letras, números e hífens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Telefone (opcional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="h-12"
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Concluir e acessar o painel"}
          </Button>
        </form>
      </div>
    </div>
  );
}

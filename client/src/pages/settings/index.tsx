import { useState } from "react";
import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building, Globe, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { tenant } = useImobi();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant?.name || "",
    email: tenant?.email || "",
    phone: tenant?.phone || "",
    address: tenant?.address || "",
    primaryColor: tenant?.primaryColor || "#0066cc",
    secondaryColor: tenant?.secondaryColor || "#333333",
    slug: tenant?.slug || "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: "Configurações salvas",
        description: "As alterações foram aplicadas com sucesso.",
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Gerencie os dados da sua imobiliária</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="branding">Marca & Site</TabsTrigger>
          <TabsTrigger value="billing">Planos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Dados da Empresa</CardTitle>
              <CardDescription>
                Informações básicas da sua imobiliária.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Imobiliária</Label>
                <Input 
                  id="name" 
                  data-testid="input-tenant-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    data-testid="input-tenant-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail de Contato</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    data-testid="input-tenant-email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Endereço</Label>
                <Input 
                  id="address" 
                  data-testid="input-tenant-address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, número - Bairro, Cidade/UF"
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave} disabled={isSaving} className="ml-auto gap-2" data-testid="button-save-settings">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Identidade Visual</CardTitle>
              <CardDescription>
                Personalize como sua imobiliária aparece no sistema e no site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 shrink-0"
                  style={{ borderColor: formData.primaryColor }}
                >
                  {tenant?.logo ? (
                    <img src={tenant.logo} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <Building className="w-8 h-8 opacity-20" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Fazer Upload</Button>
                    <Button variant="ghost" size="sm" className="text-destructive">Remover</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Recomendado: 400x400px, PNG ou JPG.</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-10 h-10 rounded-md border shadow-sm cursor-pointer"
                    />
                    <Input 
                      value={formData.primaryColor} 
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="font-mono"
                      data-testid="input-primary-color"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-10 h-10 rounded-md border shadow-sm cursor-pointer"
                    />
                    <Input 
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="font-mono"
                      data-testid="input-secondary-color"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço do Site Público</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="bg-muted px-3 py-2 rounded-md text-sm text-muted-foreground border whitespace-nowrap">
                    /e/
                  </div>
                  <Input 
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="max-w-[200px]"
                    data-testid="input-tenant-slug"
                  />
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/e/${tenant?.slug}`} target="_blank">
                      <Globe className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave} disabled={isSaving} className="ml-auto gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Plano Atual</CardTitle>
              <CardDescription>Gerencie sua assinatura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20 gap-3">
                <div>
                  <h3 className="font-bold text-lg text-primary">Plano Profissional</h3>
                  <p className="text-sm text-muted-foreground">Até 10 usuários • 2.000 imóveis</p>
                </div>
                <Badge className="bg-primary text-primary-foreground hover:bg-primary">Ativo</Badge>
              </div>
              
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span>Próxima cobrança</span>
                  <span className="font-medium">13/01/2026</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Valor</span>
                  <span className="font-medium">R$ 109,90/mês</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex flex-col sm:flex-row justify-between gap-2">
              <Button variant="link" className="text-muted-foreground px-0">Cancelar assinatura</Button>
              <Button variant="outline">Alterar Plano</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

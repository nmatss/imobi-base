import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building, Globe, Palette, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { tenant } = useImobi();
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "As alterações foram aplicadas com sucesso.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie os dados da sua imobiliária</p>
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
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Informações básicas da sua imobiliária.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Imobiliária</Label>
                <Input id="name" defaultValue={tenant?.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="creci">CRECI</Label>
                  <Input id="creci" placeholder="J-12345" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail de Contato</Label>
                <Input id="email" type="email" defaultValue={`contato@${tenant?.slug}.com.br`} />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave} className="ml-auto gap-2">
                <Save className="w-4 h-4" /> Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>
                Personalize como sua imobiliária aparece no sistema e no site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div 
                  className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50"
                  style={{ borderColor: tenant?.colors.primary }}
                >
                  <Building className="w-8 h-8 opacity-20" />
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
                    <div 
                      className="w-10 h-10 rounded-md border shadow-sm"
                      style={{ backgroundColor: tenant?.colors.primary }}
                    />
                    <Input defaultValue={tenant?.colors.primary} className="font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2">
                    <div 
                      className="w-10 h-10 rounded-md border shadow-sm"
                      style={{ backgroundColor: tenant?.colors.secondary }}
                    />
                    <Input defaultValue={tenant?.colors.secondary} className="font-mono" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço do Site Público</Label>
                <div className="flex items-center gap-2">
                  <div className="bg-muted px-3 py-2 rounded-md text-sm text-muted-foreground border">
                    imobibase.com.br/e/
                  </div>
                  <Input defaultValue={tenant?.slug} className="max-w-[200px]" />
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/e/${tenant?.slug}`} target="_blank">
                      <Globe className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave} className="ml-auto gap-2">
                <Save className="w-4 h-4" /> Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>Gerencie sua assinatura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
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
            <CardFooter className="border-t px-6 py-4 flex justify-between">
              <Button variant="link" className="text-muted-foreground px-0">Cancelar assinatura</Button>
              <Button variant="outline">Alterar Plano</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

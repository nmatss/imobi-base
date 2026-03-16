import React, { useState } from "react";
import { useLocation } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Palette,
  Home,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
  Sparkles,
  Phone,
  MapPin,
  Bed,
  Bath,
  Ruler,
  DollarSign,
  Users,
  BarChart3,
  Globe,
  MessageSquare,
  Brain,
  Shield,
  Headphones,
  ExternalLink,
  Settings,
  UserPlus,
} from "lucide-react";

const TOTAL_STEPS = 5;

type PropertyFormData = {
  title: string;
  type: string;
  category: string;
  price: string;
  address: string;
  city: string;
  state: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
};

type BrandFormData = {
  primaryColor: string;
  phone: string;
  address: string;
};

export default function OnboardingPage() {
  const { user, tenant } = useImobi();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [brandData, setBrandData] = useState<BrandFormData>({
    primaryColor: tenant?.primaryColor || "#0066cc",
    phone: tenant?.phone || "",
    address: tenant?.address || "",
  });
  const [propertyData, setPropertyData] = useState<PropertyFormData>({
    title: "",
    type: "apartment",
    category: "sale",
    price: "",
    address: "",
    city: "",
    state: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant?.logo || null);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveBrand = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/settings/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor: brandData.primaryColor,
          phone: brandData.phone,
          address: brandData.address,
        }),
        credentials: "include",
      });
    } catch {
      // silently continue
    } finally {
      setIsSaving(false);
    }
    goNext();
  };

  const handleCreateProperty = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: propertyData.title,
          type: propertyData.type,
          category: propertyData.category,
          price: propertyData.price,
          address: propertyData.address,
          city: propertyData.city,
          state: propertyData.state,
          bedrooms: propertyData.bedrooms ? parseInt(propertyData.bedrooms) : null,
          bathrooms: propertyData.bathrooms ? parseInt(propertyData.bathrooms) : null,
          area: propertyData.area ? parseInt(propertyData.area) : null,
          status: "active",
        }),
        credentials: "include",
      });
    } catch {
      // silently continue
    } finally {
      setIsSaving(false);
    }
    goNext();
  };

  const handleFinish = () => {
    setLocation("/dashboard");
  };

  // --- Step Components ---

  const StepWelcome = () => (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white mb-8 shadow-xl shadow-primary/25">
        <Building2 className="w-10 h-10" />
      </div>
      <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
        Bem-vindo ao ImobiBase{tenant?.name ? `, ${tenant.name}` : ""}!
      </h1>
      <p className="text-lg text-muted-foreground max-w-lg mb-2">
        Estamos felizes em ter voce aqui. Em poucos minutos, vamos configurar
        tudo para voce comecar a gerenciar sua imobiliaria.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full max-w-2xl">
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border">
          <Home className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium">Cadastre imoveis</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border">
          <Users className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium">Gerencie leads</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border">
          <BarChart3 className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium">Acompanhe resultados</span>
        </div>
      </div>
      <Button size="lg" className="mt-10 h-14 px-10 text-lg rounded-full shadow-lg shadow-primary/20" onClick={goNext}>
        Comecar <ArrowRight className="ml-2 w-5 h-5" />
      </Button>
    </div>
  );

  const StepBrand = () => (
    <div className="py-6 px-4 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold">Personalizacao</h2>
          <p className="text-sm text-muted-foreground">Deixe o ImobiBase com a cara da sua imobiliaria.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Logo upload */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Logo da empresa</Label>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/50 shrink-0 overflow-hidden"
              style={{ borderColor: brandData.primaryColor }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="onboarding-logo-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Fazer Upload
                  </span>
                </Button>
                <input
                  id="onboarding-logo-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoChange}
                />
              </label>
              <p className="text-xs text-muted-foreground">PNG ou JPG, max. 2MB</p>
            </div>
          </div>
        </div>

        {/* Primary Color */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Cor primaria</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={brandData.primaryColor}
              onChange={(e) => setBrandData((d) => ({ ...d, primaryColor: e.target.value }))}
              className="w-14 h-11 rounded-md border shadow-sm cursor-pointer p-1"
            />
            <Input
              value={brandData.primaryColor}
              onChange={(e) => setBrandData((d) => ({ ...d, primaryColor: e.target.value }))}
              className="font-mono h-11 flex-1"
              placeholder="#0066cc"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Telefone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={brandData.phone}
              onChange={(e) => setBrandData((d) => ({ ...d, phone: e.target.value }))}
              className="h-11 pl-10"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Endereco</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={brandData.address}
              onChange={(e) => setBrandData((d) => ({ ...d, address: e.target.value }))}
              className="h-11 pl-10"
              placeholder="Rua Exemplo, 123 - Centro, Sao Paulo"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={goBack} className="h-11">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button onClick={handleSaveBrand} className="flex-1 h-11" isLoading={isSaving}>
          Salvar e Continuar <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const StepProperty = () => (
    <div className="py-6 px-4 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
          <Home className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold">Primeiro Imovel</h2>
          <p className="text-sm text-muted-foreground">Cadastre seu primeiro imovel para comecar.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Titulo</Label>
          <Input
            value={propertyData.title}
            onChange={(e) => setPropertyData((d) => ({ ...d, title: e.target.value }))}
            className="h-11"
            placeholder="Apartamento 3 quartos no Centro"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select
              value={propertyData.type}
              onChange={(e) => setPropertyData((d) => ({ ...d, type: e.target.value }))}
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="apartment">Apartamento</option>
              <option value="house">Casa</option>
              <option value="commercial">Comercial</option>
              <option value="land">Terreno</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <select
              value={propertyData.category}
              onChange={(e) => setPropertyData((d) => ({ ...d, category: e.target.value }))}
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="sale">Venda</option>
              <option value="rent">Aluguel</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Preco (R$)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={propertyData.price}
              onChange={(e) => setPropertyData((d) => ({ ...d, price: e.target.value }))}
              className="h-11 pl-10"
              placeholder="450.000"
              type="text"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Endereco</Label>
          <Input
            value={propertyData.address}
            onChange={(e) => setPropertyData((d) => ({ ...d, address: e.target.value }))}
            className="h-11"
            placeholder="Rua Exemplo, 123"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={propertyData.city}
              onChange={(e) => setPropertyData((d) => ({ ...d, city: e.target.value }))}
              className="h-11"
              placeholder="Sao Paulo"
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input
              value={propertyData.state}
              onChange={(e) => setPropertyData((d) => ({ ...d, state: e.target.value }))}
              className="h-11"
              placeholder="SP"
              maxLength={2}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Bed className="w-3 h-3" /> Quartos</Label>
            <Input
              value={propertyData.bedrooms}
              onChange={(e) => setPropertyData((d) => ({ ...d, bedrooms: e.target.value }))}
              className="h-11"
              type="number"
              placeholder="3"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Bath className="w-3 h-3" /> Banheiros</Label>
            <Input
              value={propertyData.bathrooms}
              onChange={(e) => setPropertyData((d) => ({ ...d, bathrooms: e.target.value }))}
              className="h-11"
              type="number"
              placeholder="2"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Ruler className="w-3 h-3" /> Area (m2)</Label>
            <Input
              value={propertyData.area}
              onChange={(e) => setPropertyData((d) => ({ ...d, area: e.target.value }))}
              className="h-11"
              type="number"
              placeholder="120"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={goBack} className="h-11">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button variant="ghost" onClick={goNext} className="h-11">
          Pular
        </Button>
        <Button
          onClick={handleCreateProperty}
          className="flex-1 h-11"
          isLoading={isSaving}
          disabled={!propertyData.title}
        >
          Cadastrar <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const StepPlan = () => {
    const plans = [
      {
        id: "free",
        name: "Gratis",
        price: "R$ 0",
        period: "/mes",
        description: "Para comecar sua jornada digital.",
        features: ["Ate 10 imoveis", "Ate 50 leads", "1 usuario", "Site publico basico"],
        cta: "Comecar gratis",
        variant: "outline" as const,
      },
      {
        id: "basico",
        name: "Basico",
        price: "R$ 99",
        period: "/mes",
        description: "Para quem quer crescer com eficiencia.",
        features: [
          "Ate 100 imoveis",
          "Leads ilimitados",
          "5 usuarios",
          "Integracao WhatsApp",
          "Relatorios basicos",
        ],
        cta: "Assinar Basico",
        variant: "outline" as const,
        popular: false,
      },
      {
        id: "pro",
        name: "Profissional",
        price: "R$ 199",
        period: "/mes",
        description: "Para quem quer escalar vendas.",
        features: [
          "Imoveis ilimitados",
          "Leads ilimitados",
          "Usuarios ilimitados",
          "Todas as integracoes",
          "IA (Marketing, AVM, ISA)",
          "Portal do cliente",
          "Vistorias digitais",
        ],
        cta: "Assinar Pro",
        variant: "default" as const,
        popular: true,
      },
    ];

    return (
      <div className="py-6 px-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold">Escolha seu Plano</h2>
            <p className="text-sm text-muted-foreground">Voce pode mudar de plano a qualquer momento.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                selectedPlan === plan.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-primary/50"
              } ${plan.popular ? "md:scale-105 md:z-10 shadow-xl" : ""}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm">Recomendado</Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className={`text-lg ${plan.popular ? "text-primary" : ""}`}>{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={selectedPlan === plan.id ? "default" : plan.variant}
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan.id);
                  }}
                >
                  {selectedPlan === plan.id ? (
                    <>
                      <Check className="w-4 h-4 mr-1" /> Selecionado
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={goBack} className="h-11">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button onClick={goNext} className="flex-1 h-11">
            {selectedPlan === "free" ? "Comecar gratis" : "Continuar"} <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          <a href="/pricing" className="text-primary hover:underline">
            Ver detalhes completos dos planos
          </a>
        </p>
      </div>
    );
  };

  const StepDone = () => (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-8 relative">
        <Check className="w-10 h-10 text-green-600" />
        <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20" />
      </div>
      <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">Tudo pronto!</h1>
      <p className="text-lg text-muted-foreground max-w-lg mb-8">
        Sua imobiliaria esta configurada e pronta para uso. Comece a explorar o painel agora.
      </p>

      <Button
        size="lg"
        className="h-14 px-10 text-lg rounded-full shadow-lg shadow-primary/20 mb-8"
        onClick={handleFinish}
      >
        Ir para o Dashboard <ArrowRight className="ml-2 w-5 h-5" />
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <button
          onClick={() => setLocation("/properties")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border hover:bg-muted transition-colors cursor-pointer"
        >
          <Home className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Cadastrar imovel</span>
        </button>
        <button
          onClick={() => setLocation("/leads")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border hover:bg-muted transition-colors cursor-pointer"
        >
          <UserPlus className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Importar leads</span>
        </button>
        <button
          onClick={() => setLocation("/settings")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 border hover:bg-muted transition-colors cursor-pointer"
        >
          <Settings className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Configuracoes</span>
        </button>
      </div>
    </div>
  );

  // --- Step Indicator ---

  const stepLabels = [
    { icon: Sparkles, label: "Bem-vindo" },
    { icon: Palette, label: "Personalizar" },
    { icon: Home, label: "Imovel" },
    { icon: CreditCard, label: "Plano" },
    { icon: Check, label: "Pronto" },
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepWelcome />;
      case 2:
        return <StepBrand />;
      case 3:
        return <StepProperty />;
      case 4:
        return <StepPlan />;
      case 5:
        return <StepDone />;
      default:
        return <StepWelcome />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold text-xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
            <span>ImobiBase</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Etapa {currentStep} de {TOTAL_STEPS}
          </div>
        </div>
        <Progress value={progressPercent} className="h-1 rounded-none" />
      </header>

      {/* Step Indicator */}
      <div className="container mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center justify-center gap-1 sm:gap-2 max-w-2xl mx-auto">
          {stepLabels.map((step, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            const Icon = step.icon;
            return (
              <React.Fragment key={stepNum}>
                {idx > 0 && (
                  <div
                    className={`hidden sm:block flex-1 h-0.5 rounded-full transition-colors ${
                      isCompleted ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isCompleted
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-0 sm:p-2">{renderStep()}</CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

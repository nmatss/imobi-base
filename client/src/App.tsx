import { Switch, Route, useLocation } from "wouter";
import { ImobiProvider, useImobi } from "@/lib/imobi-context";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Dashboard from "@/pages/dashboard";
import PropertiesList from "@/pages/properties/list";
import PropertyDetailsPage from "@/pages/properties/details";
import LeadsKanban from "@/pages/leads/kanban";
import CalendarPage from "@/pages/calendar";
import ContractsPage from "@/pages/contracts";
import RentalsPage from "@/pages/rentals";
import VendasPage from "@/pages/vendas";
import FinanceiroPage from "@/pages/financeiro";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import TenantLanding from "@/pages/public/landing";
import ProductLanding from "@/pages/public/product-landing";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";

function LoginPage() {
  const { login, user, loading } = useImobi();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    try {
      await login(email, password);
    } catch (error: any) {
      setError(error.message || "Email ou senha incorretos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="h-7 w-7" />
            </div>
            <span className="font-heading font-bold text-2xl">ImobiBase</span>
          </div>
        </div>
        
        <div className="relative z-10 text-white space-y-6">
          <h1 className="text-4xl font-heading font-bold leading-tight">
            Gerencie sua imobiliária com inteligência
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Centralize imóveis, leads e contratos em uma única plataforma. Cresça com a tecnologia que grandes redes usam.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <img 
                  key={i} 
                  src={`https://i.pravatar.cc/40?img=${i+20}`} 
                  alt="" 
                  className="w-10 h-10 rounded-full border-2 border-white/20"
                />
              ))}
            </div>
            <p className="text-sm text-white/70">
              Junte-se a centenas de corretores
            </p>
          </div>
        </div>
        
        <div className="relative z-10 text-white/60 text-sm">
          © 2024 ImobiBase. Todos os direitos reservados.
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="font-heading font-bold text-xl">ImobiBase</span>
          </div>
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-heading font-bold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-2">Entre com suas credenciais para acessar o painel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="seu@email.com" 
                defaultValue="admin@sol.com" 
                required 
                className="h-12"
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <a href="#" className="text-sm text-primary hover:underline">Esqueceu?</a>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                defaultValue="password" 
                required 
                className="h-12"
                data-testid="input-password"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <a href="#" className="text-primary font-medium hover:underline">Criar conta grátis</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useImobi();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Tenant Routes */}
      <Route path="/e/:rest*" component={TenantLanding} />

      {/* App Routes */}
      <Route path="/" component={ProductLanding} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/properties" component={() => <ProtectedRoute component={PropertiesList} />} />
      <Route path="/properties/:id" component={() => <ProtectedRoute component={PropertyDetailsPage} />} />
      <Route path="/leads" component={() => <ProtectedRoute component={LeadsKanban} />} />
      <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
      <Route path="/contracts" component={() => <ProtectedRoute component={ContractsPage} />} />
      <Route path="/rentals" component={() => <ProtectedRoute component={RentalsPage} />} />
      <Route path="/vendas" component={() => <ProtectedRoute component={VendasPage} />} />
      <Route path="/financeiro" component={() => <ProtectedRoute component={FinanceiroPage} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ImobiProvider>
       <Router />
    </ImobiProvider>
  );
}

export default App;

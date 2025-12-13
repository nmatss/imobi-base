import { Switch, Route, useLocation } from "wouter";
import { ImobiProvider, useImobi } from "@/lib/imobi-context";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Dashboard from "@/pages/dashboard";
import PropertiesList from "@/pages/properties/list";
import LeadsKanban from "@/pages/leads/kanban";
import TenantLanding from "@/pages/public/landing";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useEffect } from "react";

function LoginPage() {
  const { login, user } = useImobi();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold font-heading">ImobiBase</CardTitle>
          <CardDescription>
            Entre na sua conta para gerenciar sua imobiliária
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="admin@demo.com" defaultValue="admin@demo.com" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <a href="#" className="text-sm text-primary hover:underline">Esqueceu a senha?</a>
            </div>
            <Input id="password" type="password" defaultValue="password" />
          </div>
          <Button className="w-full" onClick={login}>
            Entrar
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta? <a href="#" className="text-primary hover:underline">Cadastre-se</a>
          </p>
        </CardFooter>
      </Card>
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
      <Route path="/e/:slug" component={TenantLanding} />
      <Route path="/e/:slug/*" component={TenantLanding} />

      {/* App Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/properties" component={() => <ProtectedRoute component={PropertiesList} />} />
      <Route path="/leads" component={() => <ProtectedRoute component={LeadsKanban} />} />
      
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

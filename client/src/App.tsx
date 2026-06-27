import React, { useEffect, useState, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Link } from "wouter";
import { ImobiProvider, TwoFactorRequiredError, useImobi } from "@/lib/imobi-context";
import { AccessibilityProvider } from "@/lib/accessibility-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalSearch } from "@/components/GlobalSearch";
import { TimeoutWarning } from "@/components/TimeoutWarning";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { Logo, LogoIcon } from "@/components/brand/logo";
import { SeoHead } from "@/components/seo/SeoHead";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { isSuperAdminRole } from "@shared/constants/roles";

// Lazy-loaded components for better code splitting
const Dashboard = lazy(() => import("@/pages/dashboard"));
const PropertiesList = lazy(() => import("@/pages/properties/list"));
const PropertyDetailsPage = lazy(() => import("@/pages/properties/details"));
const LeadsKanban = lazy(() => import("@/pages/leads/kanban"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const ContractsPage = lazy(() => import("@/pages/contracts"));
const RentalsPage = lazy(() => import("@/pages/rentals"));
const VendasPage = lazy(() => import("@/pages/vendas"));
const FinanceiroPage = lazy(() => import("@/pages/financeiro"));
const ReportsPage = lazy(() => import("@/pages/reports"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const TenantLanding = lazy(() => import("@/pages/public/landing"));
const PropertyDetails = lazy(() => import("@/pages/public/property-details"));
const PublicProperties = lazy(() => import("@/pages/public/properties"));
const ProductLanding = lazy(() => import("@/pages/public/product-landing"));
const SolutionPage = lazy(() => import("@/pages/public/solution-page"));
const SignupPage = lazy(() => import("@/pages/auth/signup"));
const AgencyOnboardingPage = lazy(() => import("@/pages/onboarding/agency"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPassword"));
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmail"));
const AutoMarketingPage = lazy(() => import("@/pages/auto-marketing"));
const AvmPage = lazy(() => import("@/pages/avm"));
const IsaPage = lazy(() => import("@/pages/isa"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const InspectionsPage = lazy(() => import("@/pages/inspections"));
const InspectionDetailPage = lazy(() => import("@/pages/inspections/detail"));
const InspectionComparisonPage = lazy(() => import("@/pages/inspections/comparison"));
const PortalLogin = lazy(() => import("@/pages/portal/portal-login"));
const OwnerPortal = lazy(() => import("@/pages/portal/owner-portal"));
const RenterPortal = lazy(() => import("@/pages/portal/renter-portal"));
const PortalAdmin = lazy(() => import("@/pages/portal/portal-admin"));
const PortalResetPassword = lazy(() => import("@/pages/portal/reset-password"));
const BuyerSelectionPage = lazy(() => import("@/pages/portal/buyer-selection"));
const VisitConfirmPage = lazy(() => import("@/pages/visits/confirm"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const PricingPage = lazy(() => import("@/pages/public/pricing"));
const TermsPage = lazy(() => import("@/pages/public/terms"));
const PrivacyPage = lazy(() => import("@/pages/public/privacy"));
const ContactPage = lazy(() => import("@/pages/public/contact"));
const ChangelogPage = lazy(() => import("@/pages/public/changelog"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const CheckoutSuccessPage = lazy(() => import("@/pages/checkout/success"));
const CheckoutCancelPage = lazy(() => import("@/pages/checkout/cancel"));
const HelpPage = lazy(() => import("@/pages/help"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const TenantsPage = lazy(() => import("@/pages/admin/tenants"));
const PlansPage = lazy(() => import("@/pages/admin/plans"));
const LogsPage = lazy(() => import("@/pages/admin/logs"));

// Loading fallback component with improved UX
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4 px-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Carregando...</p>
          <p className="text-xs text-muted-foreground">Preparando a página para você</p>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const { login, user, loading } = useImobi();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

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
    const twoFactorToken = formData.get("twoFactorToken") as string | null;
    
    try {
      await login(email, password, twoFactorRequired ? { twoFactorToken: twoFactorToken || "" } : undefined);
    } catch (error: unknown) {
      if (error instanceof TwoFactorRequiredError) {
        setTwoFactorRequired(true);
        setError("");
        return;
      }
      const errorMessage = error instanceof Error ? error.message : "Email ou senha incorretos";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <SeoHead
        title="Entrar | ImobiBase"
        description="Acesse sua conta ImobiBase. Gestão completa da sua imobiliária: CRM, imóveis, contratos, financeiro e site."
        path="/login"
        noindex
      />
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/95 shadow-lg flex items-center justify-center">
              <LogoIcon className="h-8 w-8" />
            </div>
            <span className="font-heading font-extrabold text-2xl tracking-tight">ImobiBase</span>
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
                  alt={`Usuário ${i}`}
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
          © {new Date().getFullYear()} ImobiBase. Todos os direitos reservados.
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Logo wordmarkClassName="text-xl" iconClassName="h-10 w-10" />
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
                defaultValue=""
                required
                className="h-12"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">Esqueceu?</Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue=""
                required 
                className="h-12"
                data-testid="input-password"
              />
            </div>

            {twoFactorRequired && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorToken" className="text-sm font-medium">Código de autenticação</Label>
                <Input
                  id="twoFactorToken"
                  name="twoFactorToken"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  className="h-12"
                  data-testid="input-two-factor-token"
                />
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Entrando..." : twoFactorRequired ? "Verificar" : "Entrar"}
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

          <OAuthButtons action="login" />

          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">Criar conta grátis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading, logout } = useImobi();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated (useEffect to avoid setState during render)
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  // Show loader while checking auth or redirecting
  if (loading || !user) {
    return <PageLoader />;
  }

  return (
    <DashboardLayout>
      <GlobalSearch />
      <TimeoutWarning
        sessionTimeout={30 * 60 * 1000} // 30 minutes
        warningTime={5 * 60 * 1000} // 5 minutes warning
        onSessionExpired={() => {
          logout();
          setLocation("/login");
        }}
        onContinueSession={() => {
          // Session extended - could refresh auth token here if needed
        }}
      />
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </DashboardLayout>
  );
}

function SuperAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useImobi();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated (useEffect to avoid setState during render)
  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      setLocation("/login");
    } else if (!isSuperAdminRole(user.role)) {
      setLocation("/dashboard");
    }
  }, [loading, user, setLocation]);

  // Show loader while checking auth or redirecting
  if (loading || !user || !isSuperAdminRole(user.role)) {
    return <PageLoader />;
  }

  return (
    <DashboardLayout>
      <GlobalSearch />
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public Tenant Routes */}
        <Route key="public-properties" path="/e/:slug/imoveis" component={() => <ErrorBoundary><PublicProperties /></ErrorBoundary>} />
        <Route key="public-property-details" path="/e/:slug/imovel/:propertyId" component={() => <ErrorBoundary><PropertyDetails /></ErrorBoundary>} />
        <Route key="tenant-landing" path="/e/:rest*" component={() => <ErrorBoundary><TenantLanding /></ErrorBoundary>} />

        {/* App Routes */}
        <Route key="landing" path="/" component={() => <ErrorBoundary><ProductLanding /></ErrorBoundary>} />
        <Route key="sistema-imobiliario-completo" path="/sistema-imobiliario-completo" component={() => <ErrorBoundary><SolutionPage /></ErrorBoundary>} />
        <Route key="crm-imobiliario" path="/crm-imobiliario" component={() => <ErrorBoundary><SolutionPage /></ErrorBoundary>} />
        <Route key="software-de-agendamento-imobiliario" path="/software-de-agendamento-imobiliario" component={() => <ErrorBoundary><SolutionPage /></ErrorBoundary>} />
        <Route key="site-para-imobiliaria" path="/site-para-imobiliaria" component={() => <ErrorBoundary><SolutionPage /></ErrorBoundary>} />
        <Route key="crm-imobiliario-com-ia" path="/crm-imobiliario-com-ia" component={() => <ErrorBoundary><SolutionPage /></ErrorBoundary>} />
        <Route key="login" path="/login" component={() => <ErrorBoundary><LoginPage /></ErrorBoundary>} />
        <Route key="signup" path="/signup" component={() => <ErrorBoundary><SignupPage /></ErrorBoundary>} />
        {/* Fluxo de recuperação de senha/verificação de email — os links dos
            emails do servidor apontam para /auth/reset-password e /auth/verify-email */}
        <Route key="forgot-password" path="/auth/forgot-password" component={() => <ErrorBoundary><ForgotPasswordPage /></ErrorBoundary>} />
        <Route key="reset-password" path="/auth/reset-password" component={() => <ErrorBoundary><ResetPasswordPage /></ErrorBoundary>} />
        <Route key="verify-email" path="/auth/verify-email" component={() => <ErrorBoundary><VerifyEmailPage /></ErrorBoundary>} />
        <Route key="onboarding-agency" path="/onboarding/agency" component={() => <ErrorBoundary><AgencyOnboardingPage /></ErrorBoundary>} />
        <Route key="pricing" path="/pricing" component={() => <ErrorBoundary><PricingPage /></ErrorBoundary>} />
        <Route key="termos" path="/termos" component={() => <ErrorBoundary><TermsPage /></ErrorBoundary>} />
        <Route key="privacidade" path="/privacidade" component={() => <ErrorBoundary><PrivacyPage /></ErrorBoundary>} />
        <Route key="contato" path="/contato" component={() => <ErrorBoundary><ContactPage /></ErrorBoundary>} />
        <Route key="novidades" path="/novidades" component={() => <ErrorBoundary><ChangelogPage /></ErrorBoundary>} />

        {/* Portal Routes (standalone) */}
        <Route key="portal-login" path="/portal/login" component={() => <ErrorBoundary><PortalLogin /></ErrorBoundary>} />
        <Route key="portal-reset" path="/portal/reset-password" component={() => <ErrorBoundary><PortalResetPassword /></ErrorBoundary>} />
        <Route key="portal-owner" path="/portal/owner" component={() => <ErrorBoundary><OwnerPortal /></ErrorBoundary>} />
        <Route key="portal-renter" path="/portal/renter" component={() => <ErrorBoundary><RenterPortal /></ErrorBoundary>} />

        {/* Public token-based pages (no auth) */}
        <Route key="buyer-selection" path="/s/:token" component={() => <ErrorBoundary><BuyerSelectionPage /></ErrorBoundary>} />
        <Route key="visit-confirm" path="/v/confirm/:token" component={() => <ErrorBoundary><VisitConfirmPage /></ErrorBoundary>} />

        <Route key="dashboard" path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route key="properties" path="/properties" component={() => <ProtectedRoute component={PropertiesList} />} />
        <Route key="property-details" path="/properties/:id" component={() => <ProtectedRoute component={PropertyDetailsPage} />} />
        <Route key="leads" path="/leads" component={() => <ProtectedRoute component={LeadsKanban} />} />
        <Route key="calendar" path="/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
        <Route key="contracts" path="/contracts" component={() => <ProtectedRoute component={ContractsPage} />} />
        <Route key="rentals" path="/rentals" component={() => <ProtectedRoute component={RentalsPage} />} />
        <Route key="vendas" path="/vendas" component={() => <ProtectedRoute component={VendasPage} />} />
        <Route key="financeiro" path="/financeiro" component={() => <ProtectedRoute component={FinanceiroPage} />} />
        <Route key="reports" path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
        <Route key="marketing" path="/marketing" component={() => <ProtectedRoute component={AutoMarketingPage} />} />
        <Route key="avaliacoes" path="/avaliacoes" component={() => <ProtectedRoute component={AvmPage} />} />
        <Route key="isa" path="/isa" component={() => <ProtectedRoute component={IsaPage} />} />
        <Route key="analytics" path="/analytics" component={() => <ProtectedRoute component={AnalyticsPage} />} />
        <Route key="vistorias" path="/vistorias" component={() => <ProtectedRoute component={InspectionsPage} />} />
        <Route key="vistoria-detail" path="/vistorias/:id" component={() => <ProtectedRoute component={InspectionDetailPage} />} />
        <Route key="vistoria-comparison" path="/vistorias/:id/comparacao" component={() => <ProtectedRoute component={InspectionComparisonPage} />} />
        <Route key="portal-admin" path="/portal/admin" component={() => <ProtectedRoute component={PortalAdmin} />} />
        <Route key="onboarding" path="/onboarding" component={() => <ProtectedRoute component={OnboardingPage} />} />
        <Route key="checkout-success" path="/checkout/success" component={() => <ProtectedRoute component={CheckoutSuccessPage} />} />
        <Route key="checkout-cancel" path="/checkout/cancel" component={() => <ProtectedRoute component={CheckoutCancelPage} />} />
        <Route key="checkout" path="/checkout/:planId" component={() => <ProtectedRoute component={CheckoutPage} />} />
        {/* Central de Ajuda — lista em /ajuda e artigo em /ajuda/:slug (mesma página) */}
        <Route key="ajuda" path="/ajuda" component={() => <ProtectedRoute component={HelpPage} />} />
        <Route key="ajuda-artigo" path="/ajuda/:slug" component={() => <ProtectedRoute component={HelpPage} />} />
        <Route key="settings" path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
        {/* Deep-link usado no pós-checkout — renderiza a mesma página de configurações */}
        <Route key="settings-billing" path="/settings/billing" component={() => <ProtectedRoute component={SettingsPage} />} />

        {/* Admin Routes (SuperAdmin only) */}
        <Route key="admin" path="/admin" component={() => <SuperAdminRoute component={AdminDashboard} />} />
        <Route key="admin-tenants" path="/admin/tenants" component={() => <SuperAdminRoute component={TenantsPage} />} />
        <Route key="admin-plans" path="/admin/plans" component={() => <SuperAdminRoute component={PlansPage} />} />
        <Route key="admin-logs" path="/admin/logs" component={() => <SuperAdminRoute component={LogsPage} />} />

        {/* Fallback */}
        <Route key="not-found" component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <ImobiProvider>
          <Router />
          <Toaster position="top-right" richColors closeButton />
        </ImobiProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

export default App;

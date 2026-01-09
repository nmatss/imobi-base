# Guia de Monitoramento e Analytics - ImobiBase

Este documento fornece instruções completas sobre como configurar e usar o sistema de monitoramento e analytics do ImobiBase.

## Índice

1. [Visão Geral](#visão-geral)
2. [Configuração do Sentry](#configuração-do-sentry)
3. [Configuração de Analytics](#configuração-de-analytics)
4. [Source Maps](#source-maps)
5. [Uso no Frontend](#uso-no-frontend)
6. [Uso no Backend](#uso-no-backend)
7. [Monitoramento de Performance](#monitoramento-de-performance)
8. [Alertas e Notificações](#alertas-e-notificações)

---

## Visão Geral

O ImobiBase utiliza um stack completo de monitoramento e analytics:

### Ferramentas Implementadas

- **Sentry**: Error tracking, performance monitoring, session replay
- **PostHog**: Product analytics, feature flags, heatmaps
- **Google Analytics 4**: Web analytics, user behavior
- **Web Vitals**: Core Web Vitals monitoring

### Arquitetura

```
┌─────────────────┐
│   Frontend      │
│  (React App)    │
└────────┬────────┘
         │
         ├─── Sentry Client (Error Tracking + Performance)
         ├─── PostHog (Product Analytics)
         ├─── Google Analytics (Web Analytics)
         └─── Web Vitals (Performance Metrics)
                    │
                    ▼
         ┌──────────────────┐
         │  Analytics API   │
         │  /api/analytics  │
         └──────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
  ┌──────────┐         ┌──────────┐
  │  Sentry  │         │ Backend  │
  │ Platform │         │  Logger  │
  └──────────┘         └──────────┘
```

---

## Configuração do Sentry

### 1. Criar Conta e Projeto

1. Acesse [sentry.io](https://sentry.io) e crie uma conta
2. Crie um novo projeto:
   - Platform: **React**
   - Alert frequency: **Alert on every new issue**
3. Anote o DSN fornecido

### 2. Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```bash
# Backend Sentry
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Frontend Sentry
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Source Maps Upload (opcional, mas recomendado)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=imobibase
SENTRY_AUTH_TOKEN=your-auth-token
```

### 3. Gerar Auth Token

Para upload de source maps:

1. Acesse: Settings → Account → API → Auth Tokens
2. Clique em "Create New Token"
3. Selecione os scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
4. Copie o token gerado

### 4. Configurar .sentryclirc

Copie o arquivo de exemplo:

```bash
cp .sentryclirc.example .sentryclirc
```

Edite `.sentryclirc` com suas informações:

```ini
[defaults]
org=your-organization-slug
project=imobibase

[auth]
token=your-auth-token
```

**IMPORTANTE**: Adicione `.sentryclirc` ao `.gitignore` (já está incluído).

---

## Configuração de Analytics

### PostHog

1. Crie uma conta em [posthog.com](https://posthog.com)
2. Obtenha sua API Key em: Settings → Project → API Keys
3. Adicione ao `.env`:

```bash
VITE_POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxx
VITE_POSTHOG_HOST=https://app.posthog.com
```

### Google Analytics 4

1. Acesse [Google Analytics](https://analytics.google.com)
2. Crie uma propriedade GA4
3. Obtenha o Measurement ID (formato: G-XXXXXXXXXX)
4. Adicione ao `.env`:

```bash
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

---

## Source Maps

### Como Funcionam

Source maps permitem que você visualize o código original (TypeScript/JSX) no Sentry, mesmo após minificação.

### Configuração

O sistema está configurado para:

1. **Desenvolvimento**: Source maps completos e visíveis
2. **Produção**: Source maps "hidden" (enviados apenas para Sentry)

### Upload Automático

Durante o build de produção:

```bash
npm run build
```

O plugin Sentry Vite automaticamente:
1. Gera source maps
2. Faz upload para Sentry
3. Remove os arquivos `.map` do build final (segurança)

### Verificar Upload

1. Acesse: Sentry → Settings → Source Maps
2. Verifique se há releases listadas
3. Clique em uma release para ver os arquivos

---

## Uso no Frontend

### 1. Error Boundary

Envolva componentes críticos com ErrorBoundary:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      componentName="App"
      showDialog={true} // Permite usuários reportarem erros
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### 2. Capturar Exceções Manualmente

```tsx
import { captureException, addBreadcrumb } from '@/lib/monitoring/sentry-client';

try {
  // Código que pode falhar
  await riskyOperation();
} catch (error) {
  captureException(error, {
    context: 'payment_processing',
    userId: user.id,
    amount: payment.amount,
  });
}
```

### 3. Adicionar Breadcrumbs

Breadcrumbs ajudam a rastrear ações do usuário antes de um erro:

```tsx
import { addBreadcrumb } from '@/lib/monitoring/sentry-client';

function handleButtonClick() {
  addBreadcrumb(
    'User clicked export button',
    'user_action',
    { reportType: 'monthly', format: 'pdf' }
  );

  exportReport();
}
```

### 4. Tracking de Analytics

#### Page Views (Automático)

```tsx
import { usePageTracking } from '@/hooks/useAnalytics';

function App() {
  usePageTracking(); // Rastreia automaticamente mudanças de rota

  return <YourApp />;
}
```

#### Eventos Customizados

```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function PropertyCard() {
  const { trackFeatureUsage, trackClick } = useAnalytics();

  const handleFavorite = () => {
    trackFeatureUsage('properties', 'favorite', {
      propertyId: property.id,
      propertyType: property.type,
    });

    // Lógica de favoritar
  };

  return (
    <button onClick={handleFavorite}>
      Favoritar
    </button>
  );
}
```

#### Formulários

```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function LeadForm() {
  const { trackForm } = useAnalytics();

  const handleSubmit = async (data) => {
    try {
      await createLead(data);
      trackForm('lead_creation', true);
    } catch (error) {
      trackForm('lead_creation', false, error.message);
    }
  };
}
```

#### Buscas

```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function SearchBar() {
  const { trackSearchQuery } = useAnalytics();

  const handleSearch = (query: string) => {
    const results = performSearch(query);
    trackSearchQuery(query, results.length);
  };
}
```

### 5. Identificar Usuários

```tsx
import { setUser } from '@/lib/monitoring/sentry-client';
import { identifyUser } from '@/lib/analytics';

// Após login bem-sucedido
function onLoginSuccess(user: User) {
  // Sentry
  setUser({
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
  });

  // Analytics
  identifyUser({
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    role: user.role,
  });
}
```

### 6. Performance Monitoring

```tsx
import { measureAsync, Profiler } from '@/lib/monitoring/sentry-client';

// Medir operações assíncronas
async function loadDashboardData() {
  return await measureAsync(
    'dashboard_data_load',
    'http.request',
    async () => {
      const data = await fetch('/api/dashboard');
      return data.json();
    }
  );
}

// Profiler para componentes React
function Dashboard() {
  return (
    <Profiler id="Dashboard" name="Dashboard Component">
      <DashboardContent />
    </Profiler>
  );
}
```

---

## Uso no Backend

### 1. Capturar Exceções

```typescript
import { captureException, captureMessage } from './monitoring/sentry';

try {
  await processPayment(paymentData);
} catch (error) {
  captureException(error, {
    context: 'payment_processing',
    paymentId: payment.id,
    userId: user.id,
  });
  throw error;
}
```

### 2. Mensagens e Warnings

```typescript
import { captureMessage } from './monitoring/sentry';

// Info
captureMessage('Payment processor switched to backup', 'info', {
  processor: 'stripe',
  reason: 'high_latency',
});

// Warning
captureMessage('Rate limit approaching', 'warning', {
  endpoint: '/api/leads',
  currentRate: 450,
  limit: 500,
});

// Error
captureMessage('Database connection pool exhausted', 'error', {
  poolSize: 20,
  activeConnections: 20,
});
```

### 3. Adicionar Contexto de Usuário

```typescript
import { setUser, clearUser } from './monitoring/sentry';

// Após autenticação
passport.authenticate('local', (err, user) => {
  if (user) {
    setUser({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });
  }
});

// No logout
app.post('/logout', (req, res) => {
  clearUser();
  req.logout();
  res.json({ success: true });
});
```

### 4. Performance Tracking

```typescript
import { startTransaction } from './monitoring/sentry';

async function generateReport(reportId: string) {
  const transaction = startTransaction('report_generation', 'task');

  try {
    const data = await fetchReportData();
    const pdf = await generatePDF(data);
    transaction.setStatus('ok');
    return pdf;
  } catch (error) {
    transaction.setStatus('error');
    throw error;
  } finally {
    transaction.finish();
  }
}
```

---

## Monitoramento de Performance

### Web Vitals Monitorados

O sistema monitora automaticamente:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay) / **INP**: < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1.8s
- **TTFB** (Time to First Byte): < 800ms

### Visualizar Métricas

#### Sentry
1. Acesse: Performance → Web Vitals
2. Filtre por página, browser, país

#### PostHog
1. Acesse: Insights → Trends
2. Crie gráfico com evento `web_vital`
3. Filtre por métrica e rating

#### Google Analytics
1. Acesse: Reports → Engagement → Events
2. Filtre por categoria "Web Vitals"

---

## Alertas e Notificações

### Configurar Alertas no Sentry

1. Acesse: Alerts → Create Alert
2. Configure condições:
   - **Error Rate**: Alerta se taxa de erro > 1%
   - **Performance Degradation**: Alerta se p95 > 3s
   - **New Issue**: Alerta em novos tipos de erro

### Integração com Slack

1. Acesse: Settings → Integrations → Slack
2. Conecte seu workspace
3. Configure canal de notificações

### Integração com Email

1. Acesse: Settings → Notifications
2. Configure regras de email:
   - Novos erros
   - Erros críticos
   - Releases

---

## Boas Práticas

### 1. Filtrar Informações Sensíveis

❌ **NÃO FAÇA**:
```typescript
captureException(error, {
  password: user.password,
  creditCard: payment.cardNumber,
});
```

✅ **FAÇA**:
```typescript
captureException(error, {
  userId: user.id,
  paymentMethod: 'credit_card',
  last4Digits: payment.last4,
});
```

### 2. Usar Níveis Apropriados

```typescript
// Info: Eventos normais
captureMessage('User exported report', 'info');

// Warning: Situações que merecem atenção
captureMessage('Cache miss rate high', 'warning');

// Error: Erros que afetam funcionalidade
captureMessage('Payment gateway timeout', 'error');
```

### 3. Adicionar Contexto Relevante

```typescript
captureException(error, {
  // Contexto do usuário
  userId: user.id,
  tenantId: user.tenantId,

  // Contexto da operação
  operation: 'create_contract',
  propertyId: property.id,

  // Dados técnicos
  endpoint: '/api/contracts',
  method: 'POST',
});
```

### 4. Rate Limiting

Evite enviar eventos duplicados:

```typescript
// Debounce eventos de alta frequência
const debouncedTrack = debounce(() => {
  trackEvent('scroll', { depth: scrollDepth });
}, 1000);
```

### 5. Feature Flags

Use PostHog para A/B testing:

```typescript
import { isFeatureEnabled } from '@/lib/analytics';

function PropertyCard() {
  const showNewLayout = isFeatureEnabled('new_property_layout');

  return showNewLayout ? <NewLayout /> : <OldLayout />;
}
```

---

## Troubleshooting

### Source Maps não aparecem no Sentry

1. Verifique se `SENTRY_AUTH_TOKEN` está configurado
2. Verifique logs do build:
   ```bash
   npm run build 2>&1 | grep -i sentry
   ```
3. Confira em Sentry → Settings → Source Maps

### Analytics não rastreiam eventos

1. Abra DevTools → Console
2. Procure por logs `[Analytics]` ou erros
3. Verifique se as API keys estão corretas
4. Em desenvolvimento, eventos são apenas logados no console

### Sentry não captura erros

1. Verifique se `SENTRY_DSN` está configurado
2. Em desenvolvimento, erros são apenas logados
3. Teste em modo produção:
   ```bash
   NODE_ENV=production npm run build
   npm start
   ```

---

## Recursos Adicionais

- [Documentação Sentry](https://docs.sentry.io)
- [Documentação PostHog](https://posthog.com/docs)
- [Guia Google Analytics 4](https://support.google.com/analytics/answer/9304153)
- [Web Vitals](https://web.dev/vitals/)

---

**Última atualização**: 2025-12-25
**Versão**: 1.0.0

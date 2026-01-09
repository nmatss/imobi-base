# Guia Rápido - Monitoramento e Analytics

Guia de 5 minutos para começar a usar o sistema de monitoramento.

## 1. Configuração Inicial (5 min)

### Passo 1: Criar Conta Sentry

```bash
# 1. Acesse https://sentry.io e crie uma conta
# 2. Crie um projeto React
# 3. Copie o DSN
```

### Passo 2: Configurar .env

```bash
# Copie o .env.example
cp .env.example .env

# Edite o .env e adicione seu Sentry DSN:
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### Passo 3: Testar

```bash
# Inicie o servidor
npm run dev

# Acesse http://localhost:5000
# Abra o console - você deve ver:
# ✅ Sentry initialized for error tracking
# ✅ Analytics providers initialized
```

## 2. Uso Básico

### Capturar Erros

```tsx
import { captureException } from '@/lib/monitoring';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    context: 'payment',
    userId: user.id,
  });
}
```

### Track Analytics

```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackFeatureUsage } = useAnalytics();

  const handleClick = () => {
    trackFeatureUsage('properties', 'view', {
      propertyId: property.id,
    });
  };

  return <button onClick={handleClick}>View Property</button>;
}
```

### Error Boundary

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary componentName="MyFeature" showDialog={true}>
  <MyComponent />
</ErrorBoundary>
```

## 3. Verificar se Está Funcionando

### Frontend

1. Abra o DevTools Console
2. Procure por logs:
   - `✅ Sentry client initialized`
   - `✅ PostHog initialized`
   - `✅ Google Analytics initialized`

### Backend

1. Inicie o servidor: `npm run dev`
2. Procure por logs:
   - `✅ Sentry initialized for error tracking`

### Testar Captura de Erro

```tsx
// Componente de teste
function TestError() {
  throw new Error("Test error!");
}

// Use dentro de um ErrorBoundary
<ErrorBoundary>
  <TestError />
</ErrorBoundary>
```

Depois vá para [sentry.io](https://sentry.io) e verifique se o erro apareceu.

## 4. Analytics (Opcional)

### PostHog (Grátis)

```bash
# 1. Acesse https://posthog.com
# 2. Crie uma conta
# 3. Copie a API Key

# Adicione ao .env:
VITE_POSTHOG_API_KEY=phc_xxxxx
```

### Google Analytics (Grátis)

```bash
# 1. Acesse https://analytics.google.com
# 2. Crie uma propriedade GA4
# 3. Copie o Measurement ID

# Adicione ao .env:
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## 5. Source Maps (Opcional, mas Recomendado)

Para ver código original no Sentry em vez de código minificado:

```bash
# 1. Acesse Sentry → Settings → Account → API → Auth Tokens
# 2. Crie um token com scopes: project:read, project:releases, org:read
# 3. Adicione ao .env:

SENTRY_ORG=your-org-slug
SENTRY_PROJECT=imobibase
SENTRY_AUTH_TOKEN=your-auth-token
```

Agora quando você fizer build de produção, os source maps serão enviados automaticamente:

```bash
npm run build
```

## 6. Próximos Passos

- 📖 Leia o [Guia Completo](./docs/MONITORING_ANALYTICS_GUIDE.md)
- 🔍 Explore os [Exemplos](./client/src/examples/MonitoringExample.tsx)
- 🎯 Configure [Alertas no Sentry](https://sentry.io/alerts/)
- 📊 Crie [Dashboards no PostHog](https://posthog.com/docs/user-guides/dashboards)

## Troubleshooting Rápido

**Erros não aparecem no Sentry?**
- Verifique se `SENTRY_DSN` e `VITE_SENTRY_DSN` estão configurados
- Em desenvolvimento, erros são apenas logados no console
- Teste em modo produção: `NODE_ENV=production npm start`

**Analytics não funcionam?**
- Verifique se as API keys estão corretas
- Abra DevTools → Console e procure por erros
- Em desenvolvimento, eventos são apenas logados

**Source maps não aparecem?**
- Verifique se `SENTRY_AUTH_TOKEN` está configurado
- Rode `npm run build` e procure por logs do Sentry
- Verifique em Sentry → Settings → Source Maps

---

**Pronto!** 🎉

Agora você tem monitoramento completo de erros, performance e analytics.

Para dúvidas, consulte o [Guia Completo](./docs/MONITORING_ANALYTICS_GUIDE.md).

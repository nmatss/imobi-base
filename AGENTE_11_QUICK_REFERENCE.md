# Error Handling - Referência Rápida

## Imports Essenciais

```tsx
// Componentes
import { ErrorMessage, ErrorMessageCompact, ErrorMessageInline } from "@/components/ui/ErrorMessage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorDebugPanel } from "@/components/dev/ErrorDebugPanel";

// Hooks
import { useErrorMessage } from "@/components/ui/ErrorMessage";
import { useApiMutation, useCreateMutation, useUpdateMutation, useDeleteMutation } from "@/hooks/useApiMutation";

// Utilitários
import { errorLogger, categorizeError, ErrorType } from "@/lib/error-handling";
```

## Uso Rápido

### 1. Exibir Erro em Query

```tsx
const { data, error, refetch } = useQuery(...);

if (error) {
  return <ErrorMessage error={error} onRetry={refetch} />;
}
```

### 2. Criar Mutation com Error Handling

```tsx
const createItem = useCreateMutation({
  mutationFn: (data) => createItemApi(data),
  resourceName: "item",
  invalidateKeys: [["items"]],
});
```

### 3. Formulário com Error Handling

```tsx
const { error, setError, clearError } = useErrorMessage();

const handleSubmit = async (data) => {
  try {
    await saveData(data);
    clearError();
  } catch (err) {
    setError(err);
  }
};

return (
  <form>
    {error && <ErrorMessage error={error} />}
    {/* fields */}
  </form>
);
```

### 4. Wrap com ErrorBoundary

```tsx
<ErrorBoundary componentName="MyComponent">
  <MyComponent />
</ErrorBoundary>
```

### 5. Log Manual de Erros

```tsx
import { errorLogger } from "@/lib/error-handling";

try {
  await operation();
} catch (error) {
  errorLogger.log(error, {
    component: "MyComponent",
    action: "operation",
  });
  throw error;
}
```

## Variantes de ErrorMessage

```tsx
// Card completo (padrão)
<ErrorMessage error={error} onRetry={refetch} />

// Compacto (para cards/listas)
<ErrorMessageCompact error={error} onRetry={refetch} />

// Inline (para formulários)
<ErrorMessageInline error={error} />

// Banner (para alertas)
<ErrorMessageBanner error={error} />
```

## useApiMutation - Opções

```tsx
useCreateMutation({
  mutationFn: (data) => api(data),
  resourceName: "item",              // Nome do recurso
  invalidateKeys: [["items"]],       // Keys para invalidar
  successMessage: "Criado!",         // Mensagem customizada
  showSuccessToast: true,            // Mostrar toast de sucesso
  showErrorToast: true,              // Mostrar toast de erro
  onSuccess: (data) => {},           // Callback adicional
  onError: (error) => {},            // Callback adicional
  logContext: { feature: "items" },  // Contexto para logs
});
```

## Tipos de Erro

```typescript
ErrorType.NETWORK         // Erro de conexão
ErrorType.VALIDATION      // Dados inválidos
ErrorType.AUTHENTICATION  // Sessão expirada
ErrorType.AUTHORIZATION   // Sem permissão
ErrorType.NOT_FOUND       // Não encontrado
ErrorType.SERVER          // Erro servidor (5xx)
ErrorType.UNKNOWN         // Desconhecido
```

## ErrorLogger - Métodos

```tsx
// Logar erro
errorLogger.log(error, { component: "MyComponent" });

// Obter todos os logs
const logs = errorLogger.getLogs();

// Filtrar por tipo
const networkErrors = errorLogger.getLogsByType(ErrorType.NETWORK);

// Exportar logs
const json = errorLogger.exportLogs();

// Limpar logs
errorLogger.clearLogs();
```

## ErrorBoundary - Props

```tsx
<ErrorBoundary
  componentName="MyComponent"           // Nome para logging
  onError={(error, info) => {}}         // Callback quando erro ocorre
  fallback={<CustomError />}            // UI customizada
>
  <MyComponent />
</ErrorBoundary>
```

## Debug Panel (Dev Only)

```tsx
// No App.tsx
{import.meta.env.DEV && <ErrorDebugPanel position="bottom-right" />}

// Posições disponíveis:
// - "bottom-right" (padrão)
// - "bottom-left"
// - "top-right"
// - "top-left"
```

## Refatoração de Hooks

### Antes ❌

```tsx
const mutation = useMutation({
  mutationFn: createData,
  onSuccess: () => {
    queryClient.invalidateQueries(["data"]);
    toast.success("Sucesso!");
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### Depois ✅

```tsx
const mutation = useCreateMutation({
  mutationFn: createData,
  resourceName: "item",
  invalidateKeys: [["data"]],
});
```

## Padrões Comuns

### Lista com Loading e Error

```tsx
function List() {
  const { data, error, isLoading, refetch } = useQuery(...);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  return <div>{data.map(...)}</div>;
}
```

### Formulário Completo

```tsx
function Form() {
  const { error, setError, clearError, retry, isRetrying } = useErrorMessage(refetch);
  const createItem = useCreateMutation({...});

  const onSubmit = async (data) => {
    clearError();
    try {
      await createItem.mutateAsync(data);
      navigate("/success");
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      {error && <ErrorMessage error={error} onRetry={retry} isRetrying={isRetrying} />}
      {/* fields */}
    </form>
  );
}
```

### Card com Error Handling

```tsx
function Card() {
  const { data, error, refetch } = useQuery(...);

  if (error) {
    return <ErrorMessageCompact error={error} onRetry={refetch} />;
  }

  return <div>{data}</div>;
}
```

## Categorização Automática

### Por Status Code

```
401 → AUTHENTICATION
403 → AUTHORIZATION
404 → NOT_FOUND
400-499 → VALIDATION
500-599 → SERVER
```

### Por Mensagem

```
"failed to fetch" → NETWORK
"timeout" → NETWORK
"validation" → VALIDATION
"unauthorized" → AUTHENTICATION
"forbidden" → AUTHORIZATION
```

## Mensagens Automáticas

```
NETWORK       → "Erro de conexão. Verifique sua internet."
VALIDATION    → "Dados inválidos. Verifique os campos."
AUTHENTICATION → "Sessão expirou. Faça login novamente."
AUTHORIZATION → "Sem permissão para esta ação."
NOT_FOUND     → "Recurso não encontrado."
SERVER        → "Erro no servidor. Tente novamente."
UNKNOWN       → "Erro inesperado. Tente novamente."
```

## Retry Automático

### Retenta (erros recuperáveis)
- NETWORK
- SERVER

### Não Retenta (erros permanentes)
- VALIDATION
- AUTHENTICATION
- AUTHORIZATION
- NOT_FOUND

## Checklist de Implementação

```markdown
- [ ] Adicionar ErrorDebugPanel ao App.tsx
- [ ] Refatorar hooks para useApiMutation
- [ ] Adicionar ErrorBoundary nas rotas
- [ ] Substituir error divs por ErrorMessage
- [ ] Testar cenários de erro
- [ ] Configurar monitoring (Sentry)
```

## Comandos úteis no Console

```javascript
// Ver todos os erros
console.table(errorLogger.getLogs());

// Ver erros de rede
console.table(errorLogger.getLogsByType('network'));

// Exportar logs
copy(errorLogger.exportLogs());

// Limpar logs
errorLogger.clearLogs();
```

## Integração com Monitoring

### Sentry (exemplo)

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_DSN",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
});
```

### Google Analytics (já configurado)

```typescript
// Automático via queryClient.ts
window.gtag('event', 'exception', {
  description: error.message,
  fatal: false,
  error_type: errorDetails.type,
});
```

## Arquivo de Configuração

Todos os arquivos importantes:

```
client/src/
├── lib/
│   └── error-handling.ts          # Sistema central
├── components/
│   ├── ErrorBoundary.tsx          # Boundary
│   ├── ui/
│   │   └── ErrorMessage.tsx       # Mensagens
│   └── dev/
│       └── ErrorDebugPanel.tsx    # Debug (dev)
└── hooks/
    ├── useApiMutation.ts          # Mutations
    └── useLeads-improved.ts       # Exemplo
```

## Links

- [Guia Completo](./AGENTE_11_ERROR_HANDLING_GUIDE.md)
- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/query-functions#handling-and-throwing-errors)
- [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

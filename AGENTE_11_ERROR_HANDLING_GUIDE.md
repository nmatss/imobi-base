# Sistema de Tratamento de Erros - Guia Completo

## Visão Geral

O sistema de tratamento de erros foi completamente reformulado para fornecer uma experiência consistente, informativa e amigável ao usuário, com ferramentas robustas de debug para desenvolvimento.

## Arquitetura

### 1. Categorização de Erros

```typescript
enum ErrorType {
  NETWORK = 'network',           // Erros de conexão
  VALIDATION = 'validation',     // Dados inválidos
  AUTHENTICATION = 'authentication', // Sessão expirada
  AUTHORIZATION = 'authorization',   // Sem permissão
  NOT_FOUND = 'not_found',      // Recurso não encontrado
  SERVER = 'server',            // Erro no servidor (5xx)
  UNKNOWN = 'unknown',          // Erro não categorizado
}
```

### 2. Componentes Principais

```
client/src/
├── lib/
│   └── error-handling.ts          # Sistema central de error handling
├── components/
│   ├── ErrorBoundary.tsx          # Boundary melhorado
│   ├── ui/
│   │   └── ErrorMessage.tsx       # Componente de mensagem de erro
│   └── dev/
│       └── ErrorDebugPanel.tsx    # Painel de debug (dev only)
└── hooks/
    ├── useApiMutation.ts          # Hook unificado para mutations
    └── useLeads-improved.ts       # Exemplo de refatoração
```

## Uso

### 1. Componente ErrorMessage

```tsx
import { ErrorMessage } from "@/components/ui/ErrorMessage";

// Uso básico
function MyComponent() {
  const { data, error, refetch } = useQuery(...);

  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  return <div>{data}</div>;
}

// Com título customizado
<ErrorMessage
  error={error}
  title="Falha ao carregar dados"
  description="Não foi possível carregar os dados. Tente novamente."
  onRetry={refetch}
/>

// Versão compacta
import { ErrorMessageCompact } from "@/components/ui/ErrorMessage";

<ErrorMessageCompact error={error} onRetry={refetch} />

// Versão inline
import { ErrorMessageInline } from "@/components/ui/ErrorMessage";

<ErrorMessageInline error={error} />
```

### 2. Hook useApiMutation

```tsx
import { useCreateMutation } from "@/hooks/useApiMutation";

// Cria um mutation com error handling automático
const createLead = useCreateMutation({
  mutationFn: (data) => fetch('/api/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => r.json()),
  resourceName: "lead",
  invalidateKeys: [["leads"]],
  // Error handling automático:
  // - Toast notifications
  // - Logging
  // - Retry inteligente
});

// Usar
createLead.mutate(leadData);
```

### 3. Hook useErrorMessage

```tsx
import { useErrorMessage } from "@/components/ui/ErrorMessage";

function MyForm() {
  const { error, setError, clearError, retry, isRetrying } = useErrorMessage(
    async () => {
      // Função de retry
      await refetch();
    }
  );

  const handleSubmit = async (data) => {
    try {
      await submitData(data);
      clearError();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <ErrorMessage
          error={error}
          onRetry={retry}
          isRetrying={isRetrying}
        />
      )}
      {/* form fields */}
    </form>
  );
}
```

### 4. Error Boundary

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Wrap de componentes
<ErrorBoundary
  componentName="PropertyDetails"
  onError={(error, errorInfo) => {
    // Log customizado
    console.error("Error in PropertyDetails:", error);
  }}
>
  <PropertyDetails />
</ErrorBoundary>

// Com fallback customizado
<ErrorBoundary
  fallback={
    <div className="p-4">
      <h2>Erro ao carregar propriedades</h2>
      <button onClick={() => window.location.reload()}>
        Recarregar
      </button>
    </div>
  }
>
  <PropertyList />
</ErrorBoundary>
```

### 5. Logger de Erros

```tsx
import { errorLogger } from "@/lib/error-handling";

// Log manual de erros
try {
  await riskyOperation();
} catch (error) {
  errorLogger.log(error, {
    component: "MyComponent",
    action: "riskyOperation",
    userId: currentUser.id,
  });
  throw error;
}

// Obter logs
const allLogs = errorLogger.getLogs();
const networkErrors = errorLogger.getLogsByType(ErrorType.NETWORK);

// Exportar logs
const logsJson = errorLogger.exportLogs();

// Limpar logs
errorLogger.clearLogs();
```

### 6. Debug Panel (Desenvolvimento)

```tsx
import { ErrorDebugPanel } from "@/components/dev/ErrorDebugPanel";

// No App.tsx ou layout principal
function App() {
  return (
    <div>
      {/* seu app */}
      {import.meta.env.DEV && <ErrorDebugPanel position="bottom-right" />}
    </div>
  );
}
```

## Refatoração de Hooks Existentes

### Antes

```tsx
export function useCreateLead() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: createLead,
    onSuccess: (newLead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      success("Lead criado com sucesso");
    },
    onError: (error: Error) => {
      showError("Erro ao criar lead", error.message);
    },
  });
}
```

### Depois

```tsx
import { useCreateMutation } from "@/hooks/useApiMutation";

export function useCreateLead() {
  return useCreateMutation({
    mutationFn: createLead,
    resourceName: "lead",
    invalidateKeys: [["leads"]],
    logContext: {
      feature: "leads",
      action: "create",
    },
  });
}
```

Benefícios:
- Error handling automático
- Logging centralizado
- Retry inteligente
- Mensagens de erro categorizadas
- Menos código boilerplate

## Categorização Automática de Erros

O sistema categoriza automaticamente erros baseado em:

1. **Código de Status HTTP**
   - 401 → AUTHENTICATION
   - 403 → AUTHORIZATION
   - 404 → NOT_FOUND
   - 4xx → VALIDATION
   - 5xx → SERVER

2. **Mensagem de Erro**
   - "failed to fetch" → NETWORK
   - "timeout" → NETWORK
   - "validation" → VALIDATION
   - "unauthorized" → AUTHENTICATION
   - "forbidden" → AUTHORIZATION

## Mensagens de Erro Amigáveis

Cada tipo de erro tem mensagens específicas:

```typescript
const messages = {
  NETWORK: "Erro de conexão. Verifique sua internet.",
  VALIDATION: "Dados inválidos. Verifique os campos.",
  AUTHENTICATION: "Sessão expirou. Faça login novamente.",
  AUTHORIZATION: "Sem permissão para esta ação.",
  NOT_FOUND: "Recurso não encontrado.",
  SERVER: "Erro no servidor. Tente novamente.",
  UNKNOWN: "Erro inesperado. Tente novamente.",
};
```

## Retry Inteligente

O sistema decide automaticamente se deve tentar novamente:

```typescript
// Retenta automaticamente (erros recuperáveis)
- NETWORK
- SERVER

// Não retenta (erros não recuperáveis)
- VALIDATION
- AUTHENTICATION
- AUTHORIZATION
- NOT_FOUND
```

## Query Client Global Error Handling

Todos os erros de queries e mutations são automaticamente:
1. Categorizados
2. Logados no errorLogger
3. Enviados para analytics (se configurado)
4. Exibidos no console (desenvolvimento)

## Boas Práticas

### 1. Use ErrorMessage ao invés de if(error)

❌ Evite:
```tsx
if (error) {
  return <div className="text-red-500">{error.message}</div>;
}
```

✅ Prefira:
```tsx
if (error) {
  return <ErrorMessage error={error} onRetry={refetch} />;
}
```

### 2. Use useApiMutation para Mutations

❌ Evite:
```tsx
const mutation = useMutation({
  mutationFn: createData,
  onSuccess: () => {
    toast.success("Criado!");
    queryClient.invalidateQueries(["data"]);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

✅ Prefira:
```tsx
const mutation = useCreateMutation({
  mutationFn: createData,
  resourceName: "item",
  invalidateKeys: [["data"]],
});
```

### 3. Wrap Rotas com ErrorBoundary

```tsx
<Route path="/properties">
  <ErrorBoundary componentName="PropertiesPage">
    <PropertiesPage />
  </ErrorBoundary>
</Route>
```

### 4. Log Contexto Importante

```tsx
errorLogger.log(error, {
  userId: user.id,
  component: "PropertyForm",
  action: "submit",
  propertyId: property.id,
});
```

### 5. Use o Debug Panel em Desenvolvimento

Mantenha o ErrorDebugPanel ativo durante desenvolvimento para:
- Ver histórico de erros
- Analisar padrões
- Exportar logs para análise
- Debug de problemas intermitentes

## Integração com Monitoring

O sistema está preparado para integração com:

### Sentry

```typescript
// Em error-handling.ts
import * as Sentry from "@sentry/react";

class ErrorLogger {
  log(error: unknown, context?: ErrorLogEntry['context']): void {
    const errorDetails = categorizeError(error);

    // Envia para Sentry
    Sentry.captureException(errorDetails.originalError, {
      tags: {
        error_type: errorDetails.type,
      },
      contexts: {
        custom: context,
      },
    });

    // ... resto do código
  }
}
```

### Google Analytics

Já configurado no queryClient.ts:
```typescript
if (typeof window !== 'undefined' && 'gtag' in window) {
  window.gtag('event', 'exception', {
    description: `Query error: ${errorDetails.message}`,
    fatal: false,
    error_type: errorDetails.type,
  });
}
```

## Testes

### Testando Error Handling

```tsx
import { render, screen } from "@testing-library/react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

test("exibe mensagem de erro de rede", () => {
  const error = new Error("Failed to fetch");

  render(<ErrorMessage error={error} />);

  expect(screen.getByText(/erro de conexão/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /tentar novamente/i }))
    .toBeInTheDocument();
});

test("categoriza erro 401 como autenticação", () => {
  const error = new Error("401: Unauthorized");

  render(<ErrorMessage error={error} />);

  expect(screen.getByText(/sessão expirou/i)).toBeInTheDocument();
});
```

## Performance

O sistema de error handling foi otimizado para:
- Mínimo overhead em operações normais
- Logging assíncrono
- Cache de categorizações
- Limite de logs em memória (100 max)
- Structural sharing no React Query

## Debug

### Ver Todos os Erros Registrados

```tsx
import { errorLogger } from "@/lib/error-handling";

// No console
console.table(errorLogger.getLogs());
```

### Exportar Logs

```tsx
// No ErrorDebugPanel
// Clique em "Exportar" para baixar JSON

// Ou programaticamente
const logs = errorLogger.exportLogs();
console.log(logs);
```

### Filtrar por Tipo

```tsx
const networkErrors = errorLogger.getLogsByType(ErrorType.NETWORK);
console.log("Erros de rede:", networkErrors.length);
```

## Checklist de Implementação

- [x] ✅ Criar sistema de categorização de erros
- [x] ✅ Criar componente ErrorMessage reutilizável
- [x] ✅ Criar logger de erros para desenvolvimento
- [x] ✅ Melhorar ErrorBoundary com categorização
- [x] ✅ Criar hooks unificados (useApiMutation)
- [x] ✅ Integrar error handling no queryClient
- [x] ✅ Criar painel de debug (ErrorDebugPanel)
- [x] ✅ Adicionar mensagens específicas por tipo de erro
- [x] ✅ Implementar retry inteligente
- [x] ✅ Criar documentação completa

## Próximos Passos Sugeridos

1. **Refatorar hooks existentes** para usar useApiMutation
   - useProperties.ts
   - useContracts.ts
   - useFollowUps.ts

2. **Adicionar ErrorDebugPanel ao App.tsx**

3. **Criar testes unitários** para componentes de erro

4. **Integrar com Sentry** em produção

5. **Adicionar ErrorBoundary** em rotas principais

6. **Monitorar padrões de erro** usando o logger

## Exemplos Práticos

### Formulário com Error Handling

```tsx
import { ErrorMessage, useErrorMessage } from "@/components/ui/ErrorMessage";

function LeadForm() {
  const { error, setError, clearError } = useErrorMessage();
  const createLead = useCreateMutation({
    mutationFn: createLeadApi,
    resourceName: "lead",
    invalidateKeys: [["leads"]],
  });

  const handleSubmit = async (data) => {
    clearError();
    try {
      await createLead.mutateAsync(data);
      // Sucesso - navega para lista
      navigate("/leads");
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage error={error} className="mb-4" />}

      {/* campos do formulário */}

      <Button type="submit" disabled={createLead.isPending}>
        {createLead.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
```

### Lista com Error Handling

```tsx
function LeadsList() {
  const { data, error, refetch, isLoading } = useLeads();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        onRetry={refetch}
        title="Erro ao carregar leads"
      />
    );
  }

  return (
    <div>
      {data.map(lead => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
```

## Conclusão

Este sistema de error handling fornece:
- ✅ Experiência consistente para usuários
- ✅ Ferramentas poderosas de debug
- ✅ Logging centralizado
- ✅ Mensagens amigáveis e contextuais
- ✅ Retry inteligente
- ✅ Integração com monitoring
- ✅ Fácil manutenção e extensão

Todos os erros do sistema agora são tratados de forma unificada, categorizados automaticamente, e exibidos com mensagens amigáveis ao usuário.

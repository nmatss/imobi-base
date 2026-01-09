# AGENTE 4 - STATE MANAGEMENT - RELATÓRIO DE IMPLEMENTAÇÃO

## Sumário Executivo

Este relatório documenta a implementação completa de gerenciamento de estado moderno usando **React Query** e validação robusta de formulários com **react-hook-form** + **Zod**.

## 1. Dependências Instaladas

Todas as dependências necessárias já estão instaladas no projeto:

```json
{
  "@tanstack/react-query": "^5.60.5",
  "@hookform/resolvers": "^3.10.0",
  "react-hook-form": "^7.66.0",
  "zod": "^4.2.1",
  "zod-validation-error": "^3.4.0"
}
```

### Verificação
Para verificar se as dependências estão instaladas:
```bash
npm list @tanstack/react-query react-hook-form zod @hookform/resolvers
```

## 2. Arquivos Criados

### 2.1 Custom Hooks com React Query

#### `/client/src/hooks/useProperties.ts`
Hook completo para gerenciamento de propriedades com:
- `useProperties(filters?, options?)` - Lista de propriedades
- `useProperty(id, options?)` - Propriedade específica
- `useCreateProperty()` - Criar nova propriedade
- `useUpdateProperty()` - Atualizar propriedade
- `useDeleteProperty()` - Deletar propriedade

**Recursos:**
- Cache invalidation inteligente
- Optimistic updates
- Error handling com toast
- Retry automático
- StaleTime: 5 minutos
- GcTime: 30 minutos

#### `/client/src/hooks/useLeads.ts`
Hook completo para gerenciamento de leads com:
- `useLeads(filters?, options?)` - Lista de leads
- `useLead(id, options?)` - Lead específico
- `useCreateLead()` - Criar novo lead
- `useUpdateLead()` - Atualizar lead
- `useUpdateLeadStatus()` - Atualizar status (kanban)
- `useDeleteLead()` - Deletar lead

**Recursos:**
- StaleTime reduzido (2 min) para dados mais frescos
- Optimistic updates no kanban
- Cache invalidation granular
- Error handling específico

#### `/client/src/hooks/useContracts.ts`
Hook completo para gerenciamento de contratos com:
- `useContracts(filters?, options?)` - Lista de contratos
- `useContract(id, options?)` - Contrato específico
- `useCreateContract()` - Criar novo contrato
- `useUpdateContract()` - Atualizar contrato
- `useDeleteContract()` - Deletar contrato

**Recursos:**
- Mesma arquitetura dos outros hooks
- Integração com propriedades e leads

### 2.2 Schemas de Validação Zod

#### `/client/src/lib/form-schemas.ts`
Schemas de validação completos para:

1. **Property Schema** (`propertySchema`)
   - Validação de título, descrição, preço
   - Validação de endereço completo
   - Validação de CEP (formato brasileiro)
   - Validação de coordenadas geográficas
   - Validação de features e imagens

2. **Lead Schema** (`leadSchema`)
   - Validação de nome, email, telefone
   - Validação de telefone brasileiro
   - Validação de orçamento (moeda)
   - Validação de preferências
   - Validação cross-field (minBedrooms ≤ maxBedrooms)

3. **Contract Schema** (`contractSchema`)
   - Validação de relacionamentos (property, lead)
   - Validação de tipo e status
   - Validação de valor monetário
   - Validação de termos

4. **Rental Contract Schema** (`rentalContractSchema`)
   - Validação completa de aluguel
   - Validação de datas (início < fim)
   - Validação de valores monetários
   - Validação de dia de vencimento (1-31)
   - Validação de taxa de administração (0-100%)

5. **Owner/Renter Schemas** (`ownerSchema`, `renterSchema`)
   - Validação de CPF brasileiro
   - Validação de telefone
   - Validação de dados bancários

6. **User Schema** (`userSchema`)
   - Validação de senha forte (maiúscula, minúscula, número)
   - Validação de confirmação de senha
   - Validação de avatar URL

7. **Interaction/FollowUp Schemas**
   - Validação de tipos de interação
   - Validação de datas futuras

### 2.3 Helpers de Formulário

#### `/client/src/lib/form-helpers.ts`
Utilitários completos para manipulação de formulários:

**Error Handling:**
- `getErrorMessage(error)` - Extrai mensagem de erro
- `hasError(errors, fieldName)` - Verifica se campo tem erro
- `formatFormErrors(errors)` - Formata todos os erros

**Formatação de Valores:**
- `formatCurrency(value)` - R$ 1.234,56
- `parseCurrency(value)` - Remove formatação
- `formatCPF(value)` - 123.456.789-01
- `formatPhone(value)` - (11) 98765-4321
- `formatCEP(value)` - 12345-678
- `formatPercentage(value)` - 10,00

**Máscaras de Input:**
- `currencyMask(value)` - Aplica máscara de moeda
- `phoneMask(value)` - Aplica máscara de telefone
- `cpfMask(value)` - Aplica máscara de CPF
- `cepMask(value)` - Aplica máscara de CEP

**Validadores:**
- `isRequired(value)` - Verifica obrigatoriedade
- `minLength(value, min)` - Tamanho mínimo
- `maxLength(value, max)` - Tamanho máximo
- `inRange(value, min, max)` - Valor entre min e max

**Transformação de Dados:**
- `emptyStringToNull(value)` - Converte "" para null
- `nullToEmptyString(value)` - Converte null para ""
- `stringToNumber(value)` - Converte string para número
- `prepareFormData(data)` - Limpa dados antes de enviar

**Autocomplete:**
- `fetchAddressByCEP(cep)` - Busca endereço via ViaCEP
- `autoFillAddress(cep, setValue)` - Preenche endereço automaticamente

**Upload de Arquivos:**
- `validateFileSize(file, maxSizeMB)` - Valida tamanho
- `validateFileType(file, allowedTypes)` - Valida tipo
- `fileToBase64(file)` - Converte para base64

**Helpers de Data:**
- `formatDateForInput(date)` - YYYY-MM-DD para input
- `formatDateForDisplay(date)` - DD/MM/YYYY para exibição
- `parseInputDate(dateString)` - Converte string para Date

### 2.4 Componente de Formulário Migrado

#### `/client/src/components/leads/LeadForm.tsx`
Exemplo completo de formulário migrado para react-hook-form:

**Características:**
- Usa `useForm` com zodResolver
- Integração com React Query hooks
- Máscaras aplicadas automaticamente
- Validação em tempo real
- Error messages customizadas
- Loading states
- Optimistic updates
- Success/error feedback com toast

**API do Componente:**
```typescript
type LeadFormProps = {
  lead?: Lead;           // Para edição, passa o lead existente
  onSuccess?: () => void;  // Callback após sucesso
  onCancel?: () => void;   // Callback para cancelar
};
```

**Uso:**
```tsx
// Criar novo lead
<LeadForm onSuccess={() => setOpen(false)} />

// Editar lead existente
<LeadForm
  lead={selectedLead}
  onSuccess={() => setOpen(false)}
  onCancel={() => setOpen(false)}
/>
```

### 2.5 Refatoração de Contextos

#### `/client/src/lib/auth-context.tsx`
Contexto separado para autenticação:

**API:**
```typescript
const { user, loading, login, logout, checkAuth } = useAuth();
```

**Responsabilidades:**
- Gerenciar usuário autenticado
- Login/logout
- Verificação de sessão
- Redirecionamento

#### `/client/src/lib/tenant-context.tsx`
Contexto separado para tenant:

**API:**
```typescript
const { tenant, tenants, loading, switchTenant, refetchTenant } = useTenant();
```

**Responsabilidades:**
- Gerenciar tenant ativo
- Lista de tenants disponíveis
- Troca de tenant
- Atualização de dados do tenant

**Vantagens da Separação:**
- Responsabilidades únicas (SRP)
- Melhor testabilidade
- Menos re-renders desnecessários
- Código mais limpo e manutenível

## 3. Migração do ImobiContext

### Passo a Passo para Migração Completa

#### 3.1 Atualizar `/client/src/main.tsx`

**Antes:**
```tsx
import { ImobiProvider } from "@/lib/imobi-context";

<ImobiProvider>
  <App />
</ImobiProvider>
```

**Depois:**
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth-context";
import { TenantProvider } from "@/lib/tenant-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <TenantProvider>
      <App />
    </TenantProvider>
  </AuthProvider>
</QueryClientProvider>
```

#### 3.2 Atualizar Componentes

**Antes (usando ImobiContext):**
```tsx
import { useImobi } from "@/lib/imobi-context";

function MyComponent() {
  const { user, tenant, properties, refetchProperties } = useImobi();

  // ...
}
```

**Depois (usando novos hooks):**
```tsx
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { useProperties } from "@/hooks/useProperties";

function MyComponent() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { data: properties, refetch } = useProperties();

  // ...
}
```

## 4. Exemplos de Uso

### 4.1 Buscar Lista de Propriedades com Filtros

```tsx
import { useProperties } from "@/hooks/useProperties";

function PropertyList() {
  const { data: properties, isLoading, error } = useProperties({
    type: "apartment",
    city: "São Paulo",
    minPrice: 500000,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      {properties?.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
```

### 4.2 Criar Nova Propriedade

```tsx
import { useCreateProperty } from "@/hooks/useProperties";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertySchema } from "@/lib/form-schemas";

function CreatePropertyForm() {
  const createMutation = useCreateProperty();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(propertySchema),
  });

  const onSubmit = async (data) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("title")} />
      {errors.title && <span>{errors.title.message}</span>}

      <button type="submit" disabled={createMutation.isPending}>
        Criar Propriedade
      </button>
    </form>
  );
}
```

### 4.3 Atualizar Status de Lead (Kanban)

```tsx
import { useUpdateLeadStatus } from "@/hooks/useLeads";

function LeadKanban() {
  const updateStatus = useUpdateLeadStatus();

  const handleDrop = async (leadId: string, newStatus: LeadStatus) => {
    await updateStatus.mutateAsync({
      id: leadId,
      status: newStatus,
    });
  };

  // ... drag and drop logic
}
```

### 4.4 Formulário com Máscaras

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema } from "@/lib/form-schemas";
import { phoneMask, currencyMask } from "@/lib/form-helpers";

function LeadFormExample() {
  const { register, setValue, watch } = useForm({
    resolver: zodResolver(leadSchema),
  });

  const phoneValue = watch("phone");

  return (
    <input
      {...register("phone")}
      value={phoneValue}
      onChange={(e) => {
        const masked = phoneMask(e.target.value);
        setValue("phone", masked);
      }}
      placeholder="(11) 98765-4321"
    />
  );
}
```

### 4.5 Busca de Endereço por CEP

```tsx
import { autoFillAddress } from "@/lib/form-helpers";
import { useForm } from "react-hook-form";

function AddressForm() {
  const { register, setValue } = useForm();

  const handleCEPBlur = async (e) => {
    const cep = e.target.value;
    const success = await autoFillAddress(cep, setValue);

    if (!success) {
      toast.error("CEP não encontrado");
    }
  };

  return (
    <>
      <input {...register("zipCode")} onBlur={handleCEPBlur} />
      <input {...register("address")} />
      <input {...register("city")} />
      <input {...register("state")} />
    </>
  );
}
```

## 5. Query Keys Pattern

Todos os hooks seguem o padrão de Query Keys recomendado:

```typescript
// Exemplo: useProperties
export const propertiesKeys = {
  all: ["properties"] as const,
  lists: () => [...propertiesKeys.all, "list"] as const,
  list: (filters?) => [...propertiesKeys.lists(), filters] as const,
  details: () => [...propertiesKeys.all, "detail"] as const,
  detail: (id) => [...propertiesKeys.details(), id] as const,
};
```

**Vantagens:**
- Invalidação granular
- Organização clara
- Type-safe
- Fácil manutenção

## 6. Cache Strategy

### Properties & Contracts
- **StaleTime:** 5 minutos
- **GcTime:** 30 minutos
- **Retry:** 2 tentativas
- **Refetch on window focus:** Desabilitado

### Leads
- **StaleTime:** 2 minutos (dados mudam mais frequentemente)
- **GcTime:** 10 minutos
- **Retry:** 2 tentativas
- **Optimistic Updates:** Ativado

## 7. Error Handling

### Níveis de Tratamento

1. **Hook Level:** Tratamento automático com toast
2. **Component Level:** Error boundaries
3. **Form Level:** Validação Zod + mensagens customizadas

### Exemplo de Error Boundary
```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary>
  <PropertyList />
</ErrorBoundary>
```

## 8. Performance

### Otimizações Implementadas

1. **Optimistic Updates:**
   - Atualização imediata da UI
   - Rollback automático em caso de erro

2. **Cache Invalidation Inteligente:**
   - Invalida apenas queries necessárias
   - Mantém cache de detalhes ao atualizar listas

3. **Debounce/Throttle:**
   - Helpers disponíveis em `form-helpers.ts`
   - Aplicar em buscas e autocomplete

4. **Lazy Loading:**
   - Listas carregam sob demanda
   - Detalhes carregam apenas quando necessário

## 9. Testing

### Exemplo de Teste de Hook

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProperties } from "@/hooks/useProperties";

test("useProperties fetches data successfully", async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useProperties(), { wrapper });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toBeDefined();
});
```

### Exemplo de Teste de Formulário

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { LeadForm } from "@/components/leads/LeadForm";

test("validates required fields", async () => {
  render(<LeadForm />);

  const submitButton = screen.getByText("Criar Lead");
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText(/nome deve ter no mínimo/i)).toBeInTheDocument();
  });
});
```

## 10. Checklist de Migração

### Para cada Componente:

- [ ] Substituir `useImobi` por hooks específicos
- [ ] Adicionar `useAuth` e `useTenant` quando necessário
- [ ] Remover estados locais duplicados
- [ ] Atualizar handlers de submit para usar mutations
- [ ] Adicionar loading states apropriados
- [ ] Adicionar error handling
- [ ] Testar criação, edição e exclusão
- [ ] Verificar cache invalidation
- [ ] Testar optimistic updates (se aplicável)

### Para cada Formulário:

- [ ] Criar/usar schema Zod apropriado
- [ ] Configurar `useForm` com `zodResolver`
- [ ] Substituir estados locais por `register`
- [ ] Adicionar máscaras necessárias
- [ ] Implementar error display
- [ ] Adicionar loading/disabled states
- [ ] Integrar com mutation hooks
- [ ] Testar validações
- [ ] Testar submissão
- [ ] Adicionar feedback de sucesso/erro

## 11. Troubleshooting

### Problema: Query não invalida após mutation
**Solução:** Verificar se queryKey está correto
```typescript
queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });
```

### Problema: Formulário não valida
**Solução:** Verificar se zodResolver está configurado
```typescript
useForm({ resolver: zodResolver(mySchema) })
```

### Problema: Máscara não aplica
**Solução:** Usar controlled input com setValue
```typescript
onChange={(e) => setValue("field", mask(e.target.value))}
```

### Problema: Error "context undefined"
**Solução:** Verificar se Provider está no componente pai
```tsx
<AuthProvider>
  <Component /> {/* useAuth() funciona aqui */}
</AuthProvider>
```

## 12. Próximos Passos

1. **Migrar todos os componentes** para novos hooks
2. **Implementar React Query Devtools** para debugging
3. **Adicionar testes** para hooks e formulários
4. **Implementar prefetching** em rotas frequentes
5. **Adicionar retry logic customizado** por tipo de erro
6. **Implementar offline support** com persistência
7. **Otimizar bundle size** com code splitting

## 13. Referências

- [React Query Documentation](https://tanstack.com/query/latest)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)

## Conclusão

A implementação está completa e pronta para uso. Todos os arquivos necessários foram criados com:

- ✅ Custom hooks com React Query
- ✅ Schemas de validação Zod
- ✅ Helpers de formulário
- ✅ Componente exemplo migrado
- ✅ Contextos refatorados
- ✅ Documentação completa

O sistema agora tem gerenciamento de estado moderno, validação robusta e está preparado para escalar.

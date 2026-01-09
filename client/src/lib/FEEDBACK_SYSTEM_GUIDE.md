# Sistema de Feedback Visual - Guia de Implementação

## 📋 Visão Geral

Este guia documenta o sistema de feedback visual implementado no ImobiBase, incluindo:
- ✅ Toast Notifications (Sonner)
- ⚠️ Mudanças Não Salvas (Unsaved Changes)
- 🔄 Loading States
- 💀 Skeleton Loaders
- ✔️ Confirmações de Ação

---

## 🎯 1. Toast Notifications

### Hook: `useToastFeedback`

**Localização:** `/client/src/hooks/useToastFeedback.ts`

#### Uso Básico

```tsx
import { useToastFeedback } from "@/hooks/useToastFeedback";

function MyComponent() {
  const toast = useToastFeedback();

  const handleSave = async () => {
    try {
      await saveData();
      toast.success("Dados salvos com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar", error.message);
    }
  };
}
```

#### Métodos Disponíveis

```tsx
// Toast de sucesso
toast.success("Mensagem de sucesso", "Descrição opcional");

// Toast de erro
toast.error("Mensagem de erro", "Descrição do erro");

// Toast de aviso
toast.warning("Mensagem de aviso", "Descrição");

// Toast de info
toast.info("Informação", "Detalhes");

// Toast de loading (manual)
const loadingId = toast.loading("Processando...");
// ... operação ...
toast.dismiss(loadingId);

// Toast de promise (automático)
toast.promise(
  myAsyncFunction(),
  {
    loading: "Processando...",
    success: "Sucesso!",
    error: "Erro ao processar"
  }
);
```

#### Helpers CRUD

```tsx
import { toastHelpers } from "@/hooks/useToastFeedback";

// Shortcuts para operações comuns
toastHelpers.saved("Dados");        // "Dados salvos com sucesso"
toastHelpers.created("Lead");       // "Lead criado com sucesso"
toastHelpers.updated("Imóvel");     // "Imóvel atualizado com sucesso"
toastHelpers.deleted("Contrato");   // "Contrato deletado com sucesso"
toastHelpers.copied("Link");        // "Link copiado para área de transferência"
```

---

## ⚠️ 2. Mudanças Não Salvas

### Hook: `useUnsavedChanges`

**Localização:** `/client/src/hooks/useUnsavedChanges.ts`

#### Uso Básico

```tsx
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";

function MyForm() {
  const [hasChanges, setHasChanges] = useState(false);
  const { confirmNavigation, cancelNavigation, blocker } = useUnsavedChanges(hasChanges);

  return (
    <>
      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => !open && cancelNavigation()}
        onConfirm={confirmNavigation}
      />

      {/* Seu formulário */}
    </>
  );
}
```

### Hook: `useFormDirtyState`

Detecta mudanças automaticamente comparando dados atuais com iniciais:

```tsx
import { useFormDirtyState } from "@/hooks/useUnsavedChanges";

function MyForm({ initialData }) {
  const [formData, setFormData] = useState(initialData);
  const { isDirty, resetForm } = useFormDirtyState(formData, initialData);

  const handleSave = async () => {
    await save(formData);
    resetForm(); // Marca como salvo
  };

  return (
    <div>
      {isDirty && <p>Você tem mudanças não salvas</p>}
    </div>
  );
}
```

### Componentes

#### `UnsavedChangesBanner`

Banner sticky no topo da página:

```tsx
import { UnsavedChangesBanner } from "@/components/ui/unsaved-changes-banner";

<UnsavedChangesBanner
  show={hasUnsavedChanges}
  onSave={handleSave}
  onDiscard={handleDiscard}
  isSaving={isSaving}
  variant="warning" // "warning" | "info" | "danger"
/>
```

#### `UnsavedChangesBar`

Barra colorida simples no topo do card:

```tsx
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-banner";

<Card>
  <UnsavedChangesBar show={hasUnsavedChanges} />
  {/* Conteúdo do card */}
</Card>
```

### Wrapper Completo: `FormWithFeedback`

**Localização:** `/client/src/components/FormWithFeedback.tsx`

```tsx
import { FormWithFeedback } from "@/components/FormWithFeedback";

<FormWithFeedback
  hasUnsavedChanges={isDirty}
  onSave={handleSave}
  onDiscard={handleDiscard}
  isSaving={isSaving}
  showBanner={true}
  showBar={true}
  enableNavigationPrompt={true}
>
  {/* Seu formulário */}
</FormWithFeedback>
```

---

## 🔄 3. Loading States

### Botões com Loading

O componente `Button` já suporta loading state:

```tsx
import { Button } from "@/components/ui/button";

<Button
  onClick={handleSave}
  disabled={isSaving}
  isLoading={isSaving}
>
  Salvar
</Button>
```

### Page Loader

**Localização:** `/client/src/components/ui/page-loader.tsx`

```tsx
import { PageLoader } from "@/components/ui/page-loader";

// Loading de página inteira
<PageLoader
  text="Carregando dados"
  description="Isso pode levar alguns segundos..."
  fullScreen={true}
  variant="spinner" // "spinner" | "dots" | "pulse"
  size="md"         // "sm" | "md" | "lg"
/>

// Inline loader
import { InlineLoader } from "@/components/ui/page-loader";

<InlineLoader size="sm" />

// Overlay loader (modal)
import { OverlayLoader } from "@/components/ui/page-loader";

<OverlayLoader text="Processando pagamento" />
```

---

## 💀 4. Skeleton Loaders

**Localização:** `/client/src/components/ui/skeleton-loaders.tsx`

### Skeletons Disponíveis

```tsx
import {
  PropertyGridSkeleton,
  DashboardSkeleton,
  KanbanBoardSkeleton,
  TableSkeleton,
  FormSkeleton,
  SettingsSkeleton,
  FinancialPageSkeleton,
  RentalsPageSkeleton,
  SalesPageSkeleton,
  CalendarSkeleton,
} from "@/components/ui/skeleton-loaders";

// Uso
function MyPage() {
  const { data, isLoading } = useQuery(...);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <MyContent data={data} />;
}
```

### Criar Skeleton Customizado

```tsx
import { Skeleton } from "@/components/ui/skeleton";

function MyCustomSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
```

---

## ✔️ 5. Confirmações de Ação

### Hook: `useConfirmDialog`

**Localização:** `/client/src/components/ui/confirm-dialog.tsx`

```tsx
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

function MyComponent() {
  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Deletar imóvel?",
      description: "Esta ação não pode ser desfeita.",
      confirmText: "Deletar",
      variant: "destructive"
    });

    if (confirmed) {
      await deleteProperty();
    }
  };

  return (
    <>
      {dialog}
      <Button onClick={handleDelete}>Deletar</Button>
    </>
  );
}
```

### Componente Declarativo

```tsx
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const [showDialog, setShowDialog] = useState(false);

<ConfirmDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  title="Confirmar ação"
  description="Tem certeza?"
  onConfirm={handleConfirm}
  variant="destructive"
  isLoading={isProcessing}
/>
```

---

## 📦 6. Exemplos Completos

### Exemplo 1: Formulário com Feedback Completo

Ver: `/client/src/pages/settings/tabs/GeneralTabImproved.tsx`

**Features:**
- ✅ Toast de sucesso/erro
- ✅ Banner de mudanças não salvas
- ✅ Confirmação ao navegar
- ✅ Loading em botões
- ✅ Validação visual de campos

### Exemplo 2: Dashboard com Loading States

Ver: `/client/src/examples/DashboardWithFeedback.tsx`

**Features:**
- ✅ Page loader inicial
- ✅ Skeleton loaders
- ✅ Toast de erro
- ✅ Refresh com feedback

### Exemplo 3: CRUD de Leads

Ver: `/client/src/examples/LeadsWithFeedback.tsx`

**Features:**
- ✅ Toast helpers para CRUD
- ✅ Confirmação de delete
- ✅ Loading em ações
- ✅ Optimistic updates

### Exemplo 4: Upload de Imagens

Ver: `/client/src/examples/PropertiesWithFeedback.tsx`

**Features:**
- ✅ Toast de promise
- ✅ Progress bar de upload
- ✅ Copiar link (toast)
- ✅ Compartilhar

---

## 🎨 7. Boas Práticas

### ✅ DO

```tsx
// ✅ Use toast helpers para operações comuns
toastHelpers.saved();

// ✅ Use promise toast para operações assíncronas longas
toast.promise(longOperation(), {...});

// ✅ Desabilite botões durante loading
<Button disabled={isLoading} isLoading={isLoading}>

// ✅ Mostre skeleton no primeiro load
if (isLoading && !data) return <Skeleton />;

// ✅ Confirme ações destrutivas
const confirmed = await confirm({...});
```

### ❌ DON'T

```tsx
// ❌ Não crie toasts customizados sem necessidade
toast({ title: "Salvo", ... }); // Use toast.success()

// ❌ Não mostre loading sem desabilitar o botão
<Button isLoading={true} disabled={false}>

// ❌ Não use alert() ou confirm()
if (window.confirm("Deletar?")) // Use useConfirmDialog

// ❌ Não esqueça de resetar estado após salvar
handleSave(); // Sem resetForm()
```

---

## 🚀 8. Checklist de Implementação

### Para cada página/formulário:

- [ ] Toast de sucesso ao salvar
- [ ] Toast de erro com mensagem descritiva
- [ ] Loading state em botões de ação
- [ ] Skeleton loader no carregamento inicial
- [ ] Banner de mudanças não salvas (forms)
- [ ] Confirmação de navegação (forms)
- [ ] Confirmação de ações destrutivas
- [ ] Validação visual de campos (forms)
- [ ] Estados vazios com mensagem
- [ ] Botões desabilitados durante operações

---

## 📚 9. Arquivos Principais

### Hooks
- `/client/src/hooks/useToastFeedback.ts` - Toast notifications
- `/client/src/hooks/useUnsavedChanges.ts` - Mudanças não salvas
- `/client/src/hooks/use-toast.ts` - Toast base (shadcn)

### Componentes
- `/client/src/components/ui/sonner.tsx` - Toast provider
- `/client/src/components/ui/unsaved-changes-banner.tsx` - Banners
- `/client/src/components/UnsavedChangesDialog.tsx` - Dialog de confirmação
- `/client/src/components/FormWithFeedback.tsx` - Wrapper de formulários
- `/client/src/components/ui/page-loader.tsx` - Loaders
- `/client/src/components/ui/skeleton-loaders.tsx` - Skeletons
- `/client/src/components/ui/confirm-dialog.tsx` - Confirmações
- `/client/src/components/ui/button.tsx` - Botão com loading
- `/client/src/components/ui/spinner.tsx` - Spinner

### Exemplos
- `/client/src/pages/settings/tabs/GeneralTabImproved.tsx`
- `/client/src/examples/DashboardWithFeedback.tsx`
- `/client/src/examples/LeadsWithFeedback.tsx`
- `/client/src/examples/PropertiesWithFeedback.tsx`

---

## 🎯 10. Próximos Passos

1. **Implementar em páginas principais:**
   - Dashboard
   - Leads Kanban
   - Properties List
   - Financial
   - Settings (todas as tabs)

2. **Adicionar ao main.tsx:**
   ```tsx
   import { Toaster } from "@/components/ui/sonner";

   <Toaster position="top-right" />
   ```

3. **Testar cenários:**
   - Navegação com dados não salvos
   - Operações longas (promise toast)
   - Uploads com progress
   - Ações destrutivas

4. **Documentar casos específicos** do negócio

---

## 📞 Suporte

Para dúvidas sobre a implementação, consulte os exemplos em `/client/src/examples/` ou verifique a documentação do Sonner: https://sonner.emilkowal.ski/

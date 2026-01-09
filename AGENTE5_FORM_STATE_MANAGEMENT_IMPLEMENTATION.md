# AGENTE 5 - Form State Management Implementation

## 📋 Resumo Executivo

Implementação completa de **detecção de mudanças não salvas** em formulários com:

✅ **Badge vermelho pulsante** quando formulário está "dirty"
✅ **Aviso beforeunload** ao tentar fechar/recarregar navegador
✅ **Dialog de confirmação** ao navegar para outra rota
✅ **Botão "Descartar alterações"** para reset rápido
✅ **Auto-reset** do estado dirty após salvar com sucesso
✅ **Compatível com Wouter** (router atual do projeto)
✅ **Integração com react-hook-form** e formulários controlados

---

## 🎯 Arquivos Criados/Modificados

### Hooks

1. **`/client/src/hooks/useFormDirty.ts`** (CRIADO)
   - Hook principal para detecção de dirty state
   - Badge visual de alterações não salvas
   - Navegação protegida

2. **`/client/src/hooks/useUnsavedChanges.ts`** (ATUALIZADO)
   - Compatibilidade com Wouter
   - Gerenciamento de navegação
   - Proteção beforeunload

### Componentes

3. **`/client/src/components/ui/unsaved-changes-dialog.tsx`** (CRIADO)
   - Dialog de confirmação estilizado
   - Hook imperativo `useUnsavedChangesDialog`
   - Visual com ícone de alerta

### Exemplos de Integração

4. **`/client/src/pages/settings/tabs/GeneralTabWithUnsavedChanges.tsx`** (CRIADO)
   - Exemplo completo de integração
   - Todas as features implementadas
   - Pronto para uso em produção

---

## 🚀 Como Usar

### 1. Com React Hook Form

```tsx
import { useForm } from "react-hook-form";
import { useFormDirty } from "@/hooks/useFormDirty";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

function MyForm() {
  const { formState: { isDirty }, handleSubmit, reset } = useForm();

  const {
    dirtyBadge,
    navigate,
    showConfirmDialog,
    handleConfirm,
    handleCancel
  } = useFormDirty(isDirty);

  const onSubmit = async (data) => {
    await saveData(data);
    reset(data); // Reseta o dirty state
  };

  return (
    <div>
      <h1>
        Meu Formulário {dirtyBadge}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* campos do formulário */}
        <button type="submit">Salvar</button>
      </form>

      <UnsavedChangesDialog
        open={showConfirmDialog}
        onOpenChange={handleCancel}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
```

### 2. Com Formulário Controlado

```tsx
import { useState } from "react";
import { useFormDirtyState } from "@/hooks/useFormDirty";
import { Button } from "@/components/ui/button";

function MyControlledForm({ initialData, onSave }) {
  const [formData, setFormData] = useState(initialData);

  // Compara automaticamente formData vs initialData
  const { isDirty, resetDirty } = useFormDirtyState(formData, initialData);

  const handleSave = async () => {
    await onSave(formData);
    resetDirty(); // Marca como salvo
  };

  const handleDiscard = () => {
    setFormData(initialData);
    resetDirty();
  };

  return (
    <div>
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p>Você tem alterações não salvas</p>
          <Button onClick={handleDiscard}>
            Descartar alterações
          </Button>
        </div>
      )}

      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

      <Button onClick={handleSave} disabled={!isDirty}>
        Salvar
      </Button>
    </div>
  );
}
```

### 3. Dialog de Confirmação Imperativo

```tsx
import { useUnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

function MyComponent() {
  const { confirm, dialog } = useUnsavedChangesDialog();
  const [isDirty, setIsDirty] = useState(false);

  const handleNavigate = async (to: string) => {
    if (isDirty) {
      const shouldLeave = await confirm();
      if (shouldLeave) {
        navigate(to);
      }
    } else {
      navigate(to);
    }
  };

  return (
    <>
      <MyForm />
      {dialog}
    </>
  );
}
```

---

## 📦 API Reference

### `useFormDirty(isDirty, options?)`

Hook principal para gerenciar estado dirty de formulários.

**Parâmetros:**
- `isDirty`: boolean - Estado dirty do formulário
- `options`: (opcional)
  - `message`: string - Mensagem customizada do dialog
  - `title`: string - Título do dialog
  - `enabled`: boolean - Habilitar/desabilitar proteção

**Retorna:**
```ts
{
  isDirty: boolean;
  dirtyBadge: JSX.Element | null; // Badge visual vermelho
  navigate: (to: string) => void; // Navegação protegida
  showConfirmDialog: boolean;
  handleConfirm: () => void;
  handleCancel: () => void;
  confirmDialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
}
```

### `useFormDirtyState<T>(currentData, initialData)`

Hook simplificado para formulários controlados.

**Parâmetros:**
- `currentData`: T - Estado atual do formulário
- `initialData`: T - Dados iniciais para comparação

**Retorna:**
```ts
{
  isDirty: boolean;
  resetDirty: () => void; // Marca como salvo
  setInitialData: (newData: T) => void; // Atualiza baseline
  initialData: T;
}
```

### `useUnsavedChanges(enabled?)`

Hook para navegação protegida compatível com Wouter.

**Parâmetros:**
- `enabled`: boolean - Habilitar proteção (padrão: true)

**Retorna:**
```ts
{
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  discardChanges: () => void;
  navigate: (to: string) => void;
  showPrompt: boolean;
}
```

### `UnsavedChangesDialog`

Componente de dialog estilizado para confirmação.

**Props:**
```ts
{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title?: string; // Padrão: "Alterações não salvas"
  description?: string;
  confirmText?: string; // Padrão: "Sair sem salvar"
  cancelText?: string; // Padrão: "Continuar editando"
}
```

### `useUnsavedChangesDialog()`

Hook imperativo para dialog.

**Retorna:**
```ts
{
  confirm: () => Promise<boolean>; // Retorna true se confirmado
  dialog: JSX.Element; // Renderizar no componente
}
```

---

## 🎨 Componentes Visuais

### Badge Dirty State

Badge vermelho pulsante que aparece automaticamente:

```tsx
const { dirtyBadge } = useFormDirty(isDirty);

<h1>Configurações {dirtyBadge}</h1>
// Renderiza: Configurações ● (se dirty)
```

### Banner de Alterações Não Salvas

```tsx
{isDirty && (
  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg p-4">
    <div className="flex items-center gap-2">
      <AlertCircle className="text-amber-600" />
      <div>
        <p className="font-medium">Você tem alterações não salvas</p>
        <p className="text-sm">Lembre-se de salvar antes de sair</p>
      </div>
    </div>
    <Button onClick={handleDiscard}>Descartar alterações</Button>
  </div>
)}
```

### Dialog de Confirmação

Visual moderno com ícone de alerta:

```tsx
<UnsavedChangesDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  title="Alterações não salvas"
  description="Você tem alterações não salvas. Deseja realmente sair sem salvar?"
  confirmText="Sair sem salvar"
  cancelText="Continuar editando"
  onConfirm={handleConfirm}
/>
```

---

## 📱 Integração com Settings Page

### Antes (sem proteção)

```tsx
export function GeneralTab({ initialData, onSave }: GeneralTabProps) {
  const [formData, setFormData] = useState(initialData);

  const handleSave = async () => {
    await onSave(formData);
    toast({ title: "Salvo!" });
  };

  return (
    <SettingsCard onSave={handleSave}>
      {/* formulário */}
    </SettingsCard>
  );
}
```

### Depois (com proteção completa)

```tsx
import { useFormDirtyState } from "@/hooks/useFormDirty";
import { Button } from "@/components/ui/button";
import { AlertCircle, XCircle } from "lucide-react";

export function GeneralTab({ initialData, onSave }: GeneralTabProps) {
  const [formData, setFormData] = useState(initialData);

  // 🔥 INTEGRAÇÃO 1: Detectar mudanças
  const { isDirty, resetDirty, setInitialData } = useFormDirtyState(
    formData,
    initialData
  );

  // 🔥 INTEGRAÇÃO 2: Aviso beforeunload
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSave = async () => {
    await onSave(formData);
    resetDirty(); // 🔥 INTEGRAÇÃO 3: Reset após salvar
    toast({ title: "Salvo!" });
  };

  // 🔥 INTEGRAÇÃO 4: Descartar alterações
  const handleDiscard = () => {
    setFormData(initialData);
    resetDirty();
    toast({ title: "Alterações descartadas" });
  };

  // Atualizar baseline quando initialData mudar
  useEffect(() => {
    setFormData(initialData);
    setInitialData(initialData);
  }, [initialData, setInitialData]);

  return (
    <div className="space-y-6">
      {/* 🔥 INTEGRAÇÃO 5: Banner visual */}
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <div className="flex items-center gap-2 flex-1">
            <AlertCircle className="text-amber-600" />
            <div>
              <p className="font-medium">Você tem alterações não salvas</p>
              <p className="text-sm">Lembre-se de salvar antes de sair</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleDiscard}>
            <XCircle className="w-4 h-4 mr-2" />
            Descartar alterações
          </Button>
        </div>
      )}

      <SettingsCard
        title={
          <div className="flex items-center gap-2">
            <span>Dados da Empresa</span>
            {/* 🔥 Badge vermelho pulsante */}
            {isDirty && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
        }
        onSave={handleSave}
      >
        {/* formulário */}
      </SettingsCard>
    </div>
  );
}
```

---

## 🔧 Integração com Property Form

Para o formulário de propriedades (ainda não existe um arquivo dedicado), a integração seria:

```tsx
import { useForm } from "react-hook-form";
import { useFormDirty } from "@/hooks/useFormDirty";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

function PropertyForm({ property, onSave }: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { isDirty, isSubmitting },
    reset,
  } = useForm({
    defaultValues: property || {
      title: "",
      price: "",
      // ...outros campos
    },
  });

  const {
    dirtyBadge,
    showConfirmDialog,
    handleConfirm,
    handleCancel,
  } = useFormDirty(isDirty);

  const onSubmit = async (data) => {
    await onSave(data);
    reset(data); // Reseta o dirty state
  };

  const handleDiscard = () => {
    reset();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2>
          {property ? "Editar" : "Novo"} Imóvel {dirtyBadge}
        </h2>
        {isDirty && (
          <Button variant="ghost" onClick={handleDiscard}>
            Descartar alterações
          </Button>
        )}
      </div>

      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p>⚠️ Você tem alterações não salvas</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Input {...register("title")} placeholder="Título" />
        <Input {...register("price")} placeholder="Preço" />
        {/* ...outros campos */}

        <Button type="submit" disabled={!isDirty || isSubmitting}>
          Salvar
        </Button>
      </form>

      <UnsavedChangesDialog
        open={showConfirmDialog}
        onOpenChange={handleCancel}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
```

---

## ✅ Checklist de Implementação

### Hooks Criados
- [x] `useFormDirty` - Detecção e UI de dirty state
- [x] `useFormDirtyState` - Para formulários controlados
- [x] `useUnsavedChanges` - Atualizado para Wouter
- [x] `useNavigationGuard` - Proteção de navegação

### Componentes Criados
- [x] `UnsavedChangesDialog` - Dialog de confirmação
- [x] `useUnsavedChangesDialog` - Hook imperativo

### Features Implementadas
- [x] Badge vermelho pulsante quando formulário está dirty
- [x] Aviso beforeunload ao fechar/recarregar navegador
- [x] Dialog de confirmação ao navegar entre rotas
- [x] Botão "Descartar alterações"
- [x] Auto-reset do dirty state após salvar
- [x] Compatibilidade com Wouter
- [x] Integração com react-hook-form
- [x] Suporte a formulários controlados

### Exemplos de Integração
- [x] GeneralTab (Settings) - Exemplo completo
- [x] Documentação de uso com Property Form
- [x] Exemplos de uso imperativo

---

## 🎯 Próximos Passos Recomendados

1. **Integrar no GeneralTab atual**
   - Substituir `GeneralTab.tsx` por `GeneralTabWithUnsavedChanges.tsx`
   - Ou aplicar as mudanças manualmente

2. **Aplicar em outros formulários**
   - BrandTab
   - AITab
   - SecurityTab
   - NotificationsTab

3. **Criar PropertyForm dedicado**
   - Extrair lógica do modal em `properties/list.tsx`
   - Aplicar proteção de mudanças não salvas

4. **Testes**
   - Testar beforeunload em diferentes navegadores
   - Testar navegação entre tabs com mudanças não salvas
   - Testar comportamento do badge e dialog

---

## 📚 Textos em Português

Todos os textos estão em português conforme solicitado:

### Dialog de Confirmação
- **Título**: "Alterações não salvas"
- **Descrição**: "Você tem alterações não salvas. Deseja realmente sair sem salvar?"
- **Botão Confirmar**: "Sair sem salvar"
- **Botão Cancelar**: "Continuar editando"

### Banner de Aviso
- **Título**: "Você tem alterações não salvas"
- **Descrição**: "Lembre-se de salvar antes de sair desta página"

### Botão Descartar
- **Texto**: "Descartar alterações"
- **Toast**: "Alterações descartadas. O formulário foi restaurado para o estado anterior."

### Badge/Indicador
- **Title (tooltip)**: "Há alterações não salvas"
- **aria-label**: "Há alterações não salvas"

---

## 🔍 Detalhes de Implementação

### beforeunload Protection

Implementado conforme padrão moderno:

```tsx
useEffect(() => {
  if (!isDirty) return;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = ""; // Chrome requer string vazia
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [isDirty]);
```

**Nota**: Navegadores modernos ignoram mensagens customizadas por segurança.

### Compatibilidade com Wouter

O hook `useUnsavedChanges` foi atualizado para usar `wouter` em vez de `react-router-dom`:

```tsx
import { useLocation } from "wouter";

const [location, setLocation] = useLocation();

const navigate = (to: string) => {
  if (isDirty) {
    // Mostrar dialog
    setPendingLocation(to);
    setShowPrompt(true);
  } else {
    setLocation(to);
  }
};
```

### Visual do Badge

Badge vermelho pulsante com animação CSS:

```tsx
<span
  className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full ml-2 animate-pulse"
  title="Há alterações não salvas"
  aria-label="Há alterações não salvas"
/>
```

---

## 📄 Arquivos de Referência

### Implementação Completa
- `/client/src/pages/settings/tabs/GeneralTabWithUnsavedChanges.tsx`

### Hooks
- `/client/src/hooks/useFormDirty.ts`
- `/client/src/hooks/useUnsavedChanges.ts`

### Componentes
- `/client/src/components/ui/unsaved-changes-dialog.tsx`
- `/client/src/components/ui/confirm-dialog.tsx` (já existente)

---

## ⚡ Performance

Todas as implementações usam:
- `useCallback` para funções estáveis
- `useRef` para valores que não precisam re-render
- `useEffect` com dependências corretas
- Comparação eficiente com `JSON.stringify` (ou custom comparator se necessário)

---

## 🎨 Acessibilidade

- Badge com `aria-label` e `title`
- Dialog com semântica correta (AlertDialog)
- Botões com estados disabled apropriados
- Cores contrastantes (amber/yellow para avisos)
- Ícones com significado visual

---

## 🌐 Internacionalização (Futuro)

Para adicionar suporte a múltiplos idiomas no futuro:

```tsx
const messages = {
  pt: {
    unsavedChanges: "Alterações não salvas",
    confirmLeave: "Você tem alterações não salvas. Deseja realmente sair?",
    // ...
  },
  en: {
    unsavedChanges: "Unsaved changes",
    confirmLeave: "You have unsaved changes. Do you really want to leave?",
    // ...
  }
};

const { dirtyBadge } = useFormDirty(isDirty, {
  title: messages[locale].unsavedChanges,
  message: messages[locale].confirmLeave
});
```

---

**Data de Criação**: 28/12/2024
**Agente**: AGENTE 5 - Form State Management Expert
**Status**: ✅ Implementação Completa

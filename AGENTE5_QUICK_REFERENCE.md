# AGENTE 5 - Quick Reference Guide

## 🚀 Início Rápido (2 minutos)

### Para React Hook Form

```tsx
import { useForm } from "react-hook-form";
import { useFormDirty } from "@/hooks/useFormDirty";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

function MyForm() {
  const { formState: { isDirty }, handleSubmit, reset } = useForm();
  const { dirtyBadge, showConfirmDialog, handleConfirm, handleCancel } = useFormDirty(isDirty);

  const onSubmit = async (data) => {
    await saveData(data);
    reset(data); // ← Importante: reseta o dirty state
  };

  return (
    <>
      <h1>Meu Formulário {dirtyBadge}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* seus campos */}
      </form>
      <UnsavedChangesDialog
        open={showConfirmDialog}
        onOpenChange={handleCancel}
        onConfirm={handleConfirm}
      />
    </>
  );
}
```

### Para Formulário Controlado

```tsx
import { useState } from "react";
import { useFormDirtyState } from "@/hooks/useFormDirty";

function MyForm({ initialData, onSave }) {
  const [formData, setFormData] = useState(initialData);
  const { isDirty, resetDirty } = useFormDirtyState(formData, initialData);

  const handleSave = async () => {
    await onSave(formData);
    resetDirty(); // ← Marca como salvo
  };

  return (
    <>
      {isDirty && <div className="bg-amber-50 p-4">⚠️ Alterações não salvas</div>}
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <button onClick={handleSave}>Salvar</button>
    </>
  );
}
```

---

## 📦 Componentes Criados

| Arquivo | Descrição |
|---------|-----------|
| `/client/src/hooks/useFormDirty.ts` | Hook principal com badge e navegação protegida |
| `/client/src/hooks/useUnsavedChanges.ts` | Hook atualizado para Wouter |
| `/client/src/components/ui/unsaved-changes-dialog.tsx` | Dialog de confirmação estilizado |
| `/client/src/pages/settings/tabs/GeneralTabWithUnsavedChanges.tsx` | Exemplo completo de integração |

---

## ✅ Features Implementadas

1. **Badge vermelho pulsante** quando formulário está dirty
2. **Aviso beforeunload** ao tentar fechar/recarregar o navegador
3. **Dialog de confirmação** ao navegar para outra rota
4. **Botão "Descartar alterações"** para reset rápido
5. **Auto-reset** do dirty state após salvar com sucesso
6. **Compatível com Wouter** (router atual do projeto)
7. **Suporte a react-hook-form** e formulários controlados

---

## 🎯 Como Aplicar nos Formulários Existentes

### 1. Settings > GeneralTab

```tsx
import { useFormDirtyState } from "@/hooks/useFormDirty";

// No componente:
const { isDirty, resetDirty } = useFormDirtyState(formData, initialData);

// No handleSave:
const handleSave = async () => {
  await onSave(formData);
  resetDirty(); // ← Adicionar esta linha
  toast.crud.saved("Configurações");
};

// Adicionar beforeunload:
useEffect(() => {
  if (!isDirty) return;
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [isDirty]);

// Adicionar badge no título:
<SettingsCard
  title={
    <div className="flex items-center gap-2">
      <span>Dados da Empresa</span>
      {isDirty && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
    </div>
  }
  onSave={handleSave}
>
```

### 2. Properties Form (futuro)

```tsx
import { useForm } from "react-hook-form";
import { useFormDirty } from "@/hooks/useFormDirty";

const { formState: { isDirty }, handleSubmit, reset } = useForm();
const { dirtyBadge, showConfirmDialog, handleConfirm, handleCancel } = useFormDirty(isDirty);

const onSubmit = async (data) => {
  await onSave(data);
  reset(data);
};
```

### 3. Qualquer Outro Formulário

**Com react-hook-form:**
```tsx
const { formState: { isDirty } } = useForm();
const { dirtyBadge } = useFormDirty(isDirty);
```

**Sem react-hook-form:**
```tsx
const { isDirty } = useFormDirtyState(formData, initialData);
```

---

## 🎨 Snippets Prontos

### Banner de Alterações Não Salvas

```tsx
{isDirty && (
  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
    <div className="flex items-center gap-2 flex-1">
      <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Você tem alterações não salvas
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          Lembre-se de salvar antes de sair desta página
        </p>
      </div>
    </div>
    <Button variant="outline" onClick={handleDiscard}>
      <XCircle className="w-4 h-4 mr-2" />
      Descartar alterações
    </Button>
  </div>
)}
```

### Badge Pulsante

```tsx
{isDirty && (
  <span
    className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full ml-2 animate-pulse"
    title="Há alterações não salvas"
    aria-label="Há alterações não salvas"
  />
)}
```

### Botão Descartar Alterações

```tsx
{isDirty && (
  <Button variant="ghost" onClick={handleDiscard}>
    <XCircle className="w-4 h-4 mr-2" />
    Descartar alterações
  </Button>
)}
```

---

## 🔧 Troubleshooting

### "Aviso não aparece ao fechar navegador"

✅ **Solução**: Certifique-se de que `isDirty` está `true` e o listener foi adicionado:

```tsx
useEffect(() => {
  if (!isDirty) return;
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [isDirty]);
```

### "Dialog não aparece ao navegar"

✅ **Solução**: Use o hook `useFormDirty` completo e renderize o dialog:

```tsx
const { showConfirmDialog, handleConfirm, handleCancel } = useFormDirty(isDirty);

// No JSX:
<UnsavedChangesDialog
  open={showConfirmDialog}
  onOpenChange={handleCancel}
  onConfirm={handleConfirm}
/>
```

### "Badge continua aparecendo após salvar"

✅ **Solução**: Chame `resetDirty()` ou `reset(data)` após salvar:

```tsx
const handleSave = async () => {
  await onSave(formData);
  resetDirty(); // ← Importante
};
```

### "isDirty sempre false"

✅ **Solução com react-hook-form**: Use `formState.isDirty`

```tsx
const { formState: { isDirty } } = useForm();
```

✅ **Solução com controlled form**: Use `useFormDirtyState`

```tsx
const { isDirty } = useFormDirtyState(formData, initialData);
```

---

## 📝 Textos em Português

### Dialog
- **Título**: "Alterações não salvas"
- **Descrição**: "Você tem alterações não salvas. Deseja realmente sair sem salvar?"
- **Confirmar**: "Sair sem salvar"
- **Cancelar**: "Continuar editando"

### Banner
- **Título**: "Você tem alterações não salvas"
- **Subtítulo**: "Lembre-se de salvar antes de sair desta página"

### Botão
- **Texto**: "Descartar alterações"

### Toast (sugestão)
```tsx
toast({
  title: "Alterações descartadas",
  description: "O formulário foi restaurado para o estado anterior."
});
```

---

## 🎯 Checklist de Implementação

Ao integrar em um novo formulário:

- [ ] Importar hook apropriado (`useFormDirty` ou `useFormDirtyState`)
- [ ] Adicionar badge no título: `{dirtyBadge}`
- [ ] Adicionar listener beforeunload
- [ ] Adicionar banner de aviso (opcional mas recomendado)
- [ ] Adicionar botão "Descartar alterações" (opcional)
- [ ] Chamar `resetDirty()` após salvar com sucesso
- [ ] Renderizar `<UnsavedChangesDialog />` se usar navegação protegida
- [ ] Testar fechamento do navegador
- [ ] Testar navegação entre páginas
- [ ] Testar salvamento e reset do estado

---

## 📚 Documentação Completa

Consulte `AGENTE5_FORM_STATE_MANAGEMENT_IMPLEMENTATION.md` para:
- API completa de todos os hooks
- Exemplos avançados
- Detalhes de implementação
- Considerações de performance
- Roadmap futuro

---

**Criado por**: AGENTE 5 - Form State Management Expert
**Data**: 28/12/2024

# Toast Notifications - Quick Reference Guide

> **AGENTE 4** - Toast Notifications Architect | December 28, 2024

---

## 🚀 Quick Start

```typescript
import { toast } from "@/lib/toast-helpers";

// Basic usage
toast.success("Success!");
toast.error("Error!");
toast.warning("Warning!");
toast.info("Info!");
```

---

## 📦 Common Patterns

### CRUD Operations
```typescript
toast.crud.created("Lead");      // "Lead criado com sucesso"
toast.crud.updated("Imóvel");    // "Imóvel atualizado com sucesso"
toast.crud.deleted("Contrato");  // "Contrato excluído com sucesso"
toast.crud.saved("Dados");       // "Dados salvos com sucesso"
toast.crud.archived("Item");     // "Item arquivado"
```

### User Actions
```typescript
toast.action.copied("Link");        // "Link copiado"
toast.action.linkCopied();          // Shorthand for links
toast.action.shared("Imóvel");      // "Imóvel compartilhado"
toast.action.downloaded("PDF");     // "PDF baixado"
toast.action.uploaded("Arquivo");   // "Arquivo enviado com sucesso"
toast.action.sent("WhatsApp");      // "WhatsApp enviado"
toast.action.favorited("Imóvel");   // "Imóvel favoritado"
toast.action.refreshed("Dados");    // "Dados atualizados"
```

### Error Handling
```typescript
toast.errors.operation("salvar");       // "Erro ao salvar"
toast.errors.validation("Campo X...");  // "Erro de validação"
toast.errors.network();                 // "Erro de conexão"
toast.errors.permission();              // "Acesso negado"
toast.errors.notFound("Item");          // "Item não encontrado"
```

### Warnings
```typescript
toast.warnings.unsavedChanges();        // "Alterações não salvas"
toast.warnings.incompleteData();        // "Dados incompletos"
toast.warnings.custom("Title", "Desc"); // Custom warning
```

---

## ⚡ Advanced Features

### Promise-based (Async Operations)
```typescript
await toast.promise(
  saveData(),
  {
    loading: "Salvando...",
    success: "Salvo!",
    error: "Erro ao salvar",
  }
);

// With dynamic messages
await toast.promise(
  fetchUser(id),
  {
    loading: "Carregando...",
    success: (user) => `Bem-vindo, ${user.name}!`,
    error: (err) => `Erro: ${err.message}`,
  }
);
```

### Action Buttons
```typescript
toast.withAction(
  "Item excluído",
  "Desfazer",
  () => restoreItem(id)
);
```

### Confirmation
```typescript
toast.confirm(
  "Excluir este item?",
  () => deleteItem(id),
  () => console.log("Cancelado")
);
```

### Loading State
```typescript
const toastId = toast.loading("Processando...");
// Later...
toast.dismiss(toastId);
```

---

## 🎨 Visual Specs

| Type | Icon | Color | Duration |
|------|------|-------|----------|
| Success | ✅ CheckCircle2 | Green | 4s |
| Error | ❌ XCircle | Red | 5s |
| Warning | ⚠️ AlertTriangle | Yellow | 4.5s |
| Info | ℹ️ Info | Blue | 4s |
| Loading | ⏳ Loader2 | Gray | ∞ |

---

## 📋 Migration Cheat Sheet

### Before → After

```typescript
// Before
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();
toast({ title: "Success", description: "Saved" });

// After
import { toast } from "@/lib/toast-helpers";
toast.crud.saved("Data");
```

```typescript
// Before
toast({
  title: "Lead created!",
  description: "The lead was added to the system.",
});

// After
toast.crud.created("Lead");
```

```typescript
// Before
toast({
  title: "Error",
  description: "Failed to save",
  variant: "destructive",
});

// After
toast.errors.operation("salvar");
```

```typescript
// Before
toast({ title: "Link copied to clipboard" });

// After
toast.action.linkCopied();
```

---

## 🎯 Best Practices

### ✅ DO
```typescript
// Use semantic helpers
toast.crud.created("Lead");
toast.action.linkCopied();

// Use promise toasts for async
await toast.promise(saveData(), {...});

// Provide context in errors
toast.errors.operation("salvar o imóvel");

// Use action buttons for undo
toast.withAction("Deleted", "Undo", restore);
```

### ❌ DON'T
```typescript
// Don't use generic messages
toast.success("Success!");

// Don't manually handle loading states
const id = toast.loading("...");
try { ... } finally { toast.dismiss(id); }

// Don't create vague errors
toast.error("Error");

// Don't make messages too long
toast.success("The property has been successfully...");
```

---

## 🔧 Common Use Cases

### Form Submission
```typescript
const handleSubmit = async (data) => {
  // Validation
  if (!data.name) {
    toast.errors.validation("Nome é obrigatório");
    return;
  }

  // Save with promise toast
  await toast.promise(
    saveForm(data),
    {
      loading: "Salvando...",
      success: "Formulário salvo!",
      error: "Erro ao salvar",
    }
  );
};
```

### Delete with Undo
```typescript
const handleDelete = async (id: string) => {
  await deleteItem(id);

  toast.withAction(
    "Item excluído",
    "Desfazer",
    async () => {
      await restoreItem(id);
      await refetch();
      toast.success("Item restaurado");
    }
  );
};
```

### Copy to Clipboard
```typescript
const handleCopy = (text: string) => {
  navigator.clipboard.writeText(text)
    .then(() => toast.action.linkCopied())
    .catch(() => toast.errors.operation("copiar"));
};
```

### Bulk Operations
```typescript
const handleBulkDelete = async (ids: string[]) => {
  await toast.promise(
    Promise.all(ids.map(id => deleteItem(id))),
    {
      loading: `Excluindo ${ids.length} itens...`,
      success: `${ids.length} itens excluídos!`,
      error: "Erro na exclusão",
    }
  );
};
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Toast not showing | Check `<Toaster />` in App.tsx |
| Icons not rendering | Verify Lucide React installed |
| Wrong colors | Enable `richColors` on Toaster |
| Not auto-dismissing | Loading toasts require manual dismiss |

---

## 📚 Full API

```typescript
// Core
toast.success(message, description?)
toast.error(message, description?)
toast.warning(message, description?)
toast.info(message, description?)
toast.loading(message, description?)
toast.dismiss(toastId?)

// CRUD
toast.crud.created(item)
toast.crud.updated(item)
toast.crud.deleted(item)
toast.crud.saved(item)
toast.crud.archived(item)

// Actions
toast.action.copied(item)
toast.action.linkCopied()
toast.action.shared(item)
toast.action.downloaded(item)
toast.action.uploaded(item)
toast.action.sent(item)
toast.action.favorited(item)
toast.action.refreshed(item)

// Errors
toast.errors.operation(action)
toast.errors.validation(message?)
toast.errors.network()
toast.errors.permission()
toast.errors.notFound(item)

// Warnings
toast.warnings.unsavedChanges()
toast.warnings.incompleteData()
toast.warnings.custom(title, desc?)

// Advanced
toast.promise(promise, messages)
toast.withAction(msg, label, action, desc?)
toast.confirm(msg, onConfirm, onCancel?, desc?)
toast.custom(options)
```

---

## 📖 Examples

### Settings Save
```typescript
// /client/src/pages/settings/tabs/GeneralTab.tsx
try {
  await onSave(formData);
  toast.crud.saved("Configurações");
} catch {
  toast.errors.operation("salvar as configurações");
}
```

### Property Create/Update
```typescript
// /client/src/pages/properties/list.tsx
if (editingProperty) {
  toast.crud.updated("Imóvel");
} else {
  toast.crud.created("Imóvel");
}
```

### Lead Management
```typescript
// /client/src/pages/leads/kanban.tsx
toast.crud.created("Lead");
toast.crud.updated("Lead");
toast.errors.operation("salvar o lead");
```

---

**Need more details?** See [AGENTE_4_TOAST_NOTIFICATIONS_DOCUMENTATION.md](./AGENTE_4_TOAST_NOTIFICATIONS_DOCUMENTATION.md)

**Library**: Sonner v2.0.7 | **Status**: ✅ Production Ready

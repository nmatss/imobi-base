# AGENTE 8 - Guia Rápido para Desenvolvedores

**Quick Reference Guide** - Feedback Visual & Performance

---

## 🚀 Imports Essenciais

```tsx
// Loading States
import { PageLoader, InlineLoader, CardLoader, OverlayLoader } from "@/components/ui/page-loader";

// Toast Notifications
import { useToastFeedback, toastHelpers } from "@/hooks/useToastFeedback";

// Confirm Dialog
import { ConfirmDialog, useConfirmDialog } from "@/components/ui/confirm-dialog";

// Skeleton Loaders
import {
  PropertyCardSkeleton,
  PropertyGridSkeleton,
  DashboardSkeleton,
  KanbanBoardSkeleton,
  TableSkeleton,
  FinancialPageSkeleton
} from "@/components/ui/skeleton-loaders";

import {
  ChartSkeleton,
  PieChartSkeleton,
  LineChartSkeleton,
  ChartCardSkeleton
} from "@/components/ui/chart-skeleton";

// Virtual Scrolling
import { VirtualizedList } from "@/components/VirtualizedList";
```

---

## ⚡ Snippets de Código

### 1. Botão com Loading
```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <InlineLoader size="sm" className="mr-2" />
      Salvando...
    </>
  ) : (
    "Salvar"
  )}
</Button>
```

### 2. Toast de Sucesso/Erro
```tsx
const toast = useToastFeedback();

// Sucesso
toast.success("Operação concluída!");

// Erro
toast.error("Erro ao processar");

// Com promise
toast.promise(saveData(), {
  loading: "Salvando...",
  success: "Salvo!",
  error: "Erro ao salvar"
});
```

### 3. Helper CRUD
```tsx
import { toastHelpers } from "@/hooks/useToastFeedback";

toastHelpers.created("Lead");    // "Lead criado com sucesso"
toastHelpers.updated("Imóvel");  // "Imóvel atualizado com sucesso"
toastHelpers.deleted("Contrato"); // "Contrato deletado com sucesso"
```

### 4. Confirm Dialog
```tsx
const { confirm, dialog } = useConfirmDialog();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: "Excluir?",
    description: "Ação irreversível",
    variant: "destructive"
  });

  if (confirmed) {
    await deleteItem();
  }
};

return (
  <>
    {dialog}
    <Button onClick={handleDelete}>Excluir</Button>
  </>
);
```

### 5. Skeleton Loader
```tsx
{isLoading ? (
  <ChartSkeleton />
) : (
  <BarChart data={data} />
)}
```

### 6. Virtual List
```tsx
<VirtualizedList
  items={items}
  estimateSize={100}
  height="600px"
  renderItem={(item) => <ItemCard item={item} />}
/>
```

---

## 📋 Checklist: Nova Feature

Ao criar uma nova feature, implementar:

- [ ] Loading state no botão (InlineLoader)
- [ ] Toast de sucesso/erro
- [ ] Confirm dialog se for ação destrutiva
- [ ] Skeleton loader durante carregamento
- [ ] Lazy loading se for rota nova
- [ ] Virtual scrolling se lista >50 itens
- [ ] Hover states nos elementos interativos

---

## 🎯 Padrões por Tipo de Operação

### CREATE
```tsx
const handleCreate = async () => {
  toast.promise(
    createItem(data),
    {
      loading: "Criando...",
      success: "Item criado!",
      error: "Erro ao criar"
    }
  );
};
```

### UPDATE
```tsx
const handleUpdate = async () => {
  toast.promise(
    updateItem(id, data),
    {
      loading: "Salvando...",
      success: "Alterações salvas!",
      error: "Erro ao salvar"
    }
  );
};
```

### DELETE
```tsx
const { confirm, dialog } = useConfirmDialog();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: "Excluir item?",
    description: "Esta ação não pode ser desfeita",
    variant: "destructive"
  });

  if (!confirmed) return;

  toast.promise(
    deleteItem(id),
    {
      loading: "Excluindo...",
      success: "Item excluído!",
      error: "Erro ao excluir"
    }
  );
};

return <>{dialog}<Button onClick={handleDelete}>Excluir</Button></>;
```

---

## 🔍 Quando Usar Cada Componente

### PageLoader
- ✅ Página completa carregando
- ✅ Loading inicial (sem dados)
- ❌ NÃO usar para recarregamento de dados

### InlineLoader
- ✅ Botões durante ação
- ✅ Small components
- ❌ NÃO usar para páginas

### Skeleton Loader
- ✅ Carregamento de dados
- ✅ Preservar layout
- ✅ Evitar CLS
- ❌ NÃO usar para erros

### Toast
- ✅ Feedback de ação
- ✅ Sucesso/erro/warning
- ✅ Notificações
- ❌ NÃO usar para erros críticos

### Confirm Dialog
- ✅ Ações destrutivas
- ✅ Exclusões
- ✅ Mudanças irreversíveis
- ❌ NÃO usar para confirmações simples

### Virtual List
- ✅ Listas com 50+ itens
- ✅ Performance crítica
- ❌ NÃO usar para listas pequenas

---

## 🎨 Classes Tailwind Úteis

### Hover States
```tsx
className="hover:bg-muted hover:shadow-md transition-all duration-200"
```

### Active States (Mobile)
```tsx
className="active:scale-95 transition-transform"
```

### Loading States
```tsx
className="animate-pulse"
className="animate-spin"
```

---

## 📱 Responsividade

### Tamanhos de Loading
```tsx
// Mobile
<InlineLoader size="sm" />

// Desktop
<InlineLoader size="md" />
```

### Skeleton Responsivo
```tsx
<Skeleton className="h-4 w-full sm:w-3/4 lg:w-1/2" />
```

---

## 🐛 Troubleshooting

### Toast não aparece
✅ Verificar se `<Toaster />` está no App.tsx
✅ Verificar posição do Toaster (`top-right`)

### Skeleton não reserva espaço
✅ Definir altura fixa no skeleton
✅ Usar mesma altura do conteúdo final

### Virtual List pula itens
✅ Ajustar `estimateSize` para altura real dos itens
✅ Aumentar `overscan` se necessário

### Lazy Loading não funciona
✅ Verificar se está dentro de `<Suspense>`
✅ Verificar fallback do Suspense

---

## 📊 Performance Tips

### Bundle Size
- ✅ Usar lazy loading em rotas
- ✅ Dividir componentes grandes
- ✅ Lazy import de libraries pesadas

### Loading Time
- ✅ Skeleton loaders para percepção
- ✅ Priorizar conteúdo above-the-fold
- ✅ Lazy load de imagens

### Runtime Performance
- ✅ Virtual scrolling em listas longas
- ✅ Memoization de componentes pesados
- ✅ Debounce em searches

---

## 🔗 Links Úteis

- Documentação completa: `AGENTE_8_FEEDBACK_VISUAL_IMPLEMENTATION_EXAMPLES.md`
- Relatório de validação: `AGENTE_8_VALIDATION_REPORT.md`
- Resumo executivo: `AGENTE_8_EXECUTIVE_SUMMARY.md`

---

## ⚠️ Anti-Patterns (NÃO FAZER)

❌ **Toast para erros críticos**
```tsx
// ERRADO
toast.error("Erro fatal no sistema");

// CERTO
<ErrorBoundary fallback={<ErrorPage />} />
```

❌ **Loading sem feedback**
```tsx
// ERRADO
<Button disabled={isLoading}>Salvar</Button>

// CERTO
<Button disabled={isLoading}>
  {isLoading ? <InlineLoader /> : "Salvar"}
</Button>
```

❌ **Skeleton muito diferente do conteúdo**
```tsx
// ERRADO
<Skeleton className="h-4" /> // para um card de 100px

// CERTO
<CardLoader /> // skeleton específico
```

❌ **Confirm dialog para tudo**
```tsx
// ERRADO
const confirmed = await confirm({ title: "Salvar?" });

// CERTO
// Apenas para ações destrutivas/irreversíveis
```

---

## ✅ Best Practices

### 1. Loading States
✅ Sempre mostrar feedback visual
✅ Usar skeleton para dados
✅ Usar spinner para ações

### 2. Toast Messages
✅ Mensagens claras e objetivas
✅ Usar helpers CRUD
✅ Promise toast para async

### 3. Confirm Dialogs
✅ Apenas para ações destrutivas
✅ Descrição clara da consequência
✅ Variant "destructive" para exclusões

### 4. Performance
✅ Lazy load rotas
✅ Virtual scroll listas >50
✅ Memoize componentes pesados

---

**Última Atualização:** 2024-12-28
**Versão:** 1.0

# Quick Tips - Sistema de Feedback Visual

## Cheat Sheet Rápido para Desenvolvedores

### 1. Toast Notifications

```typescript
import { useToast } from "@/hooks/use-toast-enhanced";

const toast = useToast();

// Básicos
toast.success("Sucesso!", "Descrição");
toast.error("Erro!", "Descrição");
toast.warning("Aviso!", "Descrição");
toast.info("Info!", "Descrição");

// Loading
const id = toast.loading("Carregando...");
// ... depois
toast.dismiss(id);

// Promise (automático)
toast.promise(asyncFn(), {
  loading: "Salvando...",
  success: "Salvo!",
  error: "Erro!"
});
```

### 2. Confirmação

```typescript
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Opção 1: Declarativo
const [open, setOpen] = useState(false);
const [loading, setLoading] = useState(false);

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Confirmar?"
  description="Descrição"
  onConfirm={async () => {
    setLoading(true);
    await deleteItem();
    setLoading(false);
  }}
  isLoading={loading}
  variant="destructive"
/>

// Opção 2: Imperativo (mais simples)
const { confirm, dialog } = useConfirmDialog();

const handleDelete = async () => {
  const ok = await confirm({
    title: "Confirmar?",
    description: "Descrição",
    variant: "destructive"
  });
  if (ok) await deleteItem();
};

return <>{dialog}</>;
```

### 3. Loading em Botões

```typescript
import { Button } from "@/components/ui/button";

const [loading, setLoading] = useState(false);

<Button isLoading={loading} onClick={handleClick}>
  Salvar
</Button>
```

### 4. Skeleton Loaders

```typescript
import { PropertyGridSkeleton } from "@/components/ui/skeleton-loaders";

if (loading) return <PropertyGridSkeleton count={6} />;
return <PropertyGrid data={data} />;
```

### 5. Padrão Completo de Formulário

```typescript
function MyForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      await saveData(data);
      toast.success("Salvo!", "Dados salvos com sucesso.");
    } catch (error) {
      toast.error("Erro!", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* campos */}
      <Button type="submit" isLoading={loading}>
        Salvar
      </Button>
    </form>
  );
}
```

### 6. Padrão Completo de Delete

```typescript
function DeleteButton({ id }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Excluir item?",
      description: "Não pode ser desfeito.",
      variant: "destructive"
    });

    if (!ok) return;

    try {
      await deleteItem(id);
      toast.success("Excluído!", "Item removido.");
    } catch (error) {
      toast.error("Erro!", error.message);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={handleDelete}>
        Excluir
      </Button>
      {dialog}
    </>
  );
}
```

## Componentes Skeleton Disponíveis

```typescript
import {
  PropertyCardSkeleton,      // Card único
  PropertyGridSkeleton,       // Grid 3 colunas
  DashboardSkeleton,          // Dashboard completo
  KanbanBoardSkeleton,        // Kanban completo
  KanbanColumnSkeleton,       // Coluna Kanban
  KanbanCardSkeleton,         // Card Kanban
  TableSkeleton,              // Tabela
  ListItemSkeleton,           // Item de lista
  FormSkeleton,               // Formulário
  DashboardCardSkeleton,      // Card estatística
  PropertyDetailsSkeleton,    // Detalhes imóvel
} from "@/components/ui/skeleton-loaders";
```

## Quando Usar Cada Tipo

### Toast
- ✅ Confirmação de ação (salvar, criar, editar)
- ✅ Erro em operação
- ✅ Aviso ao usuário
- ✅ Informação não crítica

### Confirm Dialog
- ✅ Ações destrutivas (delete, cancel)
- ✅ Ações irreversíveis
- ✅ Ações com consequências importantes
- ❌ Ações simples que podem ser desfeitas

### Loading Button
- ✅ Submit de formulário
- ✅ Ações que levam tempo (API calls)
- ✅ Downloads/uploads
- ❌ Navegação simples

### Skeleton
- ✅ Carregamento inicial de página
- ✅ Carregamento de listas/grids
- ✅ Reload de dados
- ❌ Ações rápidas (<500ms)

## Regras de Ouro

1. **Sempre use toast após ações importantes**
   ```typescript
   await saveData();
   toast.success("Salvo!"); // ✅ Sempre
   ```

2. **Sempre confirme ações destrutivas**
   ```typescript
   await confirm({ ... }); // ✅ Antes de deletar
   await deleteItem();
   ```

3. **Sempre mostre loading em operações assíncronas**
   ```typescript
   <Button isLoading={loading}> // ✅ Sempre
   ```

4. **Sempre use skeleton ao carregar listas/grids**
   ```typescript
   if (loading) return <Skeleton />; // ✅ Sempre
   ```

5. **Mensagens devem ser claras e específicas**
   ```typescript
   // ❌ Ruim
   toast.success("Sucesso!");

   // ✅ Bom
   toast.success("Imóvel criado!", "O imóvel foi adicionado ao sistema.");
   ```

## Exemplos Reais do Sistema

### Criar Imóvel
```typescript
// Ver: /client/src/pages/properties/list.tsx linha ~320
toast.success(
  "Imóvel criado com sucesso!",
  "O imóvel foi cadastrado no sistema."
);
```

### Excluir Imóvel
```typescript
// Ver: /client/src/pages/properties/list.tsx linha ~375
<ConfirmDialog
  title="Confirmar Exclusão"
  description="Tem certeza que deseja excluir este imóvel?"
  onConfirm={handleDelete}
  variant="destructive"
  isLoading={isDeleting}
/>
```

### Criar Lead
```typescript
// Ver: /client/src/pages/leads/kanban.tsx linha ~627
toast.success(
  "Lead criado!",
  "O lead foi adicionado ao sistema."
);
```

## Troubleshooting

### Toast não aparece
- ✅ Verificar se `<Toaster />` está em App.tsx
- ✅ Verificar import: `@/hooks/use-toast-enhanced`
- ✅ Verificar se está usando hook ou import direto

### Loading não funciona em Button
- ✅ Verificar prop: `isLoading={...}`
- ✅ Verificar se button.tsx foi atualizado
- ✅ Verificar se Spinner está importado

### Skeleton não aparece
- ✅ Verificar condição: `if (loading) return <Skeleton />`
- ✅ Verificar import do skeleton correto
- ✅ Verificar se loading state está sendo atualizado

### Confirm Dialog não fecha
- ✅ Passar `onOpenChange={setOpen}`
- ✅ Fechar no onConfirm: `setOpen(false)`
- ✅ Verificar se promise foi resolvida

## Referências

- Documentação completa: `/FEEDBACK_VISUAL_GUIDE.md`
- Exemplos práticos: `/client/src/components/examples/FeedbackExamples.tsx`
- Relatório técnico: `/AGENT_4_FEEDBACK_VISUAL_REPORT.md`
- Sonner docs: https://sonner.emilkowal.ski/
- Radix UI docs: https://www.radix-ui.com/

---

**Pro Tip:** Mantenha este arquivo aberto ao lado do código para referência rápida!

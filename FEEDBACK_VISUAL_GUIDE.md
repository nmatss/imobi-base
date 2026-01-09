# Sistema de Feedback Visual - ImobiBase

## Visão Geral

Este documento descreve o sistema completo de feedback visual implementado no ImobiBase. O sistema fornece feedback claro e consistente para todas as ações do usuário, melhorando significativamente a experiência de uso.

---

## 1. Toast Notifications (Sonner)

### Hook Melhorado: `useToast`

Localização: `/client/src/hooks/use-toast-enhanced.ts`

O hook `useToast` fornece métodos tipados para mostrar notificações toast:

```typescript
import { useToast } from "@/hooks/use-toast-enhanced";

function MyComponent() {
  const toast = useToast();

  // Sucesso
  toast.success("Operação concluída!", "Descrição opcional");

  // Erro
  toast.error("Erro ao processar", "Detalhes do erro");

  // Aviso
  toast.warning("Atenção", "Verifique os dados");

  // Informação
  toast.info("Nova atualização disponível", "Versão 2.0");

  // Loading
  const loadingToast = toast.loading("Processando...");
  // Depois: toast.dismiss(loadingToast);

  // Promise (mostra loading, success ou error automaticamente)
  toast.promise(
    saveData(),
    {
      loading: "Salvando...",
      success: "Dados salvos!",
      error: "Erro ao salvar"
    }
  );
}
```

### Uso sem hook (import direto)

```typescript
import { toast } from "@/hooks/use-toast-enhanced";

// Em qualquer lugar do código
toast.success("Lead criado!");
toast.error("Erro ao carregar dados");
```

### Configuração no App

O Toaster está configurado em `/client/src/App.tsx`:

```tsx
<Toaster position="top-right" richColors closeButton />
```

---

## 2. Diálogos de Confirmação

### Componente: `ConfirmDialog`

Localização: `/client/src/components/ui/confirm-dialog.tsx`

Usado para confirmar ações destrutivas (delete, cancel, etc):

```tsx
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function MyComponent() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem();
      toast.success("Item excluído!");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setConfirmOpen(true)}>Excluir</Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir imóvel?"
        description="Esta ação não pode ser desfeita. O imóvel será permanentemente removido."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
```

### Hook Imperativo: `useConfirmDialog`

Para uso mais simples sem gerenciar estado manualmente:

```tsx
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

function MyComponent() {
  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Excluir imóvel?",
      description: "Esta ação não pode ser desfeita.",
      variant: "destructive"
    });

    if (confirmed) {
      await deleteItem();
      toast.success("Item excluído!");
    }
  };

  return (
    <>
      <Button onClick={handleDelete}>Excluir</Button>
      {dialog}
    </>
  );
}
```

---

## 3. Loading States em Botões

### Prop `isLoading` no Button

Localização: `/client/src/components/ui/button.tsx`

Todos os botões agora suportam a prop `isLoading`:

```tsx
import { Button } from "@/components/ui/button";

function MyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await saveData();
      toast.success("Dados salvos!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      isLoading={isSubmitting}
      onClick={handleSubmit}
    >
      Salvar
    </Button>
  );
}
```

O botão automaticamente:
- Mostra um spinner
- Fica desabilitado
- Mantém o texto visível

---

## 4. Skeleton Loaders

### Componentes Skeleton

Localização: `/client/src/components/ui/skeleton-loaders.tsx`

Diversos componentes skeleton para diferentes contextos:

```tsx
import {
  PropertyCardSkeleton,
  PropertyGridSkeleton,
  DashboardSkeleton,
  KanbanBoardSkeleton,
  TableSkeleton,
  FormSkeleton,
} from "@/components/ui/skeleton-loaders";

function MyComponent() {
  const { data, loading } = useData();

  if (loading) {
    return <PropertyGridSkeleton count={6} />;
  }

  return <PropertyGrid data={data} />;
}
```

### Skeletons Disponíveis

- `PropertyCardSkeleton` - Card individual de imóvel
- `PropertyGridSkeleton` - Grid de imóveis (3 colunas)
- `DashboardSkeleton` - Dashboard completo com cards e gráficos
- `KanbanCardSkeleton` - Card individual no Kanban
- `KanbanColumnSkeleton` - Coluna do Kanban
- `KanbanBoardSkeleton` - Board Kanban completo
- `ListItemSkeleton` - Item de lista
- `TableSkeleton` - Tabela com linhas e colunas
- `DashboardCardSkeleton` - Card de estatística
- `FormSkeleton` - Formulário com campos
- `PropertyDetailsSkeleton` - Página de detalhes de imóvel

### Skeleton Base

Para casos personalizados, use o componente base:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

<Skeleton className="h-4 w-full" />
<Skeleton className="h-20 w-20 rounded-full" />
```

---

## 5. Feedback em Formulários

### Erros Inline

Os campos já exibem erros inline automaticamente quando usados com React Hook Form:

```tsx
import { useForm } from "react-hook-form";
import { Field } from "@/components/ui/field";

function MyForm() {
  const { register, formState: { errors } } = useForm();

  return (
    <Field
      label="Nome"
      error={errors.name?.message}
    >
      <Input {...register("name", { required: "Nome é obrigatório" })} />
    </Field>
  );
}
```

### Mensagens de Sucesso/Erro

Use toast após submit do formulário:

```tsx
const handleSubmit = async (data) => {
  setIsSubmitting(true);
  try {
    await saveData(data);
    toast.success("Dados salvos!", "O formulário foi enviado com sucesso.");
    reset(); // Limpa o formulário
  } catch (error) {
    toast.error("Erro ao salvar", error.message);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## 6. Indicadores de Estado no Menu

### Sidebar com Estado Ativo

Localização: `/client/src/components/layout/dashboard-layout.tsx`

O menu lateral já possui indicadores de estado ativo implementados:

```tsx
const isActive = location === item.href || location.startsWith(`${item.href}/`);

<div className={`... ${
  isActive
    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
    : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
}`}>
  {/* Conteúdo do item */}
</div>
```

Características:
- Destaque visual claro na seção atual
- Transições suaves ao navegar
- Suporte para rotas aninhadas (ex: `/properties/123`)
- Estado hover diferenciado

---

## 7. Padrões de Implementação

### Exemplo Completo: Criar/Editar Imóvel

```tsx
function PropertyForm() {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      const response = await saveProperty(data);

      toast.success(
        "Imóvel salvo com sucesso!",
        "O imóvel foi adicionado ao sistema."
      );

      setIsModalOpen(false);
      await refetchProperties();

    } catch (error) {
      toast.error(
        "Erro ao salvar imóvel",
        error.message || "Tente novamente mais tarde."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {/* Campos do formulário */}

          <Button
            type="submit"
            isLoading={isSubmitting}
          >
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Exemplo Completo: Excluir com Confirmação

```tsx
function PropertyCard({ property }) {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteProperty(property.id);

      toast.success(
        "Imóvel excluído!",
        "O imóvel foi removido com sucesso."
      );

      setConfirmOpen(false);
      await refetchProperties();

    } catch (error) {
      toast.error(
        "Erro ao excluir imóvel",
        error.message
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setConfirmOpen(true)}
      >
        Excluir
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir imóvel?"
        description="Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
```

---

## 8. Checklist de Feedback Visual

Use este checklist ao implementar novas features:

### Formulários
- [ ] Campos com validação inline
- [ ] Botão submit com `isLoading`
- [ ] Toast de sucesso após submit
- [ ] Toast de erro em caso de falha
- [ ] Skeleton durante carregamento inicial

### Ações Destrutivas
- [ ] Dialog de confirmação
- [ ] Descrição clara da ação
- [ ] Botão com `isLoading` durante exclusão
- [ ] Toast de sucesso/erro

### Listas e Grids
- [ ] Skeleton durante carregamento
- [ ] Estado vazio (quando não há dados)
- [ ] Loading state ao recarregar
- [ ] Feedback ao adicionar/remover itens

### Navegação
- [ ] Item do menu com estado ativo
- [ ] Transições suaves entre páginas
- [ ] Breadcrumbs quando aplicável

---

## 9. Benefícios Implementados

1. **Feedback Imediato**: Usuário sempre sabe o que está acontecendo
2. **Prevenção de Erros**: Confirmações antes de ações destrutivas
3. **Confiança**: Loading states mostram que o sistema está trabalhando
4. **Contexto**: Mensagens descritivas explicam sucesso/erro
5. **Navegação Clara**: Estado ativo mostra onde o usuário está
6. **Performance Percebida**: Skeletons melhoram sensação de velocidade

---

## 10. Arquivos Criados/Modificados

### Arquivos Criados
- `/client/src/hooks/use-toast-enhanced.ts` - Hook de toast melhorado
- `/client/src/components/ui/confirm-dialog.tsx` - Componente de confirmação
- `/client/src/components/ui/skeleton-loaders.tsx` - Componentes skeleton

### Arquivos Modificados
- `/client/src/App.tsx` - Adicionado Toaster
- `/client/src/components/ui/button.tsx` - Adicionado prop isLoading
- `/client/src/pages/properties/list.tsx` - Implementado feedback completo
- `/client/src/pages/leads/kanban.tsx` - Implementado feedback completo

---

## Suporte

Para dúvidas ou sugestões sobre o sistema de feedback visual, consulte:
- Documentação do Sonner: https://sonner.emilkowal.ski/
- Documentação do Radix UI: https://www.radix-ui.com/

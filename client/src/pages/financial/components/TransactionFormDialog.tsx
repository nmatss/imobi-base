import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { getCSRFToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FinanceCategory, FinanceTransaction } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Transação em edição; null/undefined cria uma nova */
  transaction?: FinanceTransaction | null;
  /** Chamado após salvar com sucesso (refetch) */
  onSaved: () => void | Promise<void>;
};

type FormState = {
  flow: "income" | "expense";
  description: string;
  amount: string;
  entryDate: string; // yyyy-MM-dd
  status: "scheduled" | "completed" | "overdue";
  categoryId: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  flow: "income",
  description: "",
  amount: "",
  entryDate: new Date().toISOString().split("T")[0],
  status: "completed",
  categoryId: "",
  notes: "",
};

export default function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(transaction);

  // Sync form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setForm({
        flow: transaction.flow,
        description: transaction.description,
        amount: transaction.amount,
        entryDate: transaction.entryDate
          ? new Date(transaction.entryDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: transaction.status,
        categoryId: transaction.categoryId || "",
        notes: transaction.notes || "",
      });
    } else {
      setForm({ ...EMPTY_FORM, entryDate: new Date().toISOString().split("T")[0] });
    }
  }, [open, transaction]);

  // Load categories when dialog opens
  useEffect(() => {
    if (!open) return;
    const abortController = new AbortController();
    fetch("/api/finance-categories", {
      credentials: "include",
      signal: abortController.signal,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!abortController.signal.aborted && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {
        /* categorias são opcionais; falha silenciosa */
      });
    return () => abortController.abort();
  }, [open]);

  const categoryTypeForFlow = form.flow;
  const flowCategories = categories.filter(
    (c) => c.type === categoryTypeForFlow || c.id === form.categoryId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNumber = parseFloat(form.amount.replace(",", "."));
    if (!form.description.trim() || isNaN(amountNumber) || amountNumber <= 0 || !form.entryDate) {
      toast({
        title: "Dados inválidos",
        description: "Preencha descrição, valor (maior que zero) e data.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        description: form.description.trim(),
        amount: amountNumber.toFixed(2),
        flow: form.flow,
        entryDate: new Date(`${form.entryDate}T12:00:00`).toISOString(),
        status: form.status,
        categoryId: form.categoryId || null,
        notes: form.notes.trim() || null,
      };
      if (!isEditing) {
        payload.originType = "manual";
      }

      const url = isEditing
        ? `/api/finance-entries/${transaction!.id}`
        : "/api/finance-entries";
      const csrfToken = getCSRFToken();
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Não foi possível salvar a transação.");
      }

      toast({
        title: isEditing ? "Transação atualizada" : "Transação criada",
        description: isEditing
          ? "As alterações foram salvas com sucesso."
          : "A transação foi registrada com sucesso.",
      });
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da transação financeira."
              : "Registre uma receita ou despesa manual."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-flow">Tipo *</Label>
              <Select
                value={form.flow}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, flow: value as FormState["flow"], categoryId: "" }))
                }
              >
                <SelectTrigger id="transaction-flow">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-status">Status *</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, status: value as FormState["status"] }))
                }
              >
                <SelectTrigger id="transaction-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Previsto</SelectItem>
                  <SelectItem value="completed">Realizado</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-description">Descrição *</Label>
            <Input
              id="transaction-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex.: Comissão venda apto 301"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-amount">Valor (R$) *</Label>
              <Input
                id="transaction-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-date">Data *</Label>
              <Input
                id="transaction-date"
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                required
              />
            </div>
          </div>

          {flowCategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="transaction-category">Categoria</Label>
              <Select
                value={form.categoryId || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, categoryId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger id="transaction-category">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {flowCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="transaction-notes">Observações</Label>
            <Textarea
              id="transaction-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Detalhes adicionais (opcional)"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar alterações" : "Criar transação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

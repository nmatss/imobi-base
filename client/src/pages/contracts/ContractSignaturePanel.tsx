import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/lib/toast-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PenLine, Plus, Copy, Trash2, Send, Loader2, Mail } from "lucide-react";

interface Signature {
  id: string;
  signerName: string;
  signerEmail: string;
  signerType?: string | null;
  status: string;
  token: string;
  signedAt?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  viewed: { label: "Visualizado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  signed: { label: "Assinado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Recusado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired: { label: "Expirado", color: "bg-muted text-muted-foreground" },
};

const SIGNER_TYPES = [
  { value: "client", label: "Cliente" },
  { value: "owner", label: "Proprietário" },
  { value: "agency", label: "Imobiliária" },
  { value: "other", label: "Outro" },
];

type NewSigner = { name: string; email: string; type: string };

/**
 * Painel de assinatura eletrônica de um contrato (B2).
 *
 * Usa o fluxo interno por token (sem credencial ClickSign):
 * - GET  /api/contracts/:id/signatures   → lista real de signatários
 * - POST /api/contracts/:id/signatures   → cria solicitações; cada uma gera um
 *   link público /sign/:token para o signatário externo assinar.
 */
export function ContractSignaturePanel({ contractId }: { contractId: string }) {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [signers, setSigners] = useState<NewSigner[]>([
    { name: "", email: "", type: "client" },
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("GET", `/api/contracts/${contractId}/signatures`);
      const data = await res.json();
      setSignatures(Array.isArray(data) ? data : []);
    } catch {
      setSignatures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const signLink = (token: string) => `${window.location.origin}/sign/${token}`;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(signLink(token));
      toast.success("Link copiado", "Envie ao signatário por e-mail ou WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar", "Copie o link manualmente.");
    }
  };

  const updateSigner = (i: number, patch: Partial<NewSigner>) =>
    setSigners((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addRow = () => setSigners((prev) => [...prev, { name: "", email: "", type: "other" }]);
  const removeRow = (i: number) => setSigners((prev) => prev.filter((_, idx) => idx !== i));

  const handleSend = async () => {
    const valid = signers.filter((s) => s.name.trim() && /\S+@\S+\.\S+/.test(s.email));
    if (valid.length === 0) {
      toast.error("Adicione um signatário válido", "Informe nome e e-mail.");
      return;
    }
    setSending(true);
    try {
      await apiRequest("POST", `/api/contracts/${contractId}/signatures`, {
        signers: valid.map((s) => ({ name: s.name.trim(), email: s.email.trim(), type: s.type })),
      });
      toast.success("Enviado para assinatura", "Copie os links e envie aos signatários.");
      setDialogOpen(false);
      setSigners([{ name: "", email: "", type: "client" }]);
      load();
    } catch (error) {
      let description = "Tente novamente.";
      if (error instanceof Error) {
        const body = error.message.replace(/^\d+:\s*/, "");
        try {
          const parsed = JSON.parse(body);
          if (parsed?.error) description = parsed.error;
        } catch {
          if (body) description = body;
        }
      }
      toast.error("Não foi possível enviar", description);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-3 pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          Assinatura eletrônica
        </CardTitle>
        <Button size="sm" className="h-8" onClick={() => setDialogOpen(true)}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Enviar para assinatura
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : signatures.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma assinatura solicitada. Clique em “Enviar para assinatura” para
            gerar um link seguro para cada signatário.
          </p>
        ) : (
          <div className="space-y-2">
            {signatures.map((sig) => {
              const cfg = STATUS_CONFIG[sig.status] || STATUS_CONFIG.pending;
              const canCopy = sig.status !== "signed" && sig.status !== "expired";
              return (
                <div
                  key={sig.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{sig.signerName}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {sig.signerEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                      {cfg.label}
                    </Badge>
                    {canCopy && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => copyLink(sig.token)}
                        aria-label={`Copiar link de assinatura de ${sig.signerName}`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Link
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar para assinatura</DialogTitle>
            <DialogDescription>
              Cada signatário recebe um link seguro e único para assinar. O link
              expira em 7 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {signers.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs">Nome</Label>}
                  <Input
                    value={s.name}
                    onChange={(e) => updateSigner(i, { name: e.target.value })}
                    placeholder="Nome do signatário"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs">E-mail</Label>}
                  <Input
                    type="email"
                    value={s.email}
                    onChange={(e) => updateSigner(i, { email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs sr-only">Tipo</Label>}
                  <select
                    value={s.type}
                    onChange={(e) => updateSigner(i, { type: e.target.value })}
                    className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    aria-label="Tipo de signatário"
                  >
                    {SIGNER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                {signers.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 col-start-3"
                    onClick={() => removeRow(i)}
                    aria-label="Remover signatário"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar signatário
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSend} isLoading={sending}>
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

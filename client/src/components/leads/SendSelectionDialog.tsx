import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Copy, Check, Loader2, ExternalLink, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

/**
 * Diálogo para a imobiliária montar uma seleção de imóveis para um lead
 * (comprador) e gerar o link público do portal de atendimento.
 *
 * Não edita páginas grandes compartilhadas: é um componente isolado que a
 * página de leads pode importar e renderizar com `lead` + controle de aberto.
 */

interface SendSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: { id: string; name: string };
}

interface PropertyOption {
  id: string;
  title: string;
  city?: string | null;
  state?: string | null;
  price?: string | null;
  images?: string[] | null;
}

interface CreatedSelection {
  id: string;
  publicToken: string;
  itemCount: number;
}

function buildPublicUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/s/${token}`;
}

export function SendSelectionDialog({ open, onOpenChange, lead }: SendSelectionDialogProps) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [created, setCreated] = useState<CreatedSelection | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: properties = [], isLoading } = useQuery<PropertyOption[]>({
    queryKey: ["/api/properties", "buyer-selection"],
    queryFn: async () => {
      const res = await fetch("/api/properties?status=available&limit=100", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Não foi possível carregar os imóveis.");
      const body = await res.json();
      return (body?.data ?? body ?? []) as PropertyOption[];
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.state?.toLowerCase().includes(q),
    );
  }, [properties, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/buyer-selections", {
        leadId: lead.id,
        propertyIds: Array.from(selected),
        message: message.trim() || undefined,
      });
      return (await res.json()) as CreatedSelection;
    },
    onSuccess: (data) => {
      setCreated(data);
      toast({
        title: "Seleção criada",
        description: `${data.itemCount} imóvel(is) compartilhado(s) com ${lead.name}.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const publicUrl = created ? buildPublicUrl(created.publicToken) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Reseta o estado ao fechar para reuso limpo.
      setSelected(new Set());
      setMessage("");
      setSearch("");
      setCreated(null);
      setCopied(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar seleção de imóveis</DialogTitle>
          <DialogDescription>
            Monte uma seleção para {lead.name} responder no portal do comprador.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-800">
              Seleção criada com {created.itemCount} imóvel(is). Compartilhe o link abaixo com o
              comprador.
            </div>
            <div>
              <Label className="text-xs text-gray-500">Link público</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={publicUrl} className="text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="outline" size="icon" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500">Mensagem (opcional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Olá! Separei estes imóveis pensando no seu perfil..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-500">Imóveis</Label>
                <Badge variant="secondary">{selected.size} selecionado(s)</Badge>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título ou cidade"
                  className="pl-8"
                />
              </div>

              <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="p-6 text-center text-sm text-gray-400">Nenhum imóvel encontrado.</p>
                ) : (
                  filtered.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                      />
                      <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {p.images && p.images.length > 0 ? (
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {[p.city, p.state].filter(Boolean).join(" - ")}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                disabled={selected.size === 0 || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Criar e gerar link`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SendSelectionDialog;

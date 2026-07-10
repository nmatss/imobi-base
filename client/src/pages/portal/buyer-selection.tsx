import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  X,
  HelpCircle,
  CalendarPlus,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";

/**
 * Portal público de atendimento ao comprador.
 * Rota: /s/:token — sem login. O token na URL é a credencial.
 * O comprador vê os imóveis selecionados pela imobiliária, responde
 * (aceitar/recusar/talvez) com comentário e pode agendar visita.
 */

interface BrandPayload {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  faviconUrl: string | null;
  footerText: string | null;
  phone?: string | null;
  email?: string | null;
}

interface PortalProperty {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  price: string | null;
  address: string;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  images: string[];
  features: string[];
}

interface SelectionItem {
  id: string;
  sortOrder: number;
  response: string | null;
  comment: string | null;
  respondedAt: string | null;
  property: PortalProperty | null;
}

interface SelectionResponse {
  brand: BrandPayload | null;
  selection: {
    id: string;
    title: string;
    message: string | null;
    status: string;
    expiresAt: string | null;
    createdAt: string | null;
  };
  items: SelectionItem[];
}

function formatPrice(value: string | null): string {
  if (!value) return "Sob consulta";
  const num = Number(value);
  if (Number.isNaN(num)) return "Sob consulta";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const RESPONSE_LABELS: Record<string, { label: string; className: string }> = {
  accepted: { label: "Você curtiu", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Você recusou", className: "bg-red-100 text-red-700 border-red-200" },
  maybe: { label: "Talvez", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function BuyerSelectionPage() {
  usePageTitle("Seus imóveis selecionados");
  const [, params] = useRoute("/s/:token");
  const token = params?.token ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["/api/portal/selection", token];

  const { data, isLoading, isError, error } = useQuery<SelectionResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/portal/selection/${encodeURIComponent(token)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível carregar a seleção.");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const brand = data?.brand ?? null;
  const primary = brand?.primaryColor || "#2563eb";

  const respondMutation = useMutation({
    mutationFn: async (vars: { itemId: string; response: string; comment?: string }) => {
      const res = await fetch(
        `/api/portal/selection/${encodeURIComponent(token)}/items/${vars.itemId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ response: vars.response, comment: vars.comment }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível registrar sua resposta.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Resposta registrada", description: "Obrigado pelo seu feedback!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const visitMutation = useMutation({
    mutationFn: async (vars: { itemId: string; preferredDate: string; notes?: string }) => {
      const res = await fetch(
        `/api/portal/selection/${encodeURIComponent(token)}/items/${vars.itemId}/visit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ preferredDate: vars.preferredDate, notes: vars.notes }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível solicitar a visita.");
      }
      return res.json();
    },
    onSuccess: (resp: { message?: string }) => {
      toast({
        title: "Visita solicitada",
        description: resp?.message || "A imobiliária entrará em contato para confirmar.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Building2 className="h-10 w-10 mx-auto text-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">Link indisponível</h1>
            <p className="text-sm text-gray-500">
              {(error as Error)?.message ||
                "Esta seleção não está mais disponível ou o link é inválido."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com brand */}
      <header
        className="border-b bg-white"
        style={{ borderTopColor: primary, borderTopWidth: 4 }}
      >
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3">
          {brand?.logo ? (
            <img src={brand.logo} alt={brand.name} className="h-10 w-auto object-contain" />
          ) : (
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: primary }}
            >
              <Building2 className="h-5 w-5" />
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">{brand?.name || "Imobiliária"}</p>
            <h1 className="text-lg font-semibold text-gray-900">{data.selection.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {data.selection.message && (
          <div className="rounded-lg border bg-white p-4 text-sm text-gray-700">
            {data.selection.message}
          </div>
        )}

        {data.items.length === 0 && (
          <p className="text-center text-gray-500 py-10">Nenhum imóvel nesta seleção.</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {data.items.map((item) =>
            item.property ? (
              <PropertyCard
                key={item.id}
                item={item}
                primary={primary}
                pendingRespond={respondMutation.isPending}
                pendingVisit={visitMutation.isPending}
                onRespond={(response, comment) =>
                  respondMutation.mutate({ itemId: item.id, response, comment })
                }
                onVisit={(preferredDate, notes) =>
                  visitMutation.mutate({ itemId: item.id, preferredDate, notes })
                }
              />
            ) : null,
          )}
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
        {brand?.footerText || `${brand?.name || ""} · Portal do Comprador`}
      </footer>
    </div>
  );
}

interface PropertyCardProps {
  item: SelectionItem;
  primary: string;
  pendingRespond: boolean;
  pendingVisit: boolean;
  onRespond: (response: string, comment?: string) => void;
  onVisit: (preferredDate: string, notes?: string) => void;
}

function PropertyCard({
  item,
  primary,
  pendingRespond,
  pendingVisit,
  onRespond,
  onVisit,
}: PropertyCardProps) {
  const property = item.property!;
  const [comment, setComment] = useState(item.comment ?? "");
  const [showVisit, setShowVisit] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [visitNotes, setVisitNotes] = useState("");

  const image = useMemo(
    () => (property.images && property.images.length > 0 ? property.images[0] : null),
    [property.images],
  );
  const responded = item.response ? RESPONSE_LABELS[item.response] : null;

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="aspect-video bg-gray-100 relative">
        {image ? (
          <img src={image} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Building2 className="h-10 w-10" />
          </div>
        )}
        {responded && (
          <Badge className={`absolute top-2 right-2 border ${responded.className}`}>
            {responded.label}
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <h2 className="font-semibold text-gray-900 leading-tight">{property.title}</h2>
        <p className="text-xl font-bold" style={{ color: primary }}>
          {formatPrice(property.price)}
        </p>
        <p className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5" />
          {property.address}, {property.city} - {property.state}
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3">
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" /> {property.bathrooms}
            </span>
          )}
          {property.area != null && (
            <span className="flex items-center gap-1">
              <Ruler className="h-4 w-4" /> {property.area} m²
            </span>
          )}
        </div>

        {property.description && (
          <p className="text-sm text-gray-500 line-clamp-3">{property.description}</p>
        )}

        <div>
          <Label className="text-xs text-gray-500">Comentário (opcional)</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="O que achou deste imóvel?"
            rows={2}
            className="mt-1"
          />
        </div>

        {showVisit && (
          <div className="rounded-md border p-3 space-y-2 bg-gray-50">
            <div>
              <Label className="text-xs text-gray-500">Data e horário preferidos</Label>
              <Input
                type="datetime-local"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Observações (opcional)</Label>
              <Textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!preferredDate || pendingVisit}
              onClick={() => {
                onVisit(new Date(preferredDate).toISOString(), visitNotes || undefined);
                setShowVisit(false);
              }}
            >
              {pendingVisit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar solicitação"
              )}
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-0">
        <div className="grid grid-cols-3 gap-2 w-full">
          <Button
            type="button"
            variant={item.response === "accepted" ? "default" : "outline"}
            size="sm"
            disabled={pendingRespond}
            onClick={() => onRespond("accepted", comment || undefined)}
          >
            <Check className="h-4 w-4 mr-1" /> Aceitar
          </Button>
          <Button
            type="button"
            variant={item.response === "maybe" ? "default" : "outline"}
            size="sm"
            disabled={pendingRespond}
            onClick={() => onRespond("maybe", comment || undefined)}
          >
            <HelpCircle className="h-4 w-4 mr-1" /> Talvez
          </Button>
          <Button
            type="button"
            variant={item.response === "rejected" ? "default" : "outline"}
            size="sm"
            disabled={pendingRespond}
            onClick={() => onRespond("rejected", comment || undefined)}
          >
            <X className="h-4 w-4 mr-1" /> Recusar
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowVisit((v) => !v)}
        >
          <CalendarPlus className="h-4 w-4 mr-1" />
          {showVisit ? "Cancelar" : "Agendar visita"}
        </Button>
      </CardFooter>
    </Card>
  );
}

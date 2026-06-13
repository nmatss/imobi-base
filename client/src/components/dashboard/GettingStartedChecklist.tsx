import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, X, Rocket } from "lucide-react";
import { useImobi } from "@/lib/imobi-context";

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
};

/**
 * Checklist de primeiros passos exibido no dashboard enquanto o tenant
 * ainda não completou o setup básico. Estado derivado dos dados reais
 * (sem persistência extra); dispensável via localStorage por tenant.
 */
export function GettingStartedChecklist() {
  const { tenant, properties, leads } = useImobi();
  const [, setLocation] = useLocation();
  const dismissKey = `imobibase:checklist-dismissed:${tenant?.id ?? "anon"}`;
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(dismissKey) === "1",
  );

  const items: ChecklistItem[] = useMemo(
    () => [
      {
        key: "brand",
        label: "Personalize sua marca",
        description: "Logo e cores aparecem no seu site público e nos emails.",
        done: Boolean(tenant?.logo),
        href: "/settings",
      },
      {
        key: "property",
        label: "Cadastre seu primeiro imóvel",
        description: "Imóveis cadastrados entram no site e no funil de vendas.",
        done: properties.length > 0,
        href: "/properties",
      },
      {
        key: "lead",
        label: "Crie seu primeiro lead",
        description: "Acompanhe interessados no funil de leads.",
        done: leads.length > 0,
        href: "/leads",
      },
      {
        key: "visit",
        label: "Agende uma visita",
        description: "Organize a agenda de visitas da equipe.",
        done: leads.some((l: { status?: string }) => l.status && l.status !== "new"),
        href: "/calendar",
      },
      {
        key: "team",
        label: "Convide sua equipe",
        description: "Corretores e gestores com permissões próprias.",
        done: false,
        href: "/settings",
      },
    ],
    [tenant?.logo, properties, leads],
  );

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-heading">Primeiros passos</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {doneCount} de {items.length} concluídos
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={handleDismiss}
          aria-label="Dispensar checklist"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={(doneCount / items.length) * 100} className="h-2" />
        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => !item.done && setLocation(item.href)}
                disabled={item.done}
                className={`w-full flex items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors ${
                  item.done
                    ? "opacity-60 cursor-default"
                    : "hover:bg-primary/5 cursor-pointer"
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                )}
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${item.done ? "line-through" : ""}`}>
                    {item.label}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {item.description}
                  </span>
                </span>
                {!item.done && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1 ml-auto" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

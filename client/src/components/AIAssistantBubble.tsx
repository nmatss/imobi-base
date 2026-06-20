import { useMemo } from "react";
import { useLocation } from "wouter";
import { AIAssistant } from "@/components/AIAssistant";
import { cn } from "@/lib/utils";
import type { AIModule } from "@/lib/ai-context";

const MODULE_BY_ROUTE: Array<[string, AIModule]> = [
  ["/dashboard", "reports"],
  ["/properties", "properties"],
  ["/leads", "leads"],
  ["/calendar", "calendar"],
  ["/contracts", "sales"],
  ["/vendas", "sales"],
  ["/rentals", "rentals"],
  ["/financeiro", "financial"],
  ["/reports", "reports"],
  ["/analytics", "reports"],
];
const HIDDEN_ROUTES = ["/settings"];
const ELEVATED_MOBILE_ROUTES = ["/leads", "/inspections"];

function getModuleForLocation(location: string): AIModule {
  return MODULE_BY_ROUTE.find(([prefix]) => location.startsWith(prefix))?.[1] ?? "leads";
}

export function AIAssistantBubble() {
  const [location] = useLocation();
  const module = useMemo(() => getModuleForLocation(location), [location]);
  const isHidden = HIDDEN_ROUTES.some((prefix) => location.startsWith(prefix));
  const needsMobileOffset = ELEVATED_MOBILE_ROUTES.some((prefix) => location.startsWith(prefix));

  if (isHidden) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-4 z-50 flex items-end gap-3 sm:bottom-6 sm:right-6 print:hidden",
        needsMobileOffset
          ? "bottom-24"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
      )}
    >
      <div className="relative hidden rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-lg sm:block">
        Assistente IA
        <span className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 border-r border-t bg-background" />
      </div>
      <AIAssistant
        module={module}
        variant="default"
        size="icon"
        className="h-14 w-14 rounded-full shadow-xl shadow-primary/25 ring-4 ring-background hover:scale-105"
      />
    </div>
  );
}

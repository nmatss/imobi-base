import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  name: string;
  category: string;
  bodyText: string;
  usageCount: number;
}

interface TemplateSelectorProps {
  onSelect: (templateText: string) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/whatsapp/templates"],
    queryFn: async () => {
      const res = await fetch("/api/whatsapp/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const templates: Template[] = data?.templates || [];

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      leads: "Leads",
      properties: "Imóveis",
      visits: "Visitas",
      contracts: "Contratos",
      payments: "Pagamentos",
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando templates...</div>;
  }

  if (templates.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum template disponível</div>;
  }

  return (
    <ScrollArea className="h-64">
      <div className="space-y-2">
        {templates.map((template) => (
          <Button
            key={template.id}
            variant="outline"
            className="w-full justify-start h-auto p-3 text-left"
            onClick={() => onSelect(template.bodyText)}
          >
            <div className="space-y-1 w-full">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{template.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(template.category)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.bodyText}
              </p>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}

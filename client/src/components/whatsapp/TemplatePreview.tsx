import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { renderTemplate, TEMPLATE_VARIABLES } from "@/lib/whatsapp-templates";
import { Smartphone, Eye, X } from "lucide-react";

interface TemplatePreviewProps {
  template: string;
  className?: string;
}

export function TemplatePreview({ template, className }: TemplatePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({
    nome: "João Silva",
    email: "joao@email.com",
    telefone: "(11) 99999-9999",
    imovel: "Apartamento 3 quartos - Centro",
    valor: "R$ 450.000,00",
    endereco: "Rua das Flores, 123 - Centro",
    data: new Date().toLocaleDateString("pt-BR"),
    hora: "14:00",
    corretor: "Maria Santos",
    empresa: "Imobiliária Prime",
    link: "https://exemplo.com/imovel/123",
  });

  // Extract variables used in the template
  const usedVariables = TEMPLATE_VARIABLES.filter((variable) =>
    template.includes(`{{${variable.key}}}`)
  );

  const renderedTemplate = renderTemplate(template, previewVariables);

  if (!showPreview) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPreview(true)}
        className="gap-2"
      >
        <Eye className="w-4 h-4" />
        Visualizar Prévia
      </Button>
    );
  }

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Prévia do Whatsapp</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPreview(false)}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {usedVariables.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Preencha os valores para testar a mensagem:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {usedVariables.map((variable) => (
                <div key={variable.key} className="grid gap-1.5">
                  <Label htmlFor={`preview-${variable.key}`} className="text-xs">
                    {variable.description}
                  </Label>
                  <Input
                    id={`preview-${variable.key}`}
                    value={previewVariables[variable.key]}
                    onChange={(e) =>
                      setPreviewVariables((prev) => ({
                        ...prev,
                        [variable.key]: e.target.value,
                      }))
                    }
                    className="h-9 text-sm"
                    placeholder={variable.label}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          {/* WhatsApp-style header */}
          <div className="bg-[#075E54] text-white p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{previewVariables.nome}</p>
              <p className="text-xs text-white/70">Online</p>
            </div>
          </div>

          {/* WhatsApp-style message bubble */}
          <div className="bg-[#E5DDD5] p-4 min-h-[120px]">
            <div className="max-w-[85%] bg-white rounded-lg rounded-tl-none p-3 shadow-sm">
              <p className="text-sm whitespace-pre-wrap break-words">{renderedTemplate}</p>
              <p className="text-xs text-gray-500 mt-2 text-right">
                {new Date().toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            Esta é uma simulação de como a mensagem aparecerá no WhatsApp do cliente. Os valores
            reais serão preenchidos automaticamente pelo sistema.
          </p>
        </div>
      </div>
    </Card>
  );
}

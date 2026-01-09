import { Button } from "@/components/ui/button";

const QUICK_RESPONSES = [
  "Olá! Como posso ajudar?",
  "Obrigado pelo contato!",
  "Vou verificar e já retorno.",
  "Posso agendar uma visita?",
  "Vou enviar mais informações.",
];

interface QuickResponsesProps {
  onSelect: (response: string) => void;
}

export function QuickResponses({ onSelect }: QuickResponsesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_RESPONSES.map((response, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelect(response)}
          className="text-xs"
        >
          {response}
        </Button>
      ))}
    </div>
  );
}

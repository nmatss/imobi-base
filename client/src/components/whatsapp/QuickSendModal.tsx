import { useState, useEffect } from 'react';
import { MessageCircle, Send, Copy, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useToast } from '@/hooks/use-toast';

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables?: string[];
}

interface QuickSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone: string;
  context?: Record<string, string>;
  defaultTemplate?: string;
  templates?: MessageTemplate[];
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'greeting',
    name: 'Saudação',
    content: 'Olá {name}! Tudo bem? Sou da {company} e gostaria de falar com você.',
    variables: ['name', 'company'],
  },
  {
    id: 'follow_up',
    name: 'Acompanhamento',
    content: 'Olá {name}! Estou entrando em contato para dar continuidade à nossa conversa. Você ainda tem interesse em {subject}?',
    variables: ['name', 'subject'],
  },
  {
    id: 'property_info',
    name: 'Informação de Imóvel',
    content: 'Olá {name}! Tenho um imóvel que pode te interessar:\n\n{property_title}\nValor: {price}\nLocalização: {location}\n\nGostaria de agendar uma visita?',
    variables: ['name', 'property_title', 'price', 'location'],
  },
  {
    id: 'visit_confirmation',
    name: 'Confirmação de Visita',
    content: 'Olá {name}! Confirmo nossa visita ao imóvel {property_title} no dia {date} às {time}. Endereço: {address}. Aguardo você!',
    variables: ['name', 'property_title', 'date', 'time', 'address'],
  },
  {
    id: 'payment_reminder',
    name: 'Lembrete de Pagamento',
    content: 'Olá {name}! Lembramos que o pagamento de {description} no valor de {amount} vence em {due_date}. Qualquer dúvida, estamos à disposição!',
    variables: ['name', 'description', 'amount', 'due_date'],
  },
];

/**
 * Quick Send Modal for WhatsApp messages
 * Shows recipient info, template selector, preview and send
 */
export function QuickSendModal({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  context = {},
  defaultTemplate,
  templates = DEFAULT_TEMPLATES,
}: QuickSendModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [message, setMessage] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');
  const { sendMessage, formatPhone } = useWhatsApp();
  const { toast } = useToast();

  const formattedPhone = formatPhone(recipientPhone);

  // Build context with defaults
  const messageContext = {
    name: recipientName,
    company: 'ImobiBase',
    ...context,
  };

  useEffect(() => {
    if (defaultTemplate) {
      setMessage(defaultTemplate);
      setPreviewMessage(replaceVariables(defaultTemplate));
    }
  }, [defaultTemplate]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        setMessage(template.content);
        setPreviewMessage(replaceVariables(template.content));
      }
    }
  }, [selectedTemplate, templates]);

  useEffect(() => {
    setPreviewMessage(replaceVariables(message));
  }, [message]);

  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(messageContext).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value || `{${key}}`);
    });
    return result;
  };

  const handleSend = () => {
    if (!message.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Digite uma mensagem antes de enviar.',
        variant: 'destructive',
      });
      return;
    }

    sendMessage({
      phone: recipientPhone,
      template: message,
      variables: messageContext,
    });

    toast({
      title: 'WhatsApp aberto',
      description: 'A mensagem foi preparada. Clique em enviar no WhatsApp.',
    });

    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previewMessage);
    toast({
      title: 'Copiado',
      description: 'Mensagem copiada para a área de transferência.',
    });
  };

  const getAvailableVariables = () => {
    const template = templates.find((t) => t.id === selectedTemplate);
    return template?.variables || [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Prepare sua mensagem e envie via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{recipientName}</span>
              <Badge variant="outline" className="text-xs">
                {formattedPhone}
              </Badge>
            </div>
          </div>

          {/* Template Selector */}
          <div className="space-y-2">
            <Label>Modelo de Mensagem</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um modelo ou digite sua mensagem" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available Variables */}
          {selectedTemplate && getAvailableVariables().length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Variáveis disponíveis:
              </Label>
              <div className="flex flex-wrap gap-1">
                {getAvailableVariables().map((variable) => (
                  <Badge key={variable} variant="secondary" className="text-xs">
                    {'{'}
                    {variable}
                    {'}'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Message Editor */}
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Use {'{variavel}'} para inserir valores dinâmicos
            </p>
          </div>

          {/* Preview */}
          {message && (
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Prévia</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </Label>
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

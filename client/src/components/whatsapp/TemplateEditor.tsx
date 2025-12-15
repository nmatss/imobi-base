import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TEMPLATE_VARIABLES,
  CATEGORY_LABELS,
  TemplateCategory,
  WhatsAppTemplate,
  insertVariable,
  getCharacterCount,
  isWhatsAppLimitExceeded,
} from "@/lib/whatsapp-templates";
import { TemplatePreview } from "./TemplatePreview";
import { Smile, AlertCircle, CheckCircle2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateEditorProps {
  template?: WhatsAppTemplate;
  onSave: (template: Omit<WhatsAppTemplate, "id" | "createdAt" | "usageCount">) => void;
  onCancel: () => void;
}

const COMMON_EMOJIS = [
  "👋", "😊", "🏠", "🔑", "✅", "📄", "💰", "📅", "🔔", "🤝",
  "❤️", "👍", "🎉", "⭐", "📍", "📱", "🏡", "💼", "✨", "🙏"
];

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [category, setCategory] = useState<TemplateCategory>(template?.category || "leads");
  const [content, setContent] = useState(template?.content || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleInsertVariable = (variable: string) => {
    const { newText, newCursorPosition } = insertVariable(
      content,
      cursorPosition,
      variable
    );
    setContent(newText);
    setCursorPosition(newCursorPosition);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const handleInsertEmoji = (emoji: string) => {
    const { newText, newCursorPosition } = insertVariable(
      content,
      cursorPosition,
      emoji
    );
    setContent(newText);
    setCursorPosition(newCursorPosition);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart);
  };

  const handleSave = () => {
    if (!name.trim() || !content.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      category,
      content: content.trim(),
      isDefault: false,
    });
  };

  const charCount = getCharacterCount(content);
  const isLimitExceeded = isWhatsAppLimitExceeded(content);
  const isValid = name.trim() && content.trim() && !isLimitExceeded;

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="template-name">
              Nome do Template
              <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                Obrigatório
              </Badge>
            </Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Primeiro contato com lead"
              className="h-10"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-category">Categoria</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as TemplateCategory)}
            >
              <SelectTrigger id="template-category" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="template-content">
            Mensagem
            <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
              Obrigatório
            </Badge>
          </Label>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "text-muted-foreground",
                charCount > 3500 && "text-orange-500 font-medium",
                isLimitExceeded && "text-destructive font-medium"
              )}
            >
              {charCount} / 4096
            </span>
            {isLimitExceeded && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Limite excedido
              </Badge>
            )}
          </div>
        </div>

        <Textarea
          ref={textareaRef}
          id="template-content"
          value={content}
          onChange={handleTextareaChange}
          onSelect={handleTextareaSelect}
          onBlur={(e) => setCursorPosition(e.target.selectionStart)}
          placeholder="Digite sua mensagem aqui... Use as variáveis abaixo para personalizar!"
          className={cn(
            "min-h-[200px] resize-none font-sans",
            isLimitExceeded && "border-destructive focus-visible:ring-destructive"
          )}
        />

        {/* Variable chips */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Variáveis</Label>
            <Badge variant="secondary" className="text-xs">
              Clique para inserir
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((variable) => (
              <button
                key={variable.key}
                type="button"
                onClick={() => handleInsertVariable(variable.label)}
                className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors border border-primary/20 font-mono"
                title={variable.description}
              >
                {variable.label}
              </button>
            ))}
          </div>
        </div>

        {/* Emoji picker */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="gap-2"
            >
              <Smile className="w-4 h-4" />
              {showEmojiPicker ? "Ocultar emojis" : "Adicionar emojis"}
            </Button>
          </div>

          {showEmojiPicker && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex flex-wrap gap-2">
                {COMMON_EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className="w-10 h-10 rounded-lg bg-background hover:bg-primary/10 transition-colors text-xl flex items-center justify-center border"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {content && (
          <div className="pt-2">
            <TemplatePreview template={content} />
          </div>
        )}
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} className="order-2 sm:order-1">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid}
          className="gap-2 order-1 sm:order-2"
        >
          {isValid && <CheckCircle2 className="w-4 h-4" />}
          Salvar Template
        </Button>
      </div>

      {!isValid && name && content && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            {isLimitExceeded
              ? "A mensagem excede o limite de caracteres do WhatsApp. Reduza o tamanho da mensagem."
              : "Preencha todos os campos obrigatórios para salvar o template."}
          </p>
        </div>
      )}
    </div>
  );
}

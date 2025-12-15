import { useState } from 'react';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  generateAIContent,
  getPresetsByModule,
  type AIModule,
} from '@/lib/ai-context';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  module: AIModule;
  contextData?: any;
  onInsert?: (text: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function AIAssistant({
  module,
  contextData,
  onInsert,
  className,
  variant = 'outline',
  size = 'default',
}: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const presets = getPresetsByModule(module);

  const handleGenerate = async (presetId?: string) => {
    setLoading(true);
    setSelectedPreset(presetId || null);

    try {
      const prompt = presetId
        ? presets.find((p) => p.id === presetId)?.prompt || customPrompt
        : customPrompt;

      if (!prompt.trim()) {
        throw new Error('Digite um prompt ou selecione uma opção');
      }

      const content = await generateAIContent(
        prompt,
        {
          module,
          data: contextData,
        },
        presetId
      );

      setResult(content);
    } catch (error: any) {
      setResult(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const handleInsert = () => {
    if (onInsert && result) {
      onInsert(result);
      setOpen(false);
      setResult('');
      setCustomPrompt('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
        >
          <Sparkles className="h-4 w-4" />
          {size !== 'icon' && 'IA'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] max-w-[90vw] p-0" align="end">
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Assistente IA</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              {module.charAt(0).toUpperCase() + module.slice(1)}
            </Badge>
          </div>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {presets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Sugestões rápidas
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="ghost"
                      size="sm"
                      className="justify-start h-auto py-2 px-3 text-left"
                      onClick={() => handleGenerate(preset.id)}
                      disabled={loading}
                    >
                      <span className="text-sm font-normal">{preset.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="custom-prompt" className="text-xs text-muted-foreground">
                Ou escreva seu próprio prompt
              </Label>
              <Textarea
                id="custom-prompt"
                placeholder="Digite aqui o que você precisa..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={loading}
              />
              <Button
                onClick={() => handleGenerate()}
                disabled={loading || !customPrompt.trim()}
                className="w-full"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar
                  </>
                )}
              </Button>
            </div>

            {result && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Resultado
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 px-2"
                    >
                      {copied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm leading-relaxed max-h-[200px] overflow-y-auto">
                  {result}
                </div>
                {onInsert && (
                  <Button
                    onClick={handleInsert}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    Inserir no formulário
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

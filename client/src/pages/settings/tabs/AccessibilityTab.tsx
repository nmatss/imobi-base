import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/lib/accessibility-context';
import {
  Eye,
  Gauge,
  Type,
  Keyboard,
  AudioLines,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * AccessibilityTab Component
 * Comprehensive accessibility settings panel
 * Implements WCAG 2.1 Level AA compliance controls
 */
export function AccessibilityTab() {
  const { settings, updateSettings, resetSettings } = useAccessibility();

  const handleFontSizeChange = (value: number[]) => {
    updateSettings({ fontSize: value[0] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Acessibilidade</h2>
        <p className="text-muted-foreground mt-1">
          Configure as opções de acessibilidade para melhorar sua experiência
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Essas configurações ajudam a tornar o sistema mais acessível para pessoas com
          deficiência visual, motora ou cognitiva. Todas as alterações são salvas
          automaticamente.
        </AlertDescription>
      </Alert>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle>Configurações Visuais</CardTitle>
          </div>
          <CardDescription>
            Ajuste as configurações visuais para melhor legibilidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* High Contrast Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast" className="text-base font-medium">
                Modo de Alto Contraste
              </Label>
              <p className="text-sm text-muted-foreground">
                Aumenta o contraste entre texto e fundo para melhor legibilidade
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) =>
                updateSettings({ highContrast: checked })
              }
              aria-describedby="high-contrast-description"
            />
          </div>
          <p id="high-contrast-description" className="sr-only">
            Ativa o modo de alto contraste, aumentando a diferença entre cores para
            melhor visibilidade
          </p>

          {/* Font Size */}
          <div className="space-y-4">
            <div className="space-y-0.5">
              <Label htmlFor="font-size" className="text-base font-medium flex items-center gap-2">
                <Type className="h-4 w-4" />
                Tamanho da Fonte
              </Label>
              <p className="text-sm text-muted-foreground">
                Ajuste o tamanho da fonte (atual: {Math.round(settings.fontSize * 100)}%)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-12">Menor</span>
              <Slider
                id="font-size"
                min={0.8}
                max={2.0}
                step={0.1}
                value={[settings.fontSize]}
                onValueChange={handleFontSizeChange}
                className="flex-1"
                aria-label="Tamanho da fonte"
                aria-valuemin={80}
                aria-valuemax={200}
                aria-valuenow={Math.round(settings.fontSize * 100)}
                aria-valuetext={`${Math.round(settings.fontSize * 100)} por cento`}
              />
              <span className="text-xs text-muted-foreground w-12 text-right">Maior</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ fontSize: 1.0 })}
              >
                Padrão (100%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ fontSize: 1.25 })}
              >
                Médio (125%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ fontSize: 1.5 })}
              >
                Grande (150%)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motion Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <CardTitle>Animações e Movimento</CardTitle>
          </div>
          <CardDescription>
            Controle animações e efeitos de movimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reduced-motion" className="text-base font-medium">
                Reduzir Movimento
              </Label>
              <p className="text-sm text-muted-foreground">
                Desativa ou minimiza animações e transições (recomendado para sensibilidade
                a movimento)
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={settings.reducedMotion}
              onCheckedChange={(checked) =>
                updateSettings({ reducedMotion: checked })
              }
              aria-describedby="reduced-motion-description"
            />
          </div>
          <p id="reduced-motion-description" className="sr-only">
            Reduz ou remove animações que podem causar desconforto ou tontura
          </p>
        </CardContent>
      </Card>

      {/* Keyboard Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <CardTitle>Navegação por Teclado</CardTitle>
          </div>
          <CardDescription>
            Configure atalhos de teclado e navegação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="keyboard-shortcuts" className="text-base font-medium">
                Atalhos de Teclado
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativa atalhos de teclado para navegação rápida (Cmd+K para busca, Cmd+/ para ajuda, etc.)
              </p>
            </div>
            <Switch
              id="keyboard-shortcuts"
              checked={settings.keyboardShortcuts}
              onCheckedChange={(checked) =>
                updateSettings({ keyboardShortcuts: checked })
              }
              aria-describedby="keyboard-shortcuts-description"
            />
          </div>
          <p id="keyboard-shortcuts-description" className="sr-only">
            Ativa ou desativa atalhos de teclado globais para navegação
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Pressione <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                Cmd/Ctrl + /
              </kbd> a qualquer momento para ver todos os atalhos disponíveis.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Screen Reader Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AudioLines className="h-5 w-5 text-primary" />
            <CardTitle>Leitores de Tela</CardTitle>
          </div>
          <CardDescription>
            Otimizações para usuários de leitores de tela
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="screen-reader-mode" className="text-base font-medium">
                Modo Leitor de Tela
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativa otimizações específicas para leitores de tela (NVDA, JAWS, VoiceOver)
              </p>
            </div>
            <Switch
              id="screen-reader-mode"
              checked={settings.screenReaderMode}
              onCheckedChange={(checked) =>
                updateSettings({ screenReaderMode: checked })
              }
              aria-describedby="screen-reader-description"
            />
          </div>
          <p id="screen-reader-description" className="sr-only">
            Otimiza a interface para melhor compatibilidade com leitores de tela
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Este sistema é compatível com NVDA, JAWS, VoiceOver e outros leitores de
              tela modernos. Todos os elementos interativos possuem labels apropriadas e
              suporte a navegação por teclado.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Reset Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle>Restaurar Padrões</CardTitle>
          </div>
          <CardDescription>
            Voltar todas as configurações de acessibilidade para o padrão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={resetSettings}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restaurar Configurações Padrão
          </Button>
        </CardContent>
      </Card>

      {/* WCAG Compliance Info */}
      <Card>
        <CardHeader>
          <CardTitle>Conformidade com Acessibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Este sistema foi desenvolvido seguindo as diretrizes WCAG 2.1 Nível AA:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Contraste de cores adequado (mínimo 4.5:1 para texto normal)</li>
            <li>Navegação completa por teclado</li>
            <li>Labels e descrições ARIA apropriadas</li>
            <li>Suporte a leitores de tela</li>
            <li>Foco visível em elementos interativos</li>
            <li>Alvos de toque com tamanho mínimo de 44x44 pixels</li>
            <li>Textos alternativos para todas as imagens</li>
            <li>Estrutura semântica HTML5</li>
          </ul>
          <div className="pt-4 border-t">
            <p className="text-sm">
              Encontrou um problema de acessibilidade?{' '}
              <a
                href="mailto:acessibilidade@imobibase.com"
                className="text-primary hover:underline font-medium"
              >
                Reporte aqui
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

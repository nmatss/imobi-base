import type { Meta, StoryObj } from '@storybook/react';
import { statusColors, semanticColors, spacing, typography, radius, shadows, tagColors } from '../../client/src/lib/design-tokens';
import { Badge } from '../../client/src/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../client/src/components/ui/card';

const meta: Meta = {
  title: 'Design System/Overview',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj;

// Colors - Status Colors
export const StatusColors: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Status Colors</h2>
        <p className="text-muted-foreground mb-6">
          Cores utilizadas para status de leads, pipeline e imóveis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(statusColors).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className={`h-20 rounded-lg ${value.bg}`} />
                <div>
                  <h3 className="font-semibold capitalize mb-2">{key}</h3>
                  <div className="space-y-1 text-xs font-mono">
                    <p className="text-muted-foreground">HEX: {value.hex}</p>
                    <p className="text-muted-foreground">RGB: {value.rgb}</p>
                    <p className="text-muted-foreground">HSL: {value.hsl}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className={`h-8 rounded flex items-center justify-center ${value.bg} text-white text-sm`}>
                    {value.bg}
                  </div>
                  <div className={`h-8 rounded flex items-center justify-center ${value.bgLight} ${value.text} text-sm`}>
                    {value.bgLight}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  ),
};

// Semantic Colors
export const SemanticColors: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Semantic Colors</h2>
        <p className="text-muted-foreground mb-6">
          Cores para feedback, alertas e estados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(semanticColors).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div style={{ backgroundColor: value.hex }} className="h-20 rounded-lg" />
                <div>
                  <h3 className="font-semibold capitalize mb-2">{key}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{value.hex}</p>
                </div>
                <div className={`${value.bg} ${value.text} ${value.border} border rounded p-3 text-sm`}>
                  {value.bg}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  ),
};

// Typography
export const Typography: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Typography Scale</h2>
        <p className="text-muted-foreground mb-6">
          Escala tipográfica baseada em Major Third (1.25)
        </p>
      </div>

      <div className="space-y-6">
        <div className="border-l-4 border-primary pl-6">
          <h1 className="text-4xl font-bold tracking-tight">Heading 1</h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            {typography.h1.size} / {typography.h1.weight} / {typography.h1.lineHeight}
          </p>
        </div>

        <div className="border-l-4 border-primary/70 pl-6">
          <h2 className="text-3xl font-semibold tracking-tight">Heading 2</h2>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            {typography.h2.size} / {typography.h2.weight} / {typography.h2.lineHeight}
          </p>
        </div>

        <div className="border-l-4 border-primary/50 pl-6">
          <h3 className="text-2xl font-semibold">Heading 3</h3>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            {typography.h3.size} / {typography.h3.weight} / {typography.h3.lineHeight}
          </p>
        </div>

        <div className="border-l-4 border-primary/30 pl-6">
          <h4 className="text-xl font-semibold">Heading 4</h4>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            {typography.h4.size} / {typography.h4.weight} / {typography.h4.lineHeight}
          </p>
        </div>

        <div className="border-l-4 border-primary/20 pl-6">
          <h5 className="text-lg font-medium">Heading 5</h5>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            {typography.h5.size} / {typography.h5.weight} / {typography.h5.lineHeight}
          </p>
        </div>

        <div className="border-l-4 border-primary/10 pl-6">
          <h6 className="text-base font-medium">Heading 6</h6>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            {typography.h6.size} / {typography.h6.weight} / {typography.h6.lineHeight}
          </p>
        </div>
      </div>

      <div className="pt-8 border-t">
        <h3 className="text-xl font-semibold mb-4">Body Text</h3>
        <div className="space-y-4">
          <div>
            <p className="text-lg leading-relaxed">
              Body Large - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {typography.body.lg.size} / {typography.body.lg.lineHeight}
            </p>
          </div>
          <div>
            <p className="text-base leading-relaxed">
              Body Base - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {typography.body.base.size} / {typography.body.base.lineHeight}
            </p>
          </div>
          <div>
            <p className="text-sm leading-relaxed">
              Body Small - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {typography.body.sm.size} / {typography.body.sm.lineHeight}
            </p>
          </div>
          <div>
            <p className="text-xs leading-relaxed">
              Body Extra Small - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {typography.body.xs.size} / {typography.body.xs.lineHeight}
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Spacing
export const Spacing: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Spacing Scale</h2>
        <p className="text-muted-foreground mb-6">
          Sistema de espaçamento baseado em grid de 8pt
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(spacing).map(([key, value]) => (
          <div key={key} className="flex items-center gap-4">
            <div className="w-24 text-sm font-mono text-muted-foreground">{key}</div>
            <div className="flex-1">
              <div className="bg-primary" style={{ width: value, height: '2rem' }} />
            </div>
            <div className="w-24 text-sm font-mono text-muted-foreground text-right">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

// Border Radius
export const BorderRadius: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Border Radius</h2>
        <p className="text-muted-foreground mb-6">
          Valores de border-radius para consistência
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Object.entries(radius).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div
              className="h-24 bg-primary"
              style={{ borderRadius: value }}
            />
            <div className="text-sm font-medium">{key}</div>
            <div className="text-xs font-mono text-muted-foreground">{value}</div>
          </div>
        ))}
      </div>
    </div>
  ),
};

// Shadows
export const Shadows: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Shadows</h2>
        <p className="text-muted-foreground mb-6">
          Elevação e profundidade usando sombras
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Object.entries(shadows).map(([key, value]) => (
          <div key={key} className="space-y-3">
            <div
              className="h-32 bg-background rounded-lg flex items-center justify-center"
              style={{ boxShadow: value }}
            >
              <span className="text-sm font-medium">{key}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  ),
};

// Tag Colors
export const TagColors: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Tag Colors</h2>
        <p className="text-muted-foreground mb-6">
          Paleta de cores para tags e categorização
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {tagColors.map((color, index) => (
          <div key={index} className="space-y-2">
            <div
              className="h-16 w-16 rounded-lg"
              style={{ backgroundColor: color }}
            />
            <p className="text-xs font-mono">{color}</p>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t">
        <h3 className="text-lg font-semibold mb-4">Exemplo de Uso</h3>
        <div className="flex flex-wrap gap-2">
          <Badge style={{ backgroundColor: tagColors[0] }} className="text-white">Urgente</Badge>
          <Badge style={{ backgroundColor: tagColors[1] }} className="text-white">Importante</Badge>
          <Badge style={{ backgroundColor: tagColors[2] }} className="text-white">VIP</Badge>
          <Badge style={{ backgroundColor: tagColors[3] }} className="text-white">Follow-up</Badge>
          <Badge style={{ backgroundColor: tagColors[4] }} className="text-white">Qualificado</Badge>
          <Badge style={{ backgroundColor: tagColors[5] }} className="text-white">Primeiro Contato</Badge>
        </div>
      </div>
    </div>
  ),
};

// Complete Design System Overview
export const CompleteOverview: Story = {
  render: () => (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-bold tracking-tight">ImobiBase Design System</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Sistema de design consistente para toda a aplicação de gestão imobiliária
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-primary">{Object.keys(statusColors).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Status Colors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-primary">{Object.keys(semanticColors).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Semantic Colors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-primary">{Object.keys(spacing).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Spacing Units</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-primary">{tagColors.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Tag Colors</p>
          </CardContent>
        </Card>
      </div>

      {/* Color Palette Preview */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Color Palette</h2>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {Object.values(statusColors).map((color, index) => (
            <div
              key={index}
              className={`h-16 rounded-lg ${color.bg}`}
              title={color.hex}
            />
          ))}
        </div>
      </div>

      {/* Typography Preview */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Typography</h2>
        <div className="space-y-4 border-l-4 border-primary pl-6">
          <h1 className="text-4xl font-bold">Heading 1 - ImobiBase</h1>
          <h2 className="text-3xl font-semibold">Heading 2 - Gestão Imobiliária</h2>
          <h3 className="text-2xl font-semibold">Heading 3 - Seus Imóveis</h3>
          <p className="text-base">
            Body text - Sistema completo de gestão para imobiliárias, corretores e administradoras de imóveis.
          </p>
        </div>
      </div>

      {/* Components Preview */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Component Examples</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Imóvel em Destaque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Apartamento 3 quartos</h3>
                    <p className="text-sm text-muted-foreground">Centro, São Paulo - SP</p>
                  </div>
                  <Badge className={statusColors.new.bg}>Novo</Badge>
                </div>
                <div className="text-2xl font-bold text-primary">R$ 450.000</div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span>120m²</span>
                  <span>•</span>
                  <span>3 quartos</span>
                  <span>•</span>
                  <span>2 banheiros</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status do Lead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge className={`${statusColors.new.bgLight} ${statusColors.new.text}`}>
                  Novo Lead
                </Badge>
                <Badge className={`${statusColors.qualification.bgLight} ${statusColors.qualification.text}`}>
                  Em Qualificação
                </Badge>
                <Badge className={`${statusColors.visit.bgLight} ${statusColors.visit.text}`}>
                  Visita Agendada
                </Badge>
                <Badge className={`${statusColors.contract.bgLight} ${statusColors.contract.text}`}>
                  Fechado
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-12 border-t">
        <p className="text-sm text-muted-foreground">
          Design System ImobiBase - Versão 1.0.0
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Construído com Tailwind CSS, shadcn/ui e React
        </p>
      </div>
    </div>
  ),
};

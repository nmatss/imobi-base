import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'UI/Typography',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj;

// Headings
export const Headings: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Heading 1</h1>
        <p className="text-sm text-muted-foreground mt-1">text-4xl font-bold tracking-tight</p>
      </div>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Heading 2</h2>
        <p className="text-sm text-muted-foreground mt-1">text-3xl font-semibold tracking-tight</p>
      </div>
      <div>
        <h3 className="text-2xl font-semibold">Heading 3</h3>
        <p className="text-sm text-muted-foreground mt-1">text-2xl font-semibold</p>
      </div>
      <div>
        <h4 className="text-xl font-semibold">Heading 4</h4>
        <p className="text-sm text-muted-foreground mt-1">text-xl font-semibold</p>
      </div>
      <div>
        <h5 className="text-lg font-medium">Heading 5</h5>
        <p className="text-sm text-muted-foreground mt-1">text-lg font-medium</p>
      </div>
      <div>
        <h6 className="text-base font-medium">Heading 6</h6>
        <p className="text-sm text-muted-foreground mt-1">text-base font-medium</p>
      </div>
    </div>
  ),
};

// Body Text
export const BodyText: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-lg leading-relaxed">
          Large body text - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p className="text-sm text-muted-foreground mt-1">text-lg leading-relaxed</p>
      </div>
      <div>
        <p className="text-base leading-relaxed">
          Default body text - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p className="text-sm text-muted-foreground mt-1">text-base leading-relaxed</p>
      </div>
      <div>
        <p className="text-sm leading-relaxed">
          Small body text - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p className="text-sm text-muted-foreground mt-1">text-sm leading-relaxed</p>
      </div>
      <div>
        <p className="text-xs leading-relaxed">
          Extra small body text - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p className="text-sm text-muted-foreground mt-1">text-xs leading-relaxed</p>
      </div>
    </div>
  ),
};

// Text Colors
export const TextColors: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-foreground">Default foreground text color</p>
      <p className="text-muted-foreground">Muted foreground text color</p>
      <p className="text-primary">Primary color text</p>
      <p className="text-destructive">Destructive color text</p>
      <p className="text-green-600">Success color text</p>
      <p className="text-yellow-600">Warning color text</p>
      <p className="text-blue-600">Info color text</p>
    </div>
  ),
};

// Font Weights
export const FontWeights: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="font-light">Light text (font-light)</p>
      <p className="font-normal">Normal text (font-normal)</p>
      <p className="font-medium">Medium text (font-medium)</p>
      <p className="font-semibold">Semibold text (font-semibold)</p>
      <p className="font-bold">Bold text (font-bold)</p>
      <p className="font-extrabold">Extra bold text (font-extrabold)</p>
    </div>
  ),
};

// Real World Examples
export const PageHeader: Story = {
  render: () => (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
      <p className="text-muted-foreground">
        Gerencie seu portfólio de <span className="font-medium">142</span> imóveis
      </p>
    </div>
  ),
};

export const CardHeader: Story = {
  render: () => (
    <div className="space-y-2 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">Apartamento 3 quartos</h3>
      <p className="text-sm text-muted-foreground">Centro, São Paulo - SP</p>
      <p className="text-2xl font-bold text-primary">R$ 450.000</p>
    </div>
  ),
};

export const MetricCard: Story = {
  render: () => (
    <div className="p-6 border rounded-lg space-y-1">
      <p className="text-sm font-medium text-muted-foreground">Total de Imóveis</p>
      <p className="text-3xl font-bold">142</p>
      <p className="text-xs text-muted-foreground">+12% em relação ao mês passado</p>
    </div>
  ),
};

export const FormLabel: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Título do Imóvel</label>
        <p className="text-xs text-muted-foreground">Digite um título descritivo para o imóvel</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Preço <span className="text-destructive">*</span>
        </label>
        <p className="text-xs text-muted-foreground">Valor em reais (R$)</p>
      </div>
    </div>
  ),
};

export const StatusText: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
        <span className="text-sm font-medium text-green-700">Disponível</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
        <span className="text-sm font-medium text-yellow-700">Reservado</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
        <span className="text-sm font-medium text-blue-700">Vendido</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-purple-500"></div>
        <span className="text-sm font-medium text-purple-700">Alugado</span>
      </div>
    </div>
  ),
};

// Typography Scale Showcase
export const TypographyScale: Story = {
  render: () => (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-4">Typography Scale</h2>
        <p className="text-muted-foreground mb-8">
          Sistema de tipografia consistente para toda a aplicação
        </p>
      </div>

      <div className="space-y-6">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            ImobiBase - Gestão Imobiliária
          </h1>
          <p className="text-muted-foreground">
            Sistema completo para gestão de imóveis, leads e processos imobiliários
          </p>
        </div>

        <div className="grid gap-4 mt-8">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Destaques do Mês</h3>
            <p className="text-sm text-muted-foreground">
              Confira os imóveis mais visualizados e procurados este mês
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

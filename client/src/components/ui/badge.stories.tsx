import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// Variants
export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

// Property Status Examples
export const PropertyStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Disponível
      </Badge>
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Vendido
      </Badge>
      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        Alugado
      </Badge>
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Destaque
      </Badge>
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Urgente
      </Badge>
      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
        Pendente
      </Badge>
    </div>
  ),
};

// Property Categories
export const PropertyCategories: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">Apartamento</Badge>
      <Badge variant="outline">Casa</Badge>
      <Badge variant="outline">Terreno</Badge>
      <Badge variant="outline">Comercial</Badge>
      <Badge variant="outline">Industrial</Badge>
    </div>
  ),
};

// Lead Sources
export const LeadSources: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-blue-100 text-blue-700">Website</Badge>
      <Badge className="bg-green-100 text-green-700">WhatsApp</Badge>
      <Badge className="bg-purple-100 text-purple-700">Instagram</Badge>
      <Badge className="bg-orange-100 text-orange-700">Indicação</Badge>
      <Badge className="bg-pink-100 text-pink-700">Portal</Badge>
    </div>
  ),
};

// Counts and Numbers
export const WithCounts: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm">Fotos</span>
      <Badge variant="secondary">12</Badge>
      <span className="text-sm ml-4">Pendências</span>
      <Badge variant="destructive">3</Badge>
      <span className="text-sm ml-4">Visitas</span>
      <Badge className="bg-green-100 text-green-700">8</Badge>
    </div>
  ),
};

// Feature Badges
export const FeatureBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-yellow-100 text-yellow-700">⭐ Destaque</Badge>
      <Badge className="bg-green-100 text-green-700">🆕 Novo</Badge>
      <Badge className="bg-blue-100 text-blue-700">🔥 Popular</Badge>
      <Badge className="bg-purple-100 text-purple-700">✨ Premium</Badge>
    </div>
  ),
};

// In Context - Property Card
export const InPropertyCard: Story = {
  render: () => (
    <div className="max-w-sm border rounded-lg overflow-hidden">
      <div className="h-48 bg-muted" />
      <div className="p-4">
        <div className="flex gap-2 mb-2">
          <Badge variant="outline">Apartamento</Badge>
          <Badge className="bg-green-100 text-green-700">Disponível</Badge>
        </div>
        <h3 className="font-semibold text-lg mb-1">Apartamento 3 quartos - Centro</h3>
        <p className="text-sm text-muted-foreground mb-2">São Paulo, SP</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">R$ 450.000</span>
          <Badge variant="secondary">12 fotos</Badge>
        </div>
      </div>
    </div>
  ),
};

// In Context - Lead Card
export const InLeadCard: Story = {
  render: () => (
    <div className="max-w-sm border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">João Silva</h3>
          <p className="text-sm text-muted-foreground">joao@email.com</p>
        </div>
        <Badge className="bg-green-100 text-green-700">Qualificado</Badge>
      </div>
      <div className="flex gap-2">
        <Badge variant="outline" className="text-xs">WhatsApp</Badge>
        <Badge variant="secondary" className="text-xs">2 follow-ups</Badge>
      </div>
    </div>
  ),
};

// Small Badges
export const SmallBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="text-xs px-2 py-0.5">Extra Small</Badge>
      <Badge>Default Size</Badge>
      <Badge className="text-sm px-3 py-1">Larger</Badge>
    </div>
  ),
};

// Usage Guidelines Example
export const UsageGuidelines: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-semibold mb-2 text-green-600">✓ Good Example</h3>
        <div className="border rounded-lg p-4">
          <div className="flex gap-2 mb-2">
            <Badge variant="outline">Casa</Badge>
            <Badge className="bg-green-100 text-green-700">Disponível</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Max 1-2 badges per element, semantic colors, meaningful information
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-red-600">✗ Bad Example</h3>
        <div className="border rounded-lg p-4">
          <div className="flex gap-1 flex-wrap mb-2">
            <Badge>Casa</Badge>
            <Badge variant="secondary">3 quartos</Badge>
            <Badge variant="outline">2 banheiros</Badge>
            <Badge className="bg-blue-100 text-blue-700">Garagem</Badge>
            <Badge className="bg-purple-100 text-purple-700">Novo</Badge>
            <Badge className="bg-yellow-100 text-yellow-700">Destaque</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Too many badges create visual clutter and information overload
          </p>
        </div>
      </div>
    </div>
  ),
};

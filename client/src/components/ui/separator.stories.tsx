import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './separator';
import { Card, CardContent } from './card';
import { Button } from './button';

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

// Horizontal Separator
export const Horizontal: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <p className="text-sm">Seção 1</p>
      <Separator />
      <p className="text-sm">Seção 2</p>
      <Separator />
      <p className="text-sm">Seção 3</p>
    </div>
  ),
};

// Vertical Separator
export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center space-x-4">
      <span>Item 1</span>
      <Separator orientation="vertical" />
      <span>Item 2</span>
      <Separator orientation="vertical" />
      <span>Item 3</span>
    </div>
  ),
};

// In Content
export const InContent: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <div>
        <h3 className="text-lg font-semibold">Informações do Imóvel</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Apartamento 3 quartos no Centro
        </p>
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Preço:</span>
          <span className="font-medium">R$ 450.000</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Área:</span>
          <span className="font-medium">120m²</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Quartos:</span>
          <span className="font-medium">3</span>
        </div>
      </div>
      <Separator />
      <div>
        <p className="text-sm text-muted-foreground">
          Imóvel disponível para visita
        </p>
      </div>
    </div>
  ),
};

// In Card
export const InCard: Story = {
  render: () => (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="font-semibold">Resumo Financeiro</h3>
          <p className="text-sm text-muted-foreground">Dezembro 2024</p>
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Receitas</span>
            <span className="text-sm font-medium text-green-600">R$ 45.000</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Despesas</span>
            <span className="text-sm font-medium text-red-600">R$ 12.000</span>
          </div>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="font-medium">Saldo</span>
          <span className="font-bold text-lg">R$ 33.000</span>
        </div>
      </CardContent>
    </Card>
  ),
};

// Menu Separator
export const MenuSeparator: Story = {
  render: () => (
    <div className="w-56 border rounded-lg p-2">
      <div className="px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer">
        Ver Detalhes
      </div>
      <div className="px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer">
        Editar
      </div>
      <div className="px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer">
        Duplicar
      </div>
      <Separator className="my-2" />
      <div className="px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer">
        Compartilhar
      </div>
      <div className="px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer">
        Exportar
      </div>
      <Separator className="my-2" />
      <div className="px-2 py-1.5 text-sm text-destructive hover:bg-accent rounded cursor-pointer">
        Excluir
      </div>
    </div>
  ),
};

// Toolbar Separator
export const ToolbarSeparator: Story = {
  render: () => (
    <div className="flex items-center gap-2 p-2 border rounded-lg">
      <Button variant="ghost" size="sm">Negrito</Button>
      <Button variant="ghost" size="sm">Itálico</Button>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="sm">Alinhar Esquerda</Button>
      <Button variant="ghost" size="sm">Centralizar</Button>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="sm">Link</Button>
      <Button variant="ghost" size="sm">Imagem</Button>
    </div>
  ),
};

// Section Divider with Text
export const SectionDivider: Story = {
  render: () => (
    <div className="w-full max-w-2xl space-y-8">
      <div>
        <p className="text-sm">Conteúdo da primeira seção</p>
      </div>
      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          ou
        </span>
      </div>
      <div>
        <p className="text-sm">Conteúdo da segunda seção</p>
      </div>
    </div>
  ),
};

// Breadcrumb Separator
export const BreadcrumbSeparator: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm">
      <span>Imóveis</span>
      <Separator orientation="vertical" className="h-4" />
      <span>Apartamentos</span>
      <Separator orientation="vertical" className="h-4" />
      <span className="text-muted-foreground">Centro</span>
    </div>
  ),
};

// Stats Grid with Separators
export const StatsGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-0 w-full max-w-2xl border rounded-lg overflow-hidden">
      <div className="p-4 text-center">
        <p className="text-2xl font-bold">142</p>
        <p className="text-xs text-muted-foreground mt-1">Imóveis</p>
      </div>
      <Separator orientation="vertical" />
      <div className="p-4 text-center">
        <p className="text-2xl font-bold">38</p>
        <p className="text-xs text-muted-foreground mt-1">Leads</p>
      </div>
      <Separator orientation="vertical" />
      <div className="p-4 text-center">
        <p className="text-2xl font-bold">24</p>
        <p className="text-xs text-muted-foreground mt-1">Visitas</p>
      </div>
    </div>
  ),
};

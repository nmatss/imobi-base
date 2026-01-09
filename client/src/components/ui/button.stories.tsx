import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Plus, Download, Trash, ArrowRight, Loader2 } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Variants
export const Default: Story = {
  args: {
    children: 'Button',
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

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const Icon: Story = {
  args: {
    size: 'icon',
    children: <Plus />,
  },
};

// With Icons
export const WithIconLeft: Story = {
  args: {
    children: (
      <>
        <Plus className="h-4 w-4" />
        Novo Imóvel
      </>
    ),
  },
};

export const WithIconRight: Story = {
  args: {
    children: (
      <>
        Continuar
        <ArrowRight className="h-4 w-4" />
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    size: 'icon',
    variant: 'outline',
    children: <Download className="h-4 w-4" />,
  },
};

// States
export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'Carregando...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const LoadingWithIcon: Story = {
  args: {
    isLoading: true,
    children: (
      <>
        <Plus className="h-4 w-4" />
        Salvando...
      </>
    ),
  },
};

// Real-world examples
export const AddProperty: Story = {
  args: {
    children: (
      <>
        <Plus className="h-4 w-4" />
        Novo Imóvel
      </>
    ),
  },
};

export const DeleteProperty: Story = {
  args: {
    variant: 'destructive',
    children: (
      <>
        <Trash className="h-4 w-4" />
        Excluir
      </>
    ),
  },
};

export const ExportData: Story = {
  args: {
    variant: 'outline',
    children: (
      <>
        <Download className="h-4 w-4" />
        Exportar
      </>
    ),
  },
};

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

// All Sizes Showcase
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Plus /></Button>
    </div>
  ),
};

// Button Group Example
export const ButtonGroup: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="outline">Cancelar</Button>
      <Button>Salvar</Button>
    </div>
  ),
};

// Action Buttons Example
export const ActionButtons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline">
        <Download className="h-4 w-4" />
        Exportar
      </Button>
      <Button size="sm" variant="outline">
        Filtrar
      </Button>
      <Button size="sm">
        <Plus className="h-4 w-4" />
        Novo
      </Button>
    </div>
  ),
};

// Loading States
export const LoadingStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button isLoading>Default Loading</Button>
      <Button variant="outline" isLoading>Outline Loading</Button>
      <Button variant="destructive" isLoading>Destructive Loading</Button>
    </div>
  ),
};

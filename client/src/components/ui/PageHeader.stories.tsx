import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from './PageHeader';
import { Button } from './button';
import { Plus, Download, Filter } from 'lucide-react';

const meta: Meta<typeof PageHeader> = {
  title: 'UI/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
    description: 'Visão geral do sistema',
  },
};

export const WithBadge: Story = {
  args: {
    title: 'Novos Recursos',
    description: 'Confira as novidades da plataforma',
    badge: {
      label: 'Beta',
      variant: 'secondary',
    },
  },
};

export const WithSingleAction: Story = {
  args: {
    title: 'Imóveis',
    description: 'Gerencie seus imóveis cadastrados',
    actions: (
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Novo Imóvel
      </Button>
    ),
  },
};

export const WithMultipleActions: Story = {
  args: {
    title: 'Relatórios',
    description: 'Análises e exportações de dados',
    actions: (
      <>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtrar
        </Button>
        <Button size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </>
    ),
  },
};

export const WithBadgeAndActions: Story = {
  args: {
    title: 'Leads',
    description: 'Gerenciamento de oportunidades',
    badge: {
      label: 'Novo',
      variant: 'default',
    },
    actions: (
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Novo Lead
      </Button>
    ),
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Gestão de Contratos e Documentação de Imóveis',
    description: 'Administre todos os contratos de aluguel e compra/venda com documentação completa',
    actions: (
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Novo Contrato
      </Button>
    ),
  },
};

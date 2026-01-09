import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['success', 'warning', 'error', 'info', 'neutral'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Success: Story = {
  args: {
    status: 'success',
    label: 'Aprovado',
  },
};

export const Warning: Story = {
  args: {
    status: 'warning',
    label: 'Pendente',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    label: 'Rejeitado',
  },
};

export const Info: Story = {
  args: {
    status: 'info',
    label: 'Em análise',
  },
};

export const Neutral: Story = {
  args: {
    status: 'neutral',
    label: 'Rascunho',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <StatusBadge status="success" label="Aprovado" />
      <StatusBadge status="warning" label="Pendente" />
      <StatusBadge status="error" label="Rejeitado" />
      <StatusBadge status="info" label="Em análise" />
      <StatusBadge status="neutral" label="Rascunho" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <StatusBadge status="success" label="Pequeno" size="sm" />
      <StatusBadge status="success" label="Médio" size="md" />
      <StatusBadge status="success" label="Grande" size="lg" />
    </div>
  ),
};

export const PropertyStatuses: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <StatusBadge status="success" label="Disponível" />
      <StatusBadge status="warning" label="Reservado" />
      <StatusBadge status="error" label="Vendido" />
      <StatusBadge status="info" label="Em Negociação" />
      <StatusBadge status="neutral" label="Indisponível" />
    </div>
  ),
};

export const LeadStatuses: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <StatusBadge status="info" label="Novo" size="sm" />
      <StatusBadge status="warning" label="Em Contato" size="sm" />
      <StatusBadge status="success" label="Qualificado" size="sm" />
      <StatusBadge status="error" label="Perdido" size="sm" />
    </div>
  ),
};

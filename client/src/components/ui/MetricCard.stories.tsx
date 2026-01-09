import type { Meta, StoryObj } from '@storybook/react';
import { MetricCard } from './MetricCard';
import { Building2, Users, Calendar, FileText, DollarSign, TrendingUp } from 'lucide-react';

const meta: Meta<typeof MetricCard> = {
  title: 'UI/MetricCard',
  component: MetricCard,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Default: Story = {
  args: {
    icon: Building2,
    label: 'Imóveis Ativos',
    value: 42,
  },
};

export const WithTrendUp: Story = {
  args: {
    icon: Users,
    label: 'Leads do Mês',
    value: 127,
    trend: {
      value: '+12%',
      direction: 'up',
      label: 'vs mês anterior',
    },
  },
};

export const WithTrendDown: Story = {
  args: {
    icon: Calendar,
    label: 'Visitas Agendadas',
    value: 8,
    trend: {
      value: '-3',
      direction: 'down',
      label: 'vs semana anterior',
    },
  },
};

export const WithTrendNeutral: Story = {
  args: {
    icon: FileText,
    label: 'Contratos Pendentes',
    value: 5,
    trend: {
      value: '0%',
      direction: 'neutral',
      label: 'sem mudanças',
    },
  },
};

export const Clickable: Story = {
  args: {
    icon: DollarSign,
    label: 'Receita Mensal',
    value: 'R$ 45.000',
    trend: {
      value: '+8%',
      direction: 'up',
    },
    onClick: () => alert('Navegando para detalhes financeiros...'),
  },
};

export const LargeValue: Story = {
  args: {
    icon: TrendingUp,
    label: 'Total de Transações',
    value: '1.234.567',
    trend: {
      value: '+15.3%',
      direction: 'up',
      label: 'crescimento anual',
    },
  },
};

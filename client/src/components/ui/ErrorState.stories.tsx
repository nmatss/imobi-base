import type { Meta, StoryObj } from '@storybook/react';
import { ErrorState, ErrorStateCompact, ErrorStateInline } from './ErrorState';
import { AlertTriangle, WifiOff, Database } from 'lucide-react';
import { Button } from './button';

const meta: Meta<typeof ErrorState> = {
  title: 'UI/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  argTypes: {
    onRetry: { action: 'retry clicked' },
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'warning'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {
  args: {
    title: 'Algo deu errado',
    description: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
  },
};

export const WithRetry: Story = {
  args: {
    title: 'Erro ao carregar dados',
    description: 'Não foi possível carregar os dados. Tente novamente.',
    onRetry: () => alert('Tentando novamente...'),
  },
};

export const Retrying: Story = {
  args: {
    title: 'Erro ao carregar dados',
    description: 'Não foi possível carregar os dados. Tente novamente.',
    onRetry: () => {},
    isRetrying: true,
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    title: 'Falha crítica',
    description: 'Ocorreu um erro grave no sistema. Entre em contato com o suporte.',
    onRetry: () => {},
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Atenção',
    description: 'Alguns dados podem estar desatualizados. Recarregue a página.',
    onRetry: () => {},
    retryText: 'Recarregar',
  },
};

export const WithCustomIcon: Story = {
  args: {
    title: 'Sem conexão',
    description: 'Verifique sua conexão com a internet e tente novamente.',
    icon: <WifiOff className="w-8 h-8" />,
    onRetry: () => {},
  },
};

export const WithCustomActions: Story = {
  args: {
    title: 'Banco de dados indisponível',
    description: 'Não foi possível conectar ao banco de dados.',
    icon: <Database className="w-8 h-8" />,
    actions: (
      <div className="flex gap-2">
        <Button onClick={() => alert('Tentando novamente')}>Tentar novamente</Button>
        <Button variant="outline" onClick={() => alert('Indo para início')}>
          Ir para início
        </Button>
      </div>
    ),
  },
};

export const SmallSize: Story = {
  args: {
    size: 'sm',
    title: 'Erro',
    description: 'Não foi possível completar a operação.',
    onRetry: () => {},
  },
};

export const LargeSize: Story = {
  args: {
    size: 'lg',
    title: 'Erro ao processar solicitação',
    description: 'Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.',
    onRetry: () => {},
  },
};

export const CompactExample: Story = {
  render: () => (
    <div className="max-w-2xl">
      <ErrorStateCompact
        message="Erro ao carregar imóveis"
        onRetry={() => alert('Tentando novamente')}
      />
    </div>
  ),
};

export const InlineExample: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <div className="border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">Nome completo</label>
        <input type="text" className="w-full border rounded px-3 py-2" />
      </div>
      <div className="border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">Email</label>
        <input type="email" className="w-full border rounded px-3 py-2 border-red-500" />
        <ErrorStateInline message="Email inválido" className="mt-2" />
      </div>
    </div>
  ),
};

export const NetworkError: Story = {
  args: {
    variant: 'warning',
    title: 'Conexão perdida',
    description: 'Sua conexão com a internet foi interrompida. Verifique sua rede e tente novamente.',
    icon: <WifiOff className="w-8 h-8" />,
    onRetry: () => {},
    retryText: 'Verificar conexão',
  },
};

export const NotFound: Story = {
  args: {
    title: 'Página não encontrada',
    description: 'A página que você está procurando não existe ou foi removida.',
    actions: (
      <Button onClick={() => alert('Ir para dashboard')}>Voltar ao início</Button>
    ),
  },
};

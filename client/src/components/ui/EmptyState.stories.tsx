import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';
import { Building2, Users, Calendar, FileText, Inbox, Search } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: Inbox,
    title: 'Nenhum item encontrado',
    description: 'Não há itens para exibir no momento.',
  },
};

export const WithAction: Story = {
  args: {
    icon: Building2,
    title: 'Nenhum imóvel cadastrado',
    description: 'Comece adicionando seu primeiro imóvel ao sistema.',
    action: {
      label: 'Adicionar Imóvel',
      onClick: () => alert('Abrir formulário de novo imóvel'),
    },
  },
};

export const NoLeads: Story = {
  args: {
    icon: Users,
    title: 'Nenhum lead encontrado',
    description: 'Você ainda não possui leads cadastrados. Importe ou adicione novos leads para começar.',
    action: {
      label: 'Novo Lead',
      onClick: () => {},
    },
  },
};

export const NoEvents: Story = {
  args: {
    icon: Calendar,
    title: 'Agenda vazia',
    description: 'Não há eventos ou compromissos agendados para este período.',
    action: {
      label: 'Agendar Evento',
      onClick: () => {},
    },
  },
};

export const NoDocuments: Story = {
  args: {
    icon: FileText,
    title: 'Sem documentos',
    description: 'Nenhum documento foi anexado a este imóvel ainda.',
    action: {
      label: 'Adicionar Documento',
      onClick: () => {},
    },
  },
};

export const NoSearchResults: Story = {
  args: {
    icon: Search,
    title: 'Nenhum resultado encontrado',
    description: 'Não encontramos nenhum resultado para sua busca. Tente usar outros termos.',
  },
};

export const WithoutAction: Story = {
  args: {
    icon: Inbox,
    title: 'Lista vazia',
    description: 'Esta seção está vazia no momento. Aguarde novas atualizações.',
  },
};

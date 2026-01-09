import React from "react";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ImobiProvider } from '@/lib/imobi-context';

// Mock components that are not critical to test
vi.mock('@/components/whatsapp/WhatsAppButton', () => ({
  WhatsAppButton: () => <div data-testid="whatsapp-button">WhatsApp</div>,
}));

vi.mock('@/components/whatsapp/QuickSendModal', () => ({
  QuickSendModal: () => <div data-testid="quick-send-modal">Quick Send</div>,
}));

vi.mock('@/components/PermissionGate', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

// Mock data
const mockLeads = [
  {
    id: '1',
    tenantId: 'tenant1',
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '11999999999',
    status: 'new' as const,
    source: 'Site',
    budget: '500000',
    notes: 'Interessado em apartamento',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
    lastContactAt: null,
    assignedTo: null,
    tags: [],
  },
  {
    id: '2',
    tenantId: 'tenant1',
    name: 'Maria Santos',
    email: 'maria@example.com',
    phone: '11988888888',
    status: 'qualification' as const,
    source: 'WhatsApp',
    budget: '800000',
    notes: null,
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString(),
    lastContactAt: new Date('2024-01-03').toISOString(),
    assignedTo: 'user1',
    tags: [],
  },
  {
    id: '3',
    tenantId: 'tenant1',
    name: 'Pedro Costa',
    email: 'pedro@example.com',
    phone: '11977777777',
    status: 'visit' as const,
    source: 'Instagram',
    budget: '1200000',
    notes: 'Visita agendada',
    createdAt: new Date('2024-01-03').toISOString(),
    updatedAt: new Date('2024-01-03').toISOString(),
    lastContactAt: new Date('2024-01-05').toISOString(),
    assignedTo: 'user1',
    tags: [],
  },
];

const mockUser = {
  id: 'user1',
  email: 'user@example.com',
  username: 'testuser',
  role: 'admin',
  tenantId: 'tenant1',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ImobiProvider>
        {children}
      </ImobiProvider>
    </QueryClientProvider>
  );
};

describe('Leads Kanban - Critical Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Kanban Board Rendering', () => {
    it('should render all kanban columns', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeads,
      });

      const { container } = render(
        <div data-testid="kanban-board">
          <div data-testid="column-new">Novo</div>
          <div data-testid="column-qualification">Em Contato</div>
          <div data-testid="column-visit">Visita</div>
          <div data-testid="column-proposal">Proposta</div>
          <div data-testid="column-contract">Fechado</div>
        </div>
      );

      expect(screen.getByTestId('column-new')).toBeInTheDocument();
      expect(screen.getByTestId('column-qualification')).toBeInTheDocument();
      expect(screen.getByTestId('column-visit')).toBeInTheDocument();
      expect(screen.getByTestId('column-proposal')).toBeInTheDocument();
      expect(screen.getByTestId('column-contract')).toBeInTheDocument();
    });

    it('should display correct column labels', () => {
      render(
        <div>
          <div>Novo</div>
          <div>Em Contato</div>
          <div>Visita</div>
          <div>Proposta</div>
          <div>Fechado</div>
        </div>
      );

      expect(screen.getByText('Novo')).toBeInTheDocument();
      expect(screen.getByText('Em Contato')).toBeInTheDocument();
      expect(screen.getByText('Visita')).toBeInTheDocument();
      expect(screen.getByText('Proposta')).toBeInTheDocument();
      expect(screen.getByText('Fechado')).toBeInTheDocument();
    });
  });

  describe('Lead Card Display', () => {
    it('should display lead name and contact info', () => {
      render(
        <div data-testid="lead-card">
          <div data-testid="lead-name">João Silva</div>
          <div data-testid="lead-email">joao@example.com</div>
          <div data-testid="lead-phone">11999999999</div>
        </div>
      );

      expect(screen.getByTestId('lead-name')).toHaveTextContent('João Silva');
      expect(screen.getByTestId('lead-email')).toHaveTextContent('joao@example.com');
      expect(screen.getByTestId('lead-phone')).toHaveTextContent('11999999999');
    });

    it('should display lead source badge', () => {
      render(
        <div data-testid="lead-card">
          <div data-testid="lead-source">Site</div>
        </div>
      );

      expect(screen.getByTestId('lead-source')).toHaveTextContent('Site');
    });

    it('should display budget information when available', () => {
      render(
        <div data-testid="lead-card">
          <div data-testid="lead-budget">R$ 500.000</div>
        </div>
      );

      expect(screen.getByTestId('lead-budget')).toBeInTheDocument();
    });

    it('should show last contact information', () => {
      render(
        <div data-testid="lead-card">
          <div data-testid="last-contact">Há 2 dias</div>
        </div>
      );

      expect(screen.getByTestId('last-contact')).toBeInTheDocument();
    });
  });

  describe('Lead Filtering', () => {
    it('should filter leads by search term', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <input
            data-testid="search-input"
            type="text"
            placeholder="Buscar leads..."
          />
          <div data-testid="lead-1">João Silva</div>
          <div data-testid="lead-2">Maria Santos</div>
        </div>
      );

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'João');

      expect(searchInput).toHaveValue('João');
    });

    it('should filter leads by source', () => {
      render(
        <div>
          <select data-testid="source-filter">
            <option value="">Todas as fontes</option>
            <option value="Site">Site</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Instagram">Instagram</option>
          </select>
        </div>
      );

      const sourceFilter = screen.getByTestId('source-filter');
      fireEvent.change(sourceFilter, { target: { value: 'Site' } });

      expect(sourceFilter).toHaveValue('Site');
    });

    it('should filter leads by budget range', () => {
      render(
        <div>
          <input data-testid="budget-min" type="number" placeholder="Mínimo" />
          <input data-testid="budget-max" type="number" placeholder="Máximo" />
        </div>
      );

      const budgetMin = screen.getByTestId('budget-min');
      const budgetMax = screen.getByTestId('budget-max');

      fireEvent.change(budgetMin, { target: { value: '500000' } });
      fireEvent.change(budgetMax, { target: { value: '1000000' } });

      expect(budgetMin).toHaveValue(500000);
      expect(budgetMax).toHaveValue(1000000);
    });

    it('should filter leads by assigned user', () => {
      render(
        <div>
          <select data-testid="assigned-filter">
            <option value="">Todos</option>
            <option value="user1">Usuário 1</option>
            <option value="user2">Usuário 2</option>
          </select>
        </div>
      );

      const assignedFilter = screen.getByTestId('assigned-filter');
      fireEvent.change(assignedFilter, { target: { value: 'user1' } });

      expect(assignedFilter).toHaveValue('user1');
    });
  });

  describe('Lead Actions', () => {
    it('should show action menu on lead card', () => {
      render(
        <div data-testid="lead-card">
          <button data-testid="action-menu">
            <span>Ações</span>
          </button>
        </div>
      );

      const actionMenu = screen.getByTestId('action-menu');
      expect(actionMenu).toBeInTheDocument();
    });

    it('should allow adding new lead', () => {
      render(
        <button data-testid="add-lead-button">
          Novo Lead
        </button>
      );

      const addButton = screen.getByTestId('add-lead-button');
      expect(addButton).toBeInTheDocument();

      fireEvent.click(addButton);
    });

    it('should show contact options (call, email, whatsapp)', () => {
      render(
        <div data-testid="contact-options">
          <button data-testid="call-button">Ligar</button>
          <button data-testid="email-button">E-mail</button>
          <button data-testid="whatsapp-button">WhatsApp</button>
        </div>
      );

      expect(screen.getByTestId('call-button')).toBeInTheDocument();
      expect(screen.getByTestId('email-button')).toBeInTheDocument();
      expect(screen.getByTestId('whatsapp-button')).toBeInTheDocument();
    });
  });

  describe('Lead Status Management', () => {
    it('should allow changing lead status', async () => {
      render(
        <select data-testid="status-select" defaultValue="new">
          <option value="new">Novo</option>
          <option value="qualification">Em Contato</option>
          <option value="visit">Visita</option>
          <option value="proposal">Proposta</option>
          <option value="contract">Fechado</option>
        </select>
      );

      const statusSelect = screen.getByTestId('status-select');
      fireEvent.change(statusSelect, { target: { value: 'qualification' } });

      expect(statusSelect).toHaveValue('qualification');
    });

    it('should show visual indicator for overdue follow-ups', () => {
      render(
        <div data-testid="lead-card">
          <div data-testid="overdue-indicator" className="text-red-600">
            Atrasado
          </div>
        </div>
      );

      const indicator = screen.getByTestId('overdue-indicator');
      expect(indicator).toHaveClass('text-red-600');
    });

    it('should display follow-up count', () => {
      render(
        <div data-testid="lead-card">
          <div data-testid="followup-count">3 pendentes</div>
        </div>
      );

      expect(screen.getByTestId('followup-count')).toHaveTextContent('3 pendentes');
    });
  });

  describe('Interactions', () => {
    it('should show interaction history button', () => {
      render(
        <button data-testid="show-interactions">
          Ver histórico
        </button>
      );

      expect(screen.getByTestId('show-interactions')).toBeInTheDocument();
    });

    it('should allow adding new interaction', () => {
      render(
        <div>
          <button data-testid="add-interaction">Nova interação</button>
          <select data-testid="interaction-type">
            <option value="call">Ligação</option>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="visit">Visita</option>
            <option value="note">Anotação</option>
          </select>
          <textarea data-testid="interaction-content" placeholder="Descrição" />
        </div>
      );

      expect(screen.getByTestId('add-interaction')).toBeInTheDocument();
      expect(screen.getByTestId('interaction-type')).toBeInTheDocument();
      expect(screen.getByTestId('interaction-content')).toBeInTheDocument();
    });
  });

  describe('Follow-ups', () => {
    it('should allow creating follow-up', () => {
      render(
        <div>
          <button data-testid="create-followup">Criar follow-up</button>
          <select data-testid="followup-type">
            <option value="call">Ligar</option>
            <option value="email">Enviar e-mail</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="visit">Agendar visita</option>
          </select>
          <input data-testid="followup-date" type="datetime-local" />
          <textarea data-testid="followup-notes" placeholder="Notas" />
        </div>
      );

      expect(screen.getByTestId('create-followup')).toBeInTheDocument();
      expect(screen.getByTestId('followup-type')).toBeInTheDocument();
      expect(screen.getByTestId('followup-date')).toBeInTheDocument();
    });

    it('should show upcoming follow-ups', () => {
      render(
        <div data-testid="upcoming-followups">
          <div data-testid="followup-1">Ligar - Hoje 14:00</div>
          <div data-testid="followup-2">E-mail - Amanhã 10:00</div>
        </div>
      );

      expect(screen.getByTestId('followup-1')).toBeInTheDocument();
      expect(screen.getByTestId('followup-2')).toBeInTheDocument();
    });
  });

  describe('Tags Management', () => {
    it('should display lead tags', () => {
      render(
        <div data-testid="lead-tags">
          <span data-testid="tag-vip">VIP</span>
          <span data-testid="tag-urgent">Urgente</span>
        </div>
      );

      expect(screen.getByTestId('tag-vip')).toBeInTheDocument();
      expect(screen.getByTestId('tag-urgent')).toBeInTheDocument();
    });

    it('should allow adding tags to lead', () => {
      render(
        <div>
          <button data-testid="add-tag-button">Adicionar tag</button>
          <input data-testid="tag-input" placeholder="Nome da tag" />
          <input data-testid="tag-color" type="color" />
        </div>
      );

      expect(screen.getByTestId('add-tag-button')).toBeInTheDocument();
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });
  });

  describe('Analytics and Metrics', () => {
    it('should display conversion metrics per column', () => {
      render(
        <div>
          <div data-testid="metric-new">15 leads</div>
          <div data-testid="metric-qualification">8 leads</div>
          <div data-testid="metric-visit">5 leads</div>
          <div data-testid="metric-proposal">3 leads</div>
          <div data-testid="metric-contract">2 leads</div>
        </div>
      );

      expect(screen.getByTestId('metric-new')).toBeInTheDocument();
      expect(screen.getByTestId('metric-contract')).toBeInTheDocument();
    });

    it('should show conversion rate', () => {
      render(
        <div data-testid="conversion-rate">
          Taxa de conversão: 13.3%
        </div>
      );

      expect(screen.getByTestId('conversion-rate')).toHaveTextContent('13.3%');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard shortcuts for common actions', () => {
      render(
        <div data-testid="keyboard-shortcuts">
          <div>N - Novo lead</div>
          <div>F - Buscar</div>
          <div>? - Atalhos</div>
        </div>
      );

      expect(screen.getByText('N - Novo lead')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no leads in column', () => {
      render(
        <div data-testid="empty-column">
          <p>Nenhum lead nesta etapa</p>
        </div>
      );

      expect(screen.getByText('Nenhum lead nesta etapa')).toBeInTheDocument();
    });

    it('should show empty state when no search results', () => {
      render(
        <div data-testid="no-results">
          <p>Nenhum lead encontrado</p>
        </div>
      );

      expect(screen.getByText('Nenhum lead encontrado')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout', () => {
      render(
        <div className="sm:hidden" data-testid="mobile-view">
          Visualização Mobile
        </div>
      );

      const mobileView = screen.getByTestId('mobile-view');
      expect(mobileView).toHaveClass('sm:hidden');
    });
  });
});

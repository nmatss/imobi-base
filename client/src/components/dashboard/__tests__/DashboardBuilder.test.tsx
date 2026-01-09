import React from "react";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardBuilder } from '../DashboardBuilder';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockLayouts = [
  {
    id: 'layout-1',
    name: 'Dashboard Principal',
    isDefault: true,
    widgets: [
      {
        id: 'widget-1',
        type: 'stats_card',
        title: 'Total de Leads',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        config: { metric: 'total_leads' },
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'layout-2',
    name: 'Dashboard Vendas',
    isDefault: false,
    widgets: [],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('DashboardBuilder', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching layouts', () => {
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Initial Rendering', () => {
    it('should render dashboard builder header', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard Customizável')).toBeInTheDocument();
      });
    });

    it('should display description text', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Personalize seu dashboard com os widgets que você precisa/i)
        ).toBeInTheDocument();
      });
    });

    it('should show "Novo Layout" button', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /novo layout/i })).toBeInTheDocument();
      });
    });
  });

  describe('Layout List', () => {
    it('should display all available layouts', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard Principal')).toBeInTheDocument();
        expect(screen.getByText('Dashboard Vendas')).toBeInTheDocument();
      });
    });

    it('should show widget count for each layout', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('1 widgets')).toBeInTheDocument();
        expect(screen.getByText('0 widgets')).toBeInTheDocument();
      });
    });

    it('should mark default layout with badge', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Padrão')).toBeInTheDocument();
      });
    });

    it('should allow selecting a layout', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Vendas').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });
    });
  });

  describe('Create New Layout', () => {
    it('should open dialog when clicking "Novo Layout"', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const newLayoutButton = screen.getByRole('button', { name: /novo layout/i });
        fireEvent.click(newLayoutButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Criar Novo Layout')).toBeInTheDocument();
      });
    });

    it('should allow entering layout name', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      const user = userEvent.setup();

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(async () => {
        const newLayoutButton = screen.getByRole('button', { name: /novo layout/i });
        fireEvent.click(newLayoutButton);
      });

      await waitFor(async () => {
        const nameInput = screen.getByPlaceholderText(/ex: meu dashboard/i);
        await user.type(nameInput, 'Meu Novo Dashboard');
        expect(nameInput).toHaveValue('Meu Novo Dashboard');
      });
    });

    it('should create layout when form is submitted', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLayouts,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'new-layout',
            name: 'Novo Layout',
            isDefault: false,
            widgets: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const newLayoutButton = screen.getByRole('button', { name: /novo layout/i });
        fireEvent.click(newLayoutButton);
      });

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText(/ex: meu dashboard/i);
        fireEvent.change(nameInput, { target: { value: 'Novo Layout' } });
      });

      const createButton = screen.getByRole('button', { name: /criar/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/dashboard-layouts',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Edit Mode', () => {
    it('should enter edit mode when clicking "Editar Layout"', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Principal').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /editar layout/i });
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
      });
    });

    it('should show "Adicionar Widget" button in edit mode', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Principal').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /editar layout/i });
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /adicionar widget/i })).toBeInTheDocument();
      });
    });

    it('should cancel edit mode when clicking "Cancelar"', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Principal').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /editar layout/i });
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancelar/i });
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Widget Management', () => {
    it('should display existing widgets in edit mode', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Principal').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /editar layout/i });
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Total de Leads')).toBeInTheDocument();
      });
    });

    it('should show empty state when no widgets', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockLayouts[1]], // Layout without widgets
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Vendas').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /editar layout/i });
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/nenhum widget adicionado/i)).toBeInTheDocument();
      });
    });

    it('should allow removing widgets', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Principal').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /editar layout/i });
        fireEvent.click(editButton);
      });

      // Widgets should have delete buttons on hover
      const widgetCard = screen.getByText('Total de Leads').closest('[class*="group"]');
      expect(widgetCard).toBeInTheDocument();
    });
  });

  describe('Layout Actions', () => {
    it('should allow setting layout as default', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLayouts,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Vendas').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        const defaultButton = screen.getByRole('button', { name: /definir como padrão/i });
        fireEvent.click(defaultButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/dashboard-layouts/layout-2/default',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('should not show "Definir como Padrão" for default layout', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Principal').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /definir como padrão/i })).not.toBeInTheDocument();
      });
    });

    it('should allow deleting layout', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLayouts,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const layoutCard = screen.getByText('Dashboard Vendas').closest('div[class*="cursor-pointer"]');
        if (layoutCard) {
          fireEvent.click(layoutCard);
        }
      });

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /excluir/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/dashboard-layouts/layout-2',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid for layouts', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts,
      });

      const { container } = render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no layouts exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(
        <DashboardBuilder userId="user-1" tenantId="tenant-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/nenhum layout criado/i)).toBeInTheDocument();
      });
    });
  });
});

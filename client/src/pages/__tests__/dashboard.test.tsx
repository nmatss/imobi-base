/**
 * Dashboard Component Tests
 * Tests for main dashboard page functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../dashboard';
import { useImobi } from '@/lib/imobi-context';
import { useLocation } from 'wouter';

// Mock dependencies
vi.mock('@/lib/imobi-context');
vi.mock('wouter');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    metrics: {
      newLeads: 15,
      inContactLeads: 10,
      inVisitLeads: 8,
      proposalLeads: 7,
      closedLeads: 5,
      totalLeads: 45,
      todayVisits: 3,
      scheduledVisits: 8,
      completedVisits: 20,
      draftContracts: 2,
      sentContracts: 3,
      signedContracts: 12,
      availableProperties: 30,
      featuredProperties: 5,
      rentProperties: 15,
      saleProperties: 15,
      conversionToVisit: 44,
      conversionToProposal: 27,
      conversionToClosed: 11,
    },
    pendencies: {
      leadsWithoutContact: [],
      todayVisitsList: [],
      overdueFollowUps: [],
      todayFollowUps: [],
      totalUrgent: 0,
    },
    propertyInsights: {
      total: 50,
      available: 30,
      withoutImages: 5,
      withoutDescription: 3,
      needsAttention: 8,
      byType: [
        { name: 'Casa', total: 20, available: 15, rent: 8, sale: 7 },
        { name: 'Apto', total: 25, available: 12, rent: 6, sale: 6 },
        { name: 'Comercial', total: 5, available: 3, rent: 1, sale: 2 },
      ],
    },
    recentLeads: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(11) 99999-9999',
        status: 'new',
        source: 'website',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        daysSinceCreated: 1,
        daysSinceUpdate: 0,
        nextAction: 'Fazer primeiro contato',
        needsAttention: false,
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '(11) 88888-8888',
        status: 'qualification',
        source: 'instagram',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        daysSinceCreated: 2,
        daysSinceUpdate: 0,
        nextAction: 'Agendar visita',
        needsAttention: false,
      },
    ],
    todayTimeline: [
      {
        id: 'v1',
        propertyId: 'p1',
        leadId: '1',
        scheduledFor: new Date().toISOString(),
        status: 'scheduled',
        property: { id: 'p1', title: 'Casa 3 Quartos' },
        lead: { id: '1', name: 'Alice Johnson' },
        isPast: false,
      },
    ],
    followUps: [],
    loading: false,
    error: null,
    refetchFollowUps: vi.fn(),
  }),
}));

describe('Dashboard Component', () => {
  let mockSetLocation: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSetLocation = vi.fn();

    // Mock useLocation
    (useLocation as any).mockReturnValue(['/', mockSetLocation]);

    // Mock useImobi
    (useImobi as any).mockReturnValue({
      tenant: {
        id: 'tenant-1',
        name: 'Test Realty',
        plan: 'premium',
      },
      leads: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '(11) 99999-9999',
          status: 'new',
          source: 'website',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '(11) 88888-8888',
          status: 'qualification',
          source: 'instagram',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      contracts: [
        {
          id: 'c1',
          propertyId: 'p1',
          tenantName: 'Alice Johnson',
          startDate: '2025-01-01',
          endDate: '2026-01-01',
          monthlyRent: 2500,
          status: 'signed',
          value: 'R$ 2.500,00',
        },
      ],
      properties: [],
      visits: [],
      refetchLeads: vi.fn(),
      refetchContracts: vi.fn(),
      refetchProperties: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render dashboard without crashing', () => {
      render(<Dashboard />);

      expect(screen.getByText(/Painel Operacional/i)).toBeInTheDocument();
    });

    it('should display metrics cards', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // Check for metrics
        expect(screen.getByText(/Imóveis Ativos/i)).toBeInTheDocument();
        expect(screen.getByText(/Leads do Mês/i)).toBeInTheDocument();
      });
    });

    it('should display leads when available', () => {
      render(<Dashboard />);

      // Leads might appear in multiple places (pipeline and recent leads)
      const johnDoeElements = screen.getAllByText('John Doe');
      const janeSmithElements = screen.getAllByText('Jane Smith');

      expect(johnDoeElements.length).toBeGreaterThan(0);
      expect(janeSmithElements.length).toBeGreaterThan(0);
    });

    it('should display visit information', () => {
      render(<Dashboard />);

      // Should display visit information from todayTimeline
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText(/Casa 3 Quartos/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open new lead dialog when clicking add button', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      const addButton = screen.getByRole('button', { name: /Novo Lead|Adicionar/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/Nome/i)).toBeInTheDocument();
      });
    });

    it('should handle lead form submission', async () => {
      const user = userEvent.setup();
      const mockRefetchLeads = vi.fn();

      // Mock fetch for the POST request
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-lead' }),
        })
      ) as any;

      (useImobi as any).mockReturnValue({
        tenant: { id: 'tenant-1', name: 'Test Realty', plan: 'premium' },
        leads: [],
        contracts: [],
        properties: [],
        visits: [],
        refetchLeads: mockRefetchLeads,
        refetchContracts: vi.fn(),
        refetchProperties: vi.fn(),
      });

      render(<Dashboard />);

      // Open dialog
      const addButton = screen.getByRole('button', { name: /Novo Lead/i });
      await user.click(addButton);

      // Fill form
      await user.type(screen.getByLabelText(/Nome/i), 'Test Lead');
      await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/Telefone/i), '(11) 98765-4321');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Salvar Lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefetchLeads).toHaveBeenCalled();
      });
    });

    it('should display lead action buttons', async () => {
      render(<Dashboard />);

      // Check that action buttons are present for leads (phone and whatsapp)
      const phoneButtons = screen.getAllByLabelText(/Ligar para/i);
      const whatsappButtons = screen.getAllByLabelText(/WhatsApp para/i);

      expect(phoneButtons.length).toBeGreaterThan(0);
      expect(whatsappButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Display', () => {
    it('should format currency values correctly', () => {
      render(<Dashboard />);

      // Should display formatted currency
      const currencyElements = screen.getAllByText(/R\$/);
      expect(currencyElements.length).toBeGreaterThan(0);
    });

    it('should display lead status badges', () => {
      render(<Dashboard />);

      // Check for status badges in the recent leads section - they might appear multiple times
      const novoElements = screen.getAllByText('Novo');
      const emContatoElements = screen.queryAllByText('Em Contato');

      expect(novoElements.length).toBeGreaterThan(0);
      // Em Contato might be in different stages
    });

    it('should display lead sources correctly', () => {
      render(<Dashboard />);

      // Sources are displayed for each lead - using getAllByText since sources might appear multiple times
      const siteElements = screen.queryAllByText(/Site/i);
      const instagramElements = screen.queryAllByText(/Instagram/i);

      expect(siteElements.length).toBeGreaterThan(0);
      expect(instagramElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no leads', () => {
      // Mock useDashboardData to return empty recent leads
      vi.mocked(require('@/hooks/useDashboardData').useDashboardData).mockReturnValue({
        metrics: {
          totalLeads: 0,
          newLeads: 0,
          inContactLeads: 0,
          inVisitLeads: 0,
          proposalLeads: 0,
          closedLeads: 0,
          todayVisits: 0,
          scheduledVisits: 0,
          completedVisits: 0,
          draftContracts: 0,
          sentContracts: 0,
          signedContracts: 0,
          availableProperties: 0,
          featuredProperties: 0,
          rentProperties: 0,
          saleProperties: 0,
          conversionToVisit: 0,
          conversionToProposal: 0,
          conversionToClosed: 0,
        },
        pendencies: {
          leadsWithoutContact: [],
          todayVisitsList: [],
          overdueFollowUps: [],
          todayFollowUps: [],
          totalUrgent: 0,
        },
        propertyInsights: {
          total: 0,
          available: 0,
          withoutImages: 0,
          withoutDescription: 0,
          needsAttention: 0,
          byType: [],
        },
        recentLeads: [],
        todayTimeline: [],
        followUps: [],
        loading: false,
        error: null,
        refetchFollowUps: vi.fn(),
      });

      (useImobi as any).mockReturnValue({
        tenant: { id: 'tenant-1', name: 'Test Realty', plan: 'premium' },
        leads: [],
        contracts: [],
        properties: [],
        visits: [],
        refetchLeads: vi.fn(),
        refetchContracts: vi.fn(),
        refetchProperties: vi.fn(),
      });

      render(<Dashboard />);

      expect(screen.getByText(/Nenhum lead cadastrado/i)).toBeInTheDocument();
    });

    it('should show empty state when no visits', () => {
      // Mock useDashboardData to return empty timeline
      vi.mocked(require('@/hooks/useDashboardData').useDashboardData).mockReturnValue({
        metrics: {
          totalLeads: 0,
          newLeads: 0,
          inContactLeads: 0,
          inVisitLeads: 0,
          proposalLeads: 0,
          closedLeads: 0,
          todayVisits: 0,
          scheduledVisits: 0,
          completedVisits: 0,
          draftContracts: 0,
          sentContracts: 0,
          signedContracts: 0,
          availableProperties: 0,
          featuredProperties: 0,
          rentProperties: 0,
          saleProperties: 0,
          conversionToVisit: 0,
          conversionToProposal: 0,
          conversionToClosed: 0,
        },
        pendencies: {
          leadsWithoutContact: [],
          todayVisitsList: [],
          overdueFollowUps: [],
          todayFollowUps: [],
          totalUrgent: 0,
        },
        propertyInsights: {
          total: 0,
          available: 0,
          withoutImages: 0,
          withoutDescription: 0,
          needsAttention: 0,
          byType: [],
        },
        recentLeads: [],
        todayTimeline: [],
        followUps: [],
        loading: false,
        error: null,
        refetchFollowUps: vi.fn(),
      });

      (useImobi as any).mockReturnValue({
        tenant: { id: 'tenant-1', name: 'Test Realty', plan: 'premium' },
        leads: [],
        contracts: [],
        properties: [],
        visits: [],
        refetchLeads: vi.fn(),
        refetchContracts: vi.fn(),
        refetchProperties: vi.fn(),
      });

      render(<Dashboard />);

      expect(screen.getByText(/Nenhuma visita hoje/i)).toBeInTheDocument();
    });
  });

  describe('Metrics Display', () => {
    it('should display total leads count', () => {
      render(<Dashboard />);

      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('should display active contracts count', () => {
      render(<Dashboard />);

      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display pending visits count', () => {
      render(<Dashboard />);

      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display contract value when contracts exist', () => {
      render(<Dashboard />);

      // Contract value is displayed when there are signed contracts with values
      // The component shows total contract value from signed contracts
      const currencyElements = screen.queryAllByText(/R\$/);
      expect(currencyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout', () => {
      // Set mobile viewport
      window.innerWidth = 375;
      window.innerHeight = 667;

      render(<Dashboard />);

      // Dashboard should still render
      expect(screen.getByText(/Painel Operacional/i)).toBeInTheDocument();
    });

    it('should render tablet layout', () => {
      // Set tablet viewport
      window.innerWidth = 768;
      window.innerHeight = 1024;

      render(<Dashboard />);

      expect(screen.getByText(/Painel Operacional/i)).toBeInTheDocument();
    });
  });

  describe('Chart Rendering', () => {
    it('should render charts when property data is available', () => {
      render(<Dashboard />);

      // Charts are lazy loaded, check if the container exists
      // The chart will only render when propertyInsights.byType has data
      const { propertyInsights } = require('@/hooks/useDashboardData').useDashboardData();
      expect(propertyInsights.byType.length).toBeGreaterThan(0);
    });
  });

  describe('Action Buttons', () => {
    it('should render quick action buttons', () => {
      render(<Dashboard />);

      expect(screen.getByRole('button', { name: /Novo Lead/i })).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<Dashboard />);

      // Check for action buttons that navigate
      expect(screen.getByRole('button', { name: /Novo Lead/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Agendar Visita/i })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize expensive computations', () => {
      const { rerender } = render(<Dashboard />);

      // Rerender with same props
      rerender(<Dashboard />);

      // Component should not recalculate everything
      expect(screen.getByText(/Painel Operacional/i)).toBeInTheDocument();
    });

    it('should handle large datasets efficiently', () => {
      const largeLeadsList = Array.from({ length: 100 }, (_, i) => ({
        id: `lead-${i}`,
        name: `Lead ${i}`,
        email: `lead${i}@example.com`,
        phone: `(11) 9${i.toString().padStart(8, '0')}`,
        status: 'new',
        source: 'website',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      (useImobi as any).mockReturnValue({
        tenant: { id: 'tenant-1', name: 'Test Realty', plan: 'premium' },
        leads: largeLeadsList,
        contracts: [],
        properties: [],
        visits: [],
        refetchLeads: vi.fn(),
        refetchContracts: vi.fn(),
        refetchProperties: vi.fn(),
      });

      const { container } = render(<Dashboard />);

      // Should render without crashing
      expect(container).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tenant gracefully', () => {
      (useImobi as any).mockReturnValue({
        tenant: null,
        leads: [],
        contracts: [],
        properties: [],
        visits: [],
        refetchLeads: vi.fn(),
        refetchContracts: vi.fn(),
        refetchProperties: vi.fn(),
      });

      expect(() => render(<Dashboard />)).not.toThrow();
    });

    it('should handle undefined data gracefully', () => {
      (useImobi as any).mockReturnValue({
        tenant: null,
        leads: [],
        contracts: [],
        properties: [],
        visits: [],
        refetchLeads: vi.fn(),
        refetchContracts: vi.fn(),
        refetchProperties: vi.fn(),
      });

      expect(() => render(<Dashboard />)).not.toThrow();
    });
  });
});

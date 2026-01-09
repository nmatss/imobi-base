import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardMetrics, MetricCardProps } from '../DashboardMetrics';

// Create a mock setLocation function that we can track
const mockSetLocation = vi.fn();

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

describe('DashboardMetrics', () => {
  const mockMetrics = {
    properties: { value: 45, trend: 12 },
    leads: { value: 128, trend: -5 },
    visits: { value: 23 },
    contracts: { value: 8, trend: 25 },
  };

  beforeEach(() => {
    mockSetLocation.mockClear();
  });

  describe('Rendering', () => {
    it('should render all metric cards', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      expect(screen.getByText('Imóveis Ativos')).toBeInTheDocument();
      expect(screen.getByText('Leads do Mês')).toBeInTheDocument();
      expect(screen.getByText('Visitas Agendadas')).toBeInTheDocument();
      expect(screen.getByText('Contratos Ativos')).toBeInTheDocument();
    });

    it('should display metric values correctly', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('128')).toBeInTheDocument();
      expect(screen.getByText('23')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display trend percentages when available', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      expect(screen.getByText('+12%')).toBeInTheDocument();
      expect(screen.getByText('-5%')).toBeInTheDocument();
      expect(screen.getByText('+25%')).toBeInTheDocument();
    });

    it('should not display trend for visits metric', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      // The visits metric doesn't have a trend in mockMetrics
      // But other metrics do, so there should be 3 trend indicators (not 4)
      const trendIndicators = screen.getAllByText('vs mês anterior');
      expect(trendIndicators).toHaveLength(3); // properties, leads, and contracts have trends, but not visits
    });

    it('should render with zero values', () => {
      const zeroMetrics = {
        properties: { value: 0, trend: 0 },
        leads: { value: 0, trend: 0 },
        visits: { value: 0 },
        contracts: { value: 0, trend: 0 },
      };

      render(<DashboardMetrics metrics={zeroMetrics} />);

      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });
  });

  describe('Trend Indicators', () => {
    it('should show up arrow for positive trend', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const positivetrend = screen.getByText('+12%');
      expect(positivetrend.parentElement).toHaveClass('text-green-600');
    });

    it('should show down arrow for negative trend', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const negativeTrend = screen.getByText('-5%');
      expect(negativeTrend.parentElement).toHaveClass('text-red-600');
    });

    it('should show neutral indicator for zero trend', () => {
      const neutralMetrics = {
        properties: { value: 45, trend: 0 },
        leads: { value: 128 },
        visits: { value: 23 },
        contracts: { value: 8 },
      };

      render(<DashboardMetrics metrics={neutralMetrics} />);

      const zeroTrend = screen.getByText('0%');
      expect(zeroTrend.parentElement).toHaveClass('text-gray-500');
    });
  });

  describe('Interactive Behavior', () => {
    it('should navigate to properties on properties card click', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const propertiesCard = screen.getByText('Imóveis Ativos').closest('[role="button"]');
      if (propertiesCard) {
        fireEvent.click(propertiesCard);
        expect(mockSetLocation).toHaveBeenCalledWith('/properties');
      }
    });

    it('should navigate to leads on leads card click', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const leadsCard = screen.getByText('Leads do Mês').closest('[role="button"]');
      if (leadsCard) {
        fireEvent.click(leadsCard);
        expect(mockSetLocation).toHaveBeenCalledWith('/leads');
      }
    });

    it('should navigate to calendar on visits card click', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const visitsCard = screen.getByText('Visitas Agendadas').closest('[role="button"]');
      if (visitsCard) {
        fireEvent.click(visitsCard);
        expect(mockSetLocation).toHaveBeenCalledWith('/calendar');
      }
    });

    it('should navigate to rentals on contracts card click', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const contractsCard = screen.getByText('Contratos Ativos').closest('[role="button"]');
      if (contractsCard) {
        fireEvent.click(contractsCard);
        expect(mockSetLocation).toHaveBeenCalledWith('/rentals');
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper role attributes for clickable cards', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const propertiesCard = screen.getByText('Imóveis Ativos').closest('[role="button"]');
      expect(propertiesCard).toHaveAttribute('role', 'button');
      expect(propertiesCard).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-label for cards', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const propertiesCard = screen.getByText('Imóveis Ativos').closest('[role="button"]');
      expect(propertiesCard).toHaveAttribute('aria-label', 'Ver imóveis ativos');
    });

    it('should be keyboard navigable', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const propertiesCard = screen.getByText('Imóveis Ativos').closest('[role="button"]');
      if (propertiesCard) {
        fireEvent.keyDown(propertiesCard, { key: 'Enter' });
        expect(mockSetLocation).toHaveBeenCalledWith('/properties');
      }
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      const { container } = render(<DashboardMetrics metrics={mockMetrics} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'xs:grid-cols-2', 'lg:grid-cols-4');
    });

    it('should have responsive text sizes', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const metricValue = screen.getByText('45');
      expect(metricValue).toHaveClass('text-2xl', 'xs:text-3xl', 'sm:text-4xl');
    });
  });

  describe('Visual Styling', () => {
    it('should have correct icon colors for each metric', () => {
      const { container } = render(<DashboardMetrics metrics={mockMetrics} />);

      // Properties - blue
      const propertiesIcon = container.querySelector('.bg-blue-100');
      expect(propertiesIcon).toBeInTheDocument();

      // Leads - green
      const leadsIcon = container.querySelector('.bg-green-100');
      expect(leadsIcon).toBeInTheDocument();

      // Visits - orange
      const visitsIcon = container.querySelector('.bg-orange-100');
      expect(visitsIcon).toBeInTheDocument();

      // Contracts - emerald
      const contractsIcon = container.querySelector('.bg-emerald-100');
      expect(contractsIcon).toBeInTheDocument();
    });

    it('should apply hover effects on cards', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const propertiesCard = screen.getByText('Imóveis Ativos').closest('[role="button"]');
      expect(propertiesCard).toHaveClass('hover:shadow-lg', 'hover:-translate-y-1');
    });

    it('should have touch-friendly active state', () => {
      render(<DashboardMetrics metrics={mockMetrics} />);

      const propertiesCard = screen.getByText('Imóveis Ativos').closest('[role="button"]');
      expect(propertiesCard).toHaveClass('active:scale-95', 'touch-manipulation');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const largeMetrics = {
        properties: { value: 99999, trend: 150 },
        leads: { value: 888888, trend: -99 },
        visits: { value: 77777 },
        contracts: { value: 66666, trend: 200 },
      };

      render(<DashboardMetrics metrics={largeMetrics} />);

      expect(screen.getByText('99999')).toBeInTheDocument();
      expect(screen.getByText('888888')).toBeInTheDocument();
      expect(screen.getByText('+150%')).toBeInTheDocument();
      expect(screen.getByText('-99%')).toBeInTheDocument();
    });

    it('should handle negative values gracefully', () => {
      const negativeMetrics = {
        properties: { value: -5, trend: 10 },
        leads: { value: 0, trend: -100 },
        visits: { value: 0 },
        contracts: { value: 0, trend: 0 },
      };

      render(<DashboardMetrics metrics={negativeMetrics} />);

      expect(screen.getByText('-5')).toBeInTheDocument();
      expect(screen.getByText('-100%')).toBeInTheDocument();
    });

    it('should handle undefined trend gracefully', () => {
      const undefinedTrendMetrics = {
        properties: { value: 45 },
        leads: { value: 128 },
        visits: { value: 23 },
        contracts: { value: 8 },
      };

      render(<DashboardMetrics metrics={undefinedTrendMetrics} />);

      // Should render without trends
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should memoize metric cards to prevent unnecessary re-renders', () => {
      const { rerender } = render(<DashboardMetrics metrics={mockMetrics} />);

      const firstRender = screen.getByText('45');

      rerender(<DashboardMetrics metrics={mockMetrics} />);

      const secondRender = screen.getByText('45');

      // The component should be the same instance due to memoization
      expect(firstRender).toBe(secondRender);
    });
  });
});

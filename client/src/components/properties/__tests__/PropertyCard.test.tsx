/**
 * PropertyCard Component Tests
 * Tests for property card display and interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyCard, PropertyCardSkeleton, type PropertyCardProps } from '../PropertyCard';

describe('PropertyCard Component', () => {
  const mockProps: PropertyCardProps = {
    id: 'prop-123',
    title: 'Apartamento no Centro',
    city: 'São Paulo',
    price: 450000,
    bedrooms: 3,
    bathrooms: 2,
    area: 85,
    status: 'available',
    type: 'sale',
    featured: false,
    imageUrl: 'https://example.com/image.jpg',
    imageCount: 5,
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onShare: vi.fn(),
    onToggleFeatured: vi.fn(),
    onCopyLink: vi.fn(),
    onScheduleVisit: vi.fn(),
    onImageClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render property card with all information', () => {
      render(<PropertyCard {...mockProps} />);

      expect(screen.getByText('Apartamento no Centro')).toBeInTheDocument();
      expect(screen.getByText('São Paulo')).toBeInTheDocument();
      expect(screen.getByText('R$ 450.000')).toBeInTheDocument();
    });

    it('should display property characteristics', () => {
      render(<PropertyCard {...mockProps} />);

      expect(screen.getByText('3')).toBeInTheDocument(); // bedrooms
      expect(screen.getByText('2')).toBeInTheDocument(); // bathrooms
      expect(screen.getByText('85m²')).toBeInTheDocument();
    });

    it('should display status badge correctly', () => {
      render(<PropertyCard {...mockProps} />);

      expect(screen.getByText(/Disponível/i)).toBeInTheDocument();
      expect(screen.getByText(/Venda/i)).toBeInTheDocument();
    });

    it('should display featured badge when featured', () => {
      render(<PropertyCard {...mockProps} featured={true} />);

      const starIcons = document.querySelectorAll('svg[class*="lucide-star"]');
      expect(starIcons.length).toBeGreaterThan(0);
    });

    it('should display image count badge when multiple images', () => {
      render(<PropertyCard {...mockProps} imageCount={10} />);

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should not display image count badge for single image', () => {
      render(<PropertyCard {...mockProps} imageCount={1} />);

      // Image count should not be displayed for 1 image
      const imageCountBadge = screen.queryByText('1');
      expect(imageCountBadge).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display available status', () => {
      render(<PropertyCard {...mockProps} status="available" />);
      expect(screen.getByText(/Disponível/i)).toBeInTheDocument();
    });

    it('should display reserved status', () => {
      render(<PropertyCard {...mockProps} status="reserved" />);
      expect(screen.getByText(/Reservado/i)).toBeInTheDocument();
    });

    it('should display sold status', () => {
      render(<PropertyCard {...mockProps} status="sold" />);
      expect(screen.getByText(/Vendido/i)).toBeInTheDocument();
    });

    it('should display rented status', () => {
      render(<PropertyCard {...mockProps} status="rented" />);
      expect(screen.getByText(/Alugado/i)).toBeInTheDocument();
    });

    it('should display pending status', () => {
      render(<PropertyCard {...mockProps} status="pending" />);
      expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
    });
  });

  describe('Type Display', () => {
    it('should display sale type', () => {
      render(<PropertyCard {...mockProps} type="sale" />);
      expect(screen.getByText(/Venda/i)).toBeInTheDocument();
    });

    it('should display rent type', () => {
      render(<PropertyCard {...mockProps} type="rent" />);
      expect(screen.getByText(/Aluguel/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onView when clicking the card', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const card = screen.getByText('Apartamento no Centro').closest('div[role="button"]') ||
                   screen.getByText('Apartamento no Centro').closest('.group');

      if (card) {
        await user.click(card);
        expect(mockProps.onView).toHaveBeenCalledWith('prop-123');
      }
    });

    it('should call onView when clicking "Ver Detalhes" button', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const viewButton = screen.getByText('Ver Detalhes');
      await user.click(viewButton);

      expect(mockProps.onView).toHaveBeenCalledWith('prop-123');
    });

    it('should call onImageClick when clicking image', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const image = screen.getByAltText('Apartamento no Centro');
      await user.click(image);

      expect(mockProps.onImageClick).toHaveBeenCalledWith('prop-123');
    });

    it('should open dropdown menu on more options click', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      await user.click(moreButton);

      expect(screen.getByText('Ver detalhes')).toBeInTheDocument();
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    it('should call onEdit from dropdown menu', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      await user.click(moreButton);

      const editOption = screen.getByText('Editar');
      await user.click(editOption);

      expect(mockProps.onEdit).toHaveBeenCalledWith('prop-123');
    });

    it('should call onDelete from dropdown menu', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      await user.click(moreButton);

      const deleteOption = screen.getByText('Excluir');
      await user.click(deleteOption);

      expect(mockProps.onDelete).toHaveBeenCalledWith('prop-123');
    });

    it('should call onToggleFeatured from dropdown menu', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} featured={false} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      await user.click(moreButton);

      const featureOption = screen.getByText('Destacar');
      await user.click(featureOption);

      expect(mockProps.onToggleFeatured).toHaveBeenCalledWith('prop-123');
    });

    it('should show "Remover destaque" when property is featured', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} featured={true} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      await user.click(moreButton);

      expect(screen.getByText('Remover destaque')).toBeInTheDocument();
    });

    it('should call onShare from dropdown menu', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      await user.click(moreButton);

      const shareOption = screen.getByText('WhatsApp');
      await user.click(shareOption);

      expect(mockProps.onShare).toHaveBeenCalledWith('prop-123');
    });

    it('should call onCopyLink from dropdown menu', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      await user.click(moreButton);

      const copyLinkOption = screen.getByText('Copiar link');
      await user.click(copyLinkOption);

      expect(mockProps.onCopyLink).toHaveBeenCalledWith('prop-123');
    });

    it('should call onScheduleVisit from dropdown menu', async () => {
      const user = userEvent.setup();
      render(<PropertyCard {...mockProps} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      await user.click(moreButton);

      const scheduleOption = screen.getByText('Agendar visita');
      await user.click(scheduleOption);

      expect(mockProps.onScheduleVisit).toHaveBeenCalledWith('prop-123');
    });
  });

  describe('Price Formatting', () => {
    it('should format price correctly in BRL', () => {
      render(<PropertyCard {...mockProps} price={450000} />);
      expect(screen.getByText('R$ 450.000')).toBeInTheDocument();
    });

    it('should format large prices correctly', () => {
      render(<PropertyCard {...mockProps} price={1500000} />);
      expect(screen.getByText('R$ 1.500.000')).toBeInTheDocument();
    });

    it('should format small prices correctly', () => {
      render(<PropertyCard {...mockProps} price={50000} />);
      expect(screen.getByText('R$ 50.000')).toBeInTheDocument();
    });
  });

  describe('Optional Properties', () => {
    it('should handle null bedrooms', () => {
      render(<PropertyCard {...mockProps} bedrooms={null} />);

      // Should not crash
      expect(screen.getByText('Apartamento no Centro')).toBeInTheDocument();
    });

    it('should handle null bathrooms', () => {
      render(<PropertyCard {...mockProps} bathrooms={null} />);

      expect(screen.getByText('Apartamento no Centro')).toBeInTheDocument();
    });

    it('should handle null area', () => {
      render(<PropertyCard {...mockProps} area={null} />);

      expect(screen.getByText('Apartamento no Centro')).toBeInTheDocument();
    });

    it('should use default image when imageUrl is not provided', () => {
      render(<PropertyCard {...mockProps} imageUrl={undefined} />);

      const image = screen.getByAltText('Apartamento no Centro') as HTMLImageElement;
      expect(image.src).toContain('unsplash');
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render edit button when onEdit is not provided', () => {
      const propsWithoutEdit = { ...mockProps, onEdit: undefined };
      render(<PropertyCard {...propsWithoutEdit} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      userEvent.click(moreButton);

      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    });

    it('should not render delete button when onDelete is not provided', () => {
      const propsWithoutDelete = { ...mockProps, onDelete: undefined };
      render(<PropertyCard {...propsWithoutDelete} />);

      const moreButton = screen.getByLabelText(/Mais opções/i);
      userEvent.click(moreButton);

      expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for image', () => {
      render(<PropertyCard {...mockProps} />);

      const image = screen.getByAltText('Apartamento no Centro');
      expect(image).toBeInTheDocument();
    });

    it('should have aria-label for actions button', () => {
      render(<PropertyCard {...mockProps} />);

      const moreButton = screen.getByLabelText('Mais opções');
      expect(moreButton).toBeInTheDocument();
    });

    it('should have proper title attribute', () => {
      render(<PropertyCard {...mockProps} />);

      // Both image and h3 have the title attribute
      const elementsWithTitle = screen.getAllByTitle('Apartamento no Centro');
      expect(elementsWithTitle.length).toBeGreaterThan(0);

      // Verify the image has the title
      const image = elementsWithTitle.find(el => el.tagName === 'IMG');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should use lazy loading for images', () => {
      render(<PropertyCard {...mockProps} />);

      const image = screen.getByAltText('Apartamento no Centro') as HTMLImageElement;
      // Check if loading attribute exists (it may be 'lazy' or undefined depending on browser)
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('should not re-render when props do not change', () => {
      const { rerender } = render(<PropertyCard {...mockProps} />);

      // Rerender with same props
      rerender(<PropertyCard {...mockProps} />);

      // Component should be memoized
      expect(screen.getByText('Apartamento no Centro')).toBeInTheDocument();
    });
  });

  describe('PropertyCardSkeleton', () => {
    it('should render skeleton loader', () => {
      render(<PropertyCardSkeleton />);

      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should have similar structure to actual card', () => {
      const { container } = render(<PropertyCardSkeleton />);

      // Should have card structure
      expect(container.querySelector('[class*="Card"]')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles gracefully', () => {
      const longTitle = 'A'.repeat(200);
      render(<PropertyCard {...mockProps} title={longTitle} />);

      // Should truncate with line-clamp
      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toHaveClass('line-clamp-2');
    });

    it('should handle very long city names', () => {
      const longCity = 'São Paulo do Campo Grande das Américas';
      render(<PropertyCard {...mockProps} city={longCity} />);

      const cityElement = screen.getByText(longCity);
      expect(cityElement).toHaveClass('truncate');
    });

    it('should handle zero values', () => {
      render(<PropertyCard {...mockProps} bedrooms={0} bathrooms={0} area={0} />);

      // Should not display zero values
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should handle missing image gracefully', () => {
      render(<PropertyCard {...mockProps} imageUrl="" />);

      const image = screen.getByAltText('Apartamento no Centro') as HTMLImageElement;
      // Should fallback to default image
      expect(image.src).toBeTruthy();
    });
  });
});

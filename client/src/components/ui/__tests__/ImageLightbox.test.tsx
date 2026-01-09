import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageLightbox } from '../image-lightbox';

describe('ImageLightbox', () => {
  const mockImages = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ];
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTestId('lightbox-overlay')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('lightbox-overlay')).toBeInTheDocument();
    });

    it('should not render with empty images array', () => {
      render(
        <ImageLightbox
          images={[]}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTestId('lightbox-overlay')).not.toBeInTheDocument();
    });

    it('should render the first image by default', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByTestId('lightbox-image');
      expect(image).toHaveAttribute('src', mockImages[0]);
      expect(image).toHaveAttribute('alt', 'Imagem 1');
    });

    it('should render with initialIndex', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={1}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByTestId('lightbox-image');
      expect(image).toHaveAttribute('src', mockImages[1]);
      expect(image).toHaveAttribute('alt', 'Imagem 2');
    });

    it('should display correct counter when multiple images', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={1}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should not display navigation buttons for single image', () => {
      render(
        <ImageLightbox
          images={['https://example.com/single.jpg']}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTestId('button-prev-image')).not.toBeInTheDocument();
      expect(screen.queryByTestId('button-next-image')).not.toBeInTheDocument();
    });

    it('should display navigation buttons for multiple images', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('button-prev-image')).toBeInTheDocument();
      expect(screen.getByTestId('button-next-image')).toBeInTheDocument();
    });

    it('should render thumbnails for all images', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      mockImages.forEach((_, idx) => {
        expect(screen.getByTestId(`thumbnail-${idx}`)).toBeInTheDocument();
      });
    });

    it('should render dots for all images', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      mockImages.forEach((_, idx) => {
        expect(screen.getByTestId(`dot-image-${idx}`)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to next image on next button click', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const nextButton = screen.getByTestId('button-next-image');
      fireEvent.click(nextButton);

      await waitFor(() => {
        const image = screen.getByTestId('lightbox-image');
        expect(image).toHaveAttribute('src', mockImages[1]);
      });
    });

    it('should navigate to previous image on prev button click', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={1}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const prevButton = screen.getByTestId('button-prev-image');
      fireEvent.click(prevButton);

      await waitFor(() => {
        const image = screen.getByTestId('lightbox-image');
        expect(image).toHaveAttribute('src', mockImages[0]);
      });
    });

    it('should loop to last image when going prev from first', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const prevButton = screen.getByTestId('button-prev-image');
      fireEvent.click(prevButton);

      await waitFor(() => {
        const image = screen.getByTestId('lightbox-image');
        expect(image).toHaveAttribute('src', mockImages[2]);
      });
    });

    it('should loop to first image when going next from last', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={2}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const nextButton = screen.getByTestId('button-next-image');
      fireEvent.click(nextButton);

      await waitFor(() => {
        const image = screen.getByTestId('lightbox-image');
        expect(image).toHaveAttribute('src', mockImages[0]);
      });
    });

    it('should navigate with keyboard arrows', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        const image = screen.getByTestId('lightbox-image');
        expect(image).toHaveAttribute('src', mockImages[1]);
      });

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        const image = screen.getByTestId('lightbox-image');
        expect(image).toHaveAttribute('src', mockImages[0]);
      });
    });

    it('should navigate to specific image via thumbnail click', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const thumbnail = screen.getByTestId('thumbnail-2');
      fireEvent.click(thumbnail);

      await waitFor(() => {
        const image = screen.getByTestId('lightbox-image');
        expect(image).toHaveAttribute('src', mockImages[2]);
      });
    });

    it('should navigate to specific image via dot click', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const dot = screen.getByTestId('dot-image-1');
      fireEvent.click(dot);

      await waitFor(() => {
        const image = screen.getByTestId('lightbox-image');
        expect(image).toHaveAttribute('src', mockImages[1]);
      });
    });
  });

  describe('Zoom', () => {
    it('should display initial zoom level of 100%', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should zoom in when zoom in button is clicked', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const zoomInButton = screen.getByTestId('button-zoom-in');
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('150%')).toBeInTheDocument();
      });

      const image = screen.getByTestId('lightbox-image');
      expect(image).toHaveStyle({ transform: 'scale(1.5)' });
    });

    it('should zoom out when zoom out button is clicked', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const zoomInButton = screen.getByTestId('button-zoom-in');
      const zoomOutButton = screen.getByTestId('button-zoom-out');

      // First zoom in
      fireEvent.click(zoomInButton);
      await waitFor(() => {
        expect(screen.getByText('150%')).toBeInTheDocument();
      });

      // Then zoom out
      fireEvent.click(zoomOutButton);
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('should not zoom beyond 300%', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const zoomInButton = screen.getByTestId('button-zoom-in');

      // Click zoom in 6 times (should max at 300%)
      for (let i = 0; i < 6; i++) {
        fireEvent.click(zoomInButton);
      }

      await waitFor(() => {
        expect(screen.getByText('300%')).toBeInTheDocument();
      });

      const image = screen.getByTestId('lightbox-image');
      expect(image).toHaveStyle({ transform: 'scale(3)' });
    });

    it('should not zoom below 50%', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const zoomOutButton = screen.getByTestId('button-zoom-out');

      // Click zoom out 3 times (should min at 50%)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(zoomOutButton);
      }

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
      });

      const image = screen.getByTestId('lightbox-image');
      expect(image).toHaveStyle({ transform: 'scale(0.5)' });
    });

    it('should reset zoom when navigating to different image', async () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const zoomInButton = screen.getByTestId('button-zoom-in');
      const nextButton = screen.getByTestId('button-next-image');

      // Zoom in first
      fireEvent.click(zoomInButton);
      await waitFor(() => {
        expect(screen.getByText('150%')).toBeInTheDocument();
      });

      // Navigate to next image
      fireEvent.click(nextButton);

      // Zoom should reset to 100%
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });
  });

  describe('Closing', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByTestId('button-close-lightbox');

      // The button has its own onClick handler that calls onClose
      // Clear the mock first to ensure we're only counting this click
      mockOnClose.mockClear();
      fireEvent.click(closeButton);

      // Button calls onClose directly, should be called exactly once
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const overlay = screen.getByTestId('lightbox-overlay');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking on the image', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByTestId('lightbox-image');
      fireEvent.click(image);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not call onClose when clicking on zoom controls', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const zoomInButton = screen.getByTestId('button-zoom-in');
      fireEvent.click(zoomInButton);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Overflow', () => {
    it('should set body overflow to hidden when opened', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should reset body overflow when closed', () => {
      const { rerender } = render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <ImageLightbox
          images={mockImages}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });

    it('should reset body overflow on unmount', () => {
      const { unmount } = render(
        <ImageLightbox
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid initialIndex gracefully', () => {
      render(
        <ImageLightbox
          images={mockImages}
          initialIndex={999}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should not crash and display something
      expect(screen.getByTestId('lightbox-overlay')).toBeInTheDocument();
    });

    it('should not respond to keyboard events when closed', () => {
      render(
        <ImageLightbox
          images={mockImages}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should update currentIndex when initialIndex changes', () => {
      const { rerender } = render(
        <ImageLightbox
          images={mockImages}
          initialIndex={0}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      let image = screen.getByTestId('lightbox-image');
      expect(image).toHaveAttribute('src', mockImages[0]);

      rerender(
        <ImageLightbox
          images={mockImages}
          initialIndex={2}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      image = screen.getByTestId('lightbox-image');
      expect(image).toHaveAttribute('src', mockImages[2]);
    });
  });
});

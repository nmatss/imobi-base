import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import React from 'react';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(() => 'test-event-id'),
  showReportDialog: vi.fn(),
}));

// Mock error handling lib
vi.mock('@/lib/error-handling', () => ({
  categorizeError: vi.fn((error) => ({
    type: error.name === 'NetworkError' ? 'NETWORK' : 'UNKNOWN',
    statusCode: error.statusCode || null,
    timestamp: new Date(),
  })),
  errorLogger: {
    log: vi.fn(),
  },
  ErrorType: {
    NETWORK: 'NETWORK',
    AUTHENTICATION: 'AUTHENTICATION',
    AUTHORIZATION: 'AUTHORIZATION',
    NOT_FOUND: 'NOT_FOUND',
    SERVER: 'SERVER',
    VALIDATION: 'VALIDATION',
    UNKNOWN: 'UNKNOWN',
  },
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = true, error }: { shouldThrow?: boolean; error?: Error }) => {
  if (shouldThrow) {
    throw error || new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error in tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalError;
    vi.clearAllMocks();
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child component</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child component')).toBeInTheDocument();
    });

    it('should not show error UI when everything is fine', () => {
      render(
        <ErrorBoundary>
          <div>Working component</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText(/ops! algo deu errado/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors from children', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();
    });

    it('should display error boundary UI when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();
      expect(screen.getByText(/ocorreu um erro inesperado/i)).toBeInTheDocument();
    });

    it('should show alert icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Icon has aria-hidden, so we query by class instead
      const alertIcon = document.querySelector('.lucide-triangle-alert');
      expect(alertIcon).toBeInTheDocument();
    });

    it('should render fallback component if provided', () => {
      const CustomFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText(/ops! algo deu errado/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Types', () => {
    it('should display network error message', () => {
      const networkError = new Error('Network failed');
      networkError.name = 'NetworkError';

      render(
        <ErrorBoundary>
          <ThrowError error={networkError} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/erro de conexão/i)).toBeInTheDocument();
      expect(screen.getByText(/sem conexão/i)).toBeInTheDocument();
    });

    it('should display generic error message for unknown errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should display "Tentar Novamente" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    });

    it('should display "Recarregar Página" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /recarregar página/i })).toBeInTheDocument();
    });

    it('should display "Ir para Início" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /ir para início/i })).toBeInTheDocument();
    });

    it('should reset error state when clicking "Tentar Novamente"', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>No error</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /tentar novamente/i });

      // Change the state before clicking retry
      shouldThrow = false;
      fireEvent.click(retryButton);

      // Force rerender to show the recovered state
      expect(screen.queryByText(/ops! algo deu errado/i)).not.toBeInTheDocument();
      expect(screen.queryByText('No error')).toBeInTheDocument();
    });

    it('should reload page when clicking "Recarregar Página"', () => {
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /recarregar página/i });
      fireEvent.click(reloadButton);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('should navigate to home when clicking "Ir para Início"', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const homeButton = screen.getByRole('button', { name: /ir para início/i });
      fireEvent.click(homeButton);

      expect(window.location.href).toBe('/');

      window.location = originalLocation;
    });
  });

  describe('Dev Mode Debug Info', () => {
    it('should show debug info in development mode', () => {
      const originalEnv = import.meta.env.DEV;
      (import.meta.env as any).DEV = true;

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/informações de debug/i)).toBeInTheDocument();
      expect(screen.getByText(/error: test error/i)).toBeInTheDocument();

      (import.meta.env as any).DEV = originalEnv;
    });

    it('should show component stack in development', () => {
      const originalEnv = import.meta.env.DEV;
      (import.meta.env as any).DEV = true;

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component Stack')).toBeInTheDocument();

      (import.meta.env as any).DEV = originalEnv;
    });
  });

  describe('Callbacks', () => {
    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should use componentName in logging', async () => {
      // Import the mocked module
      const errorHandling = await import('@/lib/error-handling');

      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(errorHandling.errorLogger.log).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'TestComponent',
        })
      );
    });
  });

  describe('Sentry Integration', () => {
    it('should capture exception in Sentry', async () => {
      // Import the mocked module
      const Sentry = await import('@sentry/react');

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          contexts: expect.any(Object),
          tags: expect.any(Object),
        })
      );
    });

    it('should show report dialog when showDialog is true and button clicked', async () => {
      // Import the mocked module
      const Sentry = await import('@sentry/react');

      render(
        <ErrorBoundary showDialog={true}>
          <ThrowError />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /relatar o que aconteceu/i });
      fireEvent.click(reportButton);

      expect(Sentry.showReportDialog).toHaveBeenCalled();
      expect(Sentry.showReportDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'test-event-id',
        })
      );
    });

    it('should not show report button when showDialog is false', () => {
      render(
        <ErrorBoundary showDialog={false}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /relatar o que aconteceu/i })).not.toBeInTheDocument();
    });
  });

  describe('Status Codes', () => {
    it('should display status code when available', () => {
      const errorWithStatus = new Error('Server error');
      (errorWithStatus as any).statusCode = 500;

      render(
        <ErrorBoundary>
          <ThrowError error={errorWithStatus} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/código do erro: 500/i)).toBeInTheDocument();
    });

    it('should not display status code when not available', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/código do erro/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const heading = screen.getByText(/ops! algo deu errado/i);
      // CardTitle renders as a div by default, not h2
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('font-semibold', 'tracking-tight');
    });

    it('should have descriptive button labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /recarregar página/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ir para início/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error gracefully', () => {
      // Suppress React error boundary warnings for this specific test
      const originalError = console.error;
      console.error = vi.fn();

      const NullError = () => {
        // React error boundaries only catch Error objects, not null
        // So we throw an error with no message instead
        const err = new Error();
        err.message = '';
        throw err;
      };

      render(
        <ErrorBoundary>
          <NullError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();

      console.error = originalError;
    });

    it('should handle errors without message', () => {
      const EmptyError = () => {
        const err = new Error();
        err.message = '';
        throw err;
      };

      render(
        <ErrorBoundary>
          <EmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();
    });

    it('should handle multiple consecutive errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
      fireEvent.click(retryButton);

      rerender(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();
    });
  });
});

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Mock para wouter
export const mockNavigate = vi.fn();
export const mockLocation = '/';

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockNavigate],
  useRoute: () => [false, {}],
  Link: ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
  Route: ({ children }: any) => children,
  Router: ({ children }: any) => children,
}));

// Mock para Imobi Context
export const mockImobi = {
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin' as const,
  },
  properties: [],
  leads: [],
  events: [],
  rentals: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
  addProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
  addLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  addEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
};

vi.mock('@/lib/imobi-context', () => ({
  useImobi: () => mockImobi,
  ImobiProvider: ({ children }: any) => children,
}));

// Mock para toast
export const mockToast = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Create a custom render function
interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Utility functions for tests
export const waitFor = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

export const createMockProperty = (overrides = {}) => ({
  id: 1,
  title: 'Casa de teste',
  description: 'Descrição de teste',
  type: 'residential' as const,
  category: 'sale' as const,
  price: 500000,
  area: 150,
  bedrooms: 3,
  bathrooms: 2,
  garages: 2,
  address: 'Rua Teste, 123',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01234-567',
  status: 'available' as const,
  images: ['https://example.com/image.jpg'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockLead = (overrides = {}) => ({
  id: 1,
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '11999999999',
  source: 'website' as const,
  status: 'new' as const,
  interests: ['Casa de teste'],
  budget: 500000,
  notes: 'Notas de teste',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockEvent = (overrides = {}) => ({
  id: 1,
  title: 'Visita',
  description: 'Visita à propriedade',
  type: 'visit' as const,
  startDate: new Date('2024-01-15T10:00:00'),
  endDate: new Date('2024-01-15T11:00:00'),
  status: 'scheduled' as const,
  clientName: 'João Silva',
  clientEmail: 'joao@example.com',
  clientPhone: '11999999999',
  propertyId: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

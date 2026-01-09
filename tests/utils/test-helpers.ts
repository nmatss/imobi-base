import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed_password',
  tenantId: 1,
  role: 'admin',
  createdAt: new Date('2024-01-01'),
};

// Mock tenant data
export const mockTenant = {
  id: 1,
  name: 'Test Tenant',
  slug: 'test-tenant',
  planId: 'professional',
  isActive: true,
  createdAt: new Date('2024-01-01'),
};

// Mock property data
export const mockProperty = {
  id: 1,
  title: 'Test Property',
  description: 'A test property',
  type: 'apartment',
  status: 'available',
  price: 500000,
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  bedrooms: 3,
  bathrooms: 2,
  area: 100,
  tenantId: 1,
  createdBy: 1,
  createdAt: new Date('2024-01-01'),
};

// Mock lead data
export const mockLead = {
  id: 1,
  name: 'Test Lead',
  email: 'lead@example.com',
  phone: '+5511999999999',
  status: 'new',
  source: 'website',
  propertyId: 1,
  assignedTo: 1,
  tenantId: 1,
  createdAt: new Date('2024-01-01'),
};

// Mock contract data
export const mockContract = {
  id: 1,
  propertyId: 1,
  clientId: 1,
  type: 'rental',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  monthlyRent: 2000,
  status: 'active',
  tenantId: 1,
  createdAt: new Date('2024-01-01'),
};

// Test helpers
export const createTestUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
});

export const createTestTenant = (overrides = {}) => ({
  ...mockTenant,
  ...overrides,
});

export const createTestProperty = (overrides = {}) => ({
  ...mockProperty,
  ...overrides,
});

export const createTestLead = (overrides = {}) => ({
  ...mockLead,
  ...overrides,
});

export const createTestContract = (overrides = {}) => ({
  ...mockContract,
  ...overrides,
});

// Wait helper
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Mock sessionStorage
export const mockSessionStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Mock fetch response
export const mockFetchResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
  headers: new Headers(),
  redirected: false,
  statusText: ok ? 'OK' : 'Error',
  type: 'basic' as ResponseType,
  url: '',
  clone: vi.fn(),
  body: null,
  bodyUsed: false,
  arrayBuffer: async () => new ArrayBuffer(0),
  blob: async () => new Blob(),
  formData: async () => new FormData(),
});

// Create mock date
export const createMockDate = (isoString: string) => {
  const mockDate = new Date(isoString);
  const RealDate = Date;

  global.Date = class extends RealDate {
    constructor(...args: any[]) {
      super();
      if (args.length === 0) {
        return mockDate as any;
      }
      return Reflect.construct(RealDate, args) as any;
    }

    static now() {
      return mockDate.getTime();
    }
  } as any;

  return () => {
    global.Date = RealDate;
  };
};

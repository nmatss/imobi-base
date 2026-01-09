/**
 * Test data factories for E2E tests
 */

import { nanoid } from 'nanoid';

export const testData = {
  /**
   * Generate test property data
   */
  property: (overrides?: Partial<PropertyData>) => ({
    title: `Test Property ${nanoid(6)}`,
    description: 'Beautiful test property with amazing features',
    type: 'apartment',
    status: 'available',
    price: 500000,
    area: 120,
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    address: 'Rua Teste, 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    features: ['pool', 'gym', 'security'],
    ...overrides,
  }),

  /**
   * Generate test lead data
   */
  lead: (overrides?: Partial<LeadData>) => ({
    name: `Test Lead ${nanoid(6)}`,
    email: `lead-${nanoid(6)}@test.com`,
    phone: '(11) 98765-4321',
    source: 'website',
    status: 'new',
    notes: 'Test lead notes',
    budget: 400000,
    interests: ['apartment', 'house'],
    ...overrides,
  }),

  /**
   * Generate test visit data
   */
  visit: (overrides?: Partial<VisitData>) => ({
    title: `Property Visit ${nanoid(6)}`,
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    time: '14:00',
    duration: 60,
    notes: 'Test visit notes',
    ...overrides,
  }),

  /**
   * Generate test contract data
   */
  contract: (overrides?: Partial<ContractData>) => ({
    type: 'sale',
    value: 500000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 86400000).toISOString(), // 1 year
    commission: 5,
    status: 'draft',
    terms: 'Standard contract terms',
    ...overrides,
  }),

  /**
   * Generate test financial transaction data
   */
  transaction: (overrides?: Partial<TransactionData>) => ({
    type: 'income',
    category: 'commission',
    amount: 25000,
    date: new Date().toISOString(),
    description: 'Test transaction',
    status: 'completed',
    ...overrides,
  }),

  /**
   * Generate test user data
   */
  user: (overrides?: Partial<UserData>) => ({
    name: `Test User ${nanoid(6)}`,
    email: `user-${nanoid(6)}@test.com`,
    password: 'Test123!',
    role: 'user',
    ...overrides,
  }),
};

// Type definitions
interface PropertyData {
  title: string;
  description: string;
  type: string;
  status: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  features: string[];
}

interface LeadData {
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  notes: string;
  budget: number;
  interests: string[];
}

interface VisitData {
  title: string;
  date: string;
  time: string;
  duration: number;
  notes: string;
}

interface ContractData {
  type: string;
  value: number;
  startDate: string;
  endDate: string;
  commission: number;
  status: string;
  terms: string;
}

interface TransactionData {
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  status: string;
}

interface UserData {
  name: string;
  email: string;
  password: string;
  role: string;
}

/**
 * Database seeding helpers
 */
export async function seedTestData(apiContext: any) {
  // Create test properties
  const properties = await Promise.all([
    apiContext.post('/api/properties', {
      data: testData.property({ status: 'available' }),
    }),
    apiContext.post('/api/properties', {
      data: testData.property({ status: 'sold' }),
    }),
    apiContext.post('/api/properties', {
      data: testData.property({ status: 'rented' }),
    }),
  ]);

  // Create test leads
  const leads = await Promise.all([
    apiContext.post('/api/leads', {
      data: testData.lead({ status: 'new' }),
    }),
    apiContext.post('/api/leads', {
      data: testData.lead({ status: 'contacted' }),
    }),
    apiContext.post('/api/leads', {
      data: testData.lead({ status: 'qualified' }),
    }),
  ]);

  return { properties, leads };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(apiContext: any) {
  // Delete test properties
  await apiContext.delete('/api/test/cleanup/properties');

  // Delete test leads
  await apiContext.delete('/api/test/cleanup/leads');

  // Delete test visits
  await apiContext.delete('/api/test/cleanup/visits');

  // Delete test contracts
  await apiContext.delete('/api/test/cleanup/contracts');

  // Delete test transactions
  await apiContext.delete('/api/test/cleanup/transactions');
}

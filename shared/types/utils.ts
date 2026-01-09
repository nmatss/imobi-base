/**
 * Utility Types for ImobiBase
 *
 * Common TypeScript utility types used across the application
 * for better type safety and code reusability.
 */

// --- API Response Types ---

/**
 * Standard API response wrapper
 * @template T - The data type returned by the API
 */
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};

/**
 * Paginated API response
 * @template T - The type of items in the pagination
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Error response from API
 */
export type ErrorResponse = {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
  statusCode?: number;
};

// --- Type Guards ---

/**
 * Type guard to check if response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is { success: false; error: string; code?: string } {
  return response.success === false;
}

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is { success: true; data: T } {
  return response.success === true;
}

/**
 * Type guard to check if response is paginated
 */
export function isPaginatedResponse<T>(data: unknown): data is PaginatedResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    Array.isArray((data as PaginatedResponse<T>).items) &&
    'total' in data &&
    'page' in data &&
    'pageSize' in data
  );
}

/**
 * Type guard to check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if value is a valid string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// --- Report Types ---

/**
 * Generic report data structure
 */
export type ReportData<T = Record<string, unknown>> = {
  summary: Record<string, number | string>;
  details: T[];
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
};

/**
 * Owner report data
 */
export type OwnerReportData = ReportData<{
  ownerId: string;
  ownerName: string;
  totalProperties: number;
  totalContracts: number;
  totalRevenue: number;
  averageRent: number;
}>;

/**
 * Renter report data
 */
export type RenterReportData = ReportData<{
  renterId: string;
  renterName: string;
  propertyAddress: string;
  monthlyRent: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  daysOverdue?: number;
}>;

/**
 * Payment detailed report
 */
export type PaymentDetailedReportData = ReportData<{
  paymentId: string;
  propertyAddress: string;
  renterName: string;
  ownerName: string;
  dueDate: Date;
  paidDate?: Date;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}>;

/**
 * Overdue report data
 */
export type OverdueReportData = {
  totalOverdue: number;
  overdueCount: number;
  payments: Array<{
    paymentId: string;
    renterName: string;
    propertyAddress: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
  }>;
};

/**
 * Sales report data
 */
export type SalesReportData = {
  totalSales: number;
  totalValue: number;
  totalCommissions: number;
  averageSaleValue: number;
  salesByStatus: Record<string, number>;
  salesByBroker: Record<string, number>;
  salesList: Array<{
    saleId: string;
    propertyAddress: string;
    buyerName: string;
    saleValue: number;
    commissionValue: number;
    saleDate: Date;
    status: string;
  }>;
};

/**
 * Financial summary report
 */
export type FinancialSummaryReportData = {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  rentalsRevenue: number;
  salesRevenue: number;
  commissionsRevenue: number;
  period: {
    start: Date;
    end: Date;
  };
};

// --- JSON Conversion Helpers ---

/**
 * Safely parse JSON string to unknown type
 * Returns null if parsing fails
 */
export function safeJsonParse(str: string | null | undefined): unknown {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Safely parse JSON string to array
 * Returns null if parsing fails or result is not an array
 */
export function safeJsonParseArray<T = unknown>(str: string | null | undefined): T[] | null {
  const parsed = safeJsonParse(str);
  return Array.isArray(parsed) ? parsed as T[] : null;
}

/**
 * Convert array to JSON string
 * Returns null if input is null/undefined
 */
export function arrayToJson<T>(arr: T[] | null | undefined): string | null {
  if (!arr) return null;
  return JSON.stringify(arr);
}

// --- Form Validation Types ---

/**
 * Form field error
 */
export type FieldError = {
  field: string;
  message: string;
};

/**
 * Form validation result
 */
export type ValidationResult = {
  valid: boolean;
  errors: FieldError[];
};

/**
 * Async operation result
 */
export type AsyncResult<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

// --- Branded Types for IDs ---

/**
 * Create a branded type for IDs to prevent mixing different ID types
 */
export type Brand<K, T> = K & { __brand: T };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type PropertyId = Brand<string, 'PropertyId'>;
export type LeadId = Brand<string, 'LeadId'>;
export type ContractId = Brand<string, 'ContractId'>;

// --- Event Handler Types ---

/**
 * Generic event handler type
 */
export type EventHandler<T = Event> = (event: T) => void | Promise<void>;

/**
 * Form submit handler
 */
export type FormSubmitHandler = EventHandler<React.FormEvent<HTMLFormElement>>;

/**
 * Input change handler
 */
export type InputChangeHandler = EventHandler<React.ChangeEvent<HTMLInputElement>>;

/**
 * Select change handler
 */
export type SelectChangeHandler = (value: string) => void;

// --- Utility Functions ---

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Create a result from a promise (no throw)
 */
export async function resultify<T>(promise: Promise<T>): Promise<AsyncResult<T, Error>> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(getErrorMessage(error))
    };
  }
}

/**
 * Assert that a value is not null or undefined
 */
export function assertDefined<T>(value: T | null | undefined, message = 'Value is required'): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Check if object has a specific key
 */
export function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

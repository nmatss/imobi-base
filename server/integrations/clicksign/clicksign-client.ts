/**
 * ClickSign API Client
 * Official integration with ClickSign (Brazil) for e-signatures
 * https://developers.clicksign.com
 */

import fetch from 'node-fetch';

interface ClickSignConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

interface ClickSignError {
  code: string;
  message: string;
  details?: unknown;
}

export class ClickSignClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;

  constructor(config: ClickSignConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.clicksign.com/v3';
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
  }

  /**
   * Make an authenticated request to ClickSign API
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      retry?: number;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, retry = 0 } = options;
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ClickSignError = {
          code: `HTTP_${response.status}`,
          message: errorData.message || response.statusText,
          details: errorData,
        };

        // Retry on server errors or rate limits
        if (
          (response.status >= 500 || response.status === 429) &&
          retry < this.retryAttempts
        ) {
          const delay = Math.pow(2, retry) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request<T>(endpoint, { ...options, retry: retry + 1 });
        }

        throw error;
      }

      return await response.json() as T;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw {
          code: 'TIMEOUT',
          message: 'Request timeout',
        } as ClickSignError;
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T>(endpoint: string, file: Buffer, filename: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', file, filename);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        code: `HTTP_${response.status}`,
        message: errorData.message || response.statusText,
        details: errorData,
      } as ClickSignError;
    }

    return await response.json() as T;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to get documents list to test authentication
      await this.get('/documents?limit=1');
      return true;
    } catch (error) {
      console.error('ClickSign connection test failed:', error);
      return false;
    }
  }
}

/**
 * Create singleton instance
 */
let clickSignClient: ClickSignClient | null = null;

export function getClickSignClient(): ClickSignClient {
  if (!clickSignClient) {
    const apiKey = process.env.CLICKSIGN_API_KEY || 'dummy-key-for-development';
    if (!process.env.CLICKSIGN_API_KEY) {
      console.warn('⚠️  CLICKSIGN_API_KEY not configured. E-signature features will be limited.');
    }
    clickSignClient = new ClickSignClient({ apiKey });
  }
  return clickSignClient;
}

export type { ClickSignError, ClickSignConfig };

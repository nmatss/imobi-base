/**
 * API Client - Wrapper para requisições HTTP
 * Fornece métodos convenientes para comunicação com o backend
 */

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorMessage = `${res.status}: ${text}`;

    // Try to parse JSON error
    try {
      const json = JSON.parse(text);
      if (json.error) {
        errorMessage = json.error;
      }
    } catch {
      // Keep original error message
    }

    throw new Error(errorMessage);
  }
}

export const apiClient = {
  /**
   * GET request
   */
  async get<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    await throwIfResNotOk(res);
    return res.json();
  },

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });
    await throwIfResNotOk(res);
    return res.json();
  },

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'PUT',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });
    await throwIfResNotOk(res);
    return res.json();
  },

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });
    await throwIfResNotOk(res);
    return res.json();
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });
    await throwIfResNotOk(res);
    return res.json();
  },
};

export default apiClient;

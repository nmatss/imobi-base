import { describe, it, expect } from 'vitest';

// Debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Deep clone function
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Truncate string function
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

// Capitalize function
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Generate random ID
function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if object is empty
function isEmpty(obj: any): boolean {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

// Group array by key
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

describe('Helper Utilities', () => {
  describe('debounce', () => {
    it('should debounce function calls', async () => {
      let callCount = 0;
      const increment = () => callCount++;
      const debounced = debounce(increment, 100);

      debounced();
      debounced();
      debounced();

      expect(callCount).toBe(0);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callCount).toBe(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      let callCount = 0;
      const increment = () => callCount++;
      const throttled = throttle(increment, 100);

      throttled();
      throttled();
      throttled();

      expect(callCount).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 150));

      throttled();
      expect(callCount).toBe(2);
    });
  });

  describe('deepClone', () => {
    it('should deep clone objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('should deep clone arrays', () => {
      const original = [1, 2, [3, 4]];
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('This is a very long string', 10)).toBe('This is...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should handle exact length', () => {
      expect(truncate('Exactly10!', 10)).toBe('Exactly10!');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('generateId', () => {
    it('should generate ID with default length', () => {
      const id = generateId();
      expect(id).toHaveLength(8);
    });

    it('should generate ID with custom length', () => {
      const id = generateId(16);
      expect(id).toHaveLength(16);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('isEmpty', () => {
    it('should detect empty objects', () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty({ a: 1 })).toBe(false);
    });

    it('should detect empty arrays', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty([1])).toBe(false);
    });

    it('should detect null and undefined', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should handle non-empty values', () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty('')).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('groupBy', () => {
    it('should group array by key', () => {
      const data = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];

      const grouped = groupBy(data, 'category');

      expect(grouped['A']).toHaveLength(2);
      expect(grouped['B']).toHaveLength(1);
      expect(grouped['A'][0].value).toBe(1);
      expect(grouped['A'][1].value).toBe(3);
    });

    it('should handle empty array', () => {
      const grouped = groupBy([], 'key');
      expect(grouped).toEqual({});
    });
  });
});

import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'conditional', 'other');
      expect(result).toContain('base');
      expect(result).toContain('other');
      expect(result).not.toContain('conditional');
    });

    it('should handle undefined and null', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2', 'px-4');
      // tailwind-merge should keep only px-4
      expect(result).toBe('px-4');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2']);
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should handle objects with boolean values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      });
      expect(result).toContain('class1');
      expect(result).toContain('class3');
      expect(result).not.toContain('class2');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle complex combinations', () => {
      const result = cn(
        'base-class',
        { 'conditional': true },
        false && 'not-included',
        ['array1', 'array2'],
        'final'
      );
      expect(result).toContain('base-class');
      expect(result).toContain('conditional');
      expect(result).toContain('array1');
      expect(result).toContain('array2');
      expect(result).toContain('final');
      expect(result).not.toContain('not-included');
    });

    it('should resolve conflicting tailwind classes', () => {
      // When there are conflicting Tailwind utilities, tw-merge should keep the last one
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should preserve non-conflicting classes', () => {
      const result = cn('px-4', 'py-2', 'text-red-500');
      expect(result).toContain('px-4');
      expect(result).toContain('py-2');
      expect(result).toContain('text-red-500');
    });
  });
});

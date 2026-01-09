import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '../../../../client/src/hooks/use-toast';

describe('useToast Hook', () => {
  beforeEach(() => {
    // Clear any existing toasts before each test
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toasts.forEach((t) => result.current.dismiss(t.id));
    });
  });

  it('should initialize with empty toasts', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'This is a test toast',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].description).toBe('This is a test toast');
  });

  it('should limit toasts to TOAST_LIMIT (1)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Toast 1' });
      result.current.toast({ title: 'Toast 2' });
      result.current.toast({ title: 'Toast 3' });
    });

    // Should only keep the most recent toast
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Toast 3');
  });

  it('should dismiss a specific toast', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;

    act(() => {
      const { id } = result.current.toast({ title: 'Test Toast' });
      toastId = id;
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(toastId!);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should dismiss all toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Toast 1' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should generate unique IDs for toasts', () => {
    let id1!: ReturnType<typeof toast>;
    let id2!: ReturnType<typeof toast>;

    act(() => {
      id1 = toast({ title: 'Toast 1' });
      id2 = toast({ title: 'Toast 2' });
    });

    expect(id1.id).not.toBe(id2.id);
  });

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastInstance: ReturnType<typeof toast>;

    act(() => {
      toastInstance = result.current.toast({
        title: 'Original Title',
        description: 'Original Description',
      });
    });

    expect(result.current.toasts[0].title).toBe('Original Title');

    act(() => {
      toastInstance.update({
        id: toastInstance.id,
        title: 'Updated Title',
        description: 'Updated Description',
      });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
    expect(result.current.toasts[0].description).toBe('Updated Description');
  });

  it('should support custom variant', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Error Toast',
        variant: 'destructive',
      });
    });

    expect(result.current.toasts[0].variant).toBe('destructive');
  });

  it('should call onOpenChange when dismissed', () => {
    const { result } = renderHook(() => useToast());
    const onOpenChange = vi.fn();

    let toastId: string;

    act(() => {
      const { id } = result.current.toast({
        title: 'Test Toast',
      });
      toastId = id;
    });

    // The toast's onOpenChange is set internally
    const currentToast = result.current.toasts[0];
    expect(currentToast.onOpenChange).toBeDefined();

    act(() => {
      currentToast.onOpenChange?.(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should work with toast function directly', () => {
    let toastResult!: ReturnType<typeof toast>;

    act(() => {
      toastResult = toast({ title: 'Direct Toast' });
    });

    expect(toastResult.id).toBeDefined();
    expect(toastResult.dismiss).toBeDefined();
    expect(toastResult.update).toBeDefined();

    act(() => {
      toastResult.dismiss();
    });

    // Toast should be dismissed
    const { result } = renderHook(() => useToast());
    const currentToast = result.current.toasts.find((t) => t.id === toastResult.id);
    expect(currentToast?.open).toBe(false);
  });
});

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveNow: () => Promise<void>;
}

/**
 * Hook for automatic saving of form data with debouncing
 *
 * @example
 * ```tsx
 * const { isSaving, lastSaved, hasUnsavedChanges } = useAutoSave({
 *   data: formData,
 *   onSave: async (data) => {
 *     await fetch('/api/settings', {
 *       method: 'PUT',
 *       body: JSON.stringify(data)
 *     });
 *   },
 *   delay: 2000,
 *   enabled: true
 * });
 * ```
 */
export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const performSave = async (dataToSave: T) => {
    if (!isMountedRef.current) return;

    setIsSaving(true);
    setHasUnsavedChanges(false);

    try {
      await onSave(dataToSave);

      if (!isMountedRef.current) return;

      setLastSaved(new Date());
      previousDataRef.current = dataToSave;

      onSuccess?.();
    } catch (error) {
      if (!isMountedRef.current) return;

      const err = error instanceof Error ? error : new Error('Erro ao salvar');

      console.error('Auto-save error:', err);

      onError?.(err);

      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as alterações automaticamente.',
        variant: 'destructive',
      });

      setHasUnsavedChanges(true);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const saveNow = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSave(data);
  };

  useEffect(() => {
    if (!enabled) return;

    // Check if data has actually changed
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);

    if (!hasChanged) return;

    setHasUnsavedChanges(true);

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      performSave(data);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, delay, enabled]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow,
  };
}

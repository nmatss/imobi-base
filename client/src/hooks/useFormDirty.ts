import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

/**
 * Hook para detectar alterações em formulários (dirty state)
 * Compatível com react-hook-form e formulários controlados
 *
 * @example
 * // Com react-hook-form
 * ```tsx
 * const { formState: { isDirty } } = useForm();
 * const { dirtyBadge, confirmDialog } = useFormDirty(isDirty);
 *
 * return (
 *   <div>
 *     <h1>Configurações {dirtyBadge}</h1>
 *     {confirmDialog}
 *   </div>
 * );
 * ```
 *
 * @example
 * // Com estado manual
 * ```tsx
 * const [formData, setFormData] = useState(initialData);
 * const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
 * const { dirtyBadge, confirmDialog } = useFormDirty(isDirty);
 * ```
 */
export function useFormDirty(isDirty: boolean, options?: {
  /** Mensagem customizada para o dialog de confirmação */
  message?: string;
  /** Título do dialog de confirmação */
  title?: string;
  /** Habilitar/desabilitar a proteção */
  enabled?: boolean;
}) {
  const {
    message = "Você tem alterações não salvas. Deseja realmente sair sem salvar?",
    title = "Alterações não salvas",
    enabled = true,
  } = options || {};

  const [location, setLocation] = useLocation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const currentLocationRef = useRef(location);

  // Atualizar ref da localização atual
  useEffect(() => {
    currentLocationRef.current = location;
  }, [location]);

  // Proteção contra fechamento/recarregamento do navegador
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requer returnValue vazio
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, isDirty]);

  // Interceptar navegação programática
  const navigate = useCallback((to: string) => {
    if (!enabled || !isDirty) {
      setLocation(to);
      return;
    }

    // Se já estamos na mesma página, não fazer nada
    if (to === currentLocationRef.current) {
      return;
    }

    // Mostrar dialog de confirmação
    setPendingLocation(to);
    setShowConfirmDialog(true);
  }, [enabled, isDirty, setLocation]);

  // Confirmar navegação
  const handleConfirm = useCallback(() => {
    if (pendingLocation) {
      setShowConfirmDialog(false);
      setLocation(pendingLocation);
      setPendingLocation(null);
    }
  }, [pendingLocation, setLocation]);

  // Cancelar navegação
  const handleCancel = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingLocation(null);
  }, []);

  // Badge visual de estado "dirty"
  const dirtyBadge = isDirty ? (
    <span
      className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full ml-2 animate-pulse"
      title="Há alterações não salvas"
      aria-label="Há alterações não salvas"
    />
  ) : null;

  return {
    isDirty,
    dirtyBadge,
    navigate,
    showConfirmDialog,
    handleConfirm,
    handleCancel,
    confirmDialogProps: {
      open: showConfirmDialog,
      onOpenChange: setShowConfirmDialog,
      title,
      description: message,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}

/**
 * Hook simplificado para rastrear mudanças em formulários controlados
 * Compara automaticamente estado atual vs inicial
 *
 * @example
 * ```tsx
 * const [formData, setFormData] = useState(initialData);
 * const { isDirty, resetDirty } = useFormDirtyState(formData, initialData);
 *
 * const handleSave = async () => {
 *   await saveData(formData);
 *   resetDirty(); // Reseta o estado dirty após salvar
 * };
 * ```
 */
export function useFormDirtyState<T extends Record<string, any>>(
  currentData: T,
  initialData: T
) {
  const initialDataRef = useRef(initialData);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(initialDataRef.current);
    setIsDirty(hasChanges);
  }, [currentData]);

  const resetDirty = useCallback(() => {
    initialDataRef.current = currentData;
    setIsDirty(false);
  }, [currentData]);

  const setInitialData = useCallback((newInitialData: T) => {
    initialDataRef.current = newInitialData;
    setIsDirty(false);
  }, []);

  return {
    isDirty,
    resetDirty,
    setInitialData,
    initialData: initialDataRef.current,
  };
}

/**
 * Componente wrapper para proteção de navegação em formulários
 * Usa Wouter para interceptar mudanças de rota
 *
 * @example
 * ```tsx
 * <FormNavigationGuard isDirty={isDirty}>
 *   <YourFormComponent />
 * </FormNavigationGuard>
 * ```
 */
export function useNavigationGuard(isDirty: boolean, message?: string) {
  const [location] = useLocation();
  const previousLocationRef = useRef(location);
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    // Se a localização mudou e temos alterações não salvas
    if (location !== previousLocationRef.current && isDirty) {
      setIsBlocking(true);
    }
    previousLocationRef.current = location;
  }, [location, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      setIsBlocking(false);
    }
  }, [isDirty]);

  return {
    isBlocking,
    message: message || "Você tem alterações não salvas. Deseja realmente sair?",
  };
}

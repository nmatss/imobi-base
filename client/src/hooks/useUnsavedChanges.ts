import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

/**
 * Hook para detectar e gerenciar mudanças não salvas em formulários
 * ATUALIZADO para funcionar com Wouter em vez de React Router
 *
 * @example
 * ```tsx
 * const { hasUnsavedChanges, setHasUnsavedChanges, ConfirmDialog } = useUnsavedChanges();
 *
 * // No onChange do formulário
 * const handleChange = () => {
 *   setHasUnsavedChanges(true);
 * };
 *
 * // Após salvar
 * const handleSave = async () => {
 *   await saveData();
 *   setHasUnsavedChanges(false);
 * };
 *
 * return (
 *   <div>
 *     <YourForm />
 *     {ConfirmDialog}
 *   </div>
 * );
 * ```
 */
export function useUnsavedChanges(enabled = true) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [nextLocation, setNextLocation] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const locationRef = useRef(location);

  // Atualizar ref da localização
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Prompt de confirmação ao tentar sair da página (navegador)
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Chrome requer returnValue vazio
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, hasUnsavedChanges]);

  // Navegação customizada que verifica mudanças não salvas
  const navigate = useCallback((to: string) => {
    if (!enabled || !hasUnsavedChanges) {
      setLocation(to);
      return;
    }

    // Se tentando navegar para a mesma página, ignorar
    if (to === locationRef.current) {
      return;
    }

    // Mostrar prompt e armazenar destino
    setNextLocation(to);
    setShowPrompt(true);
  }, [enabled, hasUnsavedChanges, setLocation]);

  // Confirmar navegação (após usuário confirmar no dialog)
  const confirmNavigation = useCallback(() => {
    if (nextLocation) {
      setHasUnsavedChanges(false);
      setShowPrompt(false);
      setLocation(nextLocation);
      setNextLocation(null);
    }
  }, [nextLocation, setLocation]);

  // Cancelar navegação
  const cancelNavigation = useCallback(() => {
    setShowPrompt(false);
    setNextLocation(null);
  }, []);

  // Descartar alterações
  const discardChanges = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowPrompt(false);
    setNextLocation(null);
  }, []);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    confirmNavigation,
    cancelNavigation,
    discardChanges,
    navigate,
    showPrompt,
  };
}

/**
 * Hook para rastrear mudanças em um formulário automaticamente
 *
 * @example
 * ```tsx
 * const { isDirty, resetForm } = useFormDirtyState(formData, initialData);
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

  const resetForm = useCallback(() => {
    initialDataRef.current = currentData;
    setIsDirty(false);
  }, [currentData]);

  return {
    isDirty,
    resetForm,
    initialData: initialDataRef.current,
  };
}

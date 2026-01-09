import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AccessibilitySettings {
  /** High contrast mode */
  highContrast: boolean;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Font size multiplier (1.0 = normal, 1.5 = 150%, etc.) */
  fontSize: number;
  /** Keyboard shortcuts enabled */
  keyboardShortcuts: boolean;
  /** Screen reader optimizations */
  screenReaderMode: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 1.0,
  keyboardShortcuts: true,
  screenReaderMode: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(
  undefined
);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load from localStorage
    const stored = localStorage.getItem('accessibility-settings');
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }

    // Check system preferences
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const prefersHighContrast = window.matchMedia(
      '(prefers-contrast: high)'
    ).matches;

    return {
      ...defaultSettings,
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast,
    };
  });

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('accessibility-settings', JSON.stringify(updated));
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility-settings');
  };

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Font size
    root.style.fontSize = `${settings.fontSize * 100}%`;

    // Screen reader mode
    if (settings.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
  }, [settings]);

  return (
    <AccessibilityContext.Provider
      value={{ settings, updateSettings, resetSettings }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      'useAccessibility must be used within AccessibilityProvider'
    );
  }
  return context;
}

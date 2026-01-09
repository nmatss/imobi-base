import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Home,
  Building2,
  Users,
  Calendar,
  FileText,
  Settings,
  Command,
} from 'lucide-react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  icon?: React.ReactNode;
  category: 'navigation' | 'actions' | 'search' | 'help';
}

export interface KeyboardShortcutsProps {
  /** Custom shortcuts to add */
  customShortcuts?: KeyboardShortcut[];
  /** Disable default shortcuts */
  disableDefaults?: boolean;
}

/**
 * KeyboardShortcuts Component
 * Global keyboard shortcut system with help dialog
 * Implements WCAG 2.1 Keyboard (2.1.1) and helps with efficient navigation
 */
export function KeyboardShortcuts({
  customShortcuts = [],
  disableDefaults = false,
}: KeyboardShortcutsProps) {
  const [, setLocation] = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  const defaultShortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      metaKey: true,
      description: 'Busca global',
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>(
          '[data-testid="input-global-search"]'
        );
        searchInput?.focus();
      },
      icon: <Search className="w-4 h-4" />,
      category: 'search',
    },
    {
      key: 'h',
      metaKey: true,
      description: 'Ir para Dashboard',
      action: () => setLocation('/dashboard'),
      icon: <Home className="w-4 h-4" />,
      category: 'navigation',
    },
    {
      key: 'p',
      metaKey: true,
      description: 'Ir para Imóveis',
      action: () => setLocation('/properties'),
      icon: <Building2 className="w-4 h-4" />,
      category: 'navigation',
    },
    {
      key: 'l',
      metaKey: true,
      description: 'Ir para Leads',
      action: () => setLocation('/leads'),
      icon: <Users className="w-4 h-4" />,
      category: 'navigation',
    },
    {
      key: 'c',
      metaKey: true,
      description: 'Ir para Agenda',
      action: () => setLocation('/calendar'),
      icon: <Calendar className="w-4 h-4" />,
      category: 'navigation',
    },
    {
      key: 't',
      metaKey: true,
      description: 'Ir para Propostas',
      action: () => setLocation('/contracts'),
      icon: <FileText className="w-4 h-4" />,
      category: 'navigation',
    },
    {
      key: ',',
      metaKey: true,
      description: 'Abrir Configurações',
      action: () => setLocation('/settings'),
      icon: <Settings className="w-4 h-4" />,
      category: 'navigation',
    },
    {
      key: '/',
      metaKey: true,
      description: 'Mostrar atalhos do teclado',
      action: () => setShowHelp(true),
      icon: <Command className="w-4 h-4" />,
      category: 'help',
    },
    {
      key: 'n',
      metaKey: true,
      shiftKey: true,
      description: 'Novo imóvel',
      action: () => {
        // Trigger new property action
        const newButton = document.querySelector<HTMLButtonElement>(
          '[data-action="new-property"]'
        );
        newButton?.click();
      },
      icon: <Plus className="w-4 h-4" />,
      category: 'actions',
    },
  ];

  const shortcuts = disableDefaults
    ? customShortcuts
    : [...defaultShortcuts, ...customShortcuts];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: allow search shortcut
        if (!(event.metaKey || event.ctrlKey) || event.key !== 'k') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = !shortcut.ctrlKey || event.ctrlKey;
        const matchesShift = !shortcut.shiftKey || event.shiftKey;
        const matchesAlt = !shortcut.altKey || event.altKey;
        const matchesMeta = !shortcut.metaKey || event.metaKey || event.ctrlKey;

        if (
          matchesKey &&
          matchesCtrl &&
          matchesShift &&
          matchesAlt &&
          matchesMeta
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys: string[] = [];

    if (shortcut.metaKey) {
      keys.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    }
    if (shortcut.ctrlKey) {
      keys.push('Ctrl');
    }
    if (shortcut.altKey) {
      keys.push('Alt');
    }
    if (shortcut.shiftKey) {
      keys.push('⇧');
    }
    keys.push(shortcut.key.toUpperCase());

    return keys;
  };

  const categorizedShortcuts = {
    navigation: shortcuts.filter((s) => s.category === 'navigation'),
    actions: shortcuts.filter((s) => s.category === 'actions'),
    search: shortcuts.filter((s) => s.category === 'search'),
    help: shortcuts.filter((s) => s.category === 'help'),
  };

  return (
    <>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atalhos do Teclado</DialogTitle>
            <DialogDescription>
              Use estes atalhos para navegar mais rapidamente pelo sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {categorizedShortcuts.search.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Busca
                </h3>
                <div className="space-y-2">
                  {categorizedShortcuts.search.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        {shortcut.icon}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <div className="flex gap-1">
                        {formatShortcut(shortcut).map((key, i) => (
                          <Badge key={i} variant="outline" className="font-mono">
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {categorizedShortcuts.navigation.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Navegação
                </h3>
                <div className="space-y-2">
                  {categorizedShortcuts.navigation.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        {shortcut.icon}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <div className="flex gap-1">
                        {formatShortcut(shortcut).map((key, i) => (
                          <Badge key={i} variant="outline" className="font-mono">
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {categorizedShortcuts.actions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Ações
                </h3>
                <div className="space-y-2">
                  {categorizedShortcuts.actions.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        {shortcut.icon}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <div className="flex gap-1">
                        {formatShortcut(shortcut).map((key, i) => (
                          <Badge key={i} variant="outline" className="font-mono">
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {categorizedShortcuts.help.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Ajuda
                </h3>
                <div className="space-y-2">
                  {categorizedShortcuts.help.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        {shortcut.icon}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <div className="flex gap-1">
                        {formatShortcut(shortcut).map((key, i) => (
                          <Badge key={i} variant="outline" className="font-mono">
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Pressione <Badge variant="outline" className="mx-1 font-mono">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
              </Badge> + <Badge variant="outline" className="mx-1 font-mono">/</Badge> a qualquer momento para ver esta lista.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

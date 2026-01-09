import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Upload,
  Home,
  Users,
  Calendar,
  UserPlus,
  Bell,
  Plug,
  X,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChecklistItem {
  id: string;
  completed: boolean;
  skipped?: boolean;
}

interface SetupChecklistProps {
  onDismiss?: () => void;
}

const CHECKLIST_ITEMS = [
  {
    id: 'branding',
    icon: Upload,
    translationKey: 'checklist_branding',
    link: '/settings',
  },
  {
    id: 'property',
    icon: Home,
    translationKey: 'checklist_property',
    link: '/properties',
  },
  {
    id: 'lead',
    icon: Users,
    translationKey: 'checklist_lead',
    link: '/leads',
  },
  {
    id: 'visit',
    icon: Calendar,
    translationKey: 'checklist_visit',
    link: '/calendar',
  },
  {
    id: 'team',
    icon: UserPlus,
    translationKey: 'checklist_team',
    link: '/settings',
  },
  {
    id: 'notifications',
    icon: Bell,
    translationKey: 'checklist_notifications',
    link: '/settings',
  },
  {
    id: 'integrations',
    icon: Plug,
    translationKey: 'checklist_integrations',
    link: '/settings',
  },
];

export function SetupChecklist({ onDismiss }: SetupChecklistProps) {
  const { t } = useTranslation('onboarding');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Load checklist from localStorage
    const stored = localStorage.getItem('setup_checklist');
    if (stored) {
      setChecklist(JSON.parse(stored));
    } else {
      // Initialize checklist
      const initial = CHECKLIST_ITEMS.map((item) => ({
        id: item.id,
        completed: false,
        skipped: false,
      }));
      setChecklist(initial);
      localStorage.setItem('setup_checklist', JSON.stringify(initial));
    }

    // Check if dismissed
    const isDismissed = localStorage.getItem('setup_checklist_dismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  const updateChecklistItem = (id: string, updates: Partial<ChecklistItem>) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    setChecklist(updated);
    localStorage.setItem('setup_checklist', JSON.stringify(updated));
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('setup_checklist_dismissed', 'true');
    onDismiss?.();
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progress = (completedCount / totalCount) * 100;
  const isComplete = completedCount === totalCount;

  if (dismissed || isComplete) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent rounded-full -ml-12 -mb-12" />

          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>{t('checklist_title')}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{t('checklist_subtitle')}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('progress')}: {completedCount}/{totalCount}
                </span>
                <Badge variant="secondary">{Math.round(progress)}%</Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="relative space-y-2">
            {CHECKLIST_ITEMS.map((item) => {
              const checklistItem = checklist.find((c) => c.id === item.id);
              const isCompleted = checklistItem?.completed || false;
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <a
                    href={item.link}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isCompleted
                        ? 'bg-primary/5 border-primary/20'
                        : 'hover:bg-muted/50 border-transparent'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 ${
                        isCompleted ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </div>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        isCompleted
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`flex-1 text-sm font-medium ${
                        isCompleted ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {t(item.translationKey)}
                    </span>
                    {isCompleted && (
                      <Badge variant="secondary" className="text-xs">
                        {t('completed', { ns: 'common' })}
                      </Badge>
                    )}
                  </a>
                </motion.div>
              );
            })}

            {progress === 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg text-center"
              >
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-primary">Parabéns! 🎉</p>
                <p className="text-sm text-muted-foreground">
                  Você completou todas as tarefas iniciais
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to update checklist items
export function useChecklist() {
  const markAsCompleted = (itemId: string) => {
    const stored = localStorage.getItem('setup_checklist');
    if (stored) {
      const checklist: ChecklistItem[] = JSON.parse(stored);
      const updated = checklist.map((item) =>
        item.id === itemId ? { ...item, completed: true } : item
      );
      localStorage.setItem('setup_checklist', JSON.stringify(updated));

      // Trigger storage event to update component
      window.dispatchEvent(new Event('storage'));
    }
  };

  const resetChecklist = () => {
    const initial = CHECKLIST_ITEMS.map((item) => ({
      id: item.id,
      completed: false,
      skipped: false,
    }));
    localStorage.setItem('setup_checklist', JSON.stringify(initial));
    localStorage.removeItem('setup_checklist_dismissed');
    window.dispatchEvent(new Event('storage'));
  };

  return { markAsCompleted, resetChecklist };
}

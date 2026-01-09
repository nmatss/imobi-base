import React, { useState, useEffect, useCallback } from 'react';
import { useAnnouncer } from '@/hooks/useAnnouncer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface TimeoutWarningProps {
  /** Total session timeout in milliseconds (default: 30 minutes) */
  sessionTimeout?: number;
  /** Warning time before timeout in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Callback when session expires */
  onSessionExpired?: () => void;
  /** Callback when user continues session */
  onContinueSession?: () => void;
}

/**
 * TimeoutWarning Component
 * Shows a warning modal before session timeout
 * Implements WCAG 2.1 Timing Adjustable (2.2.1) and provides screen reader announcements
 */
export function TimeoutWarning({
  sessionTimeout = 30 * 60 * 1000, // 30 minutes
  warningTime = 5 * 60 * 1000, // 5 minutes
  onSessionExpired,
  onContinueSession,
}: TimeoutWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(warningTime);
  const { announce } = useAnnouncer();

  const resetTimer = useCallback(() => {
    setShowWarning(false);
    setTimeRemaining(warningTime);

    // Reset the session timeout
    if (onContinueSession) {
      onContinueSession();
    }
  }, [warningTime, onContinueSession]);

  const handleContinue = () => {
    announce('Sessão estendida com sucesso', 'polite');
    resetTimer();
  };

  // Monitor user activity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let warningTimeoutId: NodeJS.Timeout;

    const resetTimers = () => {
      clearTimeout(timeoutId);
      clearTimeout(warningTimeoutId);

      // Set warning timeout
      warningTimeoutId = setTimeout(() => {
        setShowWarning(true);
        announce(
          'Sua sessão vai expirar em 5 minutos. Clique em continuar conectado para estender.',
          'assertive'
        );
      }, sessionTimeout - warningTime);

      // Set session timeout
      timeoutId = setTimeout(() => {
        announce('Sua sessão expirou por inatividade', 'assertive');
        if (onSessionExpired) {
          onSessionExpired();
        }
      }, sessionTimeout);
    };

    // Activity events to monitor
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Reset timers on activity
    events.forEach((event) => {
      window.addEventListener(event, resetTimers);
    });

    // Initial timer setup
    resetTimers();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningTimeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [sessionTimeout, warningTime, onSessionExpired, announce]);

  // Countdown timer when warning is shown
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          clearInterval(interval);
          if (onSessionExpired) {
            onSessionExpired();
          }
          return 0;
        }

        // Announce every minute
        if (newTime % 60000 === 0) {
          const minutes = Math.floor(newTime / 60000);
          announce(
            `${minutes} minuto${minutes !== 1 ? 's' : ''} restante${
              minutes !== 1 ? 's' : ''
            } antes da sessão expirar`,
            'polite'
          );
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, onSessionExpired, announce]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeRemaining / warningTime) * 100;

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-left">Sua sessão vai expirar</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-4">
            Por motivos de segurança, sua sessão será encerrada por inatividade.
            Clique em "Continuar conectado" para manter sua sessão ativa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center gap-3 rounded-lg bg-muted p-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Tempo restante
              </p>
              <p
                className="text-2xl font-bold tabular-nums"
                role="timer"
                aria-live="polite"
                aria-atomic="true"
              >
                {formatTime(timeRemaining)}
              </p>
            </div>
          </div>

          <Progress
            value={progressValue}
            className="h-2"
            aria-label={`Tempo restante: ${formatTime(timeRemaining)}`}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              if (onSessionExpired) {
                onSessionExpired();
              }
            }}
            className="w-full sm:w-auto"
          >
            Sair agora
          </Button>
          <Button
            onClick={handleContinue}
            className="w-full sm:w-auto"
            autoFocus
          >
            Continuar conectado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

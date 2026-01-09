/**
 * Painel de debug de erros
 * Apenas disponível em desenvolvimento
 * Mostra histórico de erros e permite análise
 */

import * as React from "react";
import {
  Bug,
  Download,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  errorLogger,
  ErrorLogEntry,
  ErrorType,
} from "@/lib/error-handling";

interface ErrorDebugPanelProps {
  /** Posição inicial do painel */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

/**
 * Painel flutuante de debug de erros
 * Aparece apenas em desenvolvimento
 */
export function ErrorDebugPanel({ position = "bottom-right" }: ErrorDebugPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [logs, setLogs] = React.useState<ErrorLogEntry[]>([]);

  // Atualiza logs a cada segundo
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLogs(errorLogger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Não renderiza em produção
  if (!import.meta.env.DEV) {
    return null;
  }

  const handleExportLogs = () => {
    const logsJson = errorLogger.exportLogs();
    const blob = new Blob([logsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    errorLogger.clearLogs();
    setLogs([]);
  };

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  const errorCounts = React.useMemo(() => {
    return logs.reduce((acc, log) => {
      const type = log.errorDetails.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);
  }, [logs]);

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${positionClasses[position]} z-50 p-3 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:bg-destructive/90 transition-all`}
          title="Abrir painel de erros"
        >
          <Bug className="w-5 h-5" />
          {logs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive-foreground text-destructive text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {logs.length > 9 ? "9+" : logs.length}
            </span>
          )}
        </button>
      )}

      {/* Painel */}
      {isOpen && (
        <Card
          className={`fixed ${positionClasses[position]} z-50 shadow-xl border-2 transition-all ${
            isExpanded ? "w-[600px] h-[600px]" : "w-96 h-auto max-h-[400px]"
          }`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-destructive" />
                <CardTitle className="text-lg">Error Debug Panel</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Minimizar" : "Expandir"}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {logs.length === 0
                ? "Nenhum erro registrado"
                : `${logs.length} erro(s) registrado(s)`}
            </CardDescription>

            {/* Estatísticas */}
            {logs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(errorCounts).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Ações */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportLogs}
                disabled={logs.length === 0}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>

            <Separator />

            {/* Lista de erros */}
            <ScrollArea className={isExpanded ? "h-[450px]" : "h-[200px]"}>
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum erro registrado ainda</p>
                  <p className="text-xs mt-1">Erros aparecerão aqui quando ocorrerem</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {logs.map((log, index) => (
                    <ErrorLogCard
                      key={index}
                      log={log}
                      index={index}
                      isExpanded={isExpanded}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ==================== SUB-COMPONENTES ====================

interface ErrorLogCardProps {
  log: ErrorLogEntry;
  index: number;
  isExpanded: boolean;
}

function ErrorLogCard({ log, index, isExpanded }: ErrorLogCardProps) {
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const { errorDetails, context } = log;

  const typeColors: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    [ErrorType.VALIDATION]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    [ErrorType.AUTHENTICATION]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    [ErrorType.AUTHORIZATION]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    [ErrorType.NOT_FOUND]: "bg-amber-700 text-white dark:bg-amber-900 dark:text-amber-200", // WCAG AA: 4.6:1
    [ErrorType.SERVER]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    [ErrorType.UNKNOWN]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
          <Badge
            className={`text-xs ${typeColors[errorDetails.type]}`}
            variant="secondary"
          >
            {errorDetails.type}
          </Badge>
          {errorDetails.statusCode && (
            <Badge variant="outline" className="text-xs">
              {errorDetails.statusCode}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsDetailOpen(!isDetailOpen)}
          className="h-6 w-6 p-0"
        >
          {isDetailOpen ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>
      </div>

      <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">
        {errorDetails.userMessage}
      </p>

      <p className="text-xs text-muted-foreground">
        {new Date(errorDetails.timestamp).toLocaleTimeString()}
      </p>

      {isDetailOpen && (
        <div className="mt-3 space-y-2 text-xs">
          <Separator />

          {/* Mensagem técnica */}
          <div>
            <p className="font-semibold mb-1">Mensagem técnica:</p>
            <pre className="bg-muted p-2 rounded overflow-auto text-xs">
              {errorDetails.message}
            </pre>
          </div>

          {/* Contexto */}
          {Object.keys(context).length > 0 && (
            <div>
              <p className="font-semibold mb-1">Contexto:</p>
              <pre className="bg-muted p-2 rounded overflow-auto text-xs">
                {JSON.stringify(context, null, 2)}
              </pre>
            </div>
          )}

          {/* Stack trace (se disponível) */}
          {errorDetails.originalError?.stack && isExpanded && (
            <div>
              <p className="font-semibold mb-1">Stack trace:</p>
              <pre className="bg-muted p-2 rounded overflow-auto max-h-32 text-xs">
                {errorDetails.originalError.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== HOOK PARA ATIVAR/DESATIVAR PAINEL ====================

/**
 * Hook para controlar o painel de debug
 */
export function useErrorDebug() {
  const [isEnabled, setIsEnabled] = React.useState(() => {
    if (!import.meta.env.DEV) return false;
    const stored = localStorage.getItem("error-debug-enabled");
    return stored === "true";
  });

  React.useEffect(() => {
    if (import.meta.env.DEV) {
      localStorage.setItem("error-debug-enabled", String(isEnabled));
    }
  }, [isEnabled]);

  const toggle = React.useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  return {
    isEnabled,
    toggle,
    enable: () => setIsEnabled(true),
    disable: () => setIsEnabled(false),
  };
}

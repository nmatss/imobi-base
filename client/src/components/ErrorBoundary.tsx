import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home, Bug } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { categorizeError, errorLogger, ErrorDetails, ErrorType } from "@/lib/error-handling";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Callback quando um erro é capturado */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Nome do componente para logging */
  componentName?: string;
  /** Se deve mostrar o diálogo de feedback do Sentry */
  showDialog?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorDetails: ErrorDetails | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorDetails: categorizeError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log no console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Log no sistema de error handling
    errorLogger.log(error, {
      component: this.props.componentName || 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      url: window.location.href,
    });

    // Capture no Sentry
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        component: this.props.componentName || 'ErrorBoundary',
      },
    });

    // Callback customizado
    this.props.onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
      errorDetails: categorizeError(error),
      eventId,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleReportFeedback = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({
        eventId: this.state.eventId,
        title: "Parece que encontramos um problema",
        subtitle: "Nosso time foi notificado. Se você quiser nos ajudar, conte o que aconteceu.",
        subtitle2: "Suas informações nos ajudam a melhorar o sistema.",
        labelName: "Nome",
        labelEmail: "Email",
        labelComments: "O que aconteceu?",
        labelClose: "Fechar",
        labelSubmit: "Enviar",
        errorGeneric: "Ocorreu um erro ao enviar seu feedback. Por favor, tente novamente.",
        errorFormEntry: "Alguns campos são inválidos. Por favor, corrija os erros e tente novamente.",
        successMessage: "Seu feedback foi enviado. Obrigado!",
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { errorDetails } = this.state;
      const errorType = errorDetails?.type || ErrorType.UNKNOWN;

      // Mensagens customizadas por tipo de erro
      const errorMessages = {
        [ErrorType.NETWORK]: {
          title: "Erro de Conexão",
          description: "Parece que você está sem conexão. Verifique sua internet e tente novamente.",
        },
        [ErrorType.AUTHENTICATION]: {
          title: "Sessão Expirada",
          description: "Sua sessão expirou. Por favor, recarregue a página e faça login novamente.",
        },
        [ErrorType.AUTHORIZATION]: {
          title: "Sem Permissão",
          description: "Você não tem permissão para acessar esta área.",
        },
        [ErrorType.NOT_FOUND]: {
          title: "Não Encontrado",
          description: "O recurso que você está tentando acessar não foi encontrado.",
        },
        [ErrorType.SERVER]: {
          title: "Erro no Servidor",
          description: "Ocorreu um erro no servidor. Por favor, tente novamente em alguns instantes.",
        },
        [ErrorType.VALIDATION]: {
          title: "Dados Inválidos",
          description: "Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.",
        },
        [ErrorType.UNKNOWN]: {
          title: "Ops! Algo deu errado",
          description: "Ocorreu um erro inesperado. Tente recarregar a página ou voltar para a página inicial.",
        },
      };

      const message = errorMessages[errorType] || errorMessages[ErrorType.UNKNOWN];

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">{message.title}</CardTitle>
              <CardDescription>{message.description}</CardDescription>
              {errorDetails?.statusCode && (
                <p className="text-xs text-muted-foreground mt-2">
                  Código do erro: {errorDetails.statusCode}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                    <Bug className="w-4 h-4" />
                    <span>Informações de Debug</span>
                  </div>
                  <p className="font-mono text-xs text-destructive">
                    {this.state.error.toString()}
                  </p>
                  {errorDetails && (
                    <div className="text-xs space-y-1">
                      <p>
                        <span className="font-semibold">Tipo:</span> {errorDetails.type}
                      </p>
                      <p>
                        <span className="font-semibold">Timestamp:</span>{" "}
                        {errorDetails.timestamp.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold">
                        Component Stack
                      </summary>
                      <pre className="text-xs overflow-auto max-h-60 text-muted-foreground mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={this.handleReset} variant="outline" className="gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Tentar Novamente
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Recarregar Página
                </Button>
                <Button onClick={this.handleGoHome} className="gap-2">
                  <Home className="w-4 h-4" />
                  Ir para Início
                </Button>
              </div>

              {this.props.showDialog && this.state.eventId && (
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    Este erro foi reportado automaticamente. Você pode nos ajudar a resolver mais rápido.
                  </p>
                  <Button onClick={this.handleReportFeedback} variant="ghost" size="sm" className="gap-2">
                    <Bug className="w-4 h-4" />
                    Relatar o que aconteceu
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

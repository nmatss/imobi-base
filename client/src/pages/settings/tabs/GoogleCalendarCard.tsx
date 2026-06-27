import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, CheckCircle2, Loader2, Link2Off } from "lucide-react";
import { toast } from "sonner";

interface CalendarStatus {
  connected: boolean;
  googleEmail: string | null;
  syncEnabled: boolean;
  lastError: string | null;
}

const STATUS_MESSAGES: Record<string, { type: "success" | "error"; text: string }> = {
  connected: { type: "success", text: "Google Agenda conectado com sucesso!" },
  error: { type: "error", text: "Não foi possível conectar ao Google Agenda." },
  invalid_state: { type: "error", text: "Sessão de conexão expirada. Tente novamente." },
  not_configured: { type: "error", text: "Integração Google ainda não configurada no servidor." },
  callback_failed: { type: "error", text: "Falha ao concluir a conexão com o Google." },
  missing_code: { type: "error", text: "Conexão cancelada." },
};

/**
 * Card de conexão do Google Agenda por corretor. O fluxo é OAuth por redirect
 * (botão → /api/integrations/google-calendar/connect), diferente das demais
 * integrações baseadas em formulário.
 */
export function GoogleCalendarCard() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/integrations/google-calendar/status", {
        credentials: "include",
      });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Mensagem do retorno do OAuth (?calendar=...).
    const params = new URLSearchParams(window.location.search);
    const code = params.get("calendar");
    if (code && STATUS_MESSAGES[code]) {
      const msg = STATUS_MESSAGES[code];
      if (msg.type === "success") toast.success(msg.text);
      else toast.error(msg.text);
      // Limpa o query param da URL.
      params.delete("calendar");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  const handleConnect = () => {
    window.location.href = "/api/integrations/google-calendar/connect";
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/integrations/google-calendar/disconnect");
      if (!res.ok) throw new Error();
      toast.success("Google Agenda desconectado.");
      await fetchStatus();
    } catch {
      toast.error("Erro ao desconectar.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSync = async () => {
    if (!status) return;
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/integrations/google-calendar/sync-toggle", {
        enabled: !status.syncEnabled,
      });
      if (!res.ok) throw new Error();
      await fetchStatus();
    } catch {
      toast.error("Erro ao atualizar sincronização.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-primary shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg mb-1 flex items-center gap-2">
              Google Agenda + Meet
              {status?.connected && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Conecte sua conta Google para que suas visitas apareçam no seu Google Agenda,
              com link do Meet automático nas visitas virtuais.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : status?.connected ? (
          <>
            {status.googleEmail && (
              <p className="text-sm text-muted-foreground">
                Conta conectada: <span className="font-medium text-foreground">{status.googleEmail}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleToggleSync} disabled={busy}>
                {status.syncEnabled ? "Pausar sincronização" : "Retomar sincronização"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={busy}>
                <Link2Off className="w-4 h-4 mr-1" /> Desconectar
              </Button>
            </div>
            {!status.syncEnabled && (
              <p className="text-xs text-amber-600">Sincronização pausada — novas visitas não vão para o Google.</p>
            )}
            {status.lastError && (
              <p className="text-xs text-destructive">Último erro: {status.lastError}</p>
            )}
          </>
        ) : (
          <Button onClick={handleConnect} disabled={busy} isLoading={busy}>
            <Calendar className="w-4 h-4 mr-2" /> Conectar Google Agenda
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

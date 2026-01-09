import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2, FileText, Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function PrivacySettings() {
  const [consents, setConsents] = useState<any[]>([]);
  const [exportStatus, setExportStatus] = useState<any>(null);
  const [deletionStatus, setDeletionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConsents();
    loadExportStatus();
    loadDeletionStatus();
  }, []);

  const loadConsents = async () => {
    try {
      const res = await fetch("/api/compliance/consents");
      if (res.ok) {
        const data = await res.json();
        setConsents(data);
      }
    } catch (error) {
      console.error("Failed to load consents:", error);
    }
  };

  const loadExportStatus = async () => {
    try {
      const res = await fetch("/api/compliance/export-data/status/latest");
      if (res.ok) {
        const data = await res.json();
        setExportStatus(data);
      }
    } catch (error) {
      // No export request yet
    }
  };

  const loadDeletionStatus = async () => {
    try {
      const res = await fetch("/api/compliance/deletion-status");
      if (res.ok) {
        const data = await res.json();
        setDeletionStatus(data);
      }
    } catch (error) {
      // No deletion request yet
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/export-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "json", includeRelated: true }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Exportação Solicitada",
          description: "Você receberá um e-mail quando a exportação estiver pronta.",
        });
        setExportStatus(data);
      } else {
        throw new Error("Falha ao solicitar exportação");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível solicitar a exportação de dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(
      "ATENÇÃO: Esta ação é irreversível. Seus dados serão anonimizados e você não poderá mais acessar sua conta. Tem certeza que deseja continuar?"
    )) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/compliance/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "User requested account deletion",
          deletionType: "anonymize",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Exclusão Solicitada",
          description: "Verifique seu e-mail para confirmar a exclusão da conta.",
        });
        setDeletionStatus(data);
      } else {
        throw new Error("Falha ao solicitar exclusão");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível solicitar a exclusão da conta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConsent = async (consentType: string) => {
    try {
      const res = await fetch(`/api/compliance/consents/${consentType}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Consentimento Retirado",
          description: `Seu consentimento para ${consentType} foi retirado com sucesso.`,
        });
        loadConsents();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível retirar o consentimento.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configurações de Privacidade</h1>
        <p className="text-gray-600">
          Gerencie seus dados pessoais e exercite seus direitos conforme a LGPD
        </p>
      </div>

      <div className="space-y-6">
        {/* Rights Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <CardTitle>Seus Direitos sob a LGPD</CardTitle>
            </div>
            <CardDescription>
              A Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) garante os seguintes direitos:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                <span><strong>Acesso:</strong> Confirmar e acessar seus dados pessoais</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                <span><strong>Correção:</strong> Corrigir dados incompletos ou inexatos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                <span><strong>Portabilidade:</strong> Exportar seus dados em formato estruturado</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                <span><strong>Eliminação:</strong> Solicitar a exclusão dos seus dados</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                <span><strong>Revogação:</strong> Retirar consentimentos a qualquer momento</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              <CardTitle>Exportar Meus Dados</CardTitle>
            </div>
            <CardDescription>
              Baixe uma cópia de todos os seus dados pessoais armazenados em nosso sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportStatus?.status === "completed" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900">Exportação Concluída</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Sua exportação está pronta para download. O link expira em{" "}
                      {new Date(exportStatus.expiresAt).toLocaleDateString("pt-BR")}.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(exportStatus.fileUrl, "_blank")}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Dados
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {exportStatus?.status === "pending" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Processando Exportação</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Estamos preparando seus dados. Você receberá um e-mail quando estiver pronto.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleExportData}
              disabled={loading || exportStatus?.status === "pending"}
            >
              <Download className="w-4 h-4 mr-2" />
              Solicitar Exportação
            </Button>
          </CardContent>
        </Card>

        {/* Consent Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <CardTitle>Gerenciar Consentimentos</CardTitle>
            </div>
            <CardDescription>
              Visualize e gerencie os consentimentos que você forneceu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {consents.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum consentimento registrado.</p>
            ) : (
              <div className="space-y-3">
                {consents.map((consent) => (
                  <div
                    key={consent.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div>
                      <h4 className="font-medium capitalize">{consent.consentType}</h4>
                      <p className="text-sm text-gray-500">
                        {consent.status === "active" ? "Ativo desde" : "Retirado em"}{" "}
                        {new Date(consent.acceptedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {consent.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdrawConsent(consent.consentType)}
                      >
                        Retirar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Deletion */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Excluir Conta</CardTitle>
            </div>
            <CardDescription>
              Solicite a exclusão permanente da sua conta e anonimização dos seus dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>Atenção:</strong> Esta ação é irreversível. Seus dados serão anonimizados
                  conforme a LGPD. Alguns dados podem ser mantidos por obrigação legal (contratos,
                  dados fiscais) mas serão anonimizados.
                </div>
              </div>
            </div>

            {deletionStatus?.status === "pending" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Aguardando Confirmação</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Verifique seu e-mail para confirmar a exclusão da conta.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={loading || deletionStatus?.status === "pending"}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Solicitar Exclusão de Conta
            </Button>
          </CardContent>
        </Card>

        {/* Contact DPO */}
        <Card>
          <CardHeader>
            <CardTitle>Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Se você tiver dúvidas sobre seus dados pessoais ou quiser exercer algum direito,
              entre em contato com nosso Encarregado de Dados (DPO):
            </p>
            <div className="space-y-2 text-sm">
              <p><strong>E-mail:</strong> dpo@imobibase.com</p>
              <p><strong>Prazo de resposta:</strong> Até 15 dias úteis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

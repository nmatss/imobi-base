import { useParams } from "wouter";
import { SignDocument } from "@/components/contracts/DigitalSignature";
import { usePageTitle } from "@/hooks/use-page-title";

/**
 * Página pública de assinatura por token (B2).
 *
 * Destino dos links `/sign/:token` enviados ao signatário externo (sem conta).
 * Consome o fluxo interno por token (server/routes-features.ts):
 * GET /api/signatures/token/:token e POST /api/signatures/token/:token/sign.
 * Não depende de credencial ClickSign.
 */
export default function SignPage() {
  usePageTitle("Assinar documento");
  const params = useParams<{ token: string }>();

  if (!params.token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Link de assinatura inválido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <SignDocument token={params.token} />
      </div>
    </div>
  );
}

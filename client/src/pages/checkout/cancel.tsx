import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";
import { SeoHead } from "@/components/seo/SeoHead";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <SeoHead
        title="Checkout cancelado | ImobiBase"
        description="Você cancelou o checkout. Nenhuma cobrança foi realizada."
        path="/checkout/cancel"
        noindex
      />
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">
                Checkout cancelado
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Nenhuma cobrança foi realizada. Você pode escolher outro plano
                a qualquer momento.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/pricing" className="flex-1">
              <Button variant="default" className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                Ver planos
              </Button>
            </Link>
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao dashboard
              </Button>
            </Link>
          </div>

          <p className="mt-6 pt-4 border-t text-xs text-muted-foreground text-center">
            Dúvidas? Fale com a gente em{" "}
            <a
              href="mailto:contato@imobibase.com"
              className="text-primary hover:underline"
            >
              contato@imobibase.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

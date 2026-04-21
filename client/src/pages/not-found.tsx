import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import { SeoHead } from "@/components/seo/SeoHead";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <SeoHead
        title="Página não encontrada | ImobiBase"
        description="A página que você procura não existe ou foi movida."
        path="/404"
        noindex
      />
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold">
                Página não encontrada
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                A página que você procura não existe ou foi movida.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/" className="flex-1">
              <Button variant="default" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Ir para o início
              </Button>
            </Link>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

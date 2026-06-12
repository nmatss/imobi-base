import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { SeoHead, breadcrumbSchema } from "@/components/seo/SeoHead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Logo } from "@/components/brand/logo";
import { toast } from "sonner";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Não foi possível enviar sua mensagem.");
      }
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar sua mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SeoHead
        title="Fale Conosco | ImobiBase"
        description="Entre em contato com o time do ImobiBase. Tire dúvidas sobre planos, recursos e migração da sua imobiliária."
        path="/contato"
        structuredData={breadcrumbSchema([
          { name: "Início", path: "/" },
          { name: "Contato", path: "/contato" },
        ])}
      />
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo className="cursor-pointer" wordmarkClassName="text-xl" iconClassName="h-9 w-9" />
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl flex-1">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h1 className="text-4xl font-heading font-bold mb-4">Fale conosco</h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Quer conhecer o ImobiBase, tirar dúvidas sobre planos ou migrar os dados da sua
              imobiliária? Nosso time responde em até 1 dia útil.
            </p>
            <div className="space-y-4">
              <a
                href="mailto:contato@imobibase.com"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                contato@imobibase.com
              </a>
              <a
                href="mailto:suporte@imobibase.com"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                suporte@imobibase.com (clientes)
              </a>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {sent ? (
                <div className="flex flex-col items-center text-center gap-4 py-12">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="text-2xl font-heading font-bold">Mensagem enviada!</h2>
                  <p className="text-muted-foreground">
                    Obrigado pelo contato. Retornaremos no email informado em até 1 dia útil.
                  </p>
                  <Link href="/">
                    <Button variant="outline">Voltar para o início</Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Nome*</Label>
                    <Input
                      id="contact-name"
                      required
                      minLength={2}
                      maxLength={120}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email*</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="voce@suaimobiliaria.com.br"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-company">Imobiliária / Empresa</Label>
                    <Input
                      id="contact-company"
                      maxLength={160}
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      placeholder="Nome da sua imobiliária (opcional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Mensagem*</Label>
                    <Textarea
                      id="contact-message"
                      required
                      minLength={10}
                      maxLength={5000}
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Como podemos ajudar?"
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={sending}>
                    <Send className="w-4 h-4" />
                    {sending ? "Enviando..." : "Enviar mensagem"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

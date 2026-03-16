import { Link } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 font-heading font-bold text-xl cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              ImobiBase
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-heading font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">Ultima atualizacao: 15 de marco de 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Aceitacao dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e utilizar a plataforma ImobiBase ("Plataforma"), voce concorda com estes Termos de Uso.
              Se voce nao concordar com qualquer parte destes termos, nao devera utilizar nossos servicos.
              A utilizacao continuada da Plataforma constitui aceitacao integral destes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Descricao do Servico</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ImobiBase e uma plataforma SaaS (Software as a Service) destinada a gestao imobiliaria,
              oferecendo funcionalidades como: gerenciamento de imoveis, leads, contratos, locacoes,
              vendas, gerador de sites, marketing automatizado, vistorias, analytics e integracao com
              servicos de terceiros. Os recursos disponiveis dependem do plano contratado pelo usuario.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Voce deve fornecer informacoes verdadeiras, completas e atualizadas no momento do cadastro.</li>
              <li>Voce e responsavel por manter a confidencialidade de suas credenciais de acesso (email e senha).</li>
              <li>Cada conta e de uso pessoal e intransferivel, exceto quando permitido pelo plano contratado.</li>
              <li>Voce deve notificar imediatamente o ImobiBase em caso de uso nao autorizado de sua conta.</li>
              <li>O ImobiBase reserva-se o direito de suspender ou encerrar contas que violem estes Termos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Planos e Pagamentos</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Os planos e precos estao disponiveis na pagina de precos da Plataforma e podem ser alterados com aviso previo de 30 dias.</li>
              <li>O pagamento e processado de forma recorrente (mensal ou anual) conforme o plano escolhido.</li>
              <li>Em caso de inadimplencia, o acesso podera ser suspenso apos 7 dias de atraso.</li>
              <li>O cancelamento pode ser solicitado a qualquer momento, sem multa. O acesso permanece ativo ate o final do periodo ja pago.</li>
              <li>Reembolsos sao avaliados caso a caso para periodos nao utilizados de planos anuais.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Uso Aceitavel</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Ao utilizar a Plataforma, voce concorda em nao:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Utilizar o servico para fins ilegais ou nao autorizados.</li>
              <li>Tentar acessar areas restritas do sistema ou contas de outros usuarios.</li>
              <li>Distribuir virus, malware ou qualquer codigo malicioso.</li>
              <li>Realizar engenharia reversa, descompilar ou desmontar qualquer parte da Plataforma.</li>
              <li>Utilizar bots, scrapers ou ferramentas automatizadas para coleta de dados sem autorizacao.</li>
              <li>Publicar conteudo difamatorio, ofensivo, discriminatorio ou que viole direitos de terceiros.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteudo da Plataforma, incluindo mas nao limitado a codigo-fonte, design, logotipos,
              textos e graficos, e propriedade do ImobiBase ou de seus licenciadores e e protegido por leis
              de propriedade intelectual. O usuario mantem a propriedade sobre os dados inseridos na Plataforma.
              Ao utilizar o servico, voce concede ao ImobiBase uma licenca limitada para processar seus dados
              exclusivamente para a prestacao do servico contratado.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Disponibilidade e Suporte</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>O ImobiBase se compromete a manter a disponibilidade do servico em 99% do tempo (SLA).</li>
              <li>Manutencoes programadas serao comunicadas com antecedencia minima de 24 horas.</li>
              <li>O suporte tecnico esta disponivel conforme o plano contratado, via chat e email.</li>
              <li>O ImobiBase nao se responsabiliza por indisponibilidades causadas por fatores externos (provedores de internet, infraestrutura de terceiros, etc.).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Limitacao de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ImobiBase nao se responsabiliza por danos indiretos, incidentais, especiais ou consequentes
              decorrentes do uso ou impossibilidade de uso da Plataforma. A responsabilidade total do ImobiBase
              esta limitada ao valor pago pelo usuario nos ultimos 12 meses de servico. O ImobiBase nao garante
              resultados especificos de vendas, locacoes ou outros negocios imobiliarios realizados atraves da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Rescisao</h2>
            <p className="text-muted-foreground leading-relaxed">
              Qualquer das partes pode rescindir este acordo a qualquer momento. Em caso de violacao destes Termos,
              o ImobiBase podera suspender ou encerrar sua conta imediatamente, sem aviso previo. Apos o encerramento
              da conta, seus dados serao mantidos por 30 dias para eventual recuperacao, e entao permanentemente excluidos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Alteracoes nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ImobiBase reserva-se o direito de modificar estes Termos a qualquer momento. Alteracoes significativas
              serao comunicadas por email ou notificacao na Plataforma com antecedencia minima de 30 dias.
              O uso continuado da Plataforma apos as alteracoes constitui aceitacao dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Legislacao Aplicavel</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos sao regidos pelas leis da Republica Federativa do Brasil. Qualquer disputa sera
              submetida ao foro da comarca da sede do ImobiBase, com exclusao de qualquer outro, por mais
              privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para duvidas sobre estes Termos de Uso, entre em contato conosco pelo email:{" "}
              <a href="mailto:contato@imobibase.com" className="text-primary hover:underline">contato@imobibase.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex gap-4">
          <Link href="/privacidade">
            <Button variant="outline">Politica de Privacidade</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Voltar ao inicio</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

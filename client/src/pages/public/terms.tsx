import { Link } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeoHead, breadcrumbSchema } from "@/components/seo/SeoHead";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Termos de Uso | ImobiBase"
        description="Termos de Uso da plataforma ImobiBase. Regras de utilização, pagamentos, responsabilidades e direitos de uso do serviço SaaS de gestão imobiliária."
        path="/termos"
        structuredData={breadcrumbSchema([
          { name: "Início", path: "/" },
          { name: "Termos de Uso", path: "/termos" },
        ])}
      />
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
        <p className="text-muted-foreground mb-8">Última atualização: 15 de março de 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e utilizar a plataforma ImobiBase ("Plataforma"), você concorda com estes Termos de Uso.
              Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
              A utilização continuada da Plataforma constitui aceitação integral destes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ImobiBase é uma plataforma SaaS (Software as a Service) destinada à gestão imobiliária,
              oferecendo funcionalidades como: gerenciamento de imóveis, leads, contratos, locações,
              vendas, gerador de sites, marketing automatizado, vistorias, analytics e integração com
              serviços de terceiros. Os recursos disponíveis dependem do plano contratado pelo usuário.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Você deve fornecer informações verdadeiras, completas e atualizadas no momento do cadastro.</li>
              <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso (email e senha).</li>
              <li>Cada conta é de uso pessoal e intransferível, exceto quando permitido pelo plano contratado.</li>
              <li>Você deve notificar imediatamente o ImobiBase em caso de uso não autorizado de sua conta.</li>
              <li>O ImobiBase reserva-se o direito de suspender ou encerrar contas que violem estes Termos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Planos e Pagamentos</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Os planos e preços estão disponíveis na página de preços da Plataforma e podem ser alterados com aviso prévio de 30 dias.</li>
              <li>O pagamento é processado de forma recorrente (mensal ou anual) conforme o plano escolhido.</li>
              <li>Em caso de inadimplência, o acesso poderá ser suspenso após 7 dias de atraso.</li>
              <li>O cancelamento pode ser solicitado a qualquer momento, sem multa. O acesso permanece ativo até o final do período já pago.</li>
              <li>Reembolsos são avaliados caso a caso para períodos não utilizados de planos anuais.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Uso Aceitável</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Ao utilizar a Plataforma, você concorda em não:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Utilizar o serviço para fins ilegais ou não autorizados.</li>
              <li>Tentar acessar áreas restritas do sistema ou contas de outros usuários.</li>
              <li>Distribuir vírus, malware ou qualquer código malicioso.</li>
              <li>Realizar engenharia reversa, descompilar ou desmontar qualquer parte da Plataforma.</li>
              <li>Utilizar bots, scrapers ou ferramentas automatizadas para coleta de dados sem autorização.</li>
              <li>Publicar conteúdo difamatório, ofensivo, discriminatório ou que viole direitos de terceiros.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo da Plataforma, incluindo mas não limitado a código-fonte, design, logotipos,
              textos e gráficos, é propriedade do ImobiBase ou de seus licenciadores e é protegido por leis
              de propriedade intelectual. O usuário mantém a propriedade sobre os dados inseridos na Plataforma.
              Ao utilizar o serviço, você concede ao ImobiBase uma licença limitada para processar seus dados
              exclusivamente para a prestação do serviço contratado.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Disponibilidade e Suporte</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>O ImobiBase se compromete a manter a disponibilidade do serviço em 99% do tempo (SLA).</li>
              <li>Manutenções programadas serão comunicadas com antecedência mínima de 24 horas.</li>
              <li>O suporte técnico está disponível conforme o plano contratado, via chat e email.</li>
              <li>O ImobiBase não se responsabiliza por indisponibilidades causadas por fatores externos (provedores de internet, infraestrutura de terceiros, etc.).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ImobiBase não se responsabiliza por danos indiretos, incidentais, especiais ou consequentes
              decorrentes do uso ou impossibilidade de uso da Plataforma. A responsabilidade total do ImobiBase
              está limitada ao valor pago pelo usuário nos últimos 12 meses de serviço. O ImobiBase não garante
              resultados específicos de vendas, locações ou outros negócios imobiliários realizados através da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Rescisão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Qualquer das partes pode rescindir este acordo a qualquer momento. Em caso de violação destes Termos,
              o ImobiBase poderá suspender ou encerrar sua conta imediatamente, sem aviso prévio. Após o encerramento
              da conta, seus dados serão mantidos por 30 dias para eventual recuperação, e então permanentemente excluídos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ImobiBase reserva-se o direito de modificar estes Termos a qualquer momento. Alterações significativas
              serão comunicadas por email ou notificação na Plataforma com antecedência mínima de 30 dias.
              O uso continuado da Plataforma após as alterações constitui aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Legislação Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será
              submetida ao foro da comarca da sede do ImobiBase, com exclusão de qualquer outro, por mais
              privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes Termos de Uso, entre em contato conosco pelo email:{" "}
              <a href="mailto:contato@imobibase.com" className="text-primary hover:underline">contato@imobibase.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex gap-4">
          <Link href="/privacidade">
            <Button variant="outline">Política de Privacidade</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Voltar ao início</Button>
          </Link>
        </div>
      </main>
      <PublicFooter variant="compact" />
    </div>
  );
}

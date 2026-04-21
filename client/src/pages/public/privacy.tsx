import { Link } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeoHead, breadcrumbSchema } from "@/components/seo/SeoHead";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Política de Privacidade | ImobiBase"
        description="Política de Privacidade do ImobiBase em conformidade com a LGPD. Como coletamos, usamos e protegemos seus dados pessoais e como exercer seus direitos."
        path="/privacidade"
        structuredData={breadcrumbSchema([
          { name: "Início", path: "/" },
          { name: "Privacidade", path: "/privacidade" },
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
        <h1 className="text-4xl font-heading font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 15 de março de 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ImobiBase ("nós", "nosso" ou "Plataforma") está comprometido com a proteção da privacidade
              dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos
              e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados
              Pessoais (LGPD — Lei nº 13.709/2018) e demais legislações aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Dados Coletados</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Coletamos os seguintes tipos de dados:</p>

            <h3 className="text-lg font-semibold mb-2">2.1 Dados fornecidos pelo usuário</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Nome completo, email e telefone (cadastro)</li>
              <li>CNPJ e razão social da imobiliária</li>
              <li>Dados de imóveis, leads, contratos e transações inseridos na Plataforma</li>
              <li>Informações de pagamento (processadas pelo Stripe — não armazenamos dados de cartão)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">2.2 Dados coletados automaticamente</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Endereço IP e dados de geolocalização aproximada</li>
              <li>Tipo de navegador, sistema operacional e dispositivo</li>
              <li>Páginas visitadas, tempo de permanência e interações na Plataforma</li>
              <li>Cookies e tecnologias similares (veja seção 8)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Finalidade do Tratamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos seus dados para as seguintes finalidades:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Prestação do serviço:</strong> operar e manter a Plataforma, processar transações e fornecer suporte técnico.</li>
              <li><strong>Comunicação:</strong> enviar notificações sobre sua conta, atualizações do serviço e comunicados relevantes.</li>
              <li><strong>Melhoria do serviço:</strong> analisar padrões de uso para aprimorar funcionalidades e experiência do usuário.</li>
              <li><strong>Segurança:</strong> detectar e prevenir fraudes, abusos e atividades maliciosas.</li>
              <li><strong>Obrigações legais:</strong> cumprir obrigações legais e regulatórias aplicáveis.</li>
              <li><strong>Marketing:</strong> com seu consentimento, enviar comunicações promocionais sobre novos recursos e ofertas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Base Legal (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Execução de contrato (Art. 7º, V):</strong> para a prestação dos serviços contratados.</li>
              <li><strong>Consentimento (Art. 7º, I):</strong> para envio de comunicações de marketing e uso de cookies não essenciais.</li>
              <li><strong>Legítimo interesse (Art. 7º, IX):</strong> para melhoria do serviço e segurança da Plataforma.</li>
              <li><strong>Obrigação legal (Art. 7º, II):</strong> para cumprimento de obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Seus dados podem ser compartilhados com:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Provedores de serviço:</strong> Stripe (pagamentos), provedores de hospedagem (infraestrutura), Sentry (monitoramento de erros), SendGrid/Resend (emails transacionais).</li>
              <li><strong>Parceiros de integração:</strong> apenas quando você ativar integrações específicas (WhatsApp, ClickSign, etc.).</li>
              <li><strong>Autoridades:</strong> quando exigido por lei, ordem judicial ou processo legal.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Armazenamento e Segurança</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS/SSL) e em repouso.</li>
              <li>Implementamos controles de acesso rigorosos baseados em função (RBAC).</li>
              <li>Realizamos backups automáticos diários com retenção de 30 dias.</li>
              <li>Multi-tenancy com isolamento completo de dados entre organizações.</li>
              <li>Monitoramento contínuo de segurança e auditoria de acessos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conforme a LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Confirmação e acesso:</strong> confirmar a existência de tratamento e acessar seus dados.</li>
              <li><strong>Correção:</strong> solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
              <li><strong>Anonimização ou eliminação:</strong> solicitar a anonimização ou eliminação de dados desnecessários.</li>
              <li><strong>Portabilidade:</strong> solicitar a portabilidade dos seus dados para outro fornecedor.</li>
              <li><strong>Revogação do consentimento:</strong> revogar o consentimento a qualquer momento.</li>
              <li><strong>Oposição:</strong> se opor ao tratamento realizado com base em legítimo interesse.</li>
              <li><strong>Informação sobre compartilhamento:</strong> saber com quais entidades seus dados foram compartilhados.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Para exercer seus direitos, entre em contato pelo email:{" "}
              <a href="mailto:privacidade@imobibase.com" className="text-primary hover:underline">privacidade@imobibase.com</a>.
              Responderemos sua solicitação em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos os seguintes tipos de cookies:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Essenciais:</strong> necessários para o funcionamento básico da Plataforma (autenticação, sessão).</li>
              <li><strong>Analíticos:</strong> para entender como os usuários interagem com a Plataforma (com consentimento).</li>
              <li><strong>Funcionais:</strong> para lembrar preferências e personalizações do usuário.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.
              A desativação de cookies essenciais pode afetar o funcionamento da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Retenção de Dados</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Dados de conta: mantidos enquanto a conta estiver ativa, e por 30 dias após o encerramento.</li>
              <li>Dados de transação: mantidos por 5 anos conforme legislação fiscal.</li>
              <li>Logs de acesso: mantidos por 6 meses conforme o Marco Civil da Internet.</li>
              <li>Dados de marketing: mantidos até a revogação do consentimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Transferência Internacional</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados podem ser processados em servidores localizados fora do Brasil (como nos Estados Unidos),
              utilizando provedores de infraestrutura em nuvem. Nesses casos, garantimos que o nível de proteção
              de dados seja equivalente ao exigido pela LGPD, mediante cláusulas contratuais padrão ou outros
              mecanismos legais apropriados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta Política pode ser atualizada periodicamente. Alterações significativas serão comunicadas por
              email ou notificação na Plataforma com antecedência mínima de 30 dias. A data da última atualização
              será sempre indicada no topo desta página.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Encarregado de Proteção de Dados (DPO)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para questões relacionadas à proteção de dados pessoais, você pode entrar em contato com nosso
              Encarregado de Proteção de Dados pelo email:{" "}
              <a href="mailto:dpo@imobibase.com" className="text-primary hover:underline">dpo@imobibase.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas ou solicitações sobre esta Política de Privacidade:{" "}
              <a href="mailto:privacidade@imobibase.com" className="text-primary hover:underline">privacidade@imobibase.com</a>
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Você também pode registrar uma reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD)
              caso entenda que seus direitos não foram atendidos.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex gap-4">
          <Link href="/termos">
            <Button variant="outline">Termos de Uso</Button>
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

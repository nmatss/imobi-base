import { Link } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-heading font-bold mb-2">Politica de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Ultima atualizacao: 15 de marco de 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introducao</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ImobiBase ("nos", "nosso" ou "Plataforma") esta comprometido com a protecao da privacidade
              dos seus usuarios. Esta Politica de Privacidade descreve como coletamos, usamos, armazenamos
              e protegemos suas informacoes pessoais, em conformidade com a Lei Geral de Protecao de Dados
              Pessoais (LGPD - Lei n. 13.709/2018) e demais legislacoes aplicaveis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Dados Coletados</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Coletamos os seguintes tipos de dados:</p>

            <h3 className="text-lg font-semibold mb-2">2.1 Dados fornecidos pelo usuario</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Nome completo, email e telefone (cadastro)</li>
              <li>CNPJ e razao social da imobiliaria</li>
              <li>Dados de imoveis, leads, contratos e transacoes inseridos na Plataforma</li>
              <li>Informacoes de pagamento (processadas pelo Stripe, nao armazenamos dados de cartao)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">2.2 Dados coletados automaticamente</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Endereco IP e dados de geolocalizacao aproximada</li>
              <li>Tipo de navegador, sistema operacional e dispositivo</li>
              <li>Paginas visitadas, tempo de permanencia e interacoes na Plataforma</li>
              <li>Cookies e tecnologias similares (veja secao 8)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Finalidade do Tratamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos seus dados para as seguintes finalidades:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Prestacao do servico:</strong> Operar e manter a Plataforma, processar transacoes e fornecer suporte tecnico.</li>
              <li><strong>Comunicacao:</strong> Enviar notificacoes sobre sua conta, atualizacoes do servico e comunicados relevantes.</li>
              <li><strong>Melhoria do servico:</strong> Analisar padroes de uso para aprimorar funcionalidades e experiencia do usuario.</li>
              <li><strong>Seguranca:</strong> Detectar e prevenir fraudes, abusos e atividades maliciosas.</li>
              <li><strong>Obrigacoes legais:</strong> Cumprir obrigacoes legais e regulatorias aplicaveis.</li>
              <li><strong>Marketing:</strong> Com seu consentimento, enviar comunicacoes promocionais sobre novos recursos e ofertas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Base Legal (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">O tratamento de dados pessoais e realizado com base nas seguintes hipoteses legais:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Execucao de contrato (Art. 7, V):</strong> Para a prestacao dos servicos contratados.</li>
              <li><strong>Consentimento (Art. 7, I):</strong> Para envio de comunicacoes de marketing e uso de cookies nao essenciais.</li>
              <li><strong>Legitimo interesse (Art. 7, IX):</strong> Para melhoria do servico e seguranca da Plataforma.</li>
              <li><strong>Obrigacao legal (Art. 7, II):</strong> Para cumprimento de obrigacoes legais e regulatorias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Seus dados podem ser compartilhados com:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Provedores de servico:</strong> Stripe (pagamentos), provedores de hospedagem (infraestrutura), Sentry (monitoramento de erros), SendGrid/Resend (emails transacionais).</li>
              <li><strong>Parceiros de integracao:</strong> Apenas quando voce ativar integracoes especificas (WhatsApp, ClickSign, etc.).</li>
              <li><strong>Autoridades:</strong> Quando exigido por lei, ordem judicial ou processo legal.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Nao vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Armazenamento e Seguranca</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Seus dados sao armazenados em servidores seguros com criptografia em transito (TLS/SSL) e em repouso.</li>
              <li>Implementamos controles de acesso rigorosos baseados em funcao (RBAC).</li>
              <li>Realizamos backups automaticos diarios com retencao de 30 dias.</li>
              <li>Multi-tenancy com isolamento completo de dados entre organizacoes.</li>
              <li>Monitoramento continuo de seguranca e auditoria de acessos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Conforme a LGPD, voce possui os seguintes direitos em relacao aos seus dados pessoais:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Confirmacao e acesso:</strong> Confirmar a existencia de tratamento e acessar seus dados.</li>
              <li><strong>Correcao:</strong> Solicitar a correcao de dados incompletos, inexatos ou desatualizados.</li>
              <li><strong>Anonimizacao ou eliminacao:</strong> Solicitar a anonimizacao ou eliminacao de dados desnecessarios.</li>
              <li><strong>Portabilidade:</strong> Solicitar a portabilidade dos seus dados para outro fornecedor.</li>
              <li><strong>Revogacao do consentimento:</strong> Revogar o consentimento a qualquer momento.</li>
              <li><strong>Oposicao:</strong> Se opor ao tratamento realizado com base em legitimo interesse.</li>
              <li><strong>Informacao sobre compartilhamento:</strong> Saber com quais entidades seus dados foram compartilhados.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Para exercer seus direitos, entre em contato pelo email:{" "}
              <a href="mailto:privacidade@imobibase.com" className="text-primary hover:underline">privacidade@imobibase.com</a>.
              Responderemos sua solicitacao em ate 15 dias uteis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos os seguintes tipos de cookies:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Essenciais:</strong> Necessarios para o funcionamento basico da Plataforma (autenticacao, sessao).</li>
              <li><strong>Analiticos:</strong> Para entender como os usuarios interagem com a Plataforma (com consentimento).</li>
              <li><strong>Funcionais:</strong> Para lembrar preferencias e personalizacoes do usuario.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Voce pode gerenciar suas preferencias de cookies nas configuracoes do seu navegador.
              A desativacao de cookies essenciais pode afetar o funcionamento da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Retencao de Dados</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Dados de conta: Mantidos enquanto a conta estiver ativa, e por 30 dias apos o encerramento.</li>
              <li>Dados de transacao: Mantidos por 5 anos conforme legislacao fiscal.</li>
              <li>Logs de acesso: Mantidos por 6 meses conforme o Marco Civil da Internet.</li>
              <li>Dados de marketing: Mantidos ate a revogacao do consentimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Transferencia Internacional</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados podem ser processados em servidores localizados fora do Brasil (como nos Estados Unidos),
              utilizando provedores de infraestrutura em nuvem. Nesses casos, garantimos que o nivel de protecao
              de dados seja equivalente ao exigido pela LGPD, mediante clausulas contratuais padrao ou outros
              mecanismos legais apropriados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Alteracoes nesta Politica</h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta Politica pode ser atualizada periodicamente. Alteracoes significativas serao comunicadas por
              email ou notificacao na Plataforma com antecedencia minima de 30 dias. A data da ultima atualizacao
              sera sempre indicada no topo desta pagina.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Encarregado de Protecao de Dados (DPO)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para questoes relacionadas a protecao de dados pessoais, voce pode entrar em contato com nosso
              Encarregado de Protecao de Dados pelo email:{" "}
              <a href="mailto:dpo@imobibase.com" className="text-primary hover:underline">dpo@imobibase.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para duvidas ou solicitacoes sobre esta Politica de Privacidade:{" "}
              <a href="mailto:privacidade@imobibase.com" className="text-primary hover:underline">privacidade@imobibase.com</a>
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Voce tambem pode registrar uma reclamacao junto a Autoridade Nacional de Protecao de Dados (ANPD)
              caso entenda que seus direitos nao foram atendidos.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex gap-4">
          <Link href="/termos">
            <Button variant="outline">Termos de Uso</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Voltar ao inicio</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

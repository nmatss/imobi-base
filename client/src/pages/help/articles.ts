/**
 * Central de Ajuda — conteúdo dos artigos.
 *
 * Os textos descrevem somente recursos que existem de fato no produto
 * (labels conferidos nas páginas correspondentes). O `content` é texto
 * simples com parágrafos separados por linha em branco — renderizado
 * com `whitespace-pre-wrap` na página de artigo (sem dependência de markdown).
 */

export type HelpCategory =
  | "Primeiros passos"
  | "CRM e Leads"
  | "Imóveis"
  | "Financeiro"
  | "Site público"
  | "Integrações";

export interface HelpArticle {
  slug: string;
  title: string;
  category: HelpCategory;
  keywords: string[];
  content: string;
}

/** Ordem de exibição das categorias na lista. */
export const HELP_CATEGORIES: HelpCategory[] = [
  "Primeiros passos",
  "Imóveis",
  "CRM e Leads",
  "Financeiro",
  "Site público",
  "Integrações",
];

export const helpArticles: HelpArticle[] = [
  {
    slug: "primeiros-passos",
    title: "Primeiros passos no ImobiBase",
    category: "Primeiros passos",
    keywords: ["dashboard", "menu", "sidebar", "busca", "atalhos", "começar", "visão geral", "notificações"],
    content: `Bem-vindo ao ImobiBase! Este guia mostra como se orientar no painel nos primeiros minutos de uso.

1. O menu lateral
O menu à esquerda é dividido em quatro seções: Geral (Dashboard), Operação (Imóveis, Leads & CRM, Agenda, Propostas, Vendas, Aluguéis, Vistorias, Financeiro e Portal), Inteligência (Relatórios, Marketing IA, Avaliações, ISA Virtual e Analytics) e Configurações. Use a setinha na borda do menu para recolhê-lo e ganhar espaço na tela.

2. O Dashboard
A página inicial reúne os indicadores principais do dia: Pendências de Hoje (lembretes atrasados e do dia), Pipeline de Vendas (funil de conversão dos seus leads), Agenda de Hoje (visitas marcadas), Últimos Leads (com sugestão de próximo passo) e Portfólio de Imóveis (quantos estão disponíveis).

3. Busca global
Pressione Ctrl+K (ou Cmd+K no Mac) em qualquer tela para buscar imóveis, leads e contratos pelo nome.

4. Notificações
O sino no topo mostra seus lembretes pendentes de follow-up com leads. Lembretes atrasados aparecem destacados em vermelho.

5. Mais de uma imobiliária?
Se você participa de mais de uma empresa, use o seletor no topo do menu lateral para alternar entre elas.

Próximos passos recomendados: cadastre seu primeiro imóvel, personalize seu site público em Configurações > Marca e convide sua equipe em Configurações > Usuários.`,
  },
  {
    slug: "cadastrar-primeiro-imovel",
    title: "Como cadastrar seu primeiro imóvel",
    category: "Imóveis",
    keywords: ["imóvel", "cadastro", "novo imóvel", "fotos", "venda", "aluguel", "apartamento", "casa", "anúncio"],
    content: `Cadastrar um imóvel leva poucos minutos e ele já fica pronto para aparecer no seu site público.

1. No menu lateral, acesse Imóveis e clique em Novo Imóvel.

2. O formulário tem três etapas:

Etapa 1 — Dados Básicos: título do anúncio, descrição, tipo (Apartamento, Casa, Comercial ou Terreno), situação (Venda ou Aluguel), preço e endereço completo (rua, cidade, estado e CEP).

Etapa 2 — Características: quartos, banheiros, área (m²) e comodidades do imóvel.

Etapa 3 — Mídia: adicione as fotos do imóvel. Recomendamos pelo menos 3 fotos — anúncios com mais fotos têm pontuação de qualidade maior e convertem melhor. Você também pode marcar o imóvel como destaque.

3. Salve. O imóvel entra na lista com status Disponível.

Sobre os status: cada imóvel pode estar Disponível, Reservado, Vendido ou Alugado. Atualize o status conforme a negociação avança — imóveis vendidos ou alugados saem da vitrine do site público.

Dica: use os filtros no topo da lista (situação, status, tipo e cidade) para encontrar imóveis rapidamente, e a busca global (Ctrl+K) para localizar um imóvel pelo nome de qualquer tela.`,
  },
  {
    slug: "funil-de-leads",
    title: "Como funciona o funil de leads",
    category: "CRM e Leads",
    keywords: ["leads", "crm", "kanban", "funil", "pipeline", "follow-up", "lembrete", "interação", "etapas"],
    content: `A tela Leads & CRM organiza seus contatos em um quadro kanban com cinco colunas, que representam as etapas do funil:

Novo → Em Contato → Visita → Proposta → Fechado

1. Movendo leads pelo funil
Arraste o card do lead de uma coluna para outra conforme a negociação evolui. Ao mover um lead para Visita, o sistema sugere ir para a Agenda para marcar o horário; ao mover para Proposta ou Fechado, sugere ir para Propostas e Contratos.

2. Registrando interações
Abra o card de um lead para registrar cada contato feito: Ligação, E-mail, WhatsApp, Visita ou Anotação. Esse histórico fica salvo no lead e ajuda toda a equipe a saber o que já foi conversado.

3. Lembretes de follow-up
Crie lembretes para não esquecer o próximo passo: Ligar, Enviar e-mail, WhatsApp, Agendar visita, Enviar proposta ou Outro, com data e hora. Os lembretes pendentes aparecem no sino de notificações no topo da tela e na seção Pendências de Hoje do Dashboard — atrasados ficam destacados em vermelho.

4. Filtros
Use os filtros do quadro para ver apenas leads de determinadas etapas ou refinar a visualização quando o volume crescer.

Dica: o Pipeline de Vendas no Dashboard mostra a taxa de conversão entre as etapas — use-o para identificar onde os leads estão travando.`,
  },
  {
    slug: "agendando-visitas",
    title: "Agendando visitas",
    category: "CRM e Leads",
    keywords: ["visita", "agenda", "calendário", "agendar", "reagendar", "feedback", "presencial", "virtual"],
    content: `As visitas aos imóveis são gerenciadas na tela Agenda.

1. Criando uma visita
Na Agenda, clique em Agendar Visita. Preencha:
- Cliente (lead) — obrigatório
- Imóvel — obrigatório
- Data e Horário — obrigatórios
- Tipo de Visita: presencial ou virtual
- Canal/Origem: por onde a visita foi solicitada
- Observações: anotações livres

Clique em Agendar para salvar.

2. Acompanhando o dia
As visitas do dia aparecem no card Agenda de Hoje do Dashboard, e a Agenda mostra todas as visitas marcadas com filtros por tipo e canal.

3. Reagendando
Se o cliente pedir outra data, abra a visita e use Reagendar Visita — você escolhe a nova data sem perder o histórico.

4. Após a visita
Use Registrar Feedback para anotar a percepção do cliente. Esse registro fica vinculado ao lead e ajuda na hora de montar a proposta.

Dica: você também pode chegar na Agenda direto do funil — ao arrastar um lead para a coluna Visita no kanban, o sistema oferece o atalho "Ir para Agenda".`,
  },
  {
    slug: "lancamentos-financeiros",
    title: "Lançamentos financeiros (receitas e despesas)",
    category: "Financeiro",
    keywords: ["financeiro", "receita", "despesa", "lançamento", "categoria", "fluxo de caixa", "comissão", "repasse"],
    content: `A tela Financeiro centraliza todas as receitas e despesas da imobiliária.

1. Criando um lançamento manual
Clique em Novo Lançamento e informe o tipo (receita ou despesa), a descrição, a categoria, o valor, a data e o status. Lançamentos podem estar Previstos (ainda não pagos/recebidos), Realizados ou Atrasados.

2. Lançamentos automáticos
Além dos lançamentos manuais, o Financeiro recebe automaticamente movimentações geradas pelo sistema. As abas no topo da lista separam por origem: vendas, aluguéis, repasses, comissões e lançamentos manuais — ou veja tudo junto na aba geral.

3. Filtros e período
Filtre por status (Previsto, Realizado, Atrasado), por tipo (Apenas Receitas ou Apenas Despesas), por categoria e por período: Hoje, Este Mês, Mês Passado, Último Trimestre, Este Ano ou um intervalo personalizado com data de início e fim.

4. Visão gerencial
Os cards e gráficos do topo mostram o resumo do período: o comparativo Receitas x Despesas (por mês, categoria ou origem) e a Margem Operacional. Use a busca para localizar um lançamento pela descrição ou contrato.

Dica: mantenha os status atualizados (marque como Realizado ao confirmar o pagamento) — é isso que deixa os gráficos e a margem confiáveis.`,
  },
  {
    slug: "contratos-e-propostas",
    title: "Contratos e propostas",
    category: "Financeiro",
    keywords: ["proposta", "contrato", "venda", "locação", "assinatura", "negociação", "status", "duplicar"],
    content: `A tela Propostas (menu Operação) reúne propostas e contratos em um só lugar, com abas separadas para cada um.

1. Criando uma proposta
Clique em Nova Proposta. O assistente pede o tipo de negociação (Venda ou Locação), o lead, o imóvel e o valor. A proposta nasce como rascunho e você atualiza o status conforme a negociação: enviada, aceita ou Recusada.

2. Criando um contrato
Quando a proposta é aceita, clique em Novo Contrato para formalizar — o mesmo assistente é usado, agora gerando um contrato com seu próprio status de acompanhamento.

3. Acompanhamento
Os cards no topo mostram o resumo (quantidade de propostas e contratos por situação). Use os filtros por tipo (Venda ou Locação), por status e por período (últimos 7, 30, 60, 90 dias ou último ano).

4. Recursos úteis
- Duplicar proposta: crie uma nova proposta a partir de uma existente, útil para renegociações.
- Assinaturas: cada contrato acompanha o status de assinatura das partes.
- Integração com o funil: ao mover um lead para a coluna Proposta no kanban, o sistema oferece o atalho "Ir para Contratos".

Os valores de contratos fechados alimentam as telas de Vendas, Aluguéis e o Financeiro.`,
  },
  {
    slug: "personalizando-site-publico",
    title: "Personalizando seu site público",
    category: "Site público",
    keywords: ["site", "marca", "logo", "cores", "domínio", "subdomínio", "personalização", "redes sociais", "rodapé"],
    content: `Cada imobiliária no ImobiBase tem um site público próprio, onde os imóveis Disponíveis ficam visíveis para os clientes. A personalização é feita em Configurações > Marca.

1. Logo
Envie o logo da sua imobiliária (arquivo de imagem de até 2MB). Ele aparece no topo do site público. Após o upload, lembre de salvar as alterações.

2. Cores
Defina a Cor Primária e a Cor Secundária — elas são aplicadas no visual do site para combinar com a identidade da sua marca. Você pode digitar o código hexadecimal (ex.: #0066cc) ou usar o seletor de cor.

3. Endereço do site
- Subdomínio do Portal: define o endereço padrão do seu site (ex.: minha-imobiliaria). Seu site fica acessível em /e/minha-imobiliaria.
- Domínio Personalizado: se você tem um domínio próprio (ex.: www.minhaimobiliaria.com.br), informe-o aqui para usá-lo no lugar do endereço padrão.

4. Redes sociais e rodapé
Adicione os links de Facebook, Instagram, LinkedIn e YouTube, e personalize o Texto do Rodapé — bom lugar para o CRECI e os dados legais da imobiliária.

5. Conferindo o resultado
Use o botão "Ver meu Site" no menu lateral para abrir o site público em uma nova aba e conferir as mudanças.`,
  },
  {
    slug: "convidando-equipe",
    title: "Convidando sua equipe",
    category: "Primeiros passos",
    keywords: ["usuários", "equipe", "convite", "papéis", "permissões", "corretor", "gestor", "administrador"],
    content: `Adicione corretores e demais membros da equipe em Configurações > Usuários.

1. Enviando o convite
Clique em Convidar Usuário e preencha o Nome Completo, o E-mail e o papel do novo membro. O convite é enviado por e-mail e a pessoa cria a própria senha ao aceitá-lo.

2. Papéis disponíveis
- Administrador: acesso completo, incluindo configurações da empresa, plano e usuários.
- Gestor: gerencia a operação e acompanha o trabalho da equipe.
- Corretor: foco no dia a dia comercial — imóveis, leads, visitas e propostas.
- Financeiro: foco nos lançamentos e relatórios financeiros.

3. Gerenciando os usuários
A lista mostra cada usuário com seu papel. Você pode editar o papel de um usuário a qualquer momento e, se o convite não chegou, usar a opção de reenviar convite.

4. Ajuste fino de permissões
Na aba Configurações > Permissões é possível refinar o que cada papel pode ver e fazer no sistema.

Atenção: o número de usuários disponíveis depende do seu plano. Veja o consumo atual em Configurações > Planos, na seção Uso do Plano.`,
  },
  {
    slug: "planos-e-assinatura",
    title: "Planos e assinatura",
    category: "Primeiros passos",
    keywords: ["plano", "assinatura", "upgrade", "pagamento", "fatura", "cartão", "cancelar", "portal", "cobrança"],
    content: `Sua assinatura é gerenciada em Configurações > Planos.

1. Plano Atual
O card Plano Atual mostra qual plano está ativo e as informações de cobrança. Logo abaixo, a seção Uso do Plano mostra quanto dos limites (imóveis, usuários etc.) você já consumiu.

2. Fazendo upgrade
Na seção Planos Disponíveis, compare os planos e clique em Fazer Upgrade no plano desejado. Você será levado ao checkout para confirmar o pagamento, e os novos limites valem imediatamente após a confirmação.

3. Portal do assinante
O botão "Gerenciar no portal" abre o portal seguro de cobrança, onde você pode atualizar o cartão de crédito, ver o histórico de faturas e baixar comprovantes — sem precisar falar com o suporte.

4. Cancelando ou reativando
- Cancelar assinatura: a assinatura permanece ativa até o final do período já pago; depois disso a conta é rebaixada para o plano gratuito.
- Mudou de ideia? Enquanto o período atual não termina, o botão Reativar assinatura desfaz o cancelamento sem custo adicional.

Dica: antes de fazer upgrade, confira na seção Uso do Plano qual limite está apertado — assim você escolhe o plano certo para o seu momento.`,
  },
  {
    slug: "vistorias-digitais",
    title: "Vistorias digitais",
    category: "Imóveis",
    keywords: ["vistoria", "entrada", "saída", "periódica", "laudo", "comparação", "inquilino", "vistoriador", "assinatura"],
    content: `A tela Vistorias permite documentar o estado dos imóveis digitalmente, com relatório assinado ao final — essencial para locações.

1. Criando uma vistoria
Clique em Nova Vistoria e preencha:
- Imóvel — obrigatório
- Tipo de Vistoria: Entrada (início da locação), Saída (devolução do imóvel) ou Periódica
- Vistoria de Entrada (para comparação): em vistorias de Saída, vincule a vistoria de Entrada correspondente
- Nome do Vistoriador — obrigatório
- Nome do Inquilino
- Data Agendada

2. Executando a vistoria
Abra a vistoria e percorra os ambientes do imóvel registrando o estado de conservação de cada item, com fotos e observações. Enquanto isso, ela fica com status Em Andamento.

3. Concluindo e assinando
Ao finalizar todos os ambientes, conclua a vistoria (status Concluída) e colete as assinaturas — a vistoria passa a Assinada. O sistema gera um relatório em HTML com as assinaturas do vistoriador e do inquilino.

4. Comparando entrada e saída
Em vistorias de Saída vinculadas a uma Entrada, use a tela de comparação para ver lado a lado o estado de cada item no início e no fim da locação — a base objetiva para discutir reparos e devolução de caução.

Use os filtros por status (Em Andamento, Concluída, Assinada), tipo e imóvel para organizar o trabalho.`,
  },
  {
    slug: "integracoes-disponiveis",
    title: "Conectando integrações",
    category: "Integrações",
    keywords: ["integração", "portais", "zap", "olx", "vivareal", "whatsapp", "e-mail", "assinatura digital", "clicksign", "docusign", "bi"],
    content: `O ImobiBase se conecta a serviços externos em Configurações > Integrações.

1. Integrações disponíveis
- Portais imobiliários: ZAP, OLX e VivaReal — publique seus imóveis automaticamente nos grandes portais.
- WhatsApp: envie mensagens e notificações via WhatsApp. Há também uma aba dedicada (Configurações > WhatsApp) para os ajustes específicos do canal.
- E-mail: SendGrid ou Mailgun — envio de e-mails automáticos do sistema.
- Assinatura digital: Clicksign ou Docusign — assine contratos digitalmente.
- BI: integração com ferramentas de Business Intelligence para análises avançadas.

2. Conectando uma integração
Clique na integração desejada, preencha as credenciais solicitadas (chaves de API fornecidas pelo serviço) e salve. O card mostra o status de conectada.

3. Desconectando
Você pode conectar e desconectar uma integração a qualquer momento pelo mesmo card, sem perder a configuração salva.

Dica: as credenciais são obtidas no painel de cada serviço (por exemplo, a chave de API no painel do SendGrid). Se a conexão falhar, confira se a chave foi copiada completa e se a conta no serviço externo está ativa.`,
  },
];

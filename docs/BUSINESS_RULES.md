# Business Rules

Atualizado em: 17/06/2026

## Regras centrais

- Todo dado operacional pertence a um tenant.
- Usuarios acessam apenas dados do proprio tenant, exceto superadmin.
- Planos controlam limites e features por tenant.
- Leads devem manter origem, responsavel, status e historico.
- Imoveis publicos aparecem nas vitrines `/e/:slug`.
- Rotas privadas nao devem aparecer em sitemap.
- Financeiro de locacao deve separar repasse ao proprietario de receita da imobiliaria.
- Fluxos de assinatura, pagamento e WhatsApp devem registrar auditoria e idempotencia quando aplicavel.

## Produto

- O fluxo competitivo recomendado e lead -> qualificacao -> sugestao de imovel -> agendamento -> visita -> feedback -> proxima acao -> proposta/contrato.
- A agenda de visitas deve evitar conflitos e registrar feedback pos-visita.
- IA deve executar ou sugerir acoes auditaveis no CRM.

## Compliance

- Consentimentos LGPD, auditoria, incidentes e exportacao/exclusao de dados devem respeitar escopo do tenant.
- Logs nao devem expor secrets, tokens ou dados sensiveis desnecessarios.


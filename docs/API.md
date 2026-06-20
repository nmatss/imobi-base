# API

Atualizado em: 17/06/2026

## Visao geral

A API e servida por Express e exposta em `/api/*`. Em producao, Vercel roteia `/api/:path*` para `api/index.mjs`.

## Grupos principais

- Auth e sessoes.
- Tenants e usuarios.
- Imoveis.
- Leads e interacoes.
- Visitas e agenda.
- Contratos e assinatura.
- Locacoes, proprietarios, inquilinos e repasses.
- Vendas, propostas, comissoes e financeiro.
- Relatorios.
- Arquivos.
- Analytics.
- Portal.
- WhatsApp.
- SMS.
- ClickSign.
- Pagamentos.
- Maps.
- IA/ISA/AVM/auto-marketing.
- Compliance.
- Crons.

## Regras para novas rotas

- Validar autenticacao e autorizacao.
- Validar tenant ownership.
- Validar input com schema.
- Evitar retornar dados de outro tenant.
- Aplicar rate limit em rotas sensiveis.
- Registrar auditoria em acoes sensiveis.
- Criar teste de IDOR para qualquer rota que leia ou altere recurso por ID.

## Referencias

- `server/routes.ts`
- `server/routes-*.ts`
- `server/routes-docs.ts`
- `server/schemas/`


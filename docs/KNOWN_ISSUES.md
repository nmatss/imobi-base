# Known Issues

Atualizado em: 17/06/2026

## CRITICO

- Nao ha mais pendencia critica puramente local sem gate: RLS, backup/restore, cron e pentest possuem scripts de verificacao. Ainda nao e correto declarar producao enterprise ate executar esses gates em staging/producao real:
  - `npm run db:rls:verify`;
  - `npm run ops:backup:verify`;
  - `npm run ops:restore:drill`;
  - `TEST_URL=<staging/prod> npm run security:pentest`.

## ALTO

- Banco de producao identificado em `us-east-1`, enquanto Vercel esta em `gru1`; risco de latencia.
- Cobertura de testes medida em 17/06/2026 esta muito abaixo do gate enterprise: statements 11,1%, branches 8,19%, functions 8,84%, lines 11,51%.
- Grande volume de warnings de lint precisa ser reduzido de forma planejada: 5166 warnings, 0 errors em 17/06/2026.
- Dependencias desatualizadas existem, apesar de `npm audit --json` reportar 0 vulnerabilidades em 17/06/2026.
- SEO das paginas publicas conhecidas ja possui HTML estatico por rota no build; vitrines dinamicas de tenant/imovel/cidade/bairro ainda precisam de prerender/SSR ou geracao estatica.
- `/sitemap-dynamic.xml` foi roteado para o backend, mas ainda precisa ser validado no deploy Vercel real.
- Webhook legado da ISA foi desabilitado por padrao em producao; se for mantido, ainda deve derivar tenant da configuracao do numero/WABA e usar assinatura/idempotencia propria.
- Stripe, Mercado Pago e ClickSign ja usam ledger persistente; falta validar a migration em staging/producao e estender o ledger para o webhook oficial do WhatsApp.
- Pentest externo manual ainda e recomendado antes de contrato enterprise, mesmo com `security:pentest` automatizado.

## MEDIO

- Performance da home melhorou, mas Lighthouse ainda ficou em 74; LCP final em preview local foi 5,1s.
- Bundle inicial ainda carrega JavaScript relevante para a landing.
- CORS foi padronizado no runtime, mas producao ainda precisa garantir `CORS_ORIGINS` sem localhost e aposentar `ALLOWED_ORIGINS`.
- Workers BullMQ existem, mas e preciso decidir operacao oficial fora da Vercel ou via crons HTTP.
- Unsubscribe/opt-out ainda precisa persistir bloqueio real de envio e aposentar qualquer fluxo legado sem token forte.
- Portal de atendimento comprador/lead ainda nao existe como fluxo funcional de selecao, aceite/recusa, comentario e pedido de visita.
- Acoes de IA ainda nao sao auditaveis/aprovaveis em tabela propria.

## BAIXO

- Documentacao estava fragmentada; foram adicionados indices e memorias para governanca.
- SEO publico foi melhorado, mas ainda ha oportunidade de paginas locais dinamicas por cidade/bairro/tipo/finalidade.

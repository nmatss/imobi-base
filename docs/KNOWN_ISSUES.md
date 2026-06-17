# Known Issues

Atualizado em: 17/06/2026

## CRITICO

- RLS multi-tenant ainda nao foi aplicado/validado em staging/producao real. Os artefatos existem, mas ainda nao e correto declarar isolamento enterprise ate executar:
  - apply controlado de `migrations/RLS_enable.sql`;
  - `npm run db:rls:verify` com role runtime nao-owner;
  - confirmacao de que a role da aplicacao nao possui `BYPASSRLS`.
- Gated operacionais ainda precisam de evidencia em staging/producao real antes de Go Live enterprise:
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
- Stripe, Mercado Pago, ClickSign e webhook oficial do WhatsApp ja usam ledger persistente; falta validar a migration em staging/producao.
- Pentest externo manual ainda e recomendado antes de contrato enterprise, mesmo com `security:pentest` automatizado.
- IDOR/FK ownership: vistorias e fluxos centrais de contratos, locacoes, pagamentos, repasses, propostas, vendas, lancamentos financeiros e AVM foram reforcados localmente em 17/06/2026. Ainda falta prova dinamica multi-tenant em staging/producao e auditoria de rotas legadas/integracoes fora desse nucleo.
- Setup de 2FA nao usa mais QR Code externo (`api.qrserver.com`) e gera QR localmente via `qrcode`; rate limit/lockout de 2FA usa Redis quando `REDIS_URL` existe e degrada para memoria em dev/test. Ainda falta validar Redis real no deploy serverless.
- Upload de imagens de imovel foi reduzido localmente para 10 arquivos de ate 10MB cada, com teto de lote de 50MB e validacao de ownership do imovel. Ainda falta substituir `memoryStorage` por streaming/upload assinado para maturidade 10/10.
- Validacao anti-SSRF agora resolve DNS, bloqueia redirects para alvos privados e foi aplicada a security webhooks/WhatsApp. Ainda falta prova em staging/producao e pentest externo/manual antes de Go Live enterprise.

## MEDIO

- Performance da home melhorou, mas Lighthouse ainda ficou em 74; LCP final em preview local foi 5,1s.
- Bundle inicial ainda carrega JavaScript relevante para a landing.
- CORS foi padronizado no runtime e defaults de producao nao incluem localhost; producao ainda deve configurar `CORS_ORIGINS` explicitamente e aposentar `ALLOWED_ORIGINS`.
- Handler serverless agora registra `cookie-parser` e alinha preflight com `Authorization`; validar em deploy real com login, CSRF e portal por cookie.
- Workers BullMQ existem, mas e preciso decidir operacao oficial fora da Vercel ou via crons HTTP. Crons HTTP agora possuem lock distribuido via Redis quando `REDIS_URL` esta configurado; ainda falta provar execucao no deploy real e observar duracao/timeout dos jobs longos.
- Unsubscribe/opt-out ainda precisa persistir bloqueio real de envio e aposentar qualquer fluxo legado sem token forte.
- Portal de atendimento comprador/lead ainda nao existe como fluxo funcional de selecao, aceite/recusa, comentario e pedido de visita.
- Acoes de IA ainda nao sao auditaveis/aprovaveis em tabela propria.

## BAIXO

- Documentacao estava fragmentada; foram adicionados indices e memorias para governanca.
- SEO publico foi melhorado, mas ainda ha oportunidade de paginas locais dinamicas por cidade/bairro/tipo/finalidade.

# Known Issues

Atualizado em: 20/06/2026

## CRITICO

- Features P1 (portal comprador, IA acionavel, agenda+CRM, assinatura legal) estao com CODIGO CONCLUIDO e testado localmente em 20/06/2026, mas dependem de acoes em ambiente real antes de declarar prontas:
  - Aplicar migrations `20260620_001..005` e o `RLS_enable.sql` atualizado (6 tabelas novas com policy `tenant_isolation`/`FORCE`) em staging/producao via `docs/DEPLOYMENT_RUNBOOK.md`.
  - `20260620_005` (indices unicos de dedup) FALHA se ja houver leads duplicados (phone/email) no mesmo tenant — limpar duplicatas antes.
  - Assinatura digital agora tem tamper-evidence HMAC-SHA256 e parse X.509 real, mas validade juridica ICP-Brasil plena ainda exige bundle de raizes ICP (cadeia), CRL/OCSP (revogacao), OID de policy e carimbo de tempo de AC do Tempo. Nao prometer "assinatura qualificada" sem esses itens.
  - Rotacionar `AUDIT_SIGNING_SECRET`/`SESSION_SECRET` invalida a verificacao de eventos ja assinados — documentar re-assinatura antes.
  Ver `docs/reports/P1_FEATURES_2026-06-20.md`.


- RLS multi-tenant ainda nao foi aplicado/validado em staging/producao real. Os artefatos existem, mas ainda nao e correto declarar isolamento enterprise ate executar:
  - apply controlado de `migrations/RLS_enable.sql`;
  - `npm run db:rls:verify` com role runtime nao-owner;
  - confirmacao de que a role da aplicacao nao possui `BYPASSRLS`.
- Gated operacionais ainda precisam de evidencia em staging/producao real antes de Go Live enterprise:
  - `npm run ops:go-live:verify:strict`;
  - `npm run db:rls:verify`;
  - `npm run ops:backup:verify`;
  - `npm run ops:restore:drill`;
  - `TEST_URL=<staging/prod> npm run security:pentest`.
- Gate final de deploy em 18/06/2026 confirmou bloqueio de producao: `npm run ops:go-live:verify:strict` falhou com 11 falhas, incluindo URL canonica ausente, chaves Stripe/WhatsApp ausentes, estrategia de backup ausente, banco sem autenticacao valida, RLS runtime sem sucesso e ausencia de evidencias de restore drill/pentest.

## ALTO

- Banco de producao identificado em `us-east-1`, enquanto Vercel esta em `gru1`; risco de latencia.
- Cobertura de testes medida em 18/06/2026 segue muito abaixo do gate enterprise de 80%: statements 12,44%, branches 9,50%, functions 10,11%, lines 12,90%.
- Grande volume de warnings de lint precisa ser reduzido de forma planejada: 5180 warnings, 0 errors em 18/06/2026.
- Dependencias desatualizadas existem, apesar de `npm audit --json` reportar 0 vulnerabilidades em 17/06/2026.
- SEO das paginas publicas conhecidas ja possui HTML estatico por rota no build; vitrines dinamicas de tenant/imovel/cidade/bairro ainda precisam de prerender/SSR ou geracao estatica.
- `/sitemap-dynamic.xml` foi roteado para o backend, mas ainda precisa ser validado no deploy Vercel real.
- Webhook legado da ISA foi desabilitado por padrao em producao; se for mantido, ainda deve derivar tenant da configuracao do numero/WABA e usar assinatura/idempotencia propria.
- Stripe, Mercado Pago, ClickSign e webhook oficial do WhatsApp ja usam ledger persistente; falta validar a migration em staging/producao.
- Opt-out/unsubscribe agora persiste supressao real e filtra bulk email localmente; falta aplicar/validar `20260617_002_newsletter_opt_out.sql` em staging/producao.
- Pentest externo manual ainda e recomendado antes de contrato enterprise, mesmo com `security:pentest` automatizado.
- IDOR/FK ownership: vistorias e fluxos centrais de contratos, locacoes, pagamentos, repasses, propostas, vendas, lancamentos financeiros e AVM foram reforcados localmente em 17/06/2026. Ainda falta prova dinamica multi-tenant em staging/producao e auditoria de rotas legadas/integracoes fora desse nucleo.
- Setup de 2FA nao usa mais QR Code externo (`api.qrserver.com`) e gera QR localmente via `qrcode`; rate limit/lockout de 2FA usa Redis quando `REDIS_URL` existe e degrada para memoria em dev/test ou se o Redis configurado ficar indisponivel. Ainda falta validar Redis real no deploy serverless.
- Upload de imagens de imovel foi reduzido localmente para 10 arquivos de ate 10MB cada, com teto de lote de 50MB e validacao de ownership do imovel. Ainda falta substituir `memoryStorage` por streaming/upload assinado para maturidade 10/10.
- Validacao anti-SSRF agora resolve DNS, bloqueia redirects para alvos privados e foi aplicada a security webhooks/WhatsApp. Ainda falta prova em staging/producao e pentest externo/manual antes de Go Live enterprise.
- WhatsApp `phoneNumberId` agora normaliza trim, falha fechado localmente quando houver mais de um tenant correspondente e possui migration de indice unico parcial; ainda falta aplicar em staging/producao, auditar dados reais e provar que nao ha duplicatas de configuracao.
- Upload generico/documentos agora valida ownership local de `entityType`/`entityId` antes de associar arquivos a entidades multi-tenant; ainda falta prova dinamica em staging/producao.
- Caminho manual de deploy de producao agora executa `ops:go-live:verify:strict` antes de publicar, mas producao continua bloqueada ate esse gate passar com ambiente real.

## MEDIO

- Performance da home melhorou, mas Lighthouse ainda ficou em 74; LCP final em preview local foi 5,1s.
- Bundle inicial ainda carrega JavaScript relevante para a landing.
- Build de 18/06/2026 ainda mostra chunks grandes (`vendor-charts` 456 kB raw, `jspdf` 387 kB raw, shell principal `index-DZBjmKjb.js` 371 kB raw, `html2canvas` 201 kB raw, `vendor-react` 198 kB raw e `product-landing` 163 kB raw); precisa de split adicional antes de perseguir LCP enterprise.
- CORS foi padronizado no runtime e defaults de producao nao incluem localhost; producao ainda deve configurar `CORS_ORIGINS` explicitamente e aposentar `ALLOWED_ORIGINS`.
- Handler serverless agora registra `cookie-parser` e alinha preflight com `Authorization`; validar em deploy real com login, CSRF e portal por cookie.
- Workers BullMQ existem, mas e preciso decidir operacao oficial fora da Vercel ou via crons HTTP. Crons HTTP agora possuem lock distribuido via Redis quando `REDIS_URL` esta configurado; ainda falta provar execucao no deploy real e observar duracao/timeout dos jobs longos.
- Portal de atendimento comprador/lead ainda nao existe como fluxo funcional de selecao, aceite/recusa, comentario e pedido de visita.
- Acoes de IA ainda nao sao auditaveis/aprovaveis em tabela propria.
- Revisao Playwright manual de 18/06/2026 cobriu rotas publicas/auth/portal e smoke autenticado basico. Rotas internas completas ainda precisam de varredura visual autenticada com fixtures, porque `/vendas`, `/calendar`, `/contracts`, `/leads`, `/rentals` e `/financeiro` redirecionaram para `/login` sem sessao.

## BAIXO

- Documentacao estava fragmentada; foram adicionados indices e memorias para governanca.
- SEO publico foi melhorado, mas ainda ha oportunidade de paginas locais dinamicas por cidade/bairro/tipo/finalidade.

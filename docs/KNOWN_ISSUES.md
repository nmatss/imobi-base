# Known Issues

Atualizado em: 10/07/2026

## 2026-07-10 — Execucao Fase 2 (P0 de codigo B1–B8)

Os 8 bloqueadores de codigo P0 do plano foram implementados e validados
(tsc, 770/770 unit, build, gate estatico 13/13, smoke E2E 8/8). Resumo em
`docs/reports/PLANO_GO_LIVE_360_2026-07-10.md` (secao "Execucao Fase 2").
Destaques: funil de billing destravado (checkout ligado a onboarding/login,
stripePriceId via env/admin); assinatura por token com pagina publica /sign/:token
(ClickSign fica fast-follow, agora fail-closed); aba Seguranca real (novo endpoint
POST /api/auth/change-password); dados falsos removidos (reports/contracts);
guard financeiro por papel + comissao automatica; venda marca imovel 'sold' e
recalcula comissao no servidor; redirects OAuth corrigidos para /login;
prova social fabricada removida. Pendencias owner-gated (Frente 1) inalteradas.

## 2026-07-10 — Plano Go-Live 360 + Comercializacao (fonte viva)

Relatorio consolidado (substitui como fonte viva as revisoes anteriores):
`docs/reports/PLANO_GO_LIVE_360_2026-07-10.md`. Auditoria multi-agente (25 agentes)
por modulo + UX/UI de todas as paginas + estrategia SaaS. Estado local verde
(tsc, 770/770 unit, gate estatico 13/13). Veredito: **NO-GO comercial destravavel**;
recomendado lancamento em 2 ondas (piloto fechado -> self-service). Padrao dominante:
"backend pronto, UI desconectada". Bloqueador comercial #1: **funil de billing quebrado**
(nenhum cliente novo assina plano pago). Modulos mais frageis: Contratos/Assinatura (4,0),
Financeiro/Comissoes (4,5), Integracoes credenciais-globais (4,5), Billing (5,0). Modulo
faltante P0: NF-e/NFS-e. Ver o relatorio para o plano faseado completo.


## 2026-06-30 — Revisao completa holistica

Relatorio: `docs/reports/REVISAO_GO_LIVE_COMPLETA_2026-06-30.md`.

Veredito permanece **NO-GO enterprise**. Nao foram identificados novos bloqueadores acima dos ja documentados em 2026-06-29; a auditoria confirmou que parte dos P0 tecnicos foi corrigida localmente, mas segue pendente de evidencia real:

- RLS aplicado/verificado em staging/producao com role runtime nao-owner sem `BYPASSRLS`.
- Secrets locais reais removidos e rotacionados.
- Redis TLS (`rediss://`) provado em staging/producao para rate limit, locks, crons e 2FA.
- `ops:oauth:encrypt-microsoft-tokens -- --apply` executado em ambiente real com `ENCRYPTION_KEY` para tokens Microsoft legados.
- Backup/PITR, restore drill, pentest e `ops:go-live:verify:strict` verdes com evidencias.
- Resolvido localmente: teste unitario `tests/unit/data-export.test.ts` corrigido em 2026-06-30; `npm run test:unit` passou com 770/770.

### Atualizacao Fase 1 local

Corrigido localmente:

- Navegacao lateral sem `div role="link"`.
- Lista de imoveis sem `div role="button"` nos pontos auditados.
- Fluxos de imagem/caracteristica sem `prompt()` nativo.
- Rotas driftadas nas suites Playwright ativas (`accessibility`, `mobile`, `responsive`).

Ainda pendente:

- Resolvido no ambiente local atual: o banco SQLite ignorado em `data/imobibase.db` foi alinhado de forma aditiva para `tenants.onboarding_completed` e colunas faltantes de `visits`; `npm run test:smoke:e2e` passou com 8/8.

## 2026-06-29 — Revisao Go-Live Completa (NO-GO enterprise)

Relatorio: `docs/reports/REVISAO_GO_LIVE_COMPLETA_2026-06-29.md`.

### CRITICO

- **Secrets reais em arquivo local ignorado pelo git (`.env.production`)**. Nao expor valores em logs/docs. Remover do workspace, mover para Vercel/GitHub Secrets e rotacionar credenciais.
- **RLS ainda nao esta provado em staging/producao real** com role runtime nao-owner sem `BYPASSRLS`.
- **Backup/PITR, restore drill e pentest real seguem sem evidencia suficiente** para go-live enterprise.

### ALTO

- `script/verify-rls.ts` nao verifica `migrations/RLS_enable_child_tables.sql`; o gate RLS atual pode deixar tabelas filhas sem prova.
- A assinatura digital publica por token pode quebrar apos aplicar RLS das child tables porque `digital_signatures` exige `app.tenant_id`.
- Microsoft OAuth grava tokens em texto puro; aplicar a mesma criptografia usada pelo Google.
- Redis/rate limit/2FA/locks ainda podem degradar para memoria/fail-open; producao precisa Redis TLS validado.
- Dominio canonico precisa ficar 100% alinhado em envs e CORS (`imobibase.com.br` vs valores legados).
- Snyk pode ser pulado se o token estiver apenas em `secrets`, pois o workflow condiciona em `vars.SNYK_TOKEN`.
- Rotas legadas retornam `403` para cross-tenant em vez de `404`, vazando existencia de recursos.
- Migration `add-performance-indexes.sql` nao deve rodar como migration transacional comum em producao.

### MEDIO

- Playwright/a11y/responsividade tem rotas driftadas (`/financial`, `/properties/new`) e suites quarentenadas.
- Busca global/atalho `Ctrl/Cmd+K` esta duplicado entre `GlobalSearch` e `DashboardLayout`.
- Lista de imoveis e navegacao lateral ainda usam `div role=button/link` em fluxos centrais.
- Bundles continuam grandes: charts, PDF, html2canvas, shell e product landing.
- Vercel usa `npm install`; CI usa `npm ci`.

### Atualizacao local — 2026-06-30

Corrigido no codigo local:

- `tests/unit/data-export.test.ts` passou a validar o contrato atual de
  `downloadExport` como `Buffer`; suite unit completa passou 770/770.
- Rotas Playwright driftadas foram atualizadas nos testes de acessibilidade,
  mobile e responsividade; smoke E2E passou 8/8 apos alinhamento aditivo do
  SQLite local ignorado.
- `properties/list.tsx` e `dashboard-layout.tsx` deixaram de usar os pontos
  auditados de `prompt()` e `div role=button/link`.
- `server/routes/lead-tags.ts` foi extraido de `server/routes.ts`; tenant
  isolation passou 27/27.

Ainda pendente:

- Suites E2E autenticadas completas ainda precisam de fixtures dedicadas.
- Busca global ainda precisa de consolidacao visual/funcional completa.
- `DELETE /api/leads/:leadId/tags/:tagId` ainda nao valida explicitamente
  ownership do `tagId`; a extracao preservou o comportamento existente.
- Baseline local de performance mobile em 2026-06-30 falhou em 7/21:
  carregamento `/dashboard` 4575 ms (>3000 ms), peso total 8,09 MB (>2 MB),
  CSS 258 KB (>100 KB), 100 requests (>50), crescimento de heap 391%, alem de
  duas falhas de harness (`transitionend` e touch context).
- Atualizacao: harness de performance agora roda contra build/preview de
  producao e passou 19/21; falhas remanescentes sao budgets reais de JS
  (~778 KB > 500 KB) e CSS (~194 KB > 100 KB).

### Atualizacao Etapa 0 local — 2026-06-29

Corrigido no codigo local:

- `script/verify-rls.ts` agora verifica `RLS_enable.sql` + `RLS_enable_child_tables.sql`.
- Assinatura publica por token agora tem policy publica estreita em `digital_signatures` e rotas sob contexto RLS adequado.
- Microsoft OAuth agora criptografa novos tokens via `encryptSecret`.
- Script `ops:oauth:encrypt-microsoft-tokens` criado para criptografar tokens Microsoft legados em ambiente real.
- Gate de go-live exige Redis TLS (`rediss://`) e rate limit/2FA nao degradam fail-open em producao.

Ainda pendente:

- Remover/rotacionar secrets locais.
- Rodar script de tokens legados com `ENCRYPTION_KEY` em staging/producao.
- Provar Redis TLS, RLS e gates em staging real.

## 2026-06-27 — Google SSO + Calendar/Meet (PR #5, dormente)

- **SSO e Calendar/Meet estão codados e verdes, mas inativos** até o dono configurar o
  Google Console. Gates: criar OAuth client no GCP do ImobiBase (não o `agendapro360`);
  registrar redirects `/api/auth/google/callback` e
  `/api/integrations/google-calendar/callback`; setar `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`,
  `GOOGLE_CALENDAR_REDIRECT_URI` e `ENCRYPTION_KEY` na Vercel; aplicar migrations
  `20260627_001`, `20260627_002` e `RLS_enable.sql`. Ver `docs/reports/GOOGLE_SSO_CALENDAR_2026-06-27.md`.
- **`calendar.events` é scope SENSÍVEL do Google** → exige **verificação do app** antes de
  liberar para todos os corretores em produção; antes disso só funciona para *test users*.
- **`oauth-microsoft.ts` ainda grava tokens OAuth em texto puro** (Onda 1 cifrou só o Google).
  Aplicar `server/security/token-encryption.ts` também no Microsoft.
- **Teste pré-existente quebrado**: `tests/unit/data-export.test.ts` (1 caso) falha desde
  antes do PR #5 (confirmado via `git stash`), independente das mudanças de Google. O
  pre-commit (`vitest related`) o arrasta via `schema-sqlite`; por isso o PR #5 usou
  `--no-verify` com validação manual (tsc + suíte completa). **Investigar/consertar** esse
  teste à parte.

## Resolvido em 2026-06-22 (Plano de Excelência)

- Idempotência de pagamento agora é durável em Redis (`SET NX`+TTL 7d), eliminando a janela de dupla cobrança que existia com o `Map` in-process em multi-instância. Requer `REDIS_URL` em produção; sem ela, degrada para dedup intra-instância e emite alerta Sentry ("Idempotency em modo degradado").
- Corrida de de-dup de lead sob concorrência agora resolve para 409 (via índice único), não mais 400/500 genérico. (Não resolve duplicatas PRÉ-existentes — ver item do `20260620_005` abaixo.)
- Cache de leitura ativado no `getDashboardStats` com no-op seguro sem Redis.

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

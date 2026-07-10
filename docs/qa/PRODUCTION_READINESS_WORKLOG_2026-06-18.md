# Production Readiness Worklog - 18/06/2026

## Veredito

Status: **NO-GO para producao**.

O sistema passou nos gates locais principais e recebeu hardening adicional relevante, mas ainda nao existe evidencia suficiente para deploy de producao. A liberacao continua bloqueada por `ops:go-live:verify:strict`, cobertura enterprise, RLS/DB real, backup/restore/pentest e evidencias de staging/producao.

## Objetivo da rodada

- Revisar memoria, documentacao e codigo local.
- Fechar pendencias locais de maior impacto.
- Revisar paginas, layout, formularios e assistente de IA.
- Tornar o deploy manual tao seguro quanto o workflow.
- Documentar de forma rastreavel o que foi validado e o que ainda bloqueia producao.

## Mudancas implementadas

### Backend e seguranca

- ClickSign document downloads passaram a usar `fetchExternalUrl`.
- Backup duravel por URL pre-assinada passou a usar `fetchExternalUrl`.
- Restore drill remoto passou a usar `fetchExternalUrl`.
- Payloads de WhatsApp templates/auto-responses removem campos imutaveis vindos do cliente.
- Configuracoes de integracao ignoram `id`, `tenantId`, `integrationName`, `createdAt` e `updatedAt` vindos de payload externo.
- Configuracoes WhatsApp agora normalizam `config.phoneNumberId` ao salvar e ao resolver webhooks, alinhando codigo ao indice unico parcial com `BTRIM`.
- Upload generico/documentos passou a validar ownership de `entityType`/`entityId` antes de fazer upload ou gravar metadados.
- Webhook WhatsApp passou a falhar fechado quando `phoneNumberId` corresponder a mais de um tenant.
- Migration `migrations/20260618_001_whatsapp_phone_number_unique.sql` passou a impor indice unico parcial para `config->>'phoneNumberId'` em integracoes WhatsApp configuradas.
- Gate strict passou a validar no banco real:
  - existencia de `webhook_events`;
  - indice unico `uq_webhook_events_provider_event`;
  - `ENABLE` e `FORCE ROW LEVEL SECURITY` em `webhook_events`;
  - colunas `unsubscribed_at`, `unsubscribe_reason`, `resubscribed_at`;
  - indice `idx_newsletter_subscriptions_active_email`;
  - indice unico `uq_integration_configs_whatsapp_phone_number_id`;
  - existencia da tabela `_migrations`;
  - registros de migrations `20260617_001_webhook_events.sql`, `20260617_002_newsletter_opt_out.sql` e `20260618_001_whatsapp_phone_number_unique.sql`.
- Saida de erro de subcomandos do gate strict ficou mais util, mostrando linhas de falha em vez de apenas a ultima linha generica.

### Deploy e operacao

- `scripts/deploy.sh` agora executa:
  - `npm run test`;
  - `npm run check`;
  - `npm run check:scripts`;
  - `npm run lint -- --quiet`;
  - `npm run build`;
  - `npm run ops:go-live:verify:strict` para producao.
- Deploy manual de Vercel passou a usar `vercel build --prod` + `vercel deploy --prebuilt --prod`.
- Staging manual passou a usar `vercel build` + `vercel deploy --prebuilt`.
- Script manual agora falha se nenhum target de deploy for executado.
- Migrations automaticas em producao foram desabilitadas no script manual; aplicar migrations revisadas deve seguir `docs/DEPLOYMENT_RUNBOOK.md`.
- Push de tag no deploy manual virou opt-in por `PUSH_RELEASE_TAG=true`.
- `scripts/deploy.sh` e `scripts/rollback.sh` foram alinhados para `https://imobibase.com.br`.
- `scripts/rollback.sh` passou a exigir deployment URL/ID explicito para rollback Vercel e deixou de fazer `git checkout` automatico como fallback.
- Workflow de producao so notifica Sentry apos deploy e health check bem-sucedidos.

### Frontend, layout e formularios

- Balao global do assistente de IA foi adicionado ao layout autenticado.
- Balao global do assistente de IA passou a ter politica de rota: oculto em settings, que ja possui drawer proprio, e elevado no mobile em rotas com barras/FABs fixos.
- Assistente de IA recebeu label acessivel no gatilho em modo icone, badge de modulo em portugues e botao de copiar com nome acessivel.
- Resultado do assistente de IA passou a quebrar conteudo longo sem overflow horizontal no popover.
- Botao icon-only de logout recebeu `aria-label`.
- Radix Select deixou de usar `SelectItem value=""` em `client/src`; foram usadas sentinelas explicitas.
- CTAs publicos foram convertidos para `Button asChild` para remover `Link/a` contendo `Button`.
- Paginas publicas/help/dashboard/checkout adicionais foram revisadas para remover `Link/a` contendo `Button`.
- Card publico de imovel passou a usar CTA visual nao interativo dentro do link do card.
- Lightbox, calendario, Kanban de leads, contratos, upload, cookies e tabela financeira receberam nomes acessiveis em botoes icon-only.
- Menus e botoes icon-only adicionais receberam nomes acessiveis; swatches de cor ganharam `aria-label` e `aria-pressed`.
- Botoes de senha sem nome acessivel foram corrigidos em auth e portal.
- Newsletter publica recebeu label/autocomplete.
- Hierarquia de heading de paginas auth foi corrigida.
- Reset password com token invalido agora mostra estado visivel.
- Vitrine publica `/e/:slug/imoveis` teve match de rota corrigido e links aninhados removidos.
- Drawer de filtros de `/vendas` passou a usar painel lateral responsivo valido.

### Build/performance

- Manual chunking do Vite agrupou primitives Radix de overlay em `vendor-ui-overlays`.
- Resultado: o build deixou de emitir alerta de chunk circular `vendor-ui-dropdown -> vendor-ui-misc -> vendor-ui-dropdown`.
- Risco residual: bundles grandes ainda existem, principalmente `vendor-charts`, `jspdf`, `html2canvas`, `vendor-react`, `product-landing` e shell principal.

## Testes adicionados ou reforcados

- `tests/unit/file-upload-entity-ownership-route.test.ts`
- `tests/unit/file-url-expiry-route.test.ts`
- `tests/unit/email-unsubscribe-route.test.ts`
- `tests/unit/immutable-payload-sanitization-source.test.ts`
- `tests/unit/ssrf-fetch-adoption-source.test.ts`
- `tests/unit/upload-hardening-source.test.ts`
- `tests/unit/whatsapp-webhook-ledger-source.test.ts`
- `tests/unit/deploy-workflow-policy.test.ts`
- `tests/unit/go-live-readiness-gate.test.ts`
- `tests/unit/feature-routes-signatures-tenant.test.ts`
- `tests/unit/server-utils.test.ts`

## Validacoes aprovadas

- `npm run check`: passou.
- `npm run check:scripts`: passou.
- `npm run lint -- --quiet`: passou.
- `npm run test`: 101 arquivos passaram; 1480 testes passaram, 1 ignorado.
- `npm run build`: passou; HTML estatico gerado para 11 rotas publicas.
- `npm run ops:go-live:verify:static`: passou, 13 checks.
- `npm run ops:cron:verify`: passou, 11 jobs alinhados com `vercel.json`.
- `bash -n scripts/deploy.sh && bash -n scripts/rollback.sh`: passou.
- `git diff --check`: passou.
- `rg -U "<Link...><Button|<Link...><button|<a...><Button" client/src`: 0 ocorrencias apos correcoes.
- `npx vitest run tests/unit/server-utils.test.ts`: 9 testes passaram.
- Testes focados finais de deploy/go-live/WhatsApp: 19 testes passaram.
- Testes focados de deploy/go-live: 13 testes passaram.
- Testes focados de upload/arquivo: 7 testes passaram.
- Testes focados pos-gate de deploy/upload/WhatsApp: 14 testes passaram.
- `npm run test:smoke:e2e`: 8 testes passaram em Chromium apos o pacote final de deploy/backend.
- Playwright manual focado:
  - rodada inicial: 64 combinacoes rota/viewport;
  - rodada apos correcoes: 24 combinacoes rota/viewport;
  - resultado final: 0 achado acionavel nas rotas revalidadas.

## Gates reprovados

### `npm run ops:go-live:verify:strict`

Falhou com 18 checks aprovados e 11 falhas.

Falhas observadas:

- `APP_URL` / `SITE_URL` / `VITE_APP_URL` ausente.
- `STRIPE_SECRET_KEY` ausente.
- `STRIPE_WEBHOOK_SECRET` ausente.
- `WHATSAPP_APP_SECRET` ausente.
- `WHATSAPP_VERIFY_TOKEN` ausente.
- Estrategia de backup nao configurada.
- Banco falhando autenticacao para usuario `postgres`.
- Backup readiness falhou por falta de backup duravel/PITR explicito.
- RLS runtime verification falhou por autenticacao do banco.
- Evidencia de restore drill ausente.
- Evidencia de pentest ausente.

### `npm run test:coverage:enterprise`

Falhou contra gate de 80%.

Resultado:

- Lines: 12,90%.
- Statements: 12,44%.
- Functions: 10,11%.
- Branches: 9,50%.

## Bloqueadores restantes

### CRITICO

- Aplicar e validar RLS em staging/producao com role runtime sem `BYPASSRLS`.
- Corrigir/configurar credenciais reais para passar `ops:go-live:verify:strict`.
- Validar banco real com migrations recentes aplicadas.
- Provar backup/PITR e restore drill com RPO/RTO.
- Executar pentest em staging/producao e anexar evidencia.

### ALTO

- Elevar cobertura enterprise para >= 80% ou registrar aceite formal de risco.
- Provar isolamento multi-tenant dinamico em staging/producao.
- Validar Redis real para 2FA/rate limit/crons/locks.
- Validar Stripe, Mercado Pago, ClickSign e WhatsApp webhooks em ambiente real.
- Reduzir bundles grandes e medir Lighthouse em ambiente proximo de producao.
- Reduzir warnings de lint por area.
- Fazer revisao visual autenticada completa com fixtures.

## Caminho objetivo para producao

1. Consolidar branch limpa e commit rastreavel.
2. Configurar ambiente staging/producao:
   - `APP_URL=https://imobibase.com.br`;
   - `DATABASE_URL` valido;
   - `REDIS_URL` valido;
   - `SESSION_SECRET` forte;
   - `CRON_SECRET` forte;
   - Stripe live keys;
   - WhatsApp app secret/verify token;
   - backup upload ou `BACKUP_OPTIONAL=true` + `SUPABASE_PITR_ENABLED=true`.
3. Aplicar migrations revisadas em staging/producao seguindo `docs/DEPLOYMENT_RUNBOOK.md`.
4. Rodar:
   - `npm run ops:go-live:verify:strict`;
   - `npm run db:rls:verify`;
   - `npm run ops:backup:verify`;
   - `npm run ops:restore:drill`;
   - `TEST_URL=<staging> npm run security:pentest`;
   - smoke E2E em staging.
5. Elevar cobertura enterprise ou aprovar risco formalmente.
6. Fazer deploy apenas quando os gates acima estiverem verdes no commit de release.

## Decisao de deploy

Deploy de producao nao deve ser executado neste estado.

Motivo: os gates locais melhoraram e varias pendencias locais foram fechadas, mas as provas obrigatorias de ambiente real ainda falham ou nao existem.

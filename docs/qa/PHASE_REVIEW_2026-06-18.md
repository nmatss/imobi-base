# Revisao por fase - 18/06/2026

## Objetivo

Revisar a memoria/documentacao, identificar onde o trabalho parou, fechar pendencias locais de maior impacto e executar uma revisao forte de seguranca, layout, paginas e formularios.

## Escopo revisado

- Memoria e governanca: `docs/PROJECT_MEMORY.md`, `docs/SESSION_MEMORY.md`, `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, `docs/TECH_DEBT.md`, `docs/qa/GO_LIVE_SCORECARD_2026-06-17.md`.
- Backend/seguranca: ClickSign, backup, restore drill, WhatsApp, integracoes, URL privada de arquivos, unsubscribe e assinatura digital publica.
- Frontend/formularios: paginas publicas, auth, portal, filtros/formularios com Radix Select e drawer de vendas.
- QA visual: rotas publicas/auth/portal em 320px, 390px, 768px e 1280px.
- QA automatizado: TypeScript, Vitest completo, build, smoke E2E, lint.

## Fase 1 - Memoria e pendencias

Evidencia consultada:

- `docs/PROJECT_MEMORY.md`
- `docs/SESSION_MEMORY.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/TECH_DEBT.md`
- `docs/qa/GO_LIVE_SCORECARD_2026-06-17.md`

Conclusao:

- O score documentado antes da rodada era 79/100.
- As pendencias bloqueantes seguem dependentes de staging/producao: RLS real, gate strict, restore drill real, pentest, Redis/crons reais, cobertura 80% e validacao operacional.
- Havia pendencias locais fechaveis em seguranca de fetch externo, payloads imutaveis, testes comportamentais, formularios e hidratacao/layout publico.

## Fase 2 - Seguranca backend

Correcoes aplicadas:

- `server/integrations/clicksign/document-service.ts`: downloads de documentos ClickSign passaram a usar `fetchExternalUrl`.
- `server/jobs/processors/backup-processor.ts`: upload duravel por URL pre-assinada passou a usar `fetchExternalUrl`.
- `script/restore-drill.ts`: download remoto de backup passou a usar `fetchExternalUrl`.
- `server/routes-whatsapp.ts`: payloads de templates/auto-respostas removem campos imutaveis enviados pelo cliente e aplicam `tenantId` autenticado por ultimo.
- `server/integrations/whatsapp/template-manager.ts`: updates removem campos imutaveis.
- `server/integrations/whatsapp/auto-responder.ts`: create/update removem campos imutaveis.
- `server/storage.ts`: configuracoes de integracao ignoram `id`, `tenantId`, `integrationName`, `createdAt` e `updatedAt` vindos de payload externo.

Testes adicionados/ajustados:

- `tests/unit/ssrf-fetch-adoption-source.test.ts`
- `tests/unit/immutable-payload-sanitization-source.test.ts`
- `tests/unit/file-url-expiry-route.test.ts`
- `tests/unit/email-unsubscribe-route.test.ts`
- `tests/unit/feature-routes-signatures-tenant.test.ts`

Risco reduzido:

- SSRF em fluxos operacionais de documento/backup/restore.
- Cross-tenant overwrite por payload malicioso em WhatsApp/integracoes.
- URL privada de arquivo com expiracao fora de limite.
- Uso de token legado sem assinatura no unsubscribe.
- Lookup publico de assinatura vencida ou sem validacao correta.

## Fase 3 - Formularios, paginas e layout

Correcoes aplicadas:

- Removidos todos os `SelectItem value=""` em `client/src`; foram usadas sentinelas `__all__` e `__none__`.
- `client/src/pages/auth/signup.tsx`: hierarquia de heading ajustada, email/password com autocomplete, botao de senha nomeado.
- `client/src/pages/auth/ResetPassword.tsx`: token invalido agora mostra estado visivel com `h1` e acao de novo link.
- `client/src/pages/auth/ForgotPassword.tsx` e `client/src/pages/auth/VerifyEmail.tsx`: headings principais corrigidos.
- `client/src/pages/portal/portal-login.tsx` e `client/src/pages/portal/reset-password.tsx`: botoes de senha nomeados.
- `client/src/pages/public/landing.tsx` e `client/src/pages/public/product-landing.tsx`: newsletter com label/autocomplete e botoes nomeados.
- `client/src/pages/public/properties.tsx`: match de rota `/e/:slug/imoveis` corrigido e links aninhados removidos.
- `client/src/pages/public/pricing.tsx`: switch de cobranca anual nomeado.
- `client/src/pages/vendas/index.tsx`: drawer de filtros trocou classe inexistente `sm:side-right` por painel lateral responsivo.

Varreduras estaticas:

- `rg -n 'SelectItem value=""' client/src -g '*.tsx'`: sem resultados apos correcoes.
- Busca de `Link`/`Button` aninhados nas paginas publicas principais: sem resultados apos correcoes.

## Fase 4 - Revisao Playwright

Rodada inicial:

- 64 combinacoes rota/viewport.
- Viewports: 320x720, 390x844, 768x1024, 1280x900.
- Achados acionaveis:
  - `/auth/reset-password?token=test` ficava em branco apos token invalido.
  - `/e/sol/imoveis` emitia erro de hidratacao por `<a>` dentro de `<a>`.

Rodada apos correcoes:

- 24 combinacoes rota/viewport.
- Rotas: `/auth/reset-password?token=test`, `/e/sol/imoveis`, `/e/sol`, `/pricing`, `/signup`, `/portal/login`.
- Resultado: 0 achado acionavel.

Observacao:

- Erros 400/401 esperados foram ignorados apenas quando eram resposta normal de token invalido ou checagem de autenticacao.
- Rotas internas sem sessao (`/vendas`, `/calendar`, `/contracts`, `/leads`, `/rentals`, `/financeiro`) redirecionaram para `/login`; ainda e necessaria revisao visual autenticada com fixtures.

## Fase 5 - Validacoes automatizadas

Comandos executados:

- `npm run check`: passou.
- `npx vitest run tests/unit/immutable-payload-sanitization-source.test.ts tests/unit/ssrf-fetch-adoption-source.test.ts tests/integration/security/ssrf-protection.test.ts tests/unit/backup-pitr-readiness.test.ts tests/unit/file-url-expiry-route.test.ts tests/unit/email-unsubscribe-route.test.ts tests/unit/feature-routes-signatures-tenant.test.ts --reporter=verbose`: 65 testes passaram.
- `npm run test`: 99 arquivos passaram; 1462 testes passaram, 1 ignorado.
- `npm run build`: passou; HTML estatico gerado para 11 rotas publicas.
- `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
- `npm run lint`: passou com 0 erros e 5179 warnings.

## Pendencias que impedem declarar 100% enterprise

Criticas/altas:

- RLS precisa ser aplicado e validado em staging/producao com role runtime sem `BYPASSRLS`.
- `npm run ops:go-live:verify:strict` precisa rodar contra staging/producao com evidencias reais.
- Restore drill real precisa registrar RPO/RTO.
- Pentest externo/manual ainda e necessario.
- Redis/crons/locks precisam de validacao no deploy real.
- Coverage precisa subir para >= 80%.
- Lint ainda tem 5179 warnings.
- WhatsApp `phoneNumberId` precisa de auditoria de unicidade/roteamento por tenant.
- Upload generico/documentos precisa validar ownership de `entityType`/`entityId`.
- Rotas internas precisam de revisao visual autenticada com fixtures.
- Build ainda mostra chunks grandes: `vendor-charts`, `jspdf`, shell principal e `product-landing`.

## Conclusao

A rodada fechou pendencias locais relevantes de seguranca, formularios, layout publico e testes. O estado local ficou mais robusto e validado por TypeScript, Vitest completo, build, smoke E2E, lint e Playwright manual focado.

Ainda nao e correto declarar 100% enterprise/go-live porque parte essencial da prova depende de staging/producao real e de evidencias operacionais fora do workspace local.

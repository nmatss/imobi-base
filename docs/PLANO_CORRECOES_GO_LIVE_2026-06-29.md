# Plano de Correcoes Go-Live - ImobiBase

Data: 2026-06-29  
Fonte: `docs/reports/REVISAO_GO_LIVE_COMPLETA_2026-06-29.md`  
Status: em execucao - Etapa 0 local concluida parcialmente

## Objetivo

Levar o ImobiBase de **NO-GO enterprise** para um release candidate com evidencias reais, corrigindo primeiro riscos que podem comprometer isolamento multi-tenant, seguranca, operacao e experiencia core.

## Etapa 0 - Bloqueadores P0 locais

Meta: corrigir pontos que podem impedir ou tornar insegura a validacao em staging.

Status em 2026-06-29: **codigo local concluido para os itens implementaveis sem ambiente real**.

1. Pendente do dono/ambiente: remover/rotacionar secrets locais fora do codigo.
2. Concluido: expandir `db:rls:verify` para validar `RLS_enable_child_tables.sql`.
3. Concluido: ajustar assinatura publica por token para funcionar sob RLS de child tables.
4. Concluido: criptografar tokens OAuth Microsoft em repouso para novos logins.
5. Concluido: criar script dry-run/apply para criptografar tokens Microsoft legados.
6. Concluido: tornar Redis/TLS/fail-open uma politica bloqueante de producao.
7. Concluido: revisar ao fim com testes focados, `check`, `lint -- --quiet`, `ops:go-live:verify:static`.

DoD:

- Verificador RLS contempla parent + child tables.
- Fluxo publico de assinatura nao acessa `digital_signatures` fora do contexto RLS correto.
- Microsoft OAuth nao grava access/refresh token puro quando `ENCRYPTION_KEY` existe.
- Produção falha fechado quando Redis configurado estiver inseguro/indisponivel para gates sensiveis.
- Documentacao de pendencias reflete o que foi corrigido e o que segue owner-gated.

### Revisao da Etapa 0 - 2026-06-29

Arquivos alterados:

- `script/verify-rls.ts`: verifica migrations RLS parent + child e registros em `_migrations`.
- `migrations/RLS_enable_child_tables.sql`: adiciona policies publicas estreitas `SELECT`/`UPDATE` por `app.digital_signature_token` para `digital_signatures`.
- `server/routes-features.ts`: acessos publicos de assinatura usam contexto RLS por token; leitura de assinaturas irmas e update de contrato usam tenant derivado do contrato validado.
- `server/auth/oauth-microsoft.ts`: persiste tokens via `encryptSecret`.
- `script/encrypt-microsoft-oauth-tokens.ts`: script idempotente dry-run por padrao, `--apply` explicito, para tokens Microsoft legados.
- `script/verify-go-live-readiness.ts`: exige Redis TLS (`rediss://`) no gate.
- `server/routes.ts`: rate limit nao faz fail-open em producao quando store Redis falha.
- `server/routes-security.ts`: 2FA falha fechado em producao quando Redis configurado falha.
- Testes unitarios fonte atualizados para travar as garantias.

Validacoes:

- `npx vitest run tests/unit/rls-migration-parity.test.ts tests/unit/auth-rls-context.test.ts tests/unit/oauth-tenant-safety.test.ts tests/unit/feature-routes-signatures-tenant.test.ts tests/unit/go-live-readiness-gate.test.ts --reporter=verbose`: 34 testes passaram.
- `npx vitest run tests/unit/oauth-tenant-safety.test.ts tests/unit/token-encryption.test.ts --reporter=verbose`: 10 testes passaram.
- `npm run check:scripts`: passou.
- `npm run check`: passou.
- `npm run lint -- --quiet`: passou.
- `npm run ops:go-live:verify:static`: passou, 13 checks.

Pendencias antes da Etapa 1:

- Remover e rotacionar secrets reais encontrados em `.env.production` local. Esta acao nao foi executada automaticamente para nao apagar configuracao local sem aprovacao explicita.
- Garantir `ENCRYPTION_KEY` forte em staging/producao antes de rodar `ops:oauth:encrypt-microsoft-tokens -- --apply`.
- Configurar `REDIS_URL` como `rediss://...` em staging/producao.

## Etapa 1 - Staging real e evidencias

Meta: provar ambiente antes de qualquer producao.

1. Configurar envs reais no Vercel/GitHub Secrets.
2. Aplicar migrations revisadas em staging.
3. Rodar `npm run db:rls:verify`.
4. Rodar `npm run ops:go-live:verify:strict`.
5. Rodar `npm run ops:backup:verify`.
6. Rodar `npm run ops:restore:drill`.
7. Rodar `TEST_URL=<staging> npm run security:pentest`.
8. Provar IDOR negativo cross-tenant.
9. Revisar ao fim: anexar evidencias e atualizar `KNOWN_ISSUES`.

DoD:

- Gate strict verde em staging.
- Restore drill registrado com RPO/RTO.
- Pentest sem CRITICO/ALTO aberto.
- RLS prova 0 linhas sem contexto e isolamento entre tenants.

## Etapa 2 - UX/UI/QA pre-release

Meta: remover friccoes e lacunas visiveis em fluxos core.

1. Unificar busca global e atalho `Ctrl/Cmd+K`.
2. Trocar `div role=button/link` por elementos nativos.
3. Corrigir breadcrumb atual.
4. Substituir `prompt()` por dialogs do design system.
5. Corrigir rotas driftadas do Playwright.
6. Reativar smoke autenticado com fixtures.
7. Revisar ao fim: Playwright em desktop/mobile e axe nos fluxos principais.

DoD:

- Sem controles interativos nao semanticos nos fluxos auditados.
- Playwright cobre rotas reais.
- Smoke autenticado passa com fixtures.

## Etapa 3 - Performance e escalabilidade

Meta: reduzir risco de LCP ruim e lentidao em tenants grandes.

1. Lazy-load de charts/PDF/html2canvas.
2. Medir Lighthouse em staging.
3. Migrar relatorios com N+1/agregacao em memoria para SQL/views.
4. Validar Redis real em hot paths.
5. Avaliar co-localizacao Vercel/Supabase/Redis.
6. Revisar ao fim: p95, LCP e bundle report.

DoD:

- Lighthouse mobile publico >= 85 ou risco formal aceito.
- P95 dos endpoints core medido.
- Relatorios principais sem N+1 critico.

## Etapa 4 - Produto e integracoes

Meta: liberar features prometidas com prova operacional.

1. Google SSO/Calendar/Meet: Google Console, redirects, envs e verificacao do app.
2. Stripe/Mercado Pago/ClickSign/WhatsApp: webhooks reais com ledger validado.
3. Portal comprador e IA acionavel: staging completo com auditoria.
4. Assinatura digital: definir claim juridico permitido.
5. Revisar ao fim: matriz de features por plano e riscos comerciais.

DoD:

- Integracoes reais validadas em staging.
- Feature flags e limites por plano testados.
- Claims comerciais alinhados ao que o sistema prova.

## Etapa 5 - Release candidate

Meta: decidir go/no-go com evidencias.

1. Rodada final `check`, `lint`, `test`, `build`, smoke E2E.
2. Gate strict contra producao.
3. Checklist go-live completo.
4. Plano de rollback testado.
5. Aprovar risco residual de cobertura se ainda abaixo de 80%.

DoD:

- `ops:go-live:verify:strict` verde.
- Sem CRITICO/ALTO aberto.
- Evidencias anexadas nos docs.
- Decisao formal de release registrada.

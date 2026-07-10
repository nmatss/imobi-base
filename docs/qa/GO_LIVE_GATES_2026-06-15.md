# Go-Live Gates — 2026-06-15

## Status executivo

O sistema avançou para um estado mais forte de pré-go-live. O principal bloqueio
técnico anterior, cobertura runtime de RLS para fluxos sem sessão, foi tratado
em código e testes. Ainda não deve receber "GO LIVE ENTERPRISE" definitivo sem
validação de RLS em Postgres real/staging, coverage formal, pentest e checklist
operacional de produção.

Gates bloqueantes atuais:

| Gate | Status | Evidência |
| --- | --- | --- |
| Build | Passou | `npm run build` |
| Typecheck | Passou | `npm run check` |
| Testes unit/integration | Passou | `npm run test -- --maxWorkers=1 --silent` — 76 arquivos, 1365 passed, 1 skipped |
| Smoke E2E | Passou | `npm run test:smoke:e2e` — 8 passed em Chromium, 1 worker |
| Audit moderate/high/critical | Passou | `npm audit --audit-level=moderate` |
| ESLint errors | Passou | `npm run lint -- --quiet` |
| ESLint warnings | P2 | 5165 warnings em 555 arquivos |
| RLS migration parity | Passou | `tests/unit/rls-migration-parity.test.ts` |
| RLS runtime context | Passou em código/testes; pendente staging real | `server/db-rls.ts`, `server/db.ts`, `server/middleware/auth.ts`, auth/OAuth/webhooks/rotas públicas |
| Coverage enterprise 80% | Falhou | `npm run test:coverage:check -- 80` |
| Pentest final | Pendente | execução externa ainda não realizada |

## RLS

### Fatos comprovados

- `migrations/RLS_enable.sql` cobre 56/56 tabelas com `tenant_id` presentes em
  `shared/schema.ts`.
- Todas as 56 tabelas cobertas recebem `ENABLE ROW LEVEL SECURITY`,
  `FORCE ROW LEVEL SECURITY` e policy `tenant_isolation`.
- As 7 tabelas com `tenant_id` nullable permitem `tenant_id IS NULL`:
  `newsletter_subscriptions`, `usage_logs`, `user_sessions`, `user_consents`,
  `compliance_audit_log`, `cookie_preferences`, `webhook_events`.
- `npm run db:migrate` não aplica `RLS_enable.sql` por padrão.
- A aplicação explícita deve ser feita com `npm run db:rls:apply`.
- `server/db-rls.ts` implementa contexto RLS com `AsyncLocalStorage` e aplica
  `select set_config('app.tenant_id', $1, true)` dentro de transações locais.
- `server/db.ts` instala o patch no pool Postgres.
- `server/middleware/auth.ts` e o `requireAuth` local de `server/routes.ts`
  ativam o contexto para rotas autenticadas com `req.user.tenantId`.
- Middlewares locais em `server/routes-features.ts`, `server/routes-files.ts`,
  `server/routes-isa.ts`, `server/routes-security.ts` e
  `server/auth/session-manager.ts` também ativam `runWithTenantRlsContext`.
- `tests/unit/db-rls-context.test.ts` cobre os caminhos `Pool.query`,
  rollback e transação explícita via `Pool.connect()`.
- Login, registro e OAuth usam contexto por email (`app.auth_email`) e depois
  contexto do tenant real.
- Reset de senha e verificação de email usam contextos por hash de token.
- Webhooks Stripe/MercadoPago/WhatsApp/ClickSign passam a executar operações
  tenant-aware dentro de contexto RLS após validação/derivação do tenant.
- Rotas públicas de imóveis, leads, comparação e assinatura por token usam
  contextos públicos estreitos em vez de bypass genérico.

### Lacuna para go-live

RLS está pronto para validação de staging, mas ainda não está comprovado contra
Postgres real com role de aplicação sem ownership/BYPASSRLS. Também falta
decisão operacional para rotas `super_admin`/cross-tenant: a policy atual não
abre bypass genérico, o que é seguro por padrão, mas limita consultas globais
que um backoffice de plataforma possa precisar.

### Backlog P1

1. Aplicar `npm run db:rls:apply` em staging com role de aplicação comum e
   executar smoke + testes manuais de isolamento A/B.
2. Definir estratégia `super_admin`/cross-tenant sem abrir bypass genérico para
   usuários comuns.
3. Criar teste de integração RLS com Postgres real/Supabase para comprovar
   `current_setting(...)` e policies com `FORCE ROW LEVEL SECURITY`.

Rollback:

- Não aplicar `npm run db:rls:apply` até os itens acima passarem em staging.
- Se aplicado e houver indisponibilidade: executar `ALTER TABLE ... DISABLE ROW
  LEVEL SECURITY` nas tabelas listadas em `migrations/RLS_enable.sql`.

## Coverage

Comando executado:

```bash
npm run test:coverage -- --maxWorkers=1 --silent
npm run test:coverage:check -- 80
```

Resultado atual:

| Métrica | Atual | Meta |
| --- | ---: | ---: |
| Lines | 11.52% | 80% |
| Statements | 11.11% | 80% |
| Functions | 8.85% | 80% |
| Branches | 8.20% | 80% |

Observação: `client/src/pages/public/product-landing.tsx` foi excluído
explicitamente do V8 coverage em `vitest.config.ts`, pois o remapeamento do V8
coverage/Rollup não parseia essa página TSX grande quando ela está uncovered.
Ela deve permanecer coberta por smoke/E2E até a troca/correção do tooling de
coverage.

### Backlog P1/P2

P1:

- Cobrir fluxos backend críticos: autenticação, tenant isolation, pagamentos,
  e-signature, webhooks, LGPD, file upload e rotas públicas.
- Criar testes de integração para RLS em staging com Postgres real.

P2:

- Cobrir páginas e componentes principais de frontend: login, dashboard,
  imóveis, leads, contratos, pagamentos, portal e configurações.
- Reduzir mocks excessivos onde eles não provam contratos reais.

## Lint warnings

Comandos executados:

```bash
npm run lint -- --quiet
npm run lint -- --format json --output-file /tmp/imobibase-eslint.json
```

Resultado atual:

| Métrica | Atual | Severidade |
| --- | ---: | --- |
| Errors | 0 | Gate passou |
| Warnings | 5165 | P2 |
| Arquivos com mensagens | 555 | P2 |

Backlog P2:

- reduzir warnings por domínio, priorizando `any`, promises sem tratamento,
  casts inseguros e variáveis não utilizadas em rotas/backend;
- adicionar `--max-warnings=0` apenas depois de zerar o legado para não bloquear
  correções críticas atuais com dívida histórica.

## Pentest

Status: pendente.

Escopo mínimo antes de go-live:

- OWASP Top 10;
- IDOR/Broken Access Control;
- CSRF;
- SSRF;
- XSS;
- SQL Injection;
- File Upload;
- JWT/OAuth/session fixation;
- Rate limit;
- webhooks assinados;
- tenant isolation multi-tenant.

Ferramentas sugeridas:

- Burp Suite;
- OWASP ZAP;
- Nuclei;
- Semgrep.

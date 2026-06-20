# Roadmap Enterprise - ImobiBase

Atualizado em: 18/06/2026

## P0 - Enterprise readiness

- Concluido:
  - RLS preparado no runtime (`server/db-rls.ts`), migration explicita (`migrations/RLS_enable.sql`) e runbook (`docs/RLS_RUNBOOK.md`).
  - Verificador RLS `npm run db:rls:verify` adicionado para role runtime, `BYPASSRLS`, owner, `ENABLE/FORCE` e policies.
  - `npm audit --json` sem vulnerabilidades reportadas em 17/06/2026.
  - CORS padronizado entre serverless e Express via `server/config/cors.ts`.
  - Wrapper serverless `api/index.mjs` deixou de expor erro interno/stack em producao.
  - Manifesto unico de crons (`server/jobs/cron-manifest.ts`) alinhado com `vercel.json`, status HTTP e fallback `node-cron`.
  - Crons HTTP possuem lock distribuido via Redis e status de ultima execucao em `/api/cron/status`.
  - Backup diario voltou ao `vercel.json` e `npm run ops:cron:verify` valida divergencias.
  - Backup aceita upload duravel por `BACKUP_UPLOAD_URL_TEMPLATE`; quando Supabase PITR e a estrategia oficial, `BACKUP_OPTIONAL=true` + `SUPABASE_PITR_ENABLED=true` evitam `pg_dump` no serverless; `npm run ops:backup:verify` valida prontidao.
  - Restore drill seguro adicionado em `npm run ops:restore:drill`.
  - Pentest automatico exposto em `npm run security:pentest`.
  - Ledger persistente `webhook_events` criado para idempotencia de webhooks criticos.
  - Webhooks Stripe, Mercado Pago e ClickSign migrados para ledger persistente.
  - ClickSign valida HMAC sobre `rawBody` com comparacao timing-safe.
  - IPN legado do Mercado Pago e webhook legado da ISA ficaram desabilitados por padrao.
  - Handler serverless registra `cookie-parser`, preservando CSRF/portal por cookie em Vercel.
  - Workflow de producao deixou de rodar `npm run db:migrate` cego apos deploy e passou a validar manifesto de crons.
  - Artefatos Playwright (`test-results/`, `playwright-report/`) foram removidos do versionamento e ignorados.
  - Vistorias validam `propertyId`, `rentalContractId` e `renterId` contra o tenant antes de criar relatorio/registro.
  - Setup TOTP gera QR Code localmente com `qrcode`, sem vazar `otpauth://...secret=...` para API externa.
  - FK ownership cross-tenant reforcado em contratos, locacoes, pagamentos, repasses, propostas, vendas, lancamentos financeiros e AVM.
  - Guard anti-SSRF central passou a resolver DNS, bloquear IPs privados em respostas DNS e controlar redirects manualmente antes de `fetch`.
  - Security webhooks e WhatsApp passaram a usar o fetch externo seguro; WhatsApp media URL tambem resolve DNS antes de enfileirar.
  - Upload de imagens de imovel passou a limitar 10 arquivos de ate 10MB, teto de lote de 50MB e validacao de tenant do `propertyId`.
  - Rate limit/lockout de 2FA passou a usar Redis quando `REDIS_URL` existe, mantendo fallback local apenas para dev/test ou indisponibilidade explicita.
  - Webhook oficial do WhatsApp passou a reservar/processar/falhar changes no ledger persistente `webhook_events`.
  - Gate unificado `npm run ops:go-live:verify` criado; workflow de producao agora usa `ops:go-live:verify:strict` antes do deploy para exigir Redis, DB, RLS, backup, restore drill e pentest.
  - Unsubscribe publico passou a persistir opt-out real em `newsletter_subscriptions`, bloquear reativacao silenciosa e filtrar bulk email para destinatarios descadastrados.
  - Unsubscribe público passou a exigir token assinado (legacy sem assinatura removido).
  - Assinatura digital pública passou a recusar tokens vencidos antes de carregar contrato ou marcar `viewedAt`.
  - URL de arquivo privado passou a limitar `expiresIn` a 60s-3600s.
  - ClickSign document downloads, backup duravel e restore drill remoto passaram a usar `fetchExternalUrl`.
  - WhatsApp templates/auto-responses e configuracoes de integracao passaram a sanitizar campos imutaveis de payload externo.
  - Formularios/filtros Radix Select foram corrigidos para nao usar `SelectItem value=""`.
  - Revisao Playwright publica/auth/portal corrigiu hidratacao da vitrine publica, reset invalido em branco, botoes de senha sem nome e labels de newsletter.
  - Deploy manual de producao (`scripts/deploy.sh`) passou a executar `check:scripts`, lint sem erros e `ops:go-live:verify:strict` antes de publicar; health/URL de producao foram alinhados para `imobibase.com.br` e push de tag passou a exigir `PUSH_RELEASE_TAG=true`.
  - Deploy manual de Vercel passou a usar prebuilt artifacts (`vercel build` + `vercel deploy --prebuilt`) e a bloquear execucao sem target real de deploy.
  - Migrations automaticas em producao foram desabilitadas no script manual de deploy.
  - Rollback manual passou a usar health/URL canonica `imobibase.com.br`, exigir deployment URL/ID explicito no Vercel e evitar fallback por `git checkout`.
  - Upload generico/documentos passou a validar ownership de `entityType`/`entityId` antes de fazer upload ou gravar metadados, com teste comportamental cross-tenant.
  - Resolucao de tenant do webhook WhatsApp por `phoneNumberId` passou a normalizar valores e falhar fechado quando houver duplicidade entre tenants.
  - Migration `20260618_001_whatsapp_phone_number_unique.sql` passou a impedir `phoneNumberId` WhatsApp duplicado entre tenants configurados.
  - Gate strict passou a validar RLS de `webhook_events`, campos/indice de opt-out persistente, tabela `_migrations` e registros das migrations criticas quando conectado ao banco real.
  - Build Vite deixou de emitir alerta de chunk circular ao agrupar overlays Radix em `vendor-ui-overlays`.
- Em aberto:
  - Executar RLS apply/verify em staging/producao com role nao-owner e sem `BYPASSRLS`.
  - Aplicar e validar migration `20260617_001_webhook_events.sql` em staging/producao.
  - Aplicar e validar migration `20260617_002_newsletter_opt_out.sql` em staging/producao.
  - Provar dinamicamente isolamento multi-tenant das rotas com FK ownership em staging/producao.
  - Validar anti-SSRF/upload em staging/producao e executar pentest externo/manual.
  - Evoluir upload de imagens para streaming/upload assinado para maturidade 10/10.
  - Validar Redis real para rate limit/lockout de 2FA no deploy serverless.
  - Elevar cobertura de testes de 12,44% statements / 12,90% lines para >= 80%.
  - Reduzir 5180 warnings de lint medidos em 18/06/2026 e instituir ratchet por area.
  - Executar restore drill contra banco isolado real e registrar RPO/RTO.
  - Validar locks/status de cron no deploy real com `REDIS_URL` e `CRON_SECRET`.
  - Executar pentest externo/manual antes de venda enterprise.
  - Rodar `npm run ops:go-live:verify:strict` contra staging/producao com evidencias reais.
  - Resolver latencia de producao por co-localizacao de banco/cache ou ajuste de deploy.
  - Validar visualmente rotas autenticadas com sessao/fixtures dedicadas em 320px, 390px, 768px e desktop; a varredura manual sem sessao redirecionou essas rotas para `/login`.
  - Provar em staging/producao que duplicidade de `phoneNumberId` do WhatsApp falha fechado e que configuracoes reais nao possuem duplicatas.
  - Provar em staging/producao ownership de `entityType`/`entityId` em uploads genericos/documentos.

## P1 - Produto competitivo

- Agenda de visitas completa:
  - concluido: disponibilidade inicial de corretor por conflito de agenda no servidor;
  - concluido: conflito de horario por imovel e corretor em janela de 60 minutos;
  - concluido: validacao de tenant para imovel, lead e corretor vinculados a visita;
  - concluido: ISA WhatsApp passou a usar a mesma politica central de agendamento;
  - CODIGO CONCLUIDO 2026-06-20 (pendente validacao em staging): confirmacao/remarcacao por token (WhatsApp+email), cron de lembretes (visit-reminders), ficha (checklist), feedback pos-visita e proxima acao no funil. Ver docs/reports/P1_FEATURES_2026-06-20.md;
  - confirmacao/remarcacao por WhatsApp e email;
  - lembretes;
  - ficha de visita;
  - feedback pos-visita;
  - proxima acao no funil.
- CRM com SLA:
  - concluido: resumo backend de primeiro atendimento, lead parado, prioridade e proxima acao;
  - concluido: Kanban exibe alertas de SLA por filtros visiveis;
  - concluido: interacoes atualizam `updatedAt` do lead;
  - concluido: validacao de tenant para `assignedTo` em leads e follow-ups;
  - concluido: contrato API/UI do score de oportunidade alinhado em `/api/leads/:leadId/score/calculate`, com metadata `calculatedAt`/`trend` e estado vazio quando nao calculado;
  - CODIGO CONCLUIDO 2026-06-20 (pendente validacao em staging): deduplicacao persistente (indices unicos parciais + 409 em POST /api/leads), roleta/distribuicao round-robin/least-loaded, score com pesos por tenant (lead_score_weights) mantendo o contrato atual como default. Ver docs/reports/P1_FEATURES_2026-06-20.md;
  - deduplicacao;
  - roleta/distribuicao;
  - score de oportunidade avançado com pesos configuraveis por tenant.
- IA acionavel:
  - CODIGO CONCLUIDO 2026-06-20 (pendente validacao em staging): ai_actions + ai_action_audit (append-only), registry/planner/executor com aprovacao humana para mover etapa/reativar contatos, idempotencia e auditoria before/after; rotas e UI AIActionReview. Ver docs/reports/P1_FEATURES_2026-06-20.md;
  - qualificar lead;
  - sugerir imoveis;
  - criar follow-up;
  - registrar resumo;
  - mover etapa com aprovacao;
  - reativar contatos.
- Portal de atendimento:
  - CODIGO CONCLUIDO 2026-06-20 (pendente validacao em staging): buyer_selections, rotas publicas por token (/s/:token) sem vazar PII, aceite/recusa/comentario, agendamento de visita, tudo gravando no CRM; rotas admin tenant-scoped. Ver docs/reports/P1_FEATURES_2026-06-20.md;
  - link com imoveis selecionados;
  - cliente aceita/recusa/comenta;
  - agenda visita;
  - tudo registrado no CRM.

## P2 - Crescimento e aquisicao

- Expandir paginas SEO por intencao.
- Concluido: HTML estatico por rota publica conhecida com title, description, canonical, OG/Twitter e JSON-LD.
- Concluido: sitemap estatico gerado em build a partir do manifesto publico.
- Concluido: `/sitemap-dynamic.xml` roteado para o backend e anunciado em `robots.txt`.
- Validar `/sitemap-dynamic.xml` no deploy Vercel real.
- Criar comparativos e guias educativos.
- Criar paginas dinamicas locais por cidade, bairro, tipo, finalidade e condominio.
- Criar hub de recursos com FAQ, tabelas e dados estruturados.
- Melhorar performance da landing ate LCP abaixo de 2,5s em ambiente real.

## P3 - Expansao

- Avaliar app nativo vs PWA aprimorado.
- Criar vertical de incorporadoras, se fizer sentido comercial.
- Preparar internacionalizacao para LATAM.
- Criar casos de sucesso, videos e onboarding guiado.

# Roadmap Enterprise - ImobiBase

Atualizado em: 17/06/2026

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
- Em aberto:
  - Executar RLS apply/verify em staging/producao com role nao-owner e sem `BYPASSRLS`.
  - Aplicar e validar migration `20260617_001_webhook_events.sql` em staging/producao.
  - Estender ledger persistente para webhook oficial do WhatsApp.
  - Provar dinamicamente isolamento multi-tenant das rotas com FK ownership em staging/producao.
  - Validar anti-SSRF/upload em staging/producao e executar pentest externo/manual.
  - Evoluir upload de imagens para streaming/upload assinado para maturidade 10/10.
  - Persistir/distribuir rate limit e lockout de 2FA para ambiente serverless.
  - Elevar cobertura de testes de 11,1% statements para >= 80%.
  - Reduzir 5166 warnings de lint.
  - Executar restore drill contra banco isolado real e registrar RPO/RTO.
  - Validar locks/status de cron no deploy real com `REDIS_URL` e `CRON_SECRET`.
  - Executar pentest externo/manual antes de venda enterprise.
  - Resolver latencia de producao por co-localizacao de banco/cache ou ajuste de deploy.

## P1 - Produto competitivo

- Agenda de visitas completa:
  - concluido: disponibilidade inicial de corretor por conflito de agenda no servidor;
  - concluido: conflito de horario por imovel e corretor em janela de 60 minutos;
  - concluido: validacao de tenant para imovel, lead e corretor vinculados a visita;
  - concluido: ISA WhatsApp passou a usar a mesma politica central de agendamento;
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
  - deduplicacao;
  - roleta/distribuicao;
  - score de oportunidade.
- IA acionavel:
  - qualificar lead;
  - sugerir imoveis;
  - criar follow-up;
  - registrar resumo;
  - mover etapa com aprovacao;
  - reativar contatos.
- Portal de atendimento:
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

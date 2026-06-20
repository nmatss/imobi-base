# Technical Debt

Atualizado em: 20/06/2026

## Features P1 2026-06-20 (premissas a revisar)

- `getActiveBrokers` define corretor "ativo" por role (broker/agent/corretor/admin/manager/owner) porque nao existe coluna `isActive` em `users`. Se houver outra definicao de corretor ativo, ajustar.
- `lead-intake.applyLeadDedupAndAssign` persiste phone/email NORMALIZADOS no lead para cair no mesmo bucket do indice unico parcial; qualquer fluxo de escrita de lead que burle esse helper pode criar divergencia entre app e indice. Manter a normalizacao identica ao `regexp_replace(phone, '\\D', '', 'g')` da migration.
- O `calculateLeadScore` legado em `routes-features.ts` NAO foi trocado pelo `lead-score-weighted.ts` (conservador; ha commit recente alinhando contrato). O caminho ponderado por tenant existe via as novas rotas `/api/settings/lead-score-weights`. Decidir migracao do call-site quando seguro.
- IA acionavel: definir feature flag por plano (`ai_actions`) e limite/custo do planner por tenant (rate-limit atual e in-memory, nao persiste entre instancias serverless).
- `ai_action_audit` e append-only por convencao (sem trigger no Postgres); nao expor metodos de update/delete no storage.

## Frontend

- Reduzir JavaScript inicial da home.
- Avaliar lazy-load ou reducao de Framer Motion acima da dobra.
- Revisar fontes externas e considerar self-host.
- Expandir pipeline automatico de imagens AVIF/WebP para todas as imagens publicas.
- Manter checks mobile em 320px, 390px, 768px e desktop.
- Estender prerender/HTML estatico para vitrines dinamicas de tenant/imovel/cidade/bairro; rotas publicas conhecidas ja sao geradas no build.
- Trocar hero remoto das paginas de solucao por asset local responsivo com dimensoes declaradas.
- Manter sentinelas explicitas (`__all__`, `__none__`) em Radix Select; nao reintroduzir `SelectItem value=""`.
- Expandir revisao visual autenticada com fixtures para `/vendas`, `/calendar`, `/contracts`, `/leads`, `/rentals`, `/financeiro`, admin e configuracoes.
- Reduzir chunks grandes apontados no build de 18/06/2026: `vendor-charts`, `jspdf`, `html2canvas`, `vendor-react`, shell principal e `product-landing`. O alerta de chunk circular Radix foi resolvido com `vendor-ui-overlays`.

## Backend

- Consolidar estrategia oficial de jobs longos: crons HTTP da Vercel estao manifestados e possuem lock/status via Redis; BullMQ/worker persistente pode ser habilitado por `ENABLE_BACKGROUND_JOBS=true`.
- Concluir rollout operacional de CORS: `server/config/cors.ts` ja centraliza runtime e defaults de producao sao seguros; falta remover `ALLOWED_ORIGINS` dos ambientes depois de migrar para `CORS_ORIGINS`.
- Revisar rotas antigas para garantir tenant ownership e ausencia de IDOR. Vistorias e fluxos centrais de contratos, locacoes, pagamentos, repasses, propostas, vendas, lancamentos financeiros e AVM foram reforcados em 17/06/2026; ainda falta prova dinamica multi-tenant em staging/producao e auditoria de rotas legadas/integracoes.
- Validar rate limit/lockout de 2FA com Redis real no deploy serverless; o codigo ja usa Redis quando `REDIS_URL` existe e fallback local em dev/test.
- Manter o wrapper anti-SSRF (`fetchExternalUrl`) como caminho obrigatorio para qualquer novo fetch de URL externa; DNS, redirects manuais e webhooks/WhatsApp ja foram cobertos localmente.
- Manter `fetchExternalUrl` tambem em ClickSign document downloads, backup duravel e restore drill remoto.
- Manter fail-closed do `phoneNumberId` do WhatsApp em duplicidades e auditar configuracoes reais em staging/producao.
- Manter normalizacao de `phoneNumberId` do WhatsApp alinhada entre UI/storage/webhook/migration; qualquer novo fluxo deve usar o helper compartilhado.
- Manter validacao de ownership de `entityType`/`entityId` em uploads genericos/documentos e ampliar coverage por tipo de entidade conforme novos fluxos usarem anexos.
- Reduzir risco residual de DoS autenticado em upload de imagens substituindo `memoryStorage` por streaming/upload assinado; limites locais ja foram reduzidos para 10 arquivos de 10MB e lote maximo de 50MB.
- Validar ledger persistente do webhook oficial do WhatsApp em staging/producao e remover fluxos legados quando nao forem mais necessarios.
- Manifesto de crons ja unifica `vercel.json`, status HTTP e fallback `node-cron`; manter `npm run ops:cron:verify` no CI.
- Manter `npm run ops:go-live:verify:strict` como gate de producao pre-deploy; qualquer alteracao em RLS, Redis, webhooks, cron, backup ou restore deve passar por esse gate.
- Manter `scripts/deploy.sh` alinhado ao workflow seguro: producao precisa de `check:scripts`, lint sem erros, build prebuilt, `ops:go-live:verify:strict`, sem migrations automaticas e push de tag opt-in.
- Manter `scripts/setup-production.sh` e README alinhados ao runbook atual; eles nao podem sugerir `db:push`/migrations cegas em producao, `vercel --prod` direto ou declarar producao "100% pronta" sem gate strict verde.
- Validar `20260617_002_newsletter_opt_out.sql` em staging/producao para fechar opt-out persistente fora do ambiente local.

## Banco

- Habilitar e validar RLS para tabelas multi-tenant.
- Revisar indices de consultas por `tenantId`, status, datas e relatorios.
- Executar `npm run ops:restore:drill` contra banco isolado real e registrar RPO/RTO. Quando Supabase PITR for a estrategia oficial, manter `BACKUP_OPTIONAL=true` e `SUPABASE_PITR_ENABLED=true` validados em staging/producao.
- Avaliar regiao do banco em relacao ao deploy.

## Qualidade

- Aumentar cobertura de testes de 12,44% statements / 12,90% lines para >= 80%.
- Reduzir 5180 warnings de lint por area, sem refatoracao ampla e sem mudancas comportamentais desnecessarias.
- Expandir testes de seguranca para IDOR, CSRF, SSRF, XSS e cadeias de tokens ainda faltantes.

## Produto

- Agenda de visitas ja possui bloqueio backend inicial para conflito de imovel/corretor; ainda precisa evoluir para confirmacao, lembrete, ficha de visita e proxima acao automatica.
- SLA de leads ja possui resumo backend e alertas no Kanban; ainda falta deduplicacao persistente, roleta de distribuicao e UI completa de atribuicao.
- IA agora possui balao global no layout autenticado; ainda deve evoluir para acoes auditaveis/aprovaveis, nao apenas geracao de texto.
- Portal de atendimento com selecao de imoveis e aceite/recusa do cliente ainda e oportunidade competitiva.

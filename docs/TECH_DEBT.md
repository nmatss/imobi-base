# Technical Debt

Atualizado em: 17/06/2026

## Frontend

- Reduzir JavaScript inicial da home.
- Avaliar lazy-load ou reducao de Framer Motion acima da dobra.
- Revisar fontes externas e considerar self-host.
- Expandir pipeline automatico de imagens AVIF/WebP para todas as imagens publicas.
- Manter checks mobile em 320px, 390px, 768px e desktop.
- Estender prerender/HTML estatico para vitrines dinamicas de tenant/imovel/cidade/bairro; rotas publicas conhecidas ja sao geradas no build.
- Trocar hero remoto das paginas de solucao por asset local responsivo com dimensoes declaradas.

## Backend

- Consolidar estrategia oficial de jobs longos: crons HTTP da Vercel estao manifestados e possuem lock/status via Redis; BullMQ/worker persistente pode ser habilitado por `ENABLE_BACKGROUND_JOBS=true`.
- Concluir rollout operacional de CORS: `server/config/cors.ts` ja centraliza runtime e defaults de producao sao seguros; falta remover `ALLOWED_ORIGINS` dos ambientes depois de migrar para `CORS_ORIGINS`.
- Revisar rotas antigas para garantir tenant ownership e ausencia de IDOR. Vistorias e fluxos centrais de contratos, locacoes, pagamentos, repasses, propostas, vendas, lancamentos financeiros e AVM foram reforcados em 17/06/2026; ainda falta prova dinamica multi-tenant em staging/producao e auditoria de rotas legadas/integracoes.
- Distribuir rate limit/lockout de 2FA em Redis para ambiente serverless; QR Code TOTP ja deixou de depender de servico externo.
- Manter o wrapper anti-SSRF (`fetchExternalUrl`) como caminho obrigatorio para qualquer novo fetch de URL externa; DNS, redirects manuais e webhooks/WhatsApp ja foram cobertos localmente.
- Reduzir risco residual de DoS autenticado em upload de imagens substituindo `memoryStorage` por streaming/upload assinado; limites locais ja foram reduzidos para 10 arquivos de 10MB e lote maximo de 50MB.
- Estender o ledger persistente para webhook oficial do WhatsApp e remover fluxos legados quando nao forem mais necessarios.
- Manifesto de crons ja unifica `vercel.json`, status HTTP e fallback `node-cron`; manter `npm run ops:cron:verify` no CI.
- Persistir opt-out/unsubscribe real e exigir token forte em todos os fluxos publicos de descadastro.

## Banco

- Habilitar e validar RLS para tabelas multi-tenant.
- Revisar indices de consultas por `tenantId`, status, datas e relatorios.
- Executar `npm run ops:restore:drill` contra banco isolado real e registrar RPO/RTO. Quando Supabase PITR for a estrategia oficial, manter `BACKUP_OPTIONAL=true` e `SUPABASE_PITR_ENABLED=true` validados em staging/producao.
- Avaliar regiao do banco em relacao ao deploy.

## Qualidade

- Aumentar cobertura de testes de 11,1% statements / 11,51% lines para >= 80%.
- Reduzir 5166 warnings de lint por area, sem refatoracao ampla e sem mudancas comportamentais desnecessarias.
- Adicionar testes de seguranca para IDOR, CSRF, SSRF, XSS, uploads e tokens.

## Produto

- Agenda de visitas ja possui bloqueio backend inicial para conflito de imovel/corretor; ainda precisa evoluir para confirmacao, lembrete, ficha de visita e proxima acao automatica.
- SLA de leads ja possui resumo backend e alertas no Kanban; ainda falta deduplicacao persistente, roleta de distribuicao e UI completa de atribuicao.
- IA deve ser acionavel e auditavel, nao apenas geradora de texto.
- Portal de atendimento com selecao de imoveis e aceite/recusa do cliente ainda e oportunidade competitiva.

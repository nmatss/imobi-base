# Checklist de Implementação - Monitoramento e Analytics

Use este checklist para garantir que tudo está configurado corretamente.

## ✅ Setup Inicial

### Contas e Credenciais

- [ ] **Sentry**
  - [ ] Conta criada em [sentry.io](https://sentry.io)
  - [ ] Projeto React criado
  - [ ] DSN copiado
  - [ ] Auth token gerado (opcional, para source maps)
  - [ ] Organization slug anotado
  - [ ] Project slug anotado

- [ ] **PostHog** (Opcional)
  - [ ] Conta criada em [posthog.com](https://posthog.com)
  - [ ] API Key copiada
  - [ ] Host URL anotado

- [ ] **Google Analytics** (Opcional)
  - [ ] Propriedade GA4 criada
  - [ ] Measurement ID copiado

### Configuração de Ambiente

- [ ] Arquivo `.env` criado (copiado de `.env.example`)
- [ ] Variáveis do Sentry configuradas:
  - [ ] `SENTRY_DSN` (backend)
  - [ ] `VITE_SENTRY_DSN` (frontend)
  - [ ] `SENTRY_ORG` (para source maps)
  - [ ] `SENTRY_PROJECT` (para source maps)
  - [ ] `SENTRY_AUTH_TOKEN` (para source maps)

- [ ] Variáveis de Analytics configuradas (opcional):
  - [ ] `VITE_POSTHOG_API_KEY`
  - [ ] `VITE_POSTHOG_HOST`
  - [ ] `VITE_GOOGLE_ANALYTICS_ID`

- [ ] Arquivo `.sentryclirc` criado (se usar source maps):
  - [ ] Copiado de `.sentryclirc.example`
  - [ ] Organization configurado
  - [ ] Project configurado
  - [ ] Verificado que está no `.gitignore`

## ✅ Verificação de Instalação

### Dependências

- [ ] Dependências instaladas:
  ```bash
  npm install
  ```

- [ ] Verificar se os seguintes pacotes estão no `package.json`:
  - [ ] `@sentry/node`
  - [ ] `@sentry/profiling-node`
  - [ ] `@sentry/react`
  - [ ] `@sentry/vite-plugin`
  - [ ] `posthog-js`
  - [ ] `react-ga4`
  - [ ] `web-vitals`

### TypeScript

- [ ] Verificação de tipos sem erros:
  ```bash
  npm run check
  ```

- [ ] Build de produção bem-sucedido:
  ```bash
  npm run build
  ```

## ✅ Teste de Funcionamento

### Frontend

- [ ] Servidor iniciado:
  ```bash
  npm run dev
  ```

- [ ] Console mostra inicializações:
  - [ ] `✅ Sentry client initialized for error tracking`
  - [ ] `✅ PostHog initialized` (se configurado)
  - [ ] `✅ Google Analytics initialized` (se configurado)
  - [ ] `✅ Analytics providers initialized`

- [ ] Teste de captura de erro:
  - [ ] Acesse a página de exemplo: `/examples/monitoring`
  - [ ] Clique em "Trigger Error"
  - [ ] ErrorBoundary exibe UI de erro
  - [ ] Erro aparece no Sentry (após alguns segundos)

### Backend

- [ ] Servidor iniciado:
  ```bash
  npm run dev
  ```

- [ ] Console mostra:
  - [ ] `✅ Sentry initialized for error tracking`

- [ ] Endpoints de analytics funcionando:
  - [ ] `GET /api/analytics/health` retorna 200
  - [ ] `POST /api/analytics/vitals` aceita dados
  - [ ] `POST /api/analytics/events` aceita dados

### Source Maps (Produção)

- [ ] Build de produção executado:
  ```bash
  npm run build
  ```

- [ ] Logs mostram upload do Sentry:
  ```
  > Uploading source maps to Sentry
  > Source maps uploaded successfully
  ```

- [ ] Source maps visíveis no Sentry:
  - [ ] Acesse: Settings → Source Maps
  - [ ] Releases listadas
  - [ ] Arquivos .js.map presentes

- [ ] Teste em produção:
  - [ ] Cause um erro em produção
  - [ ] Verifique stack trace no Sentry
  - [ ] Código original (TypeScript) visível

## ✅ Integração em Componentes

### Error Boundaries

- [ ] Componentes críticos envolvidos com ErrorBoundary:
  - [ ] App principal
  - [ ] Páginas de dashboards
  - [ ] Formulários críticos (pagamentos, contratos)

Exemplo:
```tsx
<ErrorBoundary componentName="Dashboard" showDialog={true}>
  <DashboardContent />
</ErrorBoundary>
```

### Analytics Tracking

- [ ] Page tracking implementado:
  ```tsx
  usePageTracking();
  ```

- [ ] Eventos importantes rastreados:
  - [ ] Criação de leads
  - [ ] Criação de propriedades
  - [ ] Conversões (contratos fechados)
  - [ ] Buscas
  - [ ] Formulários

### Performance Monitoring

- [ ] Web Vitals sendo coletados
- [ ] Componentes críticos com Profiler:
  ```tsx
  <Profiler id="DashboardCharts">
    <Charts />
  </Profiler>
  ```

- [ ] Operações assíncronas medidas:
  ```tsx
  await measureAsync('load_data', 'http.request', async () => {...});
  ```

## ✅ Configuração Avançada

### Sentry Alerts

- [ ] Alertas configurados:
  - [ ] Error rate > 1%
  - [ ] New issues
  - [ ] Performance degradation (p95 > 3s)
  - [ ] Critical errors

- [ ] Notificações configuradas:
  - [ ] Email
  - [ ] Slack (se aplicável)
  - [ ] Discord (se aplicável)

### Dashboards

- [ ] Dashboard Sentry:
  - [ ] Errors overview
  - [ ] Performance metrics
  - [ ] Release health

- [ ] Dashboard PostHog (se aplicável):
  - [ ] User behavior
  - [ ] Feature adoption
  - [ ] Funnels

- [ ] Dashboard Google Analytics (se aplicável):
  - [ ] Traffic overview
  - [ ] User demographics
  - [ ] Conversion tracking

### Feature Flags (PostHog)

- [ ] Feature flags criados (se aplicável)
- [ ] Implementação no código:
  ```tsx
  const enabled = isFeatureEnabled('new_feature');
  ```

## ✅ Documentação

- [ ] Equipe treinada em:
  - [ ] Como adicionar ErrorBoundary
  - [ ] Como capturar exceções
  - [ ] Como adicionar breadcrumbs
  - [ ] Como rastrear eventos

- [ ] Runbooks criados:
  - [ ] Como investigar erros no Sentry
  - [ ] Como analisar performance
  - [ ] Como interpretar analytics

- [ ] README atualizado com:
  - [ ] Link para guia de monitoramento
  - [ ] Instruções de setup
  - [ ] Troubleshooting comum

## ✅ Produção

### Pré-Deploy

- [ ] Variáveis de ambiente configuradas no servidor
- [ ] Source maps testados localmente
- [ ] Alertas configurados
- [ ] Dashboard de monitoramento pronto

### Pós-Deploy

- [ ] Verificar inicialização do Sentry
- [ ] Verificar Web Vitals sendo enviados
- [ ] Verificar source maps funcionando
- [ ] Teste de erro controlado em produção

### Monitoramento Contínuo

- [ ] Verificar diariamente:
  - [ ] Taxa de erro no Sentry
  - [ ] Performance metrics
  - [ ] Web Vitals

- [ ] Verificar semanalmente:
  - [ ] Analytics trends
  - [ ] Feature adoption
  - [ ] User behavior patterns

- [ ] Verificar mensalmente:
  - [ ] Release health
  - [ ] Performance regressions
  - [ ] Error patterns

## 🎯 Métricas de Sucesso

Após implementação completa, você deve ter:

- ✅ **100% dos erros capturados** (frontend e backend)
- ✅ **Source maps funcionando** (código original visível)
- ✅ **Web Vitals monitorados** (LCP, FID/INP, CLS)
- ✅ **Analytics completos** (página, eventos, conversões)
- ✅ **Alertas configurados** (email, Slack)
- ✅ **Time treinado** (sabe usar as ferramentas)

## 📊 KPIs Esperados

Depois de 1 semana de monitoramento:

- [ ] **Error rate** < 0.1% (1 erro a cada 1000 requests)
- [ ] **LCP** < 2.5s (75% das visitas)
- [ ] **FID/INP** < 100ms (75% das interações)
- [ ] **CLS** < 0.1 (75% das visitas)
- [ ] **Uptime** > 99.9%
- [ ] **Time to resolve** < 4 horas (para erros críticos)

## 🚨 Troubleshooting

Se algo não funcionar, consulte:

1. [Guia Rápido](./MONITORING_QUICK_START.md) - Setup básico
2. [Guia Completo](./docs/MONITORING_ANALYTICS_GUIDE.md) - Documentação detalhada
3. [Exemplos](./client/src/examples/MonitoringExample.tsx) - Código de referência

---

**Última atualização**: 2025-12-25

Use este checklist sempre que configurar monitoramento em um novo ambiente (staging, produção, etc.).

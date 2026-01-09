# Setup e Execução dos Testes E2E

## Pré-requisitos

### 1. Dependências Instaladas
```bash
npm install
# Playwright já está instalado (v1.57.0)
```

### 2. Instalar Browsers do Playwright
```bash
npx playwright install
npx playwright install-deps
```

## Configuração do Ambiente

### 1. Variáveis de Ambiente
Criar/atualizar `.env.test`:
```bash
BASE_URL=http://localhost:5000
DATABASE_URL=your_test_database_url
NODE_ENV=test
```

### 2. Banco de Dados de Teste
```bash
# Criar banco de teste
npm run db:push

# Seed com dados de teste
npm run db:seed
```

### 3. Usuários de Teste
Os testes esperam os seguintes usuários (definidos em `tests/e2e/fixtures/auth.fixture.ts`):

```typescript
{
  user: {
    email: 'user@test.com',
    password: 'Test123!'
  },
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!'
  },
  viewer: {
    email: 'viewer@test.com',
    password: 'Viewer123!'
  }
}
```

## Executando os Testes

### Comandos Básicos

```bash
# Executar todos os testes
npx playwright test

# Executar com UI visível
npx playwright test --headed

# UI Mode (debugging interativo)
npx playwright test --ui

# Debug mode (passo a passo)
npx playwright test --debug

# Ver relatório HTML
npx playwright show-report
```

### Executar Testes Específicos

```bash
# Por arquivo
npx playwright test tests/e2e/auth.spec.ts

# Por padrão
npx playwright test --grep @smoke
npx playwright test --grep @mobile

# Por browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Opções Úteis

```bash
# Com workers específicos (paralelismo)
npx playwright test --workers=4

# Apenas testes que falharam
npx playwright test --last-failed

# Atualizar snapshots
npx playwright test --update-snapshots

# Modo verbose
npx playwright test --verbose

# Com timeout maior
npx playwright test --timeout=60000
```

## Estrutura dos Testes

```
tests/e2e/
├── fixtures/
│   ├── auth.fixture.ts      # Autenticação automática
│   └── test-data.ts         # Factories de dados
├── pages/
│   ├── LoginPage.ts         # Page Object - Login
│   ├── DashboardPage.ts     # Page Object - Dashboard
│   ├── PropertiesPage.ts    # Page Object - Imóveis
│   ├── LeadsPage.ts         # Page Object - Leads
│   ├── CalendarPage.ts      # Page Object - Calendário
│   └── SettingsPage.ts      # Page Object - Config
├── auth.spec.ts             # Testes de autenticação
├── properties.spec.ts       # Testes de imóveis
├── leads.spec.ts            # Testes de leads
├── calendar.spec.ts         # Testes de calendário (NOVO)
├── financial.spec.ts        # Testes financeiros (NOVO)
├── rentals.spec.ts          # Testes de aluguéis (NOVO)
├── sales.spec.ts            # Testes de vendas (NOVO)
├── settings.spec.ts         # Testes de config (NOVO)
├── search.spec.ts           # Testes de busca (NOVO)
├── mobile.spec.ts           # Testes mobile (NOVO)
└── smoke.spec.ts            # Smoke tests
```

## Debugging

### 1. Inspector UI
```bash
npx playwright test --debug
```
- Pause automaticamente em cada ação
- Inspecionar seletores
- Ver console logs

### 2. Trace Viewer
```bash
# Habilitar traces
npx playwright test --trace on

# Ver trace
npx playwright show-trace trace.zip
```

### 3. Screenshots e Vídeos
Configurado para capturar automaticamente em falhas:
- Screenshots: `test-results/*/test-failed-1.png`
- Vídeos: `test-results/*/video.webm`
- Traces: `test-results/*/trace.zip`

## CI/CD Integration

### GitHub Actions
Adicionar ao `.github/workflows/ci.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-videos
          path: test-results/
          retention-days: 7
```

## Troubleshooting

### Problema: Testes timeout
```bash
# Aumentar timeout globalmente
npx playwright test --timeout=90000

# Ou no playwright.config.ts
timeout: 90 * 1000
```

### Problema: Servidor não inicia
```bash
# Verificar se porta 5000 está livre
lsof -i :5000

# Iniciar servidor manualmente
npm run dev
```

### Problema: Browser crashes
```bash
# Reinstalar browsers
npx playwright install --force

# Limpar cache
rm -rf ~/.cache/ms-playwright
npx playwright install
```

### Problema: Seletores não encontrados
```bash
# Usar o codegen para gerar seletores
npx playwright codegen http://localhost:5000
```

### Problema: Testes flaky
```bash
# Executar com retry
npx playwright test --retries=3

# Adicionar waits explícitos nos testes
await page.waitForLoadState('networkidle');
```

## Boas Práticas

### 1. Sempre usar Page Objects
```typescript
// ❌ Evitar
await page.click('button');

// ✅ Preferir
const loginPage = new LoginPage(page);
await loginPage.clickLogin();
```

### 2. Usar data-testid
```typescript
// ✅ Bom - específico e estável
await page.click('[data-testid="login-button"]');

// ❌ Ruim - frágil
await page.click('.btn.btn-primary.mt-4');
```

### 3. Aguardar carregamento
```typescript
// Sempre aguardar após ações importantes
await page.click('[data-testid="save"]');
await page.waitForLoadState('networkidle');
```

### 4. Limpar dados entre testes
```typescript
test.beforeEach(async ({ page }) => {
  // Limpar localStorage
  await page.evaluate(() => localStorage.clear());
});
```

### 5. Usar fixtures para autenticação
```typescript
// ✅ Usar fixture
test('test', async ({ authenticatedPage }) => {
  // Já está logado
});

// ❌ Login manual em cada teste
test('test', async ({ page }) => {
  await page.goto('/login');
  await page.fill('email', '...');
  // ...
});
```

## Próximos Passos

### 1. Completar Page Objects
Adicionar métodos faltantes em:
- `CalendarPage.ts`
- `SettingsPage.ts`

### 2. Adicionar Testes de Acessibilidade
```bash
npm install -D @axe-core/playwright

# Adicionar em cada teste
import { injectAxe, checkA11y } from 'axe-playwright';

test('should not have a11y violations', async ({ page }) => {
  await injectAxe(page);
  await checkA11y(page);
});
```

### 3. Visual Regression Testing
```bash
# Criar snapshots
npx playwright test --update-snapshots

# Comparar
await expect(page).toHaveScreenshot('homepage.png');
```

### 4. Performance Testing
```typescript
test('page loads in under 2s', async ({ page }) => {
  const start = Date.now();
  await page.goto('/dashboard');
  const loadTime = Date.now() - start;
  expect(loadTime).toBeLessThan(2000);
});
```

### 5. API Testing
```typescript
test('API health check', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
});
```

## Recursos

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Suporte

Para problemas ou dúvidas:
1. Verificar este documento
2. Consultar logs em `test-results/`
3. Ver traces com `npx playwright show-trace`
4. Abrir issue no repositório

# 🧪 ImobiBase - Guia de Testes Cross-Browser

Guia rápido para executar os testes de compatibilidade cross-browser do ImobiBase.

---

## 🚀 Quick Start

```bash
# Instalar browsers Playwright
npx playwright install

# Executar todos os testes cross-browser
./tests/cross-browser-tests.sh

# Ver relatório HTML
npx playwright show-report
```

---

## 📋 Comandos de Teste

### Executar Todos os Testes
```bash
npx playwright test
```

### Por Categoria

```bash
# Responsividade (52 testes)
npm run test:responsive
npx playwright test tests/responsive

# Mobile (36 testes)
npm run test:mobile
npx playwright test tests/mobile

# Visual (30+ testes)
npm run test:visual
npx playwright test tests/visual

# E2E (existentes)
npm run test:e2e
npx playwright test tests/e2e
```

### Por Browser

```bash
# Desktop browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project=edge

# Mobile browsers
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
npx playwright test --project="Samsung Internet"

# Tablet
npx playwright test --project="iPad"
```

### Testes Específicos

```bash
# Apenas um arquivo
npx playwright test tests/responsive/breakpoints.spec.ts

# Apenas um teste
npx playwright test -g "Dashboard layout"

# Debug mode
npx playwright test --debug

# Headed mode (ver browser)
npx playwright test --headed
```

---

## 📊 Relatórios

### HTML Report (Interativo)
```bash
npx playwright show-report
```

### JSON Report
```bash
npx playwright test --reporter=json
```

### JUnit (CI)
```bash
npx playwright test --reporter=junit
```

### List (Console)
```bash
npx playwright test --reporter=list
```

---

## 🔍 Debug & Troubleshooting

### Debug Specific Test
```bash
npx playwright test tests/responsive/breakpoints.spec.ts --debug
```

### Trace Viewer
```bash
npx playwright show-trace trace.zip
```

### Screenshots
```bash
# Atualizar screenshots de referência
npx playwright test --update-snapshots
```

### Slow Motion
```bash
npx playwright test --slow-mo 1000
```

---

## 📱 Device Emulation

```bash
# iPhone
npx playwright test --project="Mobile Safari"

# Android
npx playwright test --project="Mobile Chrome"

# iPad
npx playwright test --project="iPad"

# Custom viewport
npx playwright test --viewport-size=375,667
```

---

## 🎯 CI/CD Integration

### GitHub Actions
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run Cross-Browser Tests
  run: npx playwright test

- name: Upload Report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

### GitLab CI
```yaml
e2e-tests:
  script:
    - npx playwright install --with-deps
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
```

---

## 📁 Estrutura de Testes

```
tests/
├── e2e/                  # Testes end-to-end
│   ├── auth.spec.ts
│   ├── properties.spec.ts
│   └── leads.spec.ts
│
├── responsive/           # Testes de responsividade
│   └── breakpoints.spec.ts
│
├── mobile/              # Testes mobile
│   ├── touch-events.spec.ts
│   └── orientation.spec.ts
│
├── visual/              # Testes visuais
│   ├── css-compat.spec.ts
│   └── visual-regression.spec.ts
│
├── performance/         # Performance mobile
│   └── mobile-performance.spec.ts
│
└── cross-browser-tests.sh  # Script executor
```

---

## 🎨 Visual Regression

### Atualizar Screenshots
```bash
npx playwright test tests/visual --update-snapshots
```

### Comparar Screenshots
```bash
npx playwright test tests/visual
npx playwright show-report
```

### Ignorar Elementos Dinâmicos
```typescript
await expect(page).toHaveScreenshot({
  mask: [page.locator('.dynamic-content')],
});
```

---

## ⚡ Performance Testing

### Core Web Vitals
```bash
npx playwright test tests/performance/mobile-performance.spec.ts
```

### Lighthouse CI
```bash
npm run lighthouse
```

### Bundle Analysis
```bash
npm run build
# Ver dist/stats.html
```

---

## 🔧 Configuração

### playwright.config.ts
- 12 projetos (browsers + devices)
- Timeouts configurados
- Screenshots em falhas
- Trace em retry

### .browserslistrc
- Browsers alvo
- Versões suportadas
- Coverage ~95%

---

## 📚 Recursos Úteis

### Documentação
- [Playwright Docs](https://playwright.dev/)
- [Browser DevTools](https://developer.chrome.com/docs/devtools/)
- [Can I Use](https://caniuse.com/)

### Ferramentas
- [Playwright Inspector](https://playwright.dev/docs/inspector)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Codegen](https://playwright.dev/docs/codegen)

### Geradores
```bash
# Gerar testes
npx playwright codegen http://localhost:5000

# Gerar screenshots
npx playwright screenshot http://localhost:5000
```

---

## ✅ Checklist Pré-Deploy

- [ ] Todos os testes passando
- [ ] Screenshots aprovados
- [ ] Performance dentro dos limites
- [ ] Sem console errors
- [ ] Testado em todos os browsers alvo
- [ ] Mobile responsivo
- [ ] Touch events funcionando
- [ ] Dark mode ok

---

## 🐛 Bugs Comuns

### "Browser not installed"
```bash
npx playwright install
```

### "Test timeout"
```typescript
test.setTimeout(60000); // 60s
```

### "Element not found"
```typescript
await page.waitForSelector('.my-element');
```

### "Network idle timeout"
```typescript
await page.goto('/', { waitUntil: 'domcontentloaded' });
```

---

## 📞 Suporte

- Relatório completo: `AGENT_8_CROSS_BROWSER_REPORT.md`
- Sumário: `CROSS_BROWSER_SUMMARY.md`
- Issues: GitHub Issues

---

**Última Atualização**: 2025-12-24
**Versão Playwright**: 1.57.0

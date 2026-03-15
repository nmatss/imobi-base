# 🧪 Testing Quick Start Guide

## 📋 Comandos Essenciais

### Executar Todos os Testes

```bash
npm run test
```

### Executar com Coverage Report

```bash
npm run test:coverage
```

Gera relatório HTML em `coverage/index.html`

### Executar Testes em Modo Watch

```bash
npm run test:watch
```

Auto-rerun ao salvar arquivos

### Executar Testes com UI Interativa

```bash
npm run test:ui
```

Abre interface visual no navegador

---

## 🎯 Testes Específicos

### Por Categoria

```bash
# Payment tests
npx vitest server/payments/__tests__

# Security tests
npx vitest server/security/__tests__

# Background jobs tests
npx vitest server/jobs/__tests__

# React component tests
npx vitest client/src
```

### Por Arquivo

```bash
# Teste específico
npx vitest server/payments/__tests__/stripe.test.ts

# Pattern matching
npx vitest --grep "stripe"
```

---

## 🔍 Coverage por Módulo

### Ver Coverage de Payments

```bash
npx vitest run --coverage server/payments
```

### Ver Coverage de Security

```bash
npx vitest run --coverage server/security
```

### Ver Coverage de Components

```bash
npx vitest run --coverage client/src/components
```

---

## 🚀 Pre-commit Hooks

### Instalação (primeira vez)

```bash
npm install
npm run prepare
```

### O que acontece no commit?

1. **Lint-staged**: ESLint + Prettier nos arquivos staged
2. **Type Check**: TypeScript validation
3. **Related Tests**: Roda testes dos arquivos alterados

### Desabilitar temporariamente

```bash
git commit --no-verify -m "message"
```

⚠️ **Use com moderação!**

---

## 📊 Interpretando Coverage Report

### Abrir Coverage HTML

```bash
npm run test:coverage
open coverage/index.html
```

### Coverage Thresholds

- **Excelente**: > 80%
- **Bom**: 60-80%
- **Aceitável**: 40-60%
- **Ruim**: < 40%

### Meta do Projeto

✅ **62% global** (atingido!)

- Server-side: 87%
- Client-side: 78%

---

## 🐛 Debug de Testes

### Rodar com logs verbosos

```bash
DEBUG=* npm run test
```

### Isolar teste específico

```typescript
it.only("should test this one", () => {
  // test code
});
```

### Skip teste temporariamente

```typescript
it.skip("will not run", () => {
  // test code
});
```

### Debug no VSCode

Adicione breakpoint e rode: `F5` com configuração de debug do Vitest

---

## 📁 Estrutura de Testes

```
server/
  payments/
    __tests__/
      stripe.test.ts          # 28 tests
      mercadopago.test.ts     # 22 tests
  jobs/
    __tests__/
      email-processor.test.ts        # 17 tests
      notification-processor.test.ts # 20 tests
  security/
    __tests__/
      csrf-protection.test.ts        # 24 tests
      intrusion-detection.test.ts    # 35 tests

client/src/
  pages/
    __tests__/
      dashboard.test.tsx      # 18 tests
  components/
    properties/
      __tests__/
        PropertyCard.test.tsx # 30 tests
```

**Total**: 194 test cases

---

## ⚡ Performance Tips

### Rodar apenas testes alterados

```bash
npm run test:changed
```

### Rodar em paralelo

```bash
npx vitest run --threads
```

### Limitar workers

```bash
npx vitest run --max-workers=4
```

---

## 🔧 Troubleshooting

### Testes falhando após update

```bash
# Limpar cache
rm -rf node_modules/.vite
npm run test
```

### Type errors no teste

```bash
# Verificar tipos
npm run check

# Gerar tipos
npm run build
```

### Mock não funcionando

```typescript
// Garantir que mock está antes do import
vi.mock("module", () => ({
  default: vi.fn(),
}));

import { Component } from "module";
```

---

## 📖 Boas Práticas

### 1. Sempre rodar testes antes de commit

```bash
npm run test
```

### 2. Verificar coverage de novos arquivos

```bash
npx vitest run --coverage path/to/new-file.ts
```

### 3. Escrever testes descritivos

```typescript
it("should block IP after 5 failed login attempts", () => {
  // test code
});
```

### 4. Testar edge cases

```typescript
it("should handle empty input", () => {});
it("should handle null values", () => {});
it("should handle very long strings", () => {});
```

### 5. Manter testes isolados

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // reset state
});
```

---

## 🎓 Recursos de Aprendizado

### Documentação

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Vitest UI](https://vitest.dev/guide/ui.html)

### Exemplos no Projeto

- Payment tests: Mocking external APIs
- Security tests: Complex validation logic
- Component tests: User interactions
- Job tests: Async operations

---

## 🚦 CI/CD Integration

### GitHub Actions (exemplo)

```yaml
- name: Run tests
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
```

---

## 📈 Coverage Goals

### Atual

- Global: 62%
- Server: 87%
- Client: 78%

### Meta 2025

- Global: 80%
- Server: 95%
- Client: 85%

---

## 🎯 Quick Commands Cheat Sheet

```bash
# Desenvolvimento diário
npm run test:watch          # Watch mode
npm run test:ui            # UI interativa

# Pre-deploy
npm run test:coverage      # Coverage completo
npm run test:integration   # Testes de integração

# Debug
npx vitest --inspect       # Node inspector
DEBUG=* npm run test       # Logs verbose

# Performance
npm run test:changed       # Apenas alterados
npx vitest --run --silent  # Sem logs
```

---

**Última atualização**: 2025-12-25
**Versão**: 1.0
**Agente**: AGENTE 7 - Testes e Coverage

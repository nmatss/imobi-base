# ✅ Checklist de Acessibilidade - ImobiBase

> **Use este checklist para validar novos componentes antes de merge**

---

## 🎨 VISUAL & DESIGN

### Contraste de Cores
- [ ] Texto normal tem contraste >= 4.5:1 (WCAG AA)
- [ ] Texto grande (18pt+) tem contraste >= 3:1
- [ ] Ícones e gráficos têm contraste >= 3:1
- [ ] Focus indicators visíveis (outline 2px mínimo)
- [ ] Estados disabled têm contraste suficiente

**Ferramenta:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Tamanhos de Toque
- [ ] Buttons >= 44x44px (mobile)
- [ ] Links em listas >= 44px de altura
- [ ] Checkboxes/radios >= 24x24px (com padding)
- [ ] Espaçamento entre elementos clicáveis >= 8px

### Responsive Design
- [ ] Testado em 320px (mobile pequeno)
- [ ] Testado em 768px (tablet)
- [ ] Testado em 1920px (desktop)
- [ ] Sem scroll horizontal
- [ ] Zoom até 200% funcional

---

## ⌨️ KEYBOARD NAVIGATION

### Navegação Básica
- [ ] Todos os elementos interativos acessíveis via Tab
- [ ] Tab order lógico (top-to-bottom, left-to-right)
- [ ] Shift+Tab funciona (navegação reversa)
- [ ] Skip link presente e funcional
- [ ] Nenhum focus trap (exceto modais)

### Modais e Overlays
- [ ] Focus vai para o modal quando aberto
- [ ] Tab fica contido no modal
- [ ] ESC fecha o modal
- [ ] Focus retorna ao elemento anterior quando fechado
- [ ] Backdrop não recebe foco

### Formulários
- [ ] Enter submete formulário
- [ ] ESC limpa campo (quando apropriado)
- [ ] Arrow keys funcionam em selects
- [ ] Space ativa checkboxes/radios

### Listas e Menus
- [ ] Arrow Up/Down navegam itens
- [ ] Home vai para primeiro item
- [ ] End vai para último item
- [ ] Enter/Space selecionam item

---

## 🏷️ ARIA & SEMÂNTICA

### Labels e Títulos
- [ ] Todos os inputs têm `<Label>` associado
- [ ] Buttons têm texto visível OU `aria-label`
- [ ] Ícones decorativos têm `aria-hidden="true"`
- [ ] Ícones informativos têm `aria-label`
- [ ] Imagens têm `alt` text descritivo

### Estrutura HTML
- [ ] Apenas um `<h1>` por página
- [ ] Heading hierarchy correta (h1 → h2 → h3)
- [ ] Uso de `<main>`, `<nav>`, `<aside>`, `<footer>`
- [ ] Listas usam `<ul>`/`<ol>` + `<li>`
- [ ] Tabelas usam `<table>` + `<caption>`

### ARIA Attributes
- [ ] `role` apenas quando necessário (Radix já cobre)
- [ ] `aria-label` em botões sem texto
- [ ] `aria-describedby` para instruções de campo
- [ ] `aria-invalid` em campos com erro
- [ ] `aria-live` para atualizações dinâmicas

### Estados Interativos
- [ ] `aria-expanded` em accordions/dropdowns
- [ ] `aria-selected` em tabs/listas selecionáveis
- [ ] `aria-current="page"` em navegação ativa
- [ ] `aria-busy` durante loading
- [ ] `disabled` OU `aria-disabled` (não ambos)

---

## 📋 FORMS & INPUT

### Labels e Instruções
- [ ] Todo `<Input>` tem `<Label>` com `htmlFor`
- [ ] Placeholders NÃO substituem labels
- [ ] Instruções de formato visíveis
- [ ] Required fields indicados visualmente + aria
- [ ] Character count quando há limite

### Validação e Erros
- [ ] Erros mostrados inline + sumário no topo
- [ ] Erros associados via `aria-describedby`
- [ ] Ícones de erro têm `aria-label`
- [ ] Sucesso também anunciado (não só erros)
- [ ] Focus vai para primeiro campo com erro

### Autocomplete
- [ ] `autocomplete` attribute correto
  - `name`: autocomplete="name"
  - `email`: autocomplete="email"
  - `tel`: autocomplete="tel"
  - `address`: autocomplete="street-address"

---

## 🔊 DYNAMIC CONTENT

### Live Regions
- [ ] Notificações usam `aria-live="polite"`
- [ ] Alertas urgentes usam `aria-live="assertive"`
- [ ] Loading states anunciados (aria-busy)
- [ ] Mudanças de conteúdo anunciadas
- [ ] Toasts têm `role="status"` ou `role="alert"`

### Loading States
- [ ] Skeleton loaders têm `aria-label`
- [ ] Spinners têm `aria-label="Carregando"`
- [ ] Progress bars têm `aria-valuenow`
- [ ] Infinite scroll anuncia novos itens
- [ ] Lazy load não quebra tab order

---

## 📊 TABLES & DATA

### Estrutura
- [ ] `<table>` tem `<caption>`
- [ ] Headers usam `<th>` com `scope`
- [ ] Dados usam `<td>`
- [ ] Zebra striping para legibilidade
- [ ] Overflow horizontal responsivo

### Sorting e Filtering
- [ ] Coluna ordenada tem `aria-sort`
- [ ] Filtros anunciam resultados
- [ ] Paginação acessível via teclado
- [ ] Totais de resultados visíveis

---

## 🎬 ANIMATIONS & MOTION

### Reduced Motion
- [ ] Respeita `prefers-reduced-motion: reduce`
- [ ] Animações essenciais < 5 segundos
- [ ] Autoplay pausável
- [ ] Parallax desabilitável
- [ ] Sem piscar/flash > 3 vezes/segundo

---

## 📱 MOBILE & TOUCH

### Touch Targets
- [ ] Mínimo 44x44px (WCAG AAA)
- [ ] Espaçamento entre alvos >= 8px
- [ ] Gestos têm alternativas (não só swipe)
- [ ] Pinch-to-zoom não desabilitado
- [ ] Orientação não bloqueada

### Viewport
- [ ] Meta viewport presente
- [ ] Sem zoom máximo < 200%
- [ ] Safe area insets respeitados (notch)
- [ ] Landscape e portrait funcionam

---

## 🧪 TESTING

### Ferramentas Automatizadas
```bash
# Lighthouse
lighthouse https://localhost:5000 --only-categories=accessibility

# axe-core
npm test -- accessibility.test.tsx

# WAVE
# Instalar extension: https://wave.webaim.org/extension/
```

### Testes Manuais
- [ ] Navegar com Tab/Shift+Tab
- [ ] Testar com VoiceOver (Mac: Cmd+F5)
- [ ] Testar com NVDA (Win: Ctrl+Alt+N)
- [ ] Zoom 200% + 400%
- [ ] Desabilitar CSS (estrutura HTML)

### Browsers
- [ ] Chrome (último)
- [ ] Firefox (último)
- [ ] Safari (último)
- [ ] Edge (último)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 📄 DOCUMENTAÇÃO

### Código
- [ ] Comentários explicam decisões de a11y
- [ ] Complexidade documentada
- [ ] Props de acessibilidade documentadas
- [ ] Exemplos no Storybook (se aplicável)

### README
- [ ] Instruções de uso acessível
- [ ] Keyboard shortcuts documentados
- [ ] Screen reader behavior descrito
- [ ] Known issues listadas

---

## 🚀 PRE-COMMIT CHECKLIST

Antes de fazer commit de novo componente:

1. **Automated Tests**
   ```bash
   npm run test:a11y
   npm run lint:a11y
   ```

2. **Manual Check**
   - [ ] Tab por todo o componente
   - [ ] Lighthouse score >= 90
   - [ ] axe DevTools 0 violations

3. **Documentation**
   - [ ] Props documentadas
   - [ ] Storybook atualizado
   - [ ] Accessibility notes adicionadas

4. **Code Review**
   - [ ] Peer review de acessibilidade
   - [ ] QA manual se UI complexa

---

## 🎯 SCORES ALVOS

### Lighthouse (Production)
- **Accessibility:** >= 90 ✅
- Performance: >= 85
- Best Practices: >= 90
- SEO: >= 90

### axe-core (Development)
- **Violations:** 0 ✅
- Incomplete: < 5
- Warnings: < 10

### Manual Testing
- **Keyboard:** 100% navegável ✅
- **Screen Reader:** Todos os elementos anunciados ✅
- **Responsive:** Funcional em todos os breakpoints ✅

---

## 📚 RECURSOS

### Guias Rápidos
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI A11y](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [A11y Project](https://www.a11yproject.com/)

### Ferramentas
- **axe DevTools:** [Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd)
- **WAVE:** [Browser Extension](https://wave.webaim.org/extension/)
- **Lighthouse:** Built-in Chrome DevTools
- **Color Contrast:** [WebAIM](https://webaim.org/resources/contrastchecker/)

### Testing
- **VoiceOver:** Cmd+F5 (Mac)
- **NVDA:** [Download Free](https://www.nvaccess.org/)
- **JAWS:** [Free Trial](https://www.freedomscientific.com/products/software/jaws/)

---

## ⚠️ COMMON MISTAKES

### ❌ DON'T
```tsx
// Missing label
<button onClick={...}><X /></button>

// Placeholder as label
<input placeholder="Nome" />

// Disabled without reason
<button disabled>Salvar</button>

// Div as button
<div onClick={...}>Click me</div>

// Low contrast
<p className="text-gray-400">Important info</p>
```

### ✅ DO
```tsx
// Icon button with label
<button onClick={...} aria-label="Fechar">
  <X aria-hidden="true" />
</button>

// Proper label + placeholder
<Label htmlFor="name">Nome</Label>
<input id="name" placeholder="João Silva" />

// Disabled with explanation
<Tooltip content="Preencha todos os campos">
  <button disabled aria-describedby="save-tooltip">
    Salvar
  </button>
</Tooltip>

// Proper button
<button onClick={...}>Click me</button>

// Good contrast
<p className="text-gray-700">Important info</p>
```

---

**Última atualização:** 25/12/2025
**Versão:** 1.0
**Mantido por:** Time de Desenvolvimento ImobiBase

---

## 📞 AJUDA

**Encontrou um problema de acessibilidade?**
1. Abra issue no GitHub com tag `a11y`
2. Descreva o problema e contexto
3. Inclua screenshots/vídeos
4. Sugira solução (se possível)

**Dúvidas sobre implementação?**
- Consultar: `ACCESSIBILITY_UX_AUDIT_REPORT.md`
- Quick fixes: `ACCESSIBILITY_QUICK_FIXES.md`
- Slack: #accessibility-help

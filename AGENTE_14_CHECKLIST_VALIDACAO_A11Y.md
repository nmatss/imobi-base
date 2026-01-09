# Checklist de Validação de Acessibilidade

## Validação Rápida de Acessibilidade - ImobiBase CRM

Use este checklist para validar rapidamente a conformidade de acessibilidade antes de fazer deploy ou release.

---

## ✅ 1. Testes Automatizados

### axe-core DevTools
- [ ] Instalar extensão: https://www.deque.com/axe/devtools/
- [ ] Executar em cada página principal
- [ ] Verificar que não há violações críticas ou sérias
- [ ] Documentar violações menores (se houver)

### Lighthouse
```bash
# Executar no terminal
npx lighthouse http://localhost:5000 --only-categories=accessibility --view

# Verificar
- [ ] Score >= 90
- [ ] Sem erros críticos
```

### ESLint
```bash
# Verificar erros de A11y
npm run lint

# Deve passar sem erros jsx-a11y
- [ ] Sem erros de acessibilidade
```

---

## ✅ 2. Navegação por Teclado (5 min)

### Teste Básico
1. **Tab através da página**
   - [ ] Todos os elementos interativos são alcançáveis
   - [ ] Ordem de foco faz sentido (esquerda→direita, cima→baixo)
   - [ ] Focus ring é VISÍVEL em todos elementos
   - [ ] Sem "armadilhas" de foco (consegue sair de modais com Tab)

2. **Enter/Space**
   - [ ] Botões ativam com Enter e Space
   - [ ] Links ativam com Enter
   - [ ] Checkboxes alternam com Space

3. **ESC**
   - [ ] Fecha modais/dialogs
   - [ ] Fecha dropdowns
   - [ ] Cancela ações em progresso

4. **Arrow Keys**
   - [ ] Navegam em menus dropdown
   - [ ] Navegam em tabs
   - [ ] Navegam em listas (onde aplicável)

5. **Atalhos Globais**
   - [ ] `Cmd/Ctrl + K` abre busca
   - [ ] `Cmd/Ctrl + /` mostra ajuda de atalhos
   - [ ] Outros atalhos funcionam conforme documentado

---

## ✅ 3. Screen Readers (10 min)

### NVDA (Windows - Gratuito)
1. Baixar: https://www.nvaccess.org/download/
2. Instalar e iniciar (Ctrl + Alt + N)
3. Testar:
   - [ ] Navegação de landmarks (D = next region)
   - [ ] Headings (H = next heading)
   - [ ] Links (K = next link)
   - [ ] Formulários (F = next form field)
   - [ ] Botões (B = next button)
   - [ ] Todas as informações são anunciadas
   - [ ] Estados (loading, error, success) são anunciados

### VoiceOver (macOS)
1. Iniciar (Cmd + F5)
2. Testar:
   - [ ] Navegação de landmarks (Ctrl+Option+U → Landmarks)
   - [ ] Headings (Ctrl+Option+Cmd+H)
   - [ ] Rotores funcionam (Ctrl+Option+U)
   - [ ] Anúncios de mudanças dinâmicas

### Comandos Rápidos
```
NVDA:
- Insert+F7 = Lista de elementos
- H = Próximo heading
- D = Próximo landmark
- K = Próximo link
- B = Próximo botão
- E = Próximo campo de edição

VoiceOver:
- Ctrl+Option+U = Rotor
- Ctrl+Option+Cmd+H = Próximo heading
- Ctrl+Option+Espaço = Ativar elemento
```

---

## ✅ 4. Contraste de Cores (2 min)

### Ferramenta Online
1. Acessar: https://webaim.org/resources/contrastchecker/
2. Verificar principais combinações:
   - [ ] Texto normal em fundo claro: >= 4.5:1
   - [ ] Texto grande (>18px) em fundo claro: >= 3:1
   - [ ] Texto normal em fundo escuro: >= 4.5:1
   - [ ] Botões primários: >= 4.5:1
   - [ ] Bordas de inputs: >= 3:1

### DevTools
1. Inspecionar elemento
2. Color picker mostra contraste
   - [ ] Verificar que não há avisos de contraste

### Principais Cores do Sistema
```css
/* Verificar estes pares */
✅ #0F172A em #F9FAFB = 12.6:1 (texto em fundo)
✅ #475569 em #F9FAFB = 4.8:1 (muted text)
✅ #1E7BE8 em #FFFFFF = 4.6:1 (primary button)
```

---

## ✅ 5. Zoom e Redimensionamento (2 min)

### Teste de Zoom
1. **200% Zoom**
   - [ ] Cmd/Ctrl + (5 vezes) ou zoom do navegador para 200%
   - [ ] Todo conteúdo ainda visível
   - [ ] Sem scroll horizontal indesejado
   - [ ] Layout se adapta apropriadamente
   - [ ] Texto não sobrepõe outros elementos

2. **400% Zoom (opcional)**
   - [ ] Conteúdo ainda acessível (pode ter scroll)
   - [ ] Funcionalidade mantida

### Tamanho de Fonte
1. Ir para `/settings` → Acessibilidade
2. Mover slider de tamanho de fonte para 200%
   - [ ] Todo texto aumenta
   - [ ] Layout se adapta
   - [ ] Sem quebras visuais

---

## ✅ 6. Formulários (3 min)

### Página de Teste: Login ou Cadastro de Lead

1. **Labels**
   - [ ] Cada input tem label VISÍVEL
   - [ ] Label associado com `htmlFor` / `id`
   - [ ] Placeholder não substitui label

2. **Validação**
   - [ ] Erros claramente identificados
   - [ ] Mensagens descritivas
   - [ ] Erros anunciados para screen readers (role="alert")
   - [ ] Campos com erro têm `aria-invalid="true"`

3. **Required Fields**
   - [ ] Marcados visualmente (*)
   - [ ] Marcados com `aria-required="true"` ou `required`

4. **Instruções**
   - [ ] Fornecidas quando necessário (ex: formato de senha)
   - [ ] Associadas com `aria-describedby`

5. **Teclado**
   - [ ] Tab entre campos funciona
   - [ ] Enter submete formulário
   - [ ] Autocomplete funciona com setas

---

## ✅ 7. Imagens e Mídia (2 min)

### Imagens
- [ ] Todas as imagens têm `alt` text
- [ ] Alt text é descritivo (não "imagem123.jpg")
- [ ] Imagens decorativas têm `alt=""` ou `aria-hidden="true"`
- [ ] Ícones funcionais têm `aria-label`

### Componente OptimizedImage
```tsx
// Verificar que usa alt
<OptimizedImage
  src="photo.jpg"
  alt="Descrição da imagem"
/>
```

---

## ✅ 8. Modais e Dialogs (2 min)

### Testar Dialog de Confirmação

1. **Abrir Modal**
   - [ ] Foco move para modal automaticamente
   - [ ] Primeiro elemento focável recebe foco

2. **Navegação**
   - [ ] Tab fica preso no modal (focus trap)
   - [ ] Shift+Tab funciona corretamente
   - [ ] Ciclo completo de Tab (último→primeiro)

3. **Fechar**
   - [ ] ESC fecha modal
   - [ ] Botão X fecha modal
   - [ ] Foco retorna ao elemento que abriu o modal

4. **ARIA**
   - [ ] Modal tem `role="dialog"`
   - [ ] Modal tem `aria-labelledby` apontando para título
   - [ ] Modal tem `aria-describedby` se houver descrição
   - [ ] Background tem `aria-hidden="true"` ou overlay adequado

---

## ✅ 9. Componentes Interativos (3 min)

### Tabs
- [ ] Navegação com Arrow Left/Right
- [ ] Ativação com Enter/Space
- [ ] Tab pula para conteúdo do painel
- [ ] `role="tablist"`, `role="tab"`, `role="tabpanel"`
- [ ] `aria-selected` no tab ativo

### Dropdowns/Combobox
- [ ] Abre com Enter/Space/Arrow Down
- [ ] Fecha com ESC
- [ ] Navega opções com Arrow Up/Down
- [ ] Seleciona com Enter
- [ ] `aria-expanded` reflete estado

### Tooltips
- [ ] Aparecem com hover E com foco de teclado
- [ ] Desaparecem com ESC
- [ ] Não bloqueiam conteúdo importante
- [ ] Conteúdo acessível via `aria-describedby` ou similar

### Accordion
- [ ] Expande/colapsa com Enter/Space
- [ ] `aria-expanded` correto
- [ ] Headers são botões (não divs clicáveis)

---

## ✅ 10. Configurações de Acessibilidade (2 min)

### Ir para `/settings` → Acessibilidade

1. **Alto Contraste**
   - [ ] Toggle funciona
   - [ ] Contraste visualmente aumenta
   - [ ] Persiste após reload

2. **Tamanho de Fonte**
   - [ ] Slider funciona
   - [ ] Mudança imediata
   - [ ] Presets (100%, 125%, 150%) funcionam

3. **Redução de Movimento**
   - [ ] Toggle funciona
   - [ ] Animações param/reduzem
   - [ ] Transições instantâneas

4. **Atalhos de Teclado**
   - [ ] Podem ser desativados
   - [ ] Lista de atalhos acessível (Cmd+/)

5. **Modo Leitor de Tela**
   - [ ] Toggle funciona
   - [ ] Otimizações aplicadas

---

## ✅ 11. Compatibilidade de Navegadores (5 min)

### Chrome
- [ ] Navegação por teclado funciona
- [ ] Focus visível
- [ ] Screen reader compatível

### Firefox
- [ ] Navegação por teclado funciona
- [ ] Focus visível
- [ ] Screen reader compatível

### Safari
- [ ] Navegação por teclado funciona
- [ ] Focus visível
- [ ] VoiceOver funciona

### Edge
- [ ] Navegação por teclado funciona
- [ ] Focus visível
- [ ] Narrator funciona

---

## ✅ 12. Mobile/Touch (5 min)

### Responsividade
- [ ] Layout mobile funciona em 320px
- [ ] Sem scroll horizontal indesejado
- [ ] Conteúdo reorganiza apropriadamente

### Touch Targets
- [ ] Botões têm mínimo 44x44px
- [ ] Espaçamento adequado entre elementos clicáveis
- [ ] Fácil tocar no alvo correto

### Orientação
- [ ] Funciona em portrait e landscape
- [ ] Conteúdo não depende de orientação específica

---

## ✅ 13. Landmarks e Estrutura (2 min)

### HTML Semântico
```html
<!-- Verificar que existem -->
<header> ou role="banner"
<nav> ou role="navigation"
<main> ou role="main"
<aside> ou role="complementary"
<footer> ou role="contentinfo"
```

### Headings
- [ ] Hierarquia lógica (h1 → h2 → h3, sem pulos)
- [ ] Cada página tem h1 único
- [ ] Headings descrevem seção

### SkipLink
- [ ] Existe no topo da página
- [ ] Fica visível ao receber foco
- [ ] Funciona (pula para conteúdo principal)

---

## ✅ 14. Estados e Feedback (2 min)

### Loading
- [ ] Estado de loading anunciado (`aria-busy="true"`)
- [ ] Spinner tem label para SR
- [ ] Não bloqueia teclado desnecessariamente

### Success/Error
- [ ] Mensagens de sucesso anunciadas (role="status")
- [ ] Mensagens de erro anunciadas (role="alert")
- [ ] Visualmente distintas (cor + ícone + texto)

### Disabled
- [ ] Elementos disabled têm `disabled` attribute
- [ ] Visualmente diferentes
- [ ] Não recebem foco

---

## ✅ 15. Performance de A11y (1 min)

### Lighthouse CI
```bash
# Verificar métricas
npm run test:lighthouse

# Resultados esperados
- [ ] Accessibility: >= 90
- [ ] Sem erros críticos
```

### axe-core Tests
```bash
# Executar testes
npm test

# Verificar
- [ ] Todos os testes de a11y passam
```

---

## Relatório de Validação

### Informações
- **Data:** ___/___/______
- **Testador:** _________________
- **Versão:** _________________
- **Navegador(es):** _________________
- **Screen Reader:** _________________

### Resultados
- **Lighthouse Score:** ___/100
- **axe Violations:** Críticas: ___ | Sérias: ___ | Moderadas: ___ | Menores: ___
- **Navegação por Teclado:** ☐ Passou ☐ Falhou
- **Screen Reader:** ☐ Passou ☐ Falhou
- **Contraste:** ☐ Passou ☐ Falhou
- **Zoom 200%:** ☐ Passou ☐ Falhou
- **Formulários:** ☐ Passou ☐ Falhou

### Problemas Encontrados
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Ações Necessárias
- [ ] _______________________________________________
- [ ] _______________________________________________
- [ ] _______________________________________________

### Aprovação
- [ ] **APROVADO** - Sistema conforme WCAG 2.1 AA
- [ ] **REPROVADO** - Requer correções antes de deploy

---

## Recursos Rápidos

### Ferramentas
- axe DevTools: https://www.deque.com/axe/devtools/
- WAVE: https://wave.webaim.org/extension/
- Contrast Checker: https://webaim.org/resources/contrastchecker/
- NVDA: https://www.nvaccess.org/download/

### Documentação
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Practices: https://www.w3.org/WAI/ARIA/apg/
- MDN A11y: https://developer.mozilla.org/en-US/docs/Web/Accessibility

### Contato
- **Questões A11y:** acessibilidade@imobibase.com
- **Documentação:** Ver AGENTE_14_*.md

---

**Nota:** Este checklist deve ser executado:
- Antes de cada release major
- Após mudanças significativas de UI
- Quando novos componentes são adicionados
- Pelo menos trimestralmente

**Tempo Total:** ~30-45 minutos para validação completa

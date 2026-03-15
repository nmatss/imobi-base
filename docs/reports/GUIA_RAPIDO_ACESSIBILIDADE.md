# GUIA RÁPIDO DE ACESSIBILIDADE - ImobiBase

## Para Usuários

### Atalhos de Teclado

| Windows/Linux    | Mac         | Ação                     |
| ---------------- | ----------- | ------------------------ |
| Ctrl + K         | ⌘ K         | Busca global             |
| Ctrl + H         | ⌘ H         | Ir para Dashboard        |
| Ctrl + P         | ⌘ P         | Ir para Imóveis          |
| Ctrl + L         | ⌘ L         | Ir para Leads            |
| Ctrl + C         | ⌘ C         | Ir para Agenda           |
| Ctrl + T         | ⌘ T         | Ir para Propostas        |
| Ctrl + ,         | ⌘ ,         | Abrir Configurações      |
| Ctrl + /         | ⌘ /         | Mostrar todos os atalhos |
| Ctrl + Shift + N | ⌘ ⇧ N       | Criar novo imóvel        |
| Tab              | Tab         | Próximo elemento         |
| Shift + Tab      | ⇧ Tab       | Elemento anterior        |
| Enter/Space      | Enter/Space | Ativar botão/link        |
| Esc              | Esc         | Fechar modal             |

### Navegação Rápida

#### 1. Skip Link (ao pressionar Tab na página):

```
"Pular para o conteúdo principal"
```

Pula a navegação e vai direto para o conteúdo.

#### 2. Busca Global (Ctrl/⌘ + K):

- Digite para buscar imóveis, leads, contratos
- Use setas ↑↓ para navegar nos resultados
- Enter para selecionar

#### 3. Configurações de Acessibilidade:

```
Configurações (Ctrl/⌘ + ,) → Aba "Acessibilidade"
```

**Opções disponíveis**:

- ☐ Modo Alto Contraste
- ☐ Reduzir Movimento
- ☐ Modo Leitor de Tela
- 📏 Tamanho da Fonte: 100% - 150%
- ⌨️ Atalhos de Teclado: On/Off

### Timeout de Sessão

**Aviso aos 25 minutos** (sessão de 30min):

```
┌─────────────────────────────────────┐
│  ⚠️  Sua sessão vai expirar         │
│                                      │
│  Tempo restante: 5:00                │
│  ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                 │
│                                      │
│  [Sair agora] [Continuar conectado] │
└─────────────────────────────────────┘
```

- Countdown em tempo real
- Anúncios para leitores de tela (a cada minuto)
- Clique em "Continuar conectado" para estender

---

## Para Desenvolvedores

### Checklist de Acessibilidade

#### ✅ Antes de criar um componente:

```typescript
1. [ ] Todos os botões icon-only têm aria-label
2. [ ] Formulários têm labels visíveis ou aria-label
3. [ ] Imagens têm alt text descritivo
4. [ ] Inputs têm htmlFor/id corretos
5. [ ] Contraste mínimo 4.5:1 (texto normal)
6. [ ] Touch targets mínimo 44x44px
7. [ ] Focusable elements têm outline visível
8. [ ] Modais podem ser fechados com Esc
9. [ ] Loading states têm aria-live
10. [ ] Erros têm role="alert" ou aria-live
```

### Exemplos de Uso

#### 1. Botão Icon-Only:

```tsx
// ❌ Errado
<Button size="icon">
  <Trash2 className="h-4 w-4" />
</Button>

// ✅ Correto
<Button size="icon" aria-label="Excluir item">
  <Trash2 className="h-4 w-4" />
</Button>
```

#### 2. Input com Label:

```tsx
// ❌ Errado
<input type="text" placeholder="Nome" />

// ✅ Correto
<Label htmlFor="name">Nome</Label>
<Input id="name" type="text" placeholder="Digite seu nome" />
```

#### 3. Anúncios para Screen Reader:

```tsx
import { useAnnouncer } from "@/hooks/useAnnouncer";

function MyComponent() {
  const { announce } = useAnnouncer();

  const handleSave = async () => {
    await save();
    announce("Item salvo com sucesso", "polite");
  };

  const handleError = () => {
    announce("Erro ao salvar item", "assertive");
  };

  return <Button onClick={handleSave}>Salvar</Button>;
}
```

#### 4. Loading State:

```tsx
// ✅ Com anúncio
<div role="status" aria-live="polite">
  {loading ? (
    <>
      <Loader2 className="animate-spin" />
      <span className="sr-only">Carregando...</span>
    </>
  ) : (
    content
  )}
</div>
```

#### 5. Error State:

```tsx
// ✅ Com role alert
{
  error && (
    <div role="alert" className="text-destructive">
      {error}
    </div>
  );
}
```

#### 6. Modal Acessível:

```tsx
import { Dialog } from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título do Modal</DialogTitle>
      <DialogDescription>Descrição do que o modal faz</DialogDescription>
    </DialogHeader>
    {/* conteúdo */}
  </DialogContent>
</Dialog>;
```

### Hooks de Acessibilidade

#### 1. useAnnouncer (Screen Reader):

```tsx
const { announce } = useAnnouncer();

// Polite (não interrompe)
announce("5 novos leads recebidos", "polite");

// Assertive (interrompe)
announce("Erro crítico!", "assertive");
```

#### 2. useFocusTrap (Modal Focus):

```tsx
const { trapRef } = useFocusTrap(isOpen);

<div ref={trapRef}>{/* Foco fica preso aqui quando isOpen=true */}</div>;
```

#### 3. useKeyboardNav (Navegação):

```tsx
const { handleKeyDown } = useKeyboardNav({
  onArrowUp: () => selectPrevious(),
  onArrowDown: () => selectNext(),
  onEnter: () => confirmSelection(),
  onEscape: () => cancel(),
});

<div onKeyDown={handleKeyDown}>...</div>;
```

#### 4. useReducedMotion (Animações):

```tsx
const prefersReducedMotion = useReducedMotion();

<motion.div animate={prefersReducedMotion ? {} : { scale: 1.2 }}>
  {content}
</motion.div>;
```

### Componentes de Acessibilidade

#### 1. SkipLink:

```tsx
import { SkipLink } from "@/components/accessible/SkipLink";

<SkipLink targetId="main-content">Pular para o conteúdo principal</SkipLink>;

{
  /* ... */
}

<main id="main-content" tabIndex={-1}>
  {children}
</main>;
```

#### 2. VisuallyHidden:

```tsx
import { VisuallyHidden } from "@/components/accessible/VisuallyHidden";

<button>
  <Icon />
  <VisuallyHidden>Excluir item</VisuallyHidden>
</button>;
```

#### 3. Landmark:

```tsx
import { Landmark } from "@/components/accessible/Landmark";

<Landmark type="navigation" label="Menu principal">
  <nav>...</nav>
</Landmark>;
```

#### 4. LiveRegion:

```tsx
import { LiveRegion } from "@/components/accessible/LiveRegion";

<LiveRegion priority="polite">{statusMessage}</LiveRegion>;
```

### CSS Classes Úteis

```css
.sr-only              /* Screen reader only */
.skip-link            /* Skip navigation link */
.touch-target         /* 44x44px minimum */
.focus-ring           /* Focus indicator */
.reduce-motion        /* Disable animations */
.high-contrast        /* High contrast mode */
```

### Testes Automatizados

#### 1. Adicionar ao package.json:

```json
{
  "scripts": {
    "test:a11y": "axe http://localhost:3000",
    "lighthouse": "lighthouse http://localhost:3000 --view"
  }
}
```

#### 2. Testar componente:

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Para QA/Testes

### Checklist de Testes

#### Navegação por Teclado:

```
1. [ ] Tab através de todos os elementos (ordem lógica)
2. [ ] Shift+Tab volta corretamente
3. [ ] Enter/Space ativa botões e links
4. [ ] Esc fecha modais e dropdowns
5. [ ] Setas navegam em listas/selects
6. [ ] Foco sempre visível (outline/ring)
7. [ ] Sem keyboard trap
8. [ ] SkipLink funciona (Tab no topo da página)
```

#### Screen Readers:

```
1. [ ] Todos os botões têm labels
2. [ ] Todos os inputs têm labels
3. [ ] Imagens têm alt text
4. [ ] Loading states anunciados
5. [ ] Erros anunciados
6. [ ] Mudanças de estado anunciadas
7. [ ] Landmarks detectados (navigation, main, etc)
8. [ ] Headings em ordem (h1 → h2 → h3)
```

#### Contraste de Cores:

```
1. [ ] Texto normal: mínimo 4.5:1
2. [ ] Texto grande: mínimo 3:1
3. [ ] Ícones: mínimo 3:1
4. [ ] Estados (hover, focus): visíveis
5. [ ] Modo alto contraste funciona
```

#### Touch Targets:

```
1. [ ] Botões: mínimo 44x44px
2. [ ] Links: mínimo 44x44px
3. [ ] Checkboxes: mínimo 44x44px
4. [ ] Radio buttons: mínimo 44x44px
```

#### Timeout:

```
1. [ ] Modal aparece aos 25 minutos
2. [ ] Countdown funciona
3. [ ] "Continuar conectado" estende sessão
4. [ ] Logout automático aos 30 minutos
5. [ ] Anúncios para screen reader funcionam
```

### Ferramentas de Teste

#### Chrome DevTools Lighthouse:

```
1. F12 → Lighthouse
2. Category: Accessibility
3. Generate report
4. Target: 100 score
```

#### axe DevTools:

```
1. Install extension
2. F12 → axe DevTools
3. Scan page
4. Fix issues
```

#### WAVE:

```
1. Install extension
2. Click WAVE icon
3. Review errors/alerts
4. Fix issues
```

#### Keyboard Navigation:

```
1. Unplug mouse
2. Navigate entire app with keyboard only
3. Document any issues
```

#### Screen Reader (NVDA/VoiceOver):

```
1. NVDA: Download from nvaccess.org
2. VoiceOver: Cmd+F5 (Mac)
3. Navigate entire app
4. Verify all content announced correctly
```

---

## FAQ

### P: Como desabilitar animações?

**R**: Configurações → Acessibilidade → ☑ Reduzir Movimento

### P: Como aumentar o tamanho da fonte?

**R**: Configurações → Acessibilidade → Tamanho da Fonte: 125% ou 150%

### P: Os atalhos de teclado não funcionam?

**R**: Verifique se não está em um input/textarea. Se ainda não funcionar, vá em Configurações → Acessibilidade → ☑ Atalhos de Teclado

### P: Como ver todos os atalhos disponíveis?

**R**: Pressione Ctrl/⌘ + / a qualquer momento

### P: A sessão expirou muito rápido?

**R**: Sessão padrão é 30 minutos. Você receberá um aviso aos 25 minutos. Clique em "Continuar conectado" para estender.

### P: Como ativar o modo alto contraste?

**R**: Configurações → Acessibilidade → ☑ Modo Alto Contraste

### P: Não consigo navegar por teclado?

**R**: Certifique-se de:

1. Não está em um modal sem foco
2. Pressione Tab (não setas) para navegar entre elementos
3. Use Enter/Space para ativar elementos

### P: Como testar com screen reader?

**R**:

- **Windows**: Baixe NVDA (gratuito) em nvaccess.org
- **Mac**: Pressione Cmd+F5 para ativar VoiceOver
- **Linux**: Orca (geralmente pré-instalado)

---

## Suporte

### Reportar Problema de Acessibilidade:

```
1. Descreva o problema
2. Informe o navegador/SO
3. Informe se usa screen reader (qual?)
4. Steps to reproduce
5. Envie para: acessibilidade@imobibase.com
```

### Prioridade de Correção:

- 🔴 **Crítico**: Impede uso completo (24h)
- 🟡 **Alto**: Dificulta uso significativo (48h)
- 🟢 **Médio**: Inconveniente (1 semana)
- ⚪ **Baixo**: Melhoria (backlog)

---

_Guia de Acessibilidade - ImobiBase v1.0_
_Atualizado em: 2025-12-25_

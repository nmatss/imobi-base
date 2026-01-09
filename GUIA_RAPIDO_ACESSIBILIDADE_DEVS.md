# Guia Rápido de Acessibilidade para Desenvolvedores

## Índice Rápido
1. [Checklist Diária](#checklist-diária)
2. [Componentes Acessíveis](#componentes-acessíveis)
3. [Padrões ARIA](#padrões-aria)
4. [Navegação por Teclado](#navegação-por-teclado)
5. [Testes A11y](#testes-a11y)
6. [Erros Comuns](#erros-comuns)

## Checklist Diária

Antes de fazer commit, verifique:

- [ ] Todos os inputs têm `<Label>` associado
- [ ] Imagens têm `alt` text
- [ ] Botões têm texto ou `aria-label`
- [ ] Focus é visível em todos elementos interativos
- [ ] Cores têm contraste mínimo 4.5:1
- [ ] Funcionalidade disponível via teclado
- [ ] eslint não mostra erros jsx-a11y
- [ ] Testado com Tab e Enter

## Componentes Acessíveis

### Input com Label

✅ **CORRETO:**
```tsx
<div>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>
```

❌ **INCORRETO:**
```tsx
<Input placeholder="Email" /> {/* Placeholder NÃO substitui label! */}
```

### Button com Loading

✅ **CORRETO:**
```tsx
<Button isLoading={loading} aria-label="Salvando">
  {loading ? <Spinner /> : "Salvar"}
</Button>
```

❌ **INCORRETO:**
```tsx
<Button disabled={loading}>
  {loading && <Spinner />} {/* Screen reader não sabe o estado */}
</Button>
```

### Icon Button

✅ **CORRETO:**
```tsx
<Button variant="ghost" size="icon" aria-label="Fechar">
  <X className="h-4 w-4" />
</Button>
```

❌ **INCORRETO:**
```tsx
<Button>
  <X /> {/* Sem texto = inacessível */}
</Button>
```

### Dialog/Modal

✅ **CORRETO:**
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmar Exclusão</DialogTitle>
      <DialogDescription>
        Esta ação não pode ser desfeita.
      </DialogDescription>
    </DialogHeader>
    {/* Conteúdo */}
  </DialogContent>
</Dialog>
```

### Lista Interativa

✅ **CORRETO:**
```tsx
<ul role="list">
  {items.map(item => (
    <li key={item.id}>
      <button onClick={() => select(item)}>
        {item.name}
      </button>
    </li>
  ))}
</ul>
```

### Badge/Status

✅ **CORRETO:**
```tsx
<Badge role="status" aria-label={`Status: ${status}`}>
  {status}
</Badge>
```

### Links

✅ **CORRETO:**
```tsx
<a href="/properties/123">
  Ver detalhes do imóvel Casa no Centro
</a>
```

❌ **INCORRETO:**
```tsx
<a href="/properties/123">
  Clique aqui {/* Não descritivo */}
</a>
```

## Padrões ARIA

### Quando usar ARIA

**Regra de Ouro:** HTML semântico primeiro, ARIA apenas quando necessário!

### ARIA Labels

```tsx
// Quando o texto visual não é suficiente
<button aria-label="Fechar modal de cadastro">
  <X />
</button>

// Quando precisa de mais contexto
<button aria-label="Deletar imóvel Casa no Centro">
  <Trash2 />
</button>
```

### ARIA Described By

```tsx
// Associar descrição a input
<div>
  <Label htmlFor="password">Senha</Label>
  <Input
    id="password"
    type="password"
    aria-describedby="password-hint"
  />
  <p id="password-hint" className="text-sm text-muted-foreground">
    Mínimo 8 caracteres, incluindo número e letra maiúscula
  </p>
</div>
```

### ARIA Live Regions

```tsx
import { useAnnouncer } from '@/hooks/useAnnouncer';

function MyComponent() {
  const { announce } = useAnnouncer();

  const handleSave = async () => {
    await saveData();
    announce("Lead salvo com sucesso", "polite");
  };

  return <button onClick={handleSave}>Salvar</button>;
}
```

### Estados ARIA

```tsx
// Expandido/Colapsado
<button
  aria-expanded={isOpen}
  aria-controls="details-panel"
>
  Ver Detalhes
</button>

// Selecionado
<button
  role="tab"
  aria-selected={isActive}
>
  Aba 1
</button>

// Pressionado (toggle)
<button
  aria-pressed={isFavorite}
  onClick={toggleFavorite}
>
  Favoritar
</button>

// Loading
<button aria-busy={loading}>
  {loading ? "Carregando..." : "Enviar"}
</button>
```

## Navegação por Teclado

### Teclas Padrão

| Tecla | Ação |
|-------|------|
| `Tab` | Próximo elemento |
| `Shift + Tab` | Elemento anterior |
| `Enter` | Ativar botão/link |
| `Space` | Ativar botão/checkbox |
| `Esc` | Fechar modal/dropdown |
| `Arrow Keys` | Navegar em listas/menus |
| `Home` | Primeiro elemento |
| `End` | Último elemento |

### Implementar Navegação Customizada

```tsx
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

function CustomMenu() {
  const containerRef = useRef<HTMLDivElement>(null);

  useKeyboardNav({
    containerRef,
    itemSelector: '[role="menuitem"]',
    orientation: 'vertical',
    onSelect: (element) => {
      // Ação ao pressionar Enter/Space
    },
  });

  return (
    <div ref={containerRef} role="menu">
      <button role="menuitem">Opção 1</button>
      <button role="menuitem">Opção 2</button>
      <button role="menuitem">Opção 3</button>
    </div>
  );
}
```

### Focus Trap em Modal

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap';

function Modal({ isOpen, onClose }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    containerRef,
    enabled: isOpen,
    onEscape: onClose,
  });

  return (
    <div ref={containerRef}>
      {/* Conteúdo do modal */}
    </div>
  );
}
```

### Skip Link

```tsx
import { SkipLink } from '@/components/accessible/SkipLink';

function Layout() {
  return (
    <>
      <SkipLink targetId="main-content">
        Pular para conteúdo principal
      </SkipLink>
      <nav>{/* Navegação */}</nav>
      <main id="main-content" tabIndex={-1}>
        {/* Conteúdo principal */}
      </main>
    </>
  );
}
```

## Testes A11y

### Testes Automatizados

```tsx
import { axe } from 'jest-axe';
import { render } from '@testing-library/react';

test('deve ser acessível', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Teste Manual Rápido

1. **Navegação por Teclado (2 min)**
   ```
   - Tab através da página
   - Enter/Space nos botões
   - Esc fecha modais?
   - Focus sempre visível?
   ```

2. **Zoom (1 min)**
   ```
   - Cmd/Ctrl + para 200%
   - Conteúdo ainda legível?
   - Sem scroll horizontal?
   ```

3. **Contraste (30 seg)**
   ```
   - Use DevTools > Color Picker
   - Contraste mínimo 4.5:1 para texto
   - Contraste mínimo 3:1 para UI
   ```

4. **Screen Reader (5 min)**
   ```
   - Mac: Cmd + F5 (VoiceOver)
   - Windows: NVDA (gratuito)
   - Navegue com setas
   - Informação faz sentido?
   ```

### Ferramentas de Desenvolvimento

```bash
# Lighthouse no terminal
npx lighthouse http://localhost:5000 --only-categories=accessibility

# axe DevTools Extension
# Instale: https://www.deque.com/axe/devtools/

# WAVE Extension
# Instale: https://wave.webaim.org/extension/
```

## Erros Comuns

### ❌ Input sem Label

```tsx
// ERRADO
<Input placeholder="Nome" />

// CERTO
<div>
  <Label htmlFor="name">Nome</Label>
  <Input id="name" />
</div>
```

### ❌ Div clicável sem role

```tsx
// ERRADO
<div onClick={handleClick}>Clique aqui</div>

// CERTO
<button onClick={handleClick}>Clique aqui</button>
```

### ❌ Ícone sem alternativa

```tsx
// ERRADO
<Delete />

// CERTO
<button aria-label="Deletar item">
  <Delete />
</button>
```

### ❌ Contraste baixo

```tsx
// ERRADO
<p className="text-gray-400">Texto importante</p> // 2.5:1

// CERTO
<p className="text-gray-600">Texto importante</p> // 4.5:1
```

### ❌ Mensagem de erro inacessível

```tsx
// ERRADO
{error && <p className="text-red-500">{error}</p>}

// CERTO
import { LiveRegion } from '@/components/accessible/LiveRegion';

{error && (
  <LiveRegion aria-live="assertive" role="alert">
    <p className="text-destructive">{error}</p>
  </LiveRegion>
)}
```

### ❌ Tooltip não acessível

```tsx
// ERRADO
<div onMouseEnter={showTooltip}>Info</div>

// CERTO
import { Tooltip } from '@/components/ui/tooltip';

<Tooltip>
  <TooltipTrigger>Info</TooltipTrigger>
  <TooltipContent>
    Informação adicional
  </TooltipContent>
</Tooltip>
```

### ❌ Form sem validação acessível

```tsx
// ERRADO
<Input
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
{!isValid && <span>Email inválido</span>}

// CERTO
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    aria-invalid={!isValid}
    aria-describedby={!isValid ? "email-error" : undefined}
  />
  {!isValid && (
    <p id="email-error" role="alert" className="text-destructive">
      Por favor, insira um email válido
    </p>
  )}
</div>
```

## Utilitários CSS

### Classes A11y Prontas

```tsx
// Esconder visualmente, mas manter para screen readers
<span className="sr-only">Descrição para leitores de tela</span>

// Focus visível
<button className="focus-ring">Botão</button>

// Touch target mínimo (44x44px)
<button className="touch-target">OK</button>

// Redução de movimento
<div className="reduce-motion">
  {/* Sem animações se usuário preferir */}
</div>

// Alto contraste
<div className="high-contrast">
  {/* Cores de alto contraste */}
</div>
```

### Criar Componente Acessível

Template básico:

```tsx
interface MyComponentProps {
  /** Descrição acessível */
  ariaLabel?: string;
  /** ID do elemento que descreve este componente */
  ariaDescribedBy?: string;
  /** Se está desabilitado */
  disabled?: boolean;
}

export function MyComponent({
  ariaLabel,
  ariaDescribedBy,
  disabled = false,
  children,
}: MyComponentProps) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled}
      className="focus-ring"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  );
}
```

## Hooks de Acessibilidade

### useAnnouncer

```tsx
import { useAnnouncer } from '@/hooks/useAnnouncer';

const { announce } = useAnnouncer();

// Anúncio polido (não interrompe)
announce("Lead criado com sucesso", "polite");

// Anúncio assertivo (interrompe)
announce("Erro ao salvar!", "assertive");
```

### useFocusTrap

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap';

const containerRef = useRef<HTMLDivElement>(null);

useFocusTrap({
  containerRef,
  enabled: isModalOpen,
  onEscape: closeModal,
});
```

### useKeyboardNav

```tsx
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

const containerRef = useRef<HTMLDivElement>(null);

useKeyboardNav({
  containerRef,
  itemSelector: 'button',
  orientation: 'vertical',
  loop: true,
  onSelect: (element) => element.click(),
});
```

### useReducedMotion

```tsx
import { useReducedMotion } from '@/hooks/useReducedMotion';

const shouldReduceMotion = useReducedMotion();

return (
  <motion.div
    animate={shouldReduceMotion ? {} : { x: 100 }}
  >
    Conteúdo
  </motion.div>
);
```

## Referências Rápidas

### WCAG 2.1 AA Quick Reference

- **Texto:** Contraste mínimo 4.5:1
- **UI:** Contraste mínimo 3:1
- **Touch targets:** Mínimo 44x44px
- **Zoom:** Suportar até 200%
- **Teclado:** Toda funcionalidade acessível
- **Focus:** Sempre visível (outline/ring)

### ARIA Roles Comuns

| Role | Quando Usar |
|------|-------------|
| `button` | Elemento clicável que não é `<button>` |
| `link` | Elemento clicável que não é `<a>` |
| `dialog` | Modal/Dialog |
| `alert` | Mensagem importante/erro |
| `status` | Atualização de status |
| `navigation` | Menu de navegação |
| `search` | Formulário de busca |
| `main` | Conteúdo principal |
| `complementary` | Conteúdo complementar/sidebar |

### Teclado Shortcuts

No arquivo de shortcuts do sistema:

```tsx
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';

// Usar o componente global
<KeyboardShortcuts />

// Ver todos os atalhos: Cmd/Ctrl + /
```

## Links Úteis

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA Practices](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [Radix UI - Primitives Acessíveis](https://www.radix-ui.com/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

## Suporte

Dúvidas sobre acessibilidade?

1. Consulte este guia
2. Veja exemplos no Storybook
3. Procure no código por componentes similares
4. Entre em contato com o time de A11y

---

**Lembre-se:** Acessibilidade não é opcional. É um requisito!

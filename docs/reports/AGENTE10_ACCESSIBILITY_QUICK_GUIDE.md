# GUIA RÁPIDO DE ACESSIBILIDADE - WCAG AA

> **Para desenvolvedores:** Checklist prático para manter WCAG AA em novas features

---

## 🎯 GOLDEN RULES

1. **NUNCA** confiar apenas em cor para comunicar informação
2. **SEMPRE** adicionar labels aos inputs (htmlFor/id)
3. **SEMPRE** testar com teclado (Tab, Enter, Esc)
4. **SEMPRE** adicionar aria-label em buttons sem texto
5. **SEMPRE** usar contraste 4.5:1 mínimo

---

## ✅ CHECKLIST POR COMPONENTE

### 📝 FORMS

```tsx
// ❌ ERRADO
<input placeholder="Nome" />;

// ✅ CORRETO
import { FormField } from "@/components/ui/form-field";

<FormField
  id="user-name"
  label="Nome"
  required={true}
  error={errors.name?.message}
>
  <Input />
</FormField>;
```

**O que o FormField faz automaticamente:**

- ✅ Associa label com input (htmlFor/id)
- ✅ Adiciona aria-required
- ✅ Adiciona aria-invalid em erros
- ✅ Adiciona aria-describedby para erros
- ✅ Indicador visual \* para obrigatório

### 🔘 BUTTONS

```tsx
// ❌ ERRADO - Button sem texto ou label
<Button variant="ghost">
  <Menu />
</Button>

// ✅ CORRETO - Com aria-label
<Button variant="ghost" aria-label="Abrir menu">
  <Menu aria-hidden="true" />
</Button>

// ✅ CORRETO - Com texto
<Button variant="default">
  <Plus aria-hidden="true" />
  Novo Lead
</Button>
```

**Regras:**

- ✅ Sempre adicionar aria-label se não tiver texto
- ✅ Ícones dentro de buttons devem ter aria-hidden="true"
- ✅ Tamanho mínimo 44x44px (touch-target)

### 🏷️ BADGES E STATUS

```tsx
// ❌ ERRADO - Apenas cor
<Badge className="bg-green-500">Ativo</Badge>;

// ✅ CORRETO - Ícone + Texto + Cor
import { StatusBadge } from "@/components/ui/StatusBadge";

<StatusBadge status="success" label="Ativo" />;
// Renderiza: [✓] Ativo (fundo verde)
```

**O que o StatusBadge faz:**

- ✅ Ícone + texto + cor (3 formas de comunicar)
- ✅ Contraste 4.5:1 validado
- ✅ ARIA label automático
- ✅ Border para melhor definição

### 🎨 CORES

**Use cores pré-validadas:**

```tsx
import { WCAG_AA_COLORS } from "@/lib/accessibility-utils";

// Cores de status (4.5:1+)
const statusColor = WCAG_AA_COLORS.status.success;
// { bg: '#047857', text: '#FFFFFF', contrast: 5.12 }

// Validar nova cor:
import { validateContrast } from "@/lib/accessibility-utils";

const result = validateContrast("#047857", "#FFFFFF");
// { ratio: 5.12, aa: true, aaa: false, level: 'AA' }
```

**Cores aprovadas:**

- Success: `bg-emerald-700 text-white` (5.12:1)
- Warning: `bg-amber-700 text-white` (4.59:1)
- Error: `bg-red-700 text-white` (5.52:1)
- Info: `bg-blue-700 text-white` (7.26:1)
- Neutral: `bg-slate-700 text-white` (9.29:1)

### 🪟 MODALS/DIALOGS

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Adicionar Lead</DialogTitle>
    </DialogHeader>

    {/* Focus automático no primeiro campo */}
    <FormField id="name" label="Nome" required>
      <Input />
    </FormField>

    <Button type="submit">Salvar</Button>
  </DialogContent>
</Dialog>;
```

**O que o Dialog faz automaticamente:**

- ✅ Focus trap (Tab fica dentro)
- ✅ Auto-focus no primeiro input
- ✅ Esc fecha o modal
- ✅ Retorna focus ao elemento que abriu
- ✅ Overlay com backdrop

### 🔍 ÍCONES

```tsx
// ❌ ERRADO - Ícone sozinho, sem contexto
<Search className="w-5 h-5" />

// ✅ CORRETO - Ícone decorativo (dentro de button)
<Button aria-label="Buscar">
  <Search aria-hidden="true" className="w-5 h-5" />
</Button>

// ✅ MELHOR - Ícone + Texto
<Button>
  <Search aria-hidden="true" className="w-5 h-5" />
  Buscar
</Button>
```

**Helper para ícones:**

```tsx
const iconA11yProps = {
  "aria-hidden": true,
  focusable: false
} as const;

// Uso:
<Menu {...iconA11yProps} />
<Bell {...iconA11yProps} />
```

### 🗺️ NAVEGAÇÃO

```tsx
// ✅ Estrutura semântica correta
<nav role="navigation" aria-label="Menu principal">
  {/* Links de navegação */}
</nav>

<main id="main-content" role="main">
  {/* Conteúdo principal */}
</main>

<aside role="complementary" aria-label="Filtros">
  {/* Sidebar/Filtros */}
</aside>

<footer role="contentinfo">
  {/* Rodapé */}
</footer>
```

**Skip Navigation:**

```tsx
import { SkipLink } from "@/components/accessible/SkipLink";

<SkipLink targetId="main-content">Pular para o conteúdo principal</SkipLink>;
```

---

## 🧪 TESTES RÁPIDOS

### 1. Teste de Teclado (30 segundos)

```
1. Abra a página
2. Pressione Tab repetidamente
3. Verifique:
   ✅ Todos os elementos interativos são alcançáveis
   ✅ Focus visível (borda azul 2px)
   ✅ Ordem lógica (esquerda > direita, cima > baixo)
   ✅ Enter ativa botões/links
   ✅ Esc fecha modals
```

### 2. Teste de Contraste (10 segundos)

```
Chrome DevTools > Elementos > Selecione texto
Veja "Contrast" no painel Styles
✅ Verde = AA aprovado (4.5:1+)
❌ Laranja/Vermelho = Reprovar
```

### 3. Teste de Screen Reader (Opcional)

```
Windows: NVDA (gratuito)
Mac: VoiceOver (built-in)

Navegue com Tab e ouça:
✅ Labels são lidos corretamente
✅ Buttons têm nomes descritivos
✅ Erros são anunciados
```

---

## 📋 CHECKLIST DE REVISÃO

Antes de abrir PR, verificar:

**Forms:**

- [ ] Todos os inputs têm labels associados (htmlFor/id)
- [ ] Campos obrigatórios têm indicador visual (\*)
- [ ] Campos obrigatórios têm aria-required="true"
- [ ] Erros têm aria-invalid e aria-describedby
- [ ] Mensagens de erro têm role="alert"

**Buttons:**

- [ ] Buttons sem texto têm aria-label
- [ ] Ícones têm aria-hidden="true"
- [ ] Tamanho mínimo 44x44px (ou classe touch-target)
- [ ] Focus visível em todos

**Cores:**

- [ ] Contraste mínimo 4.5:1 (texto normal)
- [ ] Contraste mínimo 3:1 (texto grande 18pt+)
- [ ] Não confiar apenas em cor (usar ícone + texto)

**Navegação:**

- [ ] Skip navigation link presente
- [ ] Todos interativos acessíveis por teclado
- [ ] Focus visível (outline 2px+)
- [ ] HTML semântico (nav, main, aside, section)

**Modals:**

- [ ] Focus trap implementado
- [ ] Auto-focus no primeiro campo
- [ ] Esc fecha o modal
- [ ] Retorna focus ao elemento que abriu

---

## 🚨 ERROS COMUNS

### ❌ Input sem label

```tsx
// ERRADO
<Input placeholder="Nome" />

// CORRETO
<Label htmlFor="name">Nome</Label>
<Input id="name" />

// MELHOR
<FormField id="name" label="Nome">
  <Input />
</FormField>
```

### ❌ Button sem aria-label

```tsx
// ERRADO
<Button><X /></Button>

// CORRETO
<Button aria-label="Fechar">
  <X aria-hidden="true" />
</Button>
```

### ❌ Contraste insuficiente

```tsx
// ERRADO (2.8:1 - Falha AA)
className = "bg-green-100 text-green-700";

// CORRETO (5.12:1 - Passa AA)
className = "bg-emerald-700 text-white";
```

### ❌ Apenas cor para status

```tsx
// ERRADO
<Badge className="bg-green-500">Ativo</Badge>

// CORRETO
<StatusBadge status="success" label="Ativo" />
// Renderiza: [✓] Ativo
```

### ❌ Ícone sem contexto

```tsx
// ERRADO
<AlertTriangle className="text-yellow-500" />

// CORRETO
<div className="flex items-center gap-2">
  <AlertTriangle aria-hidden="true" className="text-yellow-500" />
  <span>Atenção necessária</span>
</div>
```

---

## 🔧 FERRAMENTAS

### Extensões Chrome/Firefox

1. **axe DevTools** - Auditoria automática
2. **Lighthouse** - Score de acessibilidade
3. **WAVE** - Validação visual

### Validação de Contraste

- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Ou use: `validateContrast()` em `/lib/accessibility-utils.ts`

### Auditoria Automática (Dev)

```typescript
import { logAccessibilityWarnings } from "@/lib/accessibility-utils";

// No main.tsx (apenas dev)
if (process.env.NODE_ENV === "development") {
  setTimeout(() => logAccessibilityWarnings(), 2000);
}
```

---

## 📚 COMPONENTES ACESSÍVEIS

**Use estes componentes (já acessíveis):**

- ✅ `FormField` - Wrapper para inputs
- ✅ `StatusBadge` - Status com ícone + texto
- ✅ `Dialog` - Modal com focus trap
- ✅ `SkipLink` - Skip navigation
- ✅ `Button` - Com focus states
- ✅ `Input` - Com ARIA props
- ✅ `Label` - Radix (acessível)

**Evite criar componentes novos sem validar:**

- ❌ Cores sem validar contraste
- ❌ Buttons sem texto ou aria-label
- ❌ Inputs sem labels
- ❌ Modals sem focus management

---

## 🎓 REFERÊNCIAS

### WCAG 2.1 AA - Critérios Principais

- **1.4.3** Contraste (Mínimo): 4.5:1
- **2.1.1** Teclado: Todas funções acessíveis
- **2.4.7** Foco Visível: Indicador sempre visível
- **3.3.2** Labels ou Instruções: Inputs com labels
- **4.1.2** Nome, Função, Valor: ARIA correto

### Documentação

- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA: https://www.w3.org/WAI/ARIA/apg/
- Radix UI: https://www.radix-ui.com/ (todos componentes acessíveis)

---

## ✨ RESUMO - 5 REGRAS DE OURO

1. **Labels nos inputs** - Sempre associar com htmlFor/id
2. **ARIA em buttons** - Sempre aria-label se não tiver texto
3. **Contraste 4.5:1** - Validar cores antes de usar
4. **Ícone + Texto** - Nunca confiar apenas em cor
5. **Testar com Tab** - Navegar por teclado sempre

---

**Dúvidas?** Consulte:

- `/client/src/lib/accessibility-utils.ts` - Funções de validação
- `/AGENTE10_WCAG_AA_ACCESSIBILITY_REPORT.md` - Relatório completo
- Exemplos em `/client/src/components/ui/StatusBadge.tsx`

---

**Mantido por:** Agente 10 - Acessibilidade WCAG AA
**Última atualização:** 2025-12-28

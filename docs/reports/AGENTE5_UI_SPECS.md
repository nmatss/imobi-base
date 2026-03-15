# AGENTE 5 - UI Specifications & Visual Guide

## 🎨 Badge & Indicator Specifications

### 1. Badge Vermelho Pulsante (Red Pulsing Badge)

**Especificação Visual:**

- **Formato**: Círculo sólido
- **Tamanho**: 8px × 8px (w-2 h-2)
- **Cor**: `bg-red-500` (#ef4444)
- **Animação**: `animate-pulse` (Tailwind)
- **Posicionamento**: `ml-2` (8px de margem à esquerda do texto)
- **Acessibilidade**: `title` + `aria-label`

**Código:**

```tsx
<span
  className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full ml-2 animate-pulse"
  title="Há alterações não salvas"
  aria-label="Há alterações não salvas"
/>
```

**Exemplo de Uso:**

```tsx
<h1 className="text-2xl font-bold">
  Configurações
  {isDirty && (
    <span className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full ml-2 animate-pulse" />
  )}
</h1>
```

**Preview:**

```
┌─────────────────────────────┐
│  Configurações ●            │  ← Badge pulsante vermelho
└─────────────────────────────┘
```

---

### 2. Banner de Aviso (Warning Banner)

**Especificação Visual:**

- **Background**: `bg-amber-50` (light) / `bg-amber-900/10` (dark)
- **Borda**: `border border-amber-200` / `border-amber-800`
- **Padding**: `p-4` (16px)
- **Border Radius**: `rounded-lg` (8px)
- **Layout**: Flex com ícone + texto + botão

**Código Completo:**

```tsx
{
  isDirty && (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
      {/* Ícone Container */}
      <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
      </div>

      {/* Texto */}
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Você tem alterações não salvas
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          Lembre-se de salvar antes de sair desta página
        </p>
      </div>

      {/* Botão Descartar */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDiscard}
        className="shrink-0 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
      >
        <XCircle className="w-4 h-4 mr-2" />
        Descartar alterações
      </Button>
    </div>
  );
}
```

**Preview:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠  Você tem alterações não salvas      [Descartar alterações] │
│     Lembre-se de salvar antes de sair                           │
└──────────────────────────────────────────────────────────────────┘
```

**Cores:**

- **Light mode**: Fundo amber-50, texto amber-900
- **Dark mode**: Fundo amber-900/10, texto amber-100

---

### 3. Badge no Título de SettingsCard

**Especificação:**

```tsx
<SettingsCard
  title={
    <div className="flex items-center gap-2">
      <span>Dados da Empresa</span>
      {isDirty && (
        <span
          className="inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full animate-pulse"
          title="Há alterações não salvas"
          aria-label="Há alterações não salvas"
        />
      )}
    </div>
  }
  description="Informações básicas e documentação da sua imobiliária."
  onSave={handleSave}
>
  {/* conteúdo */}
</SettingsCard>
```

**Preview:**

```
┌────────────────────────────────────────┐
│ Dados da Empresa ●                     │
│ Informações básicas...                 │
├────────────────────────────────────────┤
│                                        │
│  [Input fields...]                     │
│                                        │
│                          [Salvar]      │
└────────────────────────────────────────┘
```

---

### 4. Dialog de Confirmação (UnsavedChangesDialog)

**Especificação Visual:**

- **Header**: Ícone de alerta + Título
- **Ícone**: `AlertTriangle` em container amber-100
- **Botão Confirmar**: Destrutivo (vermelho)
- **Botão Cancelar**: Outline (neutro)

**Código:**

```tsx
<UnsavedChangesDialog
  open={showConfirmDialog}
  onOpenChange={setShowConfirmDialog}
  title="Alterações não salvas"
  description="Você tem alterações não salvas. Deseja realmente sair sem salvar?"
  confirmText="Sair sem salvar"
  cancelText="Continuar editando"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

**Preview:**

```
┌──────────────────────────────────────────┐
│  ⚠  Alterações não salvas                │
│                                          │
│  Você tem alterações não salvas.         │
│  Deseja realmente sair sem salvar?       │
│                                          │
│     [Continuar editando] [Sair sem ⚠]   │
└──────────────────────────────────────────┘
```

**Estrutura Interna:**

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <div className="flex items-center gap-3">
        {/* Ícone */}
        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
        </div>
        {/* Título */}
        <AlertDialogTitle>{title}</AlertDialogTitle>
      </div>
      <AlertDialogDescription className="pt-2">
        {description}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={handleCancel}>{cancelText}</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirm}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {confirmText}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 5. Botão "Descartar Alterações"

**Especificações:**

- **Variant**: `outline` ou `ghost`
- **Ícone**: `XCircle` (lucide-react)
- **Posicionamento**: Geralmente no topo direito ou ao lado do botão Salvar
- **Condicional**: Só aparece quando `isDirty === true`

**Código (versão outline):**

```tsx
{
  isDirty && (
    <Button
      variant="outline"
      onClick={handleDiscard}
      className="border-amber-300 hover:bg-amber-100"
    >
      <XCircle className="w-4 h-4 mr-2" />
      Descartar alterações
    </Button>
  );
}
```

**Código (versão ghost - mais sutil):**

```tsx
{
  isDirty && (
    <Button
      variant="ghost"
      onClick={handleDiscard}
      className="text-muted-foreground hover:text-destructive"
    >
      <XCircle className="w-4 h-4 mr-2" />
      Descartar
    </Button>
  );
}
```

**Preview (outline):**

```
┌─────────────────────────┐
│  X  Descartar alterações │
└─────────────────────────┘
```

---

## 📱 Responsive Behavior

### Mobile (< 640px)

**Badge:**

- Mantém mesmo tamanho (8px)
- Pode ficar um pouco maior se necessário: `w-2.5 h-2.5` (10px)

**Banner:**

- Stack vertical em telas muito pequenas
- Botão "Descartar" ocupa largura total

```tsx
<div className="flex flex-col sm:flex-row items-start gap-3">
  {/* Ícone + Texto */}
  <div className="flex items-center gap-2 flex-1">...</div>
  {/* Botão */}
  <Button className="w-full sm:w-auto">Descartar</Button>
</div>
```

**Dialog:**

- Ocupa 95% da largura em mobile
- Botões em stack vertical

```tsx
<DialogFooter className="flex-col-reverse sm:flex-row gap-2">
  <Button className="w-full sm:w-auto">Cancelar</Button>
  <Button className="w-full sm:w-auto">Confirmar</Button>
</DialogFooter>
```

---

## 🎨 Color Palette

### Warning/Amber (Alterações não salvas)

```css
/* Light Mode */
bg-amber-50     /* #fffbeb - Banner background */
border-amber-200 /* #fde68a - Banner border */
text-amber-900  /* #78350f - Text heading */
text-amber-700  /* #b45309 - Text description */
bg-amber-100    /* #fef3c7 - Icon container */
text-amber-600  /* #d97706 - Icon color */

/* Dark Mode */
bg-amber-900/10  /* rgba(120, 53, 15, 0.1) - Banner bg */
border-amber-800 /* #92400e - Border */
text-amber-100   /* #fef3c7 - Heading */
text-amber-300   /* #fcd34d - Description */
bg-amber-900/30  /* rgba(120, 53, 15, 0.3) - Icon */
text-amber-500   /* #f59e0b - Icon */
```

### Destructive/Red (Badge & Confirm button)

```css
bg-red-500      /* #ef4444 - Badge pulsante */
bg-destructive  /* var(--destructive) - Botão confirmar */
text-destructive-foreground /* var(--destructive-foreground) */
```

---

## 🔤 Typography

### Banner

```tsx
{
  /* Título */
}
<p className="text-sm font-medium text-amber-900 dark:text-amber-100">
  Você tem alterações não salvas
</p>;

{
  /* Subtítulo */
}
<p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
  Lembre-se de salvar antes de sair desta página
</p>;
```

### Dialog

```tsx
{
  /* Título */
}
<AlertDialogTitle>Alterações não salvas</AlertDialogTitle>;

{
  /* Descrição */
}
<AlertDialogDescription>
  Você tem alterações não salvas. Deseja realmente sair sem salvar?
</AlertDialogDescription>;
```

---

## ⚙️ Animation Specs

### Badge Pulsante

Usa `animate-pulse` do Tailwind:

```css
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

**Duração**: 2s (padrão Tailwind)
**Easing**: cubic-bezier(0.4, 0, 0.6, 1)

### Fade-in do Banner

Adicionar animação de entrada suave:

```tsx
<div className="animate-in fade-in duration-200">{/* banner content */}</div>
```

Ou com framer-motion:

```tsx
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.2 }}
>
  {/* banner content */}
</motion.div>
```

---

## 📏 Spacing & Layout

### Banner Interno (dentro de card)

```tsx
<div className="space-y-6">
  {/* Banner de aviso */}
  {isDirty && <div className="bg-amber-50...">...</div>}

  {/* Card/Form principal */}
  <SettingsCard>...</SettingsCard>
</div>
```

**Espaçamento**: `space-y-6` (24px) entre banner e card

### Badge no Título

```tsx
<div className="flex items-center gap-2">
  <span>Título</span>
  {isDirty && <span className="ml-2">●</span>}
</div>
```

**Gap**: `gap-2` (8px) ou `ml-2` (8px)

---

## 🎭 States & Variants

### Banner States

**Normal (isDirty = true):**

```tsx
<div className="bg-amber-50 border-amber-200">
```

**Hover (botão descartar):**

```tsx
<Button className="hover:bg-amber-100">
```

**Focus:**

```tsx
<Button className="focus:ring-2 focus:ring-amber-400">
```

### Badge States

**Idle:**

- Pulsando devagar (animate-pulse)

**No hover:**

- Pode aumentar levemente: `hover:scale-110 transition-transform`

```tsx
<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse hover:scale-110 transition-transform">
```

---

## 🧪 Testing Checklist Visual

### Badge Vermelho

- [ ] Aparece quando `isDirty = true`
- [ ] Desaparece quando `isDirty = false`
- [ ] Está pulsando (animação)
- [ ] Tamanho correto (8px)
- [ ] Cor vermelha (#ef4444)
- [ ] Posicionamento correto (ao lado do título)
- [ ] Tooltip funciona ao passar mouse
- [ ] Acessível (aria-label)

### Banner de Aviso

- [ ] Background amber/amarelo claro
- [ ] Ícone de alerta visível
- [ ] Texto legível (contraste adequado)
- [ ] Botão "Descartar" funcional
- [ ] Layout responsivo (mobile/desktop)
- [ ] Fade-in suave ao aparecer
- [ ] Dark mode funciona

### Dialog de Confirmação

- [ ] Ícone de alerta no header
- [ ] Título em português
- [ ] Descrição clara
- [ ] Botão "Cancelar" (outline)
- [ ] Botão "Sair sem salvar" (destrutivo/vermelho)
- [ ] Botões em ordem correta
- [ ] Fechamento ao clicar fora (opcional)
- [ ] Acessível (ESC fecha)

---

## 🎨 Exemplos de Integração Visual

### Exemplo 1: Header com Badge

```tsx
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold flex items-center gap-2">
    Configurações
    {isDirty && (
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    )}
  </h1>

  <div className="flex gap-2">
    {isDirty && (
      <Button variant="ghost" onClick={handleDiscard}>
        Descartar
      </Button>
    )}
    <Button onClick={handleSave}>Salvar</Button>
  </div>
</div>
```

### Exemplo 2: Card com Banner Interno

```tsx
<Card>
  <CardHeader>
    <CardTitle>Dados da Empresa</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Banner de aviso */}
    {isDirty && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        ⚠️ Alterações não salvas
      </div>
    )}

    {/* Formulário */}
    <form>
      <Input placeholder="Nome" />
      <Input placeholder="Email" />
    </form>
  </CardContent>
  <CardFooter>
    <Button onClick={handleSave}>Salvar</Button>
  </CardFooter>
</Card>
```

### Exemplo 3: Tabs com Badge

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="general">
      <span>Geral</span>
      {isDirtyGeneral && (
        <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
      )}
    </TabsTrigger>
    <TabsTrigger value="security">
      <span>Segurança</span>
      {isDirtySecurity && (
        <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
      )}
    </TabsTrigger>
  </TabsList>
</Tabs>
```

---

## 🔍 A11y Checklist

- [x] Badge tem `aria-label="Há alterações não salvas"`
- [x] Badge tem `title="Há alterações não salvas"`
- [x] Dialog usa componente `AlertDialog` (semântica correta)
- [x] Botões têm texto descritivo (não apenas ícone)
- [x] Cores têm contraste adequado (WCAG AA)
- [x] Navegação por teclado funciona (Tab, Enter, ESC)
- [x] Screen readers anunciam mudanças de estado

---

**Criado por**: AGENTE 5 - Form State Management Expert
**Data**: 28/12/2024

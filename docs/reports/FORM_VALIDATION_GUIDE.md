# Guia de Validação de Formulários - ImobiBase

## Visão Geral

Este documento descreve o sistema completo de validação de formulários implementado no ImobiBase, utilizando **React Hook Form** + **Zod** para validação robusta com feedback visual em tempo real.

---

## Recursos Implementados

### 1. Schemas Zod Completos

Todos os formulários principais possuem schemas de validação Zod em `/client/src/lib/form-schemas.ts`:

- **PropertySchema** - Validação de imóveis
- **LeadSchema** - Validação de leads
- **ContractSchema** - Validação de contratos
- **RentalContractSchema** - Validação de contratos de aluguel
- **OwnerSchema** - Validação de proprietários
- **RenterSchema** - Validação de inquilinos
- **UserSchema** - Validação de usuários
- **LoginSchema** - Validação de login
- **InteractionSchema** - Validação de interações
- **FollowUpSchema** - Validação de follow-ups
- **CalendarEventSchema** - Validação de eventos de calendário
- **PublicInterestSchema** - Validação de formulário público de interesse
- **PropertyFilterSchema** - Validação de filtros de imóveis

### 2. Helpers de Formatação e Validação

Localizado em `/client/src/lib/form-helpers.ts`:

#### Formatação de Valores

```typescript
formatCurrency(value); // R$ 1.234,56
formatCPF(value); // 123.456.789-01
formatPhone(value); // (11) 98765-4321
formatCEP(value); // 12345-678
formatPercentage(value); // 10,00
```

#### Máscaras para Input

```typescript
currencyMask(value); // Aplica máscara de moeda
phoneMask(value); // Aplica máscara de telefone
cpfMask(value); // Aplica máscara de CPF
cepMask(value); // Aplica máscara de CEP
```

#### Validação de Erros

```typescript
getErrorMessage(error); // Extrai mensagem de erro
hasError(errors, field); // Verifica se campo tem erro
formatFormErrors(errors); // Formata todos os erros
```

#### Autocomplete

```typescript
fetchAddressByCEP(cep); // Busca endereço via ViaCEP
autoFillAddress(cep, setValue); // Preenche campos automaticamente
```

### 3. Componentes de UI Validados

#### ValidatedInput

Componente de input com validação visual automática:

```tsx
import { ValidatedInput } from "@/components/ui/validated-input";

<ValidatedInput
  label="Nome"
  error={errors.name?.message}
  description="Digite seu nome completo"
  isRequired
  showValidIcon
  registration={register("name")}
  placeholder="João Silva"
/>;
```

**Recursos:**

- Validação visual em tempo real
- Ícone de sucesso (checkmark verde) quando válido
- Ícone de erro (alerta vermelho) quando inválido
- Bordas coloridas (verde para válido, vermelho para erro)
- Mensagens de erro com animação
- Descrição auxiliar
- Indicador de campo obrigatório (\*)

#### ValidatedTextarea

Componente de textarea com validação e contador de caracteres:

```tsx
import { ValidatedTextarea } from "@/components/ui/validated-input";

<ValidatedTextarea
  label="Descrição"
  error={errors.description?.message}
  isRequired
  showCharCount
  maxLength={5000}
  registration={register("description")}
  placeholder="Digite a descrição..."
  rows={4}
/>;
```

**Recursos:**

- Contador de caracteres (atual/máximo)
- Alerta visual quando próximo do limite (90%)
- Validação de tamanho máximo
- Todas as features do ValidatedInput

#### ValidatedSelectWrapper

Wrapper para componentes Select do Radix UI:

```tsx
import { ValidatedSelectWrapper } from "@/components/ui/validated-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

<ValidatedSelectWrapper
  label="Tipo de Imóvel"
  error={errors.type?.message}
  isRequired
>
  <Select
    value={watch("type")}
    onValueChange={(value) => setValue("type", value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecione" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="house">Casa</SelectItem>
      <SelectItem value="apartment">Apartamento</SelectItem>
    </SelectContent>
  </Select>
</ValidatedSelectWrapper>;
```

---

## Exemplo Completo de Formulário

### Exemplo: Formulário de Lead

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadFormData } from "@/lib/form-schemas";
import {
  ValidatedInput,
  ValidatedTextarea,
  ValidatedSelectWrapper,
} from "@/components/ui/validated-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { phoneMask, currencyMask, getErrorMessage } from "@/lib/form-helpers";
import { Loader2 } from "lucide-react";

export function LeadFormExample() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, isDirty },
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    mode: "onChange", // Validação em tempo real
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      source: "Site",
      budget: "",
      notes: "",
    },
  });

  const phoneValue = watch("phone");
  const budgetValue = watch("budget");

  const onSubmit = async (data: LeadFormData) => {
    try {
      // Enviar para API
      console.log("Dados válidos:", data);
    } catch (error) {
      console.error("Erro ao enviar:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nome */}
      <ValidatedInput
        label="Nome"
        error={errors.name?.message}
        isRequired
        registration={register("name")}
        placeholder="Nome completo do lead"
        disabled={isSubmitting}
      />

      {/* Email e Telefone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidatedInput
          label="E-mail"
          type="email"
          error={errors.email?.message}
          isRequired
          registration={register("email")}
          placeholder="email@exemplo.com"
          disabled={isSubmitting}
        />

        <ValidatedInput
          label="Telefone"
          error={errors.phone?.message}
          isRequired
          placeholder="(11) 98765-4321"
          disabled={isSubmitting}
          value={phoneValue}
          onChange={(e) => {
            const masked = phoneMask(e.target.value);
            setValue("phone", masked, { shouldValidate: true });
          }}
        />
      </div>

      {/* Origem e Orçamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidatedSelectWrapper
          label="Origem"
          error={errors.source?.message}
          isRequired
        >
          <Select
            value={watch("source")}
            onValueChange={(value) => setValue("source", value as any)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Site">Site</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="Indicação">Indicação</SelectItem>
            </SelectContent>
          </Select>
        </ValidatedSelectWrapper>

        <ValidatedInput
          label="Orçamento"
          error={errors.budget?.message}
          placeholder="R$ 0,00"
          disabled={isSubmitting}
          value={budgetValue}
          onChange={(e) => {
            const masked = currencyMask(e.target.value);
            setValue("budget", masked, { shouldValidate: true });
          }}
        />
      </div>

      {/* Notas */}
      <ValidatedTextarea
        label="Observações"
        error={errors.notes?.message}
        registration={register("notes")}
        placeholder="Anotações sobre o lead..."
        rows={3}
        disabled={isSubmitting}
        showCharCount
        maxLength={5000}
      />

      {/* Botão de Submit */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar Lead
        </Button>
      </div>
    </form>
  );
}
```

---

## Validações Customizadas

### Validação de CPF

```typescript
const cpfValidator = z.string().refine(validateCPF, {
  message: "CPF inválido",
});
```

### Validação de Telefone Brasileiro

```typescript
const phoneValidator = z.string().refine(validatePhone, {
  message: "Telefone inválido. Use o formato: (XX) XXXXX-XXXX",
});
```

### Validação de Moeda

```typescript
const currencyValidator = z.string().refine(
  (val) => {
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    return !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) >= 0;
  },
  {
    message: "Valor monetário inválido",
  },
);
```

### Validação Cross-Field

```typescript
export const leadSchema = z
  .object({
    minBedrooms: z.number().optional().nullable(),
    maxBedrooms: z.number().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.minBedrooms !== null && data.maxBedrooms !== null) {
        return data.minBedrooms <= data.maxBedrooms;
      }
      return true;
    },
    {
      message: "Mínimo de quartos não pode ser maior que o máximo",
      path: ["minBedrooms"],
    },
  );
```

---

## Modos de Validação

### onChange (Validação em Tempo Real)

```typescript
useForm({
  resolver: zodResolver(schema),
  mode: "onChange", // Valida a cada mudança
});
```

### onBlur (Validação ao Sair do Campo)

```typescript
useForm({
  resolver: zodResolver(schema),
  mode: "onBlur", // Valida quando campo perde foco
});
```

### onSubmit (Validação apenas no Submit)

```typescript
useForm({
  resolver: zodResolver(schema),
  mode: "onSubmit", // Valida apenas ao submeter
});
```

---

## Estados do Formulário

### Verificar se Formulário é Válido

```typescript
const { formState: { isValid } } = useForm();

<Button disabled={!isValid}>Submit</Button>
```

### Verificar se Tem Alterações Não Salvas

```typescript
const {
  formState: { isDirty },
} = useForm();

if (isDirty) {
  // Mostrar aviso antes de sair
}
```

### Verificar se Está Enviando

```typescript
const { formState: { isSubmitting } } = useForm();

<Button disabled={isSubmitting}>
  {isSubmitting && <Loader2 className="animate-spin" />}
  Submit
</Button>
```

---

## Feedback Visual

### Indicadores de Validação

1. **Campo Válido:**
   - Borda verde
   - Ícone de checkmark verde
   - Ring verde no focus

2. **Campo com Erro:**
   - Borda vermelha
   - Ícone de alerta vermelho
   - Ring vermelho no focus
   - Mensagem de erro abaixo

3. **Campo Neutro:**
   - Borda padrão
   - Sem ícones
   - Ring padrão no focus

### Mensagens de Sucesso

```tsx
{
  isDirty && isValid && !isSubmitting && (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle2 className="h-4 w-4" />
      <span>Formulário válido e pronto para envio</span>
    </div>
  );
}
```

---

## Acessibilidade

### ARIA Attributes

Todos os componentes validados incluem:

- `aria-invalid={!!error}` - Indica campo inválido
- `aria-describedby` - Associa mensagens de erro/descrição
- `role="alert"` - Anuncia erros para leitores de tela
- Labels associados corretamente

### Navegação por Teclado

- Tab/Shift+Tab para navegação
- Enter para submit
- Escape para cancelar dialogs

---

## Formulários Migrados

### ✅ Formulários com Validação Completa

1. **LeadForm** - `/client/src/components/leads/LeadForm.tsx`
   - Validação Zod completa
   - Feedback visual em tempo real
   - Máscaras de telefone e moeda

2. **InterestForm** - `/client/src/components/public/InterestForm.tsx`
   - Validação Zod
   - Componentes ValidatedInput
   - Feedback de sucesso

### 🔄 Formulários para Migrar

1. **CreateEventModal** - `/client/src/components/calendar/CreateEventModal.tsx`
   - Schema já criado (calendarEventSchema)
   - Aguardando migração para componentes validados

2. **PropertyForm** - A ser criado
   - Schema já existe (propertySchema)
   - Criar formulário completo

3. **ContractForm** - A ser criado
   - Schema já existe (contractSchema)
   - Criar formulário completo

---

## Boas Práticas

### 1. Sempre Use Schemas Zod

```typescript
// ❌ Ruim
<Input required minLength={3} />

// ✅ Bom
const schema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres"),
});
```

### 2. Validação em Tempo Real para UX

```typescript
useForm({
  mode: "onChange", // Feedback imediato
  resolver: zodResolver(schema),
});
```

### 3. Desabilite Submit se Inválido

```typescript
<Button disabled={isSubmitting || !isValid}>
  Submit
</Button>
```

### 4. Use Máscaras para Formatação

```typescript
<ValidatedInput
  value={phoneValue}
  onChange={(e) => {
    const masked = phoneMask(e.target.value);
    setValue("phone", masked, { shouldValidate: true });
  }}
/>
```

### 5. Forneça Feedback Visual Claro

```typescript
<ValidatedInput
  showValidIcon  // Mostra checkmark quando válido
  error={errors.field?.message}  // Mostra erro quando inválido
/>
```

---

## Troubleshooting

### Problema: Validação não está funcionando

**Solução:** Verifique se o resolver está configurado:

```typescript
useForm({
  resolver: zodResolver(schema), // ← Importante!
});
```

### Problema: Máscaras não estão sendo aplicadas

**Solução:** Use `setValue` com `shouldValidate`:

```typescript
setValue("phone", masked, { shouldValidate: true });
```

### Problema: Erros não aparecem

**Solução:** Passe `errors.field?.message` para o componente:

```typescript
<ValidatedInput error={errors.name?.message} />
```

---

## Recursos Adicionais

- **React Hook Form Docs:** https://react-hook-form.com/
- **Zod Docs:** https://zod.dev/
- **Schemas:** `/client/src/lib/form-schemas.ts`
- **Helpers:** `/client/src/lib/form-helpers.ts`
- **Componentes:** `/client/src/components/ui/validated-input.tsx`

---

## Próximos Passos

1. Migrar todos os formulários existentes para usar schemas Zod
2. Implementar formulários faltantes (Property, Contract, etc.)
3. Adicionar testes unitários para validações
4. Documentar casos de uso específicos do negócio
5. Criar Storybook stories para componentes validados

import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { AlertCircle, Info } from 'lucide-react';

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Label>;

// Basic Label
export const Default: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Digite seu email" />
    </div>
  ),
};

// Required Field
export const RequiredField: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="name">
        Nome Completo <span className="text-destructive">*</span>
      </Label>
      <Input id="name" placeholder="Digite seu nome" />
    </div>
  ),
};

// With Description
export const WithDescription: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="username">Nome de Usuário</Label>
      <Input id="username" placeholder="usuario123" />
      <p className="text-xs text-muted-foreground">
        Escolha um nome de usuário único. Apenas letras, números e underscores.
      </p>
    </div>
  ),
};

// With Icon
export const WithIcon: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="info" className="flex items-center gap-2">
        <Info className="h-4 w-4" />
        Informações Adicionais
      </Label>
      <Input id="info" placeholder="Digite informações adicionais" />
    </div>
  ),
};

// With Error
export const WithError: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="password" className="text-destructive flex items-center gap-1">
        <AlertCircle className="h-4 w-4" />
        Senha
      </Label>
      <Input
        id="password"
        type="password"
        placeholder="Digite sua senha"
        className="border-destructive"
      />
      <p className="text-xs text-destructive">
        A senha deve ter pelo menos 8 caracteres
      </p>
    </div>
  ),
};

// With Checkbox
export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label
        htmlFor="terms"
        className="text-sm font-normal cursor-pointer"
      >
        Aceito os termos e condições
      </Label>
    </div>
  ),
};

// With Radio Group
export const WithRadioGroup: Story = {
  render: () => (
    <div className="space-y-3">
      <Label>Tipo de Imóvel</Label>
      <RadioGroup defaultValue="apartment">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="apartment" id="apartment" />
          <Label htmlFor="apartment" className="font-normal cursor-pointer">
            Apartamento
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="house" id="house" />
          <Label htmlFor="house" className="font-normal cursor-pointer">
            Casa
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="commercial" id="commercial" />
          <Label htmlFor="commercial" className="font-normal cursor-pointer">
            Comercial
          </Label>
        </div>
      </RadioGroup>
    </div>
  ),
};

// Form Example
export const FormExample: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <div className="space-y-2">
        <Label htmlFor="property-title">
          Título do Imóvel <span className="text-destructive">*</span>
        </Label>
        <Input id="property-title" placeholder="Apartamento 3 quartos..." />
        <p className="text-xs text-muted-foreground">
          Digite um título descritivo para o imóvel
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">
          Preço (R$) <span className="text-destructive">*</span>
        </Label>
        <Input id="price" type="number" placeholder="450000" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Input id="address" placeholder="Rua das Flores, 123" />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="featured" />
        <Label htmlFor="featured" className="font-normal cursor-pointer">
          Marcar como imóvel em destaque
        </Label>
      </div>
    </div>
  ),
};

// Different Sizes
export const DifferentSizes: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="small" className="text-xs">
          Small Label (text-xs)
        </Label>
        <Input id="small" className="h-8 text-xs" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="default">
          Default Label (text-sm)
        </Label>
        <Input id="default" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="large" className="text-base">
          Large Label (text-base)
        </Label>
        <Input id="large" className="h-11" />
      </div>
    </div>
  ),
};

// Label Variations
export const LabelVariations: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Categoria
        </Label>
        <Input placeholder="Selecione a categoria" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          Campo Importante
        </Label>
        <Input placeholder="Digite o valor" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-normal">
          Campo Opcional
        </Label>
        <Input placeholder="Este campo é opcional" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Configuração</Label>
          <span className="text-xs text-muted-foreground">Opcional</span>
        </div>
        <Input placeholder="Valor da configuração" />
      </div>
    </div>
  ),
};

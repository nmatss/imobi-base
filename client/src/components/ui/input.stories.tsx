import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Label } from './label';
import { Search, Mail, Lock, User, Phone } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'UI/Forms/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Digite algo...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="name">Nome</Label>
      <Input id="name" placeholder="Digite seu nome" />
    </div>
  ),
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'seu@email.com',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Digite sua senha',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Input desabilitado',
    value: 'Valor não editável',
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar..." />
      </div>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" type="email" placeholder="Email" />
      </div>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" type="password" placeholder="Senha" />
      </div>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="fullname">Nome completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="fullname" className="pl-10" placeholder="João Silva" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="email" className="pl-10" type="email" placeholder="joao@email.com" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="phone" className="pl-10" type="tel" placeholder="(11) 99999-9999" />
        </div>
      </div>
    </div>
  ),
};

export const SearchBar: Story = {
  render: () => (
    <div className="max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          type="search"
          placeholder="Buscar imóveis, leads, contratos..."
        />
      </div>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email-error">Email</Label>
      <Input
        id="email-error"
        type="email"
        placeholder="seu@email.com"
        className="border-red-500 focus-visible:ring-red-500"
      />
      <p className="text-sm text-red-500">Email inválido</p>
    </div>
  ),
};

export const WithSuccess: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email-success">Email</Label>
      <Input
        id="email-success"
        type="email"
        placeholder="seu@email.com"
        className="border-green-500 focus-visible:ring-green-500"
        value="joao@email.com"
      />
      <p className="text-sm text-green-500">Email válido</p>
    </div>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label>Text</Label>
        <Input type="text" placeholder="Text input" />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" placeholder="email@example.com" />
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" placeholder="Password" />
      </div>

      <div className="space-y-2">
        <Label>Number</Label>
        <Input type="number" placeholder="123" />
      </div>

      <div className="space-y-2">
        <Label>Tel</Label>
        <Input type="tel" placeholder="(11) 99999-9999" />
      </div>

      <div className="space-y-2">
        <Label>URL</Label>
        <Input type="url" placeholder="https://example.com" />
      </div>

      <div className="space-y-2">
        <Label>Search</Label>
        <Input type="search" placeholder="Search..." />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Forms/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => <Checkbox />,
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Aceitar termos e condições</Label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="checked" defaultChecked />
      <Label htmlFor="checked">Item selecionado</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="disabled" disabled />
      <Label htmlFor="disabled" className="text-muted-foreground">
        Opção desabilitada
      </Label>
    </div>
  ),
};

export const DisabledChecked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="disabled-checked" disabled defaultChecked />
      <Label htmlFor="disabled-checked" className="text-muted-foreground">
        Selecionado e desabilitado
      </Label>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <Checkbox id="notifications" />
        <Label htmlFor="notifications">Receber notificações</Label>
      </div>
      <p className="text-sm text-muted-foreground ml-6">
        Enviaremos atualizações sobre novos imóveis e leads.
      </p>
    </div>
  ),
};

export const PropertyFeatures: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <h3 className="font-semibold">Características do Imóvel</h3>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="garage" defaultChecked />
          <Label htmlFor="garage">Garagem</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="pool" />
          <Label htmlFor="pool">Piscina</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="gym" defaultChecked />
          <Label htmlFor="gym">Academia</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="elevator" />
          <Label htmlFor="elevator">Elevador</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="security" defaultChecked />
          <Label htmlFor="security">Segurança 24h</Label>
        </div>
      </div>
    </div>
  ),
};

export const Filters: Story = {
  render: () => (
    <div className="space-y-4 max-w-md border rounded-lg p-4">
      <h3 className="font-semibold">Filtros de Busca</h3>

      <div className="space-y-3">
        <div className="font-medium text-sm">Tipo de Imóvel</div>
        <div className="space-y-2 ml-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="apartment" defaultChecked />
            <Label htmlFor="apartment">Apartamento</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="house" />
            <Label htmlFor="house">Casa</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="land" />
            <Label htmlFor="land">Terreno</Label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="font-medium text-sm">Status</div>
        <div className="space-y-2 ml-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="available" defaultChecked />
            <Label htmlFor="available">Disponível</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="reserved" />
            <Label htmlFor="reserved">Reservado</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="sold" />
            <Label htmlFor="sold">Vendido</Label>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const SettingsPanel: Story = {
  render: () => (
    <div className="space-y-6 max-w-md border rounded-lg p-6">
      <h3 className="text-lg font-semibold">Configurações de Notificações</h3>

      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox id="email-notifications" defaultChecked />
            <Label htmlFor="email-notifications">Notificações por email</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Receba emails sobre novos leads e atualizações.
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox id="push-notifications" defaultChecked />
            <Label htmlFor="push-notifications">Notificações push</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Receba notificações em tempo real no navegador.
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox id="sms-notifications" />
            <Label htmlFor="sms-notifications">Notificações por SMS</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Receba mensagens importantes por SMS.
          </p>
        </div>
      </div>
    </div>
  ),
};

export const TaskList: Story = {
  render: () => (
    <div className="space-y-4 max-w-md border rounded-lg p-4">
      <h3 className="font-semibold">Tarefas Pendentes</h3>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="task1" defaultChecked />
          <Label htmlFor="task1" className="line-through text-muted-foreground">
            Enviar contrato para aprovação
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="task2" defaultChecked />
          <Label htmlFor="task2" className="line-through text-muted-foreground">
            Agendar visita ao imóvel
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="task3" />
          <Label htmlFor="task3">Enviar proposta ao cliente</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="task4" />
          <Label htmlFor="task4">Fazer follow-up do lead</Label>
        </div>
      </div>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id="unchecked" />
        <Label htmlFor="unchecked">Não selecionado</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="checked-state" defaultChecked />
        <Label htmlFor="checked-state">Selecionado</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-state" disabled />
        <Label htmlFor="disabled-state" className="text-muted-foreground">
          Desabilitado
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-checked-state" disabled defaultChecked />
        <Label htmlFor="disabled-checked-state" className="text-muted-foreground">
          Desabilitado e selecionado
        </Label>
      </div>
    </div>
  ),
};

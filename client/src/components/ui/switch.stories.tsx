import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';
import { Label } from './label';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { useState } from 'react';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

// Basic Switch
export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

// With Label
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Modo Avião</Label>
    </div>
  ),
};

// Interactive Switch
export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch id="interactive" checked={checked} onCheckedChange={setChecked} />
          <Label htmlFor="interactive">Notificações ativas</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Status: {checked ? 'Ativado' : 'Desativado'}
        </p>
      </div>
    );
  },
};

// Settings Example
export const SettingsExample: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      notifications: true,
      emailAlerts: false,
      smsAlerts: false,
      pushNotifications: true,
    });

    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Notificações</Label>
              <p className="text-xs text-muted-foreground">
                Receber todas as notificações
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email">Alertas por Email</Label>
              <p className="text-xs text-muted-foreground">
                Receber emails de novos leads
              </p>
            </div>
            <Switch
              id="email"
              checked={settings.emailAlerts}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, emailAlerts: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms">Alertas por SMS</Label>
              <p className="text-xs text-muted-foreground">
                Receber SMS de visitas agendadas
              </p>
            </div>
            <Switch
              id="sms"
              checked={settings.smsAlerts}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, smsAlerts: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Notificações no navegador
              </p>
            </div>
            <Switch
              id="push"
              checked={settings.pushNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, pushNotifications: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    );
  },
};

// Property Settings
export const PropertySettings: Story = {
  render: () => {
    const [featured, setFeatured] = useState(true);
    const [active, setActive] = useState(true);
    const [allowVisits, setAllowVisits] = useState(false);

    return (
      <div className="space-y-6 w-full max-w-md">
        <div>
          <h3 className="text-lg font-semibold mb-4">Configurações do Imóvel</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="featured">Imóvel em Destaque</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Aparece na página inicial
                </p>
              </div>
              <Switch
                id="featured"
                checked={featured}
                onCheckedChange={setFeatured}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="active">Ativo no Site</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Visível para clientes
                </p>
              </div>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="visits">Permitir Agendamento</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Clientes podem agendar visitas
                </p>
              </div>
              <Switch
                id="visits"
                checked={allowVisits}
                onCheckedChange={setAllowVisits}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// Form Example
export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <div className="flex items-center space-x-2">
        <Switch id="terms" />
        <Label htmlFor="terms" className="text-sm">
          Aceito os termos e condições
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="newsletter" defaultChecked />
        <Label htmlFor="newsletter" className="text-sm">
          Desejo receber newsletters
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="marketing" />
        <Label htmlFor="marketing" className="text-sm">
          Concordo em receber comunicações de marketing
        </Label>
      </div>
    </div>
  ),
};

// Compact List
export const CompactList: Story = {
  render: () => (
    <div className="space-y-3 w-full max-w-sm">
      <div className="flex items-center justify-between">
        <Label htmlFor="s1" className="text-sm font-normal">Wi-Fi</Label>
        <Switch id="s1" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="s2" className="text-sm font-normal">Bluetooth</Label>
        <Switch id="s2" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="s3" className="text-sm font-normal">Modo Escuro</Label>
        <Switch id="s3" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="s4" className="text-sm font-normal">Economia de Energia</Label>
        <Switch id="s4" />
      </div>
    </div>
  ),
};

// All States
export const AllStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch id="unchecked" />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="checked2" defaultChecked />
        <Label htmlFor="checked2">Checked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled-unchecked" disabled />
        <Label htmlFor="disabled-unchecked" className="text-muted-foreground">
          Disabled Unchecked
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked" className="text-muted-foreground">
          Disabled Checked
        </Label>
      </div>
    </div>
  ),
};

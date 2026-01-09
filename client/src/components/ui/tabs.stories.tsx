import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Home, Building2, DollarSign, Calendar, Settings, User, Bell, Shield } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

// Basic Tabs
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p className="text-sm text-muted-foreground">Conteúdo da Tab 1</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p className="text-sm text-muted-foreground">Conteúdo da Tab 2</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p className="text-sm text-muted-foreground">Conteúdo da Tab 3</p>
      </TabsContent>
    </Tabs>
  ),
};

// Tabs with Icons
export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="properties" className="w-[500px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="properties">
          <Home className="h-4 w-4 mr-2" />
          Imóveis
        </TabsTrigger>
        <TabsTrigger value="leads">
          <User className="h-4 w-4 mr-2" />
          Leads
        </TabsTrigger>
        <TabsTrigger value="finance">
          <DollarSign className="h-4 w-4 mr-2" />
          Financeiro
        </TabsTrigger>
      </TabsList>
      <TabsContent value="properties" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Imóveis</CardTitle>
            <CardDescription>Gerencie seu portfólio de imóveis</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              142 imóveis cadastrados no sistema
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="leads" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>Acompanhe seus leads e oportunidades</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              38 leads ativos aguardando contato
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="finance" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Financeiro</CardTitle>
            <CardDescription>Controle financeiro da imobiliária</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              R$ 45.230,00 em receitas este mês
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

// Dashboard Tabs Example
export const DashboardTabs: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-full max-w-4xl">
      <TabsList>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="analytics">Análises</TabsTrigger>
        <TabsTrigger value="reports">Relatórios</TabsTrigger>
        <TabsTrigger value="notifications">Notificações</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142</div>
              <p className="text-xs text-muted-foreground">+12% em relação ao mês passado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">38</div>
              <p className="text-xs text-muted-foreground">+5 novos esta semana</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="analytics" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Análises de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gráficos e métricas de performance aparecem aqui
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="reports" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">Relatório de Vendas</Button>
            <Button variant="outline" className="w-full justify-start">Relatório de Locações</Button>
            <Button variant="outline" className="w-full justify-start">Relatório Financeiro</Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="notifications" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você não tem novas notificações
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

// Settings Tabs Example
export const SettingsTabs: Story = {
  render: () => (
    <Tabs defaultValue="general" className="w-full max-w-3xl">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">
          <Settings className="h-4 w-4 mr-2" />
          Geral
        </TabsTrigger>
        <TabsTrigger value="account">
          <User className="h-4 w-4 mr-2" />
          Conta
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="h-4 w-4 mr-2" />
          Notificações
        </TabsTrigger>
        <TabsTrigger value="security">
          <Shield className="h-4 w-4 mr-2" />
          Segurança
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Configurações Gerais</CardTitle>
            <CardDescription>
              Configure as preferências gerais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Idioma, timezone, moeda e outras configurações básicas
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="account" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Conta</CardTitle>
            <CardDescription>
              Gerencie informações da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nome, email, telefone e outras informações pessoais
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="notifications" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Preferências de Notificações</CardTitle>
            <CardDescription>
              Configure como você recebe notificações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Email, SMS, push notifications e outros alertas
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="security" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>
              Gerencie senha e configurações de segurança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Senha, autenticação em duas etapas, sessões ativas
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

// Vertical Tabs Example
export const VerticalTabs: Story = {
  render: () => (
    <Tabs defaultValue="properties" className="w-full max-w-2xl flex gap-4">
      <TabsList className="flex flex-col h-auto space-y-1">
        <TabsTrigger value="properties" className="w-full justify-start">
          <Building2 className="h-4 w-4 mr-2" />
          Imóveis
        </TabsTrigger>
        <TabsTrigger value="calendar" className="w-full justify-start">
          <Calendar className="h-4 w-4 mr-2" />
          Agenda
        </TabsTrigger>
        <TabsTrigger value="finance" className="w-full justify-start">
          <DollarSign className="h-4 w-4 mr-2" />
          Financeiro
        </TabsTrigger>
      </TabsList>
      <div className="flex-1">
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Imóveis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie todos os imóveis cadastrados
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Agenda de Visitas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Agende e acompanhe visitas aos imóveis
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle>Controle Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Acompanhe receitas, despesas e comissões
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  ),
};

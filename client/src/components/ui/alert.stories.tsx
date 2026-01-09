import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { AlertCircle, AlertTriangle, CheckCircle2, Info as InfoIcon } from 'lucide-react';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components and dependencies to your app using the CLI.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert className="border-green-500 text-green-900 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>Success!</AlertTitle>
      <AlertDescription>
        Your property has been successfully published.
      </AlertDescription>
    </Alert>
  ),
};

export const Warning: Story = {
  render: () => (
    <Alert className="border-yellow-500 text-yellow-900 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        This action cannot be undone. Please review before proceeding.
      </AlertDescription>
    </Alert>
  ),
};

export const InfoAlert: Story = {
  render: () => (
    <Alert className="border-blue-500 text-blue-900 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        New features are available. Check out what's new in this update.
      </AlertDescription>
    </Alert>
  ),
};

export const WithoutTitle: Story = {
  render: () => (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        This is an alert without a title.
      </AlertDescription>
    </Alert>
  ),
};

export const PropertyPublished: Story = {
  render: () => (
    <Alert className="border-green-500 text-green-900 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>Imóvel Publicado!</AlertTitle>
      <AlertDescription>
        Seu imóvel foi publicado com sucesso e já está visível para potenciais clientes.
      </AlertDescription>
    </Alert>
  ),
};

export const LeadNotification: Story = {
  render: () => (
    <Alert className="border-blue-500 text-blue-900 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Novo Lead Recebido</AlertTitle>
      <AlertDescription>
        Você recebeu um novo lead para o imóvel "Apartamento 3 quartos - Centro".
      </AlertDescription>
    </Alert>
  ),
};

export const ContractExpiring: Story = {
  render: () => (
    <Alert className="border-yellow-500 text-yellow-900 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Contrato Expirando</AlertTitle>
      <AlertDescription>
        O contrato de aluguel do imóvel vence em 30 dias. Considere iniciar renovação.
      </AlertDescription>
    </Alert>
  ),
};

export const PaymentOverdue: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Pagamento Atrasado</AlertTitle>
      <AlertDescription>
        O pagamento do aluguel está atrasado há 5 dias. Entre em contato com o locatário.
      </AlertDescription>
    </Alert>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Default</AlertTitle>
        <AlertDescription>This is a default alert.</AlertDescription>
      </Alert>

      <Alert className="border-blue-500 text-blue-900 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>This is an info alert.</AlertDescription>
      </Alert>

      <Alert className="border-green-500 text-green-900 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>This is a success alert.</AlertDescription>
      </Alert>

      <Alert className="border-yellow-500 text-yellow-900 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>This is a warning alert.</AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>This is an error alert.</AlertDescription>
      </Alert>
    </div>
  ),
};

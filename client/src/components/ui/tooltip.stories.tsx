import type { Meta, StoryObj } from '@storybook/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { Button } from './button';
import { Info, HelpCircle, AlertCircle, Settings, Trash2, Plus } from 'lucide-react';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

// Basic Tooltip
export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Tooltip básico</p>
      </TooltipContent>
    </Tooltip>
  ),
};

// With Icon Button
export const WithIconButton: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Informações adicionais</p>
      </TooltipContent>
    </Tooltip>
  ),
};

// Different Sides
export const TopSide: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Top</Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>Tooltip no topo</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const RightSide: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Right</Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Tooltip à direita</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const BottomSide: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Bottom</Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Tooltip na base</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const LeftSide: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Left</Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>Tooltip à esquerda</p>
      </TooltipContent>
    </Tooltip>
  ),
};

// Help Icon
export const HelpIcon: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <span>Preço de Venda</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">
            Digite o valor de venda do imóvel em reais (R$).
            Este valor será exibido para os clientes.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

// Action Buttons with Tooltips
export const ActionButtons: Story = {
  render: () => (
    <div className="flex gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Adicionar novo imóvel</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Configurações</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Excluir item</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

// Rich Content Tooltip
export const RichContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Informações do Imóvel</Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <p className="font-semibold">Apartamento 3 quartos</p>
          <p className="text-xs text-muted-foreground">
            Centro - São Paulo, SP
          </p>
          <div className="flex gap-4 text-xs">
            <span>120m²</span>
            <span>3 quartos</span>
            <span>2 banheiros</span>
          </div>
          <p className="text-sm font-bold">R$ 450.000</p>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
};

// Status Indicators
export const StatusIndicators: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip>
        <TooltipTrigger>
          <div className="h-3 w-3 rounded-full bg-green-500 cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Disponível</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <div className="h-3 w-3 rounded-full bg-yellow-500 cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Reservado</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <div className="h-3 w-3 rounded-full bg-blue-500 cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Vendido</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <div className="h-3 w-3 rounded-full bg-red-500 cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Indisponível</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

// Disabled Element
export const DisabledElement: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">
          <Button disabled>Botão Desabilitado</Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Este botão está desabilitado porque você não tem permissão</p>
      </TooltipContent>
    </Tooltip>
  ),
};

// Form Field Help
export const FormFieldHelp: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">CEP</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Digite o CEP no formato 00000-000. Os dados de endereço serão preenchidos automaticamente.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <input
          type="text"
          placeholder="00000-000"
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Taxa de Comissão</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Porcentagem de comissão sobre o valor de venda. Exemplo: 3% de R$ 100.000 = R$ 3.000</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <input
          type="number"
          placeholder="3"
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>
    </div>
  ),
};

// Keyboard Shortcut
export const KeyboardShortcut: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Salvar</Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          <span>Salvar alterações</span>
          <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">
            Ctrl+S
          </kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
};

// All Positions Showcase
export const AllPositions: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-8 p-12">
      <div></div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Top</Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip no topo</p>
        </TooltipContent>
      </Tooltip>
      <div></div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Left</Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tooltip à esquerda</p>
        </TooltipContent>
      </Tooltip>
      <div className="flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Right</Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip à direita</p>
        </TooltipContent>
      </Tooltip>

      <div></div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip na base</p>
        </TooltipContent>
      </Tooltip>
      <div></div>
    </div>
  ),
};

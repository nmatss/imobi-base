import type { Meta, StoryObj } from '@storybook/react';
import { ActionMenu, ActionMenuCompact } from './ActionMenu';
import { Edit, Trash, Copy, Eye, Archive, Download, Share2, MoreVertical } from 'lucide-react';

const meta: Meta<typeof ActionMenu> = {
  title: 'UI/ActionMenu',
  component: ActionMenu,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal'],
    },
    triggerVariant: {
      control: 'select',
      options: ['default', 'ghost', 'outline'],
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ActionMenu>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Editar', icon: Edit, onClick: () => alert('Editar') },
      { label: 'Duplicar', icon: Copy, onClick: () => alert('Duplicar') },
      { label: 'Excluir', icon: Trash, onClick: () => alert('Excluir'), variant: 'destructive', separator: true },
    ],
  },
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    items: [
      { label: 'Ver', icon: Eye, onClick: () => alert('Ver') },
      { label: 'Editar', icon: Edit, onClick: () => alert('Editar') },
      { label: 'Excluir', icon: Trash, onClick: () => alert('Excluir'), variant: 'destructive' },
    ],
  },
};

export const WithGroups: Story = {
  args: {
    groups: [
      {
        label: 'Ações',
        items: [
          { label: 'Editar', icon: Edit, onClick: () => alert('Editar') },
          { label: 'Duplicar', icon: Copy, onClick: () => alert('Duplicar') },
          { label: 'Ver detalhes', icon: Eye, onClick: () => alert('Ver detalhes') },
        ],
      },
      {
        label: 'Compartilhar',
        items: [
          { label: 'Download', icon: Download, onClick: () => alert('Download') },
          { label: 'Compartilhar', icon: Share2, onClick: () => alert('Compartilhar') },
        ],
      },
      {
        label: 'Zona de perigo',
        items: [
          { label: 'Arquivar', icon: Archive, onClick: () => alert('Arquivar'), variant: 'warning' },
          { label: 'Excluir', icon: Trash, onClick: () => alert('Excluir'), variant: 'destructive' },
        ],
      },
    ],
  },
};

export const WithShortcuts: Story = {
  args: {
    items: [
      { label: 'Editar', icon: Edit, onClick: () => {}, shortcut: '⌘E' },
      { label: 'Duplicar', icon: Copy, onClick: () => {}, shortcut: '⌘D' },
      { label: 'Excluir', icon: Trash, onClick: () => {}, shortcut: '⌘⌫', variant: 'destructive' },
    ],
  },
};

export const WithDisabledItems: Story = {
  args: {
    items: [
      { label: 'Editar', icon: Edit, onClick: () => {} },
      { label: 'Duplicar (Indisponível)', icon: Copy, onClick: () => {}, disabled: true },
      { label: 'Arquivar', icon: Archive, onClick: () => {} },
      { label: 'Excluir', icon: Trash, onClick: () => {}, variant: 'destructive' },
    ],
  },
};

export const PropertyActions: Story = {
  args: {
    groups: [
      {
        items: [
          { label: 'Ver imóvel', icon: Eye, onClick: () => alert('Ver imóvel') },
          { label: 'Editar', icon: Edit, onClick: () => alert('Editar') },
        ],
      },
      {
        items: [
          { label: 'Duplicar anúncio', icon: Copy, onClick: () => alert('Duplicar') },
          { label: 'Compartilhar', icon: Share2, onClick: () => alert('Compartilhar') },
        ],
      },
      {
        items: [
          { label: 'Arquivar', icon: Archive, onClick: () => alert('Arquivar'), variant: 'warning' },
          { label: 'Excluir', icon: Trash, onClick: () => alert('Excluir'), variant: 'destructive' },
        ],
      },
    ],
  },
};

export const LeadActions: Story = {
  args: {
    items: [
      { label: 'Ver perfil', icon: Eye, onClick: () => {} },
      { label: 'Editar lead', icon: Edit, onClick: () => {} },
      { label: 'Enviar email', icon: Share2, onClick: () => {} },
      { label: 'Converter em cliente', icon: Copy, onClick: () => {} },
      { label: 'Desqualificar', icon: Trash, onClick: () => {}, variant: 'destructive', separator: true },
    ],
  },
};

export const CompactVariant: Story = {
  render: () => (
    <div className="max-w-sm border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Apartamento Centro</h3>
          <p className="text-sm text-muted-foreground">R$ 450.000</p>
        </div>
        <ActionMenuCompact
          items={[
            { label: 'Ver', icon: Eye, onClick: () => {} },
            { label: 'Editar', icon: Edit, onClick: () => {} },
            { label: 'Excluir', icon: Trash, onClick: () => {}, variant: 'destructive' },
          ]}
        />
      </div>
    </div>
  ),
};

export const InTable: Story = {
  render: () => (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-4">Imóvel</th>
            <th className="text-left p-4">Status</th>
            <th className="text-left p-4">Preço</th>
            <th className="text-right p-4">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="p-4">Apartamento 3 quartos</td>
            <td className="p-4">Disponível</td>
            <td className="p-4">R$ 450.000</td>
            <td className="p-4 text-right">
              <ActionMenuCompact
                items={[
                  { label: 'Ver', icon: Eye, onClick: () => {} },
                  { label: 'Editar', icon: Edit, onClick: () => {} },
                  { label: 'Excluir', icon: Trash, onClick: () => {}, variant: 'destructive' },
                ]}
              />
            </td>
          </tr>
          <tr className="border-t">
            <td className="p-4">Casa no bairro Jardins</td>
            <td className="p-4">Vendido</td>
            <td className="p-4">R$ 850.000</td>
            <td className="p-4 text-right">
              <ActionMenuCompact
                items={[
                  { label: 'Ver', icon: Eye, onClick: () => {} },
                  { label: 'Arquivar', icon: Archive, onClick: () => {} },
                ]}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Label } from './label';

const meta: Meta<typeof Select> = {
  title: 'UI/Forms/Select',
  component: Select,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecione uma opção" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Opção 1</SelectItem>
        <SelectItem value="option2">Opção 2</SelectItem>
        <SelectItem value="option3">Opção 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Selecione uma opção</Label>
      <Select>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Escolha..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Opção 1</SelectItem>
          <SelectItem value="option2">Opção 2</SelectItem>
          <SelectItem value="option3">Opção 3</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const PropertyType: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Tipo de Imóvel</Label>
      <Select>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione o tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apartment">Apartamento</SelectItem>
          <SelectItem value="house">Casa</SelectItem>
          <SelectItem value="land">Terreno</SelectItem>
          <SelectItem value="commercial">Comercial</SelectItem>
          <SelectItem value="industrial">Industrial</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const PropertyStatus: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Status do Imóvel</Label>
      <Select>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione o status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="available">Disponível</SelectItem>
          <SelectItem value="reserved">Reservado</SelectItem>
          <SelectItem value="sold">Vendido</SelectItem>
          <SelectItem value="rented">Alugado</SelectItem>
          <SelectItem value="unavailable">Indisponível</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const LeadStatus: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Status do Lead</Label>
      <Select>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione o status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">Novo</SelectItem>
          <SelectItem value="contacted">Contatado</SelectItem>
          <SelectItem value="qualified">Qualificado</SelectItem>
          <SelectItem value="proposal">Proposta</SelectItem>
          <SelectItem value="won">Ganho</SelectItem>
          <SelectItem value="lost">Perdido</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const City: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Cidade</Label>
      <Select>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione a cidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sp">São Paulo</SelectItem>
          <SelectItem value="rj">Rio de Janeiro</SelectItem>
          <SelectItem value="bh">Belo Horizonte</SelectItem>
          <SelectItem value="curitiba">Curitiba</SelectItem>
          <SelectItem value="porto-alegre">Porto Alegre</SelectItem>
          <SelectItem value="brasilia">Brasília</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const MultipleSelects: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label>Tipo de Negócio</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Venda ou Aluguel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sale">Venda</SelectItem>
            <SelectItem value="rent">Aluguel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo de Imóvel</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apartment">Apartamento</SelectItem>
            <SelectItem value="house">Casa</SelectItem>
            <SelectItem value="land">Terreno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Quartos</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Número de quartos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 quarto</SelectItem>
            <SelectItem value="2">2 quartos</SelectItem>
            <SelectItem value="3">3 quartos</SelectItem>
            <SelectItem value="4">4+ quartos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};

export const WithDefaultValue: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Status</Label>
      <Select defaultValue="available">
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="available">Disponível</SelectItem>
          <SelectItem value="reserved">Reservado</SelectItem>
          <SelectItem value="sold">Vendido</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Status (Desabilitado)</Label>
      <Select disabled>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Não disponível" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Opção 1</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const LongList: Story = {
  render: () => (
    <div className="space-y-2">
      <Label>Bairro</Label>
      <Select>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione o bairro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="centro">Centro</SelectItem>
          <SelectItem value="jardins">Jardins</SelectItem>
          <SelectItem value="moema">Moema</SelectItem>
          <SelectItem value="vila-olimpia">Vila Olímpia</SelectItem>
          <SelectItem value="pinheiros">Pinheiros</SelectItem>
          <SelectItem value="itaim">Itaim Bibi</SelectItem>
          <SelectItem value="brooklin">Brooklin</SelectItem>
          <SelectItem value="morumbi">Morumbi</SelectItem>
          <SelectItem value="perdizes">Perdizes</SelectItem>
          <SelectItem value="higienopolis">Higienópolis</SelectItem>
          <SelectItem value="vila-mariana">Vila Mariana</SelectItem>
          <SelectItem value="santana">Santana</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="max-w-md border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold">Filtros de Busca</h3>

      <div className="space-y-2">
        <Label>Tipo de Negócio</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Venda ou Aluguel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sale">Venda</SelectItem>
            <SelectItem value="rent">Aluguel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo de Imóvel</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="apartment">Apartamento</SelectItem>
            <SelectItem value="house">Casa</SelectItem>
            <SelectItem value="land">Terreno</SelectItem>
            <SelectItem value="commercial">Comercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quartos</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todos</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Banheiros</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todos</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  ),
};

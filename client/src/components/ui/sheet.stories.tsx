import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from './sheet';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { SlidersHorizontal, Menu, Filter, Settings, X } from 'lucide-react';

const meta: Meta<typeof Sheet> = {
  title: 'UI/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Sheet>;

// Right Side Sheet (Default)
export const RightSide: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Abrir Sheet
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Configurações</SheetTitle>
            <SheetDescription>
              Configure as opções do sistema
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Conteúdo do sheet vai aqui.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  },
};

// Left Side Sheet
export const LeftSide: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">
            <Menu className="h-4 w-4 mr-2" />
            Menu
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Menu de Navegação</SheetTitle>
            <SheetDescription>
              Navegue pelas seções do sistema
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
            <Button variant="ghost" className="w-full justify-start">Imóveis</Button>
            <Button variant="ghost" className="w-full justify-start">Leads</Button>
            <Button variant="ghost" className="w-full justify-start">Financeiro</Button>
            <Button variant="ghost" className="w-full justify-start">Configurações</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  },
};

// Filter Sheet - Real World Example
export const FilterSheet: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filtrar Imóveis</SheetTitle>
            <SheetDescription>
              Refine sua busca usando os filtros abaixo
            </SheetDescription>
          </SheetHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label>Tipo de Imóvel</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="house">Casa</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
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
              <Label>Preço Mínimo</Label>
              <Input type="number" placeholder="R$ 0" />
            </div>

            <div className="space-y-2">
              <Label>Preço Máximo</Label>
              <Input type="number" placeholder="R$ 1.000.000" />
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input placeholder="Digite a cidade" />
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Limpar Filtros</Button>
            </SheetClose>
            <Button onClick={() => setOpen(false)}>Aplicar Filtros</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
};

// Top Side Sheet
export const TopSide: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Abrir do Topo</Button>
        </SheetTrigger>
        <SheetContent side="top">
          <SheetHeader>
            <SheetTitle>Notificações</SheetTitle>
            <SheetDescription>
              Suas últimas notificações
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Você tem 3 novas notificações.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  },
};

// Bottom Side Sheet
export const BottomSide: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Abrir da Base</Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Ações Rápidas</SheetTitle>
            <SheetDescription>
              Selecione uma ação
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 grid grid-cols-2 gap-2">
            <Button variant="outline">Novo Imóvel</Button>
            <Button variant="outline">Novo Lead</Button>
            <Button variant="outline">Agendar Visita</Button>
            <Button variant="outline">Exportar Dados</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  },
};

// Mobile Filter Sheet - Common Pattern
export const MobileFilters: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <Filter className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Filtros</span>
              <span className="text-xs font-normal text-muted-foreground">3 ativos</span>
            </SheetTitle>
            <SheetDescription>
              Refine os resultados da busca
            </SheetDescription>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase">Status</Label>
              <Select>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="rented">Alugado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Ver Resultados
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
};

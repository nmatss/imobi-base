import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

// Basic Dialog
export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Abrir Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Título do Dialog</DialogTitle>
            <DialogDescription>
              Esta é uma descrição do dialog. Aqui você pode adicionar informações adicionais.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Conteúdo do dialog vai aqui.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => setOpen(false)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

// Form Dialog - Create Property
export const CreatePropertyForm: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Imóvel
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Imóvel</DialogTitle>
            <DialogDescription>
              Preencha as informações do imóvel. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="Apartamento 3 quartos..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Preço</Label>
              <Input id="price" type="number" placeholder="450000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" placeholder="Descreva o imóvel..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => setOpen(false)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

// Destructive Dialog - Delete Confirmation
export const DeleteConfirmation: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Imóvel
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              O imóvel "Apartamento 3 quartos - Centro" será excluído permanentemente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => setOpen(false)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

// Info Dialog
export const InfoDialog: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Ver Informações</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informações do Sistema</DialogTitle>
            <DialogDescription>
              Detalhes sobre o sistema ImobiBase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Versão:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Última atualização:</span>
              <span className="font-medium">25/12/2024</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Imóveis cadastrados:</span>
              <span className="font-medium">142</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

// Scrollable Dialog
export const ScrollableDialog: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Ver Termos de Uso</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[625px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Termos de Uso</DialogTitle>
            <DialogDescription>
              Leia atentamente os termos de uso
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-y-auto max-h-[50vh] space-y-4">
            <p className="text-sm text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p className="text-sm text-muted-foreground">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p className="text-sm text-muted-foreground">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
            <p className="text-sm text-muted-foreground">
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <p className="text-sm text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Rejeitar</Button>
            <Button onClick={() => setOpen(false)}>Aceitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

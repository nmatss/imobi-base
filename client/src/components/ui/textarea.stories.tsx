import React, { useState } from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';
import { Label } from './label';
import { Button } from './button';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

// Basic Textarea
export const Default: Story = {
  args: {
    placeholder: 'Digite sua mensagem...',
  },
};

// With Label
export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-md">
      <Label htmlFor="message">Mensagem</Label>
      <Textarea id="message" placeholder="Digite sua mensagem..." />
    </div>
  ),
};

// Different Sizes
export const Small: Story = {
  args: {
    rows: 2,
    placeholder: 'Textarea pequena (2 linhas)',
  },
};

export const Medium: Story = {
  args: {
    rows: 4,
    placeholder: 'Textarea média (4 linhas)',
  },
};

export const Large: Story = {
  args: {
    rows: 8,
    placeholder: 'Textarea grande (8 linhas)',
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Este campo está desabilitado',
    value: 'Conteúdo não editável',
  },
};

// With Character Count
export const WithCharacterCount: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const maxLength = 200;

    return (
      <div className="space-y-2 w-full max-w-md">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva o imóvel..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
          rows={4}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{value.length}/{maxLength} caracteres</span>
          <span className={value.length > maxLength * 0.9 ? 'text-yellow-600' : ''}>
            {maxLength - value.length} restantes
          </span>
        </div>
      </div>
    );
  },
};

// Property Description Form
export const PropertyDescription: Story = {
  render: () => {
    const [description, setDescription] = useState('');

    return (
      <div className="space-y-4 w-full max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="prop-desc">
            Descrição do Imóvel <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="prop-desc"
            placeholder="Descreva o imóvel em detalhes... Ex: Apartamento amplo com 3 quartos, sala espaçosa, cozinha planejada..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Uma boa descrição atrai mais interessados. Mínimo recomendado: 50 caracteres.
          </p>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className={`${description.length < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
            {description.length < 50
              ? `${50 - description.length} caracteres para atingir o mínimo`
              : 'Descrição adequada ✓'}
          </span>
          <span className="text-muted-foreground">{description.length} caracteres</span>
        </div>
      </div>
    );
  },
};

// Comment Form
export const CommentForm: Story = {
  render: () => {
    const [comment, setComment] = useState('');

    return (
      <div className="space-y-4 w-full max-w-md border rounded-lg p-4">
        <div className="space-y-2">
          <Label htmlFor="comment">Adicionar Comentário</Label>
          <Textarea
            id="comment"
            placeholder="Escreva um comentário sobre este lead..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setComment('')}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!comment.trim()}>
            Comentar
          </Button>
        </div>
      </div>
    );
  },
};

// Error State
export const WithError: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-md">
      <Label htmlFor="error-textarea" className="text-destructive">
        Observações
      </Label>
      <Textarea
        id="error-textarea"
        placeholder="Este campo tem um erro..."
        className="border-destructive focus-visible:ring-destructive"
        rows={3}
      />
      <p className="text-xs text-destructive">
        Este campo é obrigatório
      </p>
    </div>
  ),
};

// Resizable
export const Resizable: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-md">
      <Label htmlFor="resizable">Textarea Redimensionável</Label>
      <Textarea
        id="resizable"
        placeholder="Você pode redimensionar esta textarea..."
        rows={4}
        className="resize-y"
      />
      <p className="text-xs text-muted-foreground">
        Arraste o canto inferior direito para redimensionar
      </p>
    </div>
  ),
};

// Non-Resizable
export const NonResizable: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-md">
      <Label htmlFor="non-resizable">Textarea Não Redimensionável</Label>
      <Textarea
        id="non-resizable"
        placeholder="Esta textarea tem tamanho fixo..."
        rows={4}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">
        Esta textarea não pode ser redimensionada
      </p>
    </div>
  ),
};

// WhatsApp Template
export const WhatsAppTemplate: Story = {
  render: () => {
    const [template, setTemplate] = useState(
      'Olá {{nome}},\n\nTemos um imóvel perfeito para você!\n\n{{imovel}}\nValor: {{valor}}\n\nAgende sua visita: {{link}}'
    );

    return (
      <div className="space-y-4 w-full max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="template">Template de Mensagem WhatsApp</Label>
          <Textarea
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Variáveis disponíveis:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <code>{'{{nome}}'}</code>
            <code>{'{{imovel}}'}</code>
            <code>{'{{valor}}'}</code>
            <code>{'{{link}}'}</code>
          </div>
        </div>

        <Button>Salvar Template</Button>
      </div>
    );
  },
};

// Auto-growing Textarea
export const AutoGrowing: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const [rows, setRows] = useState(3);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      const lineCount = e.target.value.split('\n').length;
      setRows(Math.min(Math.max(lineCount, 3), 10));
    };

    return (
      <div className="space-y-2 w-full max-w-md">
        <Label htmlFor="auto-grow">Textarea com Crescimento Automático</Label>
        <Textarea
          id="auto-grow"
          placeholder="Digite e veja a textarea crescer..."
          value={value}
          onChange={handleChange}
          rows={rows}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Esta textarea cresce automaticamente até 10 linhas
        </p>
      </div>
    );
  },
};

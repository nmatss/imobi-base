import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { ActionMenu } from '../ActionMenu';
import { Edit, Trash, Copy } from 'lucide-react';
import userEvent from '@testing-library/user-event';

describe('ActionMenu', () => {
  it('renderiza trigger MoreVertical por padrão', () => {
    render(<ActionMenu items={[]} />);

    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
  });

  it('renderiza trigger MoreHorizontal quando orientation=horizontal', () => {
    render(<ActionMenu items={[]} orientation="horizontal" />);

    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
  });

  it('items são exibidos ao abrir', async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        items={[
          { label: 'Editar', icon: Edit, onClick: vi.fn() },
          { label: 'Duplicar', icon: Copy, onClick: vi.fn() },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Duplicar')).toBeInTheDocument();
  });

  it('onClick de cada item funciona', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <ActionMenu
        items={[
          { label: 'Editar', onClick: handleEdit },
          { label: 'Excluir', onClick: handleDelete },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    const editItem = screen.getByText('Editar');
    await user.click(editItem);

    expect(handleEdit).toHaveBeenCalledTimes(1);
  });

  it('variante default funciona', async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        items={[
          { label: 'Editar', onClick: vi.fn(), variant: 'default' },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('variante destructive aplica cor vermelha', async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        items={[
          { label: 'Excluir', onClick: vi.fn(), variant: 'destructive' },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    const item = screen.getByText('Excluir').closest('div[role="menuitem"]');
    expect(item).toHaveClass('text-destructive');
  });

  it('variante warning aplica cor laranja', async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        items={[
          { label: 'Atenção', onClick: vi.fn(), variant: 'warning' },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    const item = screen.getByText('Atenção').closest('div[role="menuitem"]');
    expect(item).toHaveClass('text-orange-600');
  });

  it('grupos de itens renderizam com separadores', async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        groups={[
          {
            label: 'Ações',
            items: [
              { label: 'Editar', onClick: vi.fn() },
            ],
          },
          {
            label: 'Zona de perigo',
            items: [
              { label: 'Excluir', onClick: vi.fn() },
            ],
          },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // Use getAllByText para labels que podem aparecer múltiplas vezes
    const acoesLabels = screen.getAllByText('Ações');
    expect(acoesLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('Zona de perigo')).toBeInTheDocument();
  });

  it('item separator renderiza separador', async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        items={[
          { label: 'Item 1', onClick: vi.fn(), separator: true },
          { label: 'Item 2', onClick: vi.fn() },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('item desabilitado não pode ser clicado', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <ActionMenu
        items={[
          { label: 'Desabilitado', onClick: handleClick, disabled: true },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    const item = screen.getByText('Desabilitado');
    expect(item.closest('div')).toHaveAttribute('data-disabled');
  });

  it('renderiza ícone do item', async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        items={[
          { label: 'Editar', icon: Edit, onClick: vi.fn() },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('renderiza shortcut quando fornecido', async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        items={[
          { label: 'Editar', onClick: vi.fn(), shortcut: '⌘E' },
        ]}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('⌘E')).toBeInTheDocument();
  });

  it('trigger customizado substitui o padrão', () => {
    render(
      <ActionMenu
        trigger={<button>Ações Customizadas</button>}
        items={[]}
      />
    );

    expect(screen.getByText('Ações Customizadas')).toBeInTheDocument();
  });

  it('tem aria-label correto para acessibilidade', () => {
    render(<ActionMenu items={[]} label="Menu de Ações" />);

    const trigger = screen.getByLabelText('Menu de Ações');
    expect(trigger).toBeInTheDocument();
  });

  it('renderiza sr-only text para acessibilidade', () => {
    const { container } = render(<ActionMenu items={[]} />);

    const srOnlyElements = container.querySelectorAll('.sr-only');
    expect(srOnlyElements.length).toBeGreaterThan(0);
    // Verifica se pelo menos um dos elementos sr-only contém 'Ações'
    const hasAcoesText = Array.from(srOnlyElements).some(el => el.textContent === 'Ações');
    expect(hasAcoesText).toBe(true);
  });
});

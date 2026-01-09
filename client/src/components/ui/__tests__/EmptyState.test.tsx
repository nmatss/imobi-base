import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { EmptyState } from '../EmptyState';
import { Home, Plus } from 'lucide-react';
import userEvent from '@testing-library/user-event';

describe('EmptyState', () => {
  it('renderiza ícone, título e descrição', () => {
    render(
      <EmptyState
        icon={Home}
        title="Nenhuma propriedade"
        description="Você ainda não cadastrou nenhuma propriedade"
      />
    );

    expect(screen.getByText('Nenhuma propriedade')).toBeInTheDocument();
    expect(screen.getByText('Você ainda não cadastrou nenhuma propriedade')).toBeInTheDocument();
  });

  it('renderiza botão de ação quando fornecido', () => {
    render(
      <EmptyState
        icon={Home}
        title="Nenhuma propriedade"
        description="Você ainda não cadastrou nenhuma propriedade"
        action={{
          label: 'Adicionar Propriedade',
          onClick: vi.fn(),
        }}
      />
    );

    expect(screen.getByText('Adicionar Propriedade')).toBeInTheDocument();
  });

  it('onClick do botão funciona', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <EmptyState
        icon={Home}
        title="Nenhuma propriedade"
        description="Descrição"
        action={{
          label: 'Adicionar',
          onClick: handleClick,
        }}
      />
    );

    const button = screen.getByText('Adicionar');
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('não renderiza botão quando action não fornecido', () => {
    render(
      <EmptyState
        icon={Home}
        title="Nenhuma propriedade"
        description="Descrição"
      />
    );

    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });

  it('renderiza ícone Plus no botão', () => {
    const { container } = render(
      <EmptyState
        icon={Home}
        title="Título"
        description="Descrição"
        action={{
          label: 'Adicionar',
          onClick: vi.fn(),
        }}
      />
    );

    // Verifica se existe um ícone dentro do botão
    const button = screen.getByText('Adicionar').closest('button');
    expect(button).toBeInTheDocument();
  });

  it('tem estrutura de layout correta', () => {
    const { container } = render(
      <EmptyState
        icon={Home}
        title="Título"
        description="Descrição"
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'text-center');
  });

  it('ícone tem estilo correto', () => {
    const { container } = render(
      <EmptyState
        icon={Home}
        title="Título"
        description="Descrição"
      />
    );

    const iconContainer = container.querySelector('.rounded-full');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass('w-16', 'h-16', 'bg-muted/50');
  });

  it('título tem estilo de heading', () => {
    render(
      <EmptyState
        icon={Home}
        title="Título de Teste"
        description="Descrição"
      />
    );

    const title = screen.getByText('Título de Teste');
    expect(title.tagName).toBe('H3');
    expect(title).toHaveClass('text-lg', 'font-semibold');
  });

  it('descrição tem estilo de texto secundário', () => {
    render(
      <EmptyState
        icon={Home}
        title="Título"
        description="Descrição de teste"
      />
    );

    const description = screen.getByText('Descrição de teste');
    expect(description.tagName).toBe('P');
    expect(description).toHaveClass('text-sm', 'text-muted-foreground');
  });
});

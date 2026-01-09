import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { ConfirmDialog } from '../confirm-dialog';
import userEvent from '@testing-library/user-event';

describe('ConfirmDialog', () => {
  it('renderiza quando open=true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Confirmar ação"
        description="Tem certeza?"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Confirmar ação')).toBeInTheDocument();
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
  });

  it('não renderiza quando open=false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Confirmar ação"
        description="Tem certeza?"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText('Confirmar ação')).not.toBeInTheDocument();
  });

  it('título correto é exibido', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Excluir imóvel?"
        description="Descrição"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Excluir imóvel?')).toBeInTheDocument();
  });

  it('descrição correta é exibida', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Esta ação não pode ser desfeita."
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument();
  });

  it('botão confirm com texto padrão', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Confirmar')).toBeInTheDocument();
  });

  it('botão confirm com texto customizado', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        confirmText="Sim, excluir"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Sim, excluir')).toBeInTheDocument();
  });

  it('botão cancel com texto padrão', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('botão cancel com texto customizado', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        cancelText="Não, voltar"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Não, voltar')).toBeInTheDocument();
  });

  it('botão confirm funciona', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Título"
        description="Descrição"
        onConfirm={handleConfirm}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    await user.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('botão cancel funciona', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Título"
        description="Descrição"
        onConfirm={vi.fn()}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    await user.click(cancelButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('variante default aplica estilo padrão', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        variant="default"
        onConfirm={vi.fn()}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton).not.toHaveClass('bg-destructive');
  });

  it('variante destructive aplica cor vermelha', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        variant="destructive"
        onConfirm={vi.fn()}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton).toHaveClass('bg-destructive');
  });

  it('exibe spinner quando isLoading=true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        isLoading={true}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('botões desabilitados quando isLoading=true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        isLoading={true}
        onConfirm={vi.fn()}
      />
    );

    const confirmButton = screen.getByText('Processando...');
    const cancelButton = screen.getByText('Cancelar');

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('onConfirm assíncrono funciona', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        onConfirm={handleConfirm}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    await user.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('fecha dialog após confirmação bem-sucedida', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Título"
        description="Descrição"
        onConfirm={handleConfirm}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    await user.click(confirmButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('exibe spinner durante confirmação assíncrona', async () => {
    const user = userEvent.setup();
    let resolveConfirm: () => void;
    const confirmPromise = new Promise<void>((resolve) => {
      resolveConfirm = resolve;
    });

    render(
      <ConfirmDialog
        open={true}
        title="Título"
        description="Descrição"
        onConfirm={() => confirmPromise}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    await user.click(confirmButton);

    // Durante o loading
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });
});

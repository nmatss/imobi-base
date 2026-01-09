import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { ErrorState, ErrorStateCompact, ErrorStateInline } from '../ErrorState';
import { AlertCircle } from 'lucide-react';
import userEvent from '@testing-library/user-event';

describe('ErrorState', () => {
  it('renderiza título e descrição padrão', () => {
    render(<ErrorState />);

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/Ocorreu um erro ao processar sua solicitação/)).toBeInTheDocument();
  });

  it('renderiza título customizado', () => {
    render(<ErrorState title="Erro personalizado" />);

    expect(screen.getByText('Erro personalizado')).toBeInTheDocument();
  });

  it('renderiza descrição customizada', () => {
    render(
      <ErrorState
        title="Erro"
        description="Descrição detalhada do erro"
      />
    );

    expect(screen.getByText('Descrição detalhada do erro')).toBeInTheDocument();
  });

  it('botão retry aparece quando onRetry fornecido', () => {
    render(<ErrorState onRetry={vi.fn()} />);

    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('onClick de retry funciona', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(<ErrorState onRetry={handleRetry} />);

    const retryButton = screen.getByText('Tentar novamente');
    await user.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('não renderiza botão quando onRetry não fornecido', () => {
    render(<ErrorState />);

    const retryButton = screen.queryByText('Tentar novamente');
    expect(retryButton).not.toBeInTheDocument();
  });

  it('variante default aplica cor padrão', () => {
    const { container } = render(<ErrorState variant="default" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('text-muted-foreground');
  });

  it('variante destructive aplica cor vermelha', () => {
    const { container } = render(<ErrorState variant="destructive" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('text-destructive');
  });

  it('variante warning aplica cor laranja', () => {
    const { container } = render(<ErrorState variant="warning" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('text-orange-600');
  });

  it('estado isRetrying exibe spinner', () => {
    render(<ErrorState onRetry={vi.fn()} isRetrying={true} />);

    expect(screen.getByText('Tentando...')).toBeInTheDocument();
  });

  it('botão está desabilitado quando isRetrying', () => {
    render(<ErrorState onRetry={vi.fn()} isRetrying={true} />);

    const retryButton = screen.getByText('Tentando...').closest('button');
    expect(retryButton).toBeDisabled();
  });

  it('renderiza ícone customizado', () => {
    const { container } = render(
      <ErrorState icon={<AlertCircle data-testid="custom-icon" />} />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renderiza ícone padrão quando não fornecido', () => {
    const { container } = render(<ErrorState />);

    const iconContainer = container.querySelector('.w-16.h-16');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renderiza actions customizadas', () => {
    render(
      <ErrorState
        actions={
          <button>Ação Customizada</button>
        }
      />
    );

    expect(screen.getByText('Ação Customizada')).toBeInTheDocument();
  });

  it('não renderiza botão retry quando actions fornecido', () => {
    render(
      <ErrorState
        onRetry={vi.fn()}
        actions={<button>Ação</button>}
      />
    );

    expect(screen.queryByText('Tentar novamente')).not.toBeInTheDocument();
    expect(screen.getByText('Ação')).toBeInTheDocument();
  });

  it('tem role alert para acessibilidade', () => {
    render(<ErrorState />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('tem aria-live polite para acessibilidade', () => {
    const { container } = render(<ErrorState />);

    const alert = container.querySelector('[aria-live="polite"]');
    expect(alert).toBeInTheDocument();
  });

  it('texto de retry customizado', () => {
    render(<ErrorState onRetry={vi.fn()} retryText="Tentar de novo" />);

    expect(screen.getByText('Tentar de novo')).toBeInTheDocument();
  });
});

describe('ErrorStateCompact', () => {
  it('renderiza mensagem padrão', () => {
    render(<ErrorStateCompact />);

    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
  });

  it('renderiza mensagem customizada', () => {
    render(<ErrorStateCompact message="Falha na conexão" />);

    expect(screen.getByText('Falha na conexão')).toBeInTheDocument();
  });

  it('renderiza botão retry quando onRetry fornecido', () => {
    render(<ErrorStateCompact onRetry={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('onClick funciona', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(<ErrorStateCompact onRetry={handleRetry} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('não renderiza botão quando onRetry não fornecido', () => {
    render(<ErrorStateCompact />);

    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });

  it('tem role alert', () => {
    render(<ErrorStateCompact />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('aplica className customizada', () => {
    render(<ErrorStateCompact className="custom-error" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-error');
  });
});

describe('ErrorStateInline', () => {
  it('renderiza mensagem', () => {
    render(<ErrorStateInline message="Campo obrigatório" />);

    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('tem role alert', () => {
    render(<ErrorStateInline message="Erro" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('tem estilo inline correto', () => {
    render(<ErrorStateInline message="Erro" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('flex', 'items-center', 'gap-2', 'text-sm', 'text-destructive');
  });

  it('aplica className customizada', () => {
    render(<ErrorStateInline message="Erro" className="custom-inline" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-inline');
  });
});

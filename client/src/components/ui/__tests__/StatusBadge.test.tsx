import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renderiza com status success', () => {
    render(<StatusBadge status="success" label="Concluído" />);

    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('status success tem cor verde', () => {
    const { container } = render(<StatusBadge status="success" label="Sucesso" />);

    const badge = screen.getByText('Sucesso');
    expect(badge).toHaveClass('bg-green-100', 'text-green-700');
  });

  it('status warning tem cor amarela', () => {
    render(<StatusBadge status="warning" label="Atenção" />);

    const badge = screen.getByText('Atenção');
    expect(badge).toHaveClass('bg-amber-100', 'text-amber-700');
  });

  it('status error tem cor vermelha', () => {
    render(<StatusBadge status="error" label="Erro" />);

    const badge = screen.getByText('Erro');
    expect(badge).toHaveClass('bg-red-100', 'text-red-700');
  });

  it('status info tem cor azul', () => {
    render(<StatusBadge status="info" label="Informação" />);

    const badge = screen.getByText('Informação');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('status neutral tem cor cinza', () => {
    render(<StatusBadge status="neutral" label="Neutro" />);

    const badge = screen.getByText('Neutro');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-700');
  });

  it('tamanho sm aplica classes corretas', () => {
    render(<StatusBadge status="success" label="Pequeno" size="sm" />);

    const badge = screen.getByText('Pequeno');
    expect(badge).toHaveClass('text-xs', 'px-2', 'py-0.5');
  });

  it('tamanho md aplica classes corretas (padrão)', () => {
    render(<StatusBadge status="success" label="Médio" />);

    const badge = screen.getByText('Médio');
    expect(badge).toHaveClass('text-sm', 'px-2.5', 'py-1');
  });

  it('tamanho lg aplica classes corretas', () => {
    render(<StatusBadge status="success" label="Grande" size="lg" />);

    const badge = screen.getByText('Grande');
    expect(badge).toHaveClass('text-base', 'px-3', 'py-1.5');
  });

  it('label é exibido corretamente', () => {
    const label = 'Status Personalizado';
    render(<StatusBadge status="info" label={label} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('combina status e tamanho corretamente', () => {
    render(<StatusBadge status="warning" label="Atenção" size="lg" />);

    const badge = screen.getByText('Atenção');
    expect(badge).toHaveClass('bg-amber-100', 'text-amber-700', 'text-base');
  });
});

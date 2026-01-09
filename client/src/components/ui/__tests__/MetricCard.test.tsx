import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { MetricCard } from '../MetricCard';
import { Home, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import userEvent from '@testing-library/user-event';

describe('MetricCard', () => {
  it('renderiza corretamente com props mínimas', () => {
    render(
      <MetricCard
        icon={Home}
        label="Total de Propriedades"
        value={42}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total de Propriedades')).toBeInTheDocument();
  });

  it('exibe valor como string', () => {
    render(
      <MetricCard
        icon={Home}
        label="Receita"
        value="R$ 150.000"
      />
    );

    expect(screen.getByText('R$ 150.000')).toBeInTheDocument();
  });

  it('renderiza ícone corretamente', () => {
    const { container } = render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
      />
    );

    // Verifica se o ícone está presente
    const iconContainer = container.querySelector('.bg-primary\\/10');
    expect(iconContainer).toBeInTheDocument();
  });

  it('mostra trend quando fornecido', () => {
    render(
      <MetricCard
        icon={Home}
        label="Vendas"
        value={100}
        trend={{
          value: '+12%',
          direction: 'up',
        }}
      />
    );

    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('trend up tem cor verde', () => {
    const { container } = render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
        trend={{
          value: '+10%',
          direction: 'up',
        }}
      />
    );

    const trendBadge = screen.getByText('+10%').closest('div');
    expect(trendBadge).toHaveClass('text-green-700');
  });

  it('trend down tem cor vermelha', () => {
    const { container } = render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
        trend={{
          value: '-5%',
          direction: 'down',
        }}
      />
    );

    const trendBadge = screen.getByText('-5%').closest('div');
    expect(trendBadge).toHaveClass('text-red-700');
  });

  it('trend neutral tem cor cinza', () => {
    render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
        trend={{
          value: '0%',
          direction: 'neutral',
        }}
      />
    );

    const trendBadge = screen.getByText('0%').closest('div');
    expect(trendBadge).toHaveClass('text-gray-700');
  });

  it('mostra trend label quando fornecido', () => {
    render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
        trend={{
          value: '+10%',
          direction: 'up',
          label: 'vs. mês anterior',
        }}
      />
    );

    expect(screen.getByText('vs. mês anterior')).toBeInTheDocument();
  });

  it('onClick é chamado quando clicável', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
        onClick={handleClick}
      />
    );

    const card = screen.getByText('Test').closest('div')?.parentElement;
    if (card) {
      await user.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it('tem hover effect quando clicável', () => {
    const { container } = render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
        onClick={() => {}}
      />
    );

    const card = container.querySelector('.cursor-pointer');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('hover:shadow-lg');
  });

  it('não tem hover effect quando não clicável', () => {
    const { container } = render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
      />
    );

    const card = container.querySelector('.cursor-pointer');
    expect(card).not.toBeInTheDocument();
  });

  it('aplica className customizada', () => {
    const { container } = render(
      <MetricCard
        icon={Home}
        label="Test"
        value={10}
        className="custom-class"
      />
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });
});

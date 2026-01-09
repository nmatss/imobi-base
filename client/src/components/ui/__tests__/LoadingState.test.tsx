import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { LoadingState, TextSkeleton, CardSkeleton, ListItemSkeleton } from '../LoadingState';

describe('LoadingState', () => {
  it('renderiza variante text', () => {
    const { container } = render(<LoadingState variant="text" />);

    const skeleton = container.querySelector('.skeleton-text');
    expect(skeleton).toBeInTheDocument();
  });

  it('renderiza variante card', () => {
    const { container } = render(<LoadingState variant="card" />);

    const skeleton = container.querySelector('.skeleton-card');
    expect(skeleton).toBeInTheDocument();
  });

  it('renderiza variante circle', () => {
    const { container } = render(<LoadingState variant="circle" />);

    const skeleton = container.querySelector('.skeleton-avatar');
    expect(skeleton).toBeInTheDocument();
  });

  it('renderiza variante table', () => {
    const { container } = render(<LoadingState variant="table" />);

    const skeleton = container.querySelector('.h-12');
    expect(skeleton).toBeInTheDocument();
  });

  it('renderiza variante list', () => {
    const { container } = render(<LoadingState variant="list" />);

    const skeleton = container.querySelector('.h-16');
    expect(skeleton).toBeInTheDocument();
  });

  it('count prop renderiza múltiplos skeletons', () => {
    render(<LoadingState variant="text" count={3} />);

    const skeletons = screen.getAllByRole('status');
    // Quando count > 1, há um wrapper status e items internos
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('spacing sm aplica classes corretas', () => {
    const { container } = render(<LoadingState variant="text" count={2} spacing="sm" />);

    const wrapper = container.querySelector('.space-y-2');
    expect(wrapper).toBeInTheDocument();
  });

  it('spacing md aplica classes corretas (padrão)', () => {
    const { container } = render(<LoadingState variant="text" count={2} spacing="md" />);

    const wrapper = container.querySelector('.space-y-4');
    expect(wrapper).toBeInTheDocument();
  });

  it('spacing lg aplica classes corretas', () => {
    const { container } = render(<LoadingState variant="text" count={2} spacing="lg" />);

    const wrapper = container.querySelector('.space-y-6');
    expect(wrapper).toBeInTheDocument();
  });

  it('tem aria-label para acessibilidade', () => {
    render(<LoadingState variant="text" />);

    expect(screen.getByLabelText('Carregando...')).toBeInTheDocument();
  });

  it('tem role status para acessibilidade', () => {
    render(<LoadingState variant="text" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renderiza count correto de elementos', () => {
    const { container } = render(<LoadingState variant="text" count={5} />);

    const skeletons = container.querySelectorAll('.skeleton-text');
    expect(skeletons).toHaveLength(5);
  });

  it('aplica className customizada', () => {
    const { container } = render(<LoadingState variant="text" className="custom-loading" />);

    const skeleton = container.querySelector('.custom-loading');
    expect(skeleton).toBeInTheDocument();
  });

  it('tem animação pulse', () => {
    const { container } = render(<LoadingState variant="text" />);

    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });
});

describe('TextSkeleton', () => {
  it('renderiza número correto de linhas', () => {
    const { container } = render(<TextSkeleton lines={4} />);

    const lines = container.querySelectorAll('.skeleton-text');
    expect(lines).toHaveLength(4);
  });

  it('renderiza 3 linhas por padrão', () => {
    const { container } = render(<TextSkeleton />);

    const lines = container.querySelectorAll('.skeleton-text');
    expect(lines).toHaveLength(3);
  });

  it('tem aria-label correto', () => {
    render(<TextSkeleton />);

    expect(screen.getByLabelText('Carregando texto...')).toBeInTheDocument();
  });

  it('aplica className customizada', () => {
    const { container } = render(<TextSkeleton className="custom-text" />);

    const line = container.querySelector('.custom-text');
    expect(line).toBeInTheDocument();
  });
});

describe('CardSkeleton', () => {
  it('renderiza estrutura de card', () => {
    const { container } = render(<CardSkeleton />);

    const card = container.querySelector('.skeleton-card');
    expect(card).toBeInTheDocument();
  });

  it('tem aria-label correto', () => {
    render(<CardSkeleton />);

    expect(screen.getByLabelText('Carregando card...')).toBeInTheDocument();
  });

  it('aplica className customizada', () => {
    const { container } = render(<CardSkeleton className="custom-card" />);

    const card = container.querySelector('.custom-card');
    expect(card).toBeInTheDocument();
  });
});

describe('ListItemSkeleton', () => {
  it('renderiza estrutura de list item', () => {
    const { container } = render(<ListItemSkeleton />);

    const avatar = container.querySelector('.skeleton-avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('tem aria-label correto', () => {
    render(<ListItemSkeleton />);

    expect(screen.getByLabelText('Carregando item...')).toBeInTheDocument();
  });

  it('aplica className customizada', () => {
    render(<ListItemSkeleton className="custom-item" />);

    const item = screen.getByLabelText('Carregando item...');
    expect(item).toHaveClass('custom-item');
  });
});

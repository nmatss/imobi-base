import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { PageHeader } from '../PageHeader';
import { Button } from '../button';

describe('PageHeader', () => {
  it('renderiza título', () => {
    render(<PageHeader title="Dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renderiza descrição quando fornecida', () => {
    render(
      <PageHeader
        title="Dashboard"
        description="Visão geral da sua imobiliária"
      />
    );

    expect(screen.getByText('Visão geral da sua imobiliária')).toBeInTheDocument();
  });

  it('não renderiza descrição quando não fornecida', () => {
    const { container } = render(<PageHeader title="Dashboard" />);

    const description = container.querySelector('.text-muted-foreground');
    expect(description).not.toBeInTheDocument();
  });

  it('renderiza badge quando fornecido', () => {
    render(
      <PageHeader
        title="Dashboard"
        badge={{ label: 'Beta', variant: 'secondary' }}
      />
    );

    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renderiza badge com variant padrão', () => {
    render(
      <PageHeader
        title="Dashboard"
        badge={{ label: 'Novo' }}
      />
    );

    expect(screen.getByText('Novo')).toBeInTheDocument();
  });

  it('não renderiza badge quando não fornecido', () => {
    render(<PageHeader title="Dashboard" />);

    const badges = screen.queryByRole('status');
    expect(badges).not.toBeInTheDocument();
  });

  it('renderiza actions quando fornecidas', () => {
    render(
      <PageHeader
        title="Dashboard"
        actions={
          <Button>Nova Propriedade</Button>
        }
      />
    );

    expect(screen.getByText('Nova Propriedade')).toBeInTheDocument();
  });

  it('renderiza múltiplas actions', () => {
    render(
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Button>Ação 1</Button>
            <Button>Ação 2</Button>
          </>
        }
      />
    );

    expect(screen.getByText('Ação 1')).toBeInTheDocument();
    expect(screen.getByText('Ação 2')).toBeInTheDocument();
  });

  it('renderiza todos os elementos juntos', () => {
    render(
      <PageHeader
        title="Dashboard"
        description="Descrição completa"
        badge={{ label: 'Beta' }}
        actions={<Button>Ação</Button>}
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Descrição completa')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Ação')).toBeInTheDocument();
  });

  it('tem classes responsivas corretas', () => {
    const { container } = render(<PageHeader title="Dashboard" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'xs:flex-row');
  });
});

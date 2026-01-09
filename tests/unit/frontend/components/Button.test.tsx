import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../../client/src/components/ui/button';

describe('Button Component', () => {
  it('should render with default variant and size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('should render with different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    let button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="destructive">Destructive</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button variant="link">Link</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<Button size="default">Default Size</Button>);
    let button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button size="sm">Small Size</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button size="lg">Large Size</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    rerender(<Button size="icon">Icon</Button>);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });

    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );
    const button = screen.getByRole('button', { name: /disabled button/i });

    expect(button).toBeDisabled();

    // Click should not trigger handler
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<Button isLoading>Loading Button</Button>);
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Loading Button');
  });

  it('should be disabled when loading', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button isLoading onClick={handleClick}>
        Loading
      </Button>
    );
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();

    // Click should not trigger handler when loading
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('custom-class');
  });

  it('should forward ref correctly', () => {
    const ref = vi.fn();

    render(<Button ref={ref}>Ref Button</Button>);

    expect(ref).toHaveBeenCalled();
  });

  it('should render children correctly', () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>
    );

    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    render(
      <Button aria-label="Submit form" type="submit">
        Submit
      </Button>
    );
    const button = screen.getByRole('button', { name: /submit form/i });

    expect(button).toHaveAttribute('type', 'submit');
  });
});

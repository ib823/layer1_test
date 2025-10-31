import { render, screen } from '@testing-library/react';
import { Logo } from './Logo';

describe('Logo Component', () => {
  it('renders with default props', () => {
    render(<Logo />);
    const image = screen.getByAltText('Prism Logo');
    expect(image).toBeInTheDocument();
  });

  it('renders with mark variant', () => {
    render(<Logo variant="mark" size="small" />);
    const image = screen.getByAltText('Prism Logo');
    expect(image).toBeInTheDocument();
    expect(image).toHaveClass('logo-mark');
  });

  it('renders as a link when href is provided', () => {
    render(<Logo href="/dashboard" />);
    const link = screen.getByRole('link', { name: /Prism Home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Logo size="small" />);
    let image = screen.getByAltText('Prism Logo');
    expect(image).toHaveClass('logo-small');

    rerender(<Logo size="medium" />);
    image = screen.getByAltText('Prism Logo');
    expect(image).toHaveClass('logo-medium');

    rerender(<Logo size="large" />);
    image = screen.getByAltText('Prism Logo');
    expect(image).toHaveClass('logo-large');
  });

  it('applies custom className', () => {
    render(<Logo className="custom-class" />);
    const image = screen.getByAltText('Prism Logo');
    expect(image).toHaveClass('custom-class');
  });
});

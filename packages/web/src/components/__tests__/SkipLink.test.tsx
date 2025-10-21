import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipLink } from '../SkipLink';

describe('SkipLink', () => {
  describe('Rendering', () => {
    it('should render skip link element', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toBeInTheDocument();
    });

    it('should have correct href targeting main content', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveAttribute('href', '#main-content');
    });

    it('should have correct text content', () => {
      render(<SkipLink />);

      const link = screen.getByText('Skip to main content');
      expect(link).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard focusable with tabIndex 0', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveAttribute('tabIndex', '0');
    });

    it('should have screen reader only class', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveClass('sr-only');
    });

    it('should become visible on focus', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      // Check for focus classes that make it visible
      expect(link).toHaveClass('focus:not-sr-only');
      expect(link).toHaveClass('focus:absolute');
    });

    it('should have high z-index to appear above other content', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveClass('focus:z-[9999]');
    });
  });

  describe('Styling', () => {
    it('should have positioning classes for when focused', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveClass('focus:top-4');
      expect(link).toHaveClass('focus:left-4');
    });

    it('should have padding classes', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveClass('focus:px-4');
      expect(link).toHaveClass('focus:py-2');
    });

    it('should have background and text color classes', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveClass('focus:bg-primary');
      expect(link).toHaveClass('focus:text-white');
    });

    it('should have rounded corners', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveClass('focus:rounded');
    });

    it('should have shadow effect', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveClass('focus:shadow-lg');
    });

    it('should have focus ring styles', () => {
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveClass('focus:outline-none');
      expect(link).toHaveClass('focus:ring-2');
      expect(link).toHaveClass('focus:ring-offset-2');
      expect(link).toHaveClass('focus:ring-primary');
    });
  });

  describe('User Interactions', () => {
    it('should be navigable with keyboard', async () => {
      const user = userEvent.setup();
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });

      // Tab to the link
      await user.tab();
      expect(link).toHaveFocus();
    });

    it('should be clickable', async () => {
      const user = userEvent.setup();
      render(<SkipLink />);

      const link = screen.getByRole('link', { name: /skip to main content/i });

      // Click should not throw error (navigation would be handled by browser)
      await user.click(link);
      expect(link).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work as first focusable element on page', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <SkipLink />
          <button>Other Button</button>
        </div>
      );

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });

      // First tab should focus skip link
      await user.tab();
      expect(skipLink).toHaveFocus();
    });

    it('should allow tabbing past to other elements', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <SkipLink />
          <button>Next Button</button>
        </div>
      );

      const nextButton = screen.getByRole('button', { name: /next button/i });

      // Tab twice to skip past the skip link
      await user.tab();
      await user.tab();
      expect(nextButton).toHaveFocus();
    });
  });

  describe('Component Structure', () => {
    it('should render as an anchor element', () => {
      const { container } = render(<SkipLink />);

      const anchor = container.querySelector('a[href="#main-content"]');
      expect(anchor).toBeInTheDocument();
    });

    it('should not have any child elements', () => {
      const { container } = render(<SkipLink />);

      const link = container.querySelector('a');
      expect(link?.children.length).toBe(0);
    });

    it('should render correct text node', () => {
      const { container } = render(<SkipLink />);

      const link = container.querySelector('a');
      expect(link?.textContent).toBe('Skip to main content');
    });
  });
});

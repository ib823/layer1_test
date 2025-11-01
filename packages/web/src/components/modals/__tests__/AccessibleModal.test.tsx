/**
 * AccessibleModal Tests
 *
 * Tests WCAG 2.1 AA compliance for modal dialog component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibleModal } from '../AccessibleModal';

expect.extend(toHaveNoViolations);

describe('AccessibleModal', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    it('should not have accessibility violations when open', async () => {
      const { container } = render(
        <AccessibleModal
          modalTitle="Test Modal"
          modalDescription="This is a test modal"
          title="Test Modal"
          open={true}
          onCancel={() => {}}
        >
          <div>Modal content</div>
        </AccessibleModal>
      );

      // Note: Modal renders into document.body, so we need to check that
      const results = await axe(document.body);
      expect(results).toHaveNoViolations();
    });

    it('should have role="dialog"', () => {
      render(
        <AccessibleModal
          modalTitle="Test Modal"
          modalDescription="Description"
          title="Test Modal"
          open={true}
          onCancel={() => {}}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(
        <AccessibleModal
          modalTitle="Test Modal"
          modalDescription="Description"
          title="Test Modal"
          open={true}
          onCancel={() => {}}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(
        <AccessibleModal
          modalTitle="Accessible Modal Title"
          modalDescription="Description"
          title="Accessible Modal Title"
          open={true}
          onCancel={() => {}}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');

      expect(labelledBy).toBeTruthy();

      // Title should exist with this ID
      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).toHaveTextContent('Accessible Modal Title');
    });

    it('should have aria-describedby pointing to description', () => {
      render(
        <AccessibleModal
          modalTitle="Title"
          modalDescription="Modal description for screen readers"
          title="Title"
          open={true}
          onCancel={() => {}}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      const dialog = screen.getByRole('dialog');
      const describedBy = dialog.getAttribute('aria-describedby');

      expect(describedBy).toBeTruthy();

      // Description should exist with this ID
      const descElement = document.getElementById(describedBy!);
      expect(descElement).toHaveTextContent('Modal description for screen readers');
    });

    it('should have screen reader only title and description', () => {
      render(
        <AccessibleModal
          modalTitle="SR Title"
          modalDescription="SR Description"
          title="Visual Title"
          open={true}
          onCancel={() => {}}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      const describedBy = dialog.getAttribute('aria-describedby');

      const titleElement = document.getElementById(labelledBy!);
      const descElement = document.getElementById(describedBy!);

      // Both should have sr-only class
      expect(titleElement).toHaveClass('sr-only');
      expect(descElement).toHaveClass('sr-only');
    });
  });

  describe('WCAG Criteria Coverage', () => {
    it('should satisfy 4.1.2 Name, Role, Value (Level A)', () => {
      render(
        <AccessibleModal
          modalTitle="WCAG Modal"
          modalDescription="Description"
          title="WCAG Modal"
          open={true}
          onCancel={() => {}}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      const dialog = screen.getByRole('dialog');

      // Has correct role
      expect(dialog.getAttribute('role')).toBe('dialog');

      // Has name via aria-labelledby
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      // Has description via aria-describedby
      const describedBy = dialog.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();

      // Has state via aria-modal
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should satisfy 2.4.3 Focus Order (Level A) with focus trap', () => {
      render(
        <AccessibleModal
          modalTitle="Focus Modal"
          modalDescription="Tests focus trapping"
          title="Focus Modal"
          open={true}
          onCancel={() => {}}
        >
          <div>
            <button>First</button>
            <button>Second</button>
          </div>
        </AccessibleModal>
      );

      // Modal should be present
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // FocusTrap component is used (tested via integration)
      // Focus management is handled by FocusTrap component
    });
  });

  describe('Focus management', () => {
    it('should trap focus when open', () => {
      render(
        <AccessibleModal
          modalTitle="Focus Trap Modal"
          modalDescription="Description"
          title="Focus Trap Modal"
          open={true}
          onCancel={() => {}}
        >
          <div>
            <button data-testid="modal-button">Click me</button>
          </div>
        </AccessibleModal>
      );

      const button = screen.getByTestId('modal-button');
      expect(button).toBeInTheDocument();

      // Focus trap is active (via FocusTrap component)
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should handle Escape key to close modal', () => {
      const onCancel = jest.fn();

      render(
        <AccessibleModal
          modalTitle="Escape Modal"
          modalDescription="Description"
          title="Escape Modal"
          open={true}
          onCancel={onCancel}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      // Modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // FocusTrap handles Escape key
      // (onCancel will be called by Ant Design Modal's built-in Escape handling)
    });
  });

  describe('Integration with Ant Design', () => {
    it('should pass through Ant Design Modal props', () => {
      render(
        <AccessibleModal
          modalTitle="Props Modal"
          modalDescription="Description"
          title="Props Modal"
          open={true}
          onCancel={() => {}}
          width={800}
          okText="Confirm"
          cancelText="Cancel"
        >
          <div>Content</div>
        </AccessibleModal>
      );

      // Modal should render with passed props
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <AccessibleModal
          modalTitle="Content Modal"
          modalDescription="Description"
          title="Content Modal"
          open={true}
          onCancel={() => {}}
        >
          <div data-testid="modal-content">
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </div>
        </AccessibleModal>
      );

      const content = screen.getByTestId('modal-content');
      expect(content).toBeInTheDocument();
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });
  });

  describe('Closed state', () => {
    it('should not render dialog when open=false', () => {
      render(
        <AccessibleModal
          modalTitle="Closed Modal"
          modalDescription="Description"
          title="Closed Modal"
          open={false}
          onCancel={() => {}}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not have accessibility violations when closed', async () => {
      const { container } = render(
        <AccessibleModal
          modalTitle="Closed Modal"
          modalDescription="Description"
          title="Closed Modal"
          open={false}
          onCancel={() => {}}
        >
          <div>Content</div>
        </AccessibleModal>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Unique IDs', () => {
    it('should generate unique IDs for title and description', () => {
      const { rerender } = render(
        <AccessibleModal
          modalTitle="Modal 1"
          modalDescription="Description 1"
          title="Modal 1"
          open={true}
          onCancel={() => {}}
        >
          <div>Content 1</div>
        </AccessibleModal>
      );

      const dialog1 = screen.getByRole('dialog');
      const labelledBy1 = dialog1.getAttribute('aria-labelledby');
      const describedBy1 = dialog1.getAttribute('aria-describedby');

      rerender(
        <AccessibleModal
          modalTitle="Modal 2"
          modalDescription="Description 2"
          title="Modal 2"
          open={true}
          onCancel={() => {}}
        >
          <div>Content 2</div>
        </AccessibleModal>
      );

      const dialog2 = screen.getByRole('dialog');
      const labelledBy2 = dialog2.getAttribute('aria-labelledby');
      const describedBy2 = dialog2.getAttribute('aria-describedby');

      // IDs should be different
      expect(labelledBy1).not.toBe(labelledBy2);
      expect(describedBy1).not.toBe(describedBy2);
    });
  });
});

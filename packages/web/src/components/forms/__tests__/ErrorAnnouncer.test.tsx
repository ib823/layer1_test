/**
 * ErrorAnnouncer Tests
 *
 * Tests WCAG 2.1 AA compliance for error announcement component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ErrorAnnouncer } from '../ErrorAnnouncer';

expect.extend(toHaveNoViolations);

describe('ErrorAnnouncer', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <ErrorAnnouncer
          errorMessage="An error occurred"
          successMessage="Operation successful"
          onClearError={() => {}}
          onClearSuccess={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce errors with role="alert" and aria-live="assertive"', () => {
      render(
        <ErrorAnnouncer
          errorMessage="Invalid input"
          successMessage=""
          onClearError={() => {}}
          onClearSuccess={() => {}}
        />
      );

      const errorElements = screen.getAllByRole('alert');
      const errorAnnouncer = errorElements.find((el) =>
        el.textContent?.includes('Invalid input')
      );

      expect(errorAnnouncer).toBeInTheDocument();
      expect(errorAnnouncer).toHaveAttribute('aria-live', 'assertive');
      expect(errorAnnouncer).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce success with role="status" and aria-live="polite"', () => {
      render(
        <ErrorAnnouncer
          errorMessage=""
          successMessage="Operation completed"
          onClearError={() => {}}
          onClearSuccess={() => {}}
        />
      );

      const statusElements = screen.getAllByRole('status');
      const successAnnouncer = statusElements.find((el) =>
        el.textContent?.includes('Operation completed')
      );

      expect(successAnnouncer).toBeInTheDocument();
      expect(successAnnouncer).toHaveAttribute('aria-live', 'polite');
      expect(successAnnouncer).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have screen reader only class', () => {
      render(
        <ErrorAnnouncer
          errorMessage="Error"
          successMessage=""
          onClearError={() => {}}
          onClearSuccess={() => {}}
        />
      );

      const errorElements = screen.getAllByRole('alert');
      errorElements.forEach((el) => {
        expect(el).toHaveClass('sr-only');
      });
    });
  });

  describe('WCAG Criteria Coverage', () => {
    it('should satisfy 4.1.3 Status Messages (Level AA)', () => {
      render(
        <ErrorAnnouncer
          errorMessage="Error occurred"
          successMessage="Success"
          infoMessage="Info message"
          onClearError={() => {}}
          onClearSuccess={() => {}}
          onClearInfo={() => {}}
        />
      );

      // Error: assertive alert
      const alerts = screen.getAllByRole('alert');
      const errorAlert = alerts.find((el) => el.textContent?.includes('Error occurred'));
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');

      // Success: polite status
      const statuses = screen.getAllByRole('status');
      const successStatus = statuses.find((el) => el.textContent?.includes('Success'));
      expect(successStatus).toHaveAttribute('aria-live', 'polite');

      // Info: polite status
      const infoStatus = statuses.find((el) => el.textContent?.includes('Info message'));
      expect(infoStatus).toHaveAttribute('aria-live', 'polite');
    });

    it('should satisfy 3.3.1 Error Identification (Level A)', () => {
      render(
        <ErrorAnnouncer
          errorMessage="Form submission failed"
          successMessage=""
          onClearError={() => {}}
          onClearSuccess={() => {}}
        />
      );

      // Error is identified
      const alerts = screen.getAllByRole('alert');
      const errorAlert = alerts.find((el) =>
        el.textContent?.includes('Form submission failed')
      );
      expect(errorAlert).toBeInTheDocument();
    });
  });

  describe('Auto-clear functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should auto-clear error message after specified duration', () => {
      const onClearError = jest.fn();

      render(
        <ErrorAnnouncer
          errorMessage="Error"
          successMessage=""
          onClearError={onClearError}
          onClearSuccess={() => {}}
          autoClearDuration={5000}
        />
      );

      expect(onClearError).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(onClearError).toHaveBeenCalledTimes(1);
    });

    it('should auto-clear success message after specified duration', () => {
      const onClearSuccess = jest.fn();

      render(
        <ErrorAnnouncer
          errorMessage=""
          successMessage="Success"
          onClearError={() => {}}
          onClearSuccess={onClearSuccess}
          autoClearDuration={5000}
        />
      );

      expect(onClearSuccess).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(onClearSuccess).toHaveBeenCalledTimes(1);
    });

    it('should auto-clear info message after specified duration', () => {
      const onClearInfo = jest.fn();

      render(
        <ErrorAnnouncer
          errorMessage=""
          successMessage=""
          infoMessage="Info"
          onClearError={() => {}}
          onClearSuccess={() => {}}
          onClearInfo={onClearInfo}
          autoClearDuration={5000}
        />
      );

      expect(onClearInfo).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(onClearInfo).toHaveBeenCalledTimes(1);
    });

    it('should use default duration of 10000ms if not specified', () => {
      const onClearError = jest.fn();

      render(
        <ErrorAnnouncer
          errorMessage="Error"
          successMessage=""
          onClearError={onClearError}
          onClearSuccess={() => {}}
        />
      );

      jest.advanceTimersByTime(9999);
      expect(onClearError).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(onClearError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dual announcement strategy', () => {
    it('should provide both visual and screen reader announcements', () => {
      render(
        <ErrorAnnouncer
          errorMessage="Test error"
          successMessage=""
          onClearError={() => {}}
          onClearSuccess={() => {}}
        />
      );

      // Screen reader announcement (sr-only)
      const alerts = screen.getAllByRole('alert');
      const srAnnouncement = alerts.find(
        (el) => el.textContent?.includes('Test error') && el.classList.contains('sr-only')
      );
      expect(srAnnouncement).toBeInTheDocument();
    });

    it('should handle multiple simultaneous messages', () => {
      render(
        <ErrorAnnouncer
          errorMessage="Error message"
          successMessage="Success message"
          infoMessage="Info message"
          onClearError={() => {}}
          onClearSuccess={() => {}}
          onClearInfo={() => {}}
        />
      );

      const alerts = screen.getAllByRole('alert');
      const statuses = screen.getAllByRole('status');

      expect(alerts.length).toBeGreaterThan(0);
      expect(statuses.length).toBeGreaterThan(0);
    });
  });

  describe('Empty state handling', () => {
    it('should render without messages', () => {
      const { container } = render(
        <ErrorAnnouncer
          errorMessage=""
          successMessage=""
          onClearError={() => {}}
          onClearSuccess={() => {}}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('should not call clear callbacks when messages are empty', () => {
      const onClearError = jest.fn();
      const onClearSuccess = jest.fn();

      jest.useFakeTimers();

      render(
        <ErrorAnnouncer
          errorMessage=""
          successMessage=""
          onClearError={onClearError}
          onClearSuccess={onClearSuccess}
          autoClearDuration={5000}
        />
      );

      jest.advanceTimersByTime(5000);

      expect(onClearError).not.toHaveBeenCalled();
      expect(onClearSuccess).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FraudAlertCard } from '../FraudAlertCard';

const mockAlerts = [
  {
    id: 'alert-1',
    alertType: 'duplicate',
    severity: 'high' as const,
    invoiceNumber: 'INV-2024-001',
    description: 'Duplicate invoice detected with same amount and vendor',
    evidence: {
      duplicateInvoices: ['INV-2024-001', 'INV-2024-002'],
      amount: 50000,
    },
    status: 'open',
  },
  {
    id: 'alert-2',
    alertType: 'pattern',
    severity: 'medium' as const,
    invoiceNumber: 'INV-2024-003',
    description: 'Suspicious pattern in invoice timing',
    evidence: {
      submissionTime: '02:30 AM',
      dayOfWeek: 'Saturday',
    },
    status: 'open',
  },
  {
    id: 'alert-3',
    alertType: 'outlier',
    severity: 'low' as const,
    invoiceNumber: 'INV-2024-004',
    description: 'Amount is significantly higher than vendor average',
    evidence: {
      amount: 150000,
      vendorAverage: 50000,
      deviation: 200,
    },
    status: 'resolved',
  },
];

describe('FraudAlertCard', () => {
  describe('Rendering', () => {
    it('should render all alerts by default', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText('Duplicate Invoice')).toBeInTheDocument();
      expect(screen.getByText('Suspicious Pattern')).toBeInTheDocument();
      expect(screen.getByText('Outlier Detected')).toBeInTheDocument();
    });

    it('should render severity filter dropdown', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText(/filter by severity/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display correct counts in filter options', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      const select = screen.getByRole('combobox');
      expect(within(select).getByText(`All (${mockAlerts.length})`)).toBeInTheDocument();
      expect(within(select).getByText('High (1)')).toBeInTheDocument();
      expect(within(select).getByText('Medium (1)')).toBeInTheDocument();
      expect(within(select).getByText('Low (1)')).toBeInTheDocument();
    });

    it('should render invoice numbers', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText(/INV-2024-001/)).toBeInTheDocument();
      expect(screen.getByText(/INV-2024-003/)).toBeInTheDocument();
      expect(screen.getByText(/INV-2024-004/)).toBeInTheDocument();
    });

    it('should render alert descriptions', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText(/duplicate invoice detected/i)).toBeInTheDocument();
      expect(screen.getByText(/suspicious pattern in invoice timing/i)).toBeInTheDocument();
    });

    it('should render alert statuses', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      const openStatuses = screen.getAllByText('open');
      expect(openStatuses.length).toBe(2);
      expect(screen.getByText('resolved')).toBeInTheDocument();
    });
  });

  describe('Severity Indicators', () => {
    it('should display high severity badge', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('should display medium severity badge', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('should display low severity badge', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    it('should render severity icons', () => {
      const { container } = render(<FraudAlertCard alerts={mockAlerts} />);

      const icons = container.querySelectorAll('svg.w-5.h-5');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should apply correct color classes for high severity', () => {
      const { container } = render(<FraudAlertCard alerts={mockAlerts} />);

      const highSeverityCard = container.querySelector('.bg-red-100');
      expect(highSeverityCard).toBeInTheDocument();
    });

    it('should apply correct color classes for medium severity', () => {
      const { container } = render(<FraudAlertCard alerts={mockAlerts} />);

      const mediumSeverityCard = container.querySelector('.bg-orange-100');
      expect(mediumSeverityCard).toBeInTheDocument();
    });

    it('should apply correct color classes for low severity', () => {
      const { container } = render(<FraudAlertCard alerts={mockAlerts} />);

      const lowSeverityCard = container.querySelector('.bg-yellow-100');
      expect(lowSeverityCard).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter alerts by high severity', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'high');

      expect(screen.getByText('Duplicate Invoice')).toBeInTheDocument();
      expect(screen.queryByText('Suspicious Pattern')).not.toBeInTheDocument();
      expect(screen.queryByText('Outlier Detected')).not.toBeInTheDocument();
    });

    it('should filter alerts by medium severity', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'medium');

      expect(screen.queryByText('Duplicate Invoice')).not.toBeInTheDocument();
      expect(screen.getByText('Suspicious Pattern')).toBeInTheDocument();
      expect(screen.queryByText('Outlier Detected')).not.toBeInTheDocument();
    });

    it('should filter alerts by low severity', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'low');

      expect(screen.queryByText('Duplicate Invoice')).not.toBeInTheDocument();
      expect(screen.queryByText('Suspicious Pattern')).not.toBeInTheDocument();
      expect(screen.getByText('Outlier Detected')).toBeInTheDocument();
    });

    it('should show all alerts when filter is set to all', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'high');
      await user.selectOptions(select, 'all');

      expect(screen.getByText('Duplicate Invoice')).toBeInTheDocument();
      expect(screen.getByText('Suspicious Pattern')).toBeInTheDocument();
      expect(screen.getByText('Outlier Detected')).toBeInTheDocument();
    });
  });

  describe('Expandable Evidence', () => {
    it('should not show evidence by default', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.queryByText(/Evidence:/)).not.toBeInTheDocument();
    });

    it('should expand alert to show evidence when clicked', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const firstAlert = screen.getByText('Duplicate Invoice').closest('div');
      await user.click(firstAlert!);

      expect(screen.getByText(/Evidence:/)).toBeInTheDocument();
    });

    it('should display JSON formatted evidence', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const firstAlert = screen.getByText('Duplicate Invoice').closest('div');
      await user.click(firstAlert!);

      expect(screen.getByText(/duplicateInvoices/)).toBeInTheDocument();
    });

    it('should collapse evidence when clicked again', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const firstAlert = screen.getByText('Duplicate Invoice').closest('div');
      await user.click(firstAlert!);
      expect(screen.getByText(/Evidence:/)).toBeInTheDocument();

      await user.click(firstAlert!);
      expect(screen.queryByText(/Evidence:/)).not.toBeInTheDocument();
    });

    it('should only expand one alert at a time', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const firstAlert = screen.getByText('Duplicate Invoice').closest('div');
      const secondAlert = screen.getByText('Suspicious Pattern').closest('div');

      await user.click(firstAlert!);
      expect(screen.getByText(/duplicateInvoices/)).toBeInTheDocument();

      await user.click(secondAlert!);
      expect(screen.queryByText(/duplicateInvoices/)).not.toBeInTheDocument();
      expect(screen.getByText(/submissionTime/)).toBeInTheDocument();
    });

    it('should show action buttons when expanded', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const firstAlert = screen.getByText('Duplicate Invoice').closest('div');
      await user.click(firstAlert!);

      expect(screen.getByText('Investigate')).toBeInTheDocument();
      expect(screen.getByText('Mark as False Positive')).toBeInTheDocument();
      expect(screen.getByText('Assign')).toBeInTheDocument();
    });
  });

  describe('Alert Type Labels', () => {
    it('should display correct label for duplicate type', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText('Duplicate Invoice')).toBeInTheDocument();
    });

    it('should display correct label for pattern type', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText('Suspicious Pattern')).toBeInTheDocument();
    });

    it('should display correct label for outlier type', () => {
      render(<FraudAlertCard alerts={mockAlerts} />);

      expect(screen.getByText('Outlier Detected')).toBeInTheDocument();
    });

    it('should handle threshold type', () => {
      const thresholdAlert = [
        {
          ...mockAlerts[0],
          alertType: 'threshold',
        },
      ];
      render(<FraudAlertCard alerts={thresholdAlert} />);

      expect(screen.getByText('Threshold Violation')).toBeInTheDocument();
    });

    it('should display raw type for unknown types', () => {
      const unknownAlert = [
        {
          ...mockAlerts[0],
          alertType: 'custom-type',
        },
      ];
      render(<FraudAlertCard alerts={unknownAlert} />);

      expect(screen.getByText('custom-type')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no alerts provided', () => {
      render(<FraudAlertCard alerts={[]} />);

      expect(screen.getByText('No fraud alerts')).toBeInTheDocument();
      expect(screen.getByText(/no fraud alerts detected in this analysis/i)).toBeInTheDocument();
    });

    it('should show empty state when filter returns no results', async () => {
      const user = userEvent.setup();
      const onlyHighAlerts = [mockAlerts[0]];
      render(<FraudAlertCard alerts={onlyHighAlerts} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'medium');

      expect(screen.getByText('No fraud alerts')).toBeInTheDocument();
      expect(screen.getByText(/no medium severity alerts found/i)).toBeInTheDocument();
    });

    it('should display checkmark icon in empty state', () => {
      const { container } = render(<FraudAlertCard alerts={[]} />);

      const checkIcon = container.querySelector('svg.h-12.w-12');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should show chevron icon for expandable alerts', () => {
      const { container } = render(<FraudAlertCard alerts={mockAlerts} />);

      const chevrons = container.querySelectorAll('svg[viewBox="0 0 20 20"]');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should rotate chevron when alert is expanded', async () => {
      const user = userEvent.setup();
      const { container } = render(<FraudAlertCard alerts={mockAlerts} />);

      // Find the alert container with both the description and chevron
      const alertCards = container.querySelectorAll('.border.rounded-lg');
      const firstCard = alertCards[0];
      const chevron = firstCard.querySelector('svg.w-5.h-5.transition-transform');

      expect(chevron).toBeInTheDocument();
      const initialClass = chevron?.getAttribute('class') || '';
      expect(initialClass).not.toContain('rotate-180');

      await user.click(screen.getByText('Duplicate Invoice'));

      const expandedClass = chevron?.getAttribute('class') || '';
      expect(expandedClass).toContain('rotate-180');
    });

    it('should apply hover effects', () => {
      const { container } = render(<FraudAlertCard alerts={mockAlerts} />);

      const clickableArea = container.querySelector('.cursor-pointer');
      expect(clickableArea).toHaveClass('hover:opacity-90');
    });
  });

  describe('User Interactions', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const select = screen.getByRole('combobox');
      await user.tab();
      expect(select).toHaveFocus();
    });

    it('should handle multiple clicks on same alert', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const firstAlert = screen.getByText('Duplicate Invoice').closest('div');

      await user.click(firstAlert!);
      expect(screen.getByText(/Evidence:/)).toBeInTheDocument();

      await user.click(firstAlert!);
      expect(screen.queryByText(/Evidence:/)).not.toBeInTheDocument();

      await user.click(firstAlert!);
      expect(screen.getByText(/Evidence:/)).toBeInTheDocument();
    });

    it('should handle action button clicks without errors', async () => {
      const user = userEvent.setup();
      render(<FraudAlertCard alerts={mockAlerts} />);

      const firstAlert = screen.getByText('Duplicate Invoice').closest('div');
      await user.click(firstAlert!);

      const investigateBtn = screen.getByText('Investigate');
      await user.click(investigateBtn);
      expect(investigateBtn).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle alerts with missing optional fields', () => {
      const minimalAlert = [
        {
          id: 'alert-minimal',
          alertType: 'unknown',
          severity: 'high' as const,
          invoiceNumber: 'INV-TEST',
          description: 'Test alert',
          evidence: {},
          status: 'open',
        },
      ];

      render(<FraudAlertCard alerts={minimalAlert} />);
      expect(screen.getByText(/test alert/i)).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDescAlert = [
        {
          ...mockAlerts[0],
          description: 'A'.repeat(500),
        },
      ];

      render(<FraudAlertCard alerts={longDescAlert} />);
      expect(screen.getByText('A'.repeat(500))).toBeInTheDocument();
    });

    it('should handle complex nested evidence objects', async () => {
      const user = userEvent.setup();
      const complexAlert = [
        {
          ...mockAlerts[0],
          evidence: {
            level1: {
              level2: {
                level3: 'deep value',
              },
            },
            array: [1, 2, 3],
          },
        },
      ];

      render(<FraudAlertCard alerts={complexAlert} />);

      const firstAlert = screen.getByText('Duplicate Invoice').closest('div');
      await user.click(firstAlert!);

      expect(screen.getByText(/level1/)).toBeInTheDocument();
    });
  });
});

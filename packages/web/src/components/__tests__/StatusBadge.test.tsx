import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../admin/StatusBadge';

describe('StatusBadge', () => {
  describe('Status Rendering', () => {
    it('should render CONNECTED status correctly', () => {
      render(<StatusBadge status="CONNECTED" />);

      const label = screen.getByText('Connected');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('text-sm', 'font-medium');
    });

    it('should render DISCONNECTED status correctly', () => {
      render(<StatusBadge status="DISCONNECTED" />);

      const label = screen.getByText('Disconnected');
      expect(label).toBeInTheDocument();
    });

    it('should render DEGRADED status correctly', () => {
      render(<StatusBadge status="DEGRADED" />);

      const label = screen.getByText('Degraded');
      expect(label).toBeInTheDocument();
    });

    it('should render ERROR status correctly', () => {
      render(<StatusBadge status="ERROR" />);

      const label = screen.getByText('Error');
      expect(label).toBeInTheDocument();
    });

    it('should render UNKNOWN status correctly', () => {
      render(<StatusBadge status="UNKNOWN" />);

      const label = screen.getByText('Unknown');
      expect(label).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with default medium size', () => {
      const { container } = render(<StatusBadge status="CONNECTED" />);

      const indicator = container.querySelector('.h-3.w-3');
      expect(indicator).toBeInTheDocument();
    });

    it('should render small size when specified', () => {
      const { container } = render(<StatusBadge status="CONNECTED" size="sm" />);

      const indicator = container.querySelector('.h-2.w-2');
      expect(indicator).toBeInTheDocument();
    });

    it('should render large size when specified', () => {
      const { container } = render(<StatusBadge status="CONNECTED" size="lg" />);

      const indicator = container.querySelector('.h-4.w-4');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Visual Structure', () => {
    it('should render with flex container layout', () => {
      const { container } = render(<StatusBadge status="CONNECTED" />);

      const wrapper = container.querySelector('.flex.items-center.gap-2');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render indicator dot with rounded shape', () => {
      const { container } = render(<StatusBadge status="CONNECTED" />);

      const indicator = container.querySelector('.rounded-full');
      expect(indicator).toBeInTheDocument();
    });

    it('should apply correct color for CONNECTED status', () => {
      const { container } = render(<StatusBadge status="CONNECTED" />);

      const indicator = container.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should apply correct color for DISCONNECTED status', () => {
      const { container } = render(<StatusBadge status="DISCONNECTED" />);

      const indicator = container.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should apply correct color for DEGRADED status', () => {
      const { container } = render(<StatusBadge status="DEGRADED" />);

      const indicator = container.querySelector('.bg-yellow-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should apply correct color for ERROR status', () => {
      const { container } = render(<StatusBadge status="ERROR" />);

      const indicator = container.querySelector('.bg-red-600');
      expect(indicator).toBeInTheDocument();
    });

    it('should apply correct color for UNKNOWN status', () => {
      const { container } = render(<StatusBadge status="UNKNOWN" />);

      const indicator = container.querySelector('.bg-gray-400');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render text label for screen readers', () => {
      render(<StatusBadge status="CONNECTED" />);

      const label = screen.getByText('Connected');
      expect(label).toBeVisible();
    });

    it('should maintain semantic structure', () => {
      const { container } = render(<StatusBadge status="CONNECTED" />);

      // Check that both indicator and label are present
      const indicator = container.querySelector('.rounded-full');
      const label = screen.getByText('Connected');

      expect(indicator).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all status values without errors', () => {
      const statuses = ['CONNECTED', 'DISCONNECTED', 'DEGRADED', 'ERROR', 'UNKNOWN'] as const;

      statuses.forEach(status => {
        const { unmount } = render(<StatusBadge status={status} />);
        expect(screen.getByText(/Connected|Disconnected|Degraded|Error|Unknown/)).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle all size values without errors', () => {
      const sizes = ['sm', 'md', 'lg'] as const;

      sizes.forEach(size => {
        const { unmount } = render(<StatusBadge status="CONNECTED" size={size} />);
        expect(screen.getByText('Connected')).toBeInTheDocument();
        unmount();
      });
    });
  });
});

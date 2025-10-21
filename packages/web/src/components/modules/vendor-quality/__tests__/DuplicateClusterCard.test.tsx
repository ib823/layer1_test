import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuplicateClusterCard } from '../DuplicateClusterCard';

const mockClusters = [
  {
    id: 'cluster-abc123',
    clusterSize: 3,
    vendorIds: ['V001', 'V002', 'V003'],
    vendorNames: ['Acme Corp', 'Acme Corporation', 'ACME Corp.'],
    similarityScore: 95.5,
    matchFields: ['name', 'address'],
    estimatedSavings: 50000,
    recommendedAction: 'Merge all three vendors into a single master record',
    status: 'pending',
  },
  {
    id: 'cluster-def456',
    clusterSize: 2,
    vendorIds: ['V010', 'V011'],
    vendorNames: ['Global Industries Inc', 'Global Industries Incorporated'],
    similarityScore: 88.2,
    matchFields: ['name', 'taxId'],
    estimatedSavings: 25000,
    recommendedAction: 'Review and merge if confirmed as duplicate',
    status: 'pending',
  },
  {
    id: 'cluster-ghi789',
    clusterSize: 2,
    vendorIds: ['V020', 'V021'],
    vendorNames: ['Tech Solutions Ltd', 'Tech Solutions Limited'],
    similarityScore: 72.8,
    matchFields: ['name'],
    estimatedSavings: 15000,
    recommendedAction: 'Manual review recommended',
    status: 'merged',
  },
  {
    id: 'cluster-jkl012',
    clusterSize: 2,
    vendorIds: ['V030', 'V031'],
    vendorNames: ['Building Supplies Co', 'Building Supply Company'],
    similarityScore: 68.5,
    matchFields: ['name', 'phone'],
    estimatedSavings: 8000,
    recommendedAction: 'Verify before merging',
    status: 'ignored',
  },
];

describe('DuplicateClusterCard', () => {
  describe('Rendering', () => {
    it('should render all clusters by default', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      // All 4 clusters should be rendered
      const clusterHeaders = screen.getAllByText(/Cluster #/);
      expect(clusterHeaders.length).toBe(4);
    });

    it('should render status filter dropdown', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      expect(screen.getByText(/filter by status/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display correct counts in filter options', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const select = screen.getByRole('combobox');
      expect(within(select).getByText('All (4)')).toBeInTheDocument();
      expect(within(select).getByText('Pending (2)')).toBeInTheDocument();
      expect(within(select).getByText('Merged (1)')).toBeInTheDocument();
      expect(within(select).getByText('Ignored (1)')).toBeInTheDocument();
    });

    it('should display similarity scores', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      // 95.5 rounds to 96
      expect(screen.getByText('96% Match')).toBeInTheDocument();
      expect(screen.getByText('88% Match')).toBeInTheDocument();
      expect(screen.getByText('73% Match')).toBeInTheDocument();
    });

    it('should display cluster sizes', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      expect(screen.getByText('3 Vendors')).toBeInTheDocument();
      const twoVendorsBadges = screen.getAllByText('2 Vendors');
      expect(twoVendorsBadges.length).toBe(3);
    });

    it('should display matched fields', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      expect(screen.getByText(/name, address/)).toBeInTheDocument();
      expect(screen.getByText(/name, taxId/)).toBeInTheDocument();
    });

    it('should display estimated savings', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('$25,000')).toBeInTheDocument();
      expect(screen.getByText('$15,000')).toBeInTheDocument();
    });

    it('should display status for each cluster', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      // "Pending" appears in both the filter dropdown and status labels
      const pendingStatuses = screen.getAllByText('Pending');
      expect(pendingStatuses.length).toBeGreaterThan(0);

      // Merged and Ignored appear in dropdown and as status labels
      const mergedStatuses = screen.getAllByText('Merged');
      expect(mergedStatuses.length).toBeGreaterThan(0);

      const ignoredStatuses = screen.getAllByText('Ignored');
      expect(ignoredStatuses.length).toBeGreaterThan(0);
    });
  });

  describe('Similarity Score Badges', () => {
    it('should apply red badge for high similarity (>=90%)', () => {
      const { container } = render(<DuplicateClusterCard clusters={mockClusters} />);

      // 95.5 rounds to 96
      const highSimilarityBadge = screen.getByText('96% Match');
      expect(highSimilarityBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should apply orange badge for medium similarity (>=75%)', () => {
      const { container } = render(<DuplicateClusterCard clusters={mockClusters} />);

      const mediumSimilarityBadge = screen.getByText('88% Match');
      expect(mediumSimilarityBadge).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    it('should apply yellow badge for low similarity (<75%)', () => {
      const { container } = render(<DuplicateClusterCard clusters={mockClusters} />);

      const lowSimilarityBadge = screen.getByText('73% Match');
      expect(lowSimilarityBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  describe('Status Filtering', () => {
    it('should filter clusters by pending status', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'pending');

      // Should show only 2 pending clusters
      const clusterHeaders = screen.getAllByText(/Cluster #/);
      expect(clusterHeaders.length).toBe(2);
    });

    it('should filter clusters by merged status', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'merged');

      // Should show only 1 merged cluster
      const clusterHeaders = screen.getAllByText(/Cluster #/);
      expect(clusterHeaders.length).toBe(1);
    });

    it('should filter clusters by ignored status', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'ignored');

      // Should show only 1 ignored cluster
      const clusterHeaders = screen.getAllByText(/Cluster #/);
      expect(clusterHeaders.length).toBe(1);
    });

    it('should show all clusters when filter is set to all', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'pending');
      await user.selectOptions(select, 'all');

      // Should show all 4 clusters again
      const clusterHeaders = screen.getAllByText(/Cluster #/);
      expect(clusterHeaders.length).toBe(4);
    });
  });

  describe('Sorting', () => {
    it('should sort clusters by estimated savings in descending order', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const savingsElements = screen.getAllByText(/\$\d+,?\d*/);
      const savingsTexts = savingsElements.map(el => el.textContent);

      // Should be sorted: $50,000, $25,000, $15,000, $8,000
      expect(savingsTexts[0]).toContain('50,000');
      expect(savingsTexts[1]).toContain('25,000');
      expect(savingsTexts[2]).toContain('15,000');
      expect(savingsTexts[3]).toContain('8,000');
    });
  });

  describe('Expandable Details', () => {
    it('should not show details by default', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      expect(screen.queryByText('Vendor IDs:')).not.toBeInTheDocument();
      expect(screen.queryByText('Vendor Names:')).not.toBeInTheDocument();
    });

    it('should expand cluster to show details when clicked', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const firstCluster = screen.getAllByText(/Cluster #/)[0].closest('div');
      await user.click(firstCluster!);

      expect(screen.getByText('Vendor IDs:')).toBeInTheDocument();
      expect(screen.getByText('Vendor Names:')).toBeInTheDocument();
    });

    it('should display vendor IDs when expanded', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const firstCluster = screen.getAllByText(/Cluster #/)[0].closest('div');
      await user.click(firstCluster!);

      expect(screen.getByText('V001')).toBeInTheDocument();
      expect(screen.getByText('V002')).toBeInTheDocument();
      expect(screen.getByText('V003')).toBeInTheDocument();
    });

    it('should display vendor names when expanded', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const firstCluster = screen.getAllByText(/Cluster #/)[0].closest('div');
      await user.click(firstCluster!);

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
      expect(screen.getByText('ACME Corp.')).toBeInTheDocument();
    });

    it('should display recommended action when expanded', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const firstCluster = screen.getAllByText(/Cluster #/)[0].closest('div');
      await user.click(firstCluster!);

      expect(screen.getByText(/merge all three vendors into a single master record/i)).toBeInTheDocument();
    });

    it('should collapse details when clicked again', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const firstCluster = screen.getAllByText(/Cluster #/)[0].closest('div');
      await user.click(firstCluster!);
      expect(screen.getByText('Vendor IDs:')).toBeInTheDocument();

      await user.click(firstCluster!);
      expect(screen.queryByText('Vendor IDs:')).not.toBeInTheDocument();
    });

    it('should only expand one cluster at a time', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const clusters = screen.getAllByText(/Cluster #/);
      const firstCluster = clusters[0].closest('div');
      const secondCluster = clusters[1].closest('div');

      await user.click(firstCluster!);
      expect(screen.getByText('V001')).toBeInTheDocument();

      await user.click(secondCluster!);
      expect(screen.queryByText('V001')).not.toBeInTheDocument();
      expect(screen.getByText('V010')).toBeInTheDocument();
    });

    it('should show action buttons when expanded', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const firstCluster = screen.getAllByText(/Cluster #/)[0].closest('div');
      await user.click(firstCluster!);

      expect(screen.getByText('Merge Vendors')).toBeInTheDocument();
      expect(screen.getByText('Review Details')).toBeInTheDocument();
      expect(screen.getByText('Mark as False Positive')).toBeInTheDocument();
      expect(screen.getByText('Ignore')).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should show chevron icon for expandable clusters', () => {
      const { container } = render(<DuplicateClusterCard clusters={mockClusters} />);

      const chevrons = container.querySelectorAll('svg[viewBox="0 0 20 20"]');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should rotate chevron when cluster is expanded', async () => {
      const user = userEvent.setup();
      const { container } = render(<DuplicateClusterCard clusters={mockClusters} />);

      const clusterCards = container.querySelectorAll('.border.border-gray-200');
      const firstCard = clusterCards[0];
      const chevron = firstCard.querySelector('svg.w-5.h-5');

      expect(chevron).toBeInTheDocument();
      const initialClass = chevron?.getAttribute('class') || '';
      expect(initialClass).not.toContain('rotate-180');

      const clusters = screen.getAllByText(/Cluster #/);
      await user.click(clusters[0]);

      const expandedClass = chevron?.getAttribute('class') || '';
      expect(expandedClass).toContain('rotate-180');
    });

    it('should apply hover effects to clickable areas', () => {
      const { container } = render(<DuplicateClusterCard clusters={mockClusters} />);

      const clickableArea = container.querySelector('.cursor-pointer');
      expect(clickableArea).toHaveClass('hover:bg-gray-50');
    });

    it('should display cluster ID truncated to 8 characters', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      // Full ID is "cluster-abc123" but should display first 8 chars: "cluster-"
      const clusterHeaders = screen.getAllByText(/Cluster #cluster-/);
      expect(clusterHeaders.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no clusters provided', () => {
      render(<DuplicateClusterCard clusters={[]} />);

      expect(screen.getByText('No duplicate clusters')).toBeInTheDocument();
      expect(screen.getByText(/no duplicate clusters detected/i)).toBeInTheDocument();
    });

    it('should show empty state when filter returns no results', async () => {
      const user = userEvent.setup();
      const onlyPendingClusters = [mockClusters[0]];
      render(<DuplicateClusterCard clusters={onlyPendingClusters} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'merged');

      expect(screen.getByText('No duplicate clusters')).toBeInTheDocument();
      expect(screen.getByText(/no merged clusters found/i)).toBeInTheDocument();
    });

    it('should display checkmark icon in empty state', () => {
      const { container } = render(<DuplicateClusterCard clusters={[]} />);

      const checkIcon = container.querySelector('svg.h-12.w-12');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('should apply correct color for pending status', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const pendingStatuses = screen.getAllByText('Pending');
      // Filter only the status labels (not dropdown options)
      const statusLabels = Array.from(pendingStatuses).filter(el =>
        el.classList.contains('text-blue-600')
      );
      expect(statusLabels.length).toBeGreaterThan(0);
    });

    it('should apply correct color for merged status', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const mergedStatuses = screen.getAllByText('Merged');
      // Filter only the status labels (not dropdown options)
      const statusLabels = Array.from(mergedStatuses).filter(el =>
        el.classList.contains('text-green-600')
      );
      expect(statusLabels.length).toBeGreaterThan(0);
    });

    it('should apply correct color for ignored status', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const ignoredStatuses = screen.getAllByText('Ignored');
      // Filter only the status labels (not dropdown options)
      const statusLabels = Array.from(ignoredStatuses).filter(el =>
        el.classList.contains('text-gray-600')
      );
      expect(statusLabels.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const select = screen.getByRole('combobox');
      await user.tab();
      expect(select).toHaveFocus();
    });

    it('should handle multiple clicks on same cluster', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const firstCluster = screen.getAllByText(/Cluster #/)[0].closest('div');

      await user.click(firstCluster!);
      expect(screen.getByText('Vendor IDs:')).toBeInTheDocument();

      await user.click(firstCluster!);
      expect(screen.queryByText('Vendor IDs:')).not.toBeInTheDocument();

      await user.click(firstCluster!);
      expect(screen.getByText('Vendor IDs:')).toBeInTheDocument();
    });

    it('should handle action button clicks without errors', async () => {
      const user = userEvent.setup();
      render(<DuplicateClusterCard clusters={mockClusters} />);

      const firstCluster = screen.getAllByText(/Cluster #/)[0].closest('div');
      await user.click(firstCluster!);

      const mergeBtn = screen.getByText('Merge Vendors');
      await user.click(mergeBtn);
      expect(mergeBtn).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle cluster with single vendor', () => {
      const singleVendorCluster = [
        {
          ...mockClusters[0],
          clusterSize: 1,
          vendorIds: ['V001'],
          vendorNames: ['Acme Corp'],
        },
      ];

      render(<DuplicateClusterCard clusters={singleVendorCluster} />);
      expect(screen.getByText('1 Vendors')).toBeInTheDocument();
    });

    it('should handle very high similarity score', () => {
      const perfectMatchCluster = [
        {
          ...mockClusters[0],
          similarityScore: 99.9,
        },
      ];

      render(<DuplicateClusterCard clusters={perfectMatchCluster} />);
      expect(screen.getByText('100% Match')).toBeInTheDocument();
    });

    it('should handle very low similarity score', () => {
      const lowMatchCluster = [
        {
          ...mockClusters[0],
          similarityScore: 50.2,
        },
      ];

      render(<DuplicateClusterCard clusters={lowMatchCluster} />);
      expect(screen.getByText('50% Match')).toBeInTheDocument();
    });

    it('should handle large estimated savings', () => {
      const largeCluster = [
        {
          ...mockClusters[0],
          estimatedSavings: 5000000,
        },
      ];

      render(<DuplicateClusterCard clusters={largeCluster} />);
      expect(screen.getByText('$5,000,000')).toBeInTheDocument();
    });

    it('should handle many matched fields', () => {
      const manyFieldsCluster = [
        {
          ...mockClusters[0],
          matchFields: ['name', 'address', 'taxId', 'phone', 'email', 'bankAccount'],
        },
      ];

      render(<DuplicateClusterCard clusters={manyFieldsCluster} />);
      expect(screen.getByText(/name, address, taxId, phone, email, bankAccount/)).toBeInTheDocument();
    });

    it('should handle very long vendor names', async () => {
      const user = userEvent.setup();
      const longNameCluster = [
        {
          ...mockClusters[0],
          vendorNames: ['A'.repeat(100), 'B'.repeat(100)],
        },
      ];

      render(<DuplicateClusterCard clusters={longNameCluster} />);

      const firstCluster = screen.getByText(/Cluster #/).closest('div');
      await user.click(firstCluster!);

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });

    it('should handle empty recommended action', async () => {
      const user = userEvent.setup();
      const noActionCluster = [
        {
          ...mockClusters[0],
          recommendedAction: '',
        },
      ];

      render(<DuplicateClusterCard clusters={noActionCluster} />);

      const firstCluster = screen.getByText(/Cluster #/).closest('div');
      await user.click(firstCluster!);

      expect(screen.getByText('Recommended Action:')).toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('should capitalize first letter of status', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      // These appear multiple times (dropdown + status labels)
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Merged').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Ignored').length).toBeGreaterThan(0);
    });

    it('should format currency with thousands separators', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('$25,000')).toBeInTheDocument();
    });

    it('should display percentage as integer', () => {
      render(<DuplicateClusterCard clusters={mockClusters} />);

      // 95.5 should display as "96% Match" (rounded)
      expect(screen.getByText('96% Match')).toBeInTheDocument();
      // 88.2 should display as "88% Match"
      expect(screen.getByText('88% Match')).toBeInTheDocument();
    });
  });
});

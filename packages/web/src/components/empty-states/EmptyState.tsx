/**
 * Improved Empty State Component
 *
 * Encouraging, actionable empty states instead of depressing "No data" messages.
 */

'use client';

import { Button, Empty } from 'antd';
import {
  PlusOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  FileSearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Type of empty state determines icon and default message */
  type?:
    | 'no-data'
    | 'no-results'
    | 'no-violations'
    | 'getting-started'
    | 'success'
    | 'error';
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string | ReactNode;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Custom icon */
  icon?: ReactNode;
  /** Show illustration */
  showIllustration?: boolean;
}

const emptyStateConfig = {
  'no-data': {
    icon: <FileSearchOutlined style={{ fontSize: 64, color: '#1890ff' }} />,
    title: 'No data yet',
    description: 'Get started by connecting your ERP system or importing data',
  },
  'no-results': {
    icon: <FileSearchOutlined style={{ fontSize: 64, color: '#faad14' }} />,
    title: 'No matches found',
    description: 'Try adjusting your filters or search terms',
  },
  'no-violations': {
    icon: <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />,
    title: 'All clear!',
    description: 'No segregation of duties violations detected. Great job maintaining compliance!',
  },
  'getting-started': {
    icon: <RocketOutlined style={{ fontSize: 64, color: '#722ed1' }} />,
    title: "Let's get started!",
    description: 'Set up your first compliance check in just a few steps',
  },
  success: {
    icon: <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />,
    title: 'Success!',
    description: 'Everything is configured correctly',
  },
  error: {
    icon: <SafetyOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />,
    title: 'Something went wrong',
    description: 'Please try again or contact support if the issue persists',
  },
};

/**
 * Improved Empty State Component
 *
 * @example
 * ```tsx
 * <EmptyState
 *   type="no-violations"
 *   action={{
 *     label: "Run Another Check",
 *     onClick: () => runCheck(),
 *     icon: <ThunderboltOutlined />
 *   }}
 * />
 * ```
 */
export function EmptyState({
  type = 'no-data',
  title,
  description,
  action,
  secondaryAction,
  icon,
  showIllustration = true,
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalIcon = icon || config.icon;

  return (
    <div className="flex items-center justify-center min-h-[400px] py-12">
      <div className="text-center max-w-md">
        {showIllustration && <div className="mb-6">{finalIcon}</div>}

        <h3 className="text-xl font-semibold mb-2 text-gray-800">{finalTitle}</h3>

        <div className="text-gray-600 mb-6">{finalDescription}</div>

        {(action || secondaryAction) && (
          <div className="flex justify-center gap-3">
            {action && (
              <Button
                type="primary"
                size="large"
                icon={action.icon || <PlusOutlined />}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button size="large" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Specialized empty states for common scenarios
 */

export function NoViolationsState({ onRunCheck }: { onRunCheck?: () => void }) {
  return (
    <EmptyState
      type="no-violations"
      action={
        onRunCheck
          ? {
              label: 'Run Another Check',
              onClick: onRunCheck,
              icon: <ThunderboltOutlined />,
            }
          : undefined
      }
    />
  );
}

export function NoDataState({
  onImport,
  onConnect,
}: {
  onImport?: () => void;
  onConnect?: () => void;
}) {
  return (
    <EmptyState
      type="getting-started"
      title="Ready to start?"
      description="Connect to your ERP system to begin compliance monitoring"
      action={
        onConnect
          ? {
              label: 'Connect ERP System',
              onClick: onConnect,
              icon: <RocketOutlined />,
            }
          : undefined
      }
      secondaryAction={
        onImport
          ? {
              label: 'Import Sample Data',
              onClick: onImport,
            }
          : undefined
      }
    />
  );
}

export function NoSearchResultsState({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      type="no-results"
      title="No matches found"
      description="Try adjusting your search filters or criteria"
      action={
        onClearFilters
          ? {
              label: 'Clear All Filters',
              onClick: onClearFilters,
            }
          : undefined
      }
    />
  );
}

export function FirstTimeSetupState({ onStart }: { onStart: () => void }) {
  return (
    <EmptyState
      type="getting-started"
      title="Welcome! Let's get you set up"
      description={
        <div className="space-y-2">
          <p>Here's what we'll do:</p>
          <ul className="text-left inline-block text-sm">
            <li>✓ Connect to your ERP system</li>
            <li>✓ Configure compliance rules</li>
            <li>✓ Run your first audit</li>
          </ul>
        </div>
      }
      action={{
        label: 'Start Setup',
        onClick: onStart,
        icon: <RocketOutlined />,
      }}
    />
  );
}

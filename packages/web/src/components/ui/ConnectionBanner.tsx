/**
 * Connection Status Banner
 *
 * Displays informational banners when data sources are disconnected or using mock data
 */

import React from 'react';

export type BannerVariant = 'info' | 'warning' | 'error';
export type BannerSize = 'small' | 'medium' | 'large';

export interface ConnectionBannerProps {
  /** Banner message */
  message: string;
  /** Optional detailed description */
  description?: string;
  /** Visual variant */
  variant?: BannerVariant;
  /** Size of the banner */
  size?: BannerSize;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Show/hide the banner */
  visible?: boolean;
  /** Allow user to dismiss */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

const variantStyles: Record<BannerVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  error: 'bg-red-50 border-red-200 text-red-900',
};

const iconStyles: Record<BannerVariant, string> = {
  info: 'text-blue-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};

const sizeStyles: Record<BannerSize, { padding: string; text: string }> = {
  small: { padding: 'p-2', text: 'text-sm' },
  medium: { padding: 'p-4', text: 'text-base' },
  large: { padding: 'p-6', text: 'text-lg' },
};

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  message,
  description,
  variant = 'info',
  size = 'medium',
  action,
  secondaryAction,
  visible = true,
  dismissible = false,
  onDismiss,
}) => {
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (!visible || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const { padding, text } = sizeStyles[size];

  return (
    <div
      className={`border-l-4 ${padding} ${variantStyles[variant]} rounded-r-md shadow-sm`}
      role="alert"
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className={`flex-shrink-0 ${iconStyles[variant]}`}>
          {variant === 'info' && (
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {variant === 'warning' && (
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {variant === 'error' && (
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className={`ml-3 flex-1 ${text}`}>
          <p className="font-semibold">{message}</p>
          {description && <p className="mt-1 opacity-90">{description}</p>}

          {/* Actions */}
          {(action || secondaryAction) && (
            <div className="mt-3 flex gap-2">
              {action && (
                <button
                  onClick={action.onClick}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md
                    ${
                      variant === 'info'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : ''
                    }
                    ${
                      variant === 'warning'
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : ''
                    }
                    ${
                      variant === 'error'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : ''
                    }
                    transition-colors
                  `}
                >
                  {action.label}
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md
                    border
                    ${variant === 'info' ? 'border-blue-600 text-blue-700 hover:bg-blue-100' : ''}
                    ${
                      variant === 'warning'
                        ? 'border-yellow-600 text-yellow-700 hover:bg-yellow-100'
                        : ''
                    }
                    ${variant === 'error' ? 'border-red-600 text-red-700 hover:bg-red-100' : ''}
                    transition-colors
                  `}
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className={`
                inline-flex rounded-md p-1.5
                ${variant === 'info' ? 'text-blue-600 hover:bg-blue-100' : ''}
                ${variant === 'warning' ? 'text-yellow-600 hover:bg-yellow-100' : ''}
                ${variant === 'error' ? 'text-red-600 hover:bg-red-100' : ''}
                transition-colors
              `}
              aria-label="Dismiss"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Preset banners for common scenarios
 */
export const MockDataBanner: React.FC<{ onConfigure?: () => void }> = ({ onConfigure }) => (
  <ConnectionBanner
    variant="warning"
    message="Using Mock Data"
    description="This view is displaying sample data. Connect to your SAP system to see real data."
    action={
      onConfigure
        ? {
            label: 'Configure Connection',
            onClick: onConfigure,
          }
        : undefined
    }
    secondaryAction={{
      label: 'Learn More',
      onClick: () => window.open('/docs/connections', '_blank'),
    }}
    dismissible
  />
);

export const DisconnectedBanner: React.FC<{
  systemName: string;
  onConnect: () => void;
}> = ({ systemName, onConnect }) => (
  <ConnectionBanner
    variant="error"
    message={`${systemName} Not Connected`}
    description={`Unable to fetch data from ${systemName}. Please check your connection settings.`}
    action={{
      label: 'Configure Connection',
      onClick: onConnect,
    }}
  />
);

export const FeatureDisabledBanner: React.FC<{
  featureName: string;
  onRequest?: () => void;
}> = ({ featureName, onRequest }) => (
  <ConnectionBanner
    variant="info"
    message={`${featureName} Not Available`}
    description="This feature is not yet enabled for your organization."
    action={
      onRequest
        ? {
            label: 'Request Access',
            onClick: onRequest,
          }
        : undefined
    }
    dismissible
  />
);

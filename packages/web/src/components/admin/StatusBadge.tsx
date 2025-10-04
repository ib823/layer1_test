import React from 'react';

interface StatusBadgeProps {
  status: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' | 'ERROR' | 'UNKNOWN';
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG = {
  CONNECTED: { color: 'bg-green-500', label: 'Connected' },
  DISCONNECTED: { color: 'bg-red-500', label: 'Disconnected' },
  DEGRADED: { color: 'bg-yellow-500', label: 'Degraded' },
  ERROR: { color: 'bg-red-600', label: 'Error' },
  UNKNOWN: { color: 'bg-gray-400', label: 'Unknown' },
};

const SIZE_CONFIG = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeClass = SIZE_CONFIG[size];

  return (
    <div className="flex items-center gap-2">
      <div className={`${config.color} ${sizeClass} rounded-full`} />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}
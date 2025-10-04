import React from 'react';

export interface BadgeProps {
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  children,
  className = ''
}) => {
  const variantClass = `badge-${variant}`;
  const classes = `badge ${variantClass} ${className}`.trim();

  return <span className={classes}>{children}</span>;
};

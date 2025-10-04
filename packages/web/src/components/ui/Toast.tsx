'use client';

import React, { useEffect } from 'react';
import { clsx } from 'clsx';

export interface ToastProps {
  id: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  variant = 'info',
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={clsx('toast', `toast-${variant}`)} role="alert">
      <span className="toast-icon">{icons[variant]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => onClose(id)} aria-label="Close notification">
        ✕
      </button>
    </div>
  );
};
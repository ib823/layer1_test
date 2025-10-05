'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface TimelineItem {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  user?: string;
  type?: 'violation' | 'resolution' | 'review' | 'system' | 'update';
  metadata?: Record<string, unknown>;
}

export interface TimelineProps {
  items: TimelineItem[];
  loading?: boolean;
  emptyMessage?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  items,
  loading = false,
  emptyMessage = 'No activity to display',
}) => {
  if (loading) {
    return (
      <div className="timeline">
        {[1, 2, 3].map((i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-marker skeleton" />
            <div className="timeline-content">
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="timeline-empty">
        <div className="timeline-empty-icon">📋</div>
        <p className="timeline-empty-text">{emptyMessage}</p>
      </div>
    );
  }

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'violation':
        return '⚠️';
      case 'resolution':
        return '✅';
      case 'review':
        return '👁️';
      case 'system':
        return '⚙️';
      case 'update':
        return '🔄';
      default:
        return '📌';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'violation':
        return 'timeline-marker-critical';
      case 'resolution':
        return 'timeline-marker-success';
      case 'review':
        return 'timeline-marker-info';
      case 'system':
        return 'timeline-marker-secondary';
      case 'update':
        return 'timeline-marker-warning';
      default:
        return '';
    }
  };

  return (
    <div className="timeline">
      {items.map((item) => (
        <div key={item.id} className="timeline-item">
          <div className={clsx('timeline-marker', getTypeColor(item.type))}>
            <span className="timeline-marker-icon">{getTypeIcon(item.type)}</span>
          </div>
          <div className="timeline-content">
            <div className="timeline-header">
              <h4 className="timeline-title">{item.title}</h4>
              <time className="timeline-time">{item.timestamp}</time>
            </div>
            {item.description && (
              <p className="timeline-description">{item.description}</p>
            )}
            {item.user && (
              <div className="timeline-meta">
                <span className="timeline-user">👤 {item.user}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
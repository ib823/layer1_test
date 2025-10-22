/**
 * Chart Widget Component
 *
 * Displays charts (line, bar, pie, etc.)
 */

'use client';

import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartData } from '@/lib/dashboards/types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface ChartWidgetProps {
  data: ChartData;
  type?: 'line' | 'bar' | 'pie' | 'doughnut';
  height?: number;
}

/**
 * Chart Widget
 *
 * @example
 * ```tsx
 * <ChartWidget
 *   type="line"
 *   data={{
 *     labels: ['Jan', 'Feb', 'Mar'],
 *     datasets: [{
 *       label: 'Violations',
 *       data: [12, 19, 3],
 *       borderColor: 'rgb(75, 192, 192)',
 *     }]
 *   }}
 * />
 * ```
 */
export function ChartWidget({
  data,
  type = 'line',
  height = 300,
}: ChartWidgetProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    ...(type === 'line' || type === 'bar'
      ? {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        }
      : {}),
  };

  const ChartComponent = {
    line: Line,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut,
  }[type];

  return (
    <div style={{ height }}>
      <ChartComponent data={data} options={options} />
    </div>
  );
}

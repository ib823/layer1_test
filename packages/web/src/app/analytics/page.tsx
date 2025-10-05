'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30days');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Insights</h1>
        <p className="text-muted-foreground">Comprehensive analytics dashboard</p>
      </div>

      <div className="flex gap-3">
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      <Card className="p-6">
        <p>Analytics content placeholder</p>
      </Card>
    </div>
  );
}

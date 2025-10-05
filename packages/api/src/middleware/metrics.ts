import { Request, Response, NextFunction } from 'express';

const metrics = {
  requests: 0,
  errors: 0,
  responseTime: [] as number[],
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  metrics.requests++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.responseTime.push(duration);
    if (res.statusCode >= 500) metrics.errors++;
  });

  next();
}

export function getMetrics() {
  const avg = metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length || 0;
  return {
    requests: metrics.requests,
    errors: metrics.errors,
    avgResponseTime: Math.round(avg),
    errorRate: metrics.requests ? ((metrics.errors / metrics.requests) * 100).toFixed(2) + '%' : '0%',
  };
}

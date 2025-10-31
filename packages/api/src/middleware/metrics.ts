/**
 * Prometheus Metrics Middleware
 * Collects and exposes application metrics for monitoring
 */

import { Request, Response, NextFunction } from 'express';

// Try to import prom-client, fallback to simple metrics if not available
let promClient: any;
let register: any;
let Counter: any;
let Histogram: any;
let Gauge: any;

try {
  promClient = require('prom-client');
  register = promClient.register;
  Counter = promClient.Counter;
  Histogram = promClient.Histogram;
  Gauge = promClient.Gauge;

  // Enable default metrics collection (CPU, memory, etc.)
  promClient.collectDefaultMetrics({ prefix: 'sap_framework_' });
} catch (error) {
  // prom-client not installed, use simple metrics
  console.warn('prom-client not available, using simple metrics');
}

// Simple metrics fallback
const simpleMetrics = {
  requests: 0,
  errors: 0,
  responseTime: [] as number[],
};

// Prometheus metrics (if available)
let httpRequestDuration: any;
let httpRequestCounter: any;
let httpErrorCounter: any;
let activeConnections: any;

if (promClient) {
  httpRequestDuration = new Histogram({
    name: 'sap_framework_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  httpRequestCounter = new Counter({
    name: 'sap_framework_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  httpErrorCounter = new Counter({
    name: 'sap_framework_http_errors_total',
    help: 'Total number of HTTP errors (4xx, 5xx)',
    labelNames: ['method', 'route', 'status_code'],
  });

  activeConnections = new Gauge({
    name: 'sap_framework_active_connections',
    help: 'Number of active HTTP connections',
  });
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Simple metrics
  simpleMetrics.requests++;

  // Prometheus metrics
  if (activeConnections) {
    activeConnections.inc();
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const durationSeconds = duration / 1000;

    // Simple metrics
    simpleMetrics.responseTime.push(duration);
    if (res.statusCode >= 400) {
      simpleMetrics.errors++;
    }

    // Prometheus metrics
    if (httpRequestDuration) {
      const route = req.route?.path || req.path;
      const method = req.method;
      const statusCode = res.statusCode.toString();

      httpRequestDuration.observe(
        { method, route, status_code: statusCode },
        durationSeconds
      );

      httpRequestCounter.inc({ method, route, status_code: statusCode });

      if (res.statusCode >= 400) {
        httpErrorCounter.inc({ method, route, status_code: statusCode });
      }

      activeConnections.dec();
    }
  });

  next();
}

export function getMetrics() {
  const avg = simpleMetrics.responseTime.reduce((a, b) => a + b, 0) / simpleMetrics.responseTime.length || 0;
  return {
    requests: simpleMetrics.requests,
    errors: simpleMetrics.errors,
    avgResponseTime: Math.round(avg),
    errorRate: simpleMetrics.requests ? ((simpleMetrics.errors / simpleMetrics.requests) * 100).toFixed(2) + '%' : '0%',
  };
}

/**
 * Prometheus metrics endpoint handler
 */
export async function prometheusMetricsHandler(req: Request, res: Response): Promise<void> {
  if (!promClient) {
    res.status(503).json({
      error: 'Prometheus metrics not available',
      message: 'Install prom-client package to enable Prometheus metrics',
      simpleMetrics: getMetrics(),
    });
    return;
  }

  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error: any) {
    res.status(500).send(`Error collecting metrics: ${error.message}`);
  }
}

export { register };

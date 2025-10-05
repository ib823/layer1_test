import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ConsoleMetricExporter, PeriodicExportingMetricReader, MetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

let sdk: NodeSDK | null = null;

export async function startTelemetry(serviceName = 'sapmvp-api') {
  if (sdk) return;
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 30000
  }) as unknown as MetricReader;

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName
    }),
    traceExporter: new ConsoleSpanExporter(),
    instrumentations: [new HttpInstrumentation(), new FastifyInstrumentation(), new PgInstrumentation()],
    metricReader
  });

  // Add a SimpleSpanProcessor if you want immediate flushes (optional)
  // (NodeSDK already installs a BatchSpanProcessor internally when exporter is provided)

  await sdk.start();

  process.on('SIGTERM', async () => { await sdk?.shutdown(); });
  process.on('SIGINT', async () => { await sdk?.shutdown(); });
}

export async function stopTelemetry() {
  await sdk?.shutdown();
  sdk = null;
}

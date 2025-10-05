import { buildApp } from './app';
import { config } from './config';
import { startTelemetry } from './telemetry';

const port = Number(process.env.PORT || 3000);

async function main() {
  if (config.featureTelemetry) {
    await startTelemetry('sapmvp-api');
  }
  const app = await buildApp();
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

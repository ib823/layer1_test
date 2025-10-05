import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app';
import { Pool } from 'pg';

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;

describe('API smoke', () => {
  beforeAll(async () => {
    app = await buildApp();
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.ok).toBe(true);
  });
});

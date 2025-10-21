import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from './app';

// Mock redis to avoid connection issues in tests
vi.mock('redis', () => ({
  createClient: () => ({
    on: vi.fn(),
    connect: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
    quit: vi.fn()
  })
}));

// Mock pg to avoid database connection issues in tests
vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    connect: vi.fn(() => ({
      query: vi.fn(() => ({ rows: [{ ts: 'now' }] })),
      release: vi.fn()
    }))
  }))
}));

let app: Awaited<ReturnType<typeof buildApp>> | undefined;

describe('API smoke', () => {
  beforeAll(async () => {
    app = await buildApp();
  }, 30000); // 30 second timeout for app initialization

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('health returns ok', async () => {
    if (!app) {
      throw new Error('App not initialized');
    }
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.ok).toBe(true);
  });
});

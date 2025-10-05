import { buildApp } from './app';
import { test, expect, vi } from 'vitest';

vi.mock('redis', () => ({
  createClient: () => ({
    on: vi.fn(),
    connect: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
    quit: vi.fn(),
  }),
}));

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    connect: vi.fn(() => ({
      query: vi.fn(() => ({ rows: [{ ts: 'now' }] })),
      release: vi.fn(),
    })),
  })),
}));

test('simple test', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  });
  expect(response.statusCode).toBe(200);
}, 30000);

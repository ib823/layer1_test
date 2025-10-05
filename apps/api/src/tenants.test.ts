import { buildApp } from './app';
import { test, expect, vi, describe, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

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
      query: vi.fn((query) => {
        if (query.startsWith('INSERT')) {
          return { rows: [{ id: 'tenant-123', name: 'Test Tenant', created_at: 'now' }] };
        }
        return { rows: [{ ts: 'now' }] };
      }),
      release: vi.fn(),
    })),
  })),
}));

describe('Tenant API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  test('should create a new tenant', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tenants',
      payload: { name: 'Test Tenant' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expect.objectContaining({
      name: 'Test Tenant',
      id: expect.any(String),
    }));
  });
});

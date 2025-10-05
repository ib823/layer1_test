import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { config } from './config';
import { makeRateLimiter } from './rateLimit';
import { audit } from './audit';
import { devLogin, extractBearer, verifyAccessToken, issueAccessToken } from './auth';
import { runDiscovery } from './discovery';
import { requestMagicLink, consumeMagicLink } from './magic';
import { registerConnectorRoutes } from './routes/connectors';
import { Actor, CustomRequest } from './types';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel, redact: ['headers.authorization'] } });
  const pool = new Pool({ connectionString: config.dbUrl });
  const rl = config.featureRateLimit ? await makeRateLimiter() : null;

  app.addHook('onRequest', async (req, reply) => {
    const client = await pool.connect();
    (req as CustomRequest).pg = client;

    if (rl && config.featureRateLimit) {
      const { allowed } = await rl.allow(req, 'global');
      if (!allowed) return reply.code(429).send({ error: 'Rate limit exceeded' });
    }

    const tenantHeader = (req.headers['x-tenant'] as string | undefined) || '';
    await client.query(`SET app.current_tenant = '${tenantHeader.replace(/'/g, "''")}'`);

    const token = extractBearer(req.headers.authorization);
    if (token && config.featureAuth) {
      try {
        const claims = await verifyAccessToken(token);
        (req as CustomRequest).actor = { userId: claims.sub, tenantId: claims.tenantId, role: claims.role };
      } catch {}
    }
  });

  app.addHook('onResponse', async (req) => {
    const client: PoolClient | undefined = (req as CustomRequest).pg;
    if (client) client.release();
  });

  // Health
  app.get('/health', async (req) => {
    const client: PoolClient = (req as CustomRequest).pg;
    const { rows } = await client.query('SELECT now() as ts');
    return { ok: true, ts: rows[0].ts };
  });

  // Tenants
  const CreateTenant = z.object({ name: z.string().min(1) });
  app.post('/tenants', async (req, reply) => {
    const client: PoolClient = (req as CustomRequest).pg;
    const parsed = CreateTenant.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });
    // Use existing schema: tenant_id, company_name
    const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { rows } = await client.query(
      `INSERT INTO tenants (tenant_id, company_name) VALUES ($1, $2) RETURNING id, company_name as name, created_at`,
      [tenantId, parsed.data.name]
    );
    return rows[0];
  });
  app.get('/tenants', async (req) => {
    const client: PoolClient = (req as CustomRequest).pg;
    const { rows } = await client.query(`SELECT id, company_name as name, created_at FROM tenants ORDER BY created_at DESC`);
    return rows;
  });

  app.get('/tenants/:id', async (req, reply) => {
    const client: PoolClient = (req as CustomRequest).pg;
    const { id } = req.params as { id: string };
    const { rows } = await client.query(`SELECT id, company_name as name, created_at FROM tenants WHERE id = $1`,
    [id]
    );
    if (rows.length === 0) return reply.status(404).send({ error: 'Tenant not found' });
    return rows[0];
  });

  const UpdateTenant = z.object({ name: z.string().min(1) });
  app.put('/tenants/:id', async (req, reply) => {
    const client: PoolClient = (req as CustomRequest).pg;
    const { id } = req.params as { id: string };
    const parsed = UpdateTenant.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

    const { rows } = await client.query(
      `UPDATE tenants SET company_name = $1 WHERE id = $2 RETURNING id, company_name as name, created_at`,
      [parsed.data.name, id]
    );
    if (rows.length === 0) return reply.status(404).send({ error: 'Tenant not found' });
    return rows[0];
  });

  app.post('/tenants/:id/discover', async (req, reply) => {
    const client: PoolClient = (req as CustomRequest).pg;
    const actor = requireAuth(req as CustomRequest, reply); if (!actor) return;
    const { id } = req.params as { id: string };

    if (rl && config.featureRateLimit) {
      const { allowed } = await rl.allow(req, 'discovery');
      if (!allowed) return reply.code(429).send({ error: 'Rate limit exceeded' });
    }

    const result = await runDiscovery(id);

    if (config.featureAudit) {
      await audit(client, actor.tenantId, actor.userId, 'tenants.discover', req.routerPath || req.url, req.ip);
    }

    return result;
  });

  // DEV login -> JWT (email + tenantId)
  if (config.featureAuth && config.featureAuthDev) {
    const DevLogin = z.object({ email: z.string().email(), tenantId: z.string().uuid() });
    app.post('/auth/dev-token', async (req, reply) => {
      const client: PoolClient = (req as CustomRequest).pg;
      const parsed = DevLogin.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });
      const tok = await devLogin(client, parsed.data.email, parsed.data.tenantId);
      return tok;
    });
  }

  // Magic link request
  if (config.featureAuth) {
    const MagicReq = z.object({
      email: z.string().email(),
      tenantId: z.string().uuid(),
      redirect: z.string().url().optional()
    });
    app.post('/auth/magic/request', async (req, reply) => {
      const client: PoolClient = (req as CustomRequest).pg;
      const parsed = MagicReq.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

      if (rl && config.featureRateLimit) {
        const { allowed } = await rl.allow(req, 'magic');
        if (!allowed) return reply.code(429).send({ error: 'Rate limit exceeded' });
      }

      const res = await requestMagicLink(client, parsed.data.email, parsed.data.tenantId, parsed.data.redirect);
      if (config.featureAudit) {
        await audit(client, parsed.data.tenantId, parsed.data.email, 'auth.magic.request', req.routerPath || req.url, req.ip);
      }
      return { ok: true, magic_id: res.magic_id };
    });

    // Magic link verify (returns JWT)
    app.get('/auth/magic/verify', async (req, reply) => {
      const client: PoolClient = (req as CustomRequest).pg;
      const token = (req.query as { token: string }).token as string | undefined;
      const tenantId = (req.query as { tenantId: string }).tenantId as string | undefined;
      if (!token || !tenantId) return reply.code(400).send({ error: 'token and tenantId required' });

      const consumed = await consumeMagicLink(client, token, tenantId);
      if (!consumed) return reply.code(400).send({ error: 'Invalid or expired link' });

      // Upsert a user (admin by default on first login)
      const role = 'admin';
      const u = await client.query(
        `INSERT INTO users (tenant_id, email, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, email) DO UPDATE SET role=EXCLUDED.role
         RETURNING id`,
        [tenantId, consumed.email, role]
      );
      const userId = u.rows[0].id as string;
      const access = await issueAccessToken({ userId, tenantId, role: 'admin' as any });

      if (config.featureAudit) {
        await audit(client, tenantId, userId, 'auth.magic.verify', req.routerPath || req.url, req.ip);
      }

      return { access_token: access };
    });

    // Refresh
    app.post('/auth/refresh', async (req, reply) => {
      const token = (req.headers.authorization && (req.headers.authorization as string).split(' ')[1]) || '';
      if (!token) return reply.code(401).send({ error: 'Missing Authorization' });
      try {
        const claims = await verifyAccessToken(token);
        const fresh = await issueAccessToken({ userId: claims.sub, tenantId: claims.tenantId, role: claims.role });
        return { access_token: fresh };
      } catch {
        return reply.code(401).send({ error: 'Invalid token' });
      }
    });

    app.get('/me', async (req, reply) => {
      const token = (req.headers.authorization && (req.headers.authorization as string).split(' ')[1]) || '';
      if (!token) return reply.code(401).send({ error: 'Missing Authorization' });
      try {
        const claims = await verifyAccessToken(token);
        return { sub: claims.sub, tenantId: claims.tenantId, role: claims.role };
      } catch {
        return reply.code(401).send({ error: 'Invalid token' });
      }
    });
  }

  // Helper: auth gate
  function requireAuth(req: CustomRequest, reply: any) {
    if (!config.featureAuth) return { userId: 'dev', tenantId: (req.headers['x-tenant'] as string) || '', role: 'admin' };
    const actor = req.actor;
    if (!actor) { reply.code(401).send({ error: 'Unauthorized' }); return null; }
    if (!actor.tenantId) { reply.code(400).send({ error: 'X-Tenant header required' }); return null; }
    return actor;
  }

  // Users (RLS)
  const CreateUser = z.object({ email: z.string().email(), role: z.enum(['user', 'admin']).optional() });
  app.post('/users', async (req, reply) => {
    const client: PoolClient = (req as CustomRequest).pg;
    const actor = requireAuth(req as CustomRequest, reply); if (!actor) return;

    if (rl && config.featureRateLimit) {
      const { allowed } = await rl.allow(req, 'mutating');
      if (!allowed) return reply.code(429).send({ error: 'Rate limit exceeded' });
    }

    const parsed = CreateUser.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

    try {
      const { rows } = await client.query(
        `INSERT INTO users (tenant_id, email, role)
         VALUES ($1, $2, COALESCE($3, 'user'))
         RETURNING id, tenant_id, email, role, created_at`,
        [actor.tenantId, parsed.data.email, parsed.data.role ?? null]
      );
      if (config.featureAudit) {
        await audit(client, actor.tenantId, actor.userId, 'users.create', req.routerPath || req.url, req.ip);
      }
      return rows[0];
    } catch (e: any) {
      req.log.error(e);
      return reply.status(400).send({ error: 'Create user failed (duplicate email?)' });
    }
  });

  app.get('/users', async (req, reply) => {
    const client: PoolClient = (req as CustomRequest).pg;
    const actor = requireAuth(req as CustomRequest, reply); if (!actor) return;
    const { rows } = await client.query(
      `SELECT id, tenant_id, email, role, created_at FROM users ORDER BY created_at DESC`
    );
    return rows;
  });

  // Discovery
  if (config.featureDiscovery) {
    app.post('/discovery/run', async (req, reply) => {
      const client: PoolClient = (req as CustomRequest).pg;
      const actor = requireAuth(req as CustomRequest, reply); if (!actor) return;
      if (rl && config.featureRateLimit) {
        const { allowed } = await rl.allow(req, 'discovery');
        if (!allowed) return reply.code(429).send({ error: 'Rate limit exceeded' });
      }
      const result = await runDiscovery(actor.tenantId);
      if (config.featureAudit) {
        await audit(client, actor.tenantId, actor.userId, 'discovery.run', req.routerPath || req.url, req.ip);
      }
      return result;
    });
  }

  // Connectors
  if (config.featureConnectors) {
    await registerConnectorRoutes(app);
  }

  return app;
}

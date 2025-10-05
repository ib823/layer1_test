import type { FastifyInstance } from 'fastify';
import { getConnector } from '../connectors';

export async function registerConnectorRoutes(app: FastifyInstance) {
  app.get('/connectors/:system/ping', async (req, reply) => {
    const actor = (req as any).actor;
    if (!actor) return reply.code(401).send({ error: 'Unauthorized' });

    const { system } = req.params as { system: string };
    const c = getConnector(system);
    if (!c) return reply.code(404).send({ error: 'Unknown system' });

    return await c.ping();
  });
}

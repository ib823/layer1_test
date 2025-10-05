import { FastifyRequest } from 'fastify';
import { PoolClient } from 'pg';

export interface Actor {
  userId: string;
  tenantId: string;
  role: string;
}

export interface CustomRequest extends FastifyRequest {
  pg: PoolClient;
  actor: Actor;
}

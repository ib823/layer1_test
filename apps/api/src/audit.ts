import type { PoolClient } from 'pg';

export async function audit(
  client: PoolClient,
  tenantId: string | null,
  actor: string,
  action: string,
  path: string,
  ip?: string
) {
  await client.query(
    `INSERT INTO audit_log (tenant_id, actor, action, path, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [tenantId, actor, action, path, ip || null]
  );
}

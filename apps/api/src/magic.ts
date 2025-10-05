import type { PoolClient } from 'pg';
import { randomToken, sha256 } from './utils';
import { sendMagicLink } from './mailer';

export async function requestMagicLink(
  client: PoolClient,
  email: string,
  tenantId: string,
  redirect?: string
) {
  // remove prior unused links for this principal
  await client.query(
    `DELETE FROM magic_links WHERE tenant_id=$1 AND email=$2 AND used_at IS NULL`,
    [tenantId, email]
  );

  const token = randomToken(32);
  const tokenHash = sha256(token);
  const ttl = Number(process.env.MAGIC_LINK_TTL || 900);

  const { rows } = await client.query(
    `INSERT INTO magic_links (tenant_id, email, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(secs => $4))
     RETURNING id`,
    [tenantId, email, tokenHash, ttl]
  );

  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  const url = new URL('/auth/magic/verify', base);
  url.searchParams.set('token', token);
  url.searchParams.set('tenantId', tenantId);
  if (redirect) url.searchParams.set('redirect', redirect);

  if (process.env.DEBUG_MAGIC_TO_CONSOLE === 'true') {
    console.log('MAGIC_LINK_URL', url.toString());
  } else {
    await sendMagicLink(email, url.toString());
  }

  return { magic_id: rows[0].id as string };
}

export async function consumeMagicLink(
  client: PoolClient,
  token: string,
  tenantId: string
): Promise<{ email: string; tenantId: string } | null> {
  const tokenHash = sha256(token);
  await client.query('BEGIN');
  try {
    const { rows } = await client.query(
      `SELECT id, email, tenant_id
         FROM magic_links
        WHERE token_hash=$1 AND tenant_id=$2
          AND used_at IS NULL AND expires_at > now()
        FOR UPDATE`,
      [tokenHash, tenantId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(`UPDATE magic_links SET used_at=now() WHERE id=$1`, [rows[0].id]);
    await client.query('COMMIT');
    return { email: rows[0].email as string, tenantId: rows[0].tenant_id as string };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

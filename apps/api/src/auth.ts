import { SignJWT, jwtVerify } from 'jose';
import { PoolClient } from 'pg';
import { config } from './config';

const enc = new TextEncoder();
const secret = enc.encode(config.jwtSecret);

export type Role = 'user' | 'admin';
export type JwtPayload = {
  sub: string;
  tenantId: string;
  role: Role;
  iss: string;
  exp: number;
  iat: number;
};

export async function issueAccessToken(input: {
  userId: string;
  tenantId: string;
  role: Role;
}) {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    tenantId: input.tenantId,
    role: input.role
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + config.jwtAccessTtl)
    .setIssuer(config.jwtIssuer)
    .sign(secret);

  return token;
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret, { issuer: config.jwtIssuer });
  return payload as unknown as JwtPayload;
}

/** DEV ONLY login: upsert user and return token */
export async function devLogin(client: PoolClient, email: string, tenantId: string) {
  const role: Role = 'admin';
  const res = await client.query(
    `INSERT INTO users (tenant_id, email, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, email) DO UPDATE SET role=EXCLUDED.role
     RETURNING id`,
    [tenantId, email, role]
  );
  const userId = res.rows[0].id as string;
  const token = await issueAccessToken({ userId, tenantId, role });
  return { access_token: token, user_id: userId, role };
}

export function extractBearer(header: string | undefined) {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

import request from 'supertest';
import express from 'express';

// Enable auth for these tests BEFORE importing router
process.env.AUTH_ENABLED = 'true';

// Import router AFTER setting env var
import router from '../../src/routes';

const app = express();
app.use(express.json());
app.use('/api', router);

function createTestToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describe('Authentication', () => {
  it('should reject request without token', async () => {
    const res = await request(app).get('/api/admin/tenants');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid token', async () => {
    const res = await request(app)
      .get('/api/admin/tenants')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should accept valid JWT token', async () => {
    const token = createTestToken({ 
      sub: 'test-user', 
      email: 'test@example.com',
      scope: ['admin'],
      zid: 'test-tenant',
      exp: Math.floor(Date.now() / 1000) + 3600 
    });
    
    const res = await request(app)
      .get('/api/admin/tenants')
      .set('Authorization', `Bearer ${token}`);
    
    // Should not be 401 (will be 500 due to DB, but auth passed)
    expect(res.status).not.toBe(401);
  });

  it('should reject expired token', async () => {
    const token = createTestToken({ 
      sub: 'test-user', 
      exp: Math.floor(Date.now() / 1000) - 3600  // Expired 1 hour ago
    });
    
    const res = await request(app)
      .get('/api/admin/tenants')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('expired');
  });
});

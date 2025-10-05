import request from 'supertest';
import express from 'express';
import router from '../../src/routes';

const app = express();
app.use(express.json());
app.use('/api', router);

describe('Health Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
    });
  });

  describe('GET /api/version', () => {
    it('should return version info', async () => {
      const res = await request(app).get('/api/version');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe('1.0.0');
    });
  });
});

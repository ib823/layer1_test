/**
 * Test Suite for GLAnomalyRepository
 */

import { GLAnomalyRepository } from '../../src/repositories/GLAnomalyRepository';
import { PrismaClient } from '../../src/generated/prisma';

jest.mock('../../src/generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    gLAnomalyRun: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    gLAnomaly: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
  })),
}));

describe('GLAnomalyRepository', () => {
  let repository: GLAnomalyRepository;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    repository = new GLAnomalyRepository(prisma);
  });

  describe('createRun', () => {
    it('should create GL anomaly run', async () => {
      const mockRun = {
        id: 'run-1',
        tenantId: 'tenant-1',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        runDate: new Date(),
        status: 'completed',
        totalTransactions: 5000,
        anomaliesFound: 42,
        parameters: {},
        summary: null,
        errorMessage: null,
        executionTimeMs: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.gLAnomalyRun.create as jest.Mock).mockResolvedValue(mockRun);

      const result = await repository.createRun({
        tenantId: 'tenant-1',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        totalTransactions: 5000,
        anomaliesFound: 42,
        parameters: {},
      });

      expect(result).toEqual(mockRun);
    });
  });

  describe('saveAnomalies', () => {
    it('should save anomalies in bulk', async () => {
      const anomalies = [
        {
          documentNumber: 'DOC001',
          lineItem: '001',
          glAccount: '100000',
          amount: 50000,
          postingDate: new Date(),
          detectionMethod: 'benford',
          riskScore: 85,
          riskLevel: 'HIGH',
          description: 'Benford violation',
          evidence: {},
        },
      ];

      (prisma.gLAnomaly.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveAnomalies('run-1', anomalies as any);

      expect(prisma.gLAnomaly.createMany).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should calculate GL statistics', async () => {
      (prisma.gLAnomalyRun.count as jest.Mock).mockResolvedValue(5);
      (prisma.gLAnomalyRun.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalTransactions: 25000, anomaliesFound: 150 },
        _avg: { anomaliesFound: 30 },
      });
      (prisma.gLAnomaly.groupBy as jest.Mock).mockResolvedValue([
        { riskLevel: 'HIGH', _count: 20 },
        { riskLevel: 'MEDIUM', _count: 30 },
      ]);

      const stats = await repository.getStatistics('tenant-1', '2025');

      expect(stats).toHaveProperty('totalRuns', 5);
      expect(stats).toHaveProperty('totalAnomalies');
      expect(stats).toHaveProperty('byRiskLevel');
    });
  });
});

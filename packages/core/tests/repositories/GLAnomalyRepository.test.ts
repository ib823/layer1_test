/**
 * Test Suite for GLAnomalyRepository
 */

import { GLAnomalyRepository } from '../../src/repositories/GLAnomalyRepository';
import { PrismaClient } from '../../src/generated/prisma';

// Create mock functions
const mockGLAnomalyRunCreate = jest.fn();
const mockGLAnomalyRunFindUnique = jest.fn();
const mockGLAnomalyRunFindMany = jest.fn();
const mockGLAnomalyRunCount = jest.fn();
const mockGLAnomalyRunAggregate = jest.fn();
const mockGLAnomalyCreateMany = jest.fn();
const mockGLAnomalyFindMany = jest.fn();
const mockGLAnomalyUpdate = jest.fn();
const mockGLAnomalyGroupBy = jest.fn();

// Mock Prisma Client with class-based approach
jest.mock('../../src/generated/prisma', () => {
  class MockPrismaClient {
    gLAnomalyRun = {
      create: mockGLAnomalyRunCreate,
      findUnique: mockGLAnomalyRunFindUnique,
      findMany: mockGLAnomalyRunFindMany,
      count: mockGLAnomalyRunCount,
      aggregate: mockGLAnomalyRunAggregate,
    };
    gLAnomaly = {
      createMany: mockGLAnomalyCreateMany,
      findMany: mockGLAnomalyFindMany,
      update: mockGLAnomalyUpdate,
      groupBy: mockGLAnomalyGroupBy,
    };
  }

  return {
    PrismaClient: MockPrismaClient,
  };
});

describe('GLAnomalyRepository', () => {
  let repository: GLAnomalyRepository;

  beforeEach(() => {
    // Clear individual mocks
    mockGLAnomalyRunCreate.mockClear();
    mockGLAnomalyRunFindUnique.mockClear();
    mockGLAnomalyRunFindMany.mockClear();
    mockGLAnomalyRunCount.mockClear();
    mockGLAnomalyRunAggregate.mockClear();
    mockGLAnomalyCreateMany.mockClear();
    mockGLAnomalyFindMany.mockClear();
    mockGLAnomalyUpdate.mockClear();
    mockGLAnomalyGroupBy.mockClear();

    const prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
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

      (mockGLAnomalyRunCreate as jest.Mock).mockResolvedValue(mockRun);

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

      (mockGLAnomalyCreateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveAnomalies('run-1', anomalies as any);

      expect(mockGLAnomalyCreateMany).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should calculate GL statistics', async () => {
      (mockGLAnomalyRunCount as jest.Mock).mockResolvedValue(5);
      (mockGLAnomalyRunAggregate as jest.Mock).mockResolvedValue({
        _sum: { totalTransactions: 25000, anomaliesFound: 150 },
        _avg: { anomaliesFound: 30 },
      });
      (mockGLAnomalyGroupBy as jest.Mock).mockResolvedValue([
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

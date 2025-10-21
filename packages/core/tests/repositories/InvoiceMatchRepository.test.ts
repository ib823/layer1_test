/**
 * Test Suite for InvoiceMatchRepository
 */

import { InvoiceMatchRepository } from '../../src/repositories/InvoiceMatchRepository';
import { PrismaClient } from '../../src/generated/prisma';

// Mock Prisma Client
jest.mock('../../src/generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    invoiceMatchRun: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    invoiceMatchResult: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    fraudAlert: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

describe('InvoiceMatchRepository', () => {
  let repository: InvoiceMatchRepository;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    repository = new InvoiceMatchRepository(prisma);
  });

  describe('createRun', () => {
    it('should create a new invoice match run', async () => {
      const mockRun = {
        id: 'run-1',
        tenantId: 'tenant-1',
        runDate: new Date(),
        status: 'completed',
        totalInvoices: 100,
        matchedInvoices: 85,
        unmatchedInvoices: 15,
        fraudAlertsCount: 3,
        parameters: {},
        results: null,
        errorMessage: null,
        executionTimeMs: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.invoiceMatchRun.create as jest.Mock).mockResolvedValue(mockRun);

      const result = await repository.createRun({
        tenantId: 'tenant-1',
        totalInvoices: 100,
        matchedInvoices: 85,
        unmatchedInvoices: 15,
        fraudAlertsCount: 3,
        parameters: {},
      });

      expect(result).toEqual(mockRun);
      expect(prisma.invoiceMatchRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          status: 'completed',
        }),
      });
    });
  });

  describe('saveResults', () => {
    it('should save match results in bulk', async () => {
      const results = [
        {
          invoiceNumber: 'INV-001',
          poNumber: 'PO-001',
          grNumber: 'GR-001',
          matchStatus: 'matched',
          matchScore: 98.5,
          discrepancies: {},
          amounts: {},
          vendorId: 'V001',
          vendorName: 'Vendor A',
        },
      ];

      (prisma.invoiceMatchResult.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveResults('run-1', results as any);

      expect(prisma.invoiceMatchResult.createMany).toHaveBeenCalled();
    });
  });

  describe('saveFraudAlerts', () => {
    it('should save fraud alerts', async () => {
      const alerts = [
        {
          alertType: 'duplicate',
          severity: 'high',
          invoiceNumber: 'INV-001',
          description: 'Duplicate invoice detected',
          evidence: {},
        },
      ];

      (prisma.fraudAlert.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveFraudAlerts('run-1', alerts as any);

      expect(prisma.fraudAlert.createMany).toHaveBeenCalled();
    });
  });

  describe('getRun', () => {
    it('should retrieve run with results and alerts', async () => {
      const mockRun = {
        id: 'run-1',
        matchResults: [],
        fraudAlerts: [],
      };

      (prisma.invoiceMatchRun.findUnique as jest.Mock).mockResolvedValue(mockRun);

      const result = await repository.getRun('run-1');

      expect(result).toEqual(mockRun);
      expect(prisma.invoiceMatchRun.findUnique).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        include: { matchResults: true, fraudAlerts: true },
      });
    });
  });

  describe('getRunsByTenant', () => {
    it('should retrieve recent runs for tenant', async () => {
      const mockRuns = [{ id: 'run-1' }, { id: 'run-2' }];

      (prisma.invoiceMatchRun.findMany as jest.Mock).mockResolvedValue(mockRuns);

      const results = await repository.getRunsByTenant('tenant-1');

      expect(results).toEqual(mockRuns);
      expect(prisma.invoiceMatchRun.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { runDate: 'desc' },
        take: 20,
        include: expect.any(Object),
      });
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics for tenant', async () => {
      (prisma.invoiceMatchRun.count as jest.Mock).mockResolvedValue(10);
      (prisma.invoiceMatchRun.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalInvoices: 1000, matchedInvoices: 850, unmatchedInvoices: 150 },
      });
      (prisma.fraudAlert.count as jest.Mock).mockResolvedValue(5);
      (prisma.invoiceMatchRun.findMany as jest.Mock).mockResolvedValue([]);

      const stats = await repository.getStatistics('tenant-1', 30);

      expect(stats).toHaveProperty('totalRuns', 10);
      expect(stats).toHaveProperty('matchRate');
      expect(stats.matchRate).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Test Suite for InvoiceMatchRepository
 */

import { InvoiceMatchRepository } from '../../src/repositories/InvoiceMatchRepository';
import { PrismaClient } from '../../src/generated/prisma';

// Create mock functions
const mockInvoiceMatchRunCreate = jest.fn();
const mockInvoiceMatchRunFindUnique = jest.fn();
const mockInvoiceMatchRunFindMany = jest.fn();
const mockInvoiceMatchRunCount = jest.fn();
const mockInvoiceMatchRunAggregate = jest.fn();
const mockInvoiceMatchResultCreateMany = jest.fn();
const mockInvoiceMatchResultFindMany = jest.fn();
const mockFraudAlertCreateMany = jest.fn();
const mockFraudAlertFindMany = jest.fn();
const mockFraudAlertUpdate = jest.fn();
const mockFraudAlertCount = jest.fn();

// Mock Prisma Client with class-based approach
jest.mock('../../src/generated/prisma', () => {
  class MockPrismaClient {
    invoiceMatchRun = {
      create: mockInvoiceMatchRunCreate,
      findUnique: mockInvoiceMatchRunFindUnique,
      findMany: mockInvoiceMatchRunFindMany,
      count: mockInvoiceMatchRunCount,
      aggregate: mockInvoiceMatchRunAggregate,
    };
    invoiceMatchResult = {
      createMany: mockInvoiceMatchResultCreateMany,
      findMany: mockInvoiceMatchResultFindMany,
    };
    fraudAlert = {
      createMany: mockFraudAlertCreateMany,
      findMany: mockFraudAlertFindMany,
      update: mockFraudAlertUpdate,
      count: mockFraudAlertCount,
    };
  }

  return {
    PrismaClient: MockPrismaClient,
  };
});

describe('InvoiceMatchRepository', () => {
  let repository: InvoiceMatchRepository;

  beforeEach(() => {
    // Clear individual mocks
    mockInvoiceMatchRunCreate.mockClear();
    mockInvoiceMatchRunFindUnique.mockClear();
    mockInvoiceMatchRunFindMany.mockClear();
    mockInvoiceMatchRunCount.mockClear();
    mockInvoiceMatchRunAggregate.mockClear();
    mockInvoiceMatchResultCreateMany.mockClear();
    mockInvoiceMatchResultFindMany.mockClear();
    mockFraudAlertCreateMany.mockClear();
    mockFraudAlertFindMany.mockClear();
    mockFraudAlertUpdate.mockClear();
    mockFraudAlertCount.mockClear();

    const prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
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

      (mockInvoiceMatchRunCreate as jest.Mock).mockResolvedValue(mockRun);

      const result = await repository.createRun({
        tenantId: 'tenant-1',
        totalInvoices: 100,
        matchedInvoices: 85,
        unmatchedInvoices: 15,
        fraudAlertsCount: 3,
        parameters: {},
      });

      expect(result).toEqual(mockRun);
      expect(mockInvoiceMatchRunCreate).toHaveBeenCalledWith({
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

      (mockInvoiceMatchResultCreateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveResults('run-1', results as any);

      expect(mockInvoiceMatchResultCreateMany).toHaveBeenCalled();
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

      (mockFraudAlertCreateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveFraudAlerts('run-1', alerts as any);

      expect(mockFraudAlertCreateMany).toHaveBeenCalled();
    });
  });

  describe('getRun', () => {
    it('should retrieve run with results and alerts', async () => {
      const mockRun = {
        id: 'run-1',
        matchResults: [],
        fraudAlerts: [],
      };

      (mockInvoiceMatchRunFindUnique as jest.Mock).mockResolvedValue(mockRun);

      const result = await repository.getRun('run-1');

      expect(result).toEqual(mockRun);
      expect(mockInvoiceMatchRunFindUnique).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        include: { matchResults: true, fraudAlerts: true },
      });
    });
  });

  describe('getRunsByTenant', () => {
    it('should retrieve recent runs for tenant', async () => {
      const mockRuns = [{ id: 'run-1' }, { id: 'run-2' }];

      (mockInvoiceMatchRunFindMany as jest.Mock).mockResolvedValue(mockRuns);

      const results = await repository.getRunsByTenant('tenant-1');

      expect(results).toEqual(mockRuns);
      expect(mockInvoiceMatchRunFindMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { runDate: 'desc' },
        take: 20,
        include: expect.any(Object),
      });
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics for tenant', async () => {
      (mockInvoiceMatchRunCount as jest.Mock).mockResolvedValue(10);
      (mockInvoiceMatchRunAggregate as jest.Mock).mockResolvedValue({
        _sum: { totalInvoices: 1000, matchedInvoices: 850, unmatchedInvoices: 150 },
      });
      (mockFraudAlertCount as jest.Mock).mockResolvedValue(5);
      (mockInvoiceMatchRunFindMany as jest.Mock).mockResolvedValue([]);

      const stats = await repository.getStatistics('tenant-1', 30);

      expect(stats).toHaveProperty('totalRuns', 10);
      expect(stats).toHaveProperty('matchRate');
      expect(stats.matchRate).toBeGreaterThanOrEqual(0);
    });
  });
});

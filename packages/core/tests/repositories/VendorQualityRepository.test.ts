/**
 * Test Suite for VendorQualityRepository
 */

import { VendorQualityRepository } from '../../src/repositories/VendorQualityRepository';
import { PrismaClient } from '../../src/generated/prisma';

// Create mock functions
const mockVendorQualityRunCreate = jest.fn();
const mockVendorQualityRunFindUnique = jest.fn();
const mockVendorQualityRunFindMany = jest.fn();
const mockVendorQualityRunCount = jest.fn();
const mockVendorQualityRunAggregate = jest.fn();
const mockVendorQualityIssueCreateMany = jest.fn();
const mockVendorQualityIssueFindMany = jest.fn();
const mockVendorQualityIssueUpdate = jest.fn();
const mockVendorQualityIssueGroupBy = jest.fn();
const mockVendorDuplicateClusterCreateMany = jest.fn();
const mockVendorDuplicateClusterFindMany = jest.fn();
const mockVendorDuplicateClusterUpdate = jest.fn();
const mockVendorDuplicateClusterAggregate = jest.fn();

// Mock Prisma Client with class-based approach
jest.mock('../../src/generated/prisma', () => {
  class MockPrismaClient {
    vendorQualityRun = {
      create: mockVendorQualityRunCreate,
      findUnique: mockVendorQualityRunFindUnique,
      findMany: mockVendorQualityRunFindMany,
      count: mockVendorQualityRunCount,
      aggregate: mockVendorQualityRunAggregate,
    };
    vendorQualityIssue = {
      createMany: mockVendorQualityIssueCreateMany,
      findMany: mockVendorQualityIssueFindMany,
      update: mockVendorQualityIssueUpdate,
      groupBy: mockVendorQualityIssueGroupBy,
    };
    vendorDuplicateCluster = {
      createMany: mockVendorDuplicateClusterCreateMany,
      findMany: mockVendorDuplicateClusterFindMany,
      update: mockVendorDuplicateClusterUpdate,
      aggregate: mockVendorDuplicateClusterAggregate,
    };
  }

  return {
    PrismaClient: MockPrismaClient,
  };
});

describe('VendorQualityRepository', () => {
  let repository: VendorQualityRepository;

  beforeEach(() => {
    // Clear individual mocks
    mockVendorQualityRunCreate.mockClear();
    mockVendorQualityRunFindUnique.mockClear();
    mockVendorQualityRunFindMany.mockClear();
    mockVendorQualityRunCount.mockClear();
    mockVendorQualityRunAggregate.mockClear();
    mockVendorQualityIssueCreateMany.mockClear();
    mockVendorQualityIssueFindMany.mockClear();
    mockVendorQualityIssueUpdate.mockClear();
    mockVendorQualityIssueGroupBy.mockClear();
    mockVendorDuplicateClusterCreateMany.mockClear();
    mockVendorDuplicateClusterFindMany.mockClear();
    mockVendorDuplicateClusterUpdate.mockClear();
    mockVendorDuplicateClusterAggregate.mockClear();

    const prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    repository = new VendorQualityRepository(prisma);
  });

  describe('createRun', () => {
    it('should create vendor quality run', async () => {
      const mockRun = {
        id: 'run-1',
        tenantId: 'tenant-1',
        runDate: new Date(),
        status: 'completed',
        totalVendors: 1000,
        issuesFound: 75,
        duplicatesFound: 12,
        potentialSavings: 50000,
        parameters: {},
        summary: null,
        errorMessage: null,
        executionTimeMs: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockVendorQualityRunCreate as jest.Mock).mockResolvedValue(mockRun);

      const result = await repository.createRun({
        tenantId: 'tenant-1',
        totalVendors: 1000,
        issuesFound: 75,
        duplicatesFound: 12,
        potentialSavings: 50000,
        parameters: {},
      });

      expect(result).toEqual(mockRun);
    });
  });

  describe('saveQualityIssues', () => {
    it('should save quality issues', async () => {
      const issues = [
        {
          vendorId: 'V001',
          vendorName: 'Vendor A',
          issueType: 'missing_field',
          severity: 'high',
          fieldName: 'taxNumber',
          currentValue: null,
          suggestedValue: null,
          description: 'Missing tax number',
          qualityScore: 65,
        },
      ];

      (mockVendorQualityIssueCreateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveQualityIssues('run-1', issues as any);

      expect(mockVendorQualityIssueCreateMany).toHaveBeenCalled();
    });
  });

  describe('saveDuplicateClusters', () => {
    it('should save duplicate clusters', async () => {
      const clusters = [
        {
          clusterSize: 3,
          vendorIds: ['V001', 'V002', 'V003'],
          vendorNames: ['Vendor A', 'Vendor A Inc', 'Vendor A Corp'],
          similarityScore: 92.5,
          matchFields: ['vendorName', 'taxNumber'],
          estimatedSavings: 15000,
          recommendedAction: 'Merge vendors',
        },
      ];

      (mockVendorDuplicateClusterCreateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveDuplicateClusters('run-1', clusters as any);

      expect(mockVendorDuplicateClusterCreateMany).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should calculate vendor quality statistics', async () => {
      (mockVendorQualityRunCount as jest.Mock).mockResolvedValue(10);
      (mockVendorQualityRunAggregate as jest.Mock).mockResolvedValue({
        _sum: {
          totalVendors: 10000,
          issuesFound: 500,
          duplicatesFound: 50,
          potentialSavings: 250000,
        },
        _avg: { issuesFound: 50 },
      });
      (mockVendorQualityIssueGroupBy as jest.Mock).mockResolvedValue([
        { issueType: 'missing_field', _count: 200 },
        { issueType: 'invalid_format', _count: 150 },
      ]);
      (mockVendorDuplicateClusterAggregate as jest.Mock).mockResolvedValue({
        _sum: { estimatedSavings: 100000, clusterSize: 150 },
      });

      const stats = await repository.getStatistics('tenant-1', 30);

      expect(stats).toHaveProperty('totalRuns', 10);
      expect(stats).toHaveProperty('potentialSavings');
      expect(stats).toHaveProperty('topIssueTypes');
      expect(stats.topIssueTypes).toBeInstanceOf(Array);
    });
  });
});

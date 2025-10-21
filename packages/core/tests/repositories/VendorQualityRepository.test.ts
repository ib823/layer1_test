/**
 * Test Suite for VendorQualityRepository
 */

import { VendorQualityRepository } from '../../src/repositories/VendorQualityRepository';
import { PrismaClient } from '../../src/generated/prisma';

jest.mock('../../src/generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    vendorQualityRun: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    vendorQualityIssue: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    vendorDuplicateCluster: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
  })),
}));

describe('VendorQualityRepository', () => {
  let repository: VendorQualityRepository;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
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

      (prisma.vendorQualityRun.create as jest.Mock).mockResolvedValue(mockRun);

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

      (prisma.vendorQualityIssue.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveQualityIssues('run-1', issues as any);

      expect(prisma.vendorQualityIssue.createMany).toHaveBeenCalled();
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

      (prisma.vendorDuplicateCluster.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await repository.saveDuplicateClusters('run-1', clusters as any);

      expect(prisma.vendorDuplicateCluster.createMany).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should calculate vendor quality statistics', async () => {
      (prisma.vendorQualityRun.count as jest.Mock).mockResolvedValue(10);
      (prisma.vendorQualityRun.aggregate as jest.Mock).mockResolvedValue({
        _sum: {
          totalVendors: 10000,
          issuesFound: 500,
          duplicatesFound: 50,
          potentialSavings: 250000,
        },
        _avg: { issuesFound: 50 },
      });
      (prisma.vendorQualityIssue.groupBy as jest.Mock).mockResolvedValue([
        { issueType: 'missing_field', _count: 200 },
        { issueType: 'invalid_format', _count: 150 },
      ]);
      (prisma.vendorDuplicateCluster.aggregate as jest.Mock).mockResolvedValue({
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

import { PrismaClient } from '../generated/prisma';
import {
  VendorQualityRun,
  VendorQualityIssue,
  VendorDuplicateCluster
} from '../generated/prisma';

export class VendorQualityRepository {
  constructor(private prisma: PrismaClient) {}

  async createRun(data: {
    tenantId: string;
    totalVendors: number;
    issuesFound: number;
    duplicatesFound: number;
    potentialSavings: number;
    parameters: any;
    summary?: any;
  }): Promise<VendorQualityRun> {
    return this.prisma.vendorQualityRun.create({
      data: {
        ...data,
        status: 'completed',
      },
    });
  }

  async saveQualityIssues(
    runId: string,
    issues: Array<Omit<VendorQualityIssue, 'id' | 'runId' | 'status' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.prisma.vendorQualityIssue.createMany({
      data: issues.map(i => ({ ...i, runId, status: 'open' })),
    });
  }

  async saveDuplicateClusters(
    runId: string,
    clusters: Array<Omit<VendorDuplicateCluster, 'id' | 'runId' | 'status' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.prisma.vendorDuplicateCluster.createMany({
      data: clusters.map(c => ({ ...c, runId, status: 'pending' })),
    });
  }

  async getRun(runId: string): Promise<VendorQualityRun | null> {
    return this.prisma.vendorQualityRun.findUnique({
      where: { id: runId },
      include: {
        qualityIssues: true,
        duplicateClusters: true,
      },
    });
  }

  async getRunsByTenant(
    tenantId: string,
    limit: number = 20
  ): Promise<VendorQualityRun[]> {
    return this.prisma.vendorQualityRun.findMany({
      where: { tenantId },
      orderBy: { runDate: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            qualityIssues: true,
            duplicateClusters: true,
          },
        },
      },
    });
  }

  async getQualityIssues(
    runId: string,
    filters?: {
      severity?: string;
      issueType?: string;
      status?: string;
      vendorId?: string;
    }
  ): Promise<VendorQualityIssue[]> {
    return this.prisma.vendorQualityIssue.findMany({
      where: {
        runId,
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.issueType && { issueType: filters.issueType }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.vendorId && { vendorId: filters.vendorId }),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getDuplicateClusters(
    runId: string,
    status?: string
  ): Promise<VendorDuplicateCluster[]> {
    return this.prisma.vendorDuplicateCluster.findMany({
      where: {
        runId,
        ...(status && { status }),
      },
      orderBy: { estimatedSavings: 'desc' },
    });
  }

  async updateIssueStatus(
    issueId: string,
    status: string,
    resolution?: string,
    assignedTo?: string
  ): Promise<VendorQualityIssue> {
    return this.prisma.vendorQualityIssue.update({
      where: { id: issueId },
      data: {
        status,
        resolution,
        assignedTo,
        ...(status === 'resolved' && { resolvedAt: new Date() }),
      },
    });
  }

  async updateClusterStatus(
    clusterId: string,
    status: string,
    reviewedBy: string,
    notes?: string
  ): Promise<VendorDuplicateCluster> {
    return this.prisma.vendorDuplicateCluster.update({
      where: { id: clusterId },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        notes,
      },
    });
  }

  async getStatistics(tenantId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalRuns, vendorStats, topIssueTypes, duplicateStats] = await Promise.all([
      this.prisma.vendorQualityRun.count({
        where: { tenantId, runDate: { gte: since } },
      }),
      this.prisma.vendorQualityRun.aggregate({
        where: { tenantId, runDate: { gte: since } },
        _sum: {
          totalVendors: true,
          issuesFound: true,
          duplicatesFound: true,
          potentialSavings: true,
        },
        _avg: { issuesFound: true },
      }),
      this.prisma.vendorQualityIssue.groupBy({
        by: ['issueType'],
        where: {
          run: { tenantId, runDate: { gte: since } },
        },
        _count: true,
        orderBy: {
          _count: {
            issueType: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.vendorDuplicateCluster.aggregate({
        where: {
          run: { tenantId, runDate: { gte: since } },
        },
        _sum: { estimatedSavings: true, clusterSize: true },
      }),
    ]);

    return {
      totalRuns,
      totalVendors: vendorStats._sum.totalVendors || 0,
      totalIssues: vendorStats._sum.issuesFound || 0,
      totalDuplicates: vendorStats._sum.duplicatesFound || 0,
      potentialSavings: vendorStats._sum.potentialSavings || 0,
      avgIssuesPerRun: vendorStats._avg.issuesFound || 0,
      topIssueTypes: topIssueTypes.map(t => ({
        type: t.issueType,
        count: t._count,
      })),
      duplicateClustersSavings: duplicateStats._sum.estimatedSavings || 0,
      vendorsInDuplicateClusters: duplicateStats._sum.clusterSize || 0,
    };
  }
}

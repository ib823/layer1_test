import { PrismaClient } from '../generated/prisma';
import { GLAnomalyRun, GLAnomaly } from '../generated/prisma';

export class GLAnomalyRepository {
  constructor(private prisma: PrismaClient) {}

  async createRun(data: {
    tenantId: string;
    fiscalYear: string;
    fiscalPeriod?: string;
    totalTransactions: number;
    anomaliesFound: number;
    parameters: any;
    summary?: any;
  }): Promise<GLAnomalyRun> {
    return this.prisma.gLAnomalyRun.create({
      data: {
        ...data,
        status: 'completed',
      },
    });
  }

  async saveAnomalies(
    runId: string,
    anomalies: Array<Omit<GLAnomaly, 'id' | 'runId' | 'status' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.prisma.gLAnomaly.createMany({
      data: anomalies.map(a => ({ ...a, runId, status: 'open' })) as any,
    });
  }

  async getRun(runId: string): Promise<GLAnomalyRun | null> {
    return this.prisma.gLAnomalyRun.findUnique({
      where: { id: runId },
      include: {
        anomalies: true,
      },
    });
  }

  async getRunsByTenant(
    tenantId: string,
    fiscalYear?: string,
    limit: number = 20
  ): Promise<GLAnomalyRun[]> {
    return this.prisma.gLAnomalyRun.findMany({
      where: {
        tenantId,
        ...(fiscalYear && { fiscalYear }),
      },
      orderBy: { runDate: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { anomalies: true },
        },
      },
    });
  }

  async getAnomalies(
    runId: string,
    filters?: {
      riskLevel?: string;
      detectionMethod?: string;
      status?: string;
      glAccount?: string;
    }
  ): Promise<GLAnomaly[]> {
    return this.prisma.gLAnomaly.findMany({
      where: {
        runId,
        ...(filters?.riskLevel && { riskLevel: filters.riskLevel }),
        ...(filters?.detectionMethod && { detectionMethod: filters.detectionMethod }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.glAccount && { glAccount: filters.glAccount }),
      },
      orderBy: [{ riskScore: 'desc' }, { amount: 'desc' }],
    });
  }

  async updateAnomalyStatus(
    anomalyId: string,
    status: string,
    resolution?: string,
    assignedTo?: string
  ): Promise<GLAnomaly> {
    return this.prisma.gLAnomaly.update({
      where: { id: anomalyId },
      data: {
        status,
        resolution,
        assignedTo,
        ...(status === 'resolved' && { resolvedAt: new Date() }),
      },
    });
  }

  async getStatistics(tenantId: string, fiscalYear: string) {
    const [totalRuns, anomalyStats, byRiskLevel, byDetectionMethod] = await Promise.all([
      this.prisma.gLAnomalyRun.count({
        where: { tenantId, fiscalYear },
      }),
      this.prisma.gLAnomalyRun.aggregate({
        where: { tenantId, fiscalYear },
        _sum: { totalTransactions: true, anomaliesFound: true },
        _avg: { anomaliesFound: true },
      }),
      this.prisma.gLAnomaly.groupBy({
        by: ['riskLevel'],
        where: {
          run: { tenantId, fiscalYear },
        },
        _count: true,
      }),
      this.prisma.gLAnomaly.groupBy({
        by: ['detectionMethod'],
        where: {
          run: { tenantId, fiscalYear },
        },
        _count: true,
      }),
    ]);

    return {
      totalRuns,
      totalTransactions: anomalyStats._sum.totalTransactions || 0,
      totalAnomalies: anomalyStats._sum.anomaliesFound || 0,
      avgAnomaliesPerRun: anomalyStats._avg.anomaliesFound || 0,
      byRiskLevel: byRiskLevel.reduce((acc, curr) => {
        acc[curr.riskLevel] = curr._count;
        return acc;
      }, {} as Record<string, number>),
      byDetectionMethod: byDetectionMethod.reduce((acc, curr) => {
        acc[curr.detectionMethod] = curr._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async getTopAnomalousAccounts(
    tenantId: string,
    fiscalYear: string,
    limit: number = 10
  ) {
    const accounts = await this.prisma.gLAnomaly.groupBy({
      by: ['glAccount'],
      where: {
        run: { tenantId, fiscalYear },
      },
      _count: true,
      _avg: { riskScore: true },
      orderBy: {
        _count: {
          glAccount: 'desc',
        },
      },
      take: limit,
    });

    return accounts.map(a => ({
      glAccount: a.glAccount,
      anomalyCount: a._count,
      avgRiskScore: a._avg.riskScore || 0,
    }));
  }
}

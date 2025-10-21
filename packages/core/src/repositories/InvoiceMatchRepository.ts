import { PrismaClient } from '../generated/prisma';
import {
  InvoiceMatchRun,
  InvoiceMatchResult,
  FraudAlert
} from '../generated/prisma';

export class InvoiceMatchRepository {
  constructor(private prisma: PrismaClient) {}

  async createRun(data: {
    tenantId: string;
    totalInvoices: number;
    matchedInvoices: number;
    unmatchedInvoices: number;
    fraudAlertsCount: number;
    parameters: any;
  }): Promise<InvoiceMatchRun> {
    return this.prisma.invoiceMatchRun.create({
      data: {
        ...data,
        status: 'completed',
      },
    });
  }

  async saveResults(
    runId: string,
    results: Array<Omit<InvoiceMatchResult, 'id' | 'runId' | 'createdAt'>>
  ): Promise<void> {
    await this.prisma.invoiceMatchResult.createMany({
      data: results.map(r => ({ ...r, runId })) as any,
    });
  }

  async saveFraudAlerts(
    runId: string,
    alerts: Array<Omit<FraudAlert, 'id' | 'runId' | 'status' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await this.prisma.fraudAlert.createMany({
      data: alerts.map(a => ({ ...a, runId, status: 'open' })) as any,
    });
  }

  async getRun(runId: string): Promise<InvoiceMatchRun | null> {
    return this.prisma.invoiceMatchRun.findUnique({
      where: { id: runId },
      include: {
        matchResults: true,
        fraudAlerts: true,
      },
    });
  }

  async getRunsByTenant(
    tenantId: string,
    limit: number = 20
  ): Promise<InvoiceMatchRun[]> {
    return this.prisma.invoiceMatchRun.findMany({
      where: { tenantId },
      orderBy: { runDate: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            matchResults: true,
            fraudAlerts: true,
          },
        },
      },
    });
  }

  async getMatchResults(
    runId: string,
    filters?: {
      matchStatus?: string;
      minMatchScore?: number;
    }
  ): Promise<InvoiceMatchResult[]> {
    return this.prisma.invoiceMatchResult.findMany({
      where: {
        runId,
        ...(filters?.matchStatus && { matchStatus: filters.matchStatus }),
        ...(filters?.minMatchScore && { matchScore: { gte: filters.minMatchScore } }),
      },
      orderBy: { matchScore: 'asc' },
    });
  }

  async getFraudAlerts(
    runId: string,
    filters?: {
      severity?: string;
      status?: string;
    }
  ): Promise<FraudAlert[]> {
    return this.prisma.fraudAlert.findMany({
      where: {
        runId,
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateFraudAlertStatus(
    alertId: string,
    status: string,
    resolution?: string,
    assignedTo?: string
  ): Promise<FraudAlert> {
    return this.prisma.fraudAlert.update({
      where: { id: alertId },
      data: {
        status,
        resolution,
        assignedTo,
        ...(status === 'resolved' && { resolvedAt: new Date() }),
      },
    });
  }

  async getStatistics(tenantId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalRuns, totalInvoices, totalFraudAlerts, recentRuns] = await Promise.all([
      this.prisma.invoiceMatchRun.count({
        where: { tenantId, runDate: { gte: since } },
      }),
      this.prisma.invoiceMatchRun.aggregate({
        where: { tenantId, runDate: { gte: since } },
        _sum: { totalInvoices: true, matchedInvoices: true, unmatchedInvoices: true },
      }),
      this.prisma.fraudAlert.count({
        where: {
          run: { tenantId },
          createdAt: { gte: since },
        },
      }),
      this.prisma.invoiceMatchRun.findMany({
        where: { tenantId, runDate: { gte: since } },
        orderBy: { runDate: 'desc' },
        take: 10,
        select: {
          id: true,
          runDate: true,
          totalInvoices: true,
          matchedInvoices: true,
          fraudAlertsCount: true,
        },
      }),
    ]);

    return {
      totalRuns,
      totalInvoices: totalInvoices._sum.totalInvoices || 0,
      matchedInvoices: totalInvoices._sum.matchedInvoices || 0,
      unmatchedInvoices: totalInvoices._sum.unmatchedInvoices || 0,
      totalFraudAlerts,
      matchRate: totalInvoices._sum.totalInvoices
        ? ((totalInvoices._sum.matchedInvoices || 0) / totalInvoices._sum.totalInvoices) * 100
        : 0,
      recentRuns,
    };
  }
}

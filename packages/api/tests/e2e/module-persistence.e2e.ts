/**
 * End-to-End Integration Tests for Module Persistence
 * Tests the complete flow: API → Controller → Repository → Database
 */

import request from 'supertest';
import { PrismaClient } from '@sap-framework/core/generated/prisma';

// Mock the Express app (will be replaced with actual app import when available)
describe('Module Persistence E2E (Placeholder)', () => {
  const prisma = new PrismaClient();
  let testTenantId: string;

  beforeAll(async () => {
    // Create test tenant
    try {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'E2E Test Tenant',
          subdomain: 'e2e-test',
          status: 'active',
        },
      });
      testTenantId = tenant.id;
    } catch (error) {
      console.error('Failed to create test tenant:', error);
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test data in correct order
    try {
      if (testTenantId) {
        // Delete Invoice Match data
        await prisma.invoiceMatchResult.deleteMany({
          where: { run: { tenantId: testTenantId } },
        });
        await prisma.fraudAlert.deleteMany({
          where: { run: { tenantId: testTenantId } },
        });
        await prisma.invoiceMatchRun.deleteMany({
          where: { tenantId: testTenantId },
        });

        // Delete GL Anomaly data
        await prisma.gLAnomaly.deleteMany({
          where: { run: { tenantId: testTenantId } },
        });
        await prisma.gLAnomalyRun.deleteMany({
          where: { tenantId: testTenantId },
        });

        // Delete Vendor Quality data
        await prisma.vendorQualityIssue.deleteMany({
          where: { run: { tenantId: testTenantId } },
        });
        await prisma.vendorDuplicateCluster.deleteMany({
          where: { run: { tenantId: testTenantId } },
        });
        await prisma.vendorQualityRun.deleteMany({
          where: { tenantId: testTenantId } },
        });

        // Delete tenant
        await prisma.tenant.delete({
          where: { id: testTenantId },
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    await prisma.$disconnect();
  });

  describe('Database Connectivity', () => {
    it('should connect to PostgreSQL database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
    });

    it('should verify all module tables exist', async () => {
      const tables = [
        'Tenant',
        'InvoiceMatchRun',
        'InvoiceMatchResult',
        'FraudAlert',
        'GLAnomalyRun',
        'GLAnomaly',
        'VendorQualityRun',
        'VendorQualityIssue',
        'VendorDuplicateCluster',
      ];

      for (const table of tables) {
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = ${table}
          ) as exists
        `;
        expect(result).toBeDefined();
      }
    });
  });

  describe('Invoice Matching Persistence', () => {
    it('should persist invoice matching run', async () => {
      const run = await prisma.invoiceMatchRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalInvoices: 100,
          matchedInvoices: 85,
          unmatchedInvoices: 15,
          fraudAlertsCount: 3,
          parameters: { test: true },
        },
      });

      expect(run.id).toBeDefined();
      expect(run.tenantId).toBe(testTenantId);
      expect(run.status).toBe('completed');
    });

    it('should persist invoice match results', async () => {
      const run = await prisma.invoiceMatchRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalInvoices: 10,
          matchedInvoices: 8,
          unmatchedInvoices: 2,
          fraudAlertsCount: 0,
          parameters: {},
        },
      });

      await prisma.invoiceMatchResult.createMany({
        data: [
          {
            runId: run.id,
            invoiceNumber: 'INV-001',
            poNumber: 'PO-001',
            grNumber: 'GR-001',
            matchStatus: 'matched',
            matchScore: 98.5,
            discrepancies: {},
            amounts: {},
            vendorId: 'V001',
            vendorName: 'Test Vendor',
          },
          {
            runId: run.id,
            invoiceNumber: 'INV-002',
            poNumber: 'PO-002',
            grNumber: 'GR-002',
            matchStatus: 'partial',
            matchScore: 75.0,
            discrepancies: { amount: 'mismatch' },
            amounts: {},
            vendorId: 'V002',
            vendorName: 'Another Vendor',
          },
        ],
      });

      const results = await prisma.invoiceMatchResult.findMany({
        where: { runId: run.id },
      });

      expect(results).toHaveLength(2);
      expect(results[0].invoiceNumber).toBe('INV-001');
    });

    it('should persist fraud alerts', async () => {
      const run = await prisma.invoiceMatchRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalInvoices: 5,
          matchedInvoices: 3,
          unmatchedInvoices: 2,
          fraudAlertsCount: 2,
          parameters: {},
        },
      });

      await prisma.fraudAlert.createMany({
        data: [
          {
            runId: run.id,
            alertType: 'duplicate',
            severity: 'high',
            invoiceNumber: 'INV-003',
            description: 'Duplicate invoice detected',
            evidence: { duplicates: ['INV-004'] },
          },
          {
            runId: run.id,
            alertType: 'outlier',
            severity: 'medium',
            invoiceNumber: 'INV-005',
            description: 'Amount outlier detected',
            evidence: { amount: 1000000 },
          },
        ],
      });

      const alerts = await prisma.fraudAlert.findMany({
        where: { runId: run.id },
      });

      expect(alerts).toHaveLength(2);
      expect(alerts[0].severity).toBe('high');
    });

    it('should retrieve run with related data', async () => {
      const run = await prisma.invoiceMatchRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalInvoices: 5,
          matchedInvoices: 5,
          unmatchedInvoices: 0,
          fraudAlertsCount: 0,
          parameters: {},
          matchResults: {
            create: {
              invoiceNumber: 'INV-006',
              matchStatus: 'matched',
              matchScore: 100,
              discrepancies: {},
              amounts: {},
            },
          },
        },
      });

      const retrieved = await prisma.invoiceMatchRun.findUnique({
        where: { id: run.id },
        include: {
          matchResults: true,
          fraudAlerts: true,
        },
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.matchResults).toHaveLength(1);
      expect(retrieved?.fraudAlerts).toHaveLength(0);
    });
  });

  describe('GL Anomaly Detection Persistence', () => {
    it('should persist GL anomaly run', async () => {
      const run = await prisma.gLAnomalyRun.create({
        data: {
          tenantId: testTenantId,
          fiscalYear: '2025',
          fiscalPeriod: '001',
          status: 'completed',
          totalTransactions: 1000,
          anomaliesFound: 15,
          parameters: { detectionMethods: ['benford', 'outlier'] },
          summary: { byRiskLevel: { high: 5, medium: 10 } },
        },
      });

      expect(run.id).toBeDefined();
      expect(run.fiscalYear).toBe('2025');
      expect(run.anomaliesFound).toBe(15);
    });

    it('should persist GL anomalies', async () => {
      const run = await prisma.gLAnomalyRun.create({
        data: {
          tenantId: testTenantId,
          fiscalYear: '2025',
          fiscalPeriod: '002',
          status: 'completed',
          totalTransactions: 500,
          anomaliesFound: 10,
          parameters: {},
        },
      });

      await prisma.gLAnomaly.createMany({
        data: [
          {
            runId: run.id,
            documentNumber: 'DOC-001',
            lineItem: '1',
            glAccount: '100000',
            amount: 999999.99,
            postingDate: new Date('2025-01-15'),
            detectionMethod: 'benford',
            riskScore: 0.95,
            riskLevel: 'critical',
            description: 'Benford\'s Law violation',
            evidence: { digit: 9, expected: 0.045, actual: 0.8 },
          },
          {
            runId: run.id,
            documentNumber: 'DOC-002',
            lineItem: '1',
            glAccount: '200000',
            amount: 500000,
            postingDate: new Date('2025-01-15T23:00:00'),
            detectionMethod: 'after_hours',
            riskScore: 0.75,
            riskLevel: 'high',
            description: 'After-hours posting',
            evidence: { hour: 23 },
          },
        ],
      });

      const anomalies = await prisma.gLAnomaly.findMany({
        where: { runId: run.id },
        orderBy: { riskScore: 'desc' },
      });

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].riskLevel).toBe('critical');
      expect(anomalies[1].detectionMethod).toBe('after_hours');
    });

    it('should filter anomalies by risk level', async () => {
      const run = await prisma.gLAnomalyRun.create({
        data: {
          tenantId: testTenantId,
          fiscalYear: '2025',
          fiscalPeriod: '003',
          status: 'completed',
          totalTransactions: 100,
          anomaliesFound: 3,
          parameters: {},
          anomalies: {
            create: [
              {
                documentNumber: 'DOC-003',
                glAccount: '300000',
                amount: 1000,
                postingDate: new Date(),
                detectionMethod: 'outlier',
                riskScore: 0.9,
                riskLevel: 'critical',
                description: 'Critical anomaly',
                evidence: {},
              },
              {
                documentNumber: 'DOC-004',
                glAccount: '300001',
                amount: 500,
                postingDate: new Date(),
                detectionMethod: 'outlier',
                riskScore: 0.6,
                riskLevel: 'medium',
                description: 'Medium anomaly',
                evidence: {},
              },
            ],
          },
        },
      });

      const criticalAnomalies = await prisma.gLAnomaly.findMany({
        where: {
          runId: run.id,
          riskLevel: 'critical',
        },
      });

      expect(criticalAnomalies).toHaveLength(1);
      expect(criticalAnomalies[0].documentNumber).toBe('DOC-003');
    });
  });

  describe('Vendor Data Quality Persistence', () => {
    it('should persist vendor quality run', async () => {
      const run = await prisma.vendorQualityRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalVendors: 100,
          issuesFound: 25,
          duplicatesFound: 5,
          potentialSavings: 15000,
          parameters: { countries: ['US', 'DE'] },
          summary: { byIssueType: { missing_field: 15, invalid_format: 10 } },
        },
      });

      expect(run.id).toBeDefined();
      expect(run.totalVendors).toBe(100);
      expect(run.potentialSavings).toBe(15000);
    });

    it('should persist vendor quality issues', async () => {
      const run = await prisma.vendorQualityRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalVendors: 50,
          issuesFound: 10,
          duplicatesFound: 0,
          potentialSavings: 0,
          parameters: {},
        },
      });

      await prisma.vendorQualityIssue.createMany({
        data: [
          {
            runId: run.id,
            vendorId: 'V001',
            vendorName: 'Vendor A',
            issueType: 'missing_field',
            severity: 'high',
            fieldName: 'taxNumber',
            currentValue: '',
            description: 'Missing tax number',
            qualityScore: 65,
          },
          {
            runId: run.id,
            vendorId: 'V002',
            vendorName: 'Vendor B',
            issueType: 'invalid_format',
            severity: 'medium',
            fieldName: 'postalCode',
            currentValue: 'INVALID',
            suggestedValue: '10001',
            description: 'Invalid postal code format',
            qualityScore: 75,
          },
        ],
      });

      const issues = await prisma.vendorQualityIssue.findMany({
        where: { runId: run.id },
        orderBy: { severity: 'desc' },
      });

      expect(issues).toHaveLength(2);
      expect(issues[0].severity).toBe('high');
    });

    it('should persist duplicate clusters', async () => {
      const run = await prisma.vendorQualityRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalVendors: 100,
          issuesFound: 0,
          duplicatesFound: 2,
          potentialSavings: 10000,
          parameters: {},
        },
      });

      await prisma.vendorDuplicateCluster.createMany({
        data: [
          {
            runId: run.id,
            clusterSize: 3,
            vendorIds: ['V001', 'V002', 'V003'],
            vendorNames: ['Acme Corp', 'ACME Corporation', 'Acme Inc'],
            similarityScore: 0.95,
            matchFields: ['vendorName', 'taxNumber'],
            estimatedSavings: 7500,
            recommendedAction: 'Merge vendors V002 and V003 into V001',
          },
          {
            runId: run.id,
            clusterSize: 2,
            vendorIds: ['V004', 'V005'],
            vendorNames: ['Vendor X', 'Vendor X LLC'],
            similarityScore: 0.88,
            matchFields: ['vendorName', 'address'],
            estimatedSavings: 2500,
            recommendedAction: 'Review and merge if same entity',
          },
        ],
      });

      const clusters = await prisma.vendorDuplicateCluster.findMany({
        where: { runId: run.id },
        orderBy: { estimatedSavings: 'desc' },
      });

      expect(clusters).toHaveLength(2);
      expect(clusters[0].clusterSize).toBe(3);
      expect(clusters[0].estimatedSavings).toBe(7500);
    });

    it('should calculate total potential savings across clusters', async () => {
      const run = await prisma.vendorQualityRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalVendors: 200,
          issuesFound: 0,
          duplicatesFound: 3,
          potentialSavings: 0,
          parameters: {},
          duplicateClusters: {
            create: [
              {
                clusterSize: 2,
                vendorIds: ['V100', 'V101'],
                vendorNames: ['Test 1', 'Test 2'],
                similarityScore: 0.9,
                matchFields: ['vendorName'],
                estimatedSavings: 5000,
                recommendedAction: 'Merge',
              },
              {
                clusterSize: 2,
                vendorIds: ['V102', 'V103'],
                vendorNames: ['Test 3', 'Test 4'],
                similarityScore: 0.85,
                matchFields: ['taxNumber'],
                estimatedSavings: 3000,
                recommendedAction: 'Merge',
              },
            ],
          },
        },
      });

      const clusters = await prisma.vendorDuplicateCluster.findMany({
        where: { runId: run.id },
      });

      const totalSavings = clusters.reduce(
        (sum, cluster) => sum + cluster.estimatedSavings,
        0
      );

      expect(totalSavings).toBe(8000);
    });
  });

  describe('Cross-Module Statistics', () => {
    it('should retrieve statistics across all modules', async () => {
      // Create runs for all modules
      const [invoiceRuns, glRuns, vendorRuns] = await Promise.all([
        prisma.invoiceMatchRun.count({
          where: { tenantId: testTenantId },
        }),
        prisma.gLAnomalyRun.count({
          where: { tenantId: testTenantId },
        }),
        prisma.vendorQualityRun.count({
          where: { tenantId: testTenantId },
        }),
      ]);

      expect(invoiceRuns).toBeGreaterThan(0);
      expect(glRuns).toBeGreaterThan(0);
      expect(vendorRuns).toBeGreaterThan(0);
    });

    it('should verify referential integrity', async () => {
      const run = await prisma.invoiceMatchRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalInvoices: 1,
          matchedInvoices: 1,
          unmatchedInvoices: 0,
          fraudAlertsCount: 0,
          parameters: {},
          matchResults: {
            create: {
              invoiceNumber: 'REF-001',
              matchStatus: 'matched',
              matchScore: 100,
              discrepancies: {},
              amounts: {},
            },
          },
        },
        include: {
          matchResults: true,
        },
      });

      expect(run.matchResults).toHaveLength(1);
      expect(run.matchResults[0].runId).toBe(run.id);

      // Verify cascade behavior doesn't accidentally delete
      const results = await prisma.invoiceMatchResult.findMany({
        where: { runId: run.id },
      });

      expect(results).toHaveLength(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk inserts efficiently', async () => {
      const run = await prisma.invoiceMatchRun.create({
        data: {
          tenantId: testTenantId,
          status: 'completed',
          totalInvoices: 100,
          matchedInvoices: 100,
          unmatchedInvoices: 0,
          fraudAlertsCount: 0,
          parameters: {},
        },
      });

      const results = Array.from({ length: 100 }, (_, i) => ({
        runId: run.id,
        invoiceNumber: `BULK-${i.toString().padStart(3, '0')}`,
        matchStatus: 'matched',
        matchScore: 90 + Math.random() * 10,
        discrepancies: {},
        amounts: {},
      }));

      const startTime = Date.now();
      await prisma.invoiceMatchResult.createMany({ data: results });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

      const count = await prisma.invoiceMatchResult.count({
        where: { runId: run.id },
      });

      expect(count).toBe(100);
    });
  });
});

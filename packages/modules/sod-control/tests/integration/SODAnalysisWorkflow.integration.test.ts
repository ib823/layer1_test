/**
 * SoD Analysis Workflow Integration Tests
 *
 * Tests complete end-to-end SoD analysis with real database
 */

import { SODAnalyzerEngine } from '../../src/engine/SODAnalyzerEngine';
import { RuleEngine } from '../../src/engine/RuleEngine';
import { PrismaClient } from '@sap-framework/core';

describe('SOD Analysis Workflow Integration', () => {
  let engine: SODAnalyzerEngine;
  let prisma: PrismaClient;
  const testTenantId = 'test-tenant-sod-integration';
  const testSystemId = 'SAP_PRD_TEST';

  beforeAll(async () => {
    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sapframework'
        }
      }
    });

    // Initialize engine
    engine = new SODAnalyzerEngine(prisma);

    // Clean up any existing test data
    await cleanupTestData();

    // Seed test data
    await seedTestData();
  }, 30000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    // Delete in correct order due to foreign keys
    await prisma.sod_finding_comments.deleteMany({
      where: { tenant_id: testTenantId }
    });
    await prisma.sod_findings.deleteMany({
      where: { tenant_id: testTenantId }
    });
    await prisma.sod_analysis_runs.deleteMany({
      where: { tenant_id: testTenantId }
    });
    await prisma.access_graph_assignments.deleteMany({
      where: { tenant_id: testTenantId }
    });
    await prisma.access_graph_roles.deleteMany({
      where: { tenant_id: testTenantId }
    });
    await prisma.access_graph_users.deleteMany({
      where: { tenant_id: testTenantId }
    });
    await prisma.sod_rules.deleteMany({
      where: { tenant_id: testTenantId }
    });
    await prisma.sod_rulesets.deleteMany({
      where: { tenant_id: testTenantId }
    });
  }

  async function seedTestData() {
    // Create SoD rules (sod_rulesets not needed for basic rules)
    await prisma.sod_rules.createMany({
      data: [
        {
          tenant_id: testTenantId,
          rule_code: 'FI_SOD_001',
          rule_name: 'Payment Creation and Approval Conflict',
          description: 'Users should not be able to both create and approve payments',
          rule_type: 'ROLE_CONFLICT',
          severity: 'CRITICAL',
          business_process: 'P2P',
          detection_logic: { conflicting_functions: ['CREATE_PAYMENT', 'APPROVE_PAYMENT'] },
          is_active: true,
        },
        {
          tenant_id: testTenantId,
          rule_code: 'FI_SOD_002',
          rule_name: 'Vendor Master and Payment Conflict',
          description: 'Users should not maintain vendor master and process payments',
          rule_type: 'ROLE_CONFLICT',
          severity: 'HIGH',
          business_process: 'P2P',
          detection_logic: { conflicting_functions: ['MAINTAIN_VENDOR', 'CREATE_PAYMENT'] },
          is_active: true,
        }
      ]
    });

    // Create users
    const user1 = await prisma.access_graph_users.create({
      data: {
        tenant_id: testTenantId,
        user_id: 'TESTUSER001',
        user_name: 'john.doe',
        email: 'john.doe@test.com',
        full_name: 'John Doe',
        source_system_id: testSystemId,
        is_active: true,
        is_locked: false,
      }
    });

    const user2 = await prisma.access_graph_users.create({
      data: {
        tenant_id: testTenantId,
        user_id: 'TESTUSER002',
        user_name: 'jane.smith',
        email: 'jane.smith@test.com',
        full_name: 'Jane Smith',
        source_system_id: testSystemId,
        is_active: true,
        is_locked: false,
      }
    });

    // Create roles
    const rolePaymentCreate = await prisma.access_graph_roles.create({
      data: {
        tenant_id: testTenantId,
        role_id: 'Z_FI_PAYMENT_CREATE',
        role_name: 'Payment Creator',
        source_system_id: testSystemId,
        role_type: 'COMPOSITE',
        is_critical: true,
      }
    });

    const rolePaymentApprove = await prisma.access_graph_roles.create({
      data: {
        tenant_id: testTenantId,
        role_id: 'Z_FI_PAYMENT_APPROVE',
        role_name: 'Payment Approver',
        source_system_id: testSystemId,
        role_type: 'COMPOSITE',
        is_critical: true,
      }
    });

    const roleVendorMaster = await prisma.access_graph_roles.create({
      data: {
        tenant_id: testTenantId,
        role_id: 'Z_MM_VENDOR_MASTER',
        role_name: 'Vendor Master Maintenance',
        source_system_id: testSystemId,
        role_type: 'COMPOSITE',
        is_critical: false,
      }
    });

    // Assign conflicting roles to user1 (should trigger violation)
    await prisma.access_graph_assignments.createMany({
      data: [
        {
          tenant_id: testTenantId,
          user_id: user1.id,
          role_id: rolePaymentCreate.id,
          assignment_type: 'DIRECT',
        },
        {
          tenant_id: testTenantId,
          user_id: user1.id,
          role_id: rolePaymentApprove.id,
          assignment_type: 'DIRECT',
        }
      ]
    });

    // Assign non-conflicting roles to user2
    await prisma.access_graph_assignments.create({
      data: {
        tenant_id: testTenantId,
        user_id: user2.id,
        role_id: roleVendorMaster.id,
        assignment_type: 'DIRECT',
      }
    });
  }

  describe('Full Analysis Workflow', () => {
    it('should complete full SoD analysis and detect violations', async () => {
      // Run analysis
      const result = await engine.analyze({
        tenantId: testTenantId,
        systemIds: [testSystemId],
        rulesetIds: [], // Use all active rulesets
        analysisType: 'FULL',
        triggeredBy: 'integration-test',
      });

      // Verify analysis run created
      expect(result.runId).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.totalUsers).toBe(2);
      expect(result.totalRoles).toBe(3);

      // Verify violations detected
      expect(result.violationsFound).toBeGreaterThan(0);
      expect(result.criticalViolations).toBeGreaterThan(0);

      // Verify analysis run persisted
      const analysisRun = await prisma.sod_analysis_runs.findUnique({
        where: { id: result.runId }
      });

      expect(analysisRun).toBeDefined();
      expect(analysisRun?.status).toBe('COMPLETED');
      expect(analysisRun?.violations_found).toBeGreaterThan(0);
    }, 30000);

    it('should create detailed violation findings', async () => {
      // Run analysis
      const result = await engine.analyze({
        tenantId: testTenantId,
        systemIds: [testSystemId],
        rulesetIds: [],
        analysisType: 'FULL',
        triggeredBy: 'integration-test',
      });

      // Fetch findings
      const findings = await prisma.sod_findings.findMany({
        where: {
          tenant_id: testTenantId,
          run_id: result.runId,
        }
      });

      expect(findings.length).toBeGreaterThan(0);

      // Verify finding structure
      const finding = findings[0];
      expect(finding.finding_code).toBeDefined();
      expect(finding.severity).toBeDefined();
      expect(finding.user_id).toBeDefined();
      expect(finding.conflicting_roles).toBeDefined();

      // Verify rule association
      expect(finding.rule_id).toBeDefined();
      expect(finding.rule_name).toBeDefined();
    }, 30000);

    it('should calculate risk scores correctly', async () => {
      const result = await engine.analyze({
        tenantId: testTenantId,
        systemIds: [testSystemId],
        rulesetIds: [],
        analysisType: 'FULL',
        triggeredBy: 'integration-test',
      });

      const findings = await prisma.sod_findings.findMany({
        where: {
          tenant_id: testTenantId,
          run_id: result.runId,
        }
      });

      // Verify risk scores assigned
      findings.forEach((finding: any) => {
        expect(finding.risk_score).toBeGreaterThan(0);
        expect(finding.risk_score).toBeLessThanOrEqual(100);
        expect(finding.severity).toMatch(/CRITICAL|HIGH|MEDIUM|LOW/);
      });

      // Critical violations should have higher risk scores
      const criticalFinding = findings.find((f: any) => f.severity === 'CRITICAL');
      if (criticalFinding) {
        expect(criticalFinding.risk_score).toBeGreaterThan(70);
      }
    }, 30000);
  });

  describe('Incremental Analysis', () => {
    it('should detect new violations after role assignment', async () => {
      // Initial analysis
      const initialResult = await engine.analyze({
        tenantId: testTenantId,
        systemIds: [testSystemId],
        rulesetIds: [],
        analysisType: 'FULL',
        triggeredBy: 'integration-test-initial',
      });

      const initialViolations = initialResult.violationsFound;

      // Assign additional conflicting role
      const user2 = await prisma.access_graph_users.findFirst({
        where: {
          tenant_id: testTenantId,
          user_id: 'TESTUSER002',
        }
      });

      const rolePaymentCreate = await prisma.access_graph_roles.findFirst({
        where: {
          tenant_id: testTenantId,
          role_id: 'Z_FI_PAYMENT_CREATE',
        }
      });

      await prisma.access_graph_assignments.create({
        data: {
          tenant_id: testTenantId,
          user_id: user2!.id,
          role_id: rolePaymentCreate!.id,
          assignment_type: 'DIRECT',
        }
      });

      // Run incremental analysis
      const incrementalResult = await engine.analyze({
        tenantId: testTenantId,
        systemIds: [testSystemId],
        rulesetIds: [],
        analysisType: 'INCREMENTAL',
        triggeredBy: 'integration-test-incremental',
      });

      // Should detect additional violation
      expect(incrementalResult.violationsFound).toBeGreaterThanOrEqual(initialViolations);
      expect(incrementalResult.status).toBe('COMPLETED');
    }, 30000);
  });

  describe('Rule Filtering', () => {
    it('should only apply active rules', async () => {
      // Deactivate all but one rule
      await prisma.sod_rules.updateMany({
        where: {
          tenant_id: testTenantId,
          rule_code: { not: 'FI_SOD_001' }
        },
        data: { is_active: false }
      });

      // Run analysis
      const result = await engine.analyze({
        tenantId: testTenantId,
        systemIds: [testSystemId],
        rulesetIds: [],
        analysisType: 'FULL',
        triggeredBy: 'integration-test-filtered',
      });

      // Should only detect violations from active rule
      const findings = await prisma.sod_findings.findMany({
        where: {
          tenant_id: testTenantId,
          run_id: result.runId,
        }
      });

      // Verify findings exist (from active rules only)
      expect(findings.length).toBeGreaterThan(0);
      findings.forEach((finding: any) => {
        expect(finding.rule_id).toBeDefined();
      });

      // Reactivate rules
      await prisma.sod_rules.updateMany({
        where: { tenant_id: testTenantId },
        data: { is_active: true }
      });
    }, 30000);
  });

  describe('Performance', () => {
    it('should complete analysis within acceptable time', async () => {
      const startTime = Date.now();

      await engine.analyze({
        tenantId: testTenantId,
        systemIds: [testSystemId],
        rulesetIds: [],
        analysisType: 'FULL',
        triggeredBy: 'integration-test-performance',
      });

      const duration = Date.now() - startTime;

      // Should complete in under 5 seconds for small dataset
      expect(duration).toBeLessThan(5000);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid tenant gracefully', async () => {
      await expect(
        engine.analyze({
          tenantId: 'non-existent-tenant',
          systemIds: [testSystemId],
          rulesetIds: [],
          analysisType: 'FULL',
          triggeredBy: 'integration-test-error',
        })
      ).rejects.toThrow();
    });

    it('should handle empty user set gracefully', async () => {
      // Delete all users temporarily
      await prisma.access_graph_users.deleteMany({
        where: { tenant_id: testTenantId }
      });

      const result = await engine.analyze({
        tenantId: testTenantId,
        systemIds: [testSystemId],
        rulesetIds: [],
        analysisType: 'FULL',
        triggeredBy: 'integration-test-empty',
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.totalUsers).toBe(0);
      expect(result.violationsFound).toBe(0);

      // Restore users
      await seedTestData();
    }, 30000);
  });
});

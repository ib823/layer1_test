/**
 * SoD Analysis Workflow Integration Tests
 *
 * End-to-end integration tests for SoD analysis workflows.
 * These tests use a real database connection and test the full stack.
 *
 * Prerequisites:
 * - PostgreSQL database running
 * - DATABASE_URL environment variable set
 * - Prisma schema migrated
 */

import { SODAnalyzerEngine } from '../../src/engine/SODAnalyzerEngine';
import { AccessGraphService } from '../../src/services/AccessGraphService';
import { RuleEngine } from '../../src/engine/RuleEngine';
import { PrismaClient } from '@sap-framework/core';
import { v4 as uuidv4 } from 'uuid';

describe('SoD Analysis Workflow Integration Tests', () => {
  let prisma: PrismaClient;
  let analyzer: SODAnalyzerEngine;
  let accessGraphService: AccessGraphService;
  let testTenantId: string;
  let testSystemId: string;

  beforeAll(async () => {
    // Initialize database connection
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sapframework',
        },
      },
    });

    await prisma.$connect();

    // Create Knex-compatible wrapper for services that expect it
    const db = (table: string) => {
      // This is a simplified Knex-like interface
      // In production, use actual Knex or update services to use Prisma
      return prisma[table as keyof PrismaClient] as any;
    };

    accessGraphService = new AccessGraphService(db);
    analyzer = new SODAnalyzerEngine({ database: db });
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testTenantId) {
      await prisma.sod_findings.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_graph_assignments.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_graph_roles.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_graph_users.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_systems.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.tenant_profiles.deleteMany({ where: { id: testTenantId } });
    }

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test tenant
    testTenantId = uuidv4();

    await prisma.tenant_profiles.create({
      data: {
        id: testTenantId,
        tenant_name: 'Test Tenant - SoD Integration',
        tenant_code: `TEST-SOD-${Date.now()}`,
        status: 'ACTIVE',
        subscription_tier: 'ENTERPRISE',
        available_services: {},
        module_config: {},
      },
    });

    // Create test access system
    testSystemId = uuidv4();

    await prisma.access_systems.create({
      data: {
        id: testSystemId,
        tenant_id: testTenantId,
        system_name: 'SAP S/4HANA Test',
        system_type: 'S4HANA',
        system_id: 'S4H-TEST-001',
        connection_status: 'ACTIVE',
        sync_status: 'ACTIVE',
        capabilities: {},
      },
    });
  });

  describe('End-to-End Analysis Workflow', () => {
    it('should execute complete analysis workflow: data load -> analysis -> findings', async () => {
      // Step 1: Create test users
      const user1Id = uuidv4();
      const user2Id = uuidv4();

      await prisma.access_graph_users.createMany({
        data: [
          {
            id: user1Id,
            tenant_id: testTenantId,
            user_id: 'USER001',
            user_name: 'john.doe',
            email: 'john.doe@example.com',
            source_system_id: testSystemId,
            is_active: true,
            is_locked: false,
            source_data: {},
          },
          {
            id: user2Id,
            tenant_id: testTenantId,
            user_id: 'USER002',
            user_name: 'jane.smith',
            email: 'jane.smith@example.com',
            source_system_id: testSystemId,
            is_active: true,
            is_locked: false,
            source_data: {},
          },
        ],
      });

      // Step 2: Create conflicting roles (simulate GL Accountant + Vendor Master)
      const glRoleId = uuidv4();
      const vendorRoleId = uuidv4();

      await prisma.access_graph_roles.createMany({
        data: [
          {
            id: glRoleId,
            tenant_id: testTenantId,
            role_id: 'SAP_FI_GL_ACCOUNTANT',
            role_name: 'GL Accountant',
            role_description: 'General Ledger Accountant',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: true,
            business_process: 'R2R',
            risk_level: 'HIGH',
            source_data: {},
          },
          {
            id: vendorRoleId,
            tenant_id: testTenantId,
            role_id: 'SAP_MM_VENDOR_MASTER',
            role_name: 'Vendor Master Maintenance',
            role_description: 'Maintain vendor master records',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: true,
            business_process: 'P2P',
            risk_level: 'HIGH',
            source_data: {},
          },
        ],
      });

      // Step 3: Assign both roles to user1 (creates SoD conflict)
      await prisma.access_graph_assignments.createMany({
        data: [
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            user_id: user1Id,
            role_id: glRoleId,
            assignment_type: 'DIRECT',
            assigned_at: new Date(),
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            user_id: user1Id,
            role_id: vendorRoleId,
            assignment_type: 'DIRECT',
            assigned_at: new Date(),
          },
        ],
      });

      // Assign only one role to user2 (no conflict)
      await prisma.access_graph_assignments.create({
        data: {
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: user2Id,
          role_id: glRoleId,
          assignment_type: 'DIRECT',
          assigned_at: new Date(),
        },
      });

      // Step 4: Create SoD rule for this conflict
      const riskId = uuidv4();
      const ruleId = uuidv4();

      await prisma.sod_risks.create({
        data: {
          id: riskId,
          tenant_id: testTenantId,
          risk_code: 'SOD-P2P-001',
          risk_name: 'Vendor Master + Payment Processing',
          risk_description: 'Risk of fraudulent vendor creation and payment',
          business_process: 'P2P',
          risk_category: 'FRAUD',
          severity: 'CRITICAL',
          compliance_frameworks: ['SOX', 'ISO27001'],
          is_active: true,
        },
      });

      await prisma.sod_rules.create({
        data: {
          id: ruleId,
          tenant_id: testTenantId,
          rule_code: 'RULE-P2P-001',
          rule_name: 'Prevent Vendor Master + GL Posting',
          risk_id: riskId,
          rule_type: 'ROLE_CONFLICT',
          severity: 'CRITICAL',
          rule_definition: {
            type: 'role_conflict',
            conflicting_roles: ['SAP_MM_VENDOR_MASTER', 'SAP_FI_GL_ACCOUNTANT'],
            match_mode: 'all',
          },
          is_active: true,
        },
      });

      // Step 5: Run comprehensive analysis
      const analysisResult = await analyzer.analyzeAllUsers(testTenantId, {
        mode: 'snapshot',
        includeInactive: false,
        riskLevels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      });

      // Step 6: Verify analysis results
      expect(analysisResult).toBeDefined();
      expect(analysisResult.analysisId).toBeDefined();
      expect(analysisResult.totalFindings).toBeGreaterThan(0);
      expect(analysisResult.findings).toHaveLength(analysisResult.totalFindings);

      // Should find violation for user1 but not user2
      const user1Findings = analysisResult.findings.filter(f => f.userId === user1Id);
      const user2Findings = analysisResult.findings.filter(f => f.userId === user2Id);

      expect(user1Findings.length).toBeGreaterThan(0);
      expect(user2Findings.length).toBe(0);

      // Verify finding details
      const criticalFinding = user1Findings.find(f => f.severity === 'CRITICAL');
      expect(criticalFinding).toBeDefined();
      expect(criticalFinding?.conflictingRoles).toContain(glRoleId);
      expect(criticalFinding?.conflictingRoles).toContain(vendorRoleId);

      // Step 7: Verify findings were persisted to database
      const persistedFindings = await prisma.sod_findings.findMany({
        where: { tenant_id: testTenantId, status: 'OPEN' },
      });

      expect(persistedFindings.length).toBeGreaterThan(0);

      console.log(`✓ E2E Analysis Workflow Complete: ${analysisResult.totalFindings} findings detected`);
    }, 30000); // 30 second timeout for integration test

    it('should handle analysis with no violations', async () => {
      // Create user with only one role (no conflict possible)
      const userId = uuidv4();
      const roleId = uuidv4();

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'SAFE-USER-001',
          user_name: 'safe.user',
          email: 'safe@example.com',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      await prisma.access_graph_roles.create({
        data: {
          id: roleId,
          tenant_id: testTenantId,
          role_id: 'SAP_DISPLAY_ONLY',
          role_name: 'Display Only',
          source_system_id: testSystemId,
          role_type: 'SINGLE',
          is_technical: false,
          is_critical: false,
          source_data: {},
        },
      });

      await prisma.access_graph_assignments.create({
        data: {
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userId,
          role_id: roleId,
          assignment_type: 'DIRECT',
          assigned_at: new Date(),
        },
      });

      // Run analysis
      const result = await analyzer.analyzeAllUsers(testTenantId);

      // Should complete without errors, but no findings
      expect(result.totalFindings).toBe(0);
      expect(result.findings).toHaveLength(0);
      expect(result.criticalCount).toBe(0);
    }, 15000);

    it('should create snapshot before analysis', async () => {
      // Get current snapshot count
      const snapshotsBefore = await prisma.access_graph_snapshots.count({
        where: { tenant_id: testTenantId },
      });

      // Run analysis (should create snapshot)
      await analyzer.analyzeAllUsers(testTenantId);

      // Verify snapshot was created
      const snapshotsAfter = await prisma.access_graph_snapshots.count({
        where: { tenant_id: testTenantId },
      });

      expect(snapshotsAfter).toBe(snapshotsBefore + 1);

      // Verify snapshot content
      const latestSnapshot = await prisma.access_graph_snapshots.findFirst({
        where: { tenant_id: testTenantId },
        orderBy: { snapshot_date: 'desc' },
      });

      expect(latestSnapshot).toBeDefined();
      expect(latestSnapshot?.snapshot_type).toBe('ON_DEMAND');
      expect(latestSnapshot?.triggered_by).toBe('SODAnalyzerEngine');
    }, 15000);
  });

  describe('Multi-Tenant Isolation', () => {
    let tenant2Id: string;

    beforeEach(async () => {
      // Create second tenant
      tenant2Id = uuidv4();

      await prisma.tenant_profiles.create({
        data: {
          id: tenant2Id,
          tenant_name: 'Test Tenant 2',
          tenant_code: `TEST-SOD-2-${Date.now()}`,
          status: 'ACTIVE',
          subscription_tier: 'ENTERPRISE',
          available_services: {},
          module_config: {},
        },
      });
    });

    afterEach(async () => {
      if (tenant2Id) {
        await prisma.sod_findings.deleteMany({ where: { tenant_id: tenant2Id } });
        await prisma.access_graph_assignments.deleteMany({ where: { tenant_id: tenant2Id } });
        await prisma.access_graph_roles.deleteMany({ where: { tenant_id: tenant2Id } });
        await prisma.access_graph_users.deleteMany({ where: { tenant_id: tenant2Id } });
        await prisma.tenant_profiles.deleteMany({ where: { id: tenant2Id } });
      }
    });

    it('should isolate analysis results between tenants', async () => {
      // Create user in tenant 1
      const user1Id = uuidv4();
      await prisma.access_graph_users.create({
        data: {
          id: user1Id,
          tenant_id: testTenantId,
          user_id: 'TENANT1-USER',
          user_name: 'tenant1.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      // Create user in tenant 2
      const user2Id = uuidv4();
      await prisma.access_graph_users.create({
        data: {
          id: user2Id,
          tenant_id: tenant2Id,
          user_id: 'TENANT2-USER',
          user_name: 'tenant2.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      // Run analysis for tenant 1
      const result1 = await analyzer.analyzeAllUsers(testTenantId);

      // Run analysis for tenant 2
      const result2 = await analyzer.analyzeAllUsers(tenant2Id);

      // Verify tenant 1 findings don't include tenant 2 users
      const tenant1UserIds = result1.findings.map(f => f.userId);
      expect(tenant1UserIds).not.toContain(user2Id);

      // Verify tenant 2 findings don't include tenant 1 users
      const tenant2UserIds = result2.findings.map(f => f.userId);
      expect(tenant2UserIds).not.toContain(user1Id);

      console.log(`✓ Multi-tenant isolation verified`);
    }, 20000);

    it('should not allow cross-tenant data access in AccessGraphService', async () => {
      // Create user in tenant 1
      const user1Id = uuidv4();
      await prisma.access_graph_users.create({
        data: {
          id: user1Id,
          tenant_id: testTenantId,
          user_id: 'TENANT1-USER',
          user_name: 'tenant1.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      // Try to access tenant 1 user from tenant 2 context
      await expect(
        accessGraphService.getUserAccessSummary(tenant2Id, user1Id)
      ).rejects.toThrow();

      console.log(`✓ Cross-tenant access prevented`);
    }, 10000);
  });

  describe('Access Graph Statistics', () => {
    it('should calculate accurate statistics', async () => {
      // Create 10 users
      const userIds = Array.from({ length: 10 }, () => uuidv4());
      await prisma.access_graph_users.createMany({
        data: userIds.map((id, idx) => ({
          id,
          tenant_id: testTenantId,
          user_id: `USER-${idx + 1}`,
          user_name: `user${idx + 1}`,
          source_system_id: testSystemId,
          is_active: idx < 8, // 8 active, 2 inactive
          is_locked: false,
          source_data: {},
        })),
      });

      // Create 5 roles
      const roleIds = Array.from({ length: 5 }, () => uuidv4());
      await prisma.access_graph_roles.createMany({
        data: roleIds.map((id, idx) => ({
          id,
          tenant_id: testTenantId,
          role_id: `ROLE-${idx + 1}`,
          role_name: `Role ${idx + 1}`,
          source_system_id: testSystemId,
          role_type: 'SINGLE',
          is_technical: false,
          is_critical: idx < 2, // 2 critical, 3 normal
          source_data: {},
        })),
      });

      // Create 20 assignments (avg 2 roles per user)
      const assignments = [];
      for (let i = 0; i < userIds.length; i++) {
        assignments.push({
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userIds[i],
          role_id: roleIds[i % roleIds.length],
          assignment_type: 'DIRECT' as const,
          assigned_at: new Date(),
        });
        if (i < 10) {
          assignments.push({
            id: uuidv4(),
            tenant_id: testTenantId,
            user_id: userIds[i],
            role_id: roleIds[(i + 1) % roleIds.length],
            assignment_type: 'DIRECT' as const,
            assigned_at: new Date(),
          });
        }
      }
      await prisma.access_graph_assignments.createMany({ data: assignments });

      // Get statistics
      const stats = await accessGraphService.getAccessGraphStatistics(testTenantId);

      // Verify
      expect(stats.totalUsers).toBe(10);
      expect(stats.totalRoles).toBe(5);
      expect(stats.totalAssignments).toBe(20);
      expect(stats.avgRolesPerUser).toBe(2.0);
      expect(stats.criticalRoles).toBe(2);
      expect(stats.inactiveUsers).toBe(2);

      console.log(`✓ Access graph statistics calculated correctly`);
    }, 15000);
  });

  describe('Snapshot and Delta Detection', () => {
    it('should detect user additions between snapshots', async () => {
      // Create initial snapshot
      const snapshot1 = await accessGraphService.createSnapshot(
        testTenantId,
        'ON_DEMAND',
        'integration-test'
      );

      expect(snapshot1.id).toBeDefined();
      expect(snapshot1.totalUsers).toBe(0);

      // Add a user
      const userId = uuidv4();
      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'NEW-USER-001',
          user_name: 'new.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      // Create second snapshot
      const snapshot2 = await accessGraphService.createSnapshot(
        testTenantId,
        'ON_DEMAND',
        'integration-test'
      );

      expect(snapshot2.totalUsers).toBe(1);

      // Detect deltas
      const deltas = await accessGraphService.detectDeltas(
        testTenantId,
        snapshot1.id,
        snapshot2.id
      );

      // Verify delta detected
      const userAdditions = deltas.filter(d => d.changeType === 'USER_ADDED');
      expect(userAdditions.length).toBe(1);
      expect(userAdditions[0].entityId).toBe('NEW-USER-001');

      console.log(`✓ User addition delta detected`);
    }, 20000);

    it('should detect role assignment changes', async () => {
      // Create user and role
      const userId = uuidv4();
      const role1Id = uuidv4();
      const role2Id = uuidv4();

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'USER-001',
          user_name: 'test.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      await prisma.access_graph_roles.createMany({
        data: [
          {
            id: role1Id,
            tenant_id: testTenantId,
            role_id: 'ROLE-001',
            role_name: 'Role 1',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: false,
            source_data: {},
          },
          {
            id: role2Id,
            tenant_id: testTenantId,
            role_id: 'ROLE-002',
            role_name: 'Role 2',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: false,
            source_data: {},
          },
        ],
      });

      // Assign role 1
      await prisma.access_graph_assignments.create({
        data: {
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userId,
          role_id: role1Id,
          assignment_type: 'DIRECT',
          assigned_at: new Date(),
        },
      });

      // Snapshot 1
      const snapshot1 = await accessGraphService.createSnapshot(
        testTenantId,
        'ON_DEMAND',
        'test'
      );

      // Assign role 2
      await prisma.access_graph_assignments.create({
        data: {
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userId,
          role_id: role2Id,
          assignment_type: 'DIRECT',
          assigned_at: new Date(),
        },
      });

      // Snapshot 2
      const snapshot2 = await accessGraphService.createSnapshot(
        testTenantId,
        'ON_DEMAND',
        'test'
      );

      // Detect deltas
      const deltas = await accessGraphService.detectDeltas(
        testTenantId,
        snapshot1.id,
        snapshot2.id
      );

      // Verify assignment delta
      const assignmentChanges = deltas.filter(d => d.changeType === 'ROLE_ASSIGNED');
      expect(assignmentChanges.length).toBe(1);
      expect(assignmentChanges[0].introducesSodRisk).toBe(true); // Flagged for analysis

      console.log(`✓ Role assignment delta detected`);
    }, 20000);
  });

  describe('Compliance Reporting', () => {
    it('should generate accurate compliance report', async () => {
      // Create test data: 5 users, 3 roles, 10 assignments
      const userIds = Array.from({ length: 5 }, () => uuidv4());
      await prisma.access_graph_users.createMany({
        data: userIds.map((id, idx) => ({
          id,
          tenant_id: testTenantId,
          user_id: `USER-${idx}`,
          user_name: `user${idx}`,
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        })),
      });

      const roleIds = Array.from({ length: 3 }, () => uuidv4());
      await prisma.access_graph_roles.createMany({
        data: roleIds.map((id, idx) => ({
          id,
          tenant_id: testTenantId,
          role_id: `ROLE-${idx}`,
          role_name: `Role ${idx}`,
          source_system_id: testSystemId,
          role_type: 'SINGLE',
          is_technical: false,
          is_critical: false,
          source_data: {},
        })),
      });

      // Create some violations
      await prisma.sod_findings.createMany({
        data: [
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'FIND-001',
            risk_id: uuidv4(),
            user_id: userIds[0],
            severity: 'CRITICAL',
            status: 'OPEN',
            conflicting_roles: [roleIds[0], roleIds[1]],
            conflicting_functions: [],
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'FIND-002',
            risk_id: uuidv4(),
            user_id: userIds[1],
            severity: 'HIGH',
            status: 'RESOLVED',
            conflicting_roles: [roleIds[1], roleIds[2]],
            conflicting_functions: [],
            resolved_at: new Date(),
          },
        ],
      });

      // Create analysis run
      await prisma.sod_analysis_runs.create({
        data: {
          id: uuidv4(),
          tenant_id: testTenantId,
          run_type: 'FULL',
          status: 'COMPLETED',
          started_at: new Date(),
          completed_at: new Date(),
          total_users_analyzed: 5,
          total_findings: 2,
        },
      });

      // Generate compliance report
      const report = await analyzer.getComplianceReport(testTenantId);

      // Verify report
      expect(report.totalUsers).toBe(5);
      expect(report.totalRoles).toBe(3);
      expect(report.totalViolations).toBe(1); // Only open violations
      expect(report.criticalViolations).toBe(1);
      expect(report.resolutionRate).toBeGreaterThan(0);
      expect(report.lastAnalysisDate).toBeDefined();

      console.log(`✓ Compliance report generated: ${report.complianceScore}% compliance`);
    }, 15000);
  });
});

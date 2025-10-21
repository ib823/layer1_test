/**
 * User Access Analysis Integration Tests
 *
 * Tests for user-specific access analysis, recommendations,
 * and what-if simulation scenarios.
 */

import { SODAnalyzerEngine } from '../../src/engine/SODAnalyzerEngine';
import { AccessGraphService } from '../../src/services/AccessGraphService';
import { PrismaClient } from '@sap-framework/core';
import { v4 as uuidv4 } from 'uuid';

describe('User Access Analysis Integration Tests', () => {
  let prisma: PrismaClient;
  let analyzer: SODAnalyzerEngine;
  let accessGraphService: AccessGraphService;
  let testTenantId: string;
  let testSystemId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sapframework',
        },
      },
    });

    await prisma.$connect();

    const db = (table: string) => {
      return prisma[table as keyof PrismaClient] as any;
    };

    analyzer = new SODAnalyzerEngine({ database: db });
    accessGraphService = new AccessGraphService(db);
  });

  afterAll(async () => {
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
    testTenantId = uuidv4();
    testSystemId = uuidv4();

    await prisma.tenant_profiles.create({
      data: {
        id: testTenantId,
        tenant_name: 'Test Tenant - User Access',
        tenant_code: `TEST-UA-${Date.now()}`,
        status: 'ACTIVE',
        subscription_tier: 'ENTERPRISE',
        available_services: {},
        module_config: {},
      },
    });

    await prisma.access_systems.create({
      data: {
        id: testSystemId,
        tenant_id: testTenantId,
        system_name: 'SAP Test System',
        system_type: 'S4HANA',
        system_id: 'S4H-TEST',
        connection_status: 'ACTIVE',
        sync_status: 'ACTIVE',
        capabilities: {},
      },
    });
  });

  describe('User-Specific Analysis', () => {
    it('should analyze single user and return findings', async () => {
      // Create user with conflicting roles
      const userId = uuidv4();
      const role1Id = uuidv4();
      const role2Id = uuidv4();

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'HIGH-RISK-USER',
          user_name: 'high.risk',
          email: 'high.risk@example.com',
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
            role_id: 'FI_ACCOUNTANT',
            role_name: 'Finance Accountant',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: true,
            source_data: {},
          },
          {
            id: role2Id,
            tenant_id: testTenantId,
            role_id: 'MM_VENDOR_MASTER',
            role_name: 'Vendor Master',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: true,
            source_data: {},
          },
        ],
      });

      await prisma.access_graph_assignments.createMany({
        data: [
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            user_id: userId,
            role_id: role1Id,
            assignment_type: 'DIRECT',
            assigned_at: new Date(),
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            user_id: userId,
            role_id: role2Id,
            assignment_type: 'DIRECT',
            assigned_at: new Date(),
          },
        ],
      });

      // Create SoD rule
      const riskId = uuidv4();
      await prisma.sod_risks.create({
        data: {
          id: riskId,
          tenant_id: testTenantId,
          risk_code: 'SOD-001',
          risk_name: 'Vendor + GL Risk',
          severity: 'CRITICAL',
          is_active: true,
        },
      });

      await prisma.sod_rules.create({
        data: {
          id: uuidv4(),
          tenant_id: testTenantId,
          rule_code: 'RULE-001',
          rule_name: 'Vendor + GL Conflict',
          risk_id: riskId,
          rule_type: 'ROLE_CONFLICT',
          severity: 'CRITICAL',
          rule_definition: {
            type: 'role_conflict',
            conflicting_roles: ['FI_ACCOUNTANT', 'MM_VENDOR_MASTER'],
          },
          is_active: true,
        },
      });

      // Analyze specific user
      const result = await analyzer.analyzeUser(testTenantId, userId);

      expect(result.userId).toBe(userId);
      expect(result.violationCount).toBeGreaterThan(0);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.criticalCount).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);

      console.log(`✓ User analysis: ${result.violationCount} violations, risk score: ${result.riskScore}`);
    }, 15000);

    it('should return zero violations for compliant user', async () => {
      const userId = uuidv4();
      const roleId = uuidv4();

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'SAFE-USER',
          user_name: 'safe.user',
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
          role_id: 'DISPLAY_ONLY',
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

      const result = await analyzer.analyzeUser(testTenantId, userId);

      expect(result.violationCount).toBe(0);
      expect(result.criticalCount).toBe(0);
      expect(result.highCount).toBe(0);

      console.log(`✓ Compliant user: 0 violations`);
    }, 10000);

    it('should calculate risk score based on severity', async () => {
      const userId = uuidv4();

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'TEST-USER',
          user_name: 'test.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      // Create findings with different severities
      await prisma.sod_findings.createMany({
        data: [
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'CRITICAL-001',
            risk_id: uuidv4(),
            user_id: userId,
            severity: 'CRITICAL',
            risk_score: 95,
            status: 'OPEN',
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'HIGH-001',
            risk_id: uuidv4(),
            user_id: userId,
            severity: 'HIGH',
            risk_score: 75,
            status: 'OPEN',
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'MEDIUM-001',
            risk_id: uuidv4(),
            user_id: userId,
            severity: 'MEDIUM',
            risk_score: 50,
            status: 'OPEN',
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          },
        ],
      });

      const result = await analyzer.analyzeUser(testTenantId, userId);

      expect(result.riskScore).toBeCloseTo((95 + 75 + 50) / 3, 1); // Average
      expect(result.criticalCount).toBe(1);
      expect(result.highCount).toBe(1);

      console.log(`✓ Risk score calculated: ${result.riskScore}`);
    }, 10000);
  });

  describe('User Access Summary', () => {
    it('should provide comprehensive access summary', async () => {
      const userId = uuidv4();
      const role1Id = uuidv4();
      const role2Id = uuidv4();

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'SUMMARY-USER',
          user_name: 'summary.user',
          email: 'summary@example.com',
          full_name: 'Summary Test User',
          department: 'Finance',
          position: 'Senior Accountant',
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
            role_id: 'CRITICAL_ROLE_1',
            role_name: 'Critical Role 1',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: true,
            source_data: {},
          },
          {
            id: role2Id,
            tenant_id: testTenantId,
            role_id: 'NORMAL_ROLE_1',
            role_name: 'Normal Role 1',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: false,
            source_data: {},
          },
        ],
      });

      await prisma.access_graph_assignments.createMany({
        data: [
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            user_id: userId,
            role_id: role1Id,
            assignment_type: 'DIRECT',
            assigned_at: new Date(),
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            user_id: userId,
            role_id: role2Id,
            assignment_type: 'DIRECT',
            assigned_at: new Date(),
          },
        ],
      });

      const summary = await accessGraphService.getUserAccessSummary(testTenantId, userId);

      expect(summary.user).toBeDefined();
      expect(summary.user.user_name).toBe('summary.user');
      expect(summary.user.email).toBe('summary@example.com');
      expect(summary.totalRolesCount).toBe(2);
      expect(summary.criticalRolesCount).toBe(1);
      expect(summary.roles.length).toBe(2);
      expect(summary.assignments.length).toBe(2);

      console.log(`✓ Access summary: ${summary.totalRolesCount} roles, ${summary.criticalRolesCount} critical`);
    }, 10000);

    it('should track last assignment date', async () => {
      const userId = uuidv4();
      const roleId = uuidv4();

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'DATE-TEST-USER',
          user_name: 'date.test',
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
          role_id: 'TEST_ROLE',
          role_name: 'Test Role',
          source_system_id: testSystemId,
          role_type: 'SINGLE',
          is_technical: false,
          is_critical: false,
          source_data: {},
        },
      });

      const assignmentDate = new Date();
      await prisma.access_graph_assignments.create({
        data: {
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userId,
          role_id: roleId,
          assignment_type: 'DIRECT',
          assigned_at: assignmentDate,
        },
      });

      const summary = await accessGraphService.getUserAccessSummary(testTenantId, userId);

      expect(summary.lastAssignmentDate).toBeDefined();
      expect(summary.lastAssignmentDate!.getTime()).toBeGreaterThanOrEqual(
        assignmentDate.getTime() - 1000
      ); // Allow 1s variance

      console.log(`✓ Last assignment date tracked`);
    }, 10000);
  });

  describe('Violation Reporting', () => {
    it('should generate comprehensive violation report', async () => {
      // Create multiple users with violations
      const users = Array.from({ length: 3 }, () => uuidv4());
      await prisma.access_graph_users.createMany({
        data: users.map((id, idx) => ({
          id,
          tenant_id: testTenantId,
          user_id: `USER-${idx}`,
          user_name: `user${idx}`,
          email: `user${idx}@example.com`,
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        })),
      });

      // Create findings with different severities
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      await prisma.sod_findings.createMany({
        data: [
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'CRIT-001',
            risk_id: uuidv4(),
            user_id: users[0],
            severity: 'CRITICAL',
            status: 'OPEN',
            first_detected: now,
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'HIGH-001',
            risk_id: uuidv4(),
            user_id: users[0],
            severity: 'HIGH',
            status: 'OPEN',
            first_detected: sevenDaysAgo,
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'MED-001',
            risk_id: uuidv4(),
            user_id: users[1],
            severity: 'MEDIUM',
            status: 'OPEN',
            first_detected: thirtyDaysAgo,
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'LOW-001',
            risk_id: uuidv4(),
            user_id: users[2],
            severity: 'LOW',
            status: 'OPEN',
            first_detected: now,
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          },
        ],
      });

      const report = await analyzer.generateViolationReport(testTenantId);

      expect(report.totalViolations).toBe(4);
      expect(report.bySeverity.CRITICAL).toBe(1);
      expect(report.bySeverity.HIGH).toBe(1);
      expect(report.bySeverity.MEDIUM).toBe(1);
      expect(report.bySeverity.LOW).toBe(1);
      expect(report.topViolators.length).toBeGreaterThan(0);
      expect(report.trends.last7Days).toBeGreaterThan(0);
      expect(report.trends.last30Days).toBe(4);

      console.log(`✓ Violation report: ${report.totalViolations} total, top violator has ${report.topViolators[0].count} violations`);
    }, 15000);

    it('should identify top violators', async () => {
      // Create user with multiple violations
      const heavyViolatorId = uuidv4();
      const normalUserId = uuidv4();

      await prisma.access_graph_users.createMany({
        data: [
          {
            id: heavyViolatorId,
            tenant_id: testTenantId,
            user_id: 'HEAVY-VIOLATOR',
            user_name: 'heavy.violator',
            email: 'heavy@example.com',
            source_system_id: testSystemId,
            is_active: true,
            is_locked: false,
            source_data: {},
          },
          {
            id: normalUserId,
            tenant_id: testTenantId,
            user_id: 'NORMAL-USER',
            user_name: 'normal.user',
            email: 'normal@example.com',
            source_system_id: testSystemId,
            is_active: true,
            is_locked: false,
            source_data: {},
          },
        ],
      });

      // Create 5 findings for heavy violator, 1 for normal user
      await prisma.sod_findings.createMany({
        data: [
          ...Array.from({ length: 5 }, (_, idx) => ({
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: `HEAVY-${idx}`,
            risk_id: uuidv4(),
            user_id: heavyViolatorId,
            severity: 'HIGH',
            status: 'OPEN',
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          })),
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            finding_code: 'NORMAL-1',
            risk_id: uuidv4(),
            user_id: normalUserId,
            severity: 'MEDIUM',
            status: 'OPEN',
            conflicting_roles: [uuidv4()],
            conflicting_functions: [],
          },
        ],
      });

      const report = await analyzer.generateViolationReport(testTenantId);

      expect(report.topViolators[0].count).toBe(5);
      expect(report.topViolators[0].userName).toBe('heavy.violator');

      console.log(`✓ Top violator identified: ${report.topViolators[0].userName} with ${report.topViolators[0].count} violations`);
    }, 10000);
  });

  describe('Recommendation Generation', () => {
    it('should generate remediation recommendations for findings', async () => {
      const userId = uuidv4();
      const role1Id = uuidv4();
      const role2Id = uuidv4();

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'REC-TEST-USER',
          user_name: 'rec.test',
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
            role_id: 'CONFLICT_ROLE_1',
            role_name: 'Conflicting Role 1',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: true,
            source_data: {},
          },
          {
            id: role2Id,
            tenant_id: testTenantId,
            role_id: 'CONFLICT_ROLE_2',
            role_name: 'Conflicting Role 2',
            source_system_id: testSystemId,
            role_type: 'SINGLE',
            is_technical: false,
            is_critical: true,
            source_data: {},
          },
        ],
      });

      const findingId = uuidv4();
      await prisma.sod_findings.create({
        data: {
          id: findingId,
          tenant_id: testTenantId,
          finding_code: 'REC-FIND-001',
          risk_id: uuidv4(),
          user_id: userId,
          severity: 'CRITICAL',
          status: 'OPEN',
          conflicting_roles: [role1Id, role2Id],
          conflicting_functions: [],
        },
      });

      const recommendations = await analyzer.generateRecommendations(testTenantId, findingId);

      expect(recommendations.length).toBeGreaterThan(0);

      // Should have REVOKE_ROLE recommendations
      const revokeRecs = recommendations.filter(r => r.type === 'REVOKE_ROLE');
      expect(revokeRecs.length).toBe(2); // One for each conflicting role

      // Should have COMPENSATING_CONTROL recommendation
      const controlRecs = recommendations.filter(r => r.type === 'COMPENSATING_CONTROL');
      expect(controlRecs.length).toBeGreaterThan(0);

      // Should have EXCEPTION recommendation
      const exceptionRecs = recommendations.filter(r => r.type === 'EXCEPTION');
      expect(exceptionRecs.length).toBeGreaterThan(0);

      console.log(`✓ ${recommendations.length} recommendations generated`);
    }, 10000);

    it('should include impact and effort assessment', async () => {
      const userId = uuidv4();
      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'IMPACT-USER',
          user_name: 'impact.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      const findingId = uuidv4();
      await prisma.sod_findings.create({
        data: {
          id: findingId,
          tenant_id: testTenantId,
          finding_code: 'IMPACT-001',
          risk_id: uuidv4(),
          user_id: userId,
          severity: 'HIGH',
          status: 'OPEN',
          conflicting_roles: [uuidv4()],
          conflicting_functions: [],
        },
      });

      const recommendations = await analyzer.generateRecommendations(testTenantId, findingId);

      recommendations.forEach(rec => {
        expect(rec.impact).toMatch(/^(HIGH|MEDIUM|LOW)$/);
        expect(rec.effort).toMatch(/^(HIGH|MEDIUM|LOW)$/);
        expect(rec.description).toBeDefined();
      });

      console.log(`✓ All recommendations include impact and effort assessments`);
    }, 10000);
  });

  describe('Role Membership Analysis', () => {
    it('should count users assigned to a role', async () => {
      const roleId = uuidv4();
      const userIds = Array.from({ length: 5 }, () => uuidv4());

      await prisma.access_graph_roles.create({
        data: {
          id: roleId,
          tenant_id: testTenantId,
          role_id: 'POPULAR_ROLE',
          role_name: 'Popular Role',
          source_system_id: testSystemId,
          role_type: 'SINGLE',
          is_technical: false,
          is_critical: false,
          source_data: {},
        },
      });

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

      await prisma.access_graph_assignments.createMany({
        data: userIds.map(userId => ({
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userId,
          role_id: roleId,
          assignment_type: 'DIRECT',
          assigned_at: new Date(),
        })),
      });

      const count = await accessGraphService.getRoleMembershipCount(testTenantId, roleId);

      expect(count).toBe(5);

      console.log(`✓ Role has ${count} members`);
    }, 10000);

    it('should return zero for unassigned role', async () => {
      const roleId = uuidv4();

      await prisma.access_graph_roles.create({
        data: {
          id: roleId,
          tenant_id: testTenantId,
          role_id: 'UNUSED_ROLE',
          role_name: 'Unused Role',
          source_system_id: testSystemId,
          role_type: 'SINGLE',
          is_technical: false,
          is_critical: false,
          source_data: {},
        },
      });

      const count = await accessGraphService.getRoleMembershipCount(testTenantId, roleId);

      expect(count).toBe(0);

      console.log(`✓ Unused role has 0 members`);
    }, 10000);
  });
});

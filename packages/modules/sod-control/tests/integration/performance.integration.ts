/**
 * Performance and Scalability Integration Tests
 *
 * Tests for performance with realistic data volumes
 * and scalability verification.
 */

import { SODAnalyzerEngine } from '../../src/engine/SODAnalyzerEngine';
import { AccessGraphService } from '../../src/services/AccessGraphService';
import { PrismaClient } from '@sap-framework/core';
import { v4 as uuidv4 } from 'uuid';

describe('Performance and Scalability Integration Tests', () => {
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
      // Cleanup
      await prisma.sod_findings.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.sod_rules.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.sod_risks.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_graph_assignments.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_graph_roles.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_graph_users.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_systems.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_graph_snapshots.deleteMany({ where: { tenant_id: testTenantId } });
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
        tenant_name: 'Performance Test Tenant',
        tenant_code: `PERF-${Date.now()}`,
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
        system_name: 'SAP Performance Test',
        system_type: 'S4HANA',
        system_id: 'PERF-S4H',
        connection_status: 'ACTIVE',
        sync_status: 'ACTIVE',
        capabilities: {},
      },
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle 100 users with reasonable performance', async () => {
      const userIds: string[] = [];

      // Create 100 users
      const users = Array.from({ length: 100 }, (_, idx) => {
        const id = uuidv4();
        userIds.push(id);
        return {
          id,
          tenant_id: testTenantId,
          user_id: `USER-${idx}`.padStart(10, '0'),
          user_name: `user${idx}`,
          email: `user${idx}@example.com`,
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        };
      });

      const startInsert = Date.now();
      await prisma.access_graph_users.createMany({ data: users });
      const insertDuration = Date.now() - startInsert;

      expect(insertDuration).toBeLessThan(5000); // Should complete in < 5 seconds

      // Query statistics
      const startQuery = Date.now();
      const stats = await accessGraphService.getAccessGraphStatistics(testTenantId);
      const queryDuration = Date.now() - startQuery;

      expect(stats.totalUsers).toBe(100);
      expect(queryDuration).toBeLessThan(1000); // Should complete in < 1 second

      console.log(`✓ 100 users: insert ${insertDuration}ms, query ${queryDuration}ms`);
    }, 30000);

    it('should handle 50 roles efficiently', async () => {
      // Create 50 roles
      const roles = Array.from({ length: 50 }, (_, idx) => ({
        id: uuidv4(),
        tenant_id: testTenantId,
        role_id: `ROLE-${idx}`.padStart(10, '0'),
        role_name: `Role ${idx}`,
        role_description: `Test role ${idx}`,
        source_system_id: testSystemId,
        role_type: 'SINGLE',
        is_technical: false,
        is_critical: idx % 5 === 0, // Every 5th role is critical
        source_data: {},
      }));

      const start = Date.now();
      await prisma.access_graph_roles.createMany({ data: roles });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000);

      const stats = await accessGraphService.getAccessGraphStatistics(testTenantId);
      expect(stats.totalRoles).toBe(50);
      expect(stats.criticalRoles).toBe(10); // 50 / 5 = 10

      console.log(`✓ 50 roles created in ${duration}ms`);
    }, 20000);

    it('should handle 500 role assignments efficiently', async () => {
      // Create 50 users and 20 roles
      const userIds = Array.from({ length: 50 }, () => uuidv4());
      const roleIds = Array.from({ length: 20 }, () => uuidv4());

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

      // Create 500 assignments (avg 10 roles per user)
      const assignments = [];
      for (let i = 0; i < 500; i++) {
        assignments.push({
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userIds[i % userIds.length],
          role_id: roleIds[i % roleIds.length],
          assignment_type: 'DIRECT' as const,
          assigned_at: new Date(),
        });
      }

      const start = Date.now();
      await prisma.access_graph_assignments.createMany({ data: assignments });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // < 10 seconds

      const stats = await accessGraphService.getAccessGraphStatistics(testTenantId);
      expect(stats.totalAssignments).toBe(500);
      expect(stats.avgRolesPerUser).toBeCloseTo(10.0, 0);

      console.log(`✓ 500 assignments created in ${duration}ms`);
    }, 30000);
  });

  describe('Snapshot Performance', () => {
    it('should create snapshot quickly for medium dataset', async () => {
      // Setup: 50 users, 25 roles, 100 assignments
      const userIds = Array.from({ length: 50 }, () => uuidv4());
      const roleIds = Array.from({ length: 25 }, () => uuidv4());

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

      const assignments = Array.from({ length: 100 }, (_, i) => ({
        id: uuidv4(),
        tenant_id: testTenantId,
        user_id: userIds[i % userIds.length],
        role_id: roleIds[i % roleIds.length],
        assignment_type: 'DIRECT' as const,
        assigned_at: new Date(),
      }));

      await prisma.access_graph_assignments.createMany({ data: assignments });

      // Create snapshot
      const start = Date.now();
      const snapshot = await accessGraphService.createSnapshot(
        testTenantId,
        'ON_DEMAND',
        'performance-test'
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // < 5 seconds
      expect(snapshot.totalUsers).toBe(50);
      expect(snapshot.totalRoles).toBe(25);
      expect(snapshot.totalAssignments).toBe(100);

      console.log(`✓ Snapshot created in ${duration}ms (50 users, 25 roles, 100 assignments)`);
    }, 20000);

    it('should handle multiple consecutive snapshots', async () => {
      // Create minimal data
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

      // Create 5 snapshots in sequence
      const snapshotIds: string[] = [];
      const start = Date.now();

      for (let i = 0; i < 5; i++) {
        const snapshot = await accessGraphService.createSnapshot(
          testTenantId,
          'SCHEDULED',
          'batch-test'
        );
        snapshotIds.push(snapshot.id);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000); // < 10 seconds for 5 snapshots

      // Verify all snapshots exist
      const snapshots = await prisma.access_graph_snapshots.findMany({
        where: { tenant_id: testTenantId },
      });
      expect(snapshots.length).toBe(5);

      console.log(`✓ 5 consecutive snapshots created in ${duration}ms`);
    }, 30000);
  });

  describe('Query Performance', () => {
    it('should query user access summary quickly', async () => {
      // Create user with 10 roles
      const userId = uuidv4();
      const roleIds = Array.from({ length: 10 }, () => uuidv4());

      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'QUERY-TEST-USER',
          user_name: 'query.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

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

      await prisma.access_graph_assignments.createMany({
        data: roleIds.map(roleId => ({
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userId,
          role_id: roleId,
          assignment_type: 'DIRECT',
          assigned_at: new Date(),
        })),
      });

      // Query user access summary
      const start = Date.now();
      const summary = await accessGraphService.getUserAccessSummary(testTenantId, userId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500); // < 500ms
      expect(summary.totalRolesCount).toBe(10);

      console.log(`✓ User access summary queried in ${duration}ms`);
    }, 10000);

    it('should calculate statistics efficiently', async () => {
      // Create realistic dataset: 30 users, 15 roles, 60 assignments
      const userIds = Array.from({ length: 30 }, () => uuidv4());
      const roleIds = Array.from({ length: 15 }, () => uuidv4());

      await prisma.access_graph_users.createMany({
        data: userIds.map((id, idx) => ({
          id,
          tenant_id: testTenantId,
          user_id: `USER-${idx}`,
          user_name: `user${idx}`,
          source_system_id: testSystemId,
          is_active: idx < 25, // 25 active, 5 inactive
          is_locked: false,
          source_data: {},
        })),
      });

      await prisma.access_graph_roles.createMany({
        data: roleIds.map((id, idx) => ({
          id,
          tenant_id: testTenantId,
          role_id: `ROLE-${idx}`,
          role_name: `Role ${idx}`,
          source_system_id: testSystemId,
          role_type: 'SINGLE',
          is_technical: false,
          is_critical: idx < 3, // 3 critical roles
          source_data: {},
        })),
      });

      await prisma.access_graph_assignments.createMany({
        data: Array.from({ length: 60 }, (_, i) => ({
          id: uuidv4(),
          tenant_id: testTenantId,
          user_id: userIds[i % userIds.length],
          role_id: roleIds[i % roleIds.length],
          assignment_type: 'DIRECT',
          assigned_at: new Date(),
        })),
      });

      const start = Date.now();
      const stats = await accessGraphService.getAccessGraphStatistics(testTenantId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // < 1 second
      expect(stats.totalUsers).toBe(30);
      expect(stats.totalRoles).toBe(15);
      expect(stats.totalAssignments).toBe(60);
      expect(stats.criticalRoles).toBe(3);
      expect(stats.inactiveUsers).toBe(5);

      console.log(`✓ Statistics calculated in ${duration}ms`);
    }, 15000);
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent snapshot creation', async () => {
      // Create minimal data
      const userId = uuidv4();
      await prisma.access_graph_users.create({
        data: {
          id: userId,
          tenant_id: testTenantId,
          user_id: 'CONCURRENT-USER',
          user_name: 'concurrent.user',
          source_system_id: testSystemId,
          is_active: true,
          is_locked: false,
          source_data: {},
        },
      });

      // Create 3 snapshots concurrently
      const start = Date.now();
      const snapshotPromises = Array.from({ length: 3 }, () =>
        accessGraphService.createSnapshot(testTenantId, 'ON_DEMAND', 'concurrent-test')
      );

      const snapshots = await Promise.all(snapshotPromises);
      const duration = Date.now() - start;

      expect(snapshots.length).toBe(3);
      expect(duration).toBeLessThan(5000); // Should be faster than sequential

      console.log(`✓ 3 concurrent snapshots created in ${duration}ms`);
    }, 15000);

    it('should handle concurrent user access queries', async () => {
      // Create 10 users
      const userIds = Array.from({ length: 10 }, () => uuidv4());

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

      // Query all users concurrently
      const start = Date.now();
      const summaryPromises = userIds.map(userId =>
        accessGraphService.getUserAccessSummary(testTenantId, userId)
      );

      const summaries = await Promise.all(summaryPromises);
      const duration = Date.now() - start;

      expect(summaries.length).toBe(10);
      expect(duration).toBeLessThan(3000); // < 3 seconds

      console.log(`✓ 10 concurrent user queries completed in ${duration}ms`);
    }, 15000);
  });
});

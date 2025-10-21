/**
 * Exception Management Integration Tests
 *
 * Tests for SoD exception approval/rejection workflows
 * and mitigation tracking.
 */

import { SODAnalyzerEngine } from '../../src/engine/SODAnalyzerEngine';
import { PrismaClient } from '@sap-framework/core';
import { v4 as uuidv4 } from 'uuid';

describe('Exception Management Integration Tests', () => {
  let prisma: PrismaClient;
  let analyzer: SODAnalyzerEngine;
  let testTenantId: string;
  let testFindingId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sapframework',
        },
      },
    });

    await prisma.$connect();

    // Create Knex-compatible wrapper
    const db = (table: string) => {
      return prisma[table as keyof PrismaClient] as any;
    };

    analyzer = new SODAnalyzerEngine({ database: db });
  });

  afterAll(async () => {
    if (testTenantId) {
      await prisma.sod_mitigations.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.sod_findings.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.access_graph_users.deleteMany({ where: { tenant_id: testTenantId } });
      await prisma.tenant_profiles.deleteMany({ where: { id: testTenantId } });
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    testTenantId = uuidv4();

    await prisma.tenant_profiles.create({
      data: {
        id: testTenantId,
        tenant_name: 'Test Tenant - Exception Management',
        tenant_code: `TEST-EXC-${Date.now()}`,
        status: 'ACTIVE',
        subscription_tier: 'ENTERPRISE',
        available_services: {},
        module_config: {},
      },
    });

    // Create test user
    const userId = uuidv4();
    await prisma.access_graph_users.create({
      data: {
        id: userId,
        tenant_id: testTenantId,
        user_id: 'TEST-USER-001',
        user_name: 'test.user',
        source_system_id: uuidv4(),
        is_active: true,
        is_locked: false,
        source_data: {},
      },
    });

    // Create test finding
    testFindingId = uuidv4();
    await prisma.sod_findings.create({
      data: {
        id: testFindingId,
        tenant_id: testTenantId,
        finding_code: `FIND-${Date.now()}`,
        risk_id: uuidv4(),
        user_id: userId,
        severity: 'HIGH',
        status: 'OPEN',
        conflicting_roles: [uuidv4(), uuidv4()],
        conflicting_functions: [],
      },
    });
  });

  describe('Exception Approval Workflow', () => {
    it('should approve exception and create mitigation record', async () => {
      const approver = 'john.approver@example.com';
      const justification = 'Business requirement: CFO needs both roles for month-end close';

      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        approver,
        justification
      );

      // Verify finding status updated
      const finding = await prisma.sod_findings.findUnique({
        where: { id: testFindingId },
      });

      expect(finding).toBeDefined();
      expect(finding?.status).toBe('EXCEPTION_GRANTED');
      expect(finding?.resolution_type).toBe('EXCEPTION');
      expect(finding?.resolution_notes).toBe(justification);
      expect(finding?.resolved_by).toBe(approver);
      expect(finding?.resolved_at).toBeDefined();

      // Verify mitigation record created
      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });

      expect(mitigation).toBeDefined();
      expect(mitigation?.mitigation_type).toBe('EXCEPTION');
      expect(mitigation?.exception_justification).toBe(justification);
      expect(mitigation?.approved_by).toBe(approver);
      expect(mitigation?.status).toBe('ACTIVE');

      console.log(`✓ Exception approved and mitigation created`);
    }, 10000);

    it('should support multiple approvals for same finding', async () => {
      // First approval
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        'approver1@example.com',
        'First level approval'
      );

      // Create new finding for second test
      const finding2Id = uuidv4();
      const userId = (await prisma.access_graph_users.findFirst({
        where: { tenant_id: testTenantId },
      }))?.id;

      await prisma.sod_findings.create({
        data: {
          id: finding2Id,
          tenant_id: testTenantId,
          finding_code: `FIND-2-${Date.now()}`,
          risk_id: uuidv4(),
          user_id: userId!,
          severity: 'CRITICAL',
          status: 'OPEN',
          conflicting_roles: [uuidv4()],
          conflicting_functions: [],
        },
      });

      // Second approval
      await analyzer.processException(
        testTenantId,
        finding2Id,
        'APPROVE',
        'approver2@example.com',
        'Second level approval'
      );

      // Verify both mitigations exist
      const mitigations = await prisma.sod_mitigations.findMany({
        where: {
          tenant_id: testTenantId,
          status: 'ACTIVE',
        },
      });

      expect(mitigations.length).toBe(2);

      console.log(`✓ Multiple exceptions approved independently`);
    }, 10000);

    it('should include approval timestamp and metadata', async () => {
      const beforeApproval = new Date();

      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        'approver@example.com',
        'Approved with conditions'
      );

      const afterApproval = new Date();

      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });

      expect(mitigation?.approved_at).toBeDefined();
      expect(mitigation?.approved_at!.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime());
      expect(mitigation?.approved_at!.getTime()).toBeLessThanOrEqual(afterApproval.getTime());
      expect(mitigation?.created_by).toBe('approver@example.com');

      console.log(`✓ Approval metadata captured correctly`);
    }, 10000);
  });

  describe('Exception Rejection Workflow', () => {
    it('should reject exception and update finding status', async () => {
      const rejector = 'jane.rejector@example.com';
      const rejectionReason = 'Insufficient business justification';

      await analyzer.processException(
        testTenantId,
        testFindingId,
        'REJECT',
        rejector,
        rejectionReason
      );

      // Verify finding status
      const finding = await prisma.sod_findings.findUnique({
        where: { id: testFindingId },
      });

      expect(finding?.status).toBe('OPEN');
      expect(finding?.resolution_notes).toContain('rejected');
      expect(finding?.resolution_notes).toContain(rejectionReason);

      // Verify no mitigation record created
      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });

      expect(mitigation).toBeNull();

      console.log(`✓ Exception rejected without creating mitigation`);
    }, 10000);

    it('should allow re-approval after rejection', async () => {
      // First, reject
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'REJECT',
        'approver1@example.com',
        'Initial rejection'
      );

      let finding = await prisma.sod_findings.findUnique({
        where: { id: testFindingId },
      });
      expect(finding?.status).toBe('OPEN');

      // Then, approve with better justification
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        'approver2@example.com',
        'Re-approved with additional documentation'
      );

      finding = await prisma.sod_findings.findUnique({
        where: { id: testFindingId },
      });
      expect(finding?.status).toBe('EXCEPTION_GRANTED');

      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });
      expect(mitigation).toBeDefined();

      console.log(`✓ Exception re-approved after initial rejection`);
    }, 10000);
  });

  describe('Mitigation Evidence Tracking', () => {
    it('should support evidence attachment to mitigations', async () => {
      // Approve exception
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        'approver@example.com',
        'Approved with compensating controls'
      );

      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });

      // Add evidence
      await prisma.sod_mitigation_evidence.create({
        data: {
          id: uuidv4(),
          tenant_id: testTenantId,
          mitigation_id: mitigation!.id,
          evidence_type: 'DOCUMENT',
          evidence_reference: 'approval-form-2024-001.pdf',
          evidence_description: 'Signed approval form from CFO',
          uploaded_by: 'approver@example.com',
          uploaded_at: new Date(),
        },
      });

      // Verify evidence
      const evidence = await prisma.sod_mitigation_evidence.findMany({
        where: { mitigation_id: mitigation!.id },
      });

      expect(evidence).toHaveLength(1);
      expect(evidence[0].evidence_type).toBe('DOCUMENT');

      console.log(`✓ Evidence attached to mitigation`);
    }, 10000);

    it('should support multiple evidence attachments', async () => {
      // Approve exception
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        'approver@example.com',
        'Approved'
      );

      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });

      // Add multiple evidence items
      await prisma.sod_mitigation_evidence.createMany({
        data: [
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            mitigation_id: mitigation!.id,
            evidence_type: 'DOCUMENT',
            evidence_reference: 'doc1.pdf',
            uploaded_by: 'user1@example.com',
            uploaded_at: new Date(),
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            mitigation_id: mitigation!.id,
            evidence_type: 'LINK',
            evidence_reference: 'https://sharepoint.com/evidence',
            uploaded_by: 'user2@example.com',
            uploaded_at: new Date(),
          },
          {
            id: uuidv4(),
            tenant_id: testTenantId,
            mitigation_id: mitigation!.id,
            evidence_type: 'NOTE',
            evidence_description: 'Verbal approval from CEO during board meeting',
            uploaded_by: 'user3@example.com',
            uploaded_at: new Date(),
          },
        ],
      });

      const evidenceList = await prisma.sod_mitigation_evidence.findMany({
        where: { mitigation_id: mitigation!.id },
      });

      expect(evidenceList).toHaveLength(3);
      expect(evidenceList.map(e => e.evidence_type)).toContain('DOCUMENT');
      expect(evidenceList.map(e => e.evidence_type)).toContain('LINK');
      expect(evidenceList.map(e => e.evidence_type)).toContain('NOTE');

      console.log(`✓ Multiple evidence types attached`);
    }, 10000);
  });

  describe('Exception Expiration and Review', () => {
    it('should support time-limited exceptions', async () => {
      // Approve exception
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        'approver@example.com',
        'Temporary exception for Q1 close'
      );

      // Set expiration date
      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });

      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 3); // 3 months from now

      await prisma.sod_mitigations.update({
        where: { id: mitigation!.id },
        data: {
          valid_until: expirationDate,
          review_required_at: expirationDate,
        },
      });

      // Verify expiration set
      const updatedMitigation = await prisma.sod_mitigations.findUnique({
        where: { id: mitigation!.id },
      });

      expect(updatedMitigation?.valid_until).toBeDefined();
      expect(updatedMitigation?.review_required_at).toBeDefined();

      console.log(`✓ Time-limited exception configured`);
    }, 10000);

    it('should identify expired exceptions', async () => {
      // Create expired exception
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        'approver@example.com',
        'Expired exception'
      );

      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });

      // Set expiration to past date
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1); // 1 month ago

      await prisma.sod_mitigations.update({
        where: { id: mitigation!.id },
        data: {
          valid_until: pastDate,
          status: 'EXPIRED',
        },
      });

      // Query expired exceptions
      const expiredMitigations = await prisma.sod_mitigations.findMany({
        where: {
          tenant_id: testTenantId,
          status: 'EXPIRED',
          valid_until: { lt: new Date() },
        },
      });

      expect(expiredMitigations).toHaveLength(1);

      console.log(`✓ Expired exceptions identified`);
    }, 10000);
  });

  describe('Audit Trail', () => {
    it('should maintain complete audit trail of exception lifecycle', async () => {
      // Reject first
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'REJECT',
        'approver1@example.com',
        'Initial rejection'
      );

      const afterRejection = await prisma.sod_findings.findUnique({
        where: { id: testFindingId },
      });

      // Then approve
      await analyzer.processException(
        testTenantId,
        testFindingId,
        'APPROVE',
        'approver2@example.com',
        'Approved after clarification'
      );

      const afterApproval = await prisma.sod_findings.findUnique({
        where: { id: testFindingId },
      });

      // Verify audit trail
      expect(afterRejection?.resolution_notes).toContain('rejected');
      expect(afterApproval?.resolution_notes).toBe('Approved after clarification');
      expect(afterApproval?.resolved_by).toBe('approver2@example.com');

      const mitigation = await prisma.sod_mitigations.findFirst({
        where: { finding_id: testFindingId },
      });

      expect(mitigation?.created_by).toBe('approver2@example.com');
      expect(mitigation?.approved_by).toBe('approver2@example.com');

      console.log(`✓ Complete audit trail maintained`);
    }, 10000);
  });
});

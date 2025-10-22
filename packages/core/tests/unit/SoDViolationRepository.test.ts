import { SoDViolationRepository } from '../../src/persistence/SoDViolationRepository';
import { Pool } from 'pg';

// Mock pg module
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => {
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockEnd,
    })),
  };
});

describe('SoDViolationRepository', () => {
  let repository: SoDViolationRepository;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create repository with test connection
    repository = new SoDViolationRepository('postgresql://test');
  });

  describe('createAnalysisRun', () => {
    it('should create new analysis run', async () => {
      const mockResult = {
        rows: [{
          id: 'analysis-123',
          tenant_id: 'tenant-1',
          status: 'RUNNING',
          total_users_analyzed: 100,
          violations_found: 0,
          high_risk_count: 0,
          medium_risk_count: 0,
          low_risk_count: 0,
          started_at: new Date(),
          config: null,
          created_at: new Date(),
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.createAnalysisRun('tenant-1', 100, { ruleSet: 'standard' });

      expect(result.id).toBe('analysis-123');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.status).toBe('RUNNING');
      expect(result.totalUsersAnalyzed).toBe(100);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sod_analysis_runs'),
        expect.arrayContaining(['tenant-1', 100])
      );
    });
  });

  describe('completeAnalysisRun', () => {
    it('should update analysis run with results', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.completeAnalysisRun('analysis-123', {
        total: 15,
        high: 5,
        medium: 7,
        low: 3,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sod_analysis_runs'),
        [15, 5, 7, 3, 'analysis-123']
      );
    });
  });

  describe('failAnalysisRun', () => {
    it('should mark analysis as failed', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.failAnalysisRun('analysis-123', 'Connection timeout');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET status = \'FAILED\''),
        ['Connection timeout', 'analysis-123']
      );
    });
  });

  describe('storeViolations', () => {
    it('should store multiple violations in transaction', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };

      mockConnect.mockResolvedValue(mockClient);

      const violations = [
        {
          tenantId: 'tenant-1',
          analysisId: 'analysis-123',
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          conflictType: 'CREATE_AND_APPROVE_PO',
          riskLevel: 'HIGH' as const,
          conflictingRoles: ['Buyer', 'Approver'],
          status: 'OPEN' as const,
          detectedAt: new Date(),
        },
        {
          tenantId: 'tenant-1',
          analysisId: 'analysis-123',
          userId: 'user-2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          conflictType: 'POST_AND_REVERSE_GL',
          riskLevel: 'MEDIUM' as const,
          conflictingRoles: ['Accountant', 'GL Admin'],
          status: 'OPEN' as const,
          detectedAt: new Date(),
        },
      ];

      await repository.storeViolations(violations);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sod_violations'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')), // INSERT fails
        release: jest.fn(),
      };

      mockConnect.mockResolvedValue(mockClient);

      const violations = [{
        tenantId: 'tenant-1',
        analysisId: 'analysis-123',
        userId: 'user-1',
        conflictType: 'TEST',
        riskLevel: 'HIGH' as const,
        conflictingRoles: ['Role1'],
        status: 'OPEN' as const,
        detectedAt: new Date(),
      }];

      await expect(repository.storeViolations(violations)).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty violations array', async () => {
      await repository.storeViolations([]);
      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe('getViolations', () => {
    it('should return violations with pagination', async () => {
      const mockViolations = [
        {
          id: 'viol-1',
          tenant_id: 'tenant-1',
          analysis_id: 'analysis-123',
          user_id: 'user-1',
          user_name: 'John Doe',
          conflict_type: 'CREATE_AND_APPROVE_PO',
          risk_level: 'HIGH',
          conflicting_roles: ['Buyer', 'Approver'],
          status: 'OPEN',
          detected_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // count query
        .mockResolvedValueOnce({ rows: mockViolations }); // data query

      const result = await repository.getViolations('tenant-1', {}, { page: 1, pageSize: 50 });

      expect(result.total).toBe(10);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].id).toBe('viol-1');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should apply filters correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await repository.getViolations(
        'tenant-1',
        {
          status: ['OPEN', 'ACKNOWLEDGED'],
          riskLevel: ['HIGH'],
          userId: 'user-1',
        },
        { page: 1, pageSize: 10 }
      );

      const calls = mockQuery.mock.calls;
      const countQuery = calls[0][0];
      const dataQuery = calls[1][0];

      expect(countQuery).toContain('status = ANY($2)');
      expect(countQuery).toContain('risk_level = ANY($3)');
      expect(countQuery).toContain('user_id = $4');
      expect(dataQuery).toContain('ORDER BY detected_at DESC');
    });
  });

  describe('getViolation', () => {
    it('should return single violation', async () => {
      const mockViolation = {
        id: 'viol-1',
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        conflict_type: 'TEST',
        risk_level: 'HIGH',
        conflicting_roles: ['Role1'],
        status: 'OPEN',
        detected_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockViolation] });

      const result = await repository.getViolation('tenant-1', 'viol-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('viol-1');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
        ['viol-1', 'tenant-1']
      );
    });

    it('should return null for non-existent violation', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getViolation('tenant-1', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateViolationStatus', () => {
    it('should update status and acknowledgement', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.updateViolationStatus('viol-1', {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: 'admin@example.com',
        remediationNotes: 'Business exception approved',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.arrayContaining(['ACKNOWLEDGED', 'admin@example.com', 'Business exception approved', 'viol-1'])
      );
    });

    it('should update status and resolution', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      await repository.updateViolationStatus('viol-1', {
        status: 'REMEDIATED',
        resolvedBy: 'admin@example.com',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('resolved_by'),
        expect.arrayContaining(['REMEDIATED', 'admin@example.com', 'viol-1'])
      );
    });
  });

  describe('getLatestAnalysis', () => {
    it('should return most recent analysis', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        tenant_id: 'tenant-1',
        status: 'COMPLETED',
        violations_found: 15,
        started_at: new Date(),
        completed_at: new Date(),
        created_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockAnalysis] });

      const result = await repository.getLatestAnalysis('tenant-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('analysis-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY started_at DESC'),
        ['tenant-1']
      );
    });

    it('should return null when no analysis exists', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getLatestAnalysis('tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('getViolationStats', () => {
    it('should return statistics grouped by status and risk', async () => {
      const mockStats = [
        { count: '5', status: 'OPEN', risk_level: 'HIGH' },
        { count: '3', status: 'OPEN', risk_level: 'MEDIUM' },
        { count: '2', status: 'ACKNOWLEDGED', risk_level: 'LOW' },
      ];

      mockQuery.mockResolvedValue({ rows: mockStats });

      const result = await repository.getViolationStats('tenant-1');

      expect(result.total).toBe(10);
      expect(result.byStatus.OPEN).toBe(8);
      expect(result.byStatus.ACKNOWLEDGED).toBe(2);
      expect(result.byRiskLevel.HIGH).toBe(5);
      expect(result.byRiskLevel.MEDIUM).toBe(3);
      expect(result.byRiskLevel.LOW).toBe(2);
    });
  });

  describe('deleteOldViolations', () => {
    it('should delete violations older than specified days', async () => {
      mockQuery.mockResolvedValue({ rowCount: 15 });

      const deleted = await repository.deleteOldViolations('tenant-1', 90);

      expect(deleted).toBe(15);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sod_violations'),
        ['tenant-1']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('90 days'),
        expect.any(Array)
      );
    });
  });
});

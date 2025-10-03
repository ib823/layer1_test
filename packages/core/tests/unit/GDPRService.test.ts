import { GDPRService } from '../../src/services/GDPRService';
import { Pool } from 'pg';

jest.mock('pg');

describe('GDPRService', () => {
  let gdprService: GDPRService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      end: jest.fn(),
    } as any;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    gdprService = new GDPRService('postgresql://localhost/test');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    it('should create a GDPR data subject request', async () => {
      // Arrange
      const mockRequest = {
        id: '123',
        tenant_id: 'tenant-123',
        request_type: 'FORGET',
        subject_type: 'USER',
        subject_id: 'user-456',
        subject_email: 'user@example.com',
        status: 'PENDING',
        verification_token: 'token-123',
        verification_expires_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockRequest],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await gdprService.createRequest({
        tenantId: 'tenant-123',
        requestType: 'FORGET',
        subjectType: 'USER',
        subjectId: 'user-456',
        subjectEmail: 'user@example.com',
      });

      // Assert
      expect(result.id).toBe('123');
      expect(result.requestType).toBe('FORGET');
      expect(result.status).toBe('PENDING');
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should generate verification token', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ verification_token: 'generated-token' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      await gdprService.createRequest({
        tenantId: 'tenant-123',
        requestType: 'ACCESS',
        subjectType: 'USER',
        subjectId: 'user-456',
      });

      // Assert
      const callArgs = mockPool.query.mock.calls[0];
      expect(callArgs[1]).toContain('tenant-123');
    });
  });

  describe('verifyRequest', () => {
    it('should verify request with valid token', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await gdprService.verifyRequest('request-123', 'valid-token');

      // Assert
      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE gdpr_data_requests'),
        ['request-123', 'valid-token']
      );
    });

    it('should reject invalid or expired token', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await gdprService.verifyRequest('request-123', 'invalid-token');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getRequest', () => {
    it('should retrieve request by ID', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-123',
        tenant_id: 'tenant-123',
        request_type: 'FORGET',
        subject_id: 'user-456',
        status: 'PENDING',
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockRequest],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await gdprService.getRequest('request-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('request-123');
    });

    it('should return null for non-existent request', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await gdprService.getRequest('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('listRequests', () => {
    it('should list requests with pagination', async () => {
      // Arrange
      const mockRequests = [
        { id: '1', status: 'PENDING' },
        { id: '2', status: 'COMPLETED' },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // count
          rows: [{ count: '10' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // data
          rows: mockRequests,
          command: 'SELECT',
          rowCount: 2,
          oid: 0,
          fields: [],
        });

      // Act
      const result = await gdprService.listRequests('tenant-123', {
        page: 1,
        pageSize: 50,
      });

      // Assert
      expect(result.total).toBe(10);
      expect(result.requests).toHaveLength(2);
    });

    it('should filter by status', async () => {
      // Arrange
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ count: '5' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        });

      // Act
      await gdprService.listRequests('tenant-123', { status: 'COMPLETED' });

      // Assert
      const callArgs = mockPool.query.mock.calls[0];
      expect(callArgs[0]).toContain('status');
    });
  });
});

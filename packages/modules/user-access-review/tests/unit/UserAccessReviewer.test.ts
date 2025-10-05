import { UserAccessReviewer } from '../../src/UserAccessReviewer';

const mockConnector = {
  getUsers: jest.fn(),
  getUserGroupMemberships: jest.fn(),
  initialize: jest.fn(),
};

describe('UserAccessReviewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect SoD violations', async () => {
    mockConnector.getUsers.mockResolvedValue([
      {
        id: 'user1',
        userName: 'john',
        active: true,
        groups: [
          { displayName: 'VENDOR_CREATE' },
          { displayName: 'PAYMENT_EXECUTE' }
        ]
      }
    ]);

    const reviewer = new UserAccessReviewer(mockConnector as any);
    const result = await reviewer.analyze();

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].conflictingRoles).toContain('VENDOR_CREATE');
    expect(result.violations[0].conflictingRoles).toContain('PAYMENT_EXECUTE');
  });

  it('should calculate risk scores', async () => {
    mockConnector.getUsers.mockResolvedValue([
      {
        id: 'user1',
        userName: 'john',
        active: true,
        groups: [
          { displayName: 'GL_JOURNAL_CREATE' },
          { displayName: 'GL_JOURNAL_APPROVE' }
        ]
      }
    ]);

    const reviewer = new UserAccessReviewer(mockConnector as any);
    const result = await reviewer.analyze();

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].riskLevel).toBe('CRITICAL');
    expect(result.violations[0].riskScore).toBeGreaterThanOrEqual(90);
  });

  it('should not report violations for users with no conflicting roles', async () => {
    mockConnector.getUsers.mockResolvedValue([
      {
        id: 'user1',
        userName: 'john',
        active: true,
        groups: [
          { displayName: 'VENDOR_CREATE' }
        ]
      }
    ]);

    const reviewer = new UserAccessReviewer(mockConnector as any);
    const result = await reviewer.analyze();

    expect(result.violations.length).toBe(0);
  });

  it('should handle users with no roles', async () => {
    mockConnector.getUsers.mockResolvedValue([
      {
        id: 'user1',
        userName: 'john',
        active: true,
        groups: []
      }
    ]);

    const reviewer = new UserAccessReviewer(mockConnector as any);
    const result = await reviewer.analyze();

    expect(result.violations.length).toBe(0);
    expect(result.summary.totalUsers).toBe(1);
  });

  it('should skip inactive users', async () => {
    mockConnector.getUsers.mockResolvedValue([
      {
        id: 'user1',
        userName: 'john',
        active: false,
        groups: []
      }
    ]);

    const reviewer = new UserAccessReviewer(mockConnector as any);
    const result = await reviewer.analyze();

    expect(result.summary.totalUsers).toBe(0);
  });
});

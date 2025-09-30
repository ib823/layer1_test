import { S4HANAConnector } from '../../src/connectors/s4hana';
import { IPSConnector } from '../../src/connectors/ips';

describe('S/4HANA + IPS Integration', () => {
  // These tests require actual SAP systems - mark as skipped by default
  describe.skip('S/4HANA Connector', () => {
    let connector: S4HANAConnector;

    beforeAll(() => {
      connector = new S4HANAConnector({
        baseUrl: process.env.S4_BASE_URL!,
        auth: {
          type: 'OAUTH',
          credentials: {
            clientId: process.env.S4_CLIENT_ID,
            clientSecret: process.env.S4_CLIENT_SECRET,
          },
        },
        odata: {
          version: 'v2',
        },
      });
    });

    it('should fetch user roles', async () => {
      const roles = await connector.getUserRoles({
        activeOnly: true,
      });

      expect(Array.isArray(roles)).toBe(true);
    });
  });

  describe.skip('IPS Connector', () => {
    let connector: IPSConnector;

    beforeAll(() => {
      connector = new IPSConnector({
        baseUrl: process.env.IPS_BASE_URL!,
        auth: {
          type: 'OAUTH',
          credentials: {
            clientId: process.env.IPS_CLIENT_ID,
            clientSecret: process.env.IPS_CLIENT_SECRET,
          },
        },
        scim: {
          version: '2.0',
        },
      });
    });

    it('should fetch users', async () => {
      const users = await connector.getUsers();

      expect(Array.isArray(users)).toBe(true);
    });
  });
});
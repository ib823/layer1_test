import { DeviceFingerprint, DeviceInfo } from '../../../src/auth/session/DeviceFingerprint';

// Mock geoip-lite
jest.mock('geoip-lite', () => ({
  lookup: jest.fn((ip: string) => {
    if (ip === '8.8.8.8') {
      return { country: 'US', city: 'Mountain View', ll: [37.386, -122.0838] };
    }
    return null;
  }),
}));

describe('DeviceFingerprint', () => {
  describe('parseUserAgent', () => {
    it('should parse Chrome on Windows correctly', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const result = DeviceFingerprint.parseUserAgent(userAgent);

      expect(result.browser.name).toBe('Chrome');
      expect(result.browser.version).toContain('120');
      expect(result.os.name).toBe('Windows');
      expect(result.os.version).toBe('10');
      expect(result.device.type).toBeUndefined(); // Desktop has no device.type
    });

    it('should parse Safari on iPhone correctly', () => {
      const userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

      const result = DeviceFingerprint.parseUserAgent(userAgent);

      expect(result.browser.name).toContain('Safari');
      expect(result.os.name).toBe('iOS');
      expect(result.device.type).toBe('mobile');
    });

    it('should parse Firefox on Linux correctly', () => {
      const userAgent =
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';

      const result = DeviceFingerprint.parseUserAgent(userAgent);

      expect(result.browser.name).toBe('Firefox');
      expect(result.browser.version).toContain('121');
      expect(result.os.name).toBe('Linux');
      expect(result.device.type).toBeUndefined(); // Desktop
    });

    it('should parse Edge on Windows correctly', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

      const result = DeviceFingerprint.parseUserAgent(userAgent);

      expect(result.browser.name).toBe('Edge');
      expect(result.browser.version).toContain('120');
      expect(result.os.name).toBe('Windows');
      expect(result.os.version).toBe('10');
    });

    it('should parse Chrome on Android correctly', () => {
      const userAgent =
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

      const result = DeviceFingerprint.parseUserAgent(userAgent);

      expect(result.browser.name).toContain('Chrome'); // Mobile Chrome or Chrome
      expect(result.os.name).toBe('Android');
      expect(result.device.type).toBe('mobile');
    });

    it('should handle empty user agent', () => {
      const result = DeviceFingerprint.parseUserAgent('');

      expect(result.browser).toBeDefined();
      expect(result.os).toBeDefined();
      expect(result.device).toBeDefined();
    });
  });

  describe('generateFingerprint', () => {
    it('should generate consistent fingerprint for same inputs', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0';
      const ipAddress = '192.168.1.100';
      const parsed = DeviceFingerprint.parseUserAgent(userAgent);

      const fingerprint1 = DeviceFingerprint.generateFingerprint(userAgent, ipAddress, parsed);
      const fingerprint2 = DeviceFingerprint.generateFingerprint(userAgent, ipAddress, parsed);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(32); // Truncated to 32 chars
    });

    it('should generate different fingerprints for different user agents', () => {
      const ipAddress = '192.168.1.100';
      const userAgent1 = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0';
      const userAgent2 = 'Mozilla/5.0 (Macintosh) Safari/605.1.15';
      const parsed1 = DeviceFingerprint.parseUserAgent(userAgent1);
      const parsed2 = DeviceFingerprint.parseUserAgent(userAgent2);

      const fingerprint1 = DeviceFingerprint.generateFingerprint(userAgent1, ipAddress, parsed1);
      const fingerprint2 = DeviceFingerprint.generateFingerprint(userAgent2, ipAddress, parsed2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should generate different fingerprints for different IP subnets', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0';
      const parsed = DeviceFingerprint.parseUserAgent(userAgent);
      const ip1 = '192.168.1.100';
      const ip2 = '10.0.0.100'; // Different subnet

      const fingerprint1 = DeviceFingerprint.generateFingerprint(userAgent, ip1, parsed);
      const fingerprint2 = DeviceFingerprint.generateFingerprint(userAgent, ip2, parsed);

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should generate SHA-256 hash truncated to 32 characters', () => {
      const userAgent = 'Mozilla/5.0 Chrome/120.0.0.0';
      const ipAddress = '192.168.1.100';
      const parsed = DeviceFingerprint.parseUserAgent(userAgent);

      const fingerprint = DeviceFingerprint.generateFingerprint(userAgent, ipAddress, parsed);

      expect(fingerprint).toHaveLength(32);
      expect(fingerprint).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should handle IPv6 addresses', () => {
      const userAgent = 'Mozilla/5.0 Chrome/120.0.0.0';
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const parsed = DeviceFingerprint.parseUserAgent(userAgent);

      const fingerprint = DeviceFingerprint.generateFingerprint(userAgent, ipv6, parsed);

      expect(fingerprint).toHaveLength(32);
      expect(fingerprint).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('generateDeviceInfo', () => {
    it('should return complete device info for Chrome on Windows', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
      const ipAddress = '192.168.1.100';

      const deviceInfo = DeviceFingerprint.generateDeviceInfo(userAgent, ipAddress);

      expect(deviceInfo.browser).toContain('Chrome');
      expect(deviceInfo.os).toContain('Windows');
      expect(deviceInfo.deviceType).toBe('desktop');
      expect(deviceInfo.fingerprint).toHaveLength(32);
      expect(deviceInfo.userAgent).toBe(userAgent);
      expect(deviceInfo.deviceName).toBeDefined();
    });

    it('should return complete device info for Safari on iPhone', () => {
      const userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Version/17.1 Mobile Safari/604.1';
      const ipAddress = '10.0.0.1';

      const deviceInfo = DeviceFingerprint.generateDeviceInfo(userAgent, ipAddress);

      expect(deviceInfo.browser).toContain('Safari');
      expect(deviceInfo.os).toContain('iOS');
      expect(deviceInfo.deviceType).toBe('mobile');
      expect(deviceInfo.fingerprint).toHaveLength(32);
    });

    it('should create human-readable device name', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.1 Safari/605.1.15';
      const ipAddress = '172.16.0.1';

      const deviceInfo = DeviceFingerprint.generateDeviceInfo(userAgent, ipAddress);

      expect(deviceInfo.deviceName).toBeDefined();
      expect(deviceInfo.deviceName.length).toBeGreaterThan(0);
    });

    it('should handle tablet device type correctly', () => {
      const userAgent =
        'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Version/17.1 Safari/604.1';
      const ipAddress = '10.0.0.5';

      const deviceInfo = DeviceFingerprint.generateDeviceInfo(userAgent, ipAddress);

      expect(deviceInfo.deviceType).toBe('tablet');
      expect(deviceInfo.os).toContain('iOS');
    });
  });

  describe('getDeviceType', () => {
    it('should classify desktop correctly', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0';
      const parsed = DeviceFingerprint.parseUserAgent(userAgent);

      const deviceType = DeviceFingerprint.getDeviceType(parsed);

      expect(deviceType).toBe('desktop');
    });

    it('should classify mobile correctly', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) Safari/604.1';
      const parsed = DeviceFingerprint.parseUserAgent(userAgent);

      const deviceType = DeviceFingerprint.getDeviceType(parsed);

      expect(deviceType).toBe('mobile');
    });

    it('should classify tablet correctly', () => {
      const userAgent = 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) Safari/604.1';
      const parsed = DeviceFingerprint.parseUserAgent(userAgent);

      const deviceType = DeviceFingerprint.getDeviceType(parsed);

      expect(deviceType).toBe('tablet');
    });

    it('should infer mobile from Android OS', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0';
      const parsed = DeviceFingerprint.parseUserAgent(userAgent);

      const deviceType = DeviceFingerprint.getDeviceType(parsed);

      expect(deviceType).toBe('mobile');
    });
  });

  describe('matchFingerprints', () => {
    it('should return true for identical fingerprints', () => {
      const fp1 = 'abc123def456';
      const fp2 = 'abc123def456';

      const result = DeviceFingerprint.matchFingerprints(fp1, fp2);

      expect(result).toBe(true);
    });

    it('should return false for different fingerprints', () => {
      const fp1 = 'abc123def456';
      const fp2 = 'xyz789uvw012';

      const result = DeviceFingerprint.matchFingerprints(fp1, fp2);

      expect(result).toBe(false);
    });
  });

  describe('isSignificantDeviceChange', () => {
    it('should detect browser change as significant', () => {
      const oldDevice: DeviceInfo = {
        fingerprint: 'abc123',
        deviceName: 'Chrome on Windows',
        deviceType: 'desktop',
        browser: 'Chrome 120',
        os: 'Windows 10',
        userAgent: 'Mozilla/5.0 Chrome',
      };

      const newDevice: DeviceInfo = {
        fingerprint: 'def456',
        deviceName: 'Firefox on Windows',
        deviceType: 'desktop',
        browser: 'Firefox 121',
        os: 'Windows 10',
        userAgent: 'Mozilla/5.0 Firefox',
      };

      const result = DeviceFingerprint.isSignificantDeviceChange(oldDevice, newDevice);

      expect(result).toBe(true);
    });

    it('should detect OS change as significant', () => {
      const oldDevice: DeviceInfo = {
        fingerprint: 'abc123',
        deviceName: 'Chrome on Windows',
        deviceType: 'desktop',
        browser: 'Chrome 120',
        os: 'Windows 10',
        userAgent: 'Mozilla/5.0 Chrome Windows',
      };

      const newDevice: DeviceInfo = {
        fingerprint: 'def456',
        deviceName: 'Chrome on Mac',
        deviceType: 'desktop',
        browser: 'Chrome 120',
        os: 'Mac OS 14',
        userAgent: 'Mozilla/5.0 Chrome Mac',
      };

      const result = DeviceFingerprint.isSignificantDeviceChange(oldDevice, newDevice);

      expect(result).toBe(true);
    });

    it('should detect device type change as significant', () => {
      const oldDevice: DeviceInfo = {
        fingerprint: 'abc123',
        deviceName: 'Safari on Mac',
        deviceType: 'desktop',
        browser: 'Safari 17',
        os: 'Mac OS 14',
        userAgent: 'Mozilla/5.0 Mac',
      };

      const newDevice: DeviceInfo = {
        fingerprint: 'def456',
        deviceName: 'Safari on iPhone',
        deviceType: 'mobile',
        browser: 'Safari 17',
        os: 'iOS 17',
        userAgent: 'Mozilla/5.0 iPhone',
      };

      const result = DeviceFingerprint.isSignificantDeviceChange(oldDevice, newDevice);

      expect(result).toBe(true);
    });

    it('should not flag minor version changes as significant', () => {
      const oldDevice: DeviceInfo = {
        fingerprint: 'abc123',
        deviceName: 'Chrome on Windows',
        deviceType: 'desktop',
        browser: 'Chrome 120.0',
        os: 'Windows 10',
        userAgent: 'Mozilla/5.0 Chrome/120.0',
      };

      const newDevice: DeviceInfo = {
        fingerprint: 'abc456',
        deviceName: 'Chrome on Windows',
        deviceType: 'desktop',
        browser: 'Chrome 120.0', // Same browser and OS
        os: 'Windows 10',
        userAgent: 'Mozilla/5.0 Chrome/120.1',
      };

      const result = DeviceFingerprint.isSignificantDeviceChange(oldDevice, newDevice);

      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed user agents', () => {
      const malformedUserAgents = [
        'Not a real user agent',
        '12345',
        '!!!@@@###',
        '',
      ];

      malformedUserAgents.forEach((ua) => {
        const deviceInfo = DeviceFingerprint.generateDeviceInfo(ua, '192.168.1.1');
        expect(deviceInfo.fingerprint).toHaveLength(32);
        expect(deviceInfo.browser).toBeDefined();
        expect(deviceInfo.os).toBeDefined();
        expect(deviceInfo.deviceType).toBeDefined();
      });
    });

    it('should handle very long user agent strings', () => {
      const longUserAgent = 'Mozilla/5.0 ' + 'X'.repeat(1000);
      const ipAddress = '192.168.1.1';

      const deviceInfo = DeviceFingerprint.generateDeviceInfo(longUserAgent, ipAddress);

      expect(deviceInfo.fingerprint).toHaveLength(32);
    });

    it('should handle localhost addresses', () => {
      const userAgent = 'Mozilla/5.0 Chrome/120.0.0.0';

      const fp1 = DeviceFingerprint.generateDeviceInfo(userAgent, '127.0.0.1');
      const fp2 = DeviceFingerprint.generateDeviceInfo(userAgent, '::1');

      expect(fp1.fingerprint).toHaveLength(32);
      expect(fp2.fingerprint).toHaveLength(32);
      expect(fp1.fingerprint).not.toBe(fp2.fingerprint); // Different IP representations
    });
  });
});

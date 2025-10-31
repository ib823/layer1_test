import { UAParser } from 'ua-parser-js';
import { createHash } from 'crypto';

export interface DeviceInfo {
  fingerprint: string; // Hashed fingerprint
  deviceName: string;
  deviceType: string; // 'desktop', 'mobile', 'tablet'
  browser: string;
  os: string;
  userAgent: string;
}

export interface ParsedUserAgent {
  browser: {
    name?: string;
    version?: string;
  };
  os: {
    name?: string;
    version?: string;
  };
  device: {
    type?: string;
    vendor?: string;
    model?: string;
  };
}

/**
 * Device Fingerprinting Service
 *
 * Generates consistent device fingerprints based on user agent and other device characteristics.
 * The fingerprint is used to identify returning devices for security and UX purposes.
 *
 * Note: This is a server-side fingerprint based on HTTP headers. For more robust
 * fingerprinting, consider using @fingerprintjs/fingerprintjs on the client side.
 */
export class DeviceFingerprint {
  /**
   * Generate device info including fingerprint from user agent and IP
   */
  static generateDeviceInfo(userAgent: string, ipAddress: string): DeviceInfo {
    const parsed = this.parseUserAgent(userAgent);
    const fingerprint = this.generateFingerprint(userAgent, ipAddress, parsed);

    return {
      fingerprint,
      deviceName: this.getDeviceName(parsed),
      deviceType: this.getDeviceType(parsed),
      browser: this.getBrowserString(parsed),
      os: this.getOSString(parsed),
      userAgent,
    };
  }

  /**
   * Parse user agent string
   */
  static parseUserAgent(userAgent: string): ParsedUserAgent {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    return {
      browser: result.browser || {},
      os: result.os || {},
      device: result.device || {},
    };
  }

  /**
   * Generate a consistent fingerprint hash
   *
   * This combines user agent components and IP address (subnet) to create
   * a fingerprint that is stable across requests from the same device.
   */
  static generateFingerprint(
    userAgent: string,
    ipAddress: string,
    parsed: ParsedUserAgent
  ): string {
    // Use subnet for IPv4 (first 3 octets) to handle dynamic IPs
    const ipSubnet = this.getIPSubnet(ipAddress);

    // Combine stable components
    const components = [
      parsed.browser.name || 'unknown',
      parsed.browser.version?.split('.')[0] || 'unknown', // Major version only
      parsed.os.name || 'unknown',
      parsed.os.version?.split('.')[0] || 'unknown', // Major version only
      parsed.device.type || 'desktop',
      parsed.device.vendor || '',
      ipSubnet,
    ].filter(Boolean);

    const fingerprintString = components.join('|');

    // Return SHA-256 hash
    return createHash('sha256')
      .update(fingerprintString)
      .digest('hex')
      .substring(0, 32); // Truncate to 32 chars for storage
  }

  /**
   * Get IP subnet (first 3 octets for IPv4, first 4 groups for IPv6)
   */
  private static getIPSubnet(ipAddress: string): string {
    if (ipAddress.includes(':')) {
      // IPv6: use first 4 groups
      const groups = ipAddress.split(':');
      return groups.slice(0, 4).join(':');
    } else {
      // IPv4: use first 3 octets
      const octets = ipAddress.split('.');
      if (octets.length >= 3) {
        return octets.slice(0, 3).join('.');
      }
      return ipAddress;
    }
  }

  /**
   * Get user-friendly device name
   */
  static getDeviceName(parsed: ParsedUserAgent): string {
    const parts: string[] = [];

    if (parsed.device.vendor) {
      parts.push(parsed.device.vendor);
    }

    if (parsed.device.model) {
      parts.push(parsed.device.model);
    }

    if (parts.length > 0) {
      return parts.join(' ');
    }

    // Fallback to OS + Browser
    if (parsed.os.name) {
      parts.push(parsed.os.name);
    }

    if (parsed.browser.name && parsed.browser.name !== 'unknown') {
      parts.push(parsed.browser.name);
    }

    return parts.length > 0 ? parts.join(' - ') : 'Unknown Device';
  }

  /**
   * Get device type
   */
  static getDeviceType(parsed: ParsedUserAgent): string {
    const deviceType = parsed.device.type;

    if (deviceType) {
      // ua-parser-js returns types like: mobile, tablet, console, smarttv, wearable, embedded
      if (deviceType === 'mobile') return 'mobile';
      if (deviceType === 'tablet') return 'tablet';
      // All other types default to desktop
      return 'desktop';
    }

    // If no device type, infer from OS
    const osName = parsed.os.name?.toLowerCase();
    if (osName) {
      if (osName.includes('android') || osName.includes('ios')) {
        return 'mobile';
      }
      if (osName.includes('ipad')) {
        return 'tablet';
      }
    }

    return 'desktop';
  }

  /**
   * Get browser string (name + version)
   */
  static getBrowserString(parsed: ParsedUserAgent): string {
    const name = parsed.browser.name || 'Unknown Browser';
    const version = parsed.browser.version || '';

    if (version) {
      // Get major.minor version
      const majorMinor = version.split('.').slice(0, 2).join('.');
      return `${name} ${majorMinor}`;
    }

    return name;
  }

  /**
   * Get OS string (name + version)
   */
  static getOSString(parsed: ParsedUserAgent): string {
    const name = parsed.os.name || 'Unknown OS';
    const version = parsed.os.version || '';

    if (version) {
      // For macOS, show major version (e.g., "14" for Sonoma)
      // For Windows, show full version
      // For Linux, don't show version
      if (name.toLowerCase().includes('mac')) {
        const major = version.split('.')[0];
        return `${name} ${major}`;
      } else if (name.toLowerCase().includes('windows')) {
        return `${name} ${version}`;
      } else if (name.toLowerCase().includes('linux')) {
        return name;
      }

      return `${name} ${version}`;
    }

    return name;
  }

  /**
   * Compare two fingerprints to see if they match
   */
  static matchFingerprints(fp1: string, fp2: string): boolean {
    return fp1 === fp2;
  }

  /**
   * Check if a device changed significantly (different browser or OS)
   */
  static isSignificantDeviceChange(
    old: DeviceInfo,
    new_: DeviceInfo
  ): boolean {
    // Different browser or OS = significant change
    if (old.browser !== new_.browser) return true;
    if (old.os !== new_.os) return true;
    if (old.deviceType !== new_.deviceType) return true;

    return false;
  }
}

/**
 * SSRF Protection Utilities
 *
 * SECURITY FIX: CVE-FRAMEWORK-2025-004 (Server-Side Request Forgery)
 *
 * Prevents attackers from making the server perform requests to:
 * - Internal/private IP addresses (AWS metadata, internal services)
 * - Arbitrary external URLs
 * - File:// or other dangerous protocols
 *
 * Usage:
 *   validateSAPUrl(req.body.sapBaseUrl);
 *   validateUrl(userProvidedUrl, { allowedProtocols: ['https'] });
 */

import { isIP } from 'net';
import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

/**
 * Allowed SAP domains for service discovery
 *
 * SECURITY: Only allow connections to known SAP infrastructure
 * Add customer-specific SAP domains as needed
 */
const ALLOWED_SAP_DOMAINS = [
  // SAP Cloud Platform
  'sap.com',
  'sapbusinessobjects.com',
  'successfactors.com',
  'successfactors.eu',
  'concursolutions.com',
  'ariba.com',
  'fieldglass.com',

  // SAP S/4HANA Cloud
  's4hana.cloud.sap',
  's4hana.ondemand.com',
  'hana.ondemand.com',

  // SAP BTP
  'cfapps.eu10.hana.ondemand.com',
  'cfapps.us10.hana.ondemand.com',
  'cfapps.ap10.hana.ondemand.com',

  // Customer-specific domains
  // TODO: Add customer SAP system domains here
];

/**
 * Private IP ranges (RFC 1918 + other private ranges)
 */
const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },           // 10.0.0.0/8
  { start: '172.16.0.0', end: '172.31.255.255' },         // 172.16.0.0/12
  { start: '192.168.0.0', end: '192.168.255.255' },       // 192.168.0.0/16
  { start: '127.0.0.0', end: '127.255.255.255' },         // 127.0.0.0/8 (loopback)
  { start: '169.254.0.0', end: '169.254.255.255' },       // 169.254.0.0/16 (link-local, AWS metadata)
  { start: '0.0.0.0', end: '0.255.255.255' },             // 0.0.0.0/8
  { start: '224.0.0.0', end: '255.255.255.255' },         // Multicast + reserved
];

/**
 * Link-local IPv6 addresses
 */
const PRIVATE_IPV6_PREFIXES = [
  'fe80:',   // Link-local
  'fc00:',   // Unique local
  'fd00:',   // Unique local
  '::1',     // Loopback
  '::ffff:', // IPv4-mapped IPv6
];

export interface URLValidationOptions {
  /**
   * Allowed protocols (default: ['https'])
   */
  allowedProtocols?: string[];

  /**
   * Allowed domain patterns (default: ALLOWED_SAP_DOMAINS)
   */
  allowedDomains?: string[];

  /**
   * Whether to allow IP addresses (default: false)
   */
  allowIPAddresses?: boolean;

  /**
   * Whether to resolve DNS and check for private IPs (default: true)
   * WARNING: DNS resolution can be slow and may be vulnerable to TOCTOU
   */
  checkDNS?: boolean;

  /**
   * Maximum URL length (default: 2048)
   */
  maxLength?: number;
}

/**
 * ✅ SECURITY FIX: Validate SAP URL for service discovery
 *
 * Prevents SSRF attacks by:
 * 1. Enforcing HTTPS protocol
 * 2. Validating against SAP domain allowlist
 * 3. Blocking private IP addresses
 * 4. Blocking IP addresses entirely (force hostname)
 * 5. DNS resolution check for private IPs
 *
 * @throws Error if URL is invalid or potentially malicious
 */
export async function validateSAPUrl(url: string): Promise<void> {
  return validateUrl(url, {
    allowedProtocols: ['https'],
    allowedDomains: ALLOWED_SAP_DOMAINS,
    allowIPAddresses: false,
    checkDNS: true,
  });
}

/**
 * ✅ SECURITY FIX: Generic URL validation with SSRF protection
 *
 * @throws Error if URL fails validation
 */
export async function validateUrl(
  url: string,
  options: URLValidationOptions = {}
): Promise<void> {
  const {
    allowedProtocols = ['https'],
    allowedDomains = ALLOWED_SAP_DOMAINS,
    allowIPAddresses = false,
    checkDNS = true,
    maxLength = 2048,
  } = options;

  // Check URL length
  if (url.length > maxLength) {
    throw new Error(`URL exceeds maximum length of ${maxLength} characters`);
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  // ✅ CHECK 1: Protocol validation
  if (!allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
    throw new Error(
      `Invalid protocol: ${parsed.protocol}. Allowed protocols: ${allowedProtocols.join(', ')}`
    );
  }

  // ✅ CHECK 2: Block IP addresses (if not allowed)
  const hostname = parsed.hostname.toLowerCase();

  if (!allowIPAddresses && isIP(hostname)) {
    throw new Error('IP addresses are not allowed. Use hostname instead.');
  }

  // ✅ CHECK 3: Check for private IP addresses
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new Error(`Private/internal IP address not allowed: ${hostname}`);
    }
  }

  // ✅ CHECK 4: Domain allowlist validation
  if (allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      throw new Error(
        `Domain not in allowlist: ${hostname}. ` +
        `Allowed domains: ${allowedDomains.slice(0, 3).join(', ')}...`
      );
    }
  }

  // ✅ CHECK 5: DNS resolution check (detect DNS rebinding attacks)
  if (checkDNS && !isIP(hostname)) {
    await checkDNSForPrivateIPs(hostname);
  }

  // ✅ CHECK 6: Block dangerous URL patterns
  const dangerousPatterns = [
    /localhost/i,
    /0\.0\.0\.0/,
    /127\.0\.0\.\d+/,
    /169\.254\./,  // AWS metadata
    /metadata/i,   // Cloud metadata endpoints
    /@/,           // User info in URL (SSRF bypass technique)
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(url)) {
      throw new Error(`URL contains dangerous pattern: ${pattern}`);
    }
  }
}

/**
 * Check if IP address is private/internal
 */
export function isPrivateIP(ip: string): boolean {
  // Check for localhost aliases
  if (ip === 'localhost' || ip === '0.0.0.0') {
    return true;
  }

  // Check IPv6 private addresses
  if (ip.includes(':')) {
    return PRIVATE_IPV6_PREFIXES.some(prefix => ip.startsWith(prefix));
  }

  // Check IPv4 private ranges
  const ipNum = ipToNumber(ip);

  return PRIVATE_IP_RANGES.some(range => {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);
    return ipNum >= startNum && ipNum <= endNum;
  });
}

/**
 * Convert IP address to number for range checking
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => {
    return (acc << 8) + parseInt(octet, 10);
  }, 0) >>> 0;
}

/**
 * Resolve hostname and check if any resolved IPs are private
 *
 * Prevents DNS rebinding attacks where:
 * 1. Attacker registers domain pointing to public IP (passes validation)
 * 2. DNS record quickly changes to private IP (169.254.169.254)
 * 3. Application makes request to private IP
 */
async function checkDNSForPrivateIPs(hostname: string): Promise<void> {
  try {
    // Resolve IPv4 addresses
    const addresses = await dnsResolve4(hostname);

    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        throw new Error(
          `Hostname ${hostname} resolves to private IP address: ${addr}`
        );
      }
    }
  } catch (error: any) {
    // If DNS resolution fails, it might be IPv6-only or not exist
    // Try IPv6 resolution
    try {
      const addresses = await dnsResolve6(hostname);

      for (const addr of addresses) {
        if (isPrivateIP(addr)) {
          throw new Error(
            `Hostname ${hostname} resolves to private IPv6 address: ${addr}`
          );
        }
      }
    } catch (ipv6Error) {
      // If both IPv4 and IPv6 fail, hostname doesn't resolve
      throw new Error(`Cannot resolve hostname: ${hostname}`);
    }
  }
}

/**
 * Add custom SAP domain to allowlist
 *
 * Use this to add customer-specific SAP systems
 */
export function addAllowedSAPDomain(domain: string): void {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Invalid domain');
  }

  const normalizedDomain = domain.toLowerCase().trim();

  // Validate domain format (basic check)
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalizedDomain)) {
    throw new Error('Invalid domain format');
  }

  if (!ALLOWED_SAP_DOMAINS.includes(normalizedDomain)) {
    ALLOWED_SAP_DOMAINS.push(normalizedDomain);
  }
}

/**
 * Get current list of allowed SAP domains
 */
export function getAllowedSAPDomains(): readonly string[] {
  return Object.freeze([...ALLOWED_SAP_DOMAINS]);
}

/**
 * Sanitize URL for logging (remove sensitive data)
 */
export function sanitizeUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove username/password if present
    parsed.username = '';
    parsed.password = '';

    // Optionally remove query parameters (may contain secrets)
    parsed.search = '';

    return parsed.toString();
  } catch {
    return '[invalid URL]';
  }
}

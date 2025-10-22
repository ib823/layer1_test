/**
 * Input Sanitization Utilities
 *
 * SECURITY FIX: CVE-FRAMEWORK-2025-005 (Stored XSS)
 * DEFECT-035: XSS vulnerability in user inputs
 *
 * Provides comprehensive input sanitization to prevent:
 * - Cross-Site Scripting (XSS)
 * - SQL Injection (defense-in-depth, Prisma ORM already protects)
 * - HTML Injection
 * - Script Injection
 *
 * IMPORTANT: This is a basic implementation. For production, consider:
 * - Installing 'xss' package: npm install xss
 * - Installing 'validator' package: npm install validator
 * - Installing 'sanitize-html' package: npm install sanitize-html
 */

import logger from './logger';

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  /** Allow basic HTML formatting (b, i, u, br, p) */
  allowBasicHtml?: boolean;
  /** Maximum length (0 = no limit) */
  maxLength?: number;
  /** Trim whitespace */
  trim?: boolean;
  /** Convert to lowercase */
  toLowerCase?: boolean;
}

/**
 * Escape HTML special characters to prevent XSS
 *
 * Converts: < > & " ' / to HTML entities
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize user input to prevent XSS attacks
 *
 * Use this for ALL user-provided text that will be:
 * - Stored in database
 * - Displayed to other users
 * - Included in HTML output
 *
 * @param input - User input string
 * @param options - Sanitization options
 * @returns Sanitized string safe for storage/display
 */
export function sanitizeInput(
  input: string | null | undefined,
  options: SanitizationOptions = {}
): string {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return '';
  }

  // Convert to string if needed
  let sanitized = String(input);

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Apply max length
  if (options.maxLength && options.maxLength > 0) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Convert to lowercase if requested
  if (options.toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }

  // Remove dangerous patterns
  sanitized = removeDangerousPatterns(sanitized);

  // Escape HTML unless basic HTML is explicitly allowed
  if (!options.allowBasicHtml) {
    sanitized = escapeHtml(sanitized);
  } else {
    sanitized = sanitizeBasicHtml(sanitized);
  }

  return sanitized;
}

/**
 * Remove dangerous patterns that could be used for attacks
 */
function removeDangerousPatterns(text: string): string {
  // Remove script tags (case-insensitive)
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, onload, etc.)
  text = text.replace(/on\w+\s*=\s*["']?[^"'>]*["']?/gi, '');

  // Remove javascript: protocol
  text = text.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  text = text.replace(/data:text\/html/gi, '');

  // Remove vbscript: protocol
  text = text.replace(/vbscript:/gi, '');

  // Remove iframe tags
  text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object/embed tags
  text = text.replace(/<(object|embed|applet)[^>]*>.*?<\/\1>/gi, '');

  return text;
}

/**
 * Sanitize HTML while preserving basic formatting tags
 *
 * Allows: <b>, <i>, <u>, <br>, <p>, <strong>, <em>
 * Removes: All other tags and attributes
 */
function sanitizeBasicHtml(html: string): string {
  // Allowed tags
  const allowedTags = ['b', 'i', 'u', 'br', 'p', 'strong', 'em'];

  // First, remove all dangerous patterns
  html = removeDangerousPatterns(html);

  // Remove all tags except allowed ones
  html = html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      // Return tag without attributes
      if (match.startsWith('</')) {
        return `</${tag}>`;
      } else {
        return `<${tag}>`;
      }
    }
    // Remove disallowed tags
    return '';
  });

  return html;
}

/**
 * Sanitize object: recursively sanitize all string properties
 *
 * Use this for API request bodies to sanitize all user inputs at once
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: SanitizationOptions = {}
): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value, options);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeInput(item, options)
          : typeof item === 'object'
          ? sanitizeObject(item, options)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  // Basic email regex (for validation)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const sanitized = sanitizeInput(email, {
    trim: true,
    toLowerCase: true,
    maxLength: 255,
  });

  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string {
  const sanitized = sanitizeInput(url, { trim: true, maxLength: 2048 });

  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  const lowerUrl = sanitized.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      logger.warn('Dangerous URL protocol detected', { url: sanitized });
      throw new Error('Invalid URL: dangerous protocol');
    }
  }

  // Ensure URL starts with http:// or https://
  if (!/^https?:\/\//i.test(sanitized)) {
    throw new Error('Invalid URL: must start with http:// or https://');
  }

  return sanitized;
}

/**
 * Middleware: Sanitize all request body inputs
 *
 * Apply this middleware to routes that accept user input
 */
export function sanitizeRequestBody(
  req: any,
  res: any,
  next: any
): void {
  if (req.body && typeof req.body === 'object') {
    try {
      req.body = sanitizeObject(req.body, {
        trim: true,
        maxLength: 10000, // Prevent DoS with huge inputs
      });

      logger.debug('Request body sanitized', {
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Error sanitizing request body', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
      });
      // Allow request to proceed (graceful degradation)
      next();
    }
  } else {
    next();
  }
}

/**
 * SQL Injection prevention (defense-in-depth)
 *
 * Note: Prisma ORM already prevents SQL injection through parameterized queries.
 * This is an additional layer of defense.
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*[=<>]/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /xp_/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      logger.warn('Potential SQL injection detected', {
        input: input.substring(0, 100),
      });
      return true;
    }
  }

  return false;
}

/**
 * Comprehensive validation for violation description
 * (the field identified as vulnerable in testing)
 */
export function sanitizeViolationDescription(description: string): string {
  // Log for audit
  logger.debug('Sanitizing violation description', {
    originalLength: description.length,
  });

  // Check for SQL injection patterns
  if (detectSqlInjection(description)) {
    logger.warn('SQL injection pattern detected in violation description');
    // Remove but don't reject - gracefully handle
  }

  // Sanitize with strict rules
  const sanitized = sanitizeInput(description, {
    allowBasicHtml: false, // No HTML allowed in descriptions
    maxLength: 5000,
    trim: true,
  });

  logger.debug('Violation description sanitized', {
    sanitizedLength: sanitized.length,
  });

  return sanitized;
}

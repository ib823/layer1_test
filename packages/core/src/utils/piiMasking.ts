/**
 * PII (Personally Identifiable Information) Masking Utility
 * GDPR Compliance - Ensures sensitive data is masked in logs and outputs
 */

export interface MaskingOptions {
  emailMask?: boolean;
  phoneMask?: boolean;
  ssnMask?: boolean;
  creditCardMask?: boolean;
  nameMask?: boolean;
  addressMask?: boolean;
  customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
}

const DEFAULT_OPTIONS: MaskingOptions = {
  emailMask: true,
  phoneMask: true,
  ssnMask: true,
  creditCardMask: true,
  nameMask: false, // Usually keep names for audit purposes
  addressMask: false,
};

/**
 * PII field patterns to identify sensitive fields in objects
 */
const PII_FIELD_PATTERNS = [
  'email',
  'user_email',
  'userEmail',
  'mail',
  'e-mail',
  'phone',
  'telephone',
  'mobile',
  'phoneNumber',
  'phone_number',
  'ssn',
  'social_security',
  'tax_id',
  'taxId',
  'passport',
  'credit_card',
  'creditCard',
  'card_number',
  'cardNumber',
  'password',
  'pwd',
  'secret',
  'token',
  'api_key',
  'apiKey',
  'address',
  'street',
  'postal_code',
  'postalCode',
  'zip_code',
  'zipCode',
  'date_of_birth',
  'dateOfBirth',
  'dob',
  'birth_date',
  'salary',
  'compensation',
  'bank_account',
  'bankAccount',
  'iban',
  'routing_number',
];

/**
 * Regular expressions for PII detection
 */
const PII_PATTERNS = {
  // Email: user@example.com → u***@example.com
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone: +1-234-567-8900 → +1-***-***-8900
  phone: /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?(\d{3})[-.\s]?(\d{4})/g,

  // SSN: 123-45-6789 → ***-**-6789
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // Credit Card: 4532-1234-5678-9010 → 4532-****-****-9010
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

  // IBAN: DE89 3704 0044 0532 0130 00 → DE89 **** **** **** ****
  iban: /\b[A-Z]{2}\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,2}\b/g,

  // IP Address (can be PII in some contexts)
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

/**
 * Mask email addresses
 */
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;

  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }

  const visibleChars = Math.min(3, Math.floor(username.length / 3));
  const masked = username.substring(0, visibleChars) + '***';
  return `${masked}@${domain}`;
}

/**
 * Mask phone numbers - keep country code and last 4 digits
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10) {
    return '***-***-' + digits.slice(-4);
  }

  const countryCode = digits.length > 10 ? digits.substring(0, digits.length - 10) : '';
  const last4 = digits.slice(-4);

  if (countryCode) {
    return `+${countryCode}-***-***-${last4}`;
  }

  return `***-***-${last4}`;
}

/**
 * Mask SSN - keep last 4 digits
 */
export function maskSSN(ssn: string): string {
  return `***-**-${ssn.slice(-4)}`;
}

/**
 * Mask credit card - keep first 4 and last 4 digits
 */
export function maskCreditCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');

  if (digits.length < 8) {
    return '****-****-****-****';
  }

  const first4 = digits.substring(0, 4);
  const last4 = digits.slice(-4);

  return `${first4}-****-****-${last4}`;
}

/**
 * Mask person name - show first letter of first and last name
 */
export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 0) return '***';
  if (parts.length === 1) return parts[0][0] + '***';

  const firstName = parts[0][0] + '***';
  const lastName = parts[parts.length - 1][0] + '***';

  return `${firstName} ${lastName}`;
}

/**
 * Mask string content using configured patterns
 */
export function maskString(input: string, options: MaskingOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = input;

  if (opts.emailMask) {
    result = result.replace(PII_PATTERNS.email, (match) => maskEmail(match));
  }

  if (opts.phoneMask) {
    result = result.replace(PII_PATTERNS.phone, (match) => maskPhone(match));
  }

  if (opts.ssnMask) {
    result = result.replace(PII_PATTERNS.ssn, (match) => maskSSN(match));
  }

  if (opts.creditCardMask) {
    result = result.replace(PII_PATTERNS.creditCard, (match) => maskCreditCard(match));
    result = result.replace(PII_PATTERNS.iban, (match) => {
      const country = match.substring(0, 2);
      return `${country}** **** **** **** ****`;
    });
  }

  // Apply custom patterns
  if (opts.customPatterns) {
    for (const { pattern, replacement } of opts.customPatterns) {
      result = result.replace(pattern, replacement);
    }
  }

  return result;
}

/**
 * Check if a field name indicates PII
 */
export function isPIIField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return PII_FIELD_PATTERNS.some((pattern) =>
    lowerField.includes(pattern.toLowerCase())
  );
}

/**
 * Recursively mask PII in objects
 */
export function maskObject(obj: any, options: MaskingOptions = {}): any {
  if (obj === null || obj === undefined) return obj;

  // Handle primitives
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return maskString(obj, options);
    }
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => maskObject(item, options));
  }

  // Handle objects
  const masked: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if field name indicates PII
    if (isPIIField(key)) {
      if (typeof value === 'string') {
        // Mask based on field type
        if (key.toLowerCase().includes('email')) {
          masked[key] = maskEmail(value);
        } else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
          masked[key] = maskPhone(value);
        } else if (key.toLowerCase().includes('ssn') || key.toLowerCase().includes('tax_id')) {
          masked[key] = maskSSN(value);
        } else if (key.toLowerCase().includes('card') || key.toLowerCase().includes('credit')) {
          masked[key] = maskCreditCard(value);
        } else if (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('api_key')
        ) {
          masked[key] = '***REDACTED***';
        } else {
          masked[key] = maskString(value, options);
        }
      } else {
        // Recursively mask nested objects
        masked[key] = maskObject(value, options);
      }
    } else {
      // Not a PII field, but still recursively process
      masked[key] = maskObject(value, options);
    }
  }

  return masked;
}

/**
 * Safe JSON stringify with PII masking
 */
export function safeJSONStringify(obj: any, options: MaskingOptions = {}): string {
  try {
    const masked = maskObject(obj, options);
    return JSON.stringify(masked, null, 2);
  } catch (error) {
    return '[Error serializing object]';
  }
}

/**
 * Get list of PII fields found in an object
 */
export function identifyPIIFields(obj: any, prefix = ''): string[] {
  const piiFields: string[] = [];

  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return piiFields;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (isPIIField(key)) {
      piiFields.push(fullPath);
    }

    if (value && typeof value === 'object') {
      piiFields.push(...identifyPIIFields(value, fullPath));
    }
  }

  return piiFields;
}

/**
 * Mask PII in error messages and stack traces
 */
export function maskError(error: Error, options: MaskingOptions = {}): Error {
  const maskedError = new Error(maskString(error.message, options));
  maskedError.name = error.name;

  if (error.stack) {
    maskedError.stack = maskString(error.stack, options);
  }

  return maskedError;
}

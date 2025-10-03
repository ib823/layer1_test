import {
  maskEmail,
  maskPhone,
  maskSSN,
  maskCreditCard,
  maskObject,
  isPIIField,
  identifyPIIFields,
} from '../../src/utils/piiMasking';

describe('PII Masking', () => {
  describe('maskEmail', () => {
    it('should mask email addresses correctly', () => {
      expect(maskEmail('user@example.com')).toBe('u***@example.com');
      expect(maskEmail('john.doe@company.org')).toContain('***@company.org');
    });

    it('should handle short emails', () => {
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
    });

    it('should preserve domain', () => {
      const masked = maskEmail('admin@sensitive-company.com');
      expect(masked).toContain('@sensitive-company.com');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone numbers keeping last 4 digits', () => {
      expect(maskPhone('+1-234-567-8900')).toBe('+1-***-***-8900');
      expect(maskPhone('555-123-4567')).toBe('***-***-4567');
    });

    it('should handle international format', () => {
      const masked = maskPhone('+44-20-7946-0958');
      expect(masked).toContain('0958');
      expect(masked).toContain('***');
    });
  });

  describe('maskSSN', () => {
    it('should mask SSN keeping last 4 digits', () => {
      expect(maskSSN('123-45-6789')).toBe('***-**-6789');
    });
  });

  describe('maskCreditCard', () => {
    it('should mask credit card keeping first 4 and last 4', () => {
      expect(maskCreditCard('4532-1234-5678-9010')).toBe('4532-****-****-9010');
    });

    it('should handle cards without dashes', () => {
      const masked = maskCreditCard('4532123456789010');
      expect(masked).toBe('4532-****-****-9010');
    });
  });

  describe('isPIIField', () => {
    it('should identify PII field names', () => {
      expect(isPIIField('email')).toBe(true);
      expect(isPIIField('user_email')).toBe(true);
      expect(isPIIField('phone_number')).toBe(true);
      expect(isPIIField('ssn')).toBe(true);
      expect(isPIIField('credit_card')).toBe(true);
      expect(isPIIField('password')).toBe(true);
    });

    it('should not identify non-PII fields', () => {
      expect(isPIIField('id')).toBe(false);
      expect(isPIIField('created_at')).toBe(false);
      expect(isPIIField('status')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isPIIField('EMAIL')).toBe(true);
      expect(isPIIField('Phone_Number')).toBe(true);
    });
  });

  describe('maskObject', () => {
    it('should mask PII fields in objects', () => {
      const data = {
        id: '123',
        email: 'user@example.com',
        phone: '+1-234-567-8900',
        ssn: '123-45-6789',
        name: 'John Doe',
      };

      const masked = maskObject(data);

      expect(masked.id).toBe('123');
      expect(masked.email).toContain('***@example.com');
      expect(masked.phone).toContain('***');
      expect(masked.ssn).toBe('***-**-6789');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          profile: {
            phone: '555-123-4567',
          },
        },
      };

      const masked = maskObject(data);

      expect(masked.user.email).toContain('***');
      expect(masked.user.profile.phone).toContain('***');
    });

    it('should handle arrays', () => {
      const data = {
        users: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
      };

      const masked = maskObject(data);

      expect(masked.users[0].email).toContain('***');
      expect(masked.users[1].email).toContain('***');
    });

    it('should redact sensitive fields completely', () => {
      const data = {
        password: 'secret123',
        api_key: 'abc-123-def',
        token: 'bearer-token',
      };

      const masked = maskObject(data);

      expect(masked.password).toBe('***REDACTED***');
      expect(masked.api_key).toBe('***REDACTED***');
      expect(masked.token).toBe('***REDACTED***');
    });

    it('should handle null and undefined', () => {
      const data = {
        email: null,
        phone: undefined,
        name: 'Test',
      };

      const masked = maskObject(data);

      expect(masked.email).toBeNull();
      expect(masked.phone).toBeUndefined();
      expect(masked.name).toBe('Test');
    });
  });

  describe('identifyPIIFields', () => {
    it('should identify all PII fields in object', () => {
      const data = {
        id: '123',
        email: 'user@example.com',
        user: {
          phone: '555-1234',
          ssn: '123-45-6789',
        },
      };

      const piiFields = identifyPIIFields(data);

      expect(piiFields).toContain('email');
      expect(piiFields).toContain('user.phone');
      expect(piiFields).toContain('user.ssn');
      expect(piiFields).not.toContain('id');
    });

    it('should return empty array for non-PII objects', () => {
      const data = {
        id: '123',
        status: 'active',
        created_at: new Date(),
      };

      const piiFields = identifyPIIFields(data);

      expect(piiFields).toHaveLength(0);
    });
  });
});

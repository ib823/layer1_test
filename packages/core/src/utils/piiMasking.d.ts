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
    customPatterns?: Array<{
        pattern: RegExp;
        replacement: string;
    }>;
}
/**
 * Mask email addresses
 */
export declare function maskEmail(email: string): string;
/**
 * Mask phone numbers - keep country code and last 4 digits
 */
export declare function maskPhone(phone: string): string;
/**
 * Mask SSN - keep last 4 digits
 */
export declare function maskSSN(ssn: string): string;
/**
 * Mask credit card - keep first 4 and last 4 digits
 */
export declare function maskCreditCard(cardNumber: string): string;
/**
 * Mask person name - show first letter of first and last name
 */
export declare function maskName(name: string): string;
/**
 * Mask string content using configured patterns
 */
export declare function maskString(input: string, options?: MaskingOptions): string;
/**
 * Check if a field name indicates PII
 */
export declare function isPIIField(fieldName: string): boolean;
/**
 * Recursively mask PII in objects
 */
export declare function maskObject(obj: any, options?: MaskingOptions): any;
/**
 * Safe JSON stringify with PII masking
 */
export declare function safeJSONStringify(obj: any, options?: MaskingOptions): string;
/**
 * Get list of PII fields found in an object
 */
export declare function identifyPIIFields(obj: any, prefix?: string): string[];
/**
 * Mask PII in error messages and stack traces
 */
export declare function maskError(error: Error, options?: MaskingOptions): Error;
//# sourceMappingURL=piiMasking.d.ts.map
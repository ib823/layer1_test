/**
 * Comprehensive Unit Tests for Duplicate Detection Algorithms
 */

import {
  levenshteinDistance,
  stringSimilarity,
  normalizeVendorName,
  normalizeAddress,
  hasSameBankAccount,
  hasSameTaxId,
  calculateMatchScore,
  calculateSeverity,
  calculateConfidence,
  getRecommendedAction,
  findDuplicates,
  findDuplicatesForVendor
} from '../../src/algorithms/duplicateDetection';
import { VendorMasterData, VendorDuplicate } from '../../src/types';

describe('Duplicate Detection Algorithms', () => {
  describe('levenshteinDistance()', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('ACME Corp', 'ACME Corp')).toBe(0);
    });

    it('should handle case insensitivity', () => {
      expect(levenshteinDistance('Hello', 'hello')).toBe(0);
      expect(levenshteinDistance('ACME', 'acme')).toBe(0);
    });

    it('should trim whitespace', () => {
      expect(levenshteinDistance('  hello  ', 'hello')).toBe(0);
    });

    it('should calculate single character substitution', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('cat', 'bat')).toBe(1);
    });

    it('should calculate insertions', () => {
      expect(levenshteinDistance('hello', 'helllo')).toBe(1);
      expect(levenshteinDistance('cat', 'cats')).toBe(1);
    });

    it('should calculate deletions', () => {
      expect(levenshteinDistance('helllo', 'hello')).toBe(1);
      expect(levenshteinDistance('cats', 'cat')).toBe(1);
    });

    it('should calculate distance for completely different strings', () => {
      expect(levenshteinDistance('hello', 'world')).toBeGreaterThan(0);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', 'hello')).toBe(5);
    });
  });

  describe('stringSimilarity()', () => {
    it('should return 100 for identical strings', () => {
      expect(stringSimilarity('Acme Corporation', 'Acme Corporation')).toBe(100);
    });

    it('should return 0 for empty strings', () => {
      expect(stringSimilarity('', '')).toBe(100);  // Both empty = 100% similar
      expect(stringSimilarity('hello', '')).toBe(0);
      expect(stringSimilarity('', 'hello')).toBe(0);
      expect(stringSimilarity(null as any, 'hello')).toBe(0);
      expect(stringSimilarity('hello', null as any)).toBe(0);
    });

    it('should return high similarity for similar strings', () => {
      const similarity = stringSimilarity('ACME Corporation', 'ACME Corp');
      expect(similarity).toBeGreaterThan(60);
    });

    it('should return low similarity for different strings', () => {
      const similarity = stringSimilarity('ACME', 'Globex');
      expect(similarity).toBeLessThan(50);
    });

    it('should handle case differences', () => {
      const similarity = stringSimilarity('Hello World', 'hello world');
      expect(similarity).toBe(100);
    });
  });

  describe('normalizeVendorName()', () => {
    it('should remove "Inc" suffix', () => {
      expect(normalizeVendorName('Acme Inc')).toBe('acme');
      expect(normalizeVendorName('Acme Inc.')).toBe('acme');
    });

    it('should remove "Corporation" suffix', () => {
      expect(normalizeVendorName('Acme Corporation')).toBe('acme');
      expect(normalizeVendorName('Acme Corp')).toBe('acme');
    });

    it('should remove "Ltd" suffix', () => {
      expect(normalizeVendorName('Acme Ltd')).toBe('acme');
      expect(normalizeVendorName('Acme Limited')).toBe('acme');
    });

    it('should remove "LLC" suffix', () => {
      expect(normalizeVendorName('Acme LLC')).toBe('acme');
    });

    it('should remove multiple suffixes', () => {
      expect(normalizeVendorName('Acme Corp Ltd')).toBe('acme');
    });

    it('should remove special characters', () => {
      expect(normalizeVendorName('Acme & Co.')).toContain('acme');
      expect(normalizeVendorName('Acme, Inc.')).toContain('acme');
    });

    it('should convert to lowercase', () => {
      expect(normalizeVendorName('ACME CORPORATION')).toBe('acme');
    });

    it('should normalize extra spaces', () => {
      expect(normalizeVendorName('Acme    Corporation')).toBe('acme');
    });

    it('should handle empty string', () => {
      expect(normalizeVendorName('')).toBe('');
    });

    it('should handle names with group/holdings', () => {
      expect(normalizeVendorName('Acme Group')).toBe('acme');
      expect(normalizeVendorName('Acme Holdings')).toBe('acme');
    });
  });

  describe('normalizeAddress()', () => {
    it('should combine address parts', () => {
      const result = normalizeAddress('123 Main St', 'New York', '10001', 'US');
      expect(result).toContain('123');
      expect(result).toContain('main');
      expect(result).toContain('new york');
      expect(result).toContain('10001');
      expect(result).toContain('us');
    });

    it('should handle missing parts', () => {
      const result = normalizeAddress('123 Main St', undefined, '10001', 'US');
      expect(result).toContain('123');
      expect(result).toContain('10001');
    });

    it('should normalize to lowercase', () => {
      const result = normalizeAddress('MAIN STREET', 'NEW YORK');
      expect(result).toBe('main street new york');
    });

    it('should remove special characters', () => {
      const result = normalizeAddress('123, Main St.', 'New-York');
      expect(result).not.toContain(',');
      expect(result).not.toContain('.');
    });

    it('should handle all undefined parts', () => {
      const result = normalizeAddress(undefined, undefined, undefined, undefined);
      expect(result).toBe('');
    });
  });

  describe('hasSameBankAccount()', () => {
    it('should return true for matching IBAN', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        country: 'US',
        bankAccounts: [{ bankKey: 'BNK1', bankAccountNumber: '1234', bankCountry: 'US', iban: 'DE89370400440532013000' }],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        country: 'US',
        bankAccounts: [{ bankKey: 'BNK2', bankAccountNumber: '5678', bankCountry: 'US', iban: 'DE89370400440532013000' }],
        createdAt: new Date()
      };

      expect(hasSameBankAccount(vendor1, vendor2)).toBe(true);
    });

    it('should return true for matching account number + bank key', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        country: 'US',
        bankAccounts: [{ bankKey: 'BNK001', bankAccountNumber: '123456', bankCountry: 'US' }],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        country: 'US',
        bankAccounts: [{ bankKey: 'BNK001', bankAccountNumber: '123456', bankCountry: 'US' }],
        createdAt: new Date()
      };

      expect(hasSameBankAccount(vendor1, vendor2)).toBe(true);
    });

    it('should return true for matching SWIFT + account number', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        country: 'US',
        bankAccounts: [{
          bankKey: 'BNK1',
          bankAccountNumber: '999888',
          bankCountry: 'US',
          swift: 'DEUTDEFF'
        }],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        country: 'US',
        bankAccounts: [{
          bankKey: 'BNK2',
          bankAccountNumber: '999888',
          bankCountry: 'US',
          swift: 'DEUTDEFF'
        }],
        createdAt: new Date()
      };

      expect(hasSameBankAccount(vendor1, vendor2)).toBe(true);
    });

    it('should return false when no bank accounts', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      expect(hasSameBankAccount(vendor1, vendor2)).toBe(false);
    });

    it('should return false when bank accounts do not match', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        country: 'US',
        bankAccounts: [{ bankKey: 'BNK001', bankAccountNumber: '111111', bankCountry: 'US' }],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        country: 'US',
        bankAccounts: [{ bankKey: 'BNK002', bankAccountNumber: '222222', bankCountry: 'US' }],
        createdAt: new Date()
      };

      expect(hasSameBankAccount(vendor1, vendor2)).toBe(false);
    });
  });

  describe('hasSameTaxId()', () => {
    it('should return true for matching tax IDs', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        taxId: '12-3456789',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        taxId: '12-3456789',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      expect(hasSameTaxId(vendor1, vendor2)).toBe(true);
    });

    it('should normalize tax IDs (remove spaces and dashes)', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        taxId: '12-3456789',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        taxId: '123456789',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      expect(hasSameTaxId(vendor1, vendor2)).toBe(true);
    });

    it('should return false when tax IDs missing', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        taxId: '123456789',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      expect(hasSameTaxId(vendor1, vendor2)).toBe(false);
    });

    it('should return false when tax IDs do not match', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        taxId: '11-1111111',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor 2',
        taxId: '22-2222222',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      expect(hasSameTaxId(vendor1, vendor2)).toBe(false);
    });
  });

  describe('calculateMatchScore()', () => {
    it('should return 100 for exact name match', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Acme Corporation',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Acme Corporation',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const result = calculateMatchScore(vendor1, vendor2);
      expect(result.score).toBe(100);
      expect(result.matchType).toBe('EXACT');
    });

    it('should return 95+ for tax ID match', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Company A',
        taxId: '12-3456789',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Company B',
        taxId: '12-3456789',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const result = calculateMatchScore(vendor1, vendor2);
      expect(result.score).toBeGreaterThanOrEqual(95);
      expect(result.matchType).toBe('TAX_ID');
    });

    it('should return 90+ for bank account match', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor A',
        country: 'US',
        bankAccounts: [{ bankKey: 'BNK001', bankAccountNumber: '123456', bankCountry: 'US' }],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor B',
        country: 'US',
        bankAccounts: [{ bankKey: 'BNK001', bankAccountNumber: '123456', bankCountry: 'US' }],
        createdAt: new Date()
      };

      const result = calculateMatchScore(vendor1, vendor2);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.matchType).toBe('BANK_ACCOUNT');
    });

    it('should calculate fuzzy match score', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Acme Corporation',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'ACME Corp',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const result = calculateMatchScore(vendor1, vendor2);
      expect(result.score).toBeGreaterThan(50);
      expect(result.matchType).toMatch(/FUZZY/);
    });

    it('should include email match bonus', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor A',
        email: 'contact@vendor.com',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor B',
        email: 'contact@vendor.com',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const result = calculateMatchScore(vendor1, vendor2);
      expect(result.score).toBeGreaterThan(0);
      expect(result.matchReasons.some(r => r.includes('Email'))).toBe(true);
    });

    it('should include phone match bonus', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor A',
        phone: '(212) 555-0100',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor B',
        phone: '212-555-0100',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const result = calculateMatchScore(vendor1, vendor2);
      expect(result.score).toBeGreaterThan(0);
      expect(result.matchReasons.some(r => r.includes('Phone'))).toBe(true);
    });

    it('should include same country bonus', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor A',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = {
        vendorId: 'V2',
        vendorName: 'Vendor B',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const result = calculateMatchScore(vendor1, vendor2);
      expect(result.matchReasons.some(r => r.includes('Same country'))).toBe(true);
    });
  });

  describe('calculateSeverity()', () => {
    it('should return CRITICAL for high combined score', () => {
      expect(calculateSeverity(95, 95)).toBe('CRITICAL');
    });

    it('should return HIGH for moderate-high combined score', () => {
      expect(calculateSeverity(80, 75)).toBe('HIGH');
    });

    it('should return MEDIUM for moderate combined score', () => {
      expect(calculateSeverity(65, 60)).toBe('MEDIUM');
    });

    it('should return LOW for low combined score', () => {
      expect(calculateSeverity(50, 50)).toBe('LOW');
    });

    it('should average match score and confidence', () => {
      expect(calculateSeverity(90, 80)).toBe('HIGH');  // Average is 85
    });
  });

  describe('calculateConfidence()', () => {
    it('should return high confidence when all fields present', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        taxId: '12-3456789',
        country: 'US',
        street: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        email: 'test@vendor.com',
        phone: '+1-212-555-0100',
        bankAccounts: [{ bankKey: 'BNK001', bankAccountNumber: '123456', bankCountry: 'US' }],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = { ...vendor1, vendorId: 'V2' };

      const confidence = calculateConfidence(vendor1, vendor2);
      expect(confidence).toBeGreaterThan(70);
    });

    it('should return low confidence when fields missing', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = { ...vendor1, vendorId: 'V2' };

      const confidence = calculateConfidence(vendor1, vendor2);
      expect(confidence).toBeLessThan(50);
    });

    it('should not exceed 100', () => {
      const vendor1: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor 1',
        taxId: '12-3456789',
        country: 'US',
        street: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        email: 'test@vendor.com',
        phone: '+1-212-555-0100',
        bankAccounts: [{ bankKey: 'BNK001', bankAccountNumber: '123456', bankCountry: 'US' }],
        createdAt: new Date()
      };

      const vendor2: VendorMasterData = { ...vendor1, vendorId: 'V2' };

      const confidence = calculateConfidence(vendor1, vendor2);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('getRecommendedAction()', () => {
    it('should recommend immediate merge for exact match', () => {
      const duplicate: Omit<VendorDuplicate, 'recommendedAction'> = {
        duplicateId: 'DUP-1',
        primaryVendor: {} as VendorMasterData,
        duplicateVendor: {} as VendorMasterData,
        matchType: 'EXACT',
        matchScore: 100,
        matchReasons: [],
        confidence: 95,
        severity: 'CRITICAL',
        detectedAt: new Date(),
        status: 'OPEN'
      };

      const action = getRecommendedAction(duplicate);
      expect(action).toContain('MERGE_IMMEDIATELY');
    });

    it('should recommend review for tax ID match', () => {
      const duplicate: Omit<VendorDuplicate, 'recommendedAction'> = {
        duplicateId: 'DUP-1',
        primaryVendor: {} as VendorMasterData,
        duplicateVendor: {} as VendorMasterData,
        matchType: 'TAX_ID',
        matchScore: 95,
        matchReasons: [],
        confidence: 90,
        severity: 'CRITICAL',
        detectedAt: new Date(),
        status: 'OPEN'
      };

      const action = getRecommendedAction(duplicate);
      expect(action).toContain('MERGE_AFTER_REVIEW');
    });

    it('should recommend investigation for bank account match', () => {
      const duplicate: Omit<VendorDuplicate, 'recommendedAction'> = {
        duplicateId: 'DUP-1',
        primaryVendor: {} as VendorMasterData,
        duplicateVendor: {} as VendorMasterData,
        matchType: 'BANK_ACCOUNT',
        matchScore: 90,
        matchReasons: [],
        confidence: 85,
        severity: 'HIGH',
        detectedAt: new Date(),
        status: 'OPEN'
      };

      const action = getRecommendedAction(duplicate);
      expect(action).toContain('INVESTIGATE');
    });

    it('should recommend monitoring for medium severity', () => {
      const duplicate: Omit<VendorDuplicate, 'recommendedAction'> = {
        duplicateId: 'DUP-1',
        primaryVendor: {} as VendorMasterData,
        duplicateVendor: {} as VendorMasterData,
        matchType: 'FUZZY_NAME',
        matchScore: 70,
        matchReasons: [],
        confidence: 65,
        severity: 'MEDIUM',
        detectedAt: new Date(),
        status: 'OPEN'
      };

      const action = getRecommendedAction(duplicate);
      expect(action).toContain('MONITOR');
    });
  });

  describe('findDuplicates()', () => {
    it('should find duplicates above threshold', () => {
      const vendors: VendorMasterData[] = [
        {
          vendorId: 'V1',
          vendorName: 'Acme Corporation',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        },
        {
          vendorId: 'V2',
          vendorName: 'ACME Corp',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        }
      ];

      const duplicates = findDuplicates(vendors, 75);
      expect(duplicates.length).toBeGreaterThan(0);
    });

    it('should not find duplicates below threshold', () => {
      const vendors: VendorMasterData[] = [
        {
          vendorId: 'V1',
          vendorName: 'Acme Corporation',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        },
        {
          vendorId: 'V2',
          vendorName: 'Globex Industries',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        }
      ];

      const duplicates = findDuplicates(vendors, 95);
      expect(duplicates.length).toBe(0);
    });

    it('should sort by severity then match score', () => {
      const vendors: VendorMasterData[] = [
        {
          vendorId: 'V1',
          vendorName: 'Test Company',
          taxId: '11-1111111',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        },
        {
          vendorId: 'V2',
          vendorName: 'Test Company',  // Exact match
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        },
        {
          vendorId: 'V3',
          vendorName: 'Test Corp',  // Fuzzy match
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        }
      ];

      const duplicates = findDuplicates(vendors, 70);
      if (duplicates.length > 1) {
        // Highest severity should be first
        expect(duplicates[0].severity).toMatch(/CRITICAL|HIGH/);
      }
    });

    it('should avoid processing same pair twice', () => {
      const vendors: VendorMasterData[] = [
        {
          vendorId: 'V1',
          vendorName: 'Duplicate Vendor',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        },
        {
          vendorId: 'V2',
          vendorName: 'Duplicate Vendor',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        }
      ];

      const duplicates = findDuplicates(vendors);
      // Should only have one duplicate record for V1-V2 pair
      expect(duplicates.length).toBe(1);
    });

    it('should handle empty array', () => {
      const duplicates = findDuplicates([]);
      expect(duplicates).toEqual([]);
    });

    it('should handle single vendor', () => {
      const vendors: VendorMasterData[] = [
        {
          vendorId: 'V1',
          vendorName: 'Single Vendor',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        }
      ];

      const duplicates = findDuplicates(vendors);
      expect(duplicates).toEqual([]);
    });
  });

  describe('findDuplicatesForVendor()', () => {
    it('should find duplicates for target vendor', () => {
      const targetVendor: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Acme Corporation',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const allVendors: VendorMasterData[] = [
        targetVendor,
        {
          vendorId: 'V2',
          vendorName: 'ACME Corp',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        },
        {
          vendorId: 'V3',
          vendorName: 'Globex Industries',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        }
      ];

      const duplicates = findDuplicatesForVendor(targetVendor, allVendors, 75);
      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates.every(d => d.primaryVendor.vendorId === 'V1')).toBe(true);
    });

    it('should skip self-comparison', () => {
      const targetVendor: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Vendor',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const duplicates = findDuplicatesForVendor(targetVendor, [targetVendor], 75);
      expect(duplicates).toEqual([]);
    });

    it('should sort by match score descending', () => {
      const targetVendor: VendorMasterData = {
        vendorId: 'V1',
        vendorName: 'Test Vendor',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date()
      };

      const allVendors: VendorMasterData[] = [
        targetVendor,
        {
          vendorId: 'V2',
          vendorName: 'Test Vendor',  // Exact match
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        },
        {
          vendorId: 'V3',
          vendorName: 'Test Corp',  // Lower match
          country: 'US',
          bankAccounts: [],
          createdAt: new Date()
        }
      ];

      const duplicates = findDuplicatesForVendor(targetVendor, allVendors, 70);
      if (duplicates.length > 1) {
        expect(duplicates[0].matchScore).toBeGreaterThanOrEqual(duplicates[1].matchScore);
      }
    });
  });
});

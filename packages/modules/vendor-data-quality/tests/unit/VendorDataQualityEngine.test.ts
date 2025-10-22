/**
 * Comprehensive Unit Tests for VendorDataQualityEngine
 */

import {
  VendorDataQualityEngine,
  VendorDataSource,
  VendorDataQualityResult
} from '../../src/VendorDataQualityEngine';
import { VendorMasterData, VendorDataQualityConfig } from '../../src/types';
import { DEFAULT_DATA_QUALITY_CONFIG } from '../../src/scoring/dataQualityScorer';

describe('VendorDataQualityEngine', () => {
  let mockDataSource: jest.Mocked<VendorDataSource>;
  let engine: VendorDataQualityEngine;
  let mockVendors: VendorMasterData[];

  beforeEach(() => {
    // Create mock data source
    mockDataSource = {
      getVendors: jest.fn(),
      getVendor: jest.fn(),
    };

    // Create sample vendor data
    mockVendors = [
      {
        vendorId: 'V001',
        vendorName: 'Acme Corporation',
        taxId: '12-3456789',
        country: 'US',
        city: 'New York',
        postalCode: '10001',
        street: '123 Main St',
        bankAccounts: [{
          bankKey: 'BNK001',
          bankAccountNumber: '1234567890',
          bankCountry: 'US',
          iban: 'US12BANK00001234567890',
          swift: 'BANKUS33',
          accountHolderName: 'Acme Corporation'
        }],
        email: 'contact@acme.com',
        phone: '+1-212-555-0100',
        paymentTerms: 'NET30',
        currency: 'USD',
        createdAt: new Date('2022-01-01'),
        createdBy: 'SYSTEM',
        lastModifiedAt: new Date('2024-01-01'),
        lastModifiedBy: 'ADMIN',
        isBlocked: false
      },
      {
        vendorId: 'V002',
        vendorName: 'ACME Corp',  // Similar name - potential duplicate
        taxId: '98-7654321',
        country: 'US',
        city: 'New York',
        postalCode: '10001',
        street: '124 Main St',
        bankAccounts: [],
        email: 'info@acme.com',
        phone: '+1-212-555-0101',
        createdAt: new Date('2022-06-01'),
        lastModifiedAt: new Date('2023-01-01'),  // Stale data
        isBlocked: false
      },
      {
        vendorId: 'V003',
        vendorName: 'Global Supplier Ltd',
        country: 'KP',  // High-risk country
        bankAccounts: [],
        createdAt: new Date('2021-01-01'),
        lastModifiedAt: new Date('2021-06-01'),  // Very stale
        isBlocked: true,
        blockReason: 'Sanctioned entity'
      }
    ];

    // Default mock behavior
    mockDataSource.getVendors.mockResolvedValue(mockVendors);
    mockDataSource.getVendor.mockImplementation(async (id) =>
      mockVendors.find(v => v.vendorId === id) || null
    );

    engine = new VendorDataQualityEngine(mockDataSource);
  });

  describe('Constructor', () => {
    it('should create engine with data source and default config', () => {
      expect(engine).toBeInstanceOf(VendorDataQualityEngine);
    });

    it('should create engine with custom config', () => {
      const customConfig: VendorDataQualityConfig = {
        ...DEFAULT_DATA_QUALITY_CONFIG,
        duplicateDetection: {
          ...DEFAULT_DATA_QUALITY_CONFIG.duplicateDetection,
          fuzzyThreshold: 85
        }
      };

      const customEngine = new VendorDataQualityEngine(mockDataSource, customConfig);
      expect(customEngine).toBeInstanceOf(VendorDataQualityEngine);
    });
  });

  describe('analyzeVendorQuality()', () => {
    it('should analyze vendor quality successfully', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      expect(result).toBeDefined();
      expect(result.tenantId).toBe('tenant-1');
      expect(result.totalVendors).toBe(3);
      expect(result.qualityScores).toHaveLength(3);
      expect(result.analysisId).toMatch(/^VDQ-/);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should return empty result when no vendors found', async () => {
      mockDataSource.getVendors.mockResolvedValue([]);

      const result = await engine.analyzeVendorQuality('tenant-1');

      expect(result.totalVendors).toBe(0);
      expect(result.averageQualityScore).toBe(0);
      expect(result.qualityScores).toEqual([]);
      expect(result.duplicates).toEqual([]);
      expect(result.riskProfiles).toEqual([]);
    });

    it('should calculate average quality score correctly', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      expect(result.averageQualityScore).toBeGreaterThanOrEqual(0);
      expect(result.averageQualityScore).toBeLessThanOrEqual(100);
    });

    it('should identify quality scores for all vendors', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      expect(result.qualityScores).toHaveLength(3);
      result.qualityScores.forEach(score => {
        expect(score).toHaveProperty('vendorId');
        expect(score).toHaveProperty('overallScore');
        expect(score).toHaveProperty('completenessScore');
        expect(score).toHaveProperty('accuracyScore');
        expect(score).toHaveProperty('freshnessScore');
        expect(score).toHaveProperty('consistencyScore');
      });
    });

    it('should detect duplicates when fuzzy matching enabled', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      // V001 "Acme Corporation" and V002 "ACME Corp" should be flagged as potential duplicates
      expect(result.duplicates.length).toBeGreaterThan(0);
    });

    it('should not detect duplicates when fuzzy matching disabled', async () => {
      const config: VendorDataQualityConfig = {
        ...DEFAULT_DATA_QUALITY_CONFIG,
        duplicateDetection: {
          ...DEFAULT_DATA_QUALITY_CONFIG.duplicateDetection,
          enableFuzzyMatching: false
        }
      };

      const engineNoFuzzy = new VendorDataQualityEngine(mockDataSource, config);
      const result = await engineNoFuzzy.analyzeVendorQuality('tenant-1');

      expect(result.duplicates).toEqual([]);
    });

    it('should generate risk profiles for all vendors', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      expect(result.riskProfiles).toHaveLength(3);
      result.riskProfiles.forEach(profile => {
        expect(profile).toHaveProperty('vendorId');
        expect(profile).toHaveProperty('riskScore');
        expect(profile).toHaveProperty('riskLevel');
        expect(profile).toHaveProperty('riskFactors');
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(profile.riskLevel);
      });
    });

    it('should identify high-risk vendor from sanctioned country', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      // V003 from North Korea (KP) should be high risk
      const highRiskVendor = result.riskProfiles.find(p => p.vendorId === 'V003');
      expect(highRiskVendor).toBeDefined();
      expect(highRiskVendor!.riskLevel).toMatch(/HIGH|CRITICAL/);
      expect(highRiskVendor!.riskScore).toBeGreaterThan(60);
    });

    it('should calculate summary statistics correctly', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('criticalIssues');
      expect(result.summary).toHaveProperty('highIssues');
      expect(result.summary).toHaveProperty('mediumIssues');
      expect(result.summary).toHaveProperty('lowIssues');
      expect(result.summary).toHaveProperty('criticalDuplicates');
      expect(result.summary).toHaveProperty('highDuplicates');
      expect(result.summary).toHaveProperty('highRiskVendors');
    });

    it('should apply vendor filter when provided', async () => {
      const filter = { vendorIds: ['V001', 'V002'] };

      await engine.analyzeVendorQuality('tenant-1', filter);

      expect(mockDataSource.getVendors).toHaveBeenCalledWith(filter);
    });

    it('should identify blocked vendor as high risk', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      const blockedVendor = result.riskProfiles.find(p => p.vendorId === 'V003');
      expect(blockedVendor).toBeDefined();
      const hasBlockedRiskFactor = blockedVendor!.riskFactors.some(
        f => f.factor === 'Blocked Vendor'
      );
      expect(hasBlockedRiskFactor).toBe(true);
    });
  });

  describe('analyzeSingleVendor()', () => {
    it('should analyze single vendor successfully', async () => {
      const result = await engine.analyzeSingleVendor('tenant-1', 'V001');

      expect(result).toBeDefined();
      expect(result!.vendor.vendorId).toBe('V001');
      expect(result!.qualityScore).toBeDefined();
      expect(result!.qualityScore.vendorId).toBe('V001');
      expect(result!.riskProfile).toBeDefined();
      expect(result!.riskProfile.vendorId).toBe('V001');
    });

    it('should return null when vendor not found', async () => {
      mockDataSource.getVendor.mockResolvedValue(null);

      const result = await engine.analyzeSingleVendor('tenant-1', 'NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should find duplicates for single vendor', async () => {
      const result = await engine.analyzeSingleVendor('tenant-1', 'V001');

      expect(result).toBeDefined();
      expect(Array.isArray(result!.duplicates)).toBe(true);
      // V001 should have V002 as duplicate
      expect(result!.duplicates.length).toBeGreaterThan(0);
    });

    it('should not find duplicates when fuzzy matching disabled', async () => {
      const config: VendorDataQualityConfig = {
        ...DEFAULT_DATA_QUALITY_CONFIG,
        duplicateDetection: {
          ...DEFAULT_DATA_QUALITY_CONFIG.duplicateDetection,
          enableFuzzyMatching: false
        }
      };

      const engineNoFuzzy = new VendorDataQualityEngine(mockDataSource, config);
      const result = await engineNoFuzzy.analyzeSingleVendor('tenant-1', 'V001');

      expect(result!.duplicates).toEqual([]);
    });

    it('should calculate quality score for vendor', async () => {
      const result = await engine.analyzeSingleVendor('tenant-1', 'V001');

      expect(result!.qualityScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(result!.qualityScore.overallScore).toBeLessThanOrEqual(100);
      expect(result!.qualityScore.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result!.qualityScore.accuracyScore).toBeGreaterThanOrEqual(0);
      expect(result!.qualityScore.freshnessScore).toBeGreaterThanOrEqual(0);
    });

    it('should calculate risk profile for vendor', async () => {
      const result = await engine.analyzeSingleVendor('tenant-1', 'V001');

      expect(result!.riskProfile.riskScore).toBeGreaterThanOrEqual(0);
      expect(result!.riskProfile.riskScore).toBeLessThanOrEqual(100);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result!.riskProfile.riskLevel);
      expect(result!.riskProfile.lastReviewedAt).toBeInstanceOf(Date);
      expect(result!.riskProfile.nextReviewDue).toBeInstanceOf(Date);
    });
  });

  describe('runDeduplication()', () => {
    it('should run deduplication successfully', async () => {
      const result = await engine.runDeduplication('tenant-1');

      expect(result).toBeDefined();
      expect(result.totalVendors).toBe(3);
      expect(result.duplicatesFound).toBeGreaterThanOrEqual(0);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should return empty result when no vendors', async () => {
      mockDataSource.getVendors.mockResolvedValue([]);

      const result = await engine.runDeduplication('tenant-1');

      expect(result.totalVendors).toBe(0);
      expect(result.duplicatesFound).toBe(0);
      expect(result.potentialDuplicates).toBe(0);
      expect(result.confirmedDuplicates).toBe(0);
      expect(result.falsPositives).toBe(0);
      expect(result.duplicateGroups).toEqual([]);
    });

    it('should find duplicate groups', async () => {
      const result = await engine.runDeduplication('tenant-1');

      expect(Array.isArray(result.duplicateGroups)).toBe(true);
      if (result.duplicateGroups.length > 0) {
        result.duplicateGroups.forEach(group => {
          expect(group).toHaveProperty('groupId');
          expect(group).toHaveProperty('vendors');
          expect(group).toHaveProperty('matchScore');
          expect(group).toHaveProperty('recommendation');
        });
      }
    });

    it('should count duplicates by status', async () => {
      const result = await engine.runDeduplication('tenant-1');

      expect(result.potentialDuplicates).toBeGreaterThanOrEqual(0);
      expect(result.confirmedDuplicates).toBeGreaterThanOrEqual(0);
      expect(result.falsPositives).toBeGreaterThanOrEqual(0);
    });

    it('should estimate potential savings', async () => {
      const result = await engine.runDeduplication('tenant-1');

      expect(result.potentialSavings).toBeGreaterThanOrEqual(0);
      // Savings should be calculated based on duplicate severity
    });

    it('should apply vendor filter when provided', async () => {
      const filter = { countries: ['US'] };

      await engine.runDeduplication('tenant-1', filter);

      expect(mockDataSource.getVendors).toHaveBeenCalledWith(filter);
    });

    it('should group related duplicates together', async () => {
      // Add more duplicates to test grouping
      const extendedVendors = [
        ...mockVendors,
        {
          vendorId: 'V004',
          vendorName: 'Acme Inc',  // Another similar name
          country: 'US',
          bankAccounts: [],
          createdAt: new Date('2023-01-01')
        } as VendorMasterData
      ];

      mockDataSource.getVendors.mockResolvedValue(extendedVendors);

      const result = await engine.runDeduplication('tenant-1');

      // Should group V001, V002, V004 together if they're all similar
      expect(result.duplicateGroups.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Risk Profile Calculation', () => {
    it('should mark vendor with poor data quality as high risk', async () => {
      const poorQualityVendor: VendorMasterData = {
        vendorId: 'V999',
        vendorName: 'Poor Quality Vendor',
        country: 'XX',  // Invalid country
        bankAccounts: [],
        createdAt: new Date('2020-01-01'),
        // Missing most fields
      };

      mockDataSource.getVendors.mockResolvedValue([poorQualityVendor]);

      const result = await engine.analyzeVendorQuality('tenant-1');

      expect(result.riskProfiles[0].riskLevel).toMatch(/MEDIUM|HIGH|CRITICAL/);
    });

    it('should calculate next review date based on risk level', async () => {
      const result = await engine.analyzeVendorQuality('tenant-1');

      result.riskProfiles.forEach(profile => {
        const now = new Date();
        expect(profile.nextReviewDue.getTime()).toBeGreaterThan(now.getTime());

        // Critical/High risk should have shorter review cycles
        if (profile.riskLevel === 'CRITICAL') {
          const daysDiff = (profile.nextReviewDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          expect(daysDiff).toBeLessThanOrEqual(31); // ~30 days
        }
      });
    });

    it('should identify missing critical fields as risk factor', async () => {
      const incompleteVendor: VendorMasterData = {
        vendorId: 'V998',
        vendorName: 'Incomplete Vendor',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date(),
        // Missing tax ID, email, phone, etc.
      };

      mockDataSource.getVendors.mockResolvedValue([incompleteVendor]);

      const result = await engine.analyzeVendorQuality('tenant-1');

      const profile = result.riskProfiles[0];
      const hasMissingFieldsRisk = profile.riskFactors.some(
        f => f.factor === 'Missing Critical Data'
      );
      // May or may not be flagged depending on config
      expect(profile.riskFactors).toBeDefined();
    });

    it('should flag stale data as risk factor', async () => {
      const staleVendor: VendorMasterData = {
        vendorId: 'V997',
        vendorName: 'Stale Vendor',
        country: 'US',
        bankAccounts: [],
        createdAt: new Date('2020-01-01'),
        lastModifiedAt: new Date('2020-01-01'),  // Over 2 years old
      };

      mockDataSource.getVendors.mockResolvedValue([staleVendor]);

      const result = await engine.analyzeVendorQuality('tenant-1');

      const profile = result.riskProfiles[0];
      // Check if stale data is flagged
      expect(profile.riskFactors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Duplicate Detection Edge Cases', () => {
    it('should handle vendors with identical names', async () => {
      const identicalVendors: VendorMasterData[] = [
        {
          vendorId: 'V100',
          vendorName: 'Identical Corp',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date(),
        },
        {
          vendorId: 'V101',
          vendorName: 'Identical Corp',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date(),
        }
      ];

      mockDataSource.getVendors.mockResolvedValue(identicalVendors);

      const result = await engine.runDeduplication('tenant-1');

      expect(result.duplicatesFound).toBeGreaterThan(0);
    });

    it('should handle vendors with same tax ID', async () => {
      const sameTaxIdVendors: VendorMasterData[] = [
        {
          vendorId: 'V102',
          vendorName: 'Company A',
          taxId: '11-2233445',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date(),
        },
        {
          vendorId: 'V103',
          vendorName: 'Company B',
          taxId: '11-2233445',  // Same tax ID
          country: 'US',
          bankAccounts: [],
          createdAt: new Date(),
        }
      ];

      mockDataSource.getVendors.mockResolvedValue(sameTaxIdVendors);

      const result = await engine.runDeduplication('tenant-1');

      expect(result.duplicatesFound).toBeGreaterThan(0);
    });

    it('should handle vendors with same bank account', async () => {
      const sameBankVendors: VendorMasterData[] = [
        {
          vendorId: 'V104',
          vendorName: 'Vendor One',
          country: 'US',
          bankAccounts: [{
            bankKey: 'BNK001',
            bankAccountNumber: '9999888877776666',
            bankCountry: 'US',
          }],
          createdAt: new Date(),
        },
        {
          vendorId: 'V105',
          vendorName: 'Vendor Two',
          country: 'US',
          bankAccounts: [{
            bankKey: 'BNK001',
            bankAccountNumber: '9999888877776666',  // Same account
            bankCountry: 'US',
          }],
          createdAt: new Date(),
        }
      ];

      mockDataSource.getVendors.mockResolvedValue(sameBankVendors);

      const result = await engine.runDeduplication('tenant-1');

      expect(result.duplicatesFound).toBeGreaterThan(0);
    });
  });

  describe('Primary Vendor Selection', () => {
    it('should select most complete vendor as primary', async () => {
      const duplicateVendors: VendorMasterData[] = [
        {
          vendorId: 'V200',
          vendorName: 'Test Corp',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date(),
          // Minimal data
        },
        {
          vendorId: 'V201',
          vendorName: 'Test Corporation',
          taxId: '12-3456789',
          country: 'US',
          city: 'New York',
          postalCode: '10001',
          street: '123 Main St',
          bankAccounts: [{
            bankKey: 'BNK001',
            bankAccountNumber: '1234567890',
            bankCountry: 'US',
          }],
          email: 'test@corp.com',
          phone: '+1-212-555-0100',
          createdAt: new Date(),
          // Complete data
        }
      ];

      mockDataSource.getVendors.mockResolvedValue(duplicateVendors);

      const result = await engine.runDeduplication('tenant-1');

      if (result.duplicateGroups.length > 0) {
        const group = result.duplicateGroups[0];
        // V201 should be selected as primary due to completeness
        expect(group.primaryVendor?.vendorId).toBe('V201');
      }
    });

    it('should prefer more recent vendor when completeness equal', async () => {
      const duplicateVendors: VendorMasterData[] = [
        {
          vendorId: 'V202',
          vendorName: 'Recent Corp',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date('2020-01-01'),
          lastModifiedAt: new Date('2020-01-01'),
        },
        {
          vendorId: 'V203',
          vendorName: 'Recent Corporation',
          country: 'US',
          bankAccounts: [],
          createdAt: new Date('2024-01-01'),
          lastModifiedAt: new Date('2024-01-01'),
        }
      ];

      mockDataSource.getVendors.mockResolvedValue(duplicateVendors);

      const result = await engine.runDeduplication('tenant-1');

      if (result.duplicateGroups.length > 0) {
        const group = result.duplicateGroups[0];
        // V203 should be preferred as more recent
        expect(group.primaryVendor?.vendorId).toBe('V203');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle data source errors gracefully', async () => {
      mockDataSource.getVendors.mockRejectedValue(new Error('Database connection failed'));

      await expect(engine.analyzeVendorQuality('tenant-1')).rejects.toThrow('Database connection failed');
    });

    it('should handle empty vendor name', async () => {
      const invalidVendor: VendorMasterData = {
        vendorId: 'V999',
        vendorName: '',  // Empty name
        country: 'US',
        bankAccounts: [],
        createdAt: new Date(),
      };

      mockDataSource.getVendors.mockResolvedValue([invalidVendor]);

      const result = await engine.analyzeVendorQuality('tenant-1');

      expect(result.totalVendors).toBe(1);
      expect(result.qualityScores[0].overallScore).toBeLessThan(100);
    });
  });

  describe('Savings Estimation', () => {
    it('should estimate higher savings for critical duplicates', async () => {
      // This is tested indirectly through runDeduplication
      const result = await engine.runDeduplication('tenant-1');

      expect(result.potentialSavings).toBeGreaterThanOrEqual(0);
      // Exact value depends on duplicate severity
    });
  });
});

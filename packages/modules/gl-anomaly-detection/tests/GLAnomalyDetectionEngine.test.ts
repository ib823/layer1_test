/**
 * Comprehensive Test Suite for GL Anomaly Detection Engine
 * Covers Benford's Law, Statistical Outliers, Behavioral Patterns, and Integration Tests
 */

import { GLAnomalyDetectionEngine, GLDataSource } from '../src/GLAnomalyDetectionEngine';
import { GLLineItem } from '../src/types';

describe('GLAnomalyDetectionEngine', () => {
  let engine: GLAnomalyDetectionEngine;
  let mockDataSource: jest.Mocked<GLDataSource>;

  beforeEach(() => {
    mockDataSource = {
      getGLLineItems: jest.fn(),
    };
    engine = new GLAnomalyDetectionEngine(mockDataSource);
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(GLAnomalyDetectionEngine);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        benfordLaw: { enabled: false, minTransactions: 50, significanceLevel: 0.01 },
        statisticalOutliers: { enabled: true, method: 'Z_SCORE' as const, zScoreThreshold: 4.0, iqrMultiplier: 2.0 },
        behavioralAnomalies: { enabled: true, checkAfterHours: true, checkWeekends: true, afterHoursStart: 20, afterHoursEnd: 6, checkReversals: true, sameDayReversalWindow: 12 },
        velocityAnalysis: { enabled: true, deviationThreshold: 150, lookbackPeriods: 6 },
        roundNumbers: { enabled: true, thresholds: [5000, 10000], minOccurrences: 3 },
        duplicateDetection: { enabled: true, timeWindow: 48, amountTolerance: 0.05 }
      };
      const customEngine = new GLAnomalyDetectionEngine(mockDataSource, customConfig);
      expect(customEngine).toBeDefined();
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty dataset gracefully', async () => {
      mockDataSource.getGLLineItems.mockResolvedValue([]);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      expect(result.anomalies).toHaveLength(0);
      expect(result.totalLineItems).toBe(0);
      expect(result.anomaliesDetected).toBe(0);
      expect(result.summary.criticalAnomalies).toBe(0);
    });

    it('should return proper structure for empty data', async () => {
      mockDataSource.getGLLineItems.mockResolvedValue([]);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
      });

      expect(result).toHaveProperty('analysisId');
      expect(result).toHaveProperty('tenantId', 'tenant-1');
      expect(result).toHaveProperty('fiscalYear', '2025');
      expect(result).toHaveProperty('completedAt');
      expect(result.summary).toHaveProperty('criticalAnomalies');
      expect(result.summary).toHaveProperty('estimatedFraudRisk');
    });
  });

  describe("Benford's Law Analysis", () => {
    it('should detect violations of Benford\'s Law', async () => {
      // Create test data that violates Benford's Law (too many 9s)
      const testData: GLLineItem[] = Array.from({ length: 100 }, (_, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: 9000 + i, // Leading digit 9 - violates Benford's
        currency: 'USD',
        debitCredit: 'DEBIT',
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Test transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      const benfordAnomalies = result.anomalies.filter(
        a => a.anomalyType === 'BENFORD_LAW_VIOLATION'
      );
      expect(benfordAnomalies.length).toBeGreaterThan(0);
      expect(benfordAnomalies[0]).toHaveProperty('severity');
      expect(['HIGH', 'CRITICAL']).toContain(benfordAnomalies[0].severity);
    });

    it('should pass with natural distribution', async () => {
      // Natural distribution following Benford's Law
      const testData: GLLineItem[] = [
        ...Array.from({ length: 30 }, (_, i) => ({ amount: 1000 + i * 10, digit: 1 })),
        ...Array.from({ length: 18 }, (_, i) => ({ amount: 2000 + i * 10, digit: 2 })),
        ...Array.from({ length: 12 }, (_, i) => ({ amount: 3000 + i * 10, digit: 3 })),
        ...Array.from({ length: 10 }, (_, i) => ({ amount: 4000 + i * 10, digit: 4 })),
        ...Array.from({ length: 8 }, (_, i) => ({ amount: 5000 + i * 10, digit: 5 })),
        ...Array.from({ length: 7 }, (_, i) => ({ amount: 6000 + i * 10, digit: 6 })),
        ...Array.from({ length: 6 }, (_, i) => ({ amount: 7000 + i * 10, digit: 7 })),
        ...Array.from({ length: 5 }, (_, i) => ({ amount: 8000 + i * 10, digit: 8 })),
        ...Array.from({ length: 4 }, (_, i) => ({ amount: 9000 + i * 10, digit: 9 })),
      ].map((item, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: item.amount,
        currency: 'USD',
        debitCredit: 'DEBIT',
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Test transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      const benfordAnomalies = result.anomalies.filter(
        a => a.anomalyType === 'BENFORD_LAW_VIOLATION'
      );
      // Should have few or no Benford anomalies with natural distribution
      expect(benfordAnomalies.length).toBeLessThan(2);
    });

    it('should require minimum transaction count for Benford analysis', async () => {
      // Less than 100 transactions
      const testData: GLLineItem[] = Array.from({ length: 50 }, (_, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: 9000 + i,
        currency: 'USD',
        debitCredit: 'DEBIT',
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Test transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      // Should not run Benford analysis with < 100 transactions
      const benfordAnomalies = result.anomalies.filter(
        a => a.anomalyType === 'BENFORD_LAW_VIOLATION'
      );
      expect(benfordAnomalies).toHaveLength(0);
    });
  });

  describe('Statistical Outlier Detection', () => {
    it('should detect outliers using IQR method', async () => {
      const testData: GLLineItem[] = [
        ...Array.from({ length: 95 }, (_, i) => ({ amount: 100 + i })),
        { amount: 10000 }, // Outlier
        { amount: 15000 }, // Outlier
        { amount: 20000 }, // Outlier
        { amount: 110 },
        { amount: 120 },
      ].map((item, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: item.amount,
        currency: 'USD',
        debitCredit: 'DEBIT',
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Test transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      const outliers = result.anomalies.filter(
        a => a.anomalyType === 'STATISTICAL_OUTLIER'
      );
      expect(outliers.length).toBeGreaterThanOrEqual(2);
      expect(outliers[0]).toHaveProperty('score');
      expect(outliers[0].score).toBeGreaterThan(0);
    });

    it('should calculate correct severity for outliers', async () => {
      const testData: GLLineItem[] = [
        ...Array.from({ length: 90 }, (_, i) => ({ amount: 1000 + i })),
        { amount: 50000 }, // Extreme outlier
        ...Array.from({ length: 9 }, (_, i) => ({ amount: 1000 + i })),
      ].map((item, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: item.amount,
        currency: 'USD',
        debitCredit: 'DEBIT',
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Test transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      const extremeOutliers = result.anomalies.filter(
        a => a.anomalyType === 'STATISTICAL_OUTLIER' && a.lineItems[0].amount === 50000
      );
      expect(extremeOutliers.length).toBeGreaterThan(0);
      expect(['HIGH', 'CRITICAL']).toContain(extremeOutliers[0].severity);
    });
  });

  describe('Behavioral Anomaly Detection', () => {
    describe('After-Hours Postings', () => {
      it('should detect postings after business hours', async () => {
        const testData: GLLineItem[] = [
          {
            documentNumber: 'DOC000001',
            lineItem: '001',
            glAccount: '100000',
            glAccountName: 'Cash',
            companyCode: '1000',
            fiscalYear: '2025',
            fiscalPeriod: '001',
            postingDate: new Date('2025-01-15T22:30:00'), // 10:30 PM
            documentDate: new Date('2025-01-15'),
            amount: 5000,
            currency: 'USD',
            debitCredit: 'DEBIT',
            documentType: 'SA',
            reference: 'REF001',
            description: 'Late posting',
            userId: 'USER001',
            userName: 'Test User',
            postingTime: '22:30:00',
            isReversal: false,
          },
          {
            documentNumber: 'DOC000002',
            lineItem: '001',
            glAccount: '100000',
            glAccountName: 'Cash',
            companyCode: '1000',
            fiscalYear: '2025',
            fiscalPeriod: '001',
            postingDate: new Date('2025-01-16T03:00:00'), // 3 AM
            documentDate: new Date('2025-01-16'),
            amount: 3000,
            currency: 'USD',
            debitCredit: 'DEBIT',
            documentType: 'SA',
            reference: 'REF002',
            description: 'Early morning posting',
            userId: 'USER001',
            userName: 'Test User',
            postingTime: '03:00:00',
            isReversal: false,
          },
        ];

        mockDataSource.getGLLineItems.mockResolvedValue(testData);

        const result = await engine.detectAnomalies('tenant-1', {
          fiscalYear: '2025',
          fiscalPeriod: '001',
        });

        const afterHoursAnomalies = result.anomalies.filter(
          a => a.anomalyType === 'AFTER_HOURS_POSTING'
        );
        expect(afterHoursAnomalies.length).toBeGreaterThanOrEqual(1);
        expect(afterHoursAnomalies[0]).toHaveProperty('description');
        expect(afterHoursAnomalies[0].description).toContain('after hours');
      });

      it('should detect weekend postings', async () => {
        const testData: GLLineItem[] = [
          {
            documentNumber: 'DOC000001',
            lineItem: '001',
            glAccount: '100000',
            glAccountName: 'Cash',
            companyCode: '1000',
            fiscalYear: '2025',
            fiscalPeriod: '001',
            postingDate: new Date('2025-01-18T10:00:00'), // Saturday
            documentDate: new Date('2025-01-18'),
            amount: 5000,
            currency: 'USD',
            debitCredit: 'DEBIT',
            documentType: 'SA',
            reference: 'REF001',
            description: 'Weekend posting',
            userId: 'USER001',
            userName: 'Test User',
            isReversal: false,
          },
          {
            documentNumber: 'DOC000002',
            lineItem: '001',
            glAccount: '100000',
            glAccountName: 'Cash',
            companyCode: '1000',
            fiscalYear: '2025',
            fiscalPeriod: '001',
            postingDate: new Date('2025-01-19T14:00:00'), // Sunday
            documentDate: new Date('2025-01-19'),
            amount: 3000,
            currency: 'USD',
            debitCredit: 'DEBIT',
            documentType: 'SA',
            reference: 'REF002',
            description: 'Sunday posting',
            userId: 'USER001',
            userName: 'Test User',
            isReversal: false,
          },
        ];

        mockDataSource.getGLLineItems.mockResolvedValue(testData);

        const result = await engine.detectAnomalies('tenant-1', {
          fiscalYear: '2025',
          fiscalPeriod: '001',
        });

        const weekendAnomalies = result.anomalies.filter(
          a => a.anomalyType === 'WEEKEND_POSTING'
        );
        expect(weekendAnomalies.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Same-Day Reversals', () => {
      it('should detect same-day reversals', async () => {
        const testData: GLLineItem[] = [
          {
            documentNumber: 'DOC000001',
            lineItem: '001',
            glAccount: '100000',
            glAccountName: 'Cash',
            companyCode: '1000',
            fiscalYear: '2025',
            fiscalPeriod: '001',
            postingDate: new Date('2025-01-15T10:00:00'),
            documentDate: new Date('2025-01-15'),
            amount: 5000,
            currency: 'USD',
            debitCredit: 'DEBIT',
            documentType: 'SA',
            reference: 'REF001',
            description: 'Original entry',
            userId: 'USER001',
            userName: 'Test User',
            isReversal: false,
          },
          {
            documentNumber: 'DOC000002',
            lineItem: '001',
            glAccount: '100000',
            glAccountName: 'Cash',
            companyCode: '1000',
            fiscalYear: '2025',
            fiscalPeriod: '001',
            postingDate: new Date('2025-01-15T15:00:00'),
            documentDate: new Date('2025-01-15'),
            amount: 5000,
            currency: 'USD',
            debitCredit: 'CREDIT',
            documentType: 'SA',
            reference: 'REF001',
            description: 'Reversal entry',
            userId: 'USER001',
            userName: 'Test User',
            reversalDocumentNumber: 'DOC000001',
            isReversal: true,
          },
        ];

        mockDataSource.getGLLineItems.mockResolvedValue(testData);

        const result = await engine.detectAnomalies('tenant-1', {
          fiscalYear: '2025',
          fiscalPeriod: '001',
        });

        const reversalAnomalies = result.anomalies.filter(
          a => a.anomalyType === 'SAME_DAY_REVERSAL'
        );
        expect(reversalAnomalies.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Round Number Pattern Detection', () => {
    it('should detect suspicious round numbers', async () => {
      const testData: GLLineItem[] = [
        { amount: 10000 },
        { amount: 50000 },
        { amount: 100000 },
        { amount: 1000000 },
        { amount: 5000 },
        { amount: 15000 },
      ].map((item, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: item.amount,
        currency: 'USD',
        debitCredit: 'DEBIT',
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Round number transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      const roundNumberAnomalies = result.anomalies.filter(
        a => a.anomalyType === 'ROUND_NUMBER_PATTERN'
      );
      expect(roundNumberAnomalies.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect exact duplicates', async () => {
      const baseEntry = {
        documentNumber: 'DOC000001',
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: 5000,
        currency: 'USD',
        debitCredit: 'DEBIT' as const,
        documentType: 'SA',
        reference: 'REF001',
        description: 'Duplicate transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      };

      const testData: GLLineItem[] = [
        baseEntry,
        { ...baseEntry, documentNumber: 'DOC000002' },
      ];

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      const duplicateAnomalies = result.anomalies.filter(
        a => a.anomalyType === 'DUPLICATE_ENTRY'
      );
      expect(duplicateAnomalies.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should run all detection methods', async () => {
      const testData: GLLineItem[] = Array.from({ length: 100 }, (_, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: Math.random() * 10000,
        currency: 'USD',
        debitCredit: i % 2 === 0 ? 'DEBIT' as const : 'CREDIT' as const,
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Test transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      expect(result.totalLineItems).toBe(100);
      expect(result.summary).toHaveProperty('criticalAnomalies');
      expect(result.summary).toHaveProperty('highAnomalies');
      expect(result.summary).toHaveProperty('mediumAnomalies');
      expect(result.summary).toHaveProperty('lowAnomalies');
      expect(result.summary).toHaveProperty('byType');
      expect(result.summary).toHaveProperty('estimatedFraudRisk');
      expect(result).toHaveProperty('accountStats');
      expect(result.accountStats).toBeDefined();
    });

    it('should calculate correct risk scores', async () => {
      const testData: GLLineItem[] = [
        {
          documentNumber: 'DOC000001',
          lineItem: '001',
          glAccount: '100000',
          glAccountName: 'Cash',
          companyCode: '1000',
          fiscalYear: '2025',
          fiscalPeriod: '001',
          postingDate: new Date('2025-01-18T23:00:00'), // Weekend + after hours
          documentDate: new Date('2025-01-18'),
          amount: 1000000, // High amount
          currency: 'USD',
          debitCredit: 'DEBIT',
          documentType: 'SA',
          reference: 'REF001',
          description: 'High risk transaction',
          userId: 'USER001',
          userName: 'Test User',
          isReversal: false,
        },
      ];

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
      const highRiskAnomaly = result.anomalies.find(
        a => a.lineItems[0].documentNumber === 'DOC000001'
      );
      expect(highRiskAnomaly).toBeDefined();
      if (highRiskAnomaly) {
        expect(highRiskAnomaly.score).toBeGreaterThan(0);
        expect(['HIGH', 'CRITICAL']).toContain(highRiskAnomaly.severity);
      }
    });

    it('should generate proper summary statistics', async () => {
      const testData: GLLineItem[] = Array.from({ length: 50 }, (_, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: 1000 + i * 100,
        currency: 'USD',
        debitCredit: 'DEBIT' as const,
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Test transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const result = await engine.detectAnomalies('tenant-1', {
        fiscalYear: '2025',
        fiscalPeriod: '001',
      });

      expect(result.summary.criticalAnomalies).toBeGreaterThanOrEqual(0);
      expect(result.summary.highAnomalies).toBeGreaterThanOrEqual(0);
      expect(result.summary.mediumAnomalies).toBeGreaterThanOrEqual(0);
      expect(result.summary.lowAnomalies).toBeGreaterThanOrEqual(0);
      const totalFromSummary =
        result.summary.criticalAnomalies +
        result.summary.highAnomalies +
        result.summary.mediumAnomalies +
        result.summary.lowAnomalies;
      expect(totalFromSummary).toBe(result.anomaliesDetected);
    });
  });

  describe('Error Handling', () => {
    it('should handle data source errors gracefully', async () => {
      mockDataSource.getGLLineItems.mockRejectedValue(
        new Error('SAP connection failed')
      );

      await expect(
        engine.detectAnomalies('tenant-1', {
          fiscalYear: '2025',
          fiscalPeriod: '001',
        })
      ).rejects.toThrow('SAP connection failed');
    });

    it('should require filter parameter', async () => {
      await expect(
        engine.detectAnomalies('tenant-1', null as any)
      ).rejects.toThrow('Filter is required');
    });

    it('should handle malformed data', async () => {
      const badData: any[] = [
        {
          documentNumber: 'DOC000001',
          // Missing required fields
          amount: 1000,
        },
      ];

      mockDataSource.getGLLineItems.mockResolvedValue(badData);

      // Should throw or handle gracefully with missing fields
      await expect(
        engine.detectAnomalies('tenant-1', {
          fiscalYear: '2025',
        })
      ).rejects.toThrow();
    });
  });

  describe('GL Account Risk Profiling', () => {
    it('should analyze specific GL account risk', async () => {
      const testData: GLLineItem[] = Array.from({ length: 20 }, (_, i) => ({
        documentNumber: `DOC${i.toString().padStart(6, '0')}`,
        lineItem: '001',
        glAccount: '100000',
        glAccountName: 'Cash',
        companyCode: '1000',
        fiscalYear: '2025',
        fiscalPeriod: '001',
        postingDate: new Date('2025-01-15T10:00:00'),
        documentDate: new Date('2025-01-15'),
        amount: 1000 + i * 500,
        currency: 'USD',
        debitCredit: 'DEBIT' as const,
        documentType: 'SA',
        reference: `REF${i}`,
        description: 'Test transaction',
        userId: 'USER001',
        userName: 'Test User',
        isReversal: false,
      }));

      mockDataSource.getGLLineItems.mockResolvedValue(testData);

      const profile = await engine.analyzeGLAccount('tenant-1', '100000', '2025', '001');

      expect(profile).toHaveProperty('glAccount', '100000');
      expect(profile).toHaveProperty('riskScore');
      expect(profile).toHaveProperty('riskLevel');
      expect(profile).toHaveProperty('anomalyCount');
      expect(profile).toHaveProperty('recommendations');
      expect(Array.isArray(profile.recommendations)).toBe(true);
      expect(profile.riskScore).toBeGreaterThanOrEqual(0);
      expect(profile.riskScore).toBeLessThanOrEqual(100);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(profile.riskLevel);
    });
  });
});

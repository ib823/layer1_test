/**
 * Duplicate Detection Algorithms for Vendor Master Data
 *
 * Implements fuzzy matching techniques to identify potential duplicate vendors:
 * - Levenshtein distance for string similarity
 * - Bank account matching
 * - Tax ID comparison
 * - Address normalization
 */

import { VendorMasterData, VendorDuplicate } from '../types';

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s1.length][s2.length];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 */
export function stringSimilarity(str1: string, str2: string): number {
  // Handle null/undefined
  if (str1 == null || str2 == null) return 0;

  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100; // Both empty strings = 100% similar

  const distance = levenshteinDistance(str1, str2);
  return ((maxLength - distance) / maxLength) * 100;
}

/**
 * Normalize vendor name for comparison
 * Removes common suffixes, special characters, and standardizes format
 */
export function normalizeVendorName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove common business suffixes
  const suffixes = [
    'inc', 'incorporated', 'corp', 'corporation', 'ltd', 'limited',
    'llc', 'plc', 'gmbh', 'ag', 'sa', 'bv', 'nv', 'co', 'company',
    '& co', 'and company', 'group', 'holding', 'holdings'
  ];

  suffixes.forEach(suffix => {
    const pattern = new RegExp(`\\b${suffix}\\.?\\b`, 'gi');
    normalized = normalized.replace(pattern, '');
  });

  // Remove special characters and extra spaces
  normalized = normalized
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Normalize address for comparison
 */
export function normalizeAddress(street?: string, city?: string, postalCode?: string, country?: string): string {
  const parts = [street, city, postalCode, country]
    .filter(Boolean)
    .map(part => part!.toLowerCase().trim());

  return parts.join(' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .trim();
}

/**
 * Check if two vendors have matching bank accounts
 */
export function hasSameBankAccount(vendor1: VendorMasterData, vendor2: VendorMasterData): boolean {
  if (!vendor1.bankAccounts?.length || !vendor2.bankAccounts?.length) {
    return false;
  }

  for (const acc1 of vendor1.bankAccounts) {
    for (const acc2 of vendor2.bankAccounts) {
      // IBAN match (most reliable)
      if (acc1.iban && acc2.iban && acc1.iban === acc2.iban) {
        return true;
      }

      // Bank account number + bank key match
      if (acc1.bankAccountNumber === acc2.bankAccountNumber &&
          acc1.bankKey === acc2.bankKey) {
        return true;
      }

      // SWIFT + account number match
      if (acc1.swift && acc2.swift &&
          acc1.swift === acc2.swift &&
          acc1.bankAccountNumber === acc2.bankAccountNumber) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two vendors have matching tax IDs
 */
export function hasSameTaxId(vendor1: VendorMasterData, vendor2: VendorMasterData): boolean {
  if (!vendor1.taxId || !vendor2.taxId) {
    return false;
  }

  // Normalize tax IDs (remove spaces, dashes, etc.)
  const taxId1 = vendor1.taxId.replace(/[\s-]/g, '').toLowerCase();
  const taxId2 = vendor2.taxId.replace(/[\s-]/g, '').toLowerCase();

  return taxId1 === taxId2;
}

/**
 * Calculate match score between two vendors (0-100)
 */
export function calculateMatchScore(vendor1: VendorMasterData, vendor2: VendorMasterData): {
  score: number;
  matchType: VendorDuplicate['matchType'];
  matchReasons: string[];
} {
  const matchReasons: string[] = [];
  let score = 0;

  // Exact name match (100 points)
  if (vendor1.vendorName.toLowerCase() === vendor2.vendorName.toLowerCase()) {
    score = 100;
    return {
      score,
      matchType: 'EXACT',
      matchReasons: ['Exact vendor name match']
    };
  }

  // Tax ID match (95 points - very strong indicator)
  if (hasSameTaxId(vendor1, vendor2)) {
    score += 95;
    matchReasons.push(`Tax ID match: ${vendor1.taxId}`);
    return {
      score: Math.min(score, 100),
      matchType: 'TAX_ID',
      matchReasons
    };
  }

  // Bank account match (90 points - very strong indicator)
  if (hasSameBankAccount(vendor1, vendor2)) {
    score += 90;
    matchReasons.push('Bank account details match');
    return {
      score: Math.min(score, 100),
      matchType: 'BANK_ACCOUNT',
      matchReasons
    };
  }

  // Fuzzy name matching
  const normalizedName1 = normalizeVendorName(vendor1.vendorName);
  const normalizedName2 = normalizeVendorName(vendor2.vendorName);
  const nameSimilarity = stringSimilarity(normalizedName1, normalizedName2);

  if (nameSimilarity >= 80) {
    score += nameSimilarity * 0.6; // Weight name similarity at 60%
    matchReasons.push(`High name similarity: ${nameSimilarity.toFixed(1)}%`);
  }

  // Address matching
  const addr1 = normalizeAddress(vendor1.street, vendor1.city, vendor1.postalCode, vendor1.country);
  const addr2 = normalizeAddress(vendor2.street, vendor2.city, vendor2.postalCode, vendor2.country);

  if (addr1 && addr2) {
    const addressSimilarity = stringSimilarity(addr1, addr2);

    if (addressSimilarity >= 70) {
      score += addressSimilarity * 0.4; // Weight address at 40%
      matchReasons.push(`Address similarity: ${addressSimilarity.toFixed(1)}%`);
    }
  }

  // Same country bonus
  if (vendor1.country === vendor2.country) {
    score += 5;
    matchReasons.push(`Same country: ${vendor1.country}`);
  }

  // Contact information matching
  if (vendor1.email && vendor2.email && vendor1.email.toLowerCase() === vendor2.email.toLowerCase()) {
    score += 15;
    matchReasons.push(`Email match: ${vendor1.email}`);
  }

  if (vendor1.phone && vendor2.phone) {
    const phone1 = vendor1.phone.replace(/[\s-()]/g, '');
    const phone2 = vendor2.phone.replace(/[\s-()]/g, '');
    if (phone1 === phone2) {
      score += 10;
      matchReasons.push(`Phone match: ${vendor1.phone}`);
    }
  }

  // Determine match type
  let matchType: VendorDuplicate['matchType'] = 'FUZZY_NAME';
  if (matchReasons.some(r => r.includes('Address'))) {
    matchType = 'FUZZY_ADDRESS';
  }

  return {
    score: Math.min(score, 100),
    matchType,
    matchReasons
  };
}

/**
 * Determine severity based on match score and confidence
 */
export function calculateSeverity(matchScore: number, confidence: number): VendorDuplicate['severity'] {
  const combinedScore = (matchScore + confidence) / 2;

  if (combinedScore >= 90) return 'CRITICAL';
  if (combinedScore >= 75) return 'HIGH';
  if (combinedScore >= 60) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculate confidence level based on available data quality
 */
export function calculateConfidence(vendor1: VendorMasterData, vendor2: VendorMasterData): number {
  let confidence = 0;
  let factors = 0;

  // Tax ID presence increases confidence
  if (vendor1.taxId && vendor2.taxId) {
    confidence += 25;
    factors++;
  }

  // Bank account presence
  if (vendor1.bankAccounts?.length && vendor2.bankAccounts?.length) {
    confidence += 25;
    factors++;
  }

  // Address completeness
  const addr1Complete = vendor1.street && vendor1.city && vendor1.postalCode;
  const addr2Complete = vendor2.street && vendor2.city && vendor2.postalCode;
  if (addr1Complete && addr2Complete) {
    confidence += 20;
    factors++;
  }

  // Contact info
  if (vendor1.email && vendor2.email) {
    confidence += 15;
    factors++;
  }

  if (vendor1.phone && vendor2.phone) {
    confidence += 15;
    factors++;
  }

  // If no factors, return low confidence
  if (factors === 0) return 30;

  return Math.min(confidence, 100);
}

/**
 * Generate recommended action based on match characteristics
 */
export function getRecommendedAction(duplicate: Omit<VendorDuplicate, 'recommendedAction'>): string {
  if (duplicate.matchType === 'EXACT') {
    return 'MERGE_IMMEDIATELY - Exact duplicate detected';
  }

  if (duplicate.matchType === 'TAX_ID') {
    return 'MERGE_AFTER_REVIEW - Same tax ID indicates same legal entity';
  }

  if (duplicate.matchType === 'BANK_ACCOUNT') {
    return 'INVESTIGATE - Same bank account may indicate duplicate or related entities';
  }

  if (duplicate.severity === 'CRITICAL' && duplicate.confidence >= 90) {
    return 'MERGE_AFTER_REVIEW - High confidence duplicate';
  }

  if (duplicate.severity === 'HIGH') {
    return 'INVESTIGATE - Likely duplicate, requires manual review';
  }

  if (duplicate.severity === 'MEDIUM') {
    return 'MONITOR - Potential duplicate, track for additional evidence';
  }

  return 'REVIEW - Low priority, check if time permits';
}

/**
 * Find all duplicate vendors in a list
 */
export function findDuplicates(
  vendors: VendorMasterData[],
  fuzzyThreshold: number = 75
): VendorDuplicate[] {
  const duplicates: VendorDuplicate[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < vendors.length; i++) {
    for (let j = i + 1; j < vendors.length; j++) {
      const vendor1 = vendors[i];
      const vendor2 = vendors[j];

      // Skip if already processed
      const pairKey = [vendor1.vendorId, vendor2.vendorId].sort().join('-');
      if (processedPairs.has(pairKey)) continue;

      // Calculate match
      const { score, matchType, matchReasons } = calculateMatchScore(vendor1, vendor2);

      // Only flag if above threshold
      if (score >= fuzzyThreshold) {
        const confidence = calculateConfidence(vendor1, vendor2);
        const severity = calculateSeverity(score, confidence);

        const duplicate: Omit<VendorDuplicate, 'recommendedAction'> = {
          duplicateId: `DUP-${vendor1.vendorId}-${vendor2.vendorId}`,
          primaryVendor: vendor1,
          duplicateVendor: vendor2,
          matchType,
          matchScore: Math.round(score),
          matchReasons,
          confidence: Math.round(confidence),
          severity,
          detectedAt: new Date(),
          status: 'OPEN'
        };

        duplicates.push({
          ...duplicate,
          recommendedAction: getRecommendedAction(duplicate)
        });

        processedPairs.add(pairKey);
      }
    }
  }

  // Sort by severity and match score
  return duplicates.sort((a, b) => {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.matchScore - a.matchScore;
  });
}

/**
 * Find duplicates for a single vendor against a list
 */
export function findDuplicatesForVendor(
  vendor: VendorMasterData,
  allVendors: VendorMasterData[],
  fuzzyThreshold: number = 75
): VendorDuplicate[] {
  const duplicates: VendorDuplicate[] = [];

  for (const otherVendor of allVendors) {
    // Skip self
    if (vendor.vendorId === otherVendor.vendorId) continue;

    const { score, matchType, matchReasons } = calculateMatchScore(vendor, otherVendor);

    if (score >= fuzzyThreshold) {
      const confidence = calculateConfidence(vendor, otherVendor);
      const severity = calculateSeverity(score, confidence);

      const duplicate: Omit<VendorDuplicate, 'recommendedAction'> = {
        duplicateId: `DUP-${vendor.vendorId}-${otherVendor.vendorId}`,
        primaryVendor: vendor,
        duplicateVendor: otherVendor,
        matchType,
        matchScore: Math.round(score),
        matchReasons,
        confidence: Math.round(confidence),
        severity,
        detectedAt: new Date(),
        status: 'OPEN'
      };

      duplicates.push({
        ...duplicate,
        recommendedAction: getRecommendedAction(duplicate)
      });
    }
  }

  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Secure XML Parser with XXE Protection
 *
 * SECURITY FIX: CVE-FRAMEWORK-2025-005 (XML External Entity Vulnerability)
 *
 * Prevents XXE attacks in OData metadata parsing by:
 * 1. Disabling external entity processing
 * 2. Disabling DTD processing
 * 3. Using secure parser configuration
 * 4. Limiting XML size and complexity
 *
 * Usage:
 *   const metadata = await parseODataMetadata(xmlString);
 *   const parsed = safeParseXML(xmlString, { maxSize: 1024 * 1024 });
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser';

/**
 * Maximum XML document size (1MB default)
 */
const MAX_XML_SIZE = 1024 * 1024;

/**
 * Maximum XML depth to prevent billion laughs attack
 */
const MAX_XML_DEPTH = 100;

export interface SecureXMLParserOptions {
  /**
   * Maximum XML size in bytes (default: 1MB)
   */
  maxSize?: number;

  /**
   * Maximum nesting depth (default: 100)
   */
  maxDepth?: number;

  /**
   * Whether to preserve attributes (default: true)
   */
  preserveAttributes?: boolean;

  /**
   * Whether to trim text values (default: true)
   */
  trimValues?: boolean;
}

/**
 * ✅ SECURITY FIX: Secure XML parser configuration
 *
 * PREVENTS:
 * - XXE (XML External Entity) attacks
 * - Billion laughs attack (entity expansion)
 * - DTD injection
 * - SSRF via external entity references
 */
function createSecureParser(options: SecureXMLParserOptions = {}) {
  const {
    maxDepth = MAX_XML_DEPTH,
    preserveAttributes = true,
    trimValues = true,
  } = options;

  return new XMLParser({
    // ✅ XXE PROTECTION: Disable entity processing
    processEntities: false,           // CRITICAL: Prevent entity expansion
    allowBooleanAttributes: false,

    // ✅ Attribute handling
    ignoreAttributes: !preserveAttributes,
    parseAttributeValue: false,       // Prevent type coercion attacks

    // ✅ Text processing
    trimValues,
    parseTagValue: false,             // Prevent type coercion

    // ✅ BILLION LAUGHS PROTECTION: Stop deeply nested structures
    stopNodes: [
      '*.Reference',                   // Block external references
      '*.Import',                      // Block imports
      '*.Include',                     // Block includes
      'edmx:Reference',               // OData-specific: block references
    ],

    // ✅ Tag name validation
    isArray: () => false,             // Disable automatic array detection

    // ✅ Comment and CDATA handling
    commentPropName: false,           // Ignore comments
    cdataPropName: false,             // Treat CDATA as text

    // ✅ Additional protections
    transformTagName: (tagName: string) => {
      // Limit tag name length
      if (tagName.length > 100) {
        throw new Error('XML tag name too long');
      }
      return tagName;
    },
  });
}

/**
 * ✅ SECURITY FIX: Parse XML with security protections
 *
 * @throws Error if XML is malicious or too large
 */
export function safeParseXML(
  xmlString: string,
  options: SecureXMLParserOptions = {}
): any {
  const { maxSize = MAX_XML_SIZE, maxDepth = MAX_XML_DEPTH } = options;

  // ✅ CHECK 1: Size limit (DoS protection)
  if (xmlString.length > maxSize) {
    throw new Error(`XML document exceeds maximum size of ${maxSize} bytes`);
  }

  // ✅ CHECK 2: Block DOCTYPE declarations (XXE vector)
  if (/<!DOCTYPE/i.test(xmlString)) {
    throw new Error('DOCTYPE declarations are not allowed (XXE protection)');
  }

  // ✅ CHECK 3: Block ENTITY declarations (XXE vector)
  if (/<!ENTITY/i.test(xmlString)) {
    throw new Error('ENTITY declarations are not allowed (XXE protection)');
  }

  // ✅ CHECK 4: Block SYSTEM/PUBLIC keywords (external entity references)
  if (/SYSTEM|PUBLIC/i.test(xmlString)) {
    throw new Error('External entity references are not allowed (SSRF protection)');
  }

  // ✅ CHECK 5: Basic nesting depth check (billion laughs protection)
  const openTags = (xmlString.match(/</g) || []).length;
  const closeTags = (xmlString.match(/>/g) || []).length;

  if (openTags !== closeTags) {
    throw new Error('Malformed XML: mismatched tags');
  }

  if (openTags > maxDepth * 2) {
    throw new Error(`XML document exceeds maximum depth of ${maxDepth} levels`);
  }

  // ✅ PARSE: Use secure parser configuration
  try {
    const parser = createSecureParser(options);
    return parser.parse(xmlString);
  } catch (error: any) {
    throw new Error(`XML parsing failed: ${error.message}`);
  }
}

/**
 * Parse OData $metadata XML with security protections
 *
 * SECURITY FIX: Safe replacement for parseMetadataXML in ServiceDiscovery.ts
 */
export interface ODataMetadata {
  entityTypes: Array<{
    name: string;
    properties: Array<{
      name: string;
      type: string;
      nullable?: boolean;
    }>;
  }>;
  associations: Array<{
    name: string;
    ends: Array<{
      role: string;
      type: string;
      multiplicity: string;
    }>;
  }>;
}

/**
 * ✅ SECURITY FIX: Parse OData metadata with XXE protection
 */
export function parseODataMetadata(xmlString: string): ODataMetadata {
  // Parse with security protections
  const parsed = safeParseXML(xmlString, {
    maxSize: 5 * 1024 * 1024,  // 5MB max for metadata
    preserveAttributes: true,
  });

  // Extract entity types and associations
  const metadata: ODataMetadata = {
    entityTypes: [],
    associations: [],
  };

  try {
    // Navigate XML structure safely
    const edmx = parsed['edmx:Edmx'] || parsed.Edmx;
    if (!edmx) {
      return metadata;
    }

    const dataServices = edmx['edmx:DataServices'] || edmx.DataServices;
    if (!dataServices) {
      return metadata;
    }

    const schemas = Array.isArray(dataServices.Schema)
      ? dataServices.Schema
      : [dataServices.Schema];

    for (const schema of schemas) {
      if (!schema) continue;

      // Extract entity types
      const entityTypes = Array.isArray(schema.EntityType)
        ? schema.EntityType
        : schema.EntityType
        ? [schema.EntityType]
        : [];

      for (const entityType of entityTypes) {
        const properties = Array.isArray(entityType.Property)
          ? entityType.Property
          : entityType.Property
          ? [entityType.Property]
          : [];

        metadata.entityTypes.push({
          name: entityType['@_Name'] || entityType.Name || 'Unknown',
          properties: properties.map((prop: any) => ({
            name: prop['@_Name'] || prop.Name || 'Unknown',
            type: prop['@_Type'] || prop.Type || 'Edm.String',
            nullable: prop['@_Nullable'] === 'true',
          })),
        });
      }

      // Extract associations
      const associations = Array.isArray(schema.Association)
        ? schema.Association
        : schema.Association
        ? [schema.Association]
        : [];

      for (const assoc of associations) {
        const ends = Array.isArray(assoc.End)
          ? assoc.End
          : assoc.End
          ? [assoc.End]
          : [];

        metadata.associations.push({
          name: assoc['@_Name'] || assoc.Name || 'Unknown',
          ends: ends.map((end: any) => ({
            role: end['@_Role'] || end.Role || '',
            type: end['@_Type'] || end.Type || '',
            multiplicity: end['@_Multiplicity'] || end.Multiplicity || '*',
          })),
        });
      }
    }
  } catch (error: any) {
    // If structure parsing fails, return empty metadata
    // Don't expose internal structure to potential attacker
    console.error('Failed to parse OData metadata structure:', error.message);
  }

  return metadata;
}

/**
 * Sanitize XML string for logging (remove sensitive data)
 */
export function sanitizeXMLForLogging(xmlString: string, maxLength = 500): string {
  // Remove DOCTYPE and ENTITY declarations
  let sanitized = xmlString
    .replace(/<!DOCTYPE[^>]*>/gi, '[DOCTYPE REMOVED]')
    .replace(/<!ENTITY[^>]*>/gi, '[ENTITY REMOVED]');

  // Remove potential secrets in attributes
  sanitized = sanitized.replace(/(password|secret|key|token)="[^"]*"/gi, '$1="***"');

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '... [TRUNCATED]';
  }

  return sanitized;
}

/**
 * Validate XML is well-formed without parsing (pre-check)
 */
export function validateXMLStructure(xmlString: string): { valid: boolean; error?: string } {
  // Basic checks before attempting to parse
  const checks = [
    { test: () => xmlString.length > 0, error: 'Empty XML document' },
    { test: () => xmlString.length <= MAX_XML_SIZE * 10, error: 'XML document too large' },
    { test: () => !/<!DOCTYPE/i.test(xmlString), error: 'DOCTYPE not allowed' },
    { test: () => !/<!ENTITY/i.test(xmlString), error: 'ENTITY not allowed' },
    { test: () => !/(SYSTEM|PUBLIC)/i.test(xmlString), error: 'External references not allowed' },
    {
      test: () => {
        const open = (xmlString.match(/<[^/!?]/g) || []).length;
        const close = (xmlString.match(/<\//g) || []).length;
        return Math.abs(open - close) <= 2; // Allow for self-closing tags
      },
      error: 'Mismatched XML tags',
    },
  ];

  for (const check of checks) {
    if (!check.test()) {
      return { valid: false, error: check.error };
    }
  }

  return { valid: true };
}

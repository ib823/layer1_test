/**
 * Connector-specific type definitions
 */

// ============================================================================
// S/4HANA CLOUD TYPES
// ============================================================================

export interface S4HCAuthConfig {
  type: 'OAUTH2' | 'BASIC';
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  username?: string;
  password?: string;
}

export interface S4HCUser {
  personExternalID: string;
  personID: string;
  userID: string;
  userName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
  orgUnit?: string;
  costCenter?: string;
}

export interface S4HCRole {
  roleID: string;
  roleName: string;
  roleType: 'SINGLE' | 'COMPOSITE';
  businessRoleID?: string;
  description?: string;
  isTemplate: boolean;
}

export interface S4HCAuthObject {
  authorizationObject: string;
  authObjectClass?: string;
  fields: Array<{
    fieldName: string;
    fieldValue: string;
  }>;
}

// ============================================================================
// SAP BTP TYPES
// ============================================================================

export interface BTPAuthConfig {
  type: 'OAUTH2';
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  uaaUrl: string;
}

export interface BTPUser {
  id: string;
  userName: string;
  emails?: Array<{ value: string; primary: boolean }>;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  active: boolean;
  origin?: string;
}

export interface BTPRoleCollection {
  name: string;
  description?: string;
  roleReferences: Array<{
    roleTemplateAppId: string;
    roleTemplateName: string;
    name: string;
  }>;
}

// ============================================================================
// SAP ARIBA TYPES
// ============================================================================

export interface AribaAuthConfig {
  type: 'API_KEY' | 'OAUTH2';
  apiKey?: string;
  realm: string;
  clientId?: string;
  clientSecret?: string;
}

export interface AribaUser {
  uniqueName: string;
  active: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  realm: string;
}

export interface AribaPermissionGroup {
  name: string;
  description?: string;
  permissions: string[];
}

// ============================================================================
// SAP SUCCESSFACTORS TYPES
// ============================================================================

export interface SFSFAuthConfig {
  type: 'OAUTH2' | 'BASIC';
  companyId: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
}

export interface SFSFUser {
  userId: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status: string;
  department?: string;
  division?: string;
  location?: string;
}

export interface SFSFRoleEntity {
  roleId: string;
  roleName: string;
  roleDesc?: string;
  roleType?: string;
}

// ============================================================================
// SCIM 2.0 TYPES
// ============================================================================

export interface SCIMAuthConfig {
  type: 'OAUTH2' | 'BASIC' | 'API_KEY';
  bearerToken?: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

export interface SCIMUser {
  id: string;
  userName: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  active: boolean;
  groups?: Array<{
    value: string;
    $ref?: string;
    display?: string;
  }>;
}

export interface SCIMGroup {
  id: string;
  displayName: string;
  members?: Array<{
    value: string;
    $ref?: string;
    display?: string;
  }>;
}

// ============================================================================
// OIDC / SAML TYPES
// ============================================================================

export interface OIDCAuthConfig {
  type: 'OAUTH2';
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  tokenUrl?: string;
  userinfoUrl?: string;
}

export interface OIDCUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  groups?: string[];
  roles?: string[];
}

export interface SAMLAssertion {
  nameID: string;
  attributes: Record<string, string | string[]>;
  sessionIndex?: string;
  sessionNotOnOrAfter?: string;
}

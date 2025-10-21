/**
 * SAP S/4HANA Cloud Connector
 *
 * Extracts access data from S/4HANA Cloud via OData APIs
 * - Users: Communication Arrangement "SAP_COM_0193" (Read Access for Identity Management)
 * - Roles: Business Catalog APIs
 * - Permissions: Authorization Object data
 */

import {
  SystemType,
  CanonicalUser,
  CanonicalRole,
  CanonicalPermission,
  UserRoleAssignment,
  ConnectorOptions,
} from '../types';
import { S4HCUser, S4HCRole, S4HCAuthObject } from '../types/connectors';
import { BaseConnector } from './BaseConnector';

export class S4HCConnector extends BaseConnector {
  private readonly tenantId: string;
  private readonly systemId: string;

  constructor(
    tenantId: string,
    systemId: string,
    options: ConnectorOptions
  ) {
    super(SystemType.S4HC, options);
    this.tenantId = tenantId;
    this.systemId = systemId;
  }

  /**
   * Test connection to S/4HANA Cloud
   */
  public async testConnection(): Promise<boolean> {
    try {
      this.log('info', 'Testing S/4HANA Cloud connection');

      // Try to fetch service metadata
      const response = await this.client.get('/sap/opu/odata/sap/API_BUSINESS_USER/$metadata');

      if (response.status === 200) {
        this.log('info', 'Connection test successful');
        return true;
      }

      return false;
    } catch (error: any) {
      this.log('error', 'Connection test failed', error.message);
      return false;
    }
  }

  /**
   * Extract users from S/4HANA Cloud
   * Uses API_BUSINESS_USER OData service
   */
  public async extractUsers(): Promise<CanonicalUser[]> {
    try {
      this.log('info', 'Extracting users from S/4HANA Cloud');

      const users: CanonicalUser[] = [];
      let skip = 0;
      const top = 100; // Batch size
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get('/sap/opu/odata/sap/API_BUSINESS_USER/A_BusinessUser', {
          params: {
            $top: top,
            $skip: skip,
            $expand: 'to_BusinessUserRole',
            $format: 'json',
          },
        });

        const results: S4HCUser[] = response.data.d.results || [];

        for (const user of results) {
          users.push(this.normalizeUser(user));
        }

        hasMore = results.length === top;
        skip += top;

        this.log('info', `Extracted ${users.length} users so far`);
      }

      this.log('info', `Total users extracted: ${users.length}`);
      return users;
    } catch (error: any) {
      this.log('error', 'Failed to extract users', error.message);
      throw error;
    }
  }

  /**
   * Extract roles from S/4HANA Cloud
   * Uses Business Catalog APIs
   */
  public async extractRoles(): Promise<CanonicalRole[]> {
    try {
      this.log('info', 'Extracting roles from S/4HANA Cloud');

      const roles: CanonicalRole[] = [];
      let skip = 0;
      const top = 100;
      let hasMore = true;

      while (hasMore) {
        // Using Business Role API
        const response = await this.client.get('/sap/opu/odata/sap/API_BUSINESS_ROLE_SRV/A_BusinessRole', {
          params: {
            $top: top,
            $skip: skip,
            $expand: 'to_BusinessRoleCatalog',
            $format: 'json',
          },
        });

        const results: S4HCRole[] = response.data.d.results || [];

        for (const role of results) {
          roles.push(this.normalizeRole(role));
        }

        hasMore = results.length === top;
        skip += top;

        this.log('info', `Extracted ${roles.length} roles so far`);
      }

      this.log('info', `Total roles extracted: ${roles.length}`);
      return roles;
    } catch (error: any) {
      this.log('error', 'Failed to extract roles', error.message);
      throw error;
    }
  }

  /**
   * Extract permissions from S/4HANA Cloud
   * Maps authorization objects to canonical permissions
   */
  public async extractPermissions(): Promise<CanonicalPermission[]> {
    try {
      this.log('info', 'Extracting permissions from S/4HANA Cloud');

      const permissions: CanonicalPermission[] = [];
      let skip = 0;
      const top = 100;
      let hasMore = true;

      while (hasMore) {
        // Using Authorization Object API
        const response = await this.client.get('/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/A_AuthorizationObject', {
          params: {
            $top: top,
            $skip: skip,
            $format: 'json',
          },
        });

        const results: S4HCAuthObject[] = response.data.d.results || [];

        for (const authObj of results) {
          permissions.push(this.normalizePermission(authObj));
        }

        hasMore = results.length === top;
        skip += top;

        this.log('info', `Extracted ${permissions.length} permissions so far`);
      }

      this.log('info', `Total permissions extracted: ${permissions.length}`);
      return permissions;
    } catch (error: any) {
      this.log('error', 'Failed to extract permissions', error.message);
      throw error;
    }
  }

  /**
   * Extract user-to-role assignments
   */
  public async extractAssignments(): Promise<UserRoleAssignment[]> {
    try {
      this.log('info', 'Extracting user-role assignments from S/4HANA Cloud');

      const assignments: UserRoleAssignment[] = [];
      let skip = 0;
      const top = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get('/sap/opu/odata/sap/API_BUSINESS_USER/A_BusinessUserRole', {
          params: {
            $top: top,
            $skip: skip,
            $format: 'json',
          },
        });

        const results = response.data.d.results || [];

        for (const assignment of results) {
          assignments.push(this.normalizeAssignment(assignment));
        }

        hasMore = results.length === top;
        skip += top;

        this.log('info', `Extracted ${assignments.length} assignments so far`);
      }

      this.log('info', `Total assignments extracted: ${assignments.length}`);
      return assignments;
    } catch (error: any) {
      this.log('error', 'Failed to extract assignments', error.message);
      throw error;
    }
  }

  /**
   * Normalize S/4HC user to canonical format
   */
  private normalizeUser(s4hcUser: S4HCUser): CanonicalUser {
    return {
      id: '', // Will be generated by database
      tenantId: this.tenantId,
      userId: s4hcUser.personExternalID || s4hcUser.userID,
      userName: s4hcUser.userName,
      email: s4hcUser.email,
      fullName: s4hcUser.firstName && s4hcUser.lastName
        ? `${s4hcUser.firstName} ${s4hcUser.lastName}`
        : undefined,
      sourceSystemId: this.systemId,
      isActive: s4hcUser.isActive,
      isLocked: !s4hcUser.isActive,
      userType: this.determineUserType(s4hcUser),
      orgUnit: s4hcUser.orgUnit,
      costCenter: s4hcUser.costCenter,
      validFrom: s4hcUser.validFrom ? new Date(s4hcUser.validFrom) : undefined,
      validTo: s4hcUser.validTo ? new Date(s4hcUser.validTo) : undefined,
      sourceData: s4hcUser as any,
    };
  }

  /**
   * Normalize S/4HC role to canonical format
   */
  private normalizeRole(s4hcRole: S4HCRole): CanonicalRole {
    return {
      id: '', // Will be generated by database
      tenantId: this.tenantId,
      roleId: s4hcRole.roleID || s4hcRole.businessRoleID || '',
      roleName: s4hcRole.roleName,
      roleDescription: s4hcRole.description,
      sourceSystemId: this.systemId,
      roleType: s4hcRole.roleType === 'COMPOSITE' ? 'COMPOSITE' : 'SINGLE',
      isTechnical: s4hcRole.isTemplate,
      isCritical: this.isCriticalRole(s4hcRole.roleName),
      businessProcess: this.determineBusinessProcess(s4hcRole.roleName),
      riskLevel: this.determineRiskLevel(s4hcRole.roleName),
      sourceData: s4hcRole as any,
    };
  }

  /**
   * Normalize S/4HC auth object to canonical permission
   */
  private normalizePermission(authObj: S4HCAuthObject): CanonicalPermission {
    // Build field values map
    const fieldValues: Record<string, any> = {};
    authObj.fields?.forEach((field) => {
      fieldValues[field.fieldName] = field.fieldValue;
    });

    return {
      id: '', // Will be generated by database
      tenantId: this.tenantId,
      permissionCode: authObj.authorizationObject,
      permissionName: authObj.authorizationObject,
      sourceSystemId: this.systemId,
      sourceSystemType: SystemType.S4HC,
      authObject: authObj.authorizationObject,
      fieldValues,
      normalizedAction: this.normalizeAction(authObj.authorizationObject, fieldValues),
      normalizedObject: this.normalizeObject(authObj.authorizationObject),
      scope: this.extractScope(fieldValues),
    };
  }

  /**
   * Normalize assignment
   */
  private normalizeAssignment(assignment: any): UserRoleAssignment {
    return {
      id: '', // Will be generated by database
      tenantId: this.tenantId,
      userId: assignment.PersonExternalID || assignment.UserID,
      roleId: assignment.BusinessRoleID || assignment.RoleID,
      assignmentType: 'DIRECT',
      validFrom: assignment.ValidityStartDate ? new Date(assignment.ValidityStartDate) : undefined,
      validTo: assignment.ValidityEndDate ? new Date(assignment.ValidityEndDate) : undefined,
      assignedAt: new Date(),
    };
  }

  /**
   * Helper: Determine user type
   */
  private determineUserType(user: S4HCUser): CanonicalUser['userType'] {
    // Logic to determine user type based on S/4HC user attributes
    if (user.userName?.startsWith('SYS_')) return 'SERVICE_ACCOUNT';
    if (user.userName?.includes('ADMIN')) return 'ADMIN';
    return 'EMPLOYEE';
  }

  /**
   * Helper: Determine if role is critical
   */
  private isCriticalRole(roleName?: string): boolean {
    if (!roleName) return false;

    const criticalKeywords = ['ADMIN', 'SUPER', 'SAP_ALL', 'SAP_NEW', 'EMERGENCY'];
    return criticalKeywords.some((keyword) => roleName.toUpperCase().includes(keyword));
  }

  /**
   * Helper: Determine business process from role name
   */
  private determineBusinessProcess(roleName?: string): string | undefined {
    if (!roleName) return undefined;

    const upperName = roleName.toUpperCase();
    if (upperName.includes('FI') || upperName.includes('FINANCE')) return 'R2R';
    if (upperName.includes('MM') || upperName.includes('PROCUREMENT')) return 'P2P';
    if (upperName.includes('SD') || upperName.includes('SALES')) return 'OTC';
    if (upperName.includes('HR') || upperName.includes('PAYROLL')) return 'H2R';
    if (upperName.includes('TR') || upperName.includes('TREASURY')) return 'TRE';
    if (upperName.includes('PP') || upperName.includes('PRODUCTION')) return 'MFG';

    return undefined;
  }

  /**
   * Helper: Determine risk level
   */
  private determineRiskLevel(roleName?: string): CanonicalRole['riskLevel'] {
    if (this.isCriticalRole(roleName)) return 'CRITICAL';
    // Add more logic based on role characteristics
    return 'MEDIUM';
  }

  /**
   * Helper: Normalize action from auth object
   */
  private normalizeAction(authObject: string, fieldValues: Record<string, any>): CanonicalPermission['normalizedAction'] {
    // ACTVT field maps to actions
    const actvt = fieldValues['ACTVT'];

    if (!actvt) return undefined;

    // SAP ACTVT values: 01=Create, 02=Change, 03=Display, 06=Delete, 07=Print, 70=Approval
    if (actvt.includes('01')) return 'CREATE';
    if (actvt.includes('02')) return 'UPDATE';
    if (actvt.includes('03')) return 'READ';
    if (actvt.includes('06')) return 'DELETE';
    if (actvt.includes('70')) return 'APPROVE';

    return 'EXECUTE';
  }

  /**
   * Helper: Normalize object from auth object
   */
  private normalizeObject(authObject: string): string {
    // Map common SAP auth objects to business objects
    const objectMap: Record<string, string> = {
      'F_BKPF_BUK': 'ACCOUNTING_DOCUMENT',
      'F_LFA1_BUK': 'VENDOR',
      'F_KNA1_VKO': 'CUSTOMER',
      'M_BANF_WRK': 'PURCHASE_REQUISITION',
      'M_BEST_WRK': 'PURCHASE_ORDER',
      'S_TCODE': 'TRANSACTION',
    };

    return objectMap[authObject] || authObject;
  }

  /**
   * Helper: Extract scope from field values
   */
  private extractScope(fieldValues: Record<string, any>): Record<string, any> {
    const scope: Record<string, any> = {};

    // Common scope fields
    if (fieldValues['BUKRS']) scope.company_code = fieldValues['BUKRS'];
    if (fieldValues['WERKS']) scope.plant = fieldValues['WERKS'];
    if (fieldValues['VKORG']) scope.sales_org = fieldValues['VKORG'];
    if (fieldValues['EKORG']) scope.purchasing_org = fieldValues['EKORG'];

    return scope;
  }
}

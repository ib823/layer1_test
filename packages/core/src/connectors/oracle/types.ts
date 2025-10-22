/**
 * Oracle-specific types
 */

export interface OracleUser {
  UserId: number;
  Username: string;
  DisplayName: string;
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  ActiveFlag: 'Y' | 'N';
  SuspendedFlag?: 'Y' | 'N';
  PersonId?: number;
  BusinessUnitId?: number;
  BusinessUnitName?: string;
  ResponsibilityKeys?: string[];
  CreationDate: string;
  LastUpdateDate: string;
}

export interface OracleRole {
  RoleId: number;
  RoleCode: string;
  RoleName: string;
  Description?: string;
  RoleCommon: 'Y' | 'N';
  ActiveFlag: 'Y' | 'N';
  ResponsibilityId?: number;
  ApplicationId?: number;
  MenuId?: number;
  StartDate?: string;
  EndDate?: string;
}

export interface OracleGLEntry {
  JeHeaderId: number;
  JeLineNum: number;
  JeBatchName: string;
  JeSource: string;
  JeCategoryName: string;
  EffectiveDate: string;
  CreationDate: string;
  AccountCombination: string;
  AccountDescription: string;
  EnteredDr?: number;
  EnteredCr?: number;
  AccountedDr?: number;
  AccountedCr?: number;
  CurrencyCode: string;
  Description?: string;
  Reference?: string;
  CostCenter?: string;
  LedgerName: string;
  CreatedBy: string;
  Status: string;
}

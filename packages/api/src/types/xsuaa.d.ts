/**
 * Type definitions for @sap/xssec
 */
declare module '@sap/xsenv' {
  export interface XsuaaService {
    clientid: string;
    clientsecret: string;
    url: string;
    identityzone: string;
    tenantid: string;
    uaadomain: string;
    verificationkey: string;
    xsappname: string;
  }

  export interface ServiceOptions {
    xsuaa?: { tag: string };
  }

  export function getServices(options: ServiceOptions): { xsuaa: XsuaaService };
}

declare module '@sap/xssec' {
  export interface SecurityContext {
    getLogonName(): string;
    getEmail(): string;
    getAttribute(name: string): any;
    getSubaccountId(): string;
    getIdentityZone(): string;
    checkScope(scope: string): boolean;
    checkLocalScope(scope: string): boolean;
  }

  export type SecurityContextCallback = (
    error: Error | null,
    securityContext: SecurityContext | null
  ) => void;

  export function createSecurityContext(
    token: string,
    config: any,
    callback: SecurityContextCallback
  ): void;

  export function createSecurityContext(
    token: string,
    config: any
  ): Promise<SecurityContext>;
}

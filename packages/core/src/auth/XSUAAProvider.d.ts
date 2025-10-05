import { TokenPayload } from '../types';
export interface XSUAAConfig {
    url: string;
    clientId: string;
    clientSecret: string;
}
export declare class XSUAAProvider {
    private config;
    constructor(config: XSUAAConfig);
    validateToken(token: string): Promise<TokenPayload>;
    getTenantId(token: TokenPayload): string;
    getUserId(token: TokenPayload): string;
    getScopes(token: TokenPayload): string[];
    hasScope(token: TokenPayload, scope: string): boolean;
}
//# sourceMappingURL=XSUAAProvider.d.ts.map
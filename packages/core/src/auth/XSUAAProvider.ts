import { TokenPayload } from '../types';

export interface XSUAAConfig {
  url: string;
  clientId: string;
  clientSecret: string;
}

export class XSUAAProvider {
  constructor(private config: XSUAAConfig) {}
  
  async validateToken(token: string): Promise<TokenPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString()
    );
    
    return payload;
  }
  
  getTenantId(token: TokenPayload): string {
    return token.zid || token.tenant_id;
  }
  
  getUserId(token: TokenPayload): string {
    return token.user_id || token.user_name;
  }
  
  getScopes(token: TokenPayload): string[] {
    return token.scope || [];
  }
  
  hasScope(token: TokenPayload, scope: string): boolean {
    return this.getScopes(token).includes(scope);
  }
}
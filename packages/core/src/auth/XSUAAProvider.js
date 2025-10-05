"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XSUAAProvider = void 0;
class XSUAAProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    async validateToken(token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    }
    getTenantId(token) {
        return token.zid || token.tenant_id;
    }
    getUserId(token) {
        return token.user_id || token.user_name;
    }
    getScopes(token) {
        return token.scope || [];
    }
    hasScope(token, scope) {
        return this.getScopes(token).includes(scope);
    }
}
exports.XSUAAProvider = XSUAAProvider;
//# sourceMappingURL=XSUAAProvider.js.map
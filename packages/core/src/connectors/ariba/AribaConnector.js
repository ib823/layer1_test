"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AribaConnector = void 0;
const BaseSAPConnector_1 = require("../base/BaseSAPConnector");
const errors_1 = require("../../errors");
class AribaConnector extends BaseSAPConnector_1.BaseSAPConnector {
    constructor(config) {
        super(config);
    }
    async getAuthToken() {
        return this.config.ariba.apiKey;
    }
    mapSAPError(error) {
        return new errors_1.FrameworkError('Ariba error', 'ARIBA', 500, false, error);
    }
    getHealthCheckEndpoint() {
        return '/api/status';
    }
}
exports.AribaConnector = AribaConnector;
//# sourceMappingURL=AribaConnector.js.map
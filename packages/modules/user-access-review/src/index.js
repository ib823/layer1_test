"use strict";
/**
 * SAP MVP Framework - User Access Review Module
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = exports.getCriticalRules = exports.getRulesByRiskLevel = exports.getRulesByCategory = exports.STANDARD_SOD_RULES = exports.UserAccessReviewer = void 0;
var UserAccessReviewer_1 = require("./UserAccessReviewer");
Object.defineProperty(exports, "UserAccessReviewer", { enumerable: true, get: function () { return UserAccessReviewer_1.UserAccessReviewer; } });
var sodRules_1 = require("./rules/sodRules");
Object.defineProperty(exports, "STANDARD_SOD_RULES", { enumerable: true, get: function () { return sodRules_1.STANDARD_SOD_RULES; } });
Object.defineProperty(exports, "getRulesByCategory", { enumerable: true, get: function () { return sodRules_1.getRulesByCategory; } });
Object.defineProperty(exports, "getRulesByRiskLevel", { enumerable: true, get: function () { return sodRules_1.getRulesByRiskLevel; } });
Object.defineProperty(exports, "getCriticalRules", { enumerable: true, get: function () { return sodRules_1.getCriticalRules; } });
__exportStar(require("./types"), exports);
exports.version = '1.0.0';
//# sourceMappingURL=index.js.map
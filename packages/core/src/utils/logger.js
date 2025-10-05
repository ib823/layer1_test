"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const winston_1 = __importDefault(require("winston"));
function createLogger(config) {
    return winston_1.default.createLogger({
        level: config.level,
        format: config.format === 'json'
            ? winston_1.default.format.json()
            : winston_1.default.format.simple(),
        transports: [
            new winston_1.default.transports.Console(),
        ],
    });
}
//# sourceMappingURL=logger.js.map
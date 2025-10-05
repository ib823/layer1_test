"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
class ConfigManager {
    config = new Map();
    set(key, value) {
        this.config.set(key, value);
    }
    get(key, defaultValue) {
        return this.config.get(key) ?? defaultValue;
    }
    has(key) {
        return this.config.has(key);
    }
    getAll() {
        return Object.fromEntries(this.config);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map
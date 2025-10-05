"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
class MemoryCache {
    store = new Map();
    async get(key) {
        const item = this.store.get(key);
        if (!item) {
            return null;
        }
        if (Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }
    async set(key, value, ttlMs = 300000) {
        this.store.set(key, {
            value,
            expiry: Date.now() + ttlMs,
        });
    }
    async delete(key) {
        this.store.delete(key);
    }
    async clear() {
        this.store.clear();
    }
}
exports.MemoryCache = MemoryCache;
//# sourceMappingURL=MemoryCache.js.map
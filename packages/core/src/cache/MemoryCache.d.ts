export declare class MemoryCache {
    private store;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=MemoryCache.d.ts.map
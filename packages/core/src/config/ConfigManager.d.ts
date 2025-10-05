export declare class ConfigManager {
    private config;
    set(key: string, value: any): void;
    get<T>(key: string, defaultValue?: T): T;
    has(key: string): boolean;
    getAll(): Record<string, any>;
}
//# sourceMappingURL=ConfigManager.d.ts.map
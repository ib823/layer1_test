export class ConfigManager {
  private config: Map<string, any> = new Map();
  
  set(key: string, value: any): void {
    this.config.set(key, value);
  }
  
  get<T>(key: string, defaultValue?: T): T {
    return this.config.get(key) ?? defaultValue;
  }
  
  has(key: string): boolean {
    return this.config.has(key);
  }
  
  getAll(): Record<string, any> {
    return Object.fromEntries(this.config);
  }
}
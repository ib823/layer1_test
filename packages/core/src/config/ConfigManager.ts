export class ConfigManager {
  private config: Map<string, unknown> = new Map();

  set(key: string, value: unknown): void {
    this.config.set(key, value);
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.config.get(key);
    return (value ?? defaultValue) as T | undefined;
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.config);
  }
}
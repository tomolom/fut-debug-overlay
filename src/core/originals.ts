type OriginalStore = Map<string, unknown>;

class OriginalsRegistry {
  private storeMap: OriginalStore = new Map();

  store(key: string, original: unknown): void {
    if (!this.storeMap.has(key)) {
      this.storeMap.set(key, original);
    }
  }

  get<T = unknown>(key: string): T | undefined {
    return this.storeMap.get(key) as T | undefined;
  }

  restore<T = unknown>(key: string): T | undefined {
    const original = this.get<T>(key);
    this.storeMap.delete(key);
    return original;
  }

  has(key: string): boolean {
    return this.storeMap.has(key);
  }

  listAll(): string[] {
    return Array.from(this.storeMap.keys());
  }
}

export const originals = new OriginalsRegistry();

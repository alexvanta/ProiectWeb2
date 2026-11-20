interface CacheBucket {
  entries: Map<string, unknown>;
  version: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
}

/**
 * Per-season server-side in-memory cache without Redis (D-004).
 * Deterministically invalidated on every result entry, correction, or reschedule.
 */
export class SeasonCacheStore {
  private buckets = new Map<string, CacheBucket>();
  private stats: CacheStats = { hits: 0, misses: 0, invalidations: 0 };

  async getOrCompute<T>(
    seasonId: string,
    key: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    let bucket = this.buckets.get(seasonId);
    if (!bucket) {
      bucket = { entries: new Map(), version: 1 };
      this.buckets.set(seasonId, bucket);
    }

    if (bucket.entries.has(key)) {
      this.stats.hits += 1;
      return bucket.entries.get(key) as T;
    }

    this.stats.misses += 1;
    const versionBefore = bucket.version;
    const value = await loader();

    // Only store if the season was not invalidated while loading
    const latestBucket = this.buckets.get(seasonId);
    if (latestBucket && latestBucket.version === versionBefore) {
      latestBucket.entries.set(key, value);
    }

    return value;
  }

  invalidateSeason(seasonId: string): void {
    const existing = this.buckets.get(seasonId);
    this.buckets.set(seasonId, {
      entries: new Map(),
      version: (existing?.version ?? 0) + 1,
    });
    this.stats.invalidations += 1;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  clearAll(): void {
    this.buckets.clear();
    this.stats = { hits: 0, misses: 0, invalidations: 0 };
  }
}

const globalForCache = globalThis as unknown as {
  p19SeasonCache: SeasonCacheStore | undefined;
};

export const seasonCache =
  globalForCache.p19SeasonCache ?? new SeasonCacheStore();

if (process.env.NODE_ENV !== "production") {
  globalForCache.p19SeasonCache = seasonCache;
}

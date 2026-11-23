import { Result, ok } from "neverthrow";

/**
 * Generic cache item interface
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
}

// Create a cache service for use across the application
export class CacheService {
  private static cache: Record<string, CacheItem<any>> = {};
  private static inFlight = new Map<string, Promise<unknown>>();
  private static defaultTTL: number = 1 * 60 * 1000; // 1 minute in milliseconds
  private static readonly maxEntries = 500;

  private static store<T>(key: string, data: T): void {
    if (!CacheService.cache[key] && Object.keys(CacheService.cache).length >= CacheService.maxEntries) {
      const oldestKey = Object.entries(CacheService.cache)
        .sort(([, left], [, right]) => left.timestamp - right.timestamp)[0]?.[0];
      if (oldestKey) delete CacheService.cache[oldestKey];
    }
    CacheService.cache[key] = { data, timestamp: Date.now() };
  }

  /**
   * Get or fetch data with caching
   * @param key The cache key
   * @param fetchFn The function to call to fetch fresh data
   * @param ttl Optional TTL for this specific item
   * @returns The data, either from cache or freshly fetched
   */
  static async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CacheService.defaultTTL
  ): Promise<T> {
    const now = Date.now();

    // Check if we have a valid cache entry
    if (
      CacheService.cache[key] &&
      now - CacheService.cache[key].timestamp < ttl
    ) {
      return CacheService.cache[key].data;
    }

    const pending = CacheService.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const request = fetchFn().then((data) => {
      CacheService.store(key, data);
      return data;
    });
    CacheService.inFlight.set(key, request);

    try {
      return await request;
    } finally {
      if (CacheService.inFlight.get(key) === request) CacheService.inFlight.delete(key);
    }
  }

  /**
   * Get or fetch data with caching, supporting Result type
   * @param key The cache key
   * @param fetchFn The function to call to fetch fresh data (returns Result)
   * @param ttl Optional TTL for this specific item
   * @returns The Result, either from cache or freshly fetched
   */
  static async getOrFetchResult<T, E = Error>(
    key: string,
    fetchFn: () => Promise<Result<T, E>>,
    ttl: number = CacheService.defaultTTL
  ): Promise<Result<T, E>> {
    const now = Date.now();

    // Check if we have a valid cache entry
    if (
      CacheService.cache[key] &&
      now - CacheService.cache[key].timestamp < ttl
    ) {
      // Return the cached data wrapped in an ok Result
      return ok(CacheService.cache[key].data) as Result<T, E>;
    }

    const pending = CacheService.inFlight.get(key);
    if (pending) return pending as Promise<Result<T, E>>;

    const request = fetchFn().then((result) => {
      if (result.isOk()) {
        CacheService.store(key, result.value);
      }
      return result;
    });
    CacheService.inFlight.set(key, request);

    try {
      return await request;
    } finally {
      if (CacheService.inFlight.get(key) === request) CacheService.inFlight.delete(key);
    }
  }

  static getUpdatedAt(key: string): number | null {
    return CacheService.cache[key]?.timestamp ?? null;
  }

  /**
   * Set the default TTL for the cache
   */
  static setDefaultTTL(ttl: number): void {
    CacheService.defaultTTL = ttl;
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    CacheService.cache = {};
    CacheService.inFlight.clear();
  }

  /**
   * Manually invalidate a cache entry
   */
  static invalidate(key: string): boolean {
    if (CacheService.cache[key]) {
      delete CacheService.cache[key];
      return true;
    }
    return false;
  }
}

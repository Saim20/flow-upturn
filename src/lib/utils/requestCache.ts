/**
 * Request Cache Utility
 * 
 * Provides request deduplication and caching to prevent duplicate API calls
 * when the same data is requested multiple times in quick succession.
 * 
 * Features:
 * - Deduplicates identical in-flight requests
 * - Caches responses with configurable TTL
 * - Automatic cache invalidation
 * - TypeScript support with generic types
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const data = await cachedFetch('users-list', () => fetchUsers());
 * 
 * // With custom TTL (30 seconds)
 * const data = await cachedFetch('user-123', () => fetchUser(123), 30000);
 * 
 * // Invalidate specific cache
 * invalidateCache('users-list');
 * 
 * // Clear all cache
 * clearAllCache();
 * ```
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

// Cache storage
const cache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, PendingRequest<any>>();

/**
 * Fetches data with automatic caching and request deduplication
 * 
 * @param key - Unique cache key for this request
 * @param fetcher - Async function that performs the actual fetch
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns Cached or fresh data
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const now = Date.now();

  // Check cache first
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  // Check for in-flight request (deduplication)
  const pending = pendingRequests.get(key);
  if (pending) {
    // Return the existing promise to avoid duplicate requests
    return pending.promise as Promise<T>;
  }

  // Create new request
  const promise = fetcher()
    .then((data) => {
      // Cache the result
      cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttl,
      });
      return data;
    })
    .finally(() => {
      // Remove from pending after completion
      pendingRequests.delete(key);
    });

  // Track pending request
  pendingRequests.set(key, { promise, timestamp: now });

  return promise;
}

/**
 * Invalidates a specific cache entry
 * Also cancels any pending requests for this key
 * 
 * @param key - Cache key to invalidate
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
  pendingRequests.delete(key);
}

/**
 * Invalidates all cache entries matching a prefix
 * Useful for invalidating related data (e.g., all user-related cache)
 * 
 * @param prefix - Key prefix to match
 */
export function invalidateCacheByPrefix(prefix: string): void {
  const keysToDelete: string[] = [];
  
  cache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  });
  
  pendingRequests.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    cache.delete(key);
    pendingRequests.delete(key);
  });
}

/**
 * Clears all cached data
 */
export function clearAllCache(): void {
  cache.clear();
  pendingRequests.clear();
}

/**
 * Gets cache statistics for debugging
 */
export function getCacheStats(): {
  cacheSize: number;
  pendingRequests: number;
  entries: Array<{ key: string; expiresIn: number }>;
} {
  const now = Date.now();
  const entries: Array<{ key: string; expiresIn: number }> = [];
  
  cache.forEach((entry, key) => {
    entries.push({
      key,
      expiresIn: Math.max(0, entry.expiresAt - now),
    });
  });

  return {
    cacheSize: cache.size,
    pendingRequests: pendingRequests.size,
    entries,
  };
}

/**
 * Checks if a cache entry exists and is valid
 * 
 * @param key - Cache key to check
 * @returns true if cache entry exists and hasn't expired
 */
export function isCached(key: string): boolean {
  const cached = cache.get(key);
  return cached !== undefined && cached.expiresAt > Date.now();
}

/**
 * Manually sets a cache entry
 * Useful for pre-populating cache or updating after mutations
 * 
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Time to live in milliseconds
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  });
}

/**
 * Gets a cached value without fetching
 * Returns undefined if not cached or expired
 * 
 * @param key - Cache key
 * @returns Cached data or undefined
 */
export function getFromCache<T>(key: string): T | undefined {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  return undefined;
}

/**
 * Creates a namespaced cache helper for a specific module
 * 
 * @example
 * ```typescript
 * const userCache = createCacheNamespace('users');
 * await userCache.fetch('123', () => fetchUser('123'));
 * userCache.invalidate('123');
 * userCache.invalidateAll();
 * ```
 */
export function createCacheNamespace(namespace: string) {
  const prefix = `${namespace}:`;
  
  return {
    fetch: <T>(key: string, fetcher: () => Promise<T>, ttl?: number) =>
      cachedFetch<T>(`${prefix}${key}`, fetcher, ttl),
    
    invalidate: (key: string) => invalidateCache(`${prefix}${key}`),
    
    invalidateAll: () => invalidateCacheByPrefix(prefix),
    
    isCached: (key: string) => isCached(`${prefix}${key}`),
    
    set: <T>(key: string, data: T, ttl?: number) =>
      setCache(`${prefix}${key}`, data, ttl),
    
    get: <T>(key: string) => getFromCache<T>(`${prefix}${key}`),
  };
}

// Pre-built namespaces for common use cases
export const employeeCache = createCacheNamespace('employees');
export const departmentCache = createCacheNamespace('departments');
export const projectCache = createCacheNamespace('projects');
export const taskCache = createCacheNamespace('tasks');
export const teamCache = createCacheNamespace('teams');

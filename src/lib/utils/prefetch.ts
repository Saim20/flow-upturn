"use client";

/**
 * Prefetching Utilities
 * 
 * Provides tools for prefetching data and routes to improve
 * perceived performance when navigating between pages.
 * 
 * @example
 * ```tsx
 * // Prefetch on hover
 * <Link href="/ops/tasks" onMouseEnter={() => prefetchRoute('/ops/tasks')}>
 *   Tasks
 * </Link>
 * 
 * // Use the hook for automatic prefetching
 * const { prefetchOnHover } = usePrefetch();
 * <div {...prefetchOnHover('/ops/tasks')}>Tasks</div>
 * ```
 */

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

// Track prefetched routes to avoid duplicate prefetches
const prefetchedRoutes = new Set<string>();

// Track prefetched data keys
const prefetchedData = new Map<string, Promise<any>>();

/**
 * Prefetch a Next.js route
 * Uses the router's prefetch method for optimized route prefetching
 */
export function usePrefetch() {
  const router = useRouter();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Prefetch a route programmatically
   */
  const prefetchRoute = useCallback((href: string) => {
    if (prefetchedRoutes.has(href)) return;
    
    prefetchedRoutes.add(href);
    router.prefetch(href);
  }, [router]);

  /**
   * Returns props to attach to an element for hover-based prefetching
   * Includes a small delay to avoid prefetching on quick mouse movements
   */
  const prefetchOnHover = useCallback((href: string, delay = 100) => ({
    onMouseEnter: () => {
      hoverTimeoutRef.current = setTimeout(() => {
        prefetchRoute(href);
      }, delay);
    },
    onMouseLeave: () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    },
    onFocus: () => {
      prefetchRoute(href);
    },
  }), [prefetchRoute]);

  /**
   * Prefetch multiple routes at once
   */
  const prefetchRoutes = useCallback((hrefs: string[]) => {
    hrefs.forEach(href => prefetchRoute(href));
  }, [prefetchRoute]);

  return {
    prefetchRoute,
    prefetchOnHover,
    prefetchRoutes,
  };
}

/**
 * Prefetch data using a fetcher function
 * Results are cached and deduplicated
 */
export async function prefetchData<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Return existing promise if already prefetching/prefetched
  if (prefetchedData.has(key)) {
    return prefetchedData.get(key)!;
  }

  const promise = fetcher();
  prefetchedData.set(key, promise);

  // Clean up after the promise resolves (keep for 5 minutes)
  promise.finally(() => {
    setTimeout(() => {
      prefetchedData.delete(key);
    }, 5 * 60 * 1000);
  });

  return promise;
}

/**
 * Check if a route has been prefetched
 */
export function isRoutePrefetched(href: string): boolean {
  return prefetchedRoutes.has(href);
}

/**
 * Clear all prefetch caches (useful for testing or logout)
 */
export function clearPrefetchCache(): void {
  prefetchedRoutes.clear();
  prefetchedData.clear();
}

/**
 * Prefetch common ops routes on app load
 * Call this in a layout or main component
 */
export function usePrefetchOpsRoutes() {
  const { prefetchRoutes } = usePrefetch();

  // Prefetch common routes after a short delay
  useCallback(() => {
    setTimeout(() => {
      prefetchRoutes([
        '/ops/tasks',
        '/ops/project',
        '/ops/attendance',
        '/ops/leave',
      ]);
    }, 2000); // Wait 2s after initial load
  }, [prefetchRoutes]);
}

export default usePrefetch;

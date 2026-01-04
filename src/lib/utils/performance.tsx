"use client";

/**
 * Performance Monitoring Utilities
 * 
 * Provides tools for monitoring React component performance,
 * tracking render counts, and measuring Web Vitals.
 * 
 * @example
 * ```typescript
 * // Track component renders
 * useRenderCount('MyComponent');
 * 
 * // Measure function execution time
 * const result = measureTime('fetchData', () => fetchData());
 * 
 * // Log performance metrics
 * logPerformanceMetrics();
 * ```
 */

import { useRef, useEffect, useCallback } from "react";

// Only enable in development
const isDev = process.env.NODE_ENV === "development";

// Store for render counts
const renderCounts = new Map<string, number>();

// Store for timing measurements
const timings = new Map<string, { count: number; totalMs: number; avgMs: number }>();

/**
 * Hook to track component render counts in development
 * Helps identify components that render too frequently
 */
export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);
  
  useEffect(() => {
    if (!isDev) return;
    
    renderCount.current += 1;
    renderCounts.set(componentName, renderCount.current);
    
    // Log warning for excessive renders
    if (renderCount.current > 10) {
      console.warn(
        `[Performance] ${componentName} has rendered ${renderCount.current} times. Consider memoization.`
      );
    }
  });
  
  return renderCount.current;
}

/**
 * Hook to track why a component re-rendered
 * Logs which props/deps changed between renders
 */
export function useWhyDidYouRender<T extends Record<string, any>>(
  componentName: string,
  props: T
): void {
  const previousProps = useRef<T | null>(null);
  
  useEffect(() => {
    if (!isDev || !previousProps.current) {
      previousProps.current = props;
      return;
    }
    
    const changedProps: string[] = [];
    
    Object.keys(props).forEach((key) => {
      if (previousProps.current![key] !== props[key]) {
        changedProps.push(key);
      }
    });
    
    if (changedProps.length > 0) {
      console.log(
        `[Performance] ${componentName} re-rendered due to:`,
        changedProps.map((key) => ({
          prop: key,
          previous: previousProps.current![key],
          current: props[key],
        }))
      );
    }
    
    previousProps.current = props;
  });
}

/**
 * Measure execution time of a function
 */
export function measureTime<T>(
  label: string,
  fn: () => T
): T {
  if (!isDev) return fn();
  
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;
  
  // Update timing statistics
  const existing = timings.get(label) || { count: 0, totalMs: 0, avgMs: 0 };
  existing.count += 1;
  existing.totalMs += duration;
  existing.avgMs = existing.totalMs / existing.count;
  timings.set(label, existing);
  
  // Log slow operations
  if (duration > 100) {
    console.warn(`[Performance] ${label} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Measure execution time of an async function
 */
export async function measureTimeAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isDev) return fn();
  
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;
  
  // Update timing statistics
  const existing = timings.get(label) || { count: 0, totalMs: 0, avgMs: 0 };
  existing.count += 1;
  existing.totalMs += duration;
  existing.avgMs = existing.totalMs / existing.count;
  timings.set(label, existing);
  
  // Log slow operations
  if (duration > 500) {
    console.warn(`[Performance] ${label} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Log all collected performance metrics
 */
export function logPerformanceMetrics(): void {
  if (!isDev) return;
  
  console.group("[Performance Metrics]");
  
  console.log("Render Counts:");
  const sortedRenders = Array.from(renderCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  sortedRenders.forEach(([name, count]) => {
    console.log(`  ${name}: ${count} renders`);
  });
  
  console.log("\nTiming Measurements:");
  const sortedTimings = Array.from(timings.entries())
    .sort((a, b) => b[1].avgMs - a[1].avgMs);
  sortedTimings.forEach(([label, stats]) => {
    console.log(
      `  ${label}: ${stats.avgMs.toFixed(2)}ms avg (${stats.count} calls, ${stats.totalMs.toFixed(2)}ms total)`
    );
  });
  
  console.groupEnd();
}

/**
 * Clear all collected metrics
 */
export function clearPerformanceMetrics(): void {
  renderCounts.clear();
  timings.clear();
}

/**
 * Hook to measure and report Web Vitals
 */
export function useWebVitals(): void {
  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;
    
    // Measure LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log(`[Web Vitals] LCP: ${lastEntry.startTime.toFixed(2)}ms`);
    });
    
    try {
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch (e) {
      // Not supported in all browsers
    }
    
    // Measure FID (First Input Delay)
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        console.log(`[Web Vitals] FID: ${entry.processingStart - entry.startTime}ms`);
      });
    });
    
    try {
      fidObserver.observe({ type: "first-input", buffered: true });
    } catch (e) {
      // Not supported in all browsers
    }
    
    // Measure CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      console.log(`[Web Vitals] CLS: ${clsValue.toFixed(4)}`);
    });
    
    try {
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch (e) {
      // Not supported in all browsers
    }
    
    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);
}

/**
 * Component wrapper that logs render performance
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  if (!isDev) return WrappedComponent;
  
  const TrackedComponent = (props: P) => {
    useRenderCount(componentName);
    return <WrappedComponent {...props} />;
  };
  
  TrackedComponent.displayName = `PerformanceTracked(${componentName})`;
  return TrackedComponent;
}

/**
 * Get current memory usage (if available)
 */
export function getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  if (typeof window === "undefined") return null;
  
  const memory = (performance as any).memory;
  if (!memory) return null;
  
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
  };
}

/**
 * Log memory usage
 */
export function logMemoryUsage(): void {
  const memory = getMemoryUsage();
  if (!memory) {
    console.log("[Memory] Memory API not available");
    return;
  }
  
  const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
  const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
  
  console.log(`[Memory] Used: ${usedMB}MB / ${totalMB}MB`);
}

// Export dev tools for console usage
if (typeof window !== "undefined" && isDev) {
  (window as any).__perfTools = {
    logMetrics: logPerformanceMetrics,
    clearMetrics: clearPerformanceMetrics,
    logMemory: logMemoryUsage,
    getRenderCounts: () => Object.fromEntries(renderCounts),
    getTimings: () => Object.fromEntries(timings),
  };
  
  console.log(
    "[Performance] Dev tools available. Access via window.__perfTools"
  );
}

export default {
  useRenderCount,
  useWhyDidYouRender,
  measureTime,
  measureTimeAsync,
  logPerformanceMetrics,
  clearPerformanceMetrics,
  useWebVitals,
  withPerformanceTracking,
  getMemoryUsage,
  logMemoryUsage,
};

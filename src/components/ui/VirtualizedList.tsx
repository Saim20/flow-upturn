"use client";

import { useRef, useState, useEffect, useCallback, useMemo, ReactNode, memo } from "react";

export interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Estimated height of each item in pixels */
  itemHeight: number;
  /** Function to render each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Unique key extractor for each item */
  keyExtractor: (item: T, index: number) => string;
  /** Height of the container (default: 600px) */
  containerHeight?: number;
  /** Number of items to render above/below visible area (default: 3) */
  overscan?: number;
  /** Optional className for the container */
  className?: string;
  /** Optional loading indicator at the end */
  loadingIndicator?: ReactNode;
  /** Whether more items are loading */
  isLoading?: boolean;
  /** Callback when scrolled near the end */
  onEndReached?: () => void;
  /** Distance from end to trigger onEndReached (default: 200px) */
  onEndReachedThreshold?: number;
  /** Gap between items in pixels (default: 16) */
  gap?: number;
}

/**
 * A lightweight virtualized list component that only renders visible items.
 * Significantly improves performance for long lists.
 * 
 * @example
 * ```tsx
 * <VirtualizedList
 *   items={tasks}
 *   itemHeight={120}
 *   renderItem={(task, index) => <TaskCard task={task} />}
 *   keyExtractor={(task) => task.id}
 *   containerHeight={600}
 *   onEndReached={loadMoreTasks}
 *   isLoading={loadingMore}
 * />
 * ```
 */
function VirtualizedListInner<T>({
  items,
  itemHeight,
  renderItem,
  keyExtractor,
  containerHeight = 600,
  overscan = 3,
  className = "",
  loadingIndicator,
  isLoading = false,
  onEndReached,
  onEndReachedThreshold = 200,
  gap = 16,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const hasCalledEndReached = useRef(false);

  // Calculate total height including gaps
  const totalItemHeight = itemHeight + gap;
  const totalHeight = items.length * totalItemHeight - (items.length > 0 ? gap : 0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / totalItemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / totalItemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);
    
    return { startIndex, endIndex };
  }, [scrollTop, totalItemHeight, containerHeight, overscan, items.length]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // Check if near end for infinite scroll
    if (onEndReached && !hasCalledEndReached.current && !isLoading) {
      const distanceFromEnd = totalHeight - (target.scrollTop + containerHeight);
      if (distanceFromEnd < onEndReachedThreshold) {
        hasCalledEndReached.current = true;
        onEndReached();
      }
    }
  }, [onEndReached, isLoading, totalHeight, containerHeight, onEndReachedThreshold]);

  // Reset end reached flag when items change
  useEffect(() => {
    hasCalledEndReached.current = false;
  }, [items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const visible: Array<{ item: T; index: number; key: string }> = [];
    
    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      visible.push({
        item: items[i],
        index: i,
        key: keyExtractor(items[i], i),
      });
    }
    
    return visible;
  }, [visibleRange, items, keyExtractor]);

  // Calculate offset for the first visible item
  const offsetY = visibleRange.startIndex * totalItemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* Positioned container for visible items */}
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index, key }) => (
            <div
              key={key}
              style={{
                height: itemHeight,
                marginBottom: index < items.length - 1 ? gap : 0,
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && loadingIndicator && (
        <div className="py-4 flex justify-center">
          {loadingIndicator}
        </div>
      )}
    </div>
  );
}

// Memoize the component for performance
export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;

/**
 * A simpler windowed list that uses CSS for virtualization.
 * Better for cases where item heights vary or you need simpler integration.
 */
export interface WindowedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  /** Maximum number of items to render at once (default: 50) */
  maxRenderCount?: number;
  /** Class name for the container */
  className?: string;
  /** Footer content (e.g., load more button) */
  footer?: ReactNode;
}

/**
 * A windowed list that limits the number of rendered items.
 * Simpler than full virtualization but still improves performance.
 */
export function WindowedList<T>({
  items,
  renderItem,
  keyExtractor,
  maxRenderCount = 50,
  className = "",
  footer,
}: WindowedListProps<T>) {
  const [renderCount, setRenderCount] = useState(maxRenderCount);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Increase render count when user scrolls near the end
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && renderCount < items.length) {
          setRenderCount(prev => Math.min(prev + maxRenderCount, items.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [renderCount, items.length, maxRenderCount]);

  // Reset render count when items change significantly
  useEffect(() => {
    if (items.length <= maxRenderCount) {
      setRenderCount(items.length);
    }
  }, [items.length, maxRenderCount]);

  const visibleItems = items.slice(0, renderCount);
  const hasMore = renderCount < items.length;

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <div key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {/* Intersection observer target for progressive loading */}
      {hasMore && (
        <div ref={loadMoreRef} className="h-10" aria-hidden="true" />
      )}
      
      {footer}
    </div>
  );
}

export default VirtualizedList;

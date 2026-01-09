import React, { useRef } from "react";
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  height?: string | number;
}

/**
 * VirtualizedList - Efficiently renders large lists by only rendering visible items
 *
 * @param items - Array of items to render
 * @param renderItem - Function to render each item
 * @param estimateSize - Estimated height of each item in pixels (default: 80)
 * @param overscan - Number of items to render outside viewport (default: 5)
 * @param className - Additional CSS classes
 * @param height - Height of the scrollable container (default: 600px)
 *
 * @example
 * ```tsx
 * <VirtualizedList
 *   items={properties}
 *   estimateSize={120}
 *   height="800px"
 *   renderItem={(property, index) => (
 *     <PropertyCard key={property.id} {...property} />
 *   )}
 * />
 * ```
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize = 80,
  overscan = 5,
  className = '',
  height = '600px',
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

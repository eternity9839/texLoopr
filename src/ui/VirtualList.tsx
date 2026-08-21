import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

export interface VirtualListProps<T> {
  items: T[];
  rowHeight: number;
  /** Fixed viewport height; omit to fill parent (needs parent with defined height) */
  height?: number;
  overscan?: number;
  className?: string;
  getKey: (item: T, index: number) => string;
  renderRow: (item: T, index: number) => ComponentChildren;
  scrollToIndex?: number | null;
}

export function VirtualList<T>({
  items,
  rowHeight,
  height,
  overscan = 10,
  className,
  getKey,
  renderRow,
  scrollToIndex = null,
}: VirtualListProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(height ?? 240);
  const lastScrollTarget = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (height != null) {
      setViewport(height);
      return;
    }
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => setViewport(el.clientHeight || 240);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    if (scrollToIndex == null || scrollToIndex < 0) return;
    if (lastScrollTarget.current === scrollToIndex) return;
    lastScrollTarget.current = scrollToIndex;
    const el = scrollerRef.current;
    if (!el) return;
    const top = scrollToIndex * rowHeight;
    const viewTop = el.scrollTop;
    const viewBottom = viewTop + viewport;
    if (top < viewTop || top + rowHeight > viewBottom) {
      el.scrollTo({ top: Math.max(0, top - viewport / 3) });
    }
  }, [scrollToIndex, rowHeight, viewport, items.length]);

  const vh = viewport;
  const total = items.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(vh / rowHeight) + overscan * 2;
  const end = Math.min(items.length, start + visibleCount);
  const slice = items.slice(start, end);
  const offsetY = start * rowHeight;

  return (
    <div
      ref={scrollerRef}
      class={className}
      style={{
        height: height != null ? `${height}px` : "100%",
        overflow: "auto",
        position: "relative",
      }}
      onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: `${total}px`, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {slice.map((item, i) => {
            const index = start + i;
            return (
              <div
                key={getKey(item, index)}
                style={{ height: `${rowHeight}px` }}
                class="virt-row"
              >
                {renderRow(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

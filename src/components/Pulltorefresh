import { ReactNode, TouchEvent, useRef, useState } from "react";

interface Props {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 64;

export default function PullToRefresh({ onRefresh, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function onTouchStart(e: TouchEvent) {
    if (refreshing) return;
    const el = containerRef.current;
    startY.current = el && el.scrollTop <= 0 ? e.touches[0].clientY : null;
  }

  function onTouchMove(e: TouchEvent) {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPull(Math.min(delta * 0.5, THRESHOLD * 1.4));
    }
  }

  async function onTouchEnd() {
    if (refreshing) {
      startY.current = null;
      return;
    }
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
    startY.current = null;
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="min-h-dvh overflow-y-auto"
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: pull }}
      >
        <span className="text-muted text-[11px] font-mono uppercase tracking-wide">
          {refreshing ? "Refreshing…" : pull >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
      {children}
    </div>
  );
}

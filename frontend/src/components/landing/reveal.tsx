"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Scroll-triggered motion for the landing page. Elements wait (invisible) until
// they scroll into view, then rise in on the fluid curve. Children can be
// staggered, and anything inside can key off the `in-view` class (meters,
// bars, counters). Reduced motion shows everything at once (see globals.css).

function useInView<T extends Element>(threshold = 0.2) {
  const ref = React.useRef<T>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, inView]);
  return [ref, inView] as const;
}

/** Rises in when scrolled into view; `stagger` animates its children one after another instead */
export function Reveal({
  children,
  className,
  stagger = false,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  /** ms before this element starts, when not staggering */
  delay?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(stagger ? "reveal-stagger" : "reveal", inView && "in-view", className)}
      style={!stagger && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/** Counts from 0 to `value` once it scrolls into view */
export function CountUp({ value, suffix = "", duration = 1100 }: { value: number; suffix?: string; duration?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.6);
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out (matches --ease-fluid closely enough for numbers)
      setShown(Math.round(value * (1 - Math.pow(1 - t, 4))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {shown}
      {suffix}
    </span>
  );
}

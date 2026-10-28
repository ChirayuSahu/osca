"use client";

import { useEffect, useState } from "react";

/**
 * Sticky offset for a side column that may be taller than the screen. Short
 * columns pin `gap` px from the top; tall ones scroll with the page until their
 * end is `gap` px from the bottom of the screen, then stay there, so nothing in
 * them is ever out of reach. Use with `position: sticky` and `style={{ top }}`.
 * `ref` is a callback ref, so columns that mount after a loading state work.
 */
export function useStickyEnd<T extends HTMLElement>(gap = 24) {
  const [el, setEl] = useState<T | null>(null);
  const [top, setTop] = useState(gap);

  useEffect(() => {
    if (!el) return;
    const measure = () => setTop(Math.min(gap, window.innerHeight - el.offsetHeight - gap));
    measure();
    // Content loading in (issues, details) changes the height
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [el, gap]);

  return { ref: setEl, top };
}

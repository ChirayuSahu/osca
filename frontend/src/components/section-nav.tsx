"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Entry = { id: string; title: string };

/**
 * "On this page" list built from the page's sections, highlighting the one
 * being read. Sections mark themselves with data-nav-section="Their title".
 */
export function SectionNav() {
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [active, setActive] = React.useState<string | null>(null);

  React.useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-section]"));
    setEntries(sections.map((s) => ({ id: s.id, title: s.dataset.navSection ?? s.id })));

    // The section nearest the top (below the sticky navbar) is the current one
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((r) => r.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  if (entries.length === 0) return null;
  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">On this page</p>
      <ul className="space-y-0.5 border-l border-border">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              aria-current={active === e.id ? "true" : undefined}
              className={cn(
                "-ml-px block border-l py-1.5 pl-3 leading-snug transition-colors",
                active === e.id
                  ? "border-emerald-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {e.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

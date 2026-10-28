"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, CircleDot, Compass, FolderGit2, LayoutDashboard, LayoutGrid, PanelLeft, Search, Sparkles, Sprout, Square, Star, Users } from "lucide-react";
import { RepoCard, RepoTitle } from "@/components/repo-ui";
import { Reasons } from "@/components/feed/reasons";
import type { Reason } from "@/types/feed";

// The "For you" feed as the app draws it, in the app's dark theme tokens, with sample data.
// Laid out at the app's real size, then zoomed to fit the hero frame.

const NAV = [
  {
    label: "Discover",
    items: [
      { name: "Assistant", icon: LayoutDashboard },
      { name: "For you", icon: Compass, active: true },
      { name: "Next issues", icon: CircleDot },
      { name: "Community", icon: Users },
    ],
  },
  {
    label: "Repositories",
    items: [
      { name: "Imported", icon: FolderGit2 },
      { name: "Search GitHub", icon: Search },
    ],
  },
];

const CARDS: { owner: string; name: string; description: string; reasons: Reason[]; match: number; goodFirst: number; stars: string }[] = [
  {
    owner: "medusajs",
    name: "medusa",
    description: "The world's most flexible commerce platform for agents and developers",
    reasons: [
      { kind: "language", text: "Written in TypeScript, which you write a lot" },
      { kind: "starters", text: "11 starter issues free to pick up" },
    ],
    match: 56,
    goodFirst: 11,
    stars: "37.0k",
  },
  {
    owner: "oppia",
    name: "oppia",
    description: "A free, online learning platform to make quality education accessible for all.",
    reasons: [
      { kind: "language", text: "Written in TypeScript, which you write a lot" },
      { kind: "responsive", text: "Maintainers reply within a day" },
    ],
    match: 54,
    goodFirst: 60,
    stars: "6.9k",
  },
];

// Real-size widths the preview is laid out at, before zooming: desktop, or a phone screen
const WIDE = 880;
const PHONE = 375;

export function DashboardPreview() {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // On phones the preview shows the app's phone layout: top bar instead of the sidebar
  const withSidebar = width >= 480;
  const base = withSidebar ? WIDE : PHONE;
  const zoom = width ? width / base : 0;

  return (
    <div
      ref={frame}
      className="w-full max-w-[640px] overflow-hidden rounded-2xl border-[6px] border-emerald-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] sm:border-8"
    >
      {/* The `dark` class switches the app's theme tokens on for this subtree */}
      <div
        className={`dark flex bg-background font-sans text-foreground ${withSidebar ? "" : "flex-col"}`}
        style={{ width: base, zoom, visibility: zoom ? "visible" : "hidden" }}
      >
        {withSidebar && (
          <aside className="flex w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 pb-3 pt-6">
            <p className="mb-4 text-center font-serif text-[28px] font-semibold italic leading-none tracking-tight">osca</p>
            {NAV.map((group) => (
              <div key={group.label} className="py-2">
                <p className="flex h-7 items-center px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1">
                  {group.items.map(({ name, icon: Icon, ...rest }) => {
                    const active = "active" in rest && rest.active;
                    return (
                      <div
                        key={name}
                        className={
                          active
                            ? "flex h-10 items-center gap-3 rounded-md bg-nav-active px-3 text-sm font-medium text-nav-active-foreground"
                            : "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground"
                        }
                      >
                        <Icon className="size-4" />
                        {name}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-auto flex h-12 items-center gap-3 rounded-md border border-sidebar-border px-2.5">
              <span className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-medium">VA</span>
              <div className="leading-tight">
                <p className="text-sm font-medium">Varada</p>
                <p className="text-xs text-muted-foreground">@varada</p>
              </div>
            </div>
          </aside>
        )}

        {!withSidebar && (
          <div className="grid h-14 grid-cols-[2rem_1fr_2rem] items-center border-b border-border px-4">
            <PanelLeft className="size-4" />
            <p className="justify-self-center font-serif text-[22px] font-semibold italic leading-none tracking-tight">osca</p>
          </div>
        )}

        <div className={withSidebar ? "flex min-w-0 flex-1 flex-col gap-6 px-6 pb-8 pt-8" : "flex flex-col gap-5 px-4 pb-6 pt-4"}>
          <div className="space-y-2">
            <h3 className={`${withSidebar ? "text-4xl" : "text-3xl"} font-semibold leading-tight tracking-tight`}>
              For <em className="font-serif font-medium">you</em>
            </h3>
            <p className="text-[15px] leading-relaxed text-foreground/75">
              Repositories matched to your skills, ranked by how friendly they are to newcomers.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-9 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 ${withSidebar ? "" : "flex-1"}`}>
                All languages <ChevronDown className="size-3.5 text-muted-foreground" />
              </span>
              <span className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-muted-foreground ${withSidebar ? "" : "flex-1"}`}>
                <Sprout className="size-3.5 text-emerald-400" /> Good first issues
              </span>
            </div>
            {/* Phones show the layout switch on its own row, as in the app */}
            {!withSidebar && (
              <div className="grid grid-cols-2 rounded-md bg-muted p-1">
                <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm bg-background font-medium">
                  <LayoutGrid className="size-3.5" /> Grid
                </span>
                <span className="inline-flex h-8 items-center justify-center gap-1.5 text-muted-foreground">
                  <Square className="size-3.5" /> One by one
                </span>
              </div>
            )}
          </div>

          <div className={withSidebar ? "grid grid-cols-2 gap-5" : "grid grid-cols-1 gap-5"}>
            {(withSidebar ? CARDS : CARDS.slice(0, 1)).map((card) => (
              <RepoCard key={card.name} className="h-full">
                <div className="flex flex-col gap-2 border-b border-border px-6 py-5">
                  <RepoTitle owner={card.owner} name={card.name} />
                  <p className="line-clamp-2 min-h-[2lh] text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                </div>
                <div className="flex-1 px-6 py-5">
                  <Reasons reasons={card.reasons} max={2} className="gap-2 text-sm text-foreground/80" />
                </div>
                <div className="flex items-center gap-4 whitespace-nowrap border-t border-border px-6 py-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-tint-emerald-500 px-2 py-0.5 font-semibold tabular-nums text-emerald-300">
                    <Sparkles className="size-3" /> {card.match}% match
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Sprout className="size-3.5 text-emerald-400" /> {card.goodFirst} good first
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 tabular-nums">
                    <Star className="size-3.5" /> {card.stars}
                  </span>
                </div>
              </RepoCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

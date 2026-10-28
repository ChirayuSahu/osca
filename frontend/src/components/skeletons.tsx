import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/ui/page-container";
import { cn } from "@/lib/utils";

// Loading states that mirror the layout they stand in for, so nothing jumps
// when the data arrives. Sizes follow the real components (text line heights,
// paddings, borders).

/* ─── Building blocks ──────────────────────────────────────────────────────── */

/** Eyebrow, serif title, description, divider — as in PageHeader */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-3 w-24" />
      <div className="space-y-3">
        <Skeleton className="h-11 w-56 md:h-12" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-2 h-px bg-border" />
    </div>
  );
}

/** Icon tile + value + label per stat, as in StatStrip */
export function StatStripSkeleton({ count = 4, iconTiles = true }: { count?: number; iconTiles?: boolean }) {
  return (
    <div className="grid grid-cols-2 border-t border-border bg-background sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 px-5 py-4 sm:px-6",
            i % 2 === 1 && "border-l border-border",
            i >= 2 && "border-t border-border sm:border-t-0",
            i > 0 && "sm:border-l"
          )}
        >
          {iconTiles && <div className="flex size-9 shrink-0 items-center justify-center"><Skeleton className="size-4" /></div>}
          <div className="flex h-9 flex-col justify-between">
            <Skeleton className="h-[18px] w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Card with a title row and list rows, as in the issues / comments / codebase cards */
export function ListCardSkeleton({ rows = 4, action = true }: { rows?: number; action?: boolean }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3.5 w-8" />
        {action && <Skeleton className="ml-auto h-8 w-24" />}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3.5">
            <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className={cn("h-3.5", i % 2 ? "w-3/5" : "w-4/5")} />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Side panel with an eyebrow and label/value rows, as in "Start contributing" / "Details" */
export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A grid of cards; pass the card's own skeleton */
export function CardGridSkeleton({ count = 6, card }: { count?: number; card: React.ReactNode }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>{card}</React.Fragment>
      ))}
    </div>
  );
}

/** Repository / feed card: owner, name, two description lines, footer */
export function RepoCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-[17px] w-2/5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      </div>
      <div className="flex items-center gap-3 px-5 pb-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="ml-auto h-8 w-20" />
      </div>
    </div>
  );
}

/* ─── Pages ────────────────────────────────────────────────────────────────── */

/** Header + card grid: feed, imported, search, community */
export function GridPageSkeleton({ toolbar = true }: { toolbar?: boolean }) {
  return (
    <PageContainer aria-busy="true">
      <PageHeaderSkeleton />
      {toolbar && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="ml-auto hidden h-9 w-48 sm:block" />
        </div>
      )}
      <CardGridSkeleton card={<RepoCardSkeleton />} />
    </PageContainer>
  );
}

/** Assistant: greeting, one suggestion, composer pinned to the bottom */
export function ChatSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex h-[calc(100svh-5rem)] w-full max-w-5xl flex-col px-4 pb-6 pt-2 md:h-[calc(100svh-2rem)] md:px-6"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <Skeleton className="h-12 w-[min(36rem,90%)] md:h-16" />
        <div className="flex w-full max-w-xl gap-2">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-12" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-64" />
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="size-9" />
          </div>
          <div className="flex gap-2 border-t border-border px-4 py-3">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Repository: header card with stat strip, issues + codebase, side panels */
export function RepositorySkeleton() {
  return (
    <PageContainer aria-busy="true">
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-11 w-64 md:h-12" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-3/5 max-w-md" />
            <div className="flex gap-1.5 pt-1">
              {[14, 12, 16, 10].map((w, i) => (
                <Skeleton key={i} className="h-5" style={{ width: `${w * 4}px` }} />
              ))}
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="size-9" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <StatStripSkeleton />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <ListCardSkeleton rows={5} />
          <ListCardSkeleton rows={6} action={false} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={5} />
        </div>
      </div>
    </PageContainer>
  );
}

/** Issue / PR: status, title, meta; body card + comments; details panel */
export function ThreadSkeleton() {
  return (
    <PageContainer aria-busy="true">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-8 w-full max-w-2xl md:h-9" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="size-8" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
        <div className="h-px bg-border" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <div className="space-y-2.5 px-5 py-4">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="mt-3 h-24 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
          <ListCardSkeleton rows={2} action={false} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <PanelSkeleton rows={5} />
          <ListCardSkeleton rows={3} action={false} />
        </div>
      </div>
    </PageContainer>
  );
}

/** Profile: identity card with stat strip, index + skills, contributions */
export function ProfileSkeleton({ header }: { header?: React.ReactNode }) {
  return (
    <PageContainer aria-busy="true">
      {header ?? <PageHeaderSkeleton />}
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="space-y-3">
            <Skeleton className="h-9 w-56 md:h-10" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <StatStripSkeleton iconTiles={false} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5 rounded-md border border-border bg-card p-5 sm:p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-14 w-32" />
          <Skeleton className="h-2 w-full" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="ml-auto h-3.5 w-6" />
            </div>
          ))}
        </div>
        <div className="space-y-5 rounded-md border border-border bg-card p-5 sm:p-6">
          <Skeleton className="h-3 w-24" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-8" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-5 rounded-md border border-border bg-card p-5 sm:p-6">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-28 w-full" />
      </div>
    </PageContainer>
  );
}

/** One-by-one feed: big card with issues list and stat strip, controls, side panel */
export function FeedFocusSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-busy="true">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="space-y-4 p-5 sm:p-6">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-56" />
            </div>
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-3/5" />
            <div className="flex gap-1.5">
              {[16, 10, 18, 12, 14].map((w, i) => (
                <Skeleton key={i} className="h-5" style={{ width: `${w * 4}px` }} />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          </div>
          <div className="space-y-3 border-t border-border px-5 py-4 sm:px-6">
            <Skeleton className="h-3 w-28" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <StatStripSkeleton />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-3 w-16" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
              <Skeleton className="h-3 w-3" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-3 w-7" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

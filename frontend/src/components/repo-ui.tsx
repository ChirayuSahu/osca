"use client";

// Shared building blocks for repository/contributor UI (see /dashboard/samples
// and DESIGN.md): minimal dither cards, coloured tags, language dots, status
// chips and the segmented meter.

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dither } from "@/components/ui/dither";
import { DitheredImage, githubAvatarUrl } from "@/components/ui/dithered-image";

/* ─── Tags ─────────────────────────────────────────────────────────────────── */

const TAG_COLORS: Record<string, string> = {
  typescript: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  react: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  python: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  go: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  rust: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
};
const FALLBACK_TAGS = [
  "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
];

export function tagColor(tag: string) {
  const known = TAG_COLORS[tag.toLowerCase()];
  if (known) return known;
  let hash = 0;
  for (const ch of tag) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return FALLBACK_TAGS[Math.abs(hash) % FALLBACK_TAGS.length];
}

export function Tag({ children, className }: { children: string; className?: string }) {
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", tagColor(children), className)}>{children}</span>;
}

/* ─── Language dot ─────────────────────────────────────────────────────────── */

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-emerald-500",
  Go: "bg-cyan-500",
  Rust: "bg-orange-500",
  Java: "bg-red-500",
  Kotlin: "bg-purple-500",
  Ruby: "bg-red-600",
  PHP: "bg-indigo-400",
  "C#": "bg-green-600",
  "C++": "bg-pink-500",
  C: "bg-gray-500",
  Swift: "bg-orange-400",
  Dart: "bg-sky-500",
};

export function LanguageDot({ language, className }: { language: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-2.5 rounded-full", LANGUAGE_COLORS[language] ?? "bg-muted-foreground")} />
      {language}
    </span>
  );
}

/** Largest language first from a GitHub-style `{ language: bytes }` map */
export function topLanguages(languages: unknown, count = 3): string[] {
  if (!languages || typeof languages !== "object") return [];
  return Object.entries(languages as Record<string, number>)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, count)
    .map(([name]) => name);
}

/* ─── Card surface ─────────────────────────────────────────────────────────── */

interface DitherCardProps extends React.ComponentProps<"div"> {
  /** GitHub login whose avatar is dithered into the top-right corner */
  logo?: string;
}

// Minimal card: the owner's logo is dithered into the corner (plain dither
// without one); hover only firms up the border and the dots.
export function DitherCard({ logo, className, children, onClick, ...props }: DitherCardProps) {
  const cornerDither = (
    <Dither
      cols={36}
      rows={14}
      cell={4}
      direction="top-right"
      className="absolute right-0 top-0 text-emerald-500/[0.10] transition-colors duration-500 group-hover:text-emerald-500/25"
    />
  );
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border border-border bg-card transition-colors duration-300 hover:border-foreground/20",
        onClick && "cursor-pointer",
        className
      )}
      {...props}
    >
      {logo ? (
        <div className="pointer-events-none absolute -right-6 -top-6 [mask-image:radial-gradient(circle_at_top_right,black_35%,transparent_75%)]">
          <DitheredImage
            src={githubAvatarUrl(logo)}
            cols={34}
            cell={4}
            className="text-emerald-500/[0.16] transition-colors duration-500 group-hover:text-emerald-500/35"
            fallback={cornerDither}
          />
        </div>
      ) : (
        cornerDither
      )}
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}

/* ─── Text bits ────────────────────────────────────────────────────────────── */

export function RepoTitle({ owner, name, className }: { owner: string; name: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate text-xs text-muted-foreground">{owner}</p>
      <p className="truncate text-[17px] font-semibold leading-tight">{name}</p>
    </div>
  );
}

/** Small emerald status chip with a dot, e.g. "Imported" or "77% match" */
export function StatusPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-medium tracking-wide text-emerald-700 dark:text-emerald-400",
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-emerald-500" />
      {children}
    </span>
  );
}

/** Uppercase section label used inside cards */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground", className)}>{children}</p>;
}

/* ─── Stat strip ───────────────────────────────────────────────────────────── */

export interface Stat {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  /** Emerald highlight (e.g. good first issues) */
  accent?: boolean;
}

// Static class names so Tailwind picks them up
const STAT_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

/** Bottom strip of a header card: icon tile, value and label per stat; 2 columns on phones */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  if (stats.length === 0) return null;
  return (
    <div className={cn("grid grid-cols-2 border-t border-border bg-background", STAT_COLS[stats.length], className)}>
      {stats.map(({ label, value, icon: Icon, accent }, i) => (
        <div
          key={label}
          className={cn(
            "flex min-w-0 items-center gap-3 px-5 py-4 sm:px-6",
            i % 2 === 1 && "border-l border-border",
            i >= 2 && "border-t border-border sm:border-t-0",
            i > 0 && "sm:border-l"
          )}
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center",
              accent ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )}
          >
            <Icon className="size-4" />
          </div>
          {/* Same 36px as the icon tile: value on its top edge, label on its bottom edge */}
          <div className="flex h-9 min-w-0 flex-col justify-between">
            <p className={cn("text-lg font-semibold leading-none tabular-nums", accent && "text-emerald-600 dark:text-emerald-400")}>
              {value}
            </p>
            <p className="truncate text-xs leading-none text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Meter ────────────────────────────────────────────────────────────────── */

/** Pixel meter in the dither style: filled squares out of `segments` */
export function SegmentedMeter({
  value,
  segments = 24,
  animated = false,
  className,
}: {
  value: number;
  segments?: number;
  /** Filled segments light up left to right once a parent gets `in-view` (landing page) */
  animated?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const filled = Math.round((clamped / 100) * segments);
  return (
    <div className={cn("flex gap-[3px]", className)} role="meter" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn("h-2 flex-1 rounded-[1px]", i < filled ? "bg-emerald-500" : "bg-muted", animated && i < filled && "segment-on")}
          style={animated && i < filled ? ({ "--i": i } as React.CSSProperties) : undefined}
        />
      ))}
    </div>
  );
}

/* ─── Formatting ───────────────────────────────────────────────────────────── */

export function compactNumber(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function timeAgo(iso: string | number | Date | null | undefined): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

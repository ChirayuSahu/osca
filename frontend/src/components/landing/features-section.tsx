import * as React from "react";
import { CircleDot } from "lucide-react";
import { Dither } from "@/components/ui/dither";
import { GithubIcon } from "@/components/icons";
import { SegmentedMeter } from "@/components/repo-ui";
import { cn } from "@/lib/utils";
import { CountUp, Reveal } from "@/components/landing/reveal";

// "How it works" as a bento: two wide steps, then three. Each step shows a small
// piece of the real product rather than an illustration.

function Step({
  step,
  title,
  className,
  children,
}: {
  step: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("group relative isolate flex flex-col overflow-hidden rounded-md border border-border bg-card", className)}>
      <Dither
        cols={46}
        rows={18}
        cell={4}
        direction="top-right"
        className="absolute right-0 top-0 -z-10 text-emerald-500/[0.12]"
      />
      <div className="space-y-2 p-6 pb-0 sm:p-7 sm:pb-0">
        <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{step}</p>
        <p className="max-w-md text-lg font-medium leading-snug tracking-tight sm:text-xl">{title}</p>
      </div>
      <div className="mt-auto p-6 pt-6 sm:p-7">{children}</div>
    </div>
  );
}

// Dashed line whose dashes flow towards OSCA
function FlowLine() {
  return (
    <svg aria-hidden className="h-px flex-1 overflow-visible text-muted-foreground/50" preserveAspectRatio="none" viewBox="0 0 100 1">
      <line x1="0" y1="0.5" x2="100" y2="0.5" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="dash-flow" />
    </svg>
  );
}

function ConnectVisual() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3">
      <GithubIcon className="size-5" />
      <FlowLine />
      <span className="text-xs text-muted-foreground">read-only</span>
      <FlowLine />
      <span className="inline-flex items-baseline gap-1">
        <span className="font-serif text-lg font-semibold italic leading-none">osca</span>
        <span className="size-1.5 -translate-y-[2px] rounded-full bg-emerald-500" aria-hidden />
      </span>
    </div>
  );
}

function SkillsVisual() {
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-4">
      {[
        { name: "TypeScript", value: 92 },
        { name: "Python", value: 54 },
        { name: "Go", value: 31 },
      ].map((s) => (
        <div key={s.name} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{s.name}</span>
          <SegmentedMeter value={s.value} segments={24} animated />
          <span className="text-right text-xs tabular-nums text-muted-foreground">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyzeVisual() {
  const slices = [
    { ext: ".ts", share: 58, swatch: "bg-emerald-500" },
    { ext: ".tsx", share: 22, swatch: "bg-emerald-500/60" },
    { ext: ".json", share: 9, swatch: "bg-emerald-500/30" },
    { ext: "other", share: 11, swatch: "bg-muted-foreground/25" },
  ];
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-4">
      <div className="flex h-2 w-full gap-[3px]">
        {slices.map((s, i) => (
          <span
            key={s.ext}
            className={cn("grow-x h-full rounded-[1px]", s.swatch)}
            style={{ width: `${s.share}%`, "--i": i } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {slices.map((s) => (
          <span key={s.ext} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-[1px]", s.swatch)} aria-hidden />
            <span className="font-mono">{s.ext}</span>
            <span className="text-muted-foreground tabular-nums">{s.share}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MatchVisual() {
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-background text-sm">
      {[
        { repo: "excalidraw/excalidraw", match: 92 },
        { repo: "medusajs/medusa", match: 88 },
        { repo: "ueberdosis/tiptap", match: 85 },
      ].map((r, i) => (
        <li
          key={r.repo}
          className="slide-row flex items-center justify-between gap-3 px-3.5 py-2.5"
          style={{ "--i": i } as React.CSSProperties}
        >
          <span className="truncate">{r.repo}</span>
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CountUp value={r.match} suffix="%" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function ContributeVisual() {
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-background text-sm">
      {[
        { title: "Export dialog ignores iOS safe area", n: 4833 },
        { title: "Add keyboard shortcut for zoom to fit", n: 8012 },
        { title: "Docs: clarify collaboration setup", n: 7790 },
      ].map((i, index) => (
        <li key={i.n} className="slide-row flex items-center gap-2.5 px-3.5 py-2.5" style={{ "--i": index } as React.CSSProperties}>
          <CircleDot className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="min-w-0 flex-1 truncate">{i.title}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">#{i.n}</span>
        </li>
      ))}
    </ul>
  );
}

export default function FeaturesSection() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <Reveal className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
              How it works
            </p>
            <h2 className="font-serif text-4xl font-medium italic tracking-tight md:text-5xl">From profile to first PR</h2>
          </div>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            Five steps, most of them automatic. You sign in; OSCA does the reading and ranking.
          </p>
        </Reveal>

        <Reveal stagger className="grid gap-4 lg:grid-cols-6">
          <Step step="01" title="Connect GitHub. OSCA only asks to read your public profile." className="lg:col-span-3">
            <ConnectVisual />
          </Step>
          <Step step="02" title="Your repos and contributions become a skill profile." className="lg:col-span-3">
            <SkillsVisual />
          </Step>
          <Step step="03" title="Repositories are mapped: languages, structure, issues." className="lg:col-span-2">
            <AnalyzeVisual />
          </Step>
          <Step step="04" title="Matches are ranked by skill fit and newcomer friendliness." className="lg:col-span-2">
            <MatchVisual />
          </Step>
          <Step step="05" title="Pick a good first issue and open your PR." className="lg:col-span-2">
            <ContributeVisual />
          </Step>
        </Reveal>
      </div>
    </section>
  );
}

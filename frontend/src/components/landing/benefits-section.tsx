import React from "react";
import { BarChart3, CheckCircle2, Clock, Code2, Compass, ListChecks, Map, Target } from "lucide-react";

type Feature = {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  /** Wide cards span two columns and show a small product preview */
  preview?: React.ReactNode;
};

// Small product previews, decorative only

const SKILLS = [
  { name: "TypeScript", value: 92 },
  { name: "React", value: 78 },
  { name: "Node.js", value: 64 },
];

function SkillsPreview() {
  return (
    <div className="flex flex-col gap-2.5">
      {SKILLS.map((s) => (
        <div key={s.name} className="flex items-center gap-3 text-xs">
          <span className="w-20 shrink-0 text-[#F0FFF2]/70">{s.name}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[#3CAE6B]" style={{ width: `${s.value}%` }} />
          </div>
          <span className="w-8 text-right font-mono text-[#F0FFF2]/60">{s.value}%</span>
        </div>
      ))}
    </div>
  );
}

const ROADMAP = [
  { label: "Set up the project locally", done: true },
  { label: "Read the contributing guide", done: true },
  { label: "Pick a good first issue", done: false },
];

function RoadmapPreview() {
  return (
    <ol className="flex flex-col gap-2">
      {ROADMAP.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2.5 text-xs">
          {s.done ? (
            <CheckCircle2 className="size-4 shrink-0 text-[#3CAE6B]" />
          ) : (
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-white/25 font-mono text-[9px] text-[#F0FFF2]/60">
              {i + 1}
            </span>
          )}
          <span className={s.done ? "text-[#F0FFF2]/50 line-through decoration-white/20" : "text-[#F0FFF2]/85"}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

const ISSUES = [
  { title: "Add dark mode to settings", level: "Easy", tone: "bg-emerald-500/15 text-emerald-300" },
  { title: "Cache the search results", level: "Medium", tone: "bg-amber-500/15 text-amber-300" },
  { title: "Rewrite the query planner", level: "Hard", tone: "bg-rose-500/15 text-rose-300" },
];

function IssuesPreview() {
  return (
    <div className="flex flex-col divide-y divide-white/[0.06] rounded-md border border-white/[0.08]">
      {ISSUES.map((issue) => (
        <div key={issue.title} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
          <span className="truncate text-[#F0FFF2]/80">{issue.title}</span>
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${issue.tone}`}>{issue.level}</span>
        </div>
      ))}
    </div>
  );
}

const ACTIVITY = [38, 52, 44, 70, 58, 82, 64, 90, 72, 60, 86, 76];

function AnalyticsPreview() {
  return (
    <div className="flex h-[76px] items-end gap-1.5">
      {ACTIVITY.map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${i === ACTIVITY.length - 1 ? "bg-[#3CAE6B]" : "bg-[#3CAE6B]/30"}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    title: "Skill-based matches",
    description: "Repository matches based on actual skills, not just language tags",
    icon: Target,
    color: "text-sky-400",
    preview: <SkillsPreview />,
  },
  { title: "Efficiency", description: "No more spending hours hunting for relevant issues", icon: Clock, color: "text-orange-400" },
  { title: "Relevancy", description: "Discover projects that actually align with your career goals", icon: Compass, color: "text-amber-300" },
  { title: "Accuracy", description: "Attract contributors who genuinely fit the codebase", icon: CheckCircle2, color: "text-emerald-400" },
  { title: "Code quality", description: "Fewer low-quality or mismatched pull requests", icon: Code2, color: "text-violet-400" },
  {
    title: "Roadmaps",
    description: "A personalized onboarding roadmap for every project",
    icon: Map,
    color: "text-emerald-400",
    preview: <RoadmapPreview />,
  },
  {
    title: "Project management",
    description: "Issues automatically categorized by difficulty and domain",
    icon: ListChecks,
    color: "text-rose-400",
    preview: <IssuesPreview />,
  },
  {
    title: "Analytics",
    description: "Data-driven insights based on contributor patterns",
    icon: BarChart3,
    color: "text-teal-300",
    preview: <AnalyticsPreview />,
  },
];

export default function BenefitsSection() {
  return (
    <section id="features" className="relative w-full select-none bg-[#030905] py-20 text-white md:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 md:gap-16 md:px-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <h2 className="font-serif text-4xl font-medium italic leading-[1.1] text-[#F0FFF2] md:text-5xl lg:text-[56px]">
            Our features
          </h2>
          <p className="max-w-[440px] text-lg leading-relaxed text-[#F0FFF2]/80 md:text-xl">
            Everything contributors need to find the right project, and maintainers need to find the right people
          </p>
        </div>

        {/* Bento: wide cards with a preview mixed with compact ones, four columns on desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`flex min-h-[200px] flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-white/20 ${
                  f.preview ? "sm:col-span-2" : ""
                }`}
              >
                <Icon className={`size-5 ${f.color}`} strokeWidth={2} aria-hidden />
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-[#F0FFF2]">{f.title}</h3>
                <p className="mt-2 max-w-[360px] text-sm leading-relaxed text-[#F0FFF2]/65">{f.description}</p>
                {f.preview && (
                  <div className="mt-auto pt-6" aria-hidden="true">
                    {f.preview}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

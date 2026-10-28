import React from "react";

// Fixed contribution pattern for the Step 2 mock (random values would differ
// between server and client renders)
const CONTRIBUTION_LEVELS = [0, 2, 1, 3, 1, 0, 2, 3, 3, 1, 2, 0, 1, 3, 2, 2, 0, 1, 3, 2, 1, 3, 2, 0];
const LEVEL_CLASSES = ["bg-emerald-950", "bg-emerald-800", "bg-emerald-600", "bg-emerald-400"];

const LATER_STEPS = [
  { step: "Step 3", desc: "Your repositories are analyzed across multiple metrics to understand what they need", image: "/step-3.webp" },
  { step: "Step 4", desc: "Our matching engine pairs you with projects that align with your skills and interests", image: "/step-4.webp" },
  { step: "Step 5", desc: "Receive your personalized roadmap and start contributing immediately", image: "/step-5.webp" },
];

// Every card shares the radius, padding and type scale, so the two rows line up
const card = "relative flex flex-col overflow-hidden rounded-2xl p-6 text-[#031303] md:p-8";
const stepLabel = "mb-3 block text-xs font-semibold uppercase tracking-wider text-[#031303]/50";
const stepText = "text-xl font-medium leading-snug lg:text-2xl";

export default function FeaturesSection() {
  return (
    <section id="how-it-works" className="relative w-full select-none overflow-hidden bg-[#020503] py-20 text-white md:py-28">
      {/* Background pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: "radial-gradient(circle at center, #ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 md:gap-16 md:px-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <h2 className="max-w-[520px] font-serif text-4xl font-medium italic leading-[1.1] text-[#F0FFF2] md:text-5xl lg:text-[56px]">
            How does our product work?
          </h2>
          <p className="max-w-[440px] text-lg leading-relaxed text-[#F0FFF2]/80 md:text-xl">
            From profile to perfect match in minutes, with a personalized contribution roadmap
          </p>
        </div>

        {/* One 6-column grid: two cards on top (3 columns each), three below (2 each) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className={`${card} min-h-[220px] bg-gradient-to-br from-[#e8f7ee] via-[#f0fdf4] to-[#cbe9d7] md:col-span-6 lg:col-span-3`}>
            <span className={stepLabel}>Step 1</span>
            <p className={`${stepText} max-w-[480px]`}>Connect your GitHub account to securely import your repositories</p>
            <div className="mt-auto flex w-fit items-center gap-3 rounded-lg border border-white/60 bg-white/50 px-4 py-2.5 pt-2.5" aria-hidden="true">
              <svg className="size-5 fill-neutral-900" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <div className="w-10 border-t border-dashed border-neutral-400" />
              <span className="font-serif text-base font-bold italic text-neutral-900">osca</span>
            </div>
          </div>

          <div className={`${card} min-h-[220px] bg-gradient-to-br from-[#e8f7ee] via-[#f0fdf4] to-[#cbe9d7] md:col-span-6 lg:col-span-3`}>
            <span className={stepLabel}>Step 2</span>
            <p className={`${stepText} relative z-10 max-w-[480px]`}>
              The engine scans your contribution history and coding pattern to build your skill profile
            </p>
            {/* Contribution graph mock, flush with the card's corner */}
            <div className="ml-auto mt-6 -mb-6 -mr-6 w-[200px] rounded-tl-lg border-l border-t border-neutral-800 bg-[#09150e] p-3 text-[9px] text-neutral-400 md:-mb-8 md:-mr-8" aria-hidden="true">
              <p className="mb-1.5 truncate font-medium text-white">3,591 contributions in the last year</p>
              <div className="grid h-10 w-full grid-flow-col grid-rows-4 gap-0.5">
                {CONTRIBUTION_LEVELS.map((level, i) => (
                  <div key={i} className={`rounded-[1px] ${LEVEL_CLASSES[level]}`} />
                ))}
              </div>
            </div>
          </div>

          {LATER_STEPS.map((s) => (
            <div
              key={s.step}
              className={`${card} min-h-[280px] bg-[#e8f7ee] bg-cover bg-center md:col-span-2 md:min-h-[340px]`}
              style={{ backgroundImage: `url('${s.image}')` }}
            >
              <span className={stepLabel}>{s.step}</span>
              <p className={`${stepText} max-w-[90%]`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

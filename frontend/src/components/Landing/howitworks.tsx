import React from "react";

export default function HowItWorks() {
  return (
    <div className="w-full bg-[#020503] text-white flex flex-col overflow-hidden select-none font-sans border-t border-white/[0.03]">
      <section id="how-it-works" className="relative w-full max-w-7xl mx-auto px-6 md:px-12 py-24 z-10 scroll-mt-20">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-16">
          <div className="max-w-[480px]">
            <span className="text-emerald-400 font-serif italic text-base block mb-2">Workflow</span>
            <h2 className="font-normal text-3xl md:text-4xl lg:text-[44px] text-white leading-[1.2] tracking-tight">
              How does <span className="font-serif italic text-neutral-300">osca</span> work?
            </h2>
          </div>
          <p className="w-full max-w-[480px] text-neutral-400 font-normal text-base md:text-lg leading-relaxed">
            From profile to perfect match in minutes, with a personalized contribution roadmap tailored to your skillset.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="w-full min-h-[160px] bg-neutral-950/40 border border-white/[0.05] hover:border-emerald-500/20 rounded-[24px] p-8 flex flex-col justify-center transition-all duration-300 group">
              <span className="text-xs font-semibold tracking-wider text-emerald-400 mb-3 uppercase block">Step 01</span>
              <p className="font-normal text-lg md:text-xl lg:text-[22px] leading-snug text-neutral-200 group-hover:text-white transition-colors duration-300">
                Connect your GitHub or GitLab profile to securely analyze your historical contributions.
              </p>
            </div>

            <div className="w-full min-h-[160px] bg-neutral-950/40 border border-white/[0.05] hover:border-emerald-500/20 rounded-[24px] p-8 flex flex-col justify-center transition-all duration-300 group">
              <span className="text-xs font-semibold tracking-wider text-emerald-400 mb-3 uppercase block">Step 02</span>
              <p className="font-normal text-lg md:text-xl lg:text-[22px] leading-snug text-neutral-200 group-hover:text-white transition-colors duration-300">
                The analysis engine maps your coding patterns, language expertise, and repository size preferences.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="w-full bg-neutral-950/40 border border-white/[0.05] hover:border-emerald-500/20 rounded-[24px] p-8 flex flex-col justify-start transition-all duration-300 group">
              <span className="text-xs font-semibold tracking-wider text-emerald-400 mb-3 uppercase block">Step 03</span>
              <p className="font-normal text-lg lg:text-[20px] leading-snug text-neutral-200 group-hover:text-white transition-colors duration-300">
                Open-source repositories are evaluated using multiple quality, activity, and dependency metrics.
              </p>
            </div>

            <div className="w-full bg-neutral-950/40 border border-white/[0.05] hover:border-emerald-500/20 rounded-[24px] p-8 flex flex-col justify-start transition-all duration-300 group">
              <span className="text-xs font-semibold tracking-wider text-emerald-400 mb-3 uppercase block">Step 04</span>
              <p className="font-normal text-lg lg:text-[20px] leading-snug text-neutral-200 group-hover:text-white transition-colors duration-300">
                Our matching algorithm recommends issue tags and repositories that perfectly fit your experience.
              </p>
            </div>

            <div className="w-full bg-neutral-950/40 border border-white/[0.05] hover:border-emerald-500/20 rounded-[24px] p-8 flex flex-col justify-start md:col-span-2 lg:col-span-1 transition-all duration-300 group">
              <span className="text-xs font-semibold tracking-wider text-emerald-400 mb-3 uppercase block">Step 05</span>
              <p className="font-normal text-lg lg:text-[20px] leading-snug text-neutral-200 group-hover:text-white transition-colors duration-300">
                Receive a personalized developer roadmap and seamlessly start your contribution journey.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
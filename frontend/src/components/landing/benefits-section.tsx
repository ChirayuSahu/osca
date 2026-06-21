export function BenefitsSection() {
  return (
    <section id="benefits" className="bg-[#020503] text-white">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-16">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
            <div className="max-w-[480px]">
              <span className="text-emerald-400 font-serif italic text-base block mb-2">Benefits</span>
              <h2 className="font-normal text-3xl md:text-4xl lg:text-[44px] text-white leading-[1.2] tracking-tight">
                Why choose <span className="font-serif italic text-neutral-300">osca</span>?
              </h2>
            </div>
            <p className="w-full max-w-[480px] text-neutral-400 font-normal text-base md:text-lg leading-relaxed">
              Unlock opportunities matched to your skills and help projects find the right contributors instantly.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="space-y-6 rounded-[2rem] border border-white/[0.05] bg-neutral-950/40 p-8">
              <div className="h-48 rounded-[1.75rem] bg-neutral-950/40 border border-white/[0.05]" />
              <div className="space-y-4">
                <p className="text-base font-normal tracking-tight text-emerald-400">For Contributors</p>
                <ul className="space-y-3 text-base leading-relaxed text-neutral-200">
                  <li>No more hours lost introducing the network in one line</li>
                  <li>Methods based on actual skills, not just language tags</li>
                  <li>Personalized onboarding roadmap for every project</li>
                  <li>Uncovered candidate outcomes matched with the flow</li>
                  <li>Discover options that align with your career goals</li>
                  <li>Self-serve analytics to guide learning together</li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/[0.05] bg-neutral-950/40 p-8">
                <div className="space-y-4">
                  <p className="text-base font-normal tracking-tight text-emerald-400">For Organisations</p>
                  <ul className="space-y-3 text-base leading-relaxed text-neutral-200">
                    <li>Attract contributors who genuinely fit the codebase</li>
                    <li>Reduce low-quality or mismatched pull requests</li>
                    <li>Focus automatically on difficulty and domain</li>
                    <li>Faster onboarding means contributors ship sooner</li>
                    <li>Better community discovery around the repository</li>
                    <li>Data-driven insights on contributor patterns</li>
                  </ul>
                </div>
              </div>
              <div className="h-48 rounded-[1.75rem] bg-neutral-950/40 border border-white/[0.05]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BenefitsSection() {
  return (
    <section id="benefits" className="bg-[#091209] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Benefits</p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <div className="h-48 rounded-[1.75rem] bg-slate-800/70" />
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-300">For Contributors</p>
                <ul className="space-y-3 text-sm leading-7 text-slate-200">
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
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-300">For Organisations</p>
                  <ul className="space-y-3 text-sm leading-7 text-slate-200">
                    <li>Attract contributors who genuinely fit the codebase</li>
                    <li>Reduce low-quality or mismatched pull requests</li>
                    <li>Focus automatically on difficulty and domain</li>
                    <li>Faster onboarding means contributors ship sooner</li>
                    <li>Better community discovery around the repository</li>
                    <li>Data-driven insights on contributor patterns</li>
                  </ul>
                </div>
              </div>
              <div className="h-48 rounded-[1.75rem] bg-slate-800/70" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

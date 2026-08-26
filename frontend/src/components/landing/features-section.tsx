import React from "react";

export default function FeaturesSection() {
  const cardBg = (src: string) => ({
    backgroundImage: `url('${src}')`,
  });

  const cardBase =
    "min-w-0 rounded-[24px] bg-cover bg-center text-[#031303] p-6 md:p-10 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 relative overflow-hidden";

  return (
    <section id="how-it-works" className="w-full h-full bg-[#020503] text-white flex items-center select-none relative overflow-hidden py-16 md:py-24">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, #ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-7xl mx-auto px-6 md:px-12 z-10 flex flex-col gap-12 md:gap-16">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 md:gap-8">
          <h2 className="font-serif italic font-medium text-3xl md:text-5xl lg:text-[56px] text-[#F0FFF2] leading-[1.1] max-w-[500px]">
            How does our product work?
          </h2>

          <p className="w-full max-w-[460px] text-[#F0FFF2] font-normal text-lg md:text-xl leading-relaxed">
            From profile to perfect match in minutes, with a personalized
            contribution roadmap
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Steps 1 & 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className="bg-gradient-to-br from-[#e8f7ee] via-[#f0fdf4] to-[#cbe9d7] text-neutral-900 rounded-[24px] p-8 flex flex-col justify-between min-h-[180px] group transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 block">Step 1</span>
                <p className="font-medium text-xl lg:text-[24px] leading-snug max-w-[520px]">
                  Connect your GitHub via Github or Gitlab to securely import your repositories
                </p>
              </div>
              <div className="flex items-center gap-3 mt-6 bg-white/40 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/50 w-fit">
                <div className="flex items-center gap-2" aria-hidden="true">
                  <svg className="w-5 h-5 fill-[#e24329]" viewBox="0 0 24 24">
                    <path d="M23.955 13.582l-1.32-4.067-1.428-4.401c-.08-.246-.423-.246-.503 0L19.276 9.515H4.724L3.316 5.114c-.08-.246-.423-.246-.503 0L1.385 9.515.045 13.582c-.144.444.013.931.393 1.205l11.085 8.061c.219.16.511.16.73 0l11.085-8.061c.38-.274.537-.761.393-1.205z"/>
                  </svg>
                  <svg className="w-5 h-5 fill-neutral-900" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <div className="w-12 border-t border-dashed border-neutral-400 mx-1" />
                <span className="font-serif italic font-bold text-neutral-900 text-base">osca</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gradient-to-br from-[#e8f7ee] via-[#f0fdf4] to-[#cbe9d7] text-neutral-900 rounded-[24px] p-8 flex flex-col justify-between min-h-[180px] group transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 block">Step 2</span>
                <p className="font-medium text-xl lg:text-[24px] leading-snug max-w-[520px]">
                  The engine scans your contribution history and coding pattern to build your skill profile
                </p>
              </div>
              
              <div className="absolute top-2 right-4 w-24 h-24 opacity-40 pointer-events-none" aria-hidden="true">
                <svg viewBox="0 0 200 200" className="w-full h-full text-emerald-600/30 fill-current">
                  <path d="M 100, 100 m -60, 0 a 60,60 0 1,0 120,0 a 60,60 0 1,0 -120,0" stroke="currentColor" strokeWidth="18" fill="none" opacity="0.6" />
                  <path d="M 100, 100 m -45, 0 a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.3" />
                </svg>
              </div>

              <div className="absolute right-0 bottom-0 w-[200px] bg-[#09150e] border-l border-t border-neutral-800 rounded-tl-xl p-3 font-sans text-[9px] text-neutral-400 select-none shadow-2xl" aria-hidden="true">
                <p className="text-white font-medium mb-1.5 truncate">
                  3,591 contributions in the last year
                </p>
                <div className="grid grid-flow-col grid-rows-4 gap-0.5 w-full h-10">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const opacities = ["bg-emerald-950", "bg-emerald-800", "bg-emerald-600", "bg-emerald-400"];
                    const bgClass = opacities[Math.floor(Math.random() * opacities.length)];
                    return <div key={i} className={`rounded-[1px] ${bgClass}`} />;
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Steps 3, 4, 5 generated via Array.map */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-fr max-w-6xl mx-auto w-full">
            {[
              { title: "Step 3", desc: "Your repositories are analyzed across multiple metrics to understand what they need" },
              { title: "Step 4", desc: "Our matching engine pairs you with projects that align with your skills and interests" },
              { title: "Step 5", desc: "Receive your personalized roadmap and start contributing immediately" }
            ].map((step, i) => (
              <div key={i} className={`${cardBase} min-h-[360px]`} style={cardBg(`group-${19-i}.png`)}>
                <div className="max-w-[90%] flex flex-col gap-4">
                  <span className="text-sm font-semibold uppercase tracking-wider text-[#031303] block">
                    {step.title}
                  </span>
                  <p className="font-medium text-xl md:text-2xl leading-tight">
                    {step.desc}
                  </p>
                </div>
                
                {/* Fixed: Moved the SVG decorative div inside the parent wrapper */}
                <div className="absolute -bottom-6 -right-2 w-20 h-20 text-emerald-600/20 pointer-events-none rotate-12" aria-hidden="true">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
import React from "react";

export default function FeaturesSection() {
  const cardBg = (src: any) => ({
    backgroundImage: `url('${src}')`,
  });

  const cardBase =
    "min-w-0 rounded-[24px] bg-cover bg-center text-[#031303] p-6 md:p-10 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 relative overflow-hidden";

  return (
    <section
      id="how-it-works"
      className="w-full bg-[#031303] text-[#F0FFF2] flex flex-col select-none relative overflow-hidden py-24 md:py-32"
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, #ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-7xl mx-auto px-6 md:px-12 z-10 flex flex-col gap-12 md:gap-16">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 md:gap-8">
          <h2 className="font-serif italic font-medium text-3xl md:text-5xl lg:text-[56px] text-[#F0FFF2] leading-[1.1] max-w-[500px]">
            How does our product work?
          </h2>

          <p className="w-full max-w-[460px] text-[#F0FFF2] font-normal text-lg md:text-xl leading-relaxed">
            From profile to perfect match in minutes, with a personalized
            contribution roadmap
          </p>
        </div>

        <div className="flex flex-col gap-6 md:gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 auto-rows-fr max-w-6xl mx-auto w-full">
            <div className={`${cardBase} min-h-[320px]`} style={cardBg("group-15.png")}>
              <div className="max-w-[75%] flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#031303] block">Step 1</span>
                <p className="font-medium text-lg md:text-2xl leading-snug">Connect your GitHub or GitLab to securely import your repositories</p>
              </div>
            </div>

            <div className={`${cardBase} min-h-[320px]`} style={cardBg("group-16.png")}>
              <div className="max-w-[75%] flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#031303] block">Step 2</span>
                <p className="font-medium text-lg md:text-2xl leading-snug">Our engine scans your contribution history and coding patterns</p>
              </div>
            </div>
          </div>

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
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
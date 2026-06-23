export default function FeaturesSection() {
  return (
    <div className="w-full bg-[#020503] text-white py-24">
      <section id="how-it-works" className="relative w-full max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8 mb-12">
          <h2 className="font-normal text-3xl md:text-4xl lg:text-[44px] text-white leading-[1.1] tracking-tight max-w-[400px]">
            How does our<br />product work?
          </h2>
          <p className="w-full max-w-[420px] text-neutral-400 font-normal text-base md:text-lg leading-relaxed">
            From profile to perfect match in minutes, with a personalized contribution roadmap
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#f0fdf4] text-neutral-900 rounded-[32px] p-8 flex flex-col justify-between min-h-[240px]">
              <div>
                <span className="text-sm font-medium text-neutral-600 block mb-3">Step 1</span>
                <p className="font-medium text-xl leading-snug">
                  Connect your profile via GitHub or GitLab to securely import your repositories
                </p>
              </div>
              
              <div className="flex items-center gap-2.5 mt-6">
                <div className="w-8 h-8 bg-neutral-900 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <div className="w-8 h-8 bg-[#e24329] rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.955 13.582l-1.32-4.067-1.428-4.401c-.08-.246-.423-.246-.503 0L19.276 9.515H4.724L3.316 5.114c-.08-.246-.423-.246-.503 0L1.385 9.515.045 13.582c-.144.444.013.931.393 1.205l11.085 8.061c.219.16.511.16.73 0l11.085-8.061c.38-.274.537-.761.393-1.205z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-[#f0fdf4] text-neutral-900 rounded-[32px] p-8 min-h-[240px]">
              <span className="text-sm font-medium text-neutral-600 block mb-3">Step 2</span>
              <p className="font-medium text-xl leading-snug">
                The engine scans your contribution history and coding pattern to build your skill profile
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#f0fdf4] text-neutral-900 rounded-[32px] p-8 min-h-[240px] relative overflow-hidden">
              <span className="text-sm font-medium text-neutral-600 block mb-3">Step 3</span>
              <p className="font-medium text-lg leading-snug">
                Your repositories are analysed for multiple metrics to understand their needs
              </p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-200/50 rounded-full blur-2xl"></div>
            </div>

            <div className="bg-[#f0fdf4] text-neutral-900 rounded-[32px] p-8 min-h-[240px]">
              <span className="text-sm font-medium text-neutral-600 block mb-3">Step 4</span>
              <p className="font-medium text-lg leading-snug">
                Our matching engine pairs you with projects that align with your skills & interests
              </p>
            </div>

            <div className="bg-[#f0fdf4] text-neutral-900 rounded-[32px] p-8 min-h-[240px] relative overflow-hidden">
              <span className="text-sm font-medium text-neutral-600 block mb-3">Step 5</span>
              <p className="font-medium text-lg leading-snug">
                Receive a personalised roadmap and start contributing
              </p>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-300/30 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
import React from "react";

export default function HeroSection() {
  return (
    <section id="home" className="relative w-full h-full bg-[#020503] flex flex-col overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/hero-bg.png')` }}
        />
      </div>

      <div className="w-full border-b border-white/[0.04] backdrop-blur-md relative z-20">
        <nav className="w-full max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <div className="text-xl font-semibold tracking-tight italic text-white font-serif">
            osca
          </div>

          <div className="hidden lg:flex items-center gap-12 text-sm font-medium text-neutral-400" aria-label="Main navigation">
            <a href="#home" className="text-white transition-colors duration-200" aria-current="page">Home</a>
            <a href="#how-it-works" className="hover:text-white transition-colors duration-200 whitespace-nowrap">How it works</a>
            <a href="#about" className="hover:text-white transition-colors duration-200">About</a>
            <a href="#benefits" className="hover:text-white transition-colors duration-200">Benefits</a>
          </div>

          <div>
            <a href="/dashboard" className="inline-block bg-neutral-900 border border-neutral-800 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-all duration-200">
              Sign up
            </a>
          </div>
        </nav>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex-1 flex flex-col lg:grid lg:grid-cols-2 items-center gap-12 pb-16 pt-12 md:pt-4">
        <div className="flex flex-col justify-center w-full max-w-[620px] space-y-6 text-center lg:text-left mt-8 lg:mt-0">
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-normal tracking-tight text-white leading-[1.15]">
            Lorem Ipsum Dolor sit{" "}
            <span className="font-serif italic text-[#F0FFF2] block mt-2">
              is a dummy text used as a placeholder
            </span>
          </h1>
          <p className="text-base md:text-lg text-[#F0FFF2] font-normal leading-relaxed max-w-md">
            An intelligent matchmaking layer that understands both sides and brings them together faster.
          </p>
          <div className="pt-2 flex justify-center lg:justify-start">
            <a href="#how-it-works" className="inline-block text-[#FFFFFF] bg-emerald-500 hover:bg-emerald-600  font-semibold px-7 py-3.5 rounded-full text-sm transition-all duration-200 text-center active:scale-95 shadow-lg shadow-emerald-500/10">
              Get Started
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end w-full mt-10 lg:mt-0" aria-hidden="true">
          <div className="w-full max-w-[640px] bg-[#020d06] border-[6px] sm:border-[10px] border-emerald-500/30 rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col sm:grid sm:grid-cols-[160px_1fr] md:grid-cols-[180px_1fr] font-sans overflow-hidden">

            <div className="border-b sm:border-b-0 sm:border-r border-neutral-800/80 px-4 py-4 sm:py-6 flex flex-row sm:flex-col gap-4 sm:gap-6 bg-[#010804] overflow-x-auto overflow-y-hidden sm:overflow-visible items-center sm:items-stretch">
              <div className="text-xl font-bold italic text-white font-serif pl-2 shrink-0">
                osca
              </div>

              <div className="flex flex-row sm:flex-col gap-1.5 w-full shrink-0">
                <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-neutral-900 bg-white rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  Home
                </button>

                {["Contributor Profile", "Skill Overview", "Recommendation"].map((tab) => (
                  <button key={tab} className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[10px] font-medium text-[#F0FFF2] hover:text-white transition-colors text-left">
                    <svg className="w-3 h-3 stroke-current fill-none opacity-60" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    <span className="truncate">{tab}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#F0FFF2] tracking-wide mb-2">
                  Welcome, Varada
                </h2>
                
                <div className="w-full h-5 bg-neutral-950/40 border border-white/[0.06] rounded-full mb-3" />

                <p className="text-[11px] font-semibold text-[#F0FFF2] tracking-wide mb-2">
                  Your repositories
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div className="bg-[#020503]/40 border border-white/[0.08] rounded-xl p-3.5 flex flex-col gap-2">
                    <div className="w-6 h-6 bg-orange-500/20 text-orange-400 rounded-md flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white mb-0.5">Repository-1</p>
                      <p className="text-[9px] text-[#F0FFF2] leading-snug line-clamp-2">
                        A basic description of the repository maybe a few lines from the Readme.md file...
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#020503]/40 border border-white/[0.08] rounded-lg p-2.5 flex flex-col gap-1.5">
                    <div className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-md flex items-center justify-center">
                      <svg className="w-3 h-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-3.497l-.003-.004c-.007-.008-.01-.013-.017-.019l-4.5-4.5a.75.75 0 00-1.06 0l-4.5 4.5a.75.75 0 101.06 1.06L10.5 9.56v6.94a.75.75 0 001.5 0V9.56l3.44 3.44a.75.75 0 101.06-1.06z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white mb-0.5">2nd Repository</p>
                      <p className="text-[9px] text-[#F0FFF2] leading-snug line-clamp-2">
                        A basic description of the repository maybe a few lines from the Readme.md file...
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] font-semibold text-[#F0FFF2] tracking-wide mb-2">
                  Commit History
                </p>

                <div className="w-full flex items-center justify-between text-[9px] mb-2">
                  <span className="text-[#F0FFF2]">Commits - last 6 months</span>
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1 text-[#F0FFF2]">
                      <span className="w-1.5 h-1.5 bg-[#009245] rounded-xs inline-block"></span>
                      Commits
                    </span>
                    <span className="flex items-center gap-1 text-[#F0FFF2]">
                      <span className="w-1.5 h-1.5 bg-[#d3d3d3] rounded-xs inline-block"></span>
                      PRs
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between w-full gap-2 h-10 mb-3">
                  {[
                    { green: "h-[65%]", gray: "h-[35%]" },
                    { green: "h-[75%]", gray: "h-[25%]" },
                    { green: "h-[55%]", gray: "h-[30%]" },
                    { green: "h-[60%]", gray: "h-[35%]" },
                    { green: "h-[45%]", gray: "h-[45%]" },
                    { green: "h-[70%]", gray: "h-[30%]" }
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col gap-0.5 overflow-hidden rounded-sm">
                      <div className={`bg-[#009245] ${bar.green} w-full`} />
                      <div className={`bg-[#d3d3d3] ${bar.gray} w-full`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 w-full text-[11px] border-t border-neutral-900/60 pt-4">
                <div>
                  <p className="text-[#F0FFF2] font-medium">Top file type</p>
                  <p className="text-[#F0FFF2] mt-0.5">.tsx - 38%</p>
                </div>
                <div>
                  <p className="text-[#F0FFF2] font-medium">Busiest Day</p>
                  <p className="text-[#F0FFF2] mt-0.5">Tuesday</p>
                </div>
                <div>
                  <p className="text-[#F0FFF2] font-medium">Avg commits/week</p>
                  <p className="text-[#F0FFF2] mt-0.5">14.2</p>
                </div>
                <div>
                  <p className="text-[#F0FFF2] font-medium">Solo vs Collab</p>
                  <p className="text-[#F0FFF2] mt-0.5">60/40</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
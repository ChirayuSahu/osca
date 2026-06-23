export default function HeroSection() {
  return (
    <section className="relative w-full min-h-screen bg-[#020503] text-white flex flex-col overflow-hidden select-none font-sans scroll-smooth">
      
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -right-[10%] top-1/2 -translate-y-1/2 w-[80%] h-[130%] rounded-full bg-radial from-emerald-500/30 via-emerald-700/10 to-transparent blur-[120px] z-10" />
      </div>

      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-8 flex items-center justify-between">
        <div className="text-2xl font-bold tracking-tight italic text-white font-serif">
          osca
        </div>

        <div className="hidden lg:flex items-center gap-12 text-sm font-medium text-neutral-400">
          <a href="#home" className="text-white transition-colors duration-200">Home</a>
          <a href="#how-it-works" className="hover:text-white transition-colors duration-200 whitespace-nowrap">How it works</a>
          <a href="#about" className="hover:text-white transition-colors duration-200">About</a>
          <a href="#benefits" className="hover:text-white transition-colors duration-200">Benefits</a>
          <a href="/developer-dashboard" className="hover:text-white transition-colors duration-200 text-emerald-400 hover:text-emerald-300">Dashboard</a>
        </div>

        <div>
          <button className="bg-neutral-900 border border-neutral-800 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-all duration-200">
            Sign up
          </button>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex-1 grid grid-cols-1 lg:grid-cols-2 items-center gap-12 pb-16 pt-4">
        
        <div className="flex flex-col justify-center w-full max-w-[620px] space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-[54px] font-normal tracking-tight text-white leading-[1.2]">
            Lorem Ipsum Dolor sit{" "}
            <span className="font-serif italic text-neutral-200">
              is a dummy text used as a placeholder
            </span>
          </h1>
          
          <p className="text-base md:text-lg text-neutral-400 font-normal leading-relaxed max-w-md">
            An intelligent matchmaking layer that understands both sides and brings them together faster.
          </p>

          <div className="pt-2">
            <a href="#how-it-works" className="inline-block bg-[#15803d] hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-full text-sm transition-all duration-200 text-center active:scale-95">
              Get Started
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-[440px] bg-[#0f1110] border border-neutral-900 rounded-[32px] p-6 shadow-2xl flex flex-col font-sans">
            
            <div className="text-center pb-5 border-b border-neutral-800/60">
              <h2 className="text-[32px] font-light text-white tracking-wide">
                Developer <span className="font-serif italic font-normal">Dashboard</span>
              </h2>
            </div>

            <div className="py-6 flex flex-col items-center">
              <span className="text-xl font-serif italic text-white tracking-wide mb-6">Contribution Statistics</span>
              
              <div className="w-full flex items-center justify-between text-[11px] text-neutral-300 px-1 mb-4">
                <span className="text-neutral-400">Commits - last 6 months</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#008746] rounded-xs inline-block"></span>
                    Commits
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#d4d4d4] rounded-xs inline-block"></span>
                    PRs
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between w-full gap-2.5 h-24 mb-6 px-1">
                {[
                  { green: "h-[65%]", gray: "h-[35%]" },
                  { green: "h-[78%]", gray: "h-[22%]" },
                  { green: "h-[70%]", gray: "h-[30%]" },
                  { green: "h-[75%]", gray: "h-[25%]" },
                  { green: "h-[62%]", gray: "h-[38%]" },
                  { green: "h-[74%]", gray: "h-[26%]" }
                ].map((bar, i) => (
                  <div key={i} className="flex-1 h-full flex flex-col rounded-md overflow-hidden">
                    <div className={`bg-[#008746] ${bar.green}`} />
                    <div className={`bg-[#d4d4d4] ${bar.gray} mt-1 rounded-b-md`} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-5 w-full text-sm px-1">
                <div>
                  <p className="text-neutral-300 font-medium">Top file type</p>
                  <p className="text-neutral-400 text-xs mt-0.5">.tsx - 38%</p>
                </div>
                <div>
                  <p className="text-neutral-300 font-medium">Busiest Day</p>
                  <p className="text-neutral-400 text-xs mt-0.5">Tuesday</p>
                </div>
                <div>
                  <p className="text-neutral-300 font-medium">Avg commits/week</p>
                  <p className="text-neutral-400 text-xs mt-0.5">14.2</p>
                </div>
                <div>
                  <p className="text-neutral-300 font-medium">Solo vs Collab</p>
                  <p className="text-neutral-400 text-xs mt-0.5">60/40</p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-5 border-t border-neutral-800/60 text-center flex flex-col items-center">
              <p className="text-2xl text-white tracking-wide mb-4">
                Welcome, <span className="font-serif italic">Name!</span>
              </p>
              
              <div className="relative w-full h-10 bg-[#0a0c0b] rounded-full border border-neutral-800 flex items-center pl-4 pr-1.5 mb-4">
                <input 
                  type="text" 
                  className="w-full h-full bg-transparent text-white placeholder-neutral-700 text-sm focus:outline-none pr-2 font-mono"
                  placeholder="|"
                />
                <button className="w-7 h-7 shrink-0 rounded-full bg-white flex items-center justify-center text-black shadow-sm cursor-pointer hover:bg-neutral-200 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>

              <div className="flex gap-2 justify-center">
                {["Repo 1", "Repo 2", "Repo 3"].map((repo, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded border border-[#008746]/40 bg-[#052e16]/30 text-[10px] font-serif italic text-emerald-400">
                    {repo}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
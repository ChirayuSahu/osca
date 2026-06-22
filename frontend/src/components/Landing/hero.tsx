import React from "react";

export default function Hero() {
  return (
    <section className="relative w-full min-h-screen bg-[#020503] text-white flex flex-col overflow-hidden select-none font-sans">
      
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[70%] h-[120%] rounded-full bg-radial from-white/20 via-emerald-400/40 via-emerald-600/20 to-transparent blur-[80px] z-10" />
        <div className="absolute right-[25%] top-1/2 -translate-y-1/2 w-[55%] h-[90%] rounded-full bg-[#020503] blur-[40px] z-20 origin-right scale-x-[1.4]" />
      </div>

      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-10 flex items-center justify-between">
        <div className="text-2xl font-bold tracking-tight italic text-white font-serif">
          osca
        </div>

        <div className="hidden lg:flex items-center justify-center w-[667px] h-[25px] gap-[70px] text-sm font-medium text-neutral-400">
          <a href="#home" className="text-white transition-colors duration-200">Home</a>
          <a href="#how-it-works" className="hover:text-white transition-colors duration-200 whitespace-nowrap">How it works</a>
          <a href="#about" className="hover:text-white transition-colors duration-200">About</a>
          <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
          <a href="/developer-dashboard" className="hover:text-white transition-colors duration-200 text-emerald-400 hover:text-emerald-300">Dashboard</a>
        </div>

        <div>
          <button className="bg-neutral-900 border border-neutral-800 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-all duration-200">
            Sign up
          </button>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex-1 grid grid-cols-1 lg:grid-cols-2 items-center gap-12 pb-16 pt-8">
        
        <div className="flex flex-col justify-center w-full max-w-[677px] min-h-[406px] rounded-[32.5px] space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-normal tracking-tight text-white leading-[1.15]">
            Lorem Ipsum Dolor sit{" "}
            <span className="font-serif italic text-neutral-200 block mt-3">
              is a dummy text used as a placeholder
            </span>
          </h1>
          
          <p className="text-base md:text-lg text-neutral-400 font-normal leading-relaxed max-w-xl">
            An intelligent matchmaking layer that understands both sides and brings them together faster.
          </p>

          <div className="pt-4">
            <a href="#how-it-works" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-semibold px-7 py-3.5 rounded-full text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all duration-200 text-center">
              Get Started
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end w-full">
          <div className="relative w-full max-w-[626px] h-[463px] bg-neutral-950/80 border border-white/[0.04] rounded-[48px] backdrop-blur-xl flex items-center justify-center p-8 group hover:border-white/[0.08] transition-all duration-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
            <span className="text-xl md:text-2xl font-normal tracking-tight text-neutral-400 group-hover:text-neutral-200 transition-colors duration-300">
              Element
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Code2 } from "lucide-react";

// Custom Github SVG Icon to bypass Lucide version export issues
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export function ChatConsole() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/repositories?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/dashboard/repositories`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/dashboard/repositories?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        router.push(`/dashboard/repositories`);
      }
    }
  };

  return (
    <form onSubmit={handleSearchSubmit} className="w-full flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto z-10">
      <div className="space-y-3">
        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-none">
          {greeting}, <span className="font-serif italic font-medium text-neutral-200">Developer</span>
        </h1>
        <p className="text-neutral-400 text-sm md:text-base font-light">
          Search repositories, verify match scores, and explore personalized roadmaps.
        </p>
      </div>

      {/* Claude-style Chat Box Container */}
      <div className="w-full bg-neutral-950/40 border border-white/[0.05] rounded-[24px] p-4 flex flex-col gap-3 shadow-2xl backdrop-blur-xl transition-all duration-300 focus-within:border-emerald-500/20 focus-within:shadow-[0_0_50px_-12px_rgba(16,185,129,0.08)]">
        <div className="flex items-start gap-3">
          <div className="mt-2 text-neutral-500">
            <Search className="w-5 h-5 ml-1" />
          </div>
          <textarea
            rows={1}
            placeholder="Find good first issues in TypeScript repos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-0 outline-none text-white text-base placeholder:text-neutral-650 resize-none py-1.5 focus:ring-0 leading-relaxed font-light"
          />
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.03] pt-3">
          {/* Quick Actions (Claude-style Pills) */}
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => router.push('/dashboard/repositories')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.03] text-xs text-neutral-400 hover:text-white transition-all duration-200"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              Browse Repositories
            </button>
            <button 
              type="button" 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.03] text-xs text-neutral-400 hover:text-white transition-all duration-200"
            >
              <Code2 className="w-3.5 h-3.5" />
              Languages
            </button>
          </div>

          {/* Send / Search action */}
          <div className="flex items-center gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-neutral-400 hover:text-white transition-colors px-2"
              >
                Clear
              </button>
            )}
            <button 
              type="submit"
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-semibold active:scale-95 transition-all duration-200 shadow-lg shadow-emerald-500/10"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

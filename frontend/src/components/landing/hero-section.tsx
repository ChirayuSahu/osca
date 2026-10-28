import React from "react";
import Link from "next/link";
import { DashboardPreview } from "./dashboard-preview";

export default function HeroSection() {
  return (
    <section id="home" className="relative flex min-h-svh w-full select-none flex-col overflow-hidden bg-[#020503] md:h-full">
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/hero-bg.png')` }}
        />
      </div>

      <div // Top padding clears the fixed navbar (h-16)
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center gap-12 px-4 pb-16 pt-28 md:px-12 lg:grid lg:grid-cols-2 lg:pb-12 lg:pt-24">
        <div className="flex w-full max-w-[620px] flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-normal tracking-tight text-white leading-[1.15]">
            Open source projects{" "}
            <span className="mt-2 block font-serif italic text-[#F0FFF2]">
              matched to your skills
            </span>
          </h1>
          <p className="text-base md:text-lg text-[#F0FFF2] font-normal leading-relaxed max-w-md">
            OSCA reads your GitHub history to learn what you are good at, then matches you with repositories and beginner-friendly issues, plus a roadmap to your first pull request.
          </p>
          <div className="pt-2">
            <Link href="/register" className="inline-flex h-11 items-center rounded-md bg-[#3CAE6B] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#349a5e]">
              Get started
            </Link>
          </div>
        </div>

        <div className="flex w-full justify-center lg:justify-end" aria-hidden="true">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
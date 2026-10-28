"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedDither } from "@/components/ui/animated-dither";
import { GithubIcon } from "@/components/icons";

export default function HeroSection() {
  return (
    <section id="home" className="relative isolate overflow-hidden">
      <AnimatedDither
        cols={260}
        rows={130}
        cell={5}
        falloff={1.2}
        peak={0.6}
        className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-500/[0.12]"
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-7 px-4 pb-24 pt-20 text-center md:px-6 md:pb-32 md:pt-28">
        <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          Open-source matchmaking
        </p>
        <h1 className="text-balance text-4xl font-light leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          Find open source projects where your{" "}
          <span className="font-serif font-medium italic text-emerald-600 dark:text-emerald-400">first PR is welcome.</span>
        </h1>
        <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          OSCA reads the languages you already write on GitHub, then matches you with active repositories and good
          first issues, ranked by how friendly they are to newcomers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild className="h-11">
            <Link href="/register">
              <GithubIcon /> Continue with GitHub
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-11">
            <a href="#how-it-works">
              See how it works <ArrowRight />
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Free and open source. Read-only access to your public profile.</p>
      </div>
    </section>
  );
}

import * as React from "react";
import Navbar from "@/components/landing/navbar";
import { SiteFooter } from "@/components/landing/site-footer";
import { AnimatedDither } from "@/components/ui/animated-dither";
import { SectionNav } from "@/components/section-nav";

export const LEGAL_UPDATED = "October 28, 2026";
export const REPO_URL = "https://github.com/ChirayuSahu/osca";

/**
 * Shared shell for the Privacy Policy and Terms, in the landing page's language:
 * its navbar and footer, a dithered hero with the serif title, then the text in a
 * readable column beside a sticky "On this page" list.
 */
export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <Navbar />
      <main>
        <section className="relative isolate overflow-hidden border-b border-border">
          <AnimatedDither
            cols={220}
            rows={70}
            cell={5}
            falloff={1.2}
            peak={0.55}
            className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-500/[0.12]"
          />
          <div className="hero-rise mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-16 md:px-6 md:py-24">
            <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
              Legal
            </p>
            <h1 className="font-serif text-4xl font-medium italic tracking-tight md:text-6xl">{title}</h1>
            <p className="text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
            <div className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{intro}</div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 md:px-6 md:py-20 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <SectionNav />
            </div>
          </aside>
          <div className="max-w-3xl space-y-12">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** A numbered section with a heading; it also lists itself in the page's contents */
export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-nav-section={title} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-emerald-700 [&_a]:underline-offset-4 hover:[&_a]:underline dark:[&_a]:text-emerald-400 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

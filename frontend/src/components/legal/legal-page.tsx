import * as React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dither } from "@/components/ui/dither";

export const LEGAL_UPDATED = "October 28, 2026";
export const REPO_URL = "https://github.com/ChirayuSahu/osca";

/** Shared shell for the Privacy Policy and Terms: wordmark bar, serif title, readable column */
export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 md:px-6">
        <Link href="/" aria-label="osca home" className="inline-flex items-baseline gap-1.5">
          <span className="font-serif text-[26px] font-semibold italic leading-none tracking-tight">osca</span>
          <span className="size-2 -translate-y-[3px] rounded-full bg-emerald-500" aria-hidden />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 md:px-6">
        <div className="relative isolate space-y-4">
          <Dither
            cols={110}
            rows={30}
            cell={5}
            direction="radial"
            peak={0.6}
            className="absolute -right-10 -top-10 -z-10 text-emerald-500/[0.14]"
          />
          <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Legal
          </p>
          <h1 className="font-serif text-4xl font-medium italic tracking-tight md:text-5xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
          <div className="text-[15px] leading-relaxed text-muted-foreground">{intro}</div>
        </div>
        <div className="my-10 h-px bg-border" />
        <div className="space-y-10">{children}</div>

        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/" className="hover:text-foreground">Home</Link>
        </div>
      </main>
    </div>
  );
}

/** A numbered section with a heading; body text uses the readable defaults */
export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-emerald-700 [&_a]:underline-offset-4 hover:[&_a]:underline dark:[&_a]:text-emerald-400 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

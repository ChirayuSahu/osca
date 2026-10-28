import * as React from "react";
import Navbar from "@/components/landing/navbar";
import Footer, { REPO_URL } from "@/components/landing/footer";
import { SectionNav } from "@/components/section-nav";

export const LEGAL_UPDATED = "October 28, 2026";
export { REPO_URL };

/**
 * Shared shell for the Privacy Policy and Terms, in the landing page's design:
 * its navbar and footer, the green backdrop behind a serif title, then the text
 * in a readable column beside a sticky "On this page" list. Always dark (the
 * `dark` class switches the theme tokens), like the landing page.
 */
export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-[#020503] text-[#F0FFF2] antialiased">
      <Navbar />
      <main>
        <section
          // Phones show the right side of the backdrop, so the glow stays in view
          className="border-b border-white/[0.06] bg-[#03130a] bg-cover bg-[position:78%_center] sm:bg-center"
          style={{ backgroundImage: "url('/auth-bg.webp')" }}
        >
          {/* Top padding clears the fixed navbar (h-16) */}
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-32 md:px-12 md:pb-24 md:pt-40">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#F0FFF2]/60">Legal</p>
            <h1 className="font-serif text-4xl font-medium italic leading-[1.1] md:text-5xl lg:text-[56px]">{title}</h1>
            <p className="text-sm text-[#F0FFF2]/60">Last updated {LEGAL_UPDATED}</p>
            <div className="max-w-2xl text-lg leading-relaxed text-[#F0FFF2]/80">{intro}</div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 md:px-12 md:py-20 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <SectionNav />
            </div>
          </aside>
          <div className="max-w-3xl space-y-12">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** A numbered section with a heading; it also lists itself in the page's contents */
export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-nav-section={title} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-[#F0FFF2]">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-[#F0FFF2]/70 [&_a]:font-medium [&_a]:text-[#5cc98a] [&_a]:underline-offset-4 hover:[&_a]:underline [&_strong]:font-medium [&_strong]:text-[#F0FFF2] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

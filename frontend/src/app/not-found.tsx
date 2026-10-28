import Link from "next/link";
import Navbar from "@/components/landing/navbar";

export const metadata = { title: "Page not found | OSCA" };

/** 404 for every route, in the landing page's design: navbar over the green backdrop. Always dark. */
export default function NotFound() {
  return (
    <div
      // Phones show the right side of the backdrop, so the glow stays in view
      className="relative flex min-h-svh w-full flex-col bg-[#03130a] bg-cover bg-[position:78%_center] text-white sm:bg-center"
      style={{ backgroundImage: "url('/backdrop.webp')" }}
    >
      <Navbar />

      {/* Top padding clears the fixed navbar (h-16) */}
      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-28">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Error 404</p>
          <h1 className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Page <em className="font-serif font-medium">not found</em>
          </h1>
          <p className="mt-4 text-balance text-[15px] leading-relaxed text-white/70">
            The link may be broken, or the page may have moved. Let&apos;s get you back to something useful.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-md bg-[#3CAE6B] px-5 text-sm font-medium text-white transition-colors hover:bg-[#349a5e]"
            >
              Go to dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-md border border-white/15 px-5 text-sm font-medium text-white/85 transition-colors hover:border-white/30 hover:text-white"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";

const LINKS = [
  // Absolute, so they also work from the sign-in pages
  { href: "/#home", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
];

/** The landing page's bar, pinned to the top. Always dark, like the landing page. */
export default function Navbar() {
  const { user, loading } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#020503]/70 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6 md:px-12">
        <Link
          href="/"
          aria-label="osca home"
          className="justify-self-start font-serif text-xl font-semibold italic leading-none tracking-tight text-[#F0FFF2]"
        >
          osca
        </Link>

        <div className="hidden items-center gap-10 text-sm text-[#F0FFF2]/70 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Hidden until the session check ends, so signed-in users don't see "Sign in" flash */}
        <div className={`col-start-3 flex items-center gap-2 justify-self-end ${loading ? "invisible" : ""}`}>
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center whitespace-nowrap rounded-md bg-[#3CAE6B] px-4 text-sm font-medium text-white transition-colors hover:bg-[#349a5e]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-[#F0FFF2]/80 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center whitespace-nowrap rounded-md bg-[#3CAE6B] px-4 text-sm font-medium text-white transition-colors hover:bg-[#349a5e]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

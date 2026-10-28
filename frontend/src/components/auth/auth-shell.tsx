"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { GithubIcon } from "@/components/icons";
import Navbar from "@/components/landing/navbar";

/**
 * Sign-in and sign-up: the landing page's deep green backdrop (glow on the
 * right, dotted rails) under the landing navbar, the wordmark, one heading and
 * the GitHub button. Always dark, whatever the app theme, like the landing page.
 */
export function AuthShell({
  title,
  error,
  footer,
}: {
  title: string;
  error?: string | null;
  footer: React.ReactNode;
}) {
  const { loginWithGithub, loading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const busy = authLoading || redirecting;

  const start = () => {
    setRedirecting(true);
    loginWithGithub();
  };

  return (
    <div
      // Phones show the right side of the backdrop, so the glow stays in view
      className="relative flex min-h-svh w-full flex-col bg-[#03130a] bg-cover bg-[position:78%_center] text-white sm:bg-center"
      style={{ backgroundImage: "url('/auth-bg.webp')" }}
    >
      <Navbar />

      {/* Top padding clears the fixed navbar (h-16) */}
      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-28">
        <div className="flex w-full max-w-[380px] flex-col items-center text-center">
          <Link href="/" aria-label="osca home" className="font-serif text-[30px] font-semibold italic leading-none tracking-tight">
            osca
          </Link>
          <h1 className="mt-6 text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-[26px]">{title}</h1>

          {error && (
            <div
              role="alert"
              className="mt-6 flex w-full items-start gap-2.5 rounded-md border border-red-400/30 bg-red-950/60 px-3 py-2.5 text-left text-sm text-red-100"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-300" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="mt-8 flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md bg-[linear-gradient(100deg,#f4fbf6_0%,#eaf7ee_55%,#c2e8cd_100%)] px-4 text-sm font-medium text-[#0b1a10] shadow-sm transition-[filter] hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#03130a] disabled:cursor-wait disabled:opacity-80"
          >
            {busy ? <Spinner className="size-[18px] text-[#0b1a10]" /> : <GithubIcon className="size-[18px]" aria-hidden />}
            {redirecting ? "Connecting to GitHub…" : authLoading ? "Checking session…" : "Continue with GitHub"}
          </button>

          <div className="mt-5 text-sm text-white/60 [&_a]:font-medium [&_a]:text-white [&_a]:underline-offset-4 hover:[&_a]:underline">
            {footer}
          </div>
        </div>
      </main>

      {/* One line from small tablets up; phones wrap it evenly */}
      <p className="mx-auto text-balance px-4 pb-8 text-center text-xs leading-relaxed text-white/45 sm:whitespace-nowrap">
        By continuing, you agree to the{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-white/80">Terms of Service</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-white/80">Privacy Policy</Link>.
      </p>
    </div>
  );
}

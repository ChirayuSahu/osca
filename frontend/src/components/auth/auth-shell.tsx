"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CircleAlert, Compass, GitPullRequest, Lock, Sprout } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AnimatedDither } from "@/components/ui/animated-dither";
import { Dither } from "@/components/ui/dither";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon } from "@/components/icons";

const POINTS = [
  { icon: Compass, text: "Repositories matched to the languages you already write" },
  { icon: Sprout, text: "Ranked by how friendly they are to first-time contributors" },
  { icon: GitPullRequest, text: "Good first issues, ready to pick up" },
];

function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="osca home" className={`inline-flex items-baseline gap-1.5 ${className ?? ""}`}>
      <span className="font-serif text-[26px] font-semibold italic leading-none tracking-tight">osca</span>
      <span className="size-2 -translate-y-[3px] rounded-full bg-emerald-500" aria-hidden />
    </Link>
  );
}

/**
 * Split layout for sign-in and sign-up: a brand panel with the animated dither on
 * the left (desktop), the GitHub action on the right.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  error,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
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
    <div className="grid min-h-svh w-full bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="relative isolate hidden overflow-hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <AnimatedDither
          cols={150}
          rows={150}
          cell={5}
          falloff={1.1}
          peak={0.7}
          className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-500/[0.14]"
        />
        <Wordmark />
        <div className="max-w-md space-y-8">
          <h2 className="font-serif text-5xl font-medium italic leading-[1.05] tracking-tight">
            Find your first <span className="text-emerald-600 dark:text-emerald-400">contribution</span>.
          </h2>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-muted-foreground">
                <Icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Open-source contributor matchmaking</p>
      </aside>

      {/* Action panel */}
      <main className="relative flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Wordmark className="lg:invisible" />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="relative isolate w-full max-w-sm">
            {/* Phones get a smaller, static dither behind the heading */}
            <Dither
              cols={90}
              rows={34}
              cell={5}
              direction="radial"
              peak={0.6}
              className="pointer-events-none absolute -top-16 left-1/2 -z-10 -translate-x-1/2 text-emerald-500/[0.12] lg:hidden"
            />
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                {eyebrow}
              </p>
              <h1 className="font-serif text-4xl font-medium italic tracking-tight">{title}</h1>
              <p className="leading-relaxed text-muted-foreground">{description}</p>
            </div>

            {error && (
              <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/[0.06] px-3.5 py-3 text-sm">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>{error}</span>
              </div>
            )}

            <Button onClick={start} disabled={busy} size="lg" className="mt-8 h-11 w-full text-[15px]">
              {busy ? <Spinner className="text-current" /> : <GithubIcon />}
              {redirecting ? "Connecting to GitHub…" : authLoading ? "Checking session…" : "Continue with GitHub"}
            </Button>

            <div className="mt-6 flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                OSCA reads your public GitHub profile and email to match you with projects. It can&apos;t see private
                code, and nothing is posted to GitHub unless you do it yourself.
              </span>
            </div>

            <div className="mt-8 h-px bg-border" />
            <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}

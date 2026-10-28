import Link from "next/link";
import {
  Bot,
  Compass,
  GalleryHorizontal,
  GitBranch,
  ListChecks,
  Sprout,
  Users,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dither } from "@/components/ui/dither";
import { GithubIcon } from "@/components/icons";
import { Wordmark } from "@/components/landing/navbar";
import { Reveal } from "@/components/landing/reveal";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Compass, title: "Skill-based matches", description: "Ranked by how much of a repo is written in languages you actually use." },
  { icon: Sprout, title: "Newcomer friendly first", description: "Good first issues, recent activity and a contributing guide count in the ranking." },
  { icon: Bot, title: "OscaBot", description: "Ask for projects in plain words, or for the open issues in any repository." },
  { icon: GalleryHorizontal, title: "One by one", description: "Go through matches like a deck: like, skip or open with a key press." },
  { icon: GitBranch, title: "Codebase map", description: "See where the code lives, what to read first, and its dependencies." },
  { icon: ListChecks, title: "Good first issues", description: "Unassigned starter issues for every repository, ready to pick up." },
  { icon: Users, title: "Community", description: "Find developers with your skills and the projects they're active in." },
  { icon: ShieldCheck, title: "Private by default", description: "No private repo access, encrypted tokens, chats that aren't stored." },
];

export default function BenefitsSection() {
  return (
    <>
      <section id="features" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <Reveal className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                Features
              </p>
              <h2 className="font-serif text-4xl font-medium italic tracking-tight md:text-5xl">Built for first contributions</h2>
            </div>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Everything is aimed at one thing: getting from &ldquo;I want to contribute&rdquo; to an open PR.
            </p>
          </Reveal>
          <Reveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-3 rounded-md border border-border bg-card p-6">
                <Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                <p className="font-medium">{title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="relative isolate overflow-hidden border-t border-border">
        <Dither
          cols={200}
          rows={60}
          cell={5}
          direction="radial"
          peak={0.55}
          className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-500/[0.12]"
        />
        <Reveal stagger className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center md:px-6">
          <h2 className="text-balance font-serif text-4xl font-medium italic tracking-tight md:text-5xl">
            Your first contribution is closer than you think.
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Sign in with GitHub and get your first matches in a couple of minutes.
          </p>
          <Button size="lg" asChild className="h-11">
            <Link href="/register">
              <GithubIcon /> Continue with GitHub
            </Link>
          </Button>
        </Reveal>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center md:px-6">
          <Wordmark />
          <span>Open-source contributor matchmaking</span>
          <div className="flex gap-5 sm:ml-auto">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <a href="https://github.com/ChirayuSahu/osca" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
          </div>
        </div>
      </footer>
    </>
  );
}

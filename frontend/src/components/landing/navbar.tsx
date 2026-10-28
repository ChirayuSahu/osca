import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
];

export function Wordmark() {
  return (
    <Link href="/" aria-label="osca home" className="inline-flex items-baseline gap-1.5">
      <span className="font-serif text-[26px] font-semibold italic leading-none tracking-tight">osca</span>
      <span className="size-2 -translate-y-[3px] rounded-full bg-emerald-500" aria-hidden />
    </Link>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center gap-8 px-4 md:px-6">
        <Wordmark />
        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

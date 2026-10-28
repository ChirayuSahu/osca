import Link from "next/link";
import { Wordmark } from "@/components/landing/navbar";

// Shared by the landing page and the legal pages
export function SiteFooter() {
  return (
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
  );
}

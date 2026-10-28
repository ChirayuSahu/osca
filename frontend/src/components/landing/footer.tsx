import Link from "next/link";

export const REPO_URL = "https://github.com/ChirayuSahu/osca";

/** Footer for the landing and legal pages. Always dark, like the landing page. */
export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#020503] text-[#F0FFF2]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:gap-6 md:px-12">
        <Link href="/" aria-label="osca home" className="font-serif text-xl font-semibold italic leading-none tracking-tight">
          osca
        </Link>
        <span className="text-[#F0FFF2]/50">Open source contributor matchmaking</span>
        <div className="flex gap-6 text-[#F0FFF2]/70 sm:ml-auto">
          <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

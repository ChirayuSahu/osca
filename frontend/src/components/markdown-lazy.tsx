"use client";

import dynamic from "next/dynamic";

// The markdown stack (react-markdown, remark-gfm, rehype-raw) is ~100 kB, so it
// loads on demand instead of with the page.
const loadMarkdown = () => import("@/components/markdown").then((m) => m.Markdown);

export const Markdown = dynamic(loadMarkdown, {
  loading: () => (
    <div className="flex flex-col gap-2 py-1" aria-hidden>
      <div className="h-3.5 w-full animate-pulse rounded-sm bg-muted" />
      <div className="h-3.5 w-4/5 animate-pulse rounded-sm bg-muted" />
    </div>
  ),
});

/** Start fetching the markdown chunk early (e.g. when a chat message is sent) */
export const preloadMarkdown = () => {
  void loadMarkdown();
};

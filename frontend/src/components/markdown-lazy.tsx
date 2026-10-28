"use client";

import dynamic from "next/dynamic";

// The markdown stack (react-markdown, remark-gfm, rehype-raw) is ~100 kB, and the
// GitHub HTML renderer brings GitHub's stylesheet, so both load on demand.
const loadMarkdown = () => import("@/components/markdown").then((m) => m.Markdown);

const loading = () => (
  <div className="flex flex-col gap-2 py-1" aria-hidden>
    <div className="h-3.5 w-full animate-pulse rounded-sm bg-muted" />
    <div className="h-3.5 w-4/5 animate-pulse rounded-sm bg-muted" />
  </div>
);

export const Markdown = dynamic(loadMarkdown, { loading });

const GithubHtml = dynamic(() => import("@/components/github-html").then((m) => m.GithubHtml), { loading });

/** Start fetching the markdown chunk early (e.g. when a chat message is sent) */
export const preloadMarkdown = () => {
  void loadMarkdown();
};

/**
 * An issue or comment body: GitHub's own rendering (`body_html`) when the API
 * sent it, otherwise the raw markdown.
 */
export function GithubBody({ html, markdown }: { html?: unknown; markdown?: unknown }) {
  if (typeof html === "string" && html.trim()) return <GithubHtml html={html} />;
  if (typeof markdown === "string" && markdown.trim()) return <Markdown>{markdown}</Markdown>;
  return null;
}

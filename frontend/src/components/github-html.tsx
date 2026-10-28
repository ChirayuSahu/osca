"use client";

import { renderGithubHtml } from "@/lib/github-html";
import { cn } from "@/lib/utils";
import "github-markdown-css/github-markdown.css";
import "./github-markdown.css";

// Issues and comments exactly as GitHub renders them (the API's `body_html`),
// styled with GitHub's own markdown stylesheet.
export function GithubHtml({ html, className }: { html: string; className?: string }) {
  return <div className={cn("markdown-body min-w-0", className)}>{renderGithubHtml(html)}</div>;
}

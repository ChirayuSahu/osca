"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";

// GitHub-flavoured markdown for issue bodies and comments, styled to the app:
// quiet inline code, framed scrollable code blocks, emerald links, rounded-md media.
const PROSE = [
  "prose dark:prose-invert max-w-none break-words",
  "prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
  "prose-a:font-medium prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400",
  "prose-code:rounded-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:overflow-x-auto prose-pre:rounded-md prose-pre:border prose-pre:border-border prose-pre:bg-muted/50 prose-pre:text-foreground",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs",
  "prose-img:rounded-md prose-blockquote:border-l-border prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "prose-table:block prose-table:overflow-x-auto prose-th:text-left prose-hr:border-border",
  "[&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none",
  "[&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:align-middle prose-li:my-0.5",
].join(" ");

export interface MarkdownProps {
  children: string;
  className?: string;
  /** "sm" for issue bodies and comments, "base" for chat replies */
  size?: "sm" | "base";
  /** Render inline HTML (GitHub content uses it); off for model output */
  allowHtml?: boolean;
}

export function Markdown({ children, className, size = "sm", allowHtml = true }: MarkdownProps) {
  return (
    <div className={cn(PROSE, size === "sm" ? "prose-sm" : "prose-base prose-p:leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // GitHub content may contain raw HTML from anyone who can open an issue;
        // sanitize it with GitHub's own allow-list (no <style>, <iframe>, <form>,
        // event handlers or javascript: URLs)
        rehypePlugins={allowHtml ? [rehypeRaw, rehypeSanitize] : []}
        components={{
          // Task-list checkboxes are the only inputs GitHub markdown produces
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          input: ({ node, ...props }) =>
            props.type === "checkbox" ? <input {...props} checked={props.checked ?? false} readOnly /> : null,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

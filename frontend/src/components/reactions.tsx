"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isGithubTokenError } from "@/lib/api";
import { cn } from "@/lib/utils";

// GitHub's eight reactions, in GitHub's order
export const REACTIONS = [
  { content: "+1", emoji: "👍", label: "Thumbs up" },
  { content: "-1", emoji: "👎", label: "Thumbs down" },
  { content: "laugh", emoji: "😄", label: "Laugh" },
  { content: "hooray", emoji: "🎉", label: "Hooray" },
  { content: "confused", emoji: "😕", label: "Confused" },
  { content: "heart", emoji: "❤️", label: "Heart" },
  { content: "rocket", emoji: "🚀", label: "Rocket" },
  { content: "eyes", emoji: "👀", label: "Eyes" },
] as const;

export type ReactionContent = (typeof REACTIONS)[number]["content"];

/** GitHub's `reactions` rollup on an issue or comment (counts by content) */
export type ReactionRollup = Partial<Record<ReactionContent, number>>;

type State = { counts: ReactionRollup; mine: Set<string> };

/**
 * Reaction pills plus an "add reaction" picker. Updates optimistically and
 * settles on what GitHub reports (`onToggle` resolves to whether it was added).
 */
export function Reactions({
  reactions,
  viewerReactions,
  onToggle,
  className,
}: {
  reactions?: ReactionRollup;
  viewerReactions?: string[];
  onToggle: (content: ReactionContent) => Promise<boolean>;
  className?: string;
}) {
  const [state, setState] = useState<State>(() => ({
    counts: { ...reactions },
    mine: new Set(viewerReactions ?? []),
  }));
  const [pending, setPending] = useState<Set<string>>(new Set());

  const apply = (s: State, content: ReactionContent, added: boolean): State => {
    const mine = new Set(s.mine);
    if (added === mine.has(content)) return s;
    if (added) mine.add(content);
    else mine.delete(content);
    const count = Math.max(0, (s.counts[content] ?? 0) + (added ? 1 : -1));
    return { counts: { ...s.counts, [content]: count }, mine };
  };

  const toggle = async (content: ReactionContent) => {
    if (pending.has(content)) return;
    const before = state;
    setState((s) => apply(s, content, !s.mine.has(content)));
    setPending((p) => new Set(p).add(content));
    try {
      const added = await onToggle(content);
      setState((s) => apply(s, content, added));
    } catch (err) {
      setState(before);
      toast.error(isGithubTokenError(err) ? "Reconnect GitHub to react." : "Couldn't update your reaction.");
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(content);
        return next;
      });
    }
  };

  const shown = REACTIONS.filter((r) => (state.counts[r.content] ?? 0) > 0);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((r) => {
        const mine = state.mine.has(r.content);
        return (
          <button
            key={r.content}
            type="button"
            onClick={() => toggle(r.content)}
            aria-pressed={mine}
            aria-label={`${r.label}: ${state.counts[r.content]}`}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs tabular-nums transition-colors",
              mine
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-sm leading-none" aria-hidden>
              {r.emoji}
            </span>
            {state.counts[r.content]}
          </button>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Add reaction"
            className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground"
          >
            <SmilePlus className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="grid w-auto min-w-0 grid-cols-4 gap-0.5 p-1">
          {REACTIONS.map((r) => (
            <DropdownMenuItem
              key={r.content}
              aria-label={r.label}
              title={r.label}
              onSelect={() => toggle(r.content)}
              className={cn(
                "size-8 justify-center p-0 text-base",
                state.mine.has(r.content) && "bg-emerald-500/10 focus:bg-emerald-500/15"
              )}
            >
              {r.emoji}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

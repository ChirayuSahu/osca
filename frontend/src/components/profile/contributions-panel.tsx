"use client";

import React, { useEffect, useState } from "react";
import { GitMerge, GitPullRequest, GitPullRequestClosed } from "lucide-react";
import { toast } from "sonner";
import { ContributionSummary, UserService, type Contribution } from "@/services/user.service";
import { Eyebrow, timeAgo } from "@/components/repo-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Merged PRs via OSCA already celebrated in this browser
const CELEBRATED_KEY = "osca:celebrated-merges";

const SURFACE_LABEL: Record<string, string> = {
  feed: "For you",
  focus: "For you",
  issues: "Next issues",
  repository: "a repository page",
};

const STATE = {
  open: { icon: GitPullRequest, label: "Open", tone: "text-emerald-600 dark:text-emerald-400" },
  merged: { icon: GitMerge, label: "Merged", tone: "text-purple-600 dark:text-purple-400" },
  closed: { icon: GitPullRequestClosed, label: "Closed", tone: "text-muted-foreground" },
} as const;

const celebrate = (contributions: Contribution[]) => {
  let seen: string[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? "[]");
  } catch {
    seen = [];
  }
  const fresh = contributions.filter((c) => c.attributed && c.state === "merged" && !seen.includes(c.id));
  if (fresh.length === 0) return;
  const first = fresh[0];
  toast.success(
    fresh.length === 1 ? "Your PR was merged" : `${fresh.length} of your PRs were merged`,
    { description: `${first.repoFullName}#${first.prNumber} — a contribution OSCA pointed you to. Nicely done.` }
  );
  try {
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...seen, ...fresh.map((c) => c.id)]));
  } catch {
    // no storage: it may celebrate again next time
  }
};

function Row({ c }: { c: Contribution }) {
  const state = STATE[c.state];
  const Icon = state.icon;
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon className={cn("mt-0.5 size-4 shrink-0", state.tone)} aria-label={state.label} />
      <div className="min-w-0 flex-1 space-y-1">
        <a href={c.prUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">
          {c.title}
        </a>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span>
            <a href={`https://github.com/${c.repoFullName}`} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              {c.repoFullName}
            </a>
            #{c.prNumber}
          </span>
          <span>{c.state === "merged" && c.mergedAt ? `Merged ${timeAgo(c.mergedAt)}` : `Opened ${timeAgo(c.openedAt)}`}</span>
          {c.attributed && (
            <span className="rounded-md bg-tint-emerald-500 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
              Via {SURFACE_LABEL[c.surface ?? ""] ?? "OSCA"}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

/**
 * Your public pull requests, checked daily (and when you open this page), with
 * the ones OSCA led you to called out. Merged ones get a one-time celebration.
 */
export function ContributionsPanel({ userId, token }: { userId: string; token: string }) {
  const [data, setData] = useState<ContributionSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    UserService.getContributions(userId, token)
      .then((summary) => {
        if (cancelled) return;
        setData(summary);
        celebrate(summary.contributions);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [userId, token]);

  const viaOsca = data?.contributions.filter((c) => c.attributed) ?? [];
  const others = data?.contributions.filter((c) => !c.attributed) ?? [];

  return (
    <div className="min-w-0 rounded-md border border-border bg-card p-5 sm:p-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow>Contributions via OSCA</Eyebrow>
        {data && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {data.totals.viaOsca} PRs · {data.totals.mergedViaOsca} merged
          </span>
        )}
      </div>
      {failed ? (
        <p className="py-3 text-sm text-muted-foreground">Couldn&apos;t load your contributions right now.</p>
      ) : !data ? (
        <div className="space-y-3 py-3" aria-busy="true">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : viaOsca.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          When you open a pull request to a project OSCA showed you, it appears here. Your public PRs are checked once a day.
        </p>
      ) : (
        <ul className="divide-y divide-border">{viaOsca.map((c) => <Row key={c.id} c={c} />)}</ul>
      )}
      {others.length > 0 && (
        <details className="mt-3 border-t border-border pt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Your other open-source PRs ({others.length})
          </summary>
          <ul className="divide-y divide-border">{others.map((c) => <Row key={c.id} c={c} />)}</ul>
        </details>
      )}
    </div>
  );
}

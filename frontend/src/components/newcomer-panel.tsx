"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { RepositoryService, StarterIssue } from "@/services/repository.service";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, timeAgo } from "@/components/repo-ui";
import { cn } from "@/lib/utils";

interface NewcomerPanelProps {
  repositoryId: string;
  token: string;
  repo: {
    owner?: unknown;
    name?: unknown;
    goodFirstIssueCount?: unknown;
    helpWantedCount?: unknown;
    hasContributingGuide?: unknown;
    pushedAt?: unknown;
  };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "Start contributing": the repo's newcomer facts plus its open starter issues.
export function NewcomerPanel({ repositoryId, token, repo }: NewcomerPanelProps) {
  const [issues, setIssues] = useState<StarterIssue[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    RepositoryService.getStarterIssues(repositoryId, token)
      .then((data) => { if (!cancelled) setIssues(data); })
      .catch((err) => {
        console.error("Failed to load starter issues", err);
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [repositoryId, token]);

  const owner = typeof repo.owner === "string" ? repo.owner : null;
  const name = typeof repo.name === "string" ? repo.name : null;
  const pushedAt = typeof repo.pushedAt === "string" ? repo.pushedAt : null;

  // Only facts the repository actually reports
  const facts: { label: string; value: string; accent?: boolean }[] = [
    ...(typeof repo.goodFirstIssueCount === "number"
      ? [{ label: "Good first issues", value: repo.goodFirstIssueCount.toLocaleString(), accent: true }]
      : []),
    ...(typeof repo.helpWantedCount === "number"
      ? [{ label: "Help wanted", value: repo.helpWantedCount.toLocaleString() }]
      : []),
    ...(typeof repo.hasContributingGuide === "boolean"
      ? [{ label: "Contributing guide", value: repo.hasContributingGuide ? "Yes" : "No" }]
      : []),
    ...(pushedAt ? [{ label: "Last push", value: capitalize(timeAgo(pushedAt)) }] : []),
  ];

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center justify-between px-5 pt-5">
        <h3 className="text-base font-semibold">Start contributing</h3>
        {owner && name && (
          <Button variant="ghost" size="icon-sm" asChild className="text-muted-foreground">
            <a
              href={`https://github.com/${owner}/${name}/contribute`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the contribute page"
              title="Open the contribute page"
            >
              <ExternalLink />
            </a>
          </Button>
        )}
      </div>

      {facts.length > 0 && (
        <dl className="mx-5 mt-4 divide-y divide-border rounded-md border border-border bg-background/60">
          {facts.map(({ label, value, accent }) => (
            <div key={label} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={cn("font-medium tabular-nums", accent && "text-emerald-700 dark:text-emerald-400")}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Eyebrow className="mt-5 px-5">Good first issues</Eyebrow>

      {issues === null && !failed && (
        <div className="mt-1 px-2 pb-3" aria-busy="true">
          {["w-11/12", "w-3/4", "w-4/5"].map((w) => (
            <div key={w} className="flex items-start gap-3 px-3 py-2.5">
              <Skeleton className="mt-1.5 size-1.5 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className={`h-3.5 ${w}`} />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      )}
      {failed && <p className="px-5 pb-5 pt-2 text-sm text-muted-foreground">Couldn&apos;t load issues right now.</p>}
      {issues !== null && issues.length === 0 && (
        <p className="px-5 pb-5 pt-2 text-sm text-muted-foreground">No open starter issues right now.</p>
      )}
      {issues !== null && issues.length > 0 && (
        <ul className="mt-1 px-2 pb-3">
          {issues.map((issue) => (
            <li key={issue.number}>
              <a
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", issue.assigned ? "bg-muted-foreground/30" : "bg-emerald-500")}
                  title={issue.assigned ? "Assigned" : "Unassigned"}
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm">{issue.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    #{issue.number} · {timeAgo(issue.createdAt)} · {issue.comments} {issue.comments === 1 ? "comment" : "comments"}
                    {issue.assigned ? " · assigned" : ""}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

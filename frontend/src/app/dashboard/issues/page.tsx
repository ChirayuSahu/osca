"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleDot, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { FeedService, IssueRecommendation } from "@/services/feed.service";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { ListCardSkeleton } from "@/components/skeletons";
import { LanguageDot } from "@/components/repo-ui";
import { Reasons } from "@/components/feed/reasons";
import { GithubReconnectNotice } from "@/components/github-reconnect-notice";
import { isGithubTokenError } from "@/lib/api";
import { trackRecommendation } from "@/lib/recommendation-events";

// When you last opened this page, so issues opened since then get a "New" badge
const SEEN_KEY = "osca:issues-seen";

const readSeen = (): number => {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
};

const HEADER = (
  <PageHeader
    eyebrow="Discover"
    title="Next issues"
    description="Starter issues nobody has claimed yet, from the projects that match you best."
  />
);

export default function NextIssuesPage() {
  const { token } = useAuth();
  const [issues, setIssues] = useState<IssueRecommendation[] | null>(null);
  const [error, setError] = useState<"token" | "other" | null>(null);
  const [lastSeen] = useState(readSeen);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      setIssues(await FeedService.getIssueRecommendations(token));
      try {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch {
        // storage unavailable: no "New" badges next time
      }
    } catch (err) {
      setError(isGithubTokenError(err) ? "token" : "other");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <PageContainer>
        {HEADER}
        {error === "token" ? (
          <GithubReconnectNotice action="load issues" />
        ) : (
          <ErrorState message="We couldn't load issues for you." onRetry={load} />
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {HEADER}
      {issues === null ? (
        <ListCardSkeleton rows={6} action={false} />
      ) : issues.length === 0 ? (
        <EmptyState
          icon={<CircleDot />}
          title="No open starter issues right now"
          description="Your best matches have no unclaimed starter issues at the moment. Check back soon, or widen your languages in Settings."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/settings#recommendations">Recommendation settings</Link>
            </Button>
          }
        />
      ) : (
        <section className="overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
            <h2 className="text-base font-semibold">For you</h2>
            <span className="text-sm text-muted-foreground tabular-nums">{issues.length}</span>
            <p className="ml-auto hidden text-xs text-muted-foreground sm:block">Refreshes every 15 minutes</p>
          </div>
          <ul className="stagger-in divide-y divide-border">
            {issues.map((issue, position) => {
              const opened = () =>
                trackRecommendation({ type: "issue_open", surface: "issues", repositoryId: issue.repository.id, issueUrl: issue.url, position });
              const isNew = lastSeen > 0 && Date.parse(issue.createdAt) > lastSeen;
              return (
                <li key={issue.url} className="flex items-start gap-3 px-5 py-4">
                  <CircleDot className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Link
                        href={`/dashboard/repository/${issue.repository.id}/threads/${issue.number}`}
                        onClick={opened}
                        className="min-w-0 font-medium leading-snug hover:underline"
                      >
                        {issue.title}
                      </Link>
                      {isNew && (
                        <span className="rounded-md bg-tint-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          New
                        </span>
                      )}
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <Link href={`/dashboard/repository/${issue.repository.id}`} className="hover:text-foreground">
                        {issue.repository.owner}/{issue.repository.name} #{issue.number}
                      </Link>
                      {issue.repository.primaryLanguage && <LanguageDot language={issue.repository.primaryLanguage} />}
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <MessageSquare className="size-3" aria-hidden /> {issue.comments}
                      </span>
                      {issue.labels.slice(0, 3).map((label) => (
                        <span key={label.name} className="inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ backgroundColor: `#${label.color}` }} aria-hidden />
                          {label.name}
                        </span>
                      ))}
                    </p>
                    <Reasons reasons={issue.reasons} max={3} className="sm:flex-row sm:flex-wrap sm:gap-x-4" />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </PageContainer>
  );
}

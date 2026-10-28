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
import { CardGridSkeleton, RepoCardSkeleton } from "@/components/skeletons";
import { LanguageDot, RepoCard, RepoTitle } from "@/components/repo-ui";
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
    title={<>Next <em>issues</em></>}
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
        <CardGridSkeleton card={<RepoCardSkeleton />} />
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
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-base font-semibold">For you</h2>
            <span className="text-sm text-muted-foreground tabular-nums">{issues.length}</span>
            <p className="ml-auto hidden text-xs text-muted-foreground sm:block">Refreshes every 15 minutes</p>
          </div>
          <ul className="stagger-in grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {issues.map((issue, position) => {
              const opened = () =>
                trackRecommendation({ type: "issue_open", surface: "issues", repositoryId: issue.repository.id, issueUrl: issue.url, position });
              const isNew = lastSeen > 0 && Date.parse(issue.createdAt) > lastSeen;
              return (
                <li key={issue.url}>
                  {/* The whole card opens the issue (a stretched link on the title); the repo link sits above it */}
                  <RepoCard className="h-full has-[a:focus-visible]:border-ring">
                    <div className="flex items-center gap-3 px-6 pt-5">
                      <Link href={`/dashboard/repository/${issue.repository.id}`} className="relative z-10 min-w-0 hover:opacity-80">
                        <RepoTitle owner={issue.repository.owner} name={issue.repository.name} />
                      </Link>
                      {isNew && (
                        <span className="ml-auto shrink-0 rounded-md bg-tint-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          New
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 px-6 pb-5 pt-4">
                      <Link
                        href={`/dashboard/repository/${issue.repository.id}/threads/${issue.number}`}
                        onClick={opened}
                        className="line-clamp-3 min-h-[3lh] font-medium leading-snug outline-none after:absolute after:inset-0 after:content-['']"
                      >
                        {issue.title}
                      </Link>
                      {issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {issue.labels.slice(0, 3).map((label) => (
                            <span key={label.name} className="inline-flex items-center gap-1.5">
                              <span className="size-2 rounded-full" style={{ backgroundColor: `#${label.color}` }} aria-hidden />
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <Reasons reasons={issue.reasons} max={2} className="mt-auto pt-1 text-sm text-foreground/80" />
                    </div>

                    <div className="flex items-center gap-4 whitespace-nowrap border-t border-border px-6 py-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <CircleDot className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden /> #{issue.number}
                      </span>
                      {issue.repository.primaryLanguage && <LanguageDot language={issue.repository.primaryLanguage} />}
                      <span className="ml-auto inline-flex items-center gap-1 tabular-nums" title="Comments">
                        <MessageSquare className="size-3.5" aria-hidden />
                        <span className="sr-only">Comments</span>
                        {issue.comments}
                      </span>
                    </div>
                  </RepoCard>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </PageContainer>
  );
}

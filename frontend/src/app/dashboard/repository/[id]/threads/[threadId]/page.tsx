"use client";
import { isGithubTokenError } from "@/lib/api";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { ThreadService } from "@/services/thread.service";
import { RepositoryService } from "@/services/repository.service";
import { ArrowRight, Check, CircleDot, GitBranch, GitPullRequest, Info, Link2 } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { StatusPill, timeAgo } from "@/components/repo-ui";
import CommentSection, { UserAvatar } from "@/components/comments/comment-section";
import { GithubBody } from "@/components/markdown-lazy";
import { Reactions, type ReactionRollup } from "@/components/reactions";
import { GithubReconnectNotice } from "@/components/github-reconnect-notice";
import { GithubIcon } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBreadcrumbLabel } from "@/components/breadcrumbs";
import { ThreadSkeleton } from "@/components/skeletons";
import { useStickyEnd } from "@/hooks/use-sticky-end";
import { LabelChip, RefLink, type ThreadActivity } from "@/components/threads/thread-activity";

interface ThreadDetail {
  id?: string | number;
  number?: string | number;
  title?: string;
  body?: string;
  body_html?: string;
  created_at: string | number | Date;
  updated_at?: string | number | Date;
  user?: { login: string; avatar_url: string };
  state?: string;
  labels?: { name: string; color: string }[];
  reactions?: ReactionRollup;
  viewer_reactions?: string[];
  comments?: number;
  [key: string]: unknown;
}

/** Small uppercase heading with an emerald icon, used at the top of side cards */
function CardHeading({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      {children}
    </h2>
  );
}


export default function ThreadPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const threadId = params.threadId as string;
  const { token } = useAuth();
  const sidebar = useStickyEnd<HTMLElement>();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [repoDetails, setRepoDetails] = useState<{owner: string, name: string} | null>(null);
  const [relatedThreads, setRelatedThreads] = useState<ThreadDetail[]>([]);
  const [activity, setActivity] = useState<ThreadActivity | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prData, setPrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  useBreadcrumbLabel(
    `/dashboard/repository/${repositoryId}`,
    repoDetails ? `${repoDetails.owner}/${repoDetails.name}` : null
  );

  useEffect(() => {
    if (!token || !repositoryId || !threadId) return;

    const loadData = async () => {
      try {
        const repoRes = await RepositoryService.getRepository(repositoryId, token);
        const owner = repoRes.data.owner;
        const repo = repoRes.data.name;
        setRepoDetails({ owner, name: repo });

        const threadRes = await ThreadService.getThread(owner, repo, threadId, token);
        setThread(threadRes.data);

        // Timeline events and review threads load beside the rest; the page works without them
        ThreadService.getActivity(owner, repo, threadId, token)
          .then((res) => setActivity(res.data ?? null))
          .catch(() => setActivity(null));

        if (threadRes.data?.pull_request) {
          try {
            const prRes = await ThreadService.getPull(owner, repo, threadId, token);
            // Handling both formats { data: ... } or just raw object
            setPrData(prRes.data || prRes);
          } catch (e) {
            console.error("Failed to fetch PR data", e);
          }
        }

        // Fetch related threads (using recent threads for now)
        const allThreadsRes = await ThreadService.listThreads(owner, repo, token, 1);
        const otherThreads = (allThreadsRes.data || [])
          .filter((t: { number: string | number }) => String(t.number) !== String(threadId))
          .slice(0, 3); // Take top 3
        setRelatedThreads(otherThreads);
      } catch (err) {
        // An expired GitHub token is expected and shown as a reconnect notice
        if (isGithubTokenError(err)) setTokenExpired(true);
        else console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repositoryId, threadId, token]);

  if (loading) return <ThreadSkeleton />;

  if (tokenExpired && !thread) {
    return (
      <PageContainer size="narrow">
        <GithubReconnectNotice action="load this issue" />
      </PageContainer>
    );
  }

  if (!thread || !repoDetails) {
    return (
      <PageContainer size="narrow">
        <ErrorState message="Failed to load thread." onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  const isPR = !!thread.pull_request;
  const isClosed = thread.state === "closed";
  const isMerged = isPR && !!prData?.merged;
  const authorLogin = thread.user?.login;
  const commentCount = typeof thread.comments === "number" ? thread.comments : null;
  const baseRef: string | undefined = prData?.base?.ref || prData?.base?.label;
  const headRef: string | undefined = prData?.head?.ref || prData?.head?.label;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const htmlUrl = typeof thread.html_url === "string" ? thread.html_url : undefined;
  const assignees = Array.isArray(thread.assignees) ? (thread.assignees as { login: string }[]) : [];
  const milestone = (thread.milestone as { title?: string } | null)?.title;

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Author", value: authorLogin ?? "Unknown" },
    { label: "Opened", value: timeAgo(thread.created_at) },
    ...(thread.updated_at ? [{ label: "Updated", value: timeAgo(thread.updated_at) }] : []),
    ...(commentCount !== null ? [{ label: "Comments", value: commentCount }] : []),
    ...(assignees.length > 0 ? [{ label: "Assignees", value: assignees.map((a) => a.login).join(", ") }] : []),
    ...(milestone ? [{ label: "Milestone", value: milestone }] : []),
    ...(isPR && typeof prData?.commits === "number" ? [{ label: "Commits", value: prData.commits }] : []),
    ...(isPR && typeof prData?.changed_files === "number"
      ? [{
          label: "Changes",
          value: (
            <span className="tabular-nums">
              {prData.changed_files} files{" "}
              <span className="text-emerald-600 dark:text-emerald-400">+{prData.additions ?? 0}</span>{" "}
              <span className="text-destructive">−{prData.deletions ?? 0}</span>
            </span>
          ),
        }]
      : []),
  ];

  return (
    <PageContainer>
      {/* Header card: status, title, meta; actions on the right */}
      <header className="rounded-md border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {isMerged ? (
                <StatusPill>Merged</StatusPill>
              ) : isClosed ? (
                <StatusPill className="border-border bg-muted text-muted-foreground dark:text-muted-foreground [&>span]:bg-muted-foreground/50">
                  Closed
                </StatusPill>
              ) : (
                <StatusPill>Open</StatusPill>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium">
                {isPR ? <GitPullRequest className="size-3" /> : <CircleDot className="size-3" />}
                {isPR ? "Pull request" : "Issue"}
              </span>
            </div>

            <h1 className="max-w-3xl break-words text-xl font-semibold leading-snug tracking-tight md:text-2xl">
              {thread.title}{" "}
              <span className="font-normal text-muted-foreground tabular-nums">#{thread.number ?? threadId}</span>
            </h1>

            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
              {authorLogin && (
                <>
                  <UserAvatar login={authorLogin} avatarUrl={thread.user?.avatar_url} className="mr-0.5 size-5 text-[9px]" />
                  <span className="font-medium text-foreground">{authorLogin}</span>
                </>
              )}
              <span>opened this {timeAgo(thread.created_at)}</span>
              {commentCount !== null && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="tabular-nums">{commentCount} {commentCount === 1 ? "comment" : "comments"}</span>
                </>
              )}
            </p>

            {isPR && baseRef && headRef && (
              <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="size-3.5" />
                <code className="max-w-full truncate rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">{headRef}</code>
                <ArrowRight className="size-3" />
                <code className="max-w-full truncate rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">{baseRef}</code>
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" onClick={handleShare} aria-label="Copy link">
                  {copied ? <Check /> : <Link2 />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied" : "Copy link"}</TooltipContent>
            </Tooltip>
            {htmlUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={htmlUrl} target="_blank" rel="noreferrer">
                  <GithubIcon /> Open on GitHub
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <article className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex min-w-0 items-center gap-2.5 border-b border-border px-5 py-3 text-sm sm:px-6">
              <UserAvatar login={authorLogin} avatarUrl={thread.user?.avatar_url} className="size-6 text-[10px]" />
              <span className="truncate font-medium">{authorLogin ?? "Unknown"}</span>
              <span className="shrink-0 text-xs text-muted-foreground">wrote {timeAgo(thread.created_at)}</span>
              {typeof thread.author_association === "string" && thread.author_association !== "NONE" && (
                <span className="ml-auto shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
                  {thread.author_association.toLowerCase().replace(/_/g, " ")}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              {thread.body ? (
                <GithubBody html={thread.body_html} markdown={thread.body} />
              ) : (
                <p className="text-sm italic text-muted-foreground">No description provided.</p>
              )}
              <Reactions
                key={thread.id}
                reactions={thread.reactions}
                viewerReactions={thread.viewer_reactions}
                onToggle={(content) => ThreadService.toggleReaction(repoDetails.owner, repoDetails.name, threadId, content, token!)}
              />
            </div>
          </article>

          <CommentSection
            owner={repoDetails.owner}
            repo={repoDetails.name}
            threadId={threadId}
            repositoryId={repositoryId}
            activity={activity}
          />
        </div>

        {/* Pinned beside the issue and comments; when taller than the screen it scrolls to its end first (desktop only) */}
        <aside ref={sidebar.ref} style={{ top: sidebar.top }} className="flex min-w-0 flex-col gap-4 lg:sticky">

          <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-5">
            <CardHeading icon={Info}>Details</CardHeading>
            <dl className="flex flex-col gap-3 text-sm">
              {details.map((d) => (
                <div key={d.label} className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">{d.label}</dt>
                  <dd className="min-w-0 truncate text-right font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
            {thread.labels && thread.labels.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Labels</span>
                <div className="flex flex-wrap gap-1.5">
                  {thread.labels.map((label) => <LabelChip key={label.name} name={label.name} color={label.color} />)}
                </div>
              </div>
            )}
            {/* Issue: pull requests that will close it. Pull request: issues it closes. */}
            {activity && activity.linked.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Development</span>
                <ul className="flex flex-col gap-2 text-sm">
                  {activity.linked.map((ref) => (
                    <li key={`${ref.repo}#${ref.number}`}>
                      <RefLink refItem={ref} repoFullName={`${repoDetails.owner}/${repoDetails.name}`} repositoryId={repositoryId} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {relatedThreads.length > 0 && (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-card py-5">
              <div className="px-5">
                <CardHeading icon={CircleDot}>More open issues</CardHeading>
              </div>
              <ul className="flex flex-col">
                {relatedThreads.map((rt) => (
                  <li key={rt.number}>
                    <Link
                      href={`/dashboard/repository/${repositoryId}/threads/${rt.number}`}
                      className="group flex items-start gap-2.5 px-5 py-2 transition-colors hover:bg-muted/40"
                      title={rt.title}
                    >
                      {rt.pull_request ? (
                        <GitPullRequest className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <CircleDot className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm text-muted-foreground transition-colors group-hover:text-foreground">{rt.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground/70 tabular-nums">
                          #{rt.number} · {timeAgo(rt.created_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}

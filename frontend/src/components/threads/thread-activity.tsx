"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  CircleCheck,
  CircleDot,
  CircleSlash,
  Copy,
  Eye,
  FileCode2,
  FilePen,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  Link2,
  Milestone,
  Pencil,
  Tag,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { GithubBody } from "@/components/markdown-lazy";
import { githubProfileUrl, timeAgo } from "@/components/repo-ui";
import { cn } from "@/lib/utils";

/* ─── Data from GET /issues/:owner/:repo/:number/activity ─────────────────── */

export type ActivityActor = { login: string; avatarUrl: string } | null;

export interface ActivityRef {
  kind: "issue" | "pull";
  number: number;
  title: string;
  url: string;
  state: string;
  merged?: boolean;
  repo: string;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  createdAt: string;
  actor: ActivityActor;
  ref?: ActivityRef | null;
  commit?: { sha: string; message?: string; url: string } | null;
  label?: { name: string; color: string };
  assignee?: string | null;
  stateReason?: string | null;
  closer?: { kind: "pull"; number: number; url: string } | { kind: "commit"; sha: string; url: string } | null;
  from?: string | null;
  to?: string;
  milestone?: string;
  state?: string;
  bodyHtml?: string | null;
  into?: string;
  reviewer?: string | null;
}

export interface ReviewThread {
  id: string;
  path: string;
  line: number | null;
  startLine: number | null;
  resolved: boolean;
  outdated: boolean;
  diffHunk: string | null;
  comments: { id: string | number; bodyHtml: string; createdAt: string; url: string; author: ActivityActor }[];
}

export interface ThreadActivity {
  type: "issue" | "pull";
  events: ActivityEvent[];
  linked: ActivityRef[];
  reviewThreads: ReviewThread[];
}

/* ─── Small pieces ────────────────────────────────────────────────────────── */

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

/** A GitHub username that opens their profile; deleted accounts show as "ghost", as on GitHub */
export function GithubUserLink({ login, className, children }: { login?: string | null; className?: string; children?: React.ReactNode }) {
  if (!login) return <span className={cn("font-medium text-foreground", className)}>{children ?? "ghost"}</span>;
  return (
    <a href={githubProfileUrl(login)} {...EXTERNAL} className={cn("font-medium text-foreground hover:underline", className)}>
      {children ?? login}
    </a>
  );
}

/** A repository's page on GitHub, or a page inside it (`path`) */
export function githubRepoUrl(fullName: string, path = "") {
  return `https://github.com/${fullName}${path}`;
}

// GitHub label colours are 6-digit hex; anything else falls back to the theme border
const labelHex = (color: string) => (/^[0-9a-f]{6}$/i.test(color) ? `#${color}` : null);

/** A GitHub label tinted with its own colour */
export function LabelChip({ name, color, repoFullName }: { name: string; color: string; /** Links to the repo's issues with this label */ repoFullName?: string }) {
  const hex = labelHex(color);
  const className = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-foreground align-middle",
    repoFullName && "transition-opacity hover:opacity-80"
  );
  const style = hex ? { backgroundColor: `${hex}1f`, borderColor: `${hex}59` } : undefined;
  const content = (
    <>
      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" style={hex ? { backgroundColor: hex } : undefined} aria-hidden />
      <span className="truncate">{name}</span>
    </>
  );
  return repoFullName ? (
    <a href={githubRepoUrl(repoFullName, `/labels/${encodeURIComponent(name)}`)} {...EXTERNAL} className={className} style={style}>
      {content}
    </a>
  ) : (
    <span className={className} style={style}>{content}</span>
  );
}

function refIcon(ref: ActivityRef) {
  if (ref.kind === "pull") {
    if (ref.merged) return { Icon: GitMerge, tone: "text-violet-500 dark:text-violet-400" };
    if (ref.state === "closed") return { Icon: GitPullRequestClosed, tone: "text-red-500 dark:text-red-400" };
    return { Icon: GitPullRequest, tone: "text-emerald-600 dark:text-emerald-400" };
  }
  if (ref.state === "closed") return { Icon: CircleCheck, tone: "text-violet-500 dark:text-violet-400" };
  return { Icon: CircleDot, tone: "text-emerald-600 dark:text-emerald-400" };
}

/**
 * Title of a linked issue or PR, with its state icon. Items in this repository
 * open in the app; anything else opens on GitHub.
 */
export function RefLink({ refItem, repoFullName, repositoryId, className }: {
  refItem: ActivityRef;
  repoFullName: string;
  repositoryId?: string;
  className?: string;
}) {
  const { Icon, tone } = refIcon(refItem);
  const sameRepo = refItem.repo?.toLowerCase() === repoFullName.toLowerCase();
  const label = (
    <>
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone)} aria-hidden />
      <span className="min-w-0">
        <span className="font-medium text-foreground">{refItem.title}</span>{" "}
        <span className="text-muted-foreground tabular-nums">
          {sameRepo ? "" : refItem.repo}#{refItem.number}
        </span>
      </span>
    </>
  );
  const cls = cn("inline-flex min-w-0 items-start gap-1.5 hover:underline", className);
  return sameRepo && repositoryId ? (
    <Link href={`/dashboard/repository/${repositoryId}/threads/${refItem.number}`} className={cls}>{label}</Link>
  ) : (
    <a href={refItem.url} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
  );
}

function ActorName({ actor }: { actor: ActivityActor }) {
  return <GithubUserLink login={actor?.login} />;
}

function TinyAvatar({ actor }: { actor: ActivityActor }) {
  if (!actor?.avatarUrl) return null;
  return (
    <a href={githubProfileUrl(actor.login)} {...EXTERNAL} tabIndex={-1} aria-hidden className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={actor.avatarUrl} alt="" className="inline-block size-5 rounded-full align-middle" />
    </a>
  );
}

/* ─── Grouping ────────────────────────────────────────────────────────────── */

const GROUP_OF: Record<string, string> = {
  commit_referenced: "commits",
  committed: "commits",
  labeled: "labels",
  unlabeled: "labels",
};
const GROUP_WINDOW_MS = 10 * 60 * 1000;

/**
 * Back-to-back commits by the same person read as one line, as on GitHub; so do
 * their label changes when made a few minutes apart.
 */
export function groupEvents(events: ActivityEvent[]): ActivityEvent[][] {
  const groups: ActivityEvent[][] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const group = GROUP_OF[event.kind];
    if (
      prev &&
      group &&
      GROUP_OF[prev.kind] === group &&
      prev.actor?.login === event.actor?.login &&
      (group === "commits" || Math.abs(Date.parse(event.createdAt) - Date.parse(prev.createdAt)) <= GROUP_WINDOW_MS)
    ) {
      last.push(event);
    } else {
      groups.push([event]);
    }
  }
  return groups;
}

/* ─── One timeline row ────────────────────────────────────────────────────── */

const ICONS: Record<string, LucideIcon> = {
  mentioned: Link2,
  commit_referenced: GitCommitHorizontal,
  committed: GitCommitHorizontal,
  labeled: Tag,
  unlabeled: Tag,
  assigned: UserPlus,
  unassigned: UserMinus,
  closed: CircleCheck,
  reopened: CircleDot,
  renamed: Pencil,
  transferred: ArrowRightLeft,
  milestoned: Milestone,
  demilestoned: Milestone,
  connected: Link2,
  duplicate: Copy,
  reviewed: Eye,
  merged: GitMerge,
  force_pushed: GitBranch,
  review_requested: Eye,
  ready_for_review: Eye,
  converted_to_draft: FilePen,
};

function describe(group: ActivityEvent[], ctx: { repoFullName: string; repositoryId?: string }): React.ReactNode {
  const e = group[0];
  switch (e.kind) {
    case "mentioned":
      return "mentioned this";
    case "commit_referenced":
      return group.length === 1 ? "added a commit that references this" : `added ${group.length} commits that reference this`;
    case "committed":
      return group.length === 1 ? "added a commit" : `added ${group.length} commits`;
    case "labeled":
    case "unlabeled": {
      const added = group.filter((g) => g.kind === "labeled");
      const removed = group.filter((g) => g.kind === "unlabeled");
      const chips = (list: ActivityEvent[]) =>
        list.map((g) => g.label && <LabelChip key={g.id} name={g.label.name} color={g.label.color} repoFullName={ctx.repoFullName} />);
      return (
        <>
          {added.length > 0 && <>added {chips(added)}</>}
          {added.length > 0 && removed.length > 0 && " and "}
          {removed.length > 0 && <>removed {chips(removed)}</>}
        </>
      );
    }
    case "assigned":
      return e.assignee && e.assignee === e.actor?.login ? "self-assigned this" : <>assigned <GithubUserLink login={e.assignee} /></>;
    case "unassigned":
      return e.assignee && e.assignee === e.actor?.login ? "removed their assignment" : <>unassigned <GithubUserLink login={e.assignee} /></>;
    case "closed": {
      const how = e.stateReason === "not_planned" ? "closed this as not planned" : e.stateReason === "duplicate" ? "closed this as a duplicate" : "closed this as completed";
      if (e.closer?.kind === "pull") {
        const pr = e.closer;
        return (
          <>
            {how} in{" "}
            {/* Pull requests in this repository open in the app */}
            {ctx.repositoryId && pr.url.toLowerCase().includes(`github.com/${ctx.repoFullName.toLowerCase()}/`) ? (
              <Link className="font-medium text-foreground hover:underline" href={`/dashboard/repository/${ctx.repositoryId}/threads/${pr.number}`}>#{pr.number}</Link>
            ) : (
              <a className="font-medium text-foreground hover:underline" href={pr.url} {...EXTERNAL}>#{pr.number}</a>
            )}
          </>
        );
      }
      if (e.closer?.kind === "commit") return <>{how} in <a className="font-mono text-foreground hover:underline" href={e.closer.url} {...EXTERNAL}>{e.closer.sha}</a></>;
      return how;
    }
    case "reopened":
      return "reopened this";
    case "renamed":
      return <>changed the title <span className="line-through">{e.from}</span> <span className="text-foreground">{e.to}</span></>;
    case "transferred":
      return e.from ? <>transferred this from <a href={githubRepoUrl(e.from)} {...EXTERNAL} className="font-medium text-foreground hover:underline">{e.from}</a></> : "transferred this";
    case "milestoned":
    case "demilestoned": {
      const name = (
        <a href={githubRepoUrl(ctx.repoFullName, "/milestones")} {...EXTERNAL} className="font-medium text-foreground hover:underline">
          {e.milestone}
        </a>
      );
      return e.kind === "milestoned" ? <>added this to the {name} milestone</> : <>removed this from the {name} milestone</>;
    }
    case "connected":
      return "linked a pull request that will close this";
    case "duplicate":
      return e.ref ? <>marked this as a duplicate of <RefLink refItem={e.ref} {...ctx} /></> : "marked this as a duplicate";
    case "reviewed":
      return e.state === "approved" ? "approved these changes" : e.state === "changes_requested" ? "requested changes" : e.state === "dismissed" ? "had a review dismissed" : "reviewed";
    case "merged":
      return (
        <>
          merged this
          {e.into ? <> into <a href={githubRepoUrl(ctx.repoFullName, `/tree/${encodeURIComponent(e.into)}`)} {...EXTERNAL} className="font-mono text-foreground hover:underline">{e.into}</a></> : null}
          {e.commit ? <> in <a href={e.commit.url} {...EXTERNAL} className="font-mono text-foreground hover:underline">{e.commit.sha}</a></> : null}
        </>
      );
    case "force_pushed":
      return "force-pushed the branch";
    case "review_requested":
      return <>requested a review{e.reviewer ? <> from <GithubUserLink login={e.reviewer} /></> : null}</>;
    case "ready_for_review":
      return "marked this ready for review";
    case "converted_to_draft":
      return "marked this as a draft";
    default:
      return null;
  }
}

/**
 * One row of the timeline: an icon in the avatar column, then who did what and when.
 * Commits list their messages underneath; mentions show the item they came from.
 */
export function ActivityRow({ group, repoFullName, repositoryId }: { group: ActivityEvent[]; repoFullName: string; repositoryId?: string }) {
  const e = group[0];
  const text = describe(group, { repoFullName, repositoryId });
  if (text === null) return null;
  const showRef = (e.kind === "mentioned" || e.kind === "connected") && e.ref;
  const commits = GROUP_OF[e.kind] === "commits" ? group.filter((g) => g.commit) : [];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 pb-6 text-sm text-muted-foreground group-last/comment:pb-0">
      <p className="flex min-h-8 flex-wrap items-center gap-x-1.5 gap-y-1 leading-relaxed">
        <TinyAvatar actor={e.actor} />
        <ActorName actor={e.actor} /> {text}
        <span className="text-xs">{timeAgo(group[group.length - 1].createdAt)}</span>
      </p>
      {showRef && e.ref && <RefLink refItem={e.ref} repoFullName={repoFullName} repositoryId={repositoryId} className="text-sm" />}
      {commits.length > 0 && (
        <ul className="flex flex-col gap-1">
          {commits.map((c) => (
            <li key={c.id} className="flex min-w-0 items-center gap-3 text-xs">
              <span className="min-w-0 flex-1 truncate font-mono text-foreground/80">{c.commit?.message}</span>
              <a href={c.commit?.url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-mono hover:text-foreground hover:underline">
                {c.commit?.sha}
              </a>
            </li>
          ))}
        </ul>
      )}
      {e.kind === "reviewed" && e.bodyHtml && (
        <div className="rounded-md border border-border bg-background px-4 py-3 text-foreground">
          <GithubBody html={e.bodyHtml} />
        </div>
      )}
    </div>
  );
}

/** Icon shown in the timeline's avatar column for an event row */
export function ActivityIcon({ group }: { group: ActivityEvent[] }) {
  const e = group[0];
  const Icon = (e.kind === "closed" && e.stateReason === "not_planned" ? CircleSlash : ICONS[e.kind]) ?? CircleDot;
  const tone =
    e.kind === "merged" || (e.kind === "closed" && e.stateReason !== "not_planned")
      ? "text-violet-500 dark:text-violet-400"
      : e.kind === "reviewed" && e.state === "approved"
        ? "text-emerald-600 dark:text-emerald-400"
        : e.kind === "reviewed" && e.state === "changes_requested"
          ? "text-red-500 dark:text-red-400"
          : "text-muted-foreground";
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
      <Icon className={cn("size-3.5", tone)} aria-hidden />
    </span>
  );
}

/* ─── Review threads (pull requests) ──────────────────────────────────────── */

function DiffHunk({ hunk }: { hunk: string }) {
  return (
    <pre className="custom-scrollbar overflow-x-auto border-b border-border bg-background py-2 font-mono text-xs leading-5">
      {hunk.split("\n").map((line, i) => (
        <div
          key={i}
          className={cn(
            "px-4 whitespace-pre",
            line.startsWith("+") && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            line.startsWith("-") && "bg-red-500/10 text-red-700 dark:text-red-300",
            line.startsWith("@@") && "text-muted-foreground"
          )}
        >
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

/** A code review thread: the file and lines, the diff, then the comment and its replies nested under it */
export function ReviewThreadCard({ thread }: { thread: ReviewThread }) {
  const [first, ...replies] = thread.comments;
  const lines = thread.line ? (thread.startLine && thread.startLine !== thread.line ? `lines ${thread.startLine}–${thread.line}` : `line ${thread.line}`) : null;
  return (
    <div className="min-w-0 flex-1 pb-6 group-last/comment:pb-0">
      <p className="flex min-h-8 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <TinyAvatar actor={first?.author ?? null} />
        <ActorName actor={first?.author ?? null} /> commented on a change
        {first && <span className="text-xs">{timeAgo(first.createdAt)}</span>}
      </p>
      <div className="mt-2 overflow-hidden rounded-md border border-border">
        <div className="flex min-w-0 items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs">
          <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {/* Opens the comment on GitHub, where the file's full diff is */}
          <a href={first?.url} {...EXTERNAL} className="min-w-0 truncate font-mono hover:underline" title={thread.path}>{thread.path}</a>
          {lines && <span className="shrink-0 text-muted-foreground">{lines}</span>}
          <span className="ml-auto flex shrink-0 gap-1.5">
            {thread.outdated && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Outdated</span>}
            {thread.resolved && <span className="rounded-md bg-tint-emerald-500 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">Resolved</span>}
          </span>
        </div>
        {thread.diffHunk && <DiffHunk hunk={thread.diffHunk} />}
        <ul className="flex flex-col divide-y divide-border">
          {first && <ReviewComment comment={first} />}
          {replies.map((reply) => (
            // Replies sit indented under the first comment, as on GitHub
            <ReviewComment key={reply.id} comment={reply} nested />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReviewComment({ comment, nested = false }: { comment: ReviewThread["comments"][number]; nested?: boolean }) {
  return (
    <li className={cn("flex gap-3 px-4 py-3", nested && "pl-10")}>
      {comment.author?.avatarUrl ? (
        <a href={githubProfileUrl(comment.author.login)} {...EXTERNAL} tabIndex={-1} aria-hidden className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={comment.author.avatarUrl} alt="" className="size-6 rounded-full" />
        </a>
      ) : (
        <span className="size-6 shrink-0 rounded-full bg-muted" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm">
          <GithubUserLink login={comment.author?.login} />
          <a href={comment.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
            {timeAgo(comment.createdAt)}
          </a>
        </p>
        <div className="mt-1 text-sm">
          <GithubBody html={comment.bodyHtml} />
        </div>
      </div>
    </li>
  );
}

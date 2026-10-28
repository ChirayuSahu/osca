"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Download,
  Loader2,
  Check,
  Copy,
  PlusCircle,
  ArrowDown,
  Compass,
  AlertTriangle,
  RefreshCw,
  Shuffle,
  EyeOff,
  CircleDot,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RepositoryService } from "@/services/repository.service";
import { DitherCard, RepoTitle } from "@/components/repo-ui";
import { Dither } from "@/components/ui/dither";
import { AnimatedDither } from "@/components/ui/animated-dither";
import { DitheredImage, githubAvatarUrl } from "@/components/ui/dithered-image";
import { GithubIcon as GithubMarkIcon } from "@/components/icons";
import { isGithubTokenError } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Markdown, preloadMarkdown } from "@/components/markdown-lazy";

// Prompt pool built from the user's analyzed skills; the generic list is the fallback
function promptsForSkills(skills: string[]): string[] {
  const [a, b, c] = skills;
  if (!a) return SUGGESTED_PROMPTS;
  const second = b ?? a;
  const third = c ?? second;
  return [
    `Find beginner-friendly ${a} repositories with good first issues`,
    b ? `I know ${a} and ${b}. Where can I make my first contribution?` : `I know ${a}. Where can I make my first contribution?`,
    `Which ${second} projects are welcoming to new contributors?`,
    `What should I learn next after ${a} to contribute to bigger projects?`,
    `Show me ${a} projects where I could start with docs or tests`,
    `Find active ${second} projects where maintainers review PRs quickly`,
    `I have a free weekend. Suggest a ${third} issue I could finish`,
  ];
}

const pickOne = <T,>(list: readonly T[], except?: T): T => {
  const pool = list.length > 1 && except !== undefined ? list.filter((x) => x !== except) : list;
  return pool[Math.floor(Math.random() * pool.length)];
};

// Headings for the empty chat; one is picked per visit, some depend on the time of day.
// The user's first name sits between `before` and `after`.
type Heading = { before: string; after: string };
function headingsFor(hour: number): Heading[] {
  const timeOfDay =
    hour < 5 ? "Burning the midnight oil" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const list: Heading[] = [
    { before: `${timeOfDay}, `, after: "" },
    { before: "What are we building today, ", after: "?" },
    { before: "Ready for your next PR, ", after: "?" },
    { before: "Let's find your next repo, ", after: "" },
    { before: "Back at it, ", after: "" },
    { before: "Got an hour to contribute, ", after: "?" },
  ];
  if (hour >= 5 && hour < 11) list.push({ before: "Coffee and good first issues, ", after: "?" });
  if (hour >= 22 || hour < 5) list.push({ before: "Late-night commits, ", after: "?" });
  return list;
}

const NO_SKILLS: string[] = [];

// Top skills per user, fetched once per session
const skillsCache = new Map<string, string[]>();

async function loadTopSkills(userId: string, token: string): Promise<string[]> {
  const hit = skillsCache.get(userId);
  if (hit) return hit;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const res = await fetch(`${apiUrl}/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
  const body = await res.json();
  const ranked = (body?.data?.contributorProfile?.repositoryExperience?.skills ?? []) as {
    name?: string;
    proficiencyScore?: number;
  }[];
  const skills = ranked
    .filter((s): s is { name: string; proficiencyScore?: number } => typeof s?.name === "string" && s.name.length > 0)
    .sort((x, y) => (y.proficiencyScore ?? 0) - (x.proficiencyScore ?? 0))
    .map((s) => s.name)
    .slice(0, 3);
  skillsCache.set(userId, skills);
  return skills;
}

const SUGGESTED_PROMPTS = [
  "I'm a React dev looking to learn Rust. Where should I start?",
  "Find beginner-friendly Python repos with good mentorship",
  "What are trending Go projects that need contributors?",
  "Suggest ML repos suited for someone who knows PyTorch",
];

// Custom GitHub SVG icon used across the chat surface
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

type Disclaimer = "missing-api-key" | "temporary-outage" | null;

type ParsedRecommendation = {
  title: string;
  url: string;
  rationale: string;
  repositoryId?: string;
};

type ChatIssue = {
  number: number;
  title: string;
  url: string;
  comments: number;
  assigned: boolean;
  labels: { name: string; color: string }[];
};

type ChatIssues = {
  repository: string;
  repositoryId: string | null;
  url: string;
  kind: "good-first" | "recent";
  items: ChatIssue[];
};

type ParsedResponse = {
  intro: string | null;
  recommendations: ParsedRecommendation[];
  clarifying: string[];
  closing: string | null;
  issues?: ChatIssues | null;
};

type ChatReplyPayload = {
  parsed?: ParsedResponse;
  markdown?: string;
  model?: string;
  disclaimer?: Disclaimer;
};

type AssistantMessage = {
  role: "assistant";
  parsed: ParsedResponse;
  markdown: string;
  disclaimer: Disclaimer;
};

type UserMessage = { role: "user"; content: string };

type Message = UserMessage | AssistantMessage;

// Stream the markdown in with a soft reveal. Cancellable via the trailing callback.
function StreamingMarkdown({
  content,
  streaming,
  onDone,
}: {
  content: string;
  streaming: boolean;
  onDone?: () => void;
}) {
  const [revealed, setRevealed] = useState(streaming ? 0 : content.length);

  useEffect(() => {
    if (!streaming) {
      setRevealed(content.length);
      return;
    }
    setRevealed(0);
    const targetChars = Math.max(content.length, 1);
    const totalTicks = 36;
    const chunk = Math.max(1, Math.ceil(targetChars / totalTicks));
    const interval = setInterval(() => {
      setRevealed((prev) => Math.min(content.length, prev + chunk));
    }, 18);
    return () => clearInterval(interval);
  }, [content, streaming]);

  useEffect(() => {
    if (streaming && revealed >= content.length) {
      const timeout = setTimeout(() => onDone?.(), 140);
      return () => clearTimeout(timeout);
    }
  }, [revealed, content.length, streaming, onDone]);

  const visibleText = content.slice(0, revealed);
  const isTyping = streaming && revealed < content.length;

  return (
    <div>
      {visibleText && <Markdown size="base" allowHtml={false}>{visibleText}</Markdown>}
      {isTyping && (
        <span className="inline-block w-[7px] h-[1.05em] align-text-bottom bg-emerald-500/80 rounded-[1px] ml-0.5 animate-caret" />
      )}
    </div>
  );
}

// "owner/repo" from the bot's title, else from the GitHub URL
function splitRepoName(title: string, githubUrl: string | null): { owner: string | null; name: string } {
  const fromTitle = title.replace(/^\/+|\/+$/g, "").match(/^([\w.-]+)\/([\w.-]+)$/);
  if (fromTitle) return { owner: fromTitle[1], name: fromTitle[2] };
  const fromUrl = githubUrl?.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (fromUrl) return { owner: fromUrl[1], name: fromUrl[2].replace(/\.git$/i, "") };
  return { owner: null, name: title };
}

function RecommendationCard({
  recommendation,
  index,
}: {
  recommendation: ParsedRecommendation;
  index: number;
}) {
  const router = useRouter();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "importing" | "imported">("idle");

  const title = recommendation.title?.trim() || "owner/repo";
  const url = recommendation.url?.trim();
  const isLikelyRepo = /[\w.-]+\/[\w.-]+/.test(title);
  const cleanedUrl = url && /^https:\/\/github\.com\//i.test(url) ? url : null;
  // Fallback URL synthesised from owner/repo if the bot wrote a label without a usable link
  const githubUrl = cleanedUrl ?? (isLikelyRepo ? `https://github.com/${title.replace(/^\/+|\/+$/g, "")}` : null);
  const repositoryId = recommendation.repositoryId;
  const { owner, name } = splitRepoName(title, githubUrl);

  const openRepository = () => {
    if (repositoryId) router.push(`/dashboard/repository/${repositoryId}`);
  };

  // Catalogue repos (grounded recommendations) import instantly; anything else
  // is queued for analysis, which adds it to the user's imports when done.
  const handleImport = async () => {
    if (!token) return;
    setStatus("importing");
    try {
      if (repositoryId) {
        const { alreadyImported } = await RepositoryService.importRepository(repositoryId, token);
        setStatus("imported");
        toast.success(alreadyImported ? `${title} is already in your imports` : `Imported ${title}`, {
          action: { label: "Open", onClick: openRepository },
        });
      } else if (githubUrl) {
        await RepositoryService.analyzeRepository(githubUrl, token);
        setOpen(false);
        setStatus("idle");
        toast.success(`Importing ${title}`, {
          description: "We're analyzing it now. It will appear in your imported repositories shortly.",
        });
      }
    } catch (err) {
      console.error("[OscaBot] import failed", err);
      setStatus("idle");
      toast.error(isGithubTokenError(err) ? "Reconnect GitHub to import repositories." : `Couldn't import ${title}.`);
    }
  };

  const stripDither = <Dither cols={80} rows={24} cell={4} direction="top-right" className="text-emerald-500/25" />;

  return (
    <>
      <DitherCard
        logo={owner ?? undefined}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="my-3 w-full text-left outline-none animate-in fade-in slide-in-from-bottom-2 fill-mode-both focus-visible:border-foreground/30 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div className="flex flex-col gap-3 p-5">
          {owner ? (
            <RepoTitle owner={owner} name={name} />
          ) : (
            <p className="truncate text-[17px] font-semibold leading-tight">{name}</p>
          )}
          {recommendation.rationale && (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{recommendation.rationale}</p>
          )}
        </div>
        <div className="flex items-center gap-3 whitespace-nowrap px-5 pb-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Download className="size-3.5" /> Import to explore
          </span>
        </div>
      </DitherCard>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && status !== "importing") setStatus("idle"); }}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          {/* Repo owner's logo, dithered, across the top */}
          <div className="relative h-24 overflow-hidden border-b border-border bg-muted/30">
            <div className="pointer-events-none absolute -right-4 -top-10 [mask-image:linear-gradient(to_left,black_30%,transparent)]">
              {owner ? (
                <DitheredImage
                  src={githubAvatarUrl(owner, 160)}
                  cols={48}
                  cell={4}
                  className="text-emerald-500/30"
                  fallback={stripDither}
                />
              ) : (
                stripDither
              )}
            </div>
          </div>

          <div className="px-5 pt-5">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-base font-semibold">
                {owner && <span className="font-normal text-muted-foreground">{owner} / </span>}
                {name}
              </DialogTitle>
              <DialogDescription className="line-clamp-3">
                {status === "imported"
                  ? "It's in your imported repositories. Open it to see the codebase map and issues you can start with."
                  : recommendation.rationale ||
                    "Add it to your imported repositories to explore its codebase map, good first issues and contributing guide."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="mt-5 flex-row items-center justify-end gap-2 border-t border-border px-5 py-3">
            {githubUrl && (
              <Button variant="ghost" size="icon-sm" asChild className="mr-auto text-muted-foreground">
                <a href={githubUrl} target="_blank" rel="noopener noreferrer" aria-label="View on GitHub" title="View on GitHub">
                  <GithubMarkIcon />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {status === "imported" ? "Close" : "Cancel"}
            </Button>
            {status === "imported" ? (
              <Button size="sm" onClick={openRepository} disabled={!repositoryId}>
                Open repository <ArrowRight />
              </Button>
            ) : (
              <Button size="sm" onClick={handleImport} disabled={status === "importing" || (!repositoryId && !githubUrl)}>
                {status === "importing" ? <Loader2 className="animate-spin" /> : <Download />}
                {status === "importing" ? "Importing…" : "Import"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DisclaimerBanner({ kind }: { kind: Disclaimer }) {
  if (!kind) return null;
  const text =
    kind === "missing-api-key"
      ? "OscaBot is in offline mode — recommendations are limited until OpenRouter is configured."
      : "Picked straight from the catalogue while the language model is busy. Regenerate in a moment for a fuller answer.";
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-foreground/80">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-warning" />
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

function AssistantMessageView({
  message,
  streaming,
  onStreamDone,
  onRegenerate,
  canRegenerate,
  isLatest = false,
}: {
  message: AssistantMessage;
  streaming: boolean;
  onStreamDone: () => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
  isLatest?: boolean;
}) {
  const { parsed } = message;

  return (
    <div className="space-y-1">
      {/* Only the intro is prose; recommendations, questions and closing render
          below from `parsed`, so streaming the full markdown would show them twice. */}
      <StreamingMarkdown
        content={parsed.intro ?? ""}
        streaming={streaming}
        onDone={onStreamDone}
      />

      {parsed.recommendations.length > 0 && (
        <div className={`${parsed.intro?.trim() ? "mt-4" : "mt-1"} space-y-2.5`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-600/80 dark:text-emerald-300/80 font-medium">
              Recommendations
            </span>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {parsed.recommendations.length}
            </span>
          </div>
          {parsed.recommendations.map((rec, i) => (
            <RecommendationCard
              key={`${rec.title}-${i}`}
              recommendation={rec}
              index={i}
            />
          ))}
        </div>
      )}

      {parsed.issues && parsed.issues.items.length > 0 && <IssueList issues={parsed.issues} />}

      {parsed.clarifying.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Tell me more — tap one to answer
          </div>
          <div className="flex flex-col gap-2">
            {parsed.clarifying.map((q, i) => (
              <button
                key={i}
                type="button"
                className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:border-foreground/20"
                onClick={() => {
                  // future: prefills the composer; we keep it as visual cue for now
                  window.dispatchEvent(
                    new CustomEvent("osca-bot-prefill", { detail: q })
                  );
                }}
              >
                <span className="text-emerald-600/70 dark:text-emerald-400/70 mr-2 font-medium">{i + 1}.</span>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {parsed.closing && (
        <p className="mt-3 text-sm italic text-muted-foreground leading-relaxed">
          {parsed.closing}
        </p>
      )}

      {!streaming && (
        <div
          className={`mt-2 -ml-2 flex items-center gap-1 transition-opacity focus-within:opacity-100 ${
            isLatest ? "" : "opacity-0 group-hover/msg:opacity-100"
          }`}
        >
          <CopyMarkdownButton markdown={message.markdown} />
          {canRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
          )}
        </div>
      )}

      <DisclaimerBanner kind={message.disclaimer} />
    </div>
  );
}

// Technologies we can name back in the thinking lines (lower-case key → label)
const TOPICS: Record<string, string> = {
  rust: "Rust", go: "Go", golang: "Go", python: "Python", typescript: "TypeScript", javascript: "JavaScript",
  react: "React", vue: "Vue", svelte: "Svelte", angular: "Angular", java: "Java", kotlin: "Kotlin",
  swift: "Swift", "c++": "C++", ruby: "Ruby", php: "PHP", django: "Django", flask: "Flask", node: "Node.js",
  "node.js": "Node.js", "next.js": "Next.js", pytorch: "PyTorch", tensorflow: "TensorFlow", ml: "ML",
  docker: "Docker", kubernetes: "Kubernetes", flutter: "Flutter", dart: "Dart", elixir: "Elixir", haskell: "Haskell",
};

function topicIn(prompt: string): string | null {
  for (const word of prompt.toLowerCase().split(/[^a-z0-9+.#]+/)) {
    const label = TOPICS[word.replace(/[.]+$/, "")];
    if (label) return label;
  }
  return null;
}

// "issues in tiptap" / "issues from owner/repo": the repo the user named, if any
function issueTarget(prompt: string): string | null {
  if (!/\b(issues?|tasks?|bugs?|tickets?)\b/i.test(prompt)) return null;
  const pair = prompt.match(/\b([\w.-]+\/[\w.-]+)\b/);
  if (pair) return pair[1];
  const after = prompt.match(/\b(?:issues?|tasks?|bugs?)\b[^.?!]*?\b(?:in|from|for|on|of|at)\s+(?:the\s+)?([\w.-]{3,})/i);
  if (after && !/^(rust|python|go|typescript|javascript|java|repos?|projects?|github)$/i.test(after[1])) return after[1];
  const before = prompt.match(/\b([\w.-]{3,})(?:'s)?\s+(?:good[\s-]first\s+|open\s+)?issues\b/i);
  if (before && !/^(good|first|open|some|any|the|easy|beginner|starter|find|show|give)$/i.test(before[1])) return before[1];
  return null;
}

// What OscaBot "is doing" while the request runs, shaped by the kind of question
function thinkingSteps(prompt: string, skills: string[]): string[] {
  const repo = issueTarget(prompt);
  if (repo) {
    return [`Finding ${repo} on GitHub`, "Fetching its open issues", "Putting unassigned ones first"];
  }
  const topic = topicIn(prompt);
  const known = skills.length > 0 ? skills.slice(0, 2).join(" and ") : null;
  if (topic) {
    return [
      "Reading your question",
      known ? `Weighing your ${known} experience` : "Looking at your profile",
      `Searching ${topic} repositories`,
      "Checking good first issues and contributing guides",
      "Comparing the strongest candidates",
      "Writing up recommendations",
    ];
  }
  return [
    known ? `Looking at your ${known} work` : "Looking at your profile",
    "Going through your feed",
    "Checking which projects are active right now",
    "Picking the best fits for you",
    "Writing it up",
  ];
}

// Steps advance at uneven, human-looking intervals; the last one holds until the reply arrives
const stepDelay = (index: number) => (index === 0 ? 700 + Math.random() * 600 : 900 + Math.random() * 1700);

// One shimmering line at a time
function ThinkingIndicator({ prompt, skills }: { prompt: string; skills: string[] }) {
  const steps = React.useMemo(() => thinkingSteps(prompt, skills), [prompt, skills]);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= steps.length - 1) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), stepDelay(step));
    return () => window.clearTimeout(id);
  }, [step, steps.length]);
  return (
    <div role="status" aria-live="polite" className="py-1 text-sm">
      {/* Fade on the wrapper, shimmer on the text: each element runs one animation */}
      <span key={step} className="inline-block animate-in fade-in duration-300">
        <span className="text-shimmer inline-block">{steps[step]}…</span>
      </span>
    </div>
  );
}

function AssistantShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="group/msg flex w-full min-w-0 flex-col gap-2 animate-in fade-in duration-300">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="size-1.5 rounded-[1px] bg-emerald-500" aria-hidden />
        OscaBot
      </span>
      <div className="min-w-0 text-[15px] text-foreground">{children}</div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex w-full justify-end animate-in fade-in duration-300">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-md border border-border bg-muted/60 px-4 py-2.5 text-[15px] leading-relaxed">
        {content}
      </p>
    </div>
  );
}

// Real issues from a repository the user asked about. Imported repos open in
// OSCA's issue view; others link to GitHub.
function IssueList({ issues }: { issues: ChatIssues }) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="min-w-0 truncate text-sm font-medium">{issues.repository}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{issues.items.length}</span>
        <a
          href={issues.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <GithubMarkIcon className="size-3.5" /> GitHub
        </a>
      </div>
      <ul className="divide-y divide-border">
        {issues.items.map((issue) => {
          const internal = issues.repositoryId ? `/dashboard/repository/${issues.repositoryId}/threads/${issue.number}` : null;
          const row = (
            <>
              <CircleDot className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-snug">{issue.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">#{issue.number}</span>
                  {issue.labels.slice(0, 3).map((label) => (
                    <span key={label.name} className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: `#${label.color}` }} aria-hidden />
                      {label.name}
                    </span>
                  ))}
                  {issue.comments > 0 && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <MessageSquare className="size-3" /> {issue.comments}
                    </span>
                  )}
                  {issue.assigned && <span>assigned</span>}
                </span>
              </span>
            </>
          );
          const rowClass = "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40";
          return (
            <li key={issue.number}>
              {internal ? (
                <Link href={internal} className={rowClass}>{row}</Link>
              ) : (
                <a href={issue.url} target="_blank" rel="noreferrer" className={rowClass}>{row}</a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }, [markdown]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ChatConsole() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  // Phones get a placeholder short enough for one line
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Picked on the client after mount (random and time-based), so server and client markup match
  const [heading, setHeading] = useState<Heading | null>(null);
  // null while the user's skills load; then a pool built from them (or the generic list)
  const [promptPool, setPromptPool] = useState<string[] | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    setHeading(pickOne(headingsFor(new Date().getHours())));
  }, []);

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    const use = (pool: string[]) => {
      if (cancelled) return;
      setPromptPool(pool);
      setSuggestion(pickOne(pool));
    };
    loadTopSkills(user.id, token)
      .then((skills) => use(promptsForSkills(skills)))
      .catch(() => use(SUGGESTED_PROMPTS));
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  // True while keys are being pressed; settles shortly after the last keystroke
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<number | undefined>(undefined);
  const markTyping = useCallback(() => {
    setTyping(true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 700);
  }, []);
  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  const shuffleSuggestion = useCallback(() => {
    if (promptPool) setSuggestion((current) => pickOne(promptPool, current ?? undefined));
  }, [promptPool]);

  // Fetch the markdown renderer while the user reads the greeting, so the first reply renders at once
  useEffect(() => {
    const id = window.setTimeout(preloadMarkdown, 1500);
    return () => window.clearTimeout(id);
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<AssistantMessage | null>(
    null
  );
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [searchQuery, narrow, messages.length]);

  // Allow programmatic pre-fills (e.g. from clarifying-question chips)
  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setSearchQuery(detail);
        window.setTimeout(() => textareaRef.current?.focus(), 0);
      }
    }
    window.addEventListener("osca-bot-prefill", onPrefill);
    return () => window.removeEventListener("osca-bot-prefill", onPrefill);
  }, []);

  const hasMessages = messages.length > 0;
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < 240) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [hasMessages]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 240);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setStreamingMessage(null);
    setLastUserPrompt(null);
    setSearchQuery("");
  }, []);

  const submitPrompt = useCallback((prompt: string) => {
    setSearchQuery(prompt);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || streamingMessage !== null || pending) return;

      preloadMarkdown();
      const userMessage: UserMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setSearchQuery("");
      setLastUserPrompt(trimmed);
      setPending(true);

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const history = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.role === "user" ? m.content : m.markdown,
        }));

        const response = await fetch(`${apiUrl}/recommendations/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? ""}`,
          },
          body: JSON.stringify({ messages: history }),
        });

        if (response.status === 429) {
          throw new Error("rate-limited");
        }
        if (!response.ok) {
          throw new Error(`OscaBot returned ${response.status}`);
        }

        const data = (await response.json()) as {
          success?: boolean;
          data?: ChatReplyPayload;
        };
        const payload = data?.data ?? {};
        const parsed: ParsedResponse = payload.parsed ?? {
          intro: payload.markdown ?? null,
          recommendations: [],
          clarifying: [],
          closing: null,
        };
        const markdown =
          payload.markdown ??
          (parsed.intro ?? "");

        setStreamingMessage({
          role: "assistant",
          parsed,
          markdown: markdown.trim() || parsed.intro || "",
          disclaimer: payload.disclaimer ?? null,
        });
      } catch (error) {
        console.error("[OscaBot] chat failed", error);
        const rateLimited = error instanceof Error && error.message === "rate-limited";
        const note = rateLimited
          ? "You're sending messages a little fast. Give it a minute and try again."
          : "I'm OscaBot and I'm having trouble reaching my recommendation engine. Please retry in a moment.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            disclaimer: rateLimited ? null : "temporary-outage",
            markdown: note,
            parsed: {
              intro: note,
              recommendations: [],
              clarifying: [],
              closing: null,
            },
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [messages, streamingMessage, pending, token]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(searchQuery);
  };

  const handleStreamDone = useCallback(() => {
    if (!streamingMessage) return;
    setMessages((prev) => [...prev, streamingMessage]);
    setStreamingMessage(null);
  }, [streamingMessage]);

  const handleRegenerate = useCallback(() => {
    if (lastUserPrompt) {
      // Drop the last assistant turn so the regenerated reply replaces it cleanly
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.slice();
        if (next[next.length - 1]?.role === "assistant") {
          next.pop();
        }
        return next;
      });
      void sendPrompt(lastUserPrompt);
    }
  }, [lastUserPrompt, sendPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearchSubmit(e as unknown as React.FormEvent);
    }
  };

  const isBusy = streamingMessage !== null || pending;

  // The textarea is disabled while busy, which drops focus; give it back.
  useEffect(() => {
    if (!isBusy && messages.length > 0) textareaRef.current?.focus();
  }, [isBusy, messages.length]);

  const empty = messages.length === 0 && streamingMessage === null && !pending;
  const questionCount = messages.filter((m) => m.role === "user").length;
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  return (
    <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col">
      {!empty && (
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <span className="size-2 rounded-[2px] bg-emerald-500" aria-hidden />
            OscaBot
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {isBusy ? "Thinking…" : `${questionCount} ${questionCount === 1 ? "question" : "questions"}`}
          </span>
          <Button type="button" variant="ghost" size="sm" className="ml-auto -mr-2" onClick={handleNewChat} disabled={isBusy}>
            <PlusCircle /> New chat
          </Button>
        </div>
      )}

      {empty ? (
        // Greeting fills the space above the composer, which stays pinned at the bottom
        <div className="relative isolate flex w-full flex-1 flex-col items-center justify-center gap-8 pb-8 text-center animate-in fade-in duration-500">
          <AnimatedDither
            cols={160}
            rows={70}
            cell={5}
            falloff={1.3}
            peak={0.6}
            className="absolute left-1/2 top-[42%] -z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-500/[0.10]"
          />
          <h1
            className={`max-w-4xl text-balance text-4xl font-light leading-tight tracking-tight text-foreground transition-opacity duration-300 md:text-6xl ${
              heading ? "opacity-100" : "opacity-0"
            }`}
          >
            {heading?.before ?? "Welcome back, "}
            <span className="font-serif font-medium italic text-emerald-600 dark:text-emerald-400">
              {user?.name.split(" ")[0] || "Developer"}
            </span>
            {heading?.after}
          </h1>

          {/* One suggestion, from the user's skills; shuffle for another */}
          <div className="flex w-full max-w-xl items-stretch gap-2">
            {suggestion === null ? (
              <div className="h-12 flex-1 animate-pulse rounded-md border border-border bg-card" aria-hidden />
            ) : (
              <button
                key={suggestion}
                type="button"
                onClick={() => submitPrompt(suggestion)}
                className="flex flex-1 items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors animate-in fade-in duration-300 hover:border-foreground/20 hover:text-foreground"
              >
                <Compass className="size-4 shrink-0" />
                <span className="leading-snug">{suggestion}</span>
              </button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-auto min-h-12 w-12 shrink-0 bg-card text-muted-foreground"
                  onClick={shuffleSuggestion}
                  disabled={!promptPool || promptPool.length < 2}
                  aria-label="Suggest another question"
                >
                  <Shuffle />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Another suggestion</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="custom-scrollbar relative w-full flex-1 overflow-y-auto"
        >
          <div className="flex flex-col gap-8 py-6">
            {messages.map((msg, index) =>
              msg.role === "user" ? (
                <UserBubble key={index} content={msg.content} />
              ) : (
                <AssistantShell key={index}>
                  <AssistantMessageView
                    message={msg}
                    streaming={false}
                    onStreamDone={() => {}}
                    onRegenerate={handleRegenerate}
                    canRegenerate={lastUserPrompt !== null && index === lastAssistantIndex}
                    isLatest={index === lastAssistantIndex && !isBusy}
                  />
                </AssistantShell>
              )
            )}

            {pending && !streamingMessage && (
              <AssistantShell>
                <ThinkingIndicator
                  prompt={lastUserPrompt ?? ""}
                  skills={(user && skillsCache.get(user.id)) || NO_SKILLS}
                />
              </AssistantShell>
            )}

            {streamingMessage && (
              <AssistantShell>
                <AssistantMessageView
                  message={streamingMessage}
                  streaming
                  onStreamDone={handleStreamDone}
                  onRegenerate={handleRegenerate}
                  canRegenerate={false}
                />
              </AssistantShell>
            )}
          </div>
          <div ref={messagesEndRef} className="h-2" />
        </div>
      )}

      {showScrollButton && !empty && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={scrollToBottom}
          className="absolute bottom-32 left-1/2 z-20 -translate-x-1/2 shadow-sm"
        >
          <ArrowDown /> Jump to latest
        </Button>
      )}

      <div className="mt-auto w-full shrink-0 pt-2">
        <form onSubmit={handleSearchSubmit} className="group relative isolate w-full">
          <div className="mb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            {/* Conversations live only in this page's memory */}
            <span className="inline-flex items-center gap-1.5">
              <EyeOff className="size-3.5 shrink-0" aria-hidden />
              This chat isn&apos;t saved — it clears when you leave or refresh.
            </span>
            <span className="ml-auto hidden items-center gap-1.5 sm:inline-flex"><Kbd>Enter</Kbd> to send</span>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <KbdGroup><Kbd>Shift</Kbd>+<Kbd>Enter</Kbd></KbdGroup> for a new line
            </span>
          </div>

          <div className="relative isolate">
          {/* Typing aura: a soft emerald light behind the box's top edge. Faint while focused,
              full while typing; two light spots drift slowly across each other. */}
          <div
            aria-hidden
            className={`composer-aura pointer-events-none absolute -inset-x-6 -top-14 -z-10 h-32 transition-opacity duration-700 ${
              typing ? "opacity-100" : "opacity-0 group-focus-within:opacity-40"
            }`}
          />
          <div
            className={`relative flex w-full flex-col rounded-md border bg-card shadow-xs transition-colors duration-500 ${
              typing ? "border-emerald-500/35" : "border-border focus-within:border-foreground/25"
            }`}
          >
            {/* Everything sits on h-9 rows so the icon, text and send button line up */}
            <div className="flex items-end gap-3 px-4 py-3">
              <div className="flex h-9 shrink-0 items-center text-muted-foreground">
                {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </div>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={empty ? (narrow ? "Ask OscaBot anything…" : "Ask OscaBot — e.g., React dev looking to start with Rust") : "Ask a follow-up…"}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  markTyping();
                }}
                onKeyDown={handleKeyDown}
                disabled={isBusy}
                className="custom-scrollbar max-h-40 min-h-9 w-full resize-none border-0 bg-transparent py-1.5 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-0 disabled:opacity-50"
              />
              <Button type="submit" size="icon" aria-label="Send" disabled={!searchQuery.trim() || isBusy} className="shrink-0">
                <ArrowRight />
              </Button>
            </div>

            {empty && (
              <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                <Button type="button" variant="outline" size="sm" onClick={() => router.push("/dashboard/repositories")}>
                  <GithubIcon /> <span className="sm:hidden">Repositories</span>
                  <span className="hidden sm:inline">Browse all repositories</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => router.push("/dashboard/feed")}>
                  <Compass /> <span className="sm:hidden">Your feed</span>
                  <span className="hidden sm:inline">Browse your feed</span>
                </Button>
              </div>
            )}
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}

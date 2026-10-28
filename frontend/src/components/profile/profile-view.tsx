"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { AlertCircle, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  PageContainer,
  PageHeader,
  Skeleton,
  Spinner,
} from "@/components/ui";
import { ErrorState } from "@/components/ui/error-state";
import { GithubReconnectNotice } from "@/components/github-reconnect-notice";
import { GithubIcon } from "@/components/icons";
import { Dither } from "@/components/ui/dither";
import { DitheredImage, githubAvatarUrl } from "@/components/ui/dithered-image";
import { Eyebrow, SegmentedMeter, Tag, timeAgo } from "@/components/repo-ui";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ProfileSkeleton } from "@/components/skeletons";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useBreadcrumbLabel } from "@/components/breadcrumbs";
import { ContributionsPanel } from "@/components/profile/contributions-panel";

// The contributions calendar is heavy and below the fold; load it on demand
const GitHubCalendar = dynamic(() => import("react-github-calendar").then((m) => m.GitHubCalendar), {
  ssr: false,
  loading: () => <div className="h-[140px] w-full animate-pulse rounded-md bg-muted" aria-hidden />,
});

interface ContributorProfile {
  id: string;
  skillScore: number;
  activityScore: number;
  diversityScore: number;
  qualityScore: number;
  networkScore: number;
  overallScore: number;
  contributionHistory?: unknown;
  repositoryExperience?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

interface ContributionHistory {
  linesAdded?: number;
  avgPrCycleTime?: number;
  codeReviewScore?: number;
  totalCommits?: number;
}

interface QueuedJob {
  jobId: string;
  queue: string;
}

interface JobStatus {
  state: string;
  progress?: { percent?: number; message?: string };
  failedReason?: string | null;
}

const JOB_POLL_MS = 3000;
// Contributor analysis walks the user's repos; give it a generous ceiling.
const JOB_POLL_LIMIT = 100;

interface FullUser {
  id: string;
  name: string;
  username: string;
  // Only on your own profile
  email?: string;
  avatarUrl: string | null;
  skills?: string[];
  contributionScore: number;
  contributorProfile: ContributorProfile | null;
  // Only on your own profile
  communityHidden?: boolean;
  // What the person shows others; scores arrive as null when hidden
  profileShowScores?: boolean;
  profileShowCalendar?: boolean;
}

// Emerald contribution ramp, one per colour scheme (level 0 matches bg-muted).
const CALENDAR_THEME = {
  light: ["#ebedf0", "#a7f3d0", "#6ee7b7", "#10b981", "#047857"],
  dark: ["#1f1f1f", "#064e3b", "#047857", "#10b981", "#34d399"],
};
const CALENDAR_WEEKS = 53;
const CALENDAR_MARGIN = 3;
// Room for the weekday labels ("Mon", "Wed", "Fri") left of the grid
const CALENDAR_LABELS = 36;

// Contribution calendar that fills its container: the block size is derived
// from the measured width so 53 weeks always span the card.
function ActivityCalendar({ username }: { username: string }) {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [blockSize, setBlockSize] = useState(11);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (width: number) => {
      const size = Math.floor((width - CALENDAR_LABELS) / CALENDAR_WEEKS) - CALENDAR_MARGIN;
      setBlockSize(Math.max(8, Math.min(16, size)));
    };
    measure(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full overflow-x-auto text-muted-foreground custom-scrollbar">
      <GitHubCalendar
        username={username}
        colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
        theme={CALENDAR_THEME}
        fontSize={11}
        blockSize={blockSize}
        blockMargin={CALENDAR_MARGIN}
        blockRadius={2}
        showWeekdayLabels={["mon", "wed", "fri"]}
      />
    </div>
  );
}

/**
 * A contributor's profile: identity, contributor index, top skills and the
 * contributions calendar. Without `userId` it's your own, with Re-sync and
 * automatic first analysis; with someone else's id it's read-only (Community).
 */
export function ProfileView({ userId }: { userId?: string }) {
  const { user: authUser, token } = useAuth();
  const targetId = userId ?? authUser?.id;
  const isSelf = !!authUser?.id && targetId === authUser.id;
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const hasTriggeredSync = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
  }, []);

  // Fetch full user details (including contributorProfile)
  const fetchProfile = useCallback(async (silent = false) => {
    if (!targetId || !token) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/users/${targetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setProfile(data.data);
        } else {
          setError("Failed to parse profile data.");
        }
      } else {
        setError(res.status === 404 ? "This profile doesn't exist." : "Failed to fetch profile details.");
      }
    } catch (err) {
      console.error("Error fetching profile details:", err);
      setError("An error occurred while loading profile.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [targetId, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useBreadcrumbLabel(isSelf || !userId ? "" : `/dashboard/community/${userId}`, isSelf ? null : profile?.name || profile?.username);

  // Queue a contributor analysis and follow the job until it finishes, so
  // failures (e.g. an expired GitHub token) are reported instead of spinning.
  const handleAnalyzeProfile = useCallback(async () => {
    if (!authUser?.id || !token) return;
    const finish = (message: string | null) => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = null;
      setAnalyzing(false);
      setAnalysisStatus("");
      setAnalysisError(message);
    };

    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysisStatus("Queuing analysis...");
      const res = await fetch(`${API_URL}/users/${authUser.id}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        finish(res.status === 429 ? "Too many analysis requests. Try again in a few minutes." : "Couldn't start the analysis.");
        return;
      }

      const job: QueuedJob = (await res.json()).data;
      let attempts = 0;
      pollTimer.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`${API_URL}/jobs/${job.queue}/${job.jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!statusRes.ok) return;
          const status: JobStatus = (await statusRes.json()).data;
          setAnalysisStatus(
            status.progress?.message
              ? `${status.progress.message}${status.progress.percent ? ` (${status.progress.percent}%)` : ""}`
              : "Analyzing GitHub history..."
          );

          if (status.state === "completed") {
            await fetchProfile(true);
            finish(null);
          } else if (status.state === "failed") {
            finish(status.failedReason || "The analysis failed.");
          } else if (attempts >= JOB_POLL_LIMIT) {
            finish("The analysis is taking longer than expected. Check back in a few minutes.");
          }
        } catch (err) {
          console.error("Error polling analysis status:", err);
        }
      }, JOB_POLL_MS);
    } catch (err) {
      console.error("Error starting profile analysis:", err);
      finish("Couldn't start the analysis.");
    }
  }, [authUser?.id, token, fetchProfile]);

  // Auto-sync your own profile if it has no analytics scores yet
  useEffect(() => {
    if (isSelf && profile && !profile.contributorProfile && !analyzing && !hasTriggeredSync.current) {
      hasTriggeredSync.current = true;
      handleAnalyzeProfile();
    }
  }, [isSelf, profile, analyzing, handleAnalyzeProfile]);

  // Show or hide your profile in Community; saved straight away, reverted if it fails
  const setCommunityVisible = async (visible: boolean) => {
    if (!authUser?.id || !token || !profile) return;
    setProfile({ ...profile, communityHidden: !visible });
    try {
      const res = await fetch(`${API_URL}/users/${authUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ communityHidden: !visible }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(visible ? "Your profile shows in Community" : "Your profile is hidden from Community");
    } catch (err) {
      console.error("Error updating Community visibility:", err);
      setProfile((p) => (p ? { ...p, communityHidden: visible } : p));
      toast.error("Couldn't update your Community visibility.");
    }
  };

  const header = isSelf ? (
    <PageHeader eyebrow="Account" title="Profile" description="Contribution metrics from your GitHub history." />
  ) : (
    <PageHeader eyebrow="Community" title="Contributor" description="Contribution metrics from their public GitHub history." />
  );

  if (loading) {
    return <ProfileSkeleton header={header} />;
  }

  if (error) {
    return (
      <PageContainer>
        {header}
        <ErrorState message={error} onRetry={() => fetchProfile()} />
      </PageContainer>
    );
  }

  const analytics = profile?.contributorProfile ?? null;
  const scoresPrivate = !isSelf && profile?.profileShowScores === false;
  const calendarPrivate = !isSelf && profile?.profileShowCalendar === false;
  const displayName = profile?.name || profile?.username;
  const history = (analytics?.contributionHistory ?? null) as ContributionHistory | null;
  const repoExperience = analytics?.repositoryExperience as { skills?: { name: string; proficiencyScore: number }[] } | undefined;
  const topSkills = (repoExperience?.skills ?? []).slice(0, 5).map((s) => ({ name: s.name, val: Math.round(s.proficiencyScore) }));
  const tagSkills = (profile?.skills?.length ? profile.skills : topSkills.map((s) => s.name)).slice(0, 4);
  const analyzedAt = analytics?.updatedAt ?? analytics?.createdAt;
  const tokenProblem = !!analysisError && /github token/i.test(analysisError);
  const username = profile?.username;

  const stats = [
    { label: "Lines added", value: history?.linesAdded ? `${(history.linesAdded / 1000).toFixed(1)}k` : null },
    { label: "Avg PR cycle", value: history?.avgPrCycleTime ? `${history.avgPrCycleTime.toFixed(1)} d` : null },
    { label: "Review score", value: history?.codeReviewScore ? `${history.codeReviewScore.toFixed(1)} / 5` : null },
    { label: "Commits this year", value: history?.totalCommits ? history.totalCommits.toLocaleString() : null },
  ];

  const metrics = analytics
    ? [
        { label: "Skill depth", value: analytics.skillScore },
        { label: "Activity", value: analytics.activityScore },
        { label: "Code quality", value: analytics.qualityScore },
        { label: "Diversity", value: analytics.diversityScore },
        { label: "Network reach", value: analytics.networkScore },
      ]
    : [];

  const bannerFallback = <Dither cols={90} rows={34} cell={5} direction="radial" className="text-emerald-500/20" />;

  return (
    <PageContainer>
      {header}

      {analysisError && (tokenProblem ? (
        <GithubReconnectNotice action="analyze your GitHub profile" />
      ) : (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Profile analysis failed</AlertTitle>
          <AlertDescription>{analysisError}</AlertDescription>
        </Alert>
      ))}

      {/* Identity: avatar dithered into the background only */}
      <div className="relative isolate overflow-hidden rounded-md border border-border bg-card">
        <div className="pointer-events-none absolute -right-8 top-1/2 -z-10 -translate-y-1/2 [mask-image:radial-gradient(ellipse_at_right,black_30%,transparent_70%)]">
          {username ? (
            <DitheredImage
              src={githubAvatarUrl(username, 200)}
              cols={64}
              cell={5}
              className="text-emerald-500/25"
              fallback={bannerFallback}
            />
          ) : (
            bannerFallback
          )}
        </div>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="min-w-0 space-y-3">
            <div>
              <h2 className="font-serif text-3xl font-medium italic tracking-tight md:text-4xl">{profile?.name || username}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {username && (
                  <a
                    href={`https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <GithubIcon className="size-3.5" /> @{username}
                  </a>
                )}
                {analyzedAt && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span>Analyzed {timeAgo(analyzedAt)}</span>
                  </>
                )}
              </p>
            </div>
            {tagSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tagSkills.map((skill) => <Tag key={skill}>{skill}</Tag>)}
              </div>
            )}
          </div>
          {isSelf && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 self-start sm:mt-1.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={!profile?.communityHidden}
                onCheckedChange={setCommunityVisible}
                aria-describedby="community-visibility-hint"
              />
              Show in Community
              <span id="community-visibility-hint" className="sr-only">
                When off, you don&apos;t appear in Community and others can&apos;t open your profile.
              </span>
            </label>
            {analyzing && analysisStatus && (
              <span className="max-w-xs truncate text-sm text-muted-foreground" aria-live="polite">
                {analysisStatus}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleAnalyzeProfile} disabled={analyzing}>
              {analyzing ? <Spinner className="text-current" /> : <RefreshCw />}
              {analyzing ? "Analyzing" : "Re-sync"}
            </Button>
          </div>
          )}
        </div>
        {!scoresPrivate && (
        <div className="relative grid grid-cols-2 border-t border-border bg-background sm:grid-cols-4">
          {stats.map(({ label, value }, i) => (
            <div
              key={label}
              className={cn(
                "px-5 py-4 sm:px-6",
                i % 2 === 1 && "border-l border-border",
                i >= 2 && "border-t border-border sm:border-t-0",
                i > 0 && "sm:border-l"
              )}
            >
              <p className={cn("text-xl font-semibold tabular-nums", !value && "text-muted-foreground")}>{value ?? "—"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Contributor index */}
        <div className="rounded-md border border-border bg-card p-5 sm:p-6">
          <Eyebrow>Contributor index</Eyebrow>
          {scoresPrivate ? (
            <p className="mt-5 text-sm text-muted-foreground">{displayName} keeps their scores private.</p>
          ) : analytics ? (
            <>
              <p className="mt-2 font-serif text-6xl font-medium italic leading-none tabular-nums">
                {Math.round(analytics.overallScore)}
                <span className="ml-1 font-sans text-base not-italic text-muted-foreground">/ 100</span>
              </p>
              <SegmentedMeter value={analytics.overallScore} segments={32} className="mt-5" />
              <div className="mt-6 space-y-3.5">
                {metrics.map(({ label, value }) => (
                  <div key={label} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <SegmentedMeter value={value} segments={20} />
                    <span className="text-right font-medium tabular-nums">{Math.round(value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : analyzing ? (
            <div className="mt-4 space-y-4" aria-busy="true">
              <Skeleton className="h-14 w-32" />
              <Skeleton className="h-2 w-full" />
              <p className="text-sm text-muted-foreground">
                {analysisStatus || "Analyzing your GitHub contribution history..."} Results appear automatically.
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              {isSelf ? "No analysis yet. Re-sync to scan your GitHub contribution history." : "This profile hasn't been analyzed yet."}
            </p>
          )}
        </div>

        {/* Top skills */}
        <div className="rounded-md border border-border bg-card p-5 sm:p-6">
          <Eyebrow>Top skills</Eyebrow>
          {scoresPrivate ? (
            <p className="mt-5 text-sm text-muted-foreground">{displayName} keeps their skill scores private.</p>
          ) : topSkills.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Skills appear here after {isSelf ? "your" : "their"} GitHub profile is analyzed.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {topSkills.map(({ name, val }) => (
                <div key={name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="tabular-nums text-muted-foreground">{val}%</span>
                  </div>
                  <SegmentedMeter value={val} segments={32} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity */}
      <div className="min-w-0 rounded-md border border-border bg-card p-5 sm:p-6">
        <Eyebrow className="mb-5">Contributions · past year</Eyebrow>
        {calendarPrivate ? (
          <p className="text-sm text-muted-foreground">{displayName} keeps their contributions calendar private.</p>
        ) : username ? (
          <ActivityCalendar username={username} />
        ) : (
          <Skeleton className="h-28 w-full" />
        )}
      </div>

      {isSelf && authUser?.id && token && <ContributionsPanel userId={authUser.id} token={token} />}
    </PageContainer>
  );
}

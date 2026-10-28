"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { EyeOff, Star } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { FeedService, FeedLanguage } from "@/services/feed.service";
import { ExperienceLevel, FeedView, HiddenRepository, UserService, UserSettings } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSkeleton } from "@/components/skeletons";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LanguageDot, timeAgo } from "@/components/repo-ui";
import { cn } from "@/lib/utils";
import { SectionNav } from "@/components/section-nav";
import { InterestPicker } from "@/components/interest-picker";

const EXPERIENCE_OPTIONS = [
  { value: "first", label: "First PR" },
  { value: "some", label: "A few PRs" },
  { value: "experienced", label: "Experienced" },
] as const satisfies readonly { value: ExperienceLevel; label: string }[];

const EXPERIENCE_HINT: Record<ExperienceLevel, string> = {
  first: "Leans on newcomer-friendly projects: plenty of good first issues, active maintainers, a contributing guide.",
  some: "Balances newcomer-friendliness with how established a project is.",
  experienced: "Leans on established, popular projects where you can take on bigger work.",
};

const VIEW_OPTIONS = [
  { value: "grid", label: "Grid" },
  { value: "focus", label: "One by one" },
] as const satisfies readonly { value: FeedView; label: string }[];

const HEADER = <PageHeader title={<em>Settings</em>} description="Your profile's visibility, what you're recommended, and your account." />;

/* ─── Layout pieces ────────────────────────────────────────────────────────── */

function Section({
  id,
  title,
  description,
  danger,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-nav-section={title}
      className={cn("scroll-mt-6 rounded-md border bg-card", danger ? "border-destructive/40" : "border-border")}
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className={cn("text-base font-semibold tracking-tight", danger && "text-destructive")}>{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ title, description, control, children }: { title: string; description?: React.ReactNode; control?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {control && <div className="shrink-0 pt-0.5">{control}</div>}
      </div>
      {children}
    </div>
  );
}

/** Pick languages as chips; ones chosen in the other list are unavailable */
function LanguagePicker({
  languages,
  selected,
  blocked,
  tone,
  onToggle,
}: {
  languages: FeedLanguage[];
  selected: string[];
  blocked: string[];
  tone: "prefer" | "exclude";
  onToggle: (language: string) => void;
}) {
  // Saved languages outside the catalogue's top list still get a chip, so they can be turned off
  const listed = languages.map((l) => l.language);
  const names = [...listed, ...[...selected, ...blocked].filter((l, i, all) => !listed.includes(l) && all.indexOf(l) === i)];
  if (names.length === 0) return <p className="text-sm text-muted-foreground">No languages in the catalogue yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((language) => {
        const on = selected.includes(language);
        const unavailable = !on && blocked.includes(language);
        return (
          <button
            key={language}
            type="button"
            aria-pressed={on}
            disabled={unavailable}
            title={unavailable ? `Already in the other list` : undefined}
            onClick={() => onToggle(language)}
            className={cn(
              "inline-flex h-7 cursor-pointer items-center rounded-md border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              on && tone === "prefer" && "border-emerald-500/40 bg-tint-emerald-500 text-emerald-700 dark:text-emerald-300",
              on && tone === "exclude" && "border-red-500/40 bg-tint-red-500 text-red-700 dark:text-red-300",
              !on && "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {language}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const { user, token, updateUser, logout } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [languages, setLanguages] = useState<FeedLanguage[]>([]);
  const [hidden, setHidden] = useState<HiddenRepository[] | null>(null);
  const [error, setError] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !token) return;
    setError(false);
    try {
      const [s, langs, hiddenRepos] = await Promise.all([
        UserService.getSettings(user.id, token),
        FeedService.getLanguages(token).catch(() => [] as FeedLanguage[]),
        UserService.listHiddenRepositories(user.id, token),
      ]);
      setSettings(s);
      setLanguages(langs);
      setHidden(hiddenRepos);
    } catch (err) {
      console.error(err);
      setError(true);
    }
  }, [user?.id, token]);

  useEffect(() => {
    load();
  }, [load]);

  // Saves straight away; reverts and explains if the server says no
  const save = async (patch: Partial<Omit<UserSettings, "onboardedAt">>) => {
    if (!user?.id || !token || !settings) return;
    const before = settings;
    setSettings({ ...settings, ...patch });
    try {
      const saved = await UserService.updateSettings(user.id, patch, token);
      setSettings((current) => (current ? { ...current, ...pick(saved, patch) } : current));
      updateUser(patch);
    } catch (err) {
      // Revert only the keys that still hold what this save set; a later save may have changed them since
      setSettings((current) => {
        if (!current) return current;
        const next = { ...current };
        for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
          if (current[key] === patch[key]) (next as Record<string, unknown>)[key] = before[key];
        }
        return next;
      });
      toast.error(err instanceof Error ? err.message : "Couldn't save that setting.");
    }
  };

  const toggleLanguage = (list: "preferredLanguages" | "excludedLanguages", language: string) => {
    if (!settings) return;
    const current = settings[list];
    save({ [list]: current.includes(language) ? current.filter((l) => l !== language) : [...current, language] });
  };

  const restore = async (repo: HiddenRepository) => {
    if (!token) return;
    setRestoring(repo.id);
    try {
      await FeedService.clearNotInterested(token, repo.id);
      setHidden((list) => list?.filter((r) => r.id !== repo.id) ?? list);
      toast.success(`${repo.owner}/${repo.name} is back in your feed`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't restore that repository.");
    } finally {
      setRestoring(null);
    }
  };

  const deleteAccount = async () => {
    if (!user?.id || !token) return;
    setDeleting(true);
    try {
      await UserService.deleteAccount(user.id, token);
      toast.success("Your account and data were deleted");
      logout();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't delete your account. Try again in a moment.");
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <PageContainer>
        {HEADER}
        <ErrorState message="We couldn't load your settings." onRetry={load} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {HEADER}
      {!settings ? (
        <SettingsSkeleton />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        {/* Stretched to the row's height so the list has room to stay pinned */}
        <aside className="hidden self-stretch lg:block">
          <div className="sticky top-6">
            <SectionNav />
          </div>
        </aside>
        <div className="stagger-in flex min-w-0 flex-col gap-5">
          <Section id="privacy" title="Profile & privacy" description="What other OSCA users can see. Your email is never shown.">
            <Row
              title="Show in Community"
              description="Appear in Community and let others open your profile."
              control={<Switch checked={!settings.communityHidden} onCheckedChange={(on) => save({ communityHidden: !on })} aria-label="Show in Community" />}
            />
            <Row
              title="Show scores and stats"
              description="Your contributor index, skill scores and contribution stats."
              control={
                <Switch
                  checked={settings.profileShowScores}
                  disabled={settings.communityHidden}
                  onCheckedChange={(on) => save({ profileShowScores: on })}
                  aria-label="Show scores and stats"
                />
              }
            />
            <Row
              title="Show contributions calendar"
              description="The past year of your public GitHub contributions."
              control={
                <Switch
                  checked={settings.profileShowCalendar}
                  disabled={settings.communityHidden}
                  onCheckedChange={(on) => save({ profileShowCalendar: on })}
                  aria-label="Show contributions calendar"
                />
              }
            />
          </Section>

          <Section id="recommendations" title="Recommendations" description="Shapes what For you and OscaBot suggest.">
            <Row title="What you want to work on" description="Projects in these areas rank higher.">
              <InterestPicker
                selected={settings.interestAreas}
                onToggle={(area) =>
                  save({
                    interestAreas: settings.interestAreas.includes(area)
                      ? settings.interestAreas.filter((a) => a !== area)
                      : [...settings.interestAreas, area],
                  })
                }
              />
            </Row>
            <Row title="Experience level" description={EXPERIENCE_HINT[settings.experienceLevel]}>
              <SegmentedControl
                aria-label="Experience level"
                value={settings.experienceLevel}
                onValueChange={(experienceLevel) => save({ experienceLevel })}
                options={EXPERIENCE_OPTIONS}
                className="self-start"
              />
            </Row>
            <Row title="Languages you want" description="Boosted in your feed, even ones you haven't written yet.">
              <LanguagePicker
                languages={languages}
                selected={settings.preferredLanguages}
                blocked={settings.excludedLanguages}
                tone="prefer"
                onToggle={(l) => toggleLanguage("preferredLanguages", l)}
              />
            </Row>
            <Row title="Languages to skip" description="Repositories written mainly in these never appear.">
              <LanguagePicker
                languages={languages}
                selected={settings.excludedLanguages}
                blocked={settings.preferredLanguages}
                tone="exclude"
                onToggle={(l) => toggleLanguage("excludedLanguages", l)}
              />
            </Row>
          </Section>

          <Section id="feed" title="For you" description="How your recommendations are laid out.">
            <Row
              title="Default view"
              description="How For you opens, on every device."
              control={
                <SegmentedControl
                  aria-label="Default view"
                  size="sm"
                  value={settings.feedView}
                  onValueChange={(feedView) => save({ feedView })}
                  options={VIEW_OPTIONS}
                />
              }
            />
          </Section>

          <Section id="hidden" title="Not for me" description="Repositories you hid from your feed.">
            {hidden && hidden.length > 0 ? (
              hidden.map((repo) => (
                <div key={repo.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/repository/${repo.id}`} className="block truncate text-sm font-medium hover:underline">
                      {repo.owner}/{repo.name}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {repo.primaryLanguage && <LanguageDot language={repo.primaryLanguage} />}
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3" /> {repo.stars.toLocaleString()}
                      </span>
                      <span>Hidden {timeAgo(repo.hiddenAt)}</span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled={restoring === repo.id} onClick={() => restore(repo)}>
                    {restoring === repo.id && <Spinner className="text-current" />}
                    Restore
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2.5 px-5 py-4 text-sm text-muted-foreground sm:px-6">
                <EyeOff className="size-4" /> Nothing hidden. Use &ldquo;Not for me&rdquo; on a recommendation to hide it.
              </div>
            )}
          </Section>

          <Section id="account" title="Account" danger>
            <Row
              title="Delete account"
              description="Deletes your profile, scores, likes, imports and history from OSCA, and removes OSCA's access to your GitHub account. This can't be undone."
              control={
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  Delete account
                </Button>
              }
            />
          </Section>
        </div>
        </div>
      )}

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Everything OSCA stores about you is deleted and you&apos;re signed out. Anything you posted on GitHub through
              OSCA (issues, comments, reactions) stays on GitHub.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-mono">{user?.username}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" disabled={deleting}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting || !user?.username || confirmText.trim() !== user.username}
              onClick={deleteAccount}
            >
              {deleting && <Spinner className="text-current" />}
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

/** The saved values of just the fields that were changed */
function pick(saved: UserSettings, patch: Partial<UserSettings>): Partial<UserSettings> {
  const out: Partial<UserSettings> = {};
  for (const key of Object.keys(patch) as (keyof UserSettings)[]) {
    (out as Record<string, unknown>)[key] = saved[key];
  }
  return out;
}

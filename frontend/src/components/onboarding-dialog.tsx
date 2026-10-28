"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { FeedService, FeedLanguage } from "@/services/feed.service";
import { ExperienceLevel, UserService } from "@/services/user.service";
import { PREFERENCES_CHANGED } from "@/constants/interests";
import { InterestPicker } from "@/components/interest-picker";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const EXPERIENCE = [
  { value: "first", label: "First PR" },
  { value: "some", label: "A few PRs" },
  { value: "experienced", label: "Experienced" },
] as const satisfies readonly { value: ExperienceLevel; label: string }[];

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/**
 * Three quick questions on the first visit, so recommendations start from what
 * someone wants rather than only their GitHub history. Shown until finished or
 * skipped; everything is editable later in Settings.
 */
export function OnboardingDialog() {
  const { user, token, updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel>("first");
  const [preferred, setPreferred] = useState<string[]>([]);
  const [languages, setLanguages] = useState<FeedLanguage[]>([]);
  const [saving, setSaving] = useState(false);

  const needed = !!user && user.onboardedAt === null;
  useEffect(() => {
    if (!needed || !token) return;
    setOpen(true);
    setExperience(user?.experienceLevel ?? "first");
    FeedService.getLanguages(token).then(setLanguages).catch(() => setLanguages([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needed, token]);

  const finish = async (save: boolean) => {
    if (!user?.id || !token) return;
    setSaving(true);
    const patch = save
      ? { interestAreas: interests, experienceLevel: experience, preferredLanguages: preferred, onboarded: true }
      : { onboarded: true };
    try {
      const saved = await UserService.updateSettings(user.id, patch, token);
      updateUser({
        onboardedAt: saved.onboardedAt,
        interestAreas: saved.interestAreas,
        experienceLevel: saved.experienceLevel,
        preferredLanguages: saved.preferredLanguages,
      });
      setOpen(false);
      if (save) {
        window.dispatchEvent(new Event(PREFERENCES_CHANGED));
        toast.success("Your recommendations are tuned to that");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!needed) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && finish(false)}>
      <DialogContent className="max-h-[90svh] gap-6 overflow-y-auto rounded-md sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium italic">What do you want to work on?</DialogTitle>
          <DialogDescription>
            Three quick questions so your first recommendations fit. You can change any of it in Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <p className="text-sm font-medium">Areas that interest you</p>
          <InterestPicker selected={interests} onToggle={(v) => setInterests((list) => toggle(list, v))} />
        </div>

        <div className="space-y-2.5">
          <p className="text-sm font-medium">Your open-source experience</p>
          <SegmentedControl aria-label="Experience level" value={experience} onValueChange={setExperience} options={EXPERIENCE} />
        </div>

        {languages.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-sm font-medium">
              Languages you want to work in <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {languages.slice(0, 18).map(({ language }) => {
                const on = preferred.includes(language);
                return (
                  <button
                    key={language}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPreferred((list) => toggle(list, language))}
                    className={cn(
                      "inline-flex h-7 cursor-pointer items-center rounded-md border px-2.5 text-xs font-medium transition-colors",
                      on
                        ? "border-emerald-500/40 bg-tint-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {language}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => finish(false)}>
            Skip
          </Button>
          <Button size="sm" disabled={saving} onClick={() => finish(true)}>
            {saving && <Spinner className="text-current" />}
            Show my matches
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

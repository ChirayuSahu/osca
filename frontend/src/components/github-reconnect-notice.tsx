"use client";

import { AlertCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons";

// Shown when a GitHub-backed request fails because the user's GitHub token is
// no longer valid; signing in again stores a fresh one.
export function GithubReconnectNotice({ action = "load this" }: { action?: string }) {
  const { loginWithGithub } = useAuth();

  return (
    <div role="alert" className="flex flex-col gap-4 rounded-md border border-warning/25 bg-warning/[0.06] p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center text-warning">
          <AlertCircle className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">GitHub connection expired</p>
          <p className="text-sm text-muted-foreground">We couldn&apos;t {action}. Reconnect to continue.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="self-start sm:self-center" onClick={loginWithGithub}>
        <GithubIcon /> Reconnect GitHub
      </Button>
    </div>
  );
}

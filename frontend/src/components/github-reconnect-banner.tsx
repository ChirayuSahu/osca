"use client";

import { AlertCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons";

// Shown on every dashboard page while GitHub rejects the stored token (expired or
// revoked), including when that was found in a background job. Signing in again
// stores a fresh token and the backend clears the flag.
export function GithubReconnectBanner() {
  const { user, loginWithGithub } = useAuth();
  if (!user?.githubTokenInvalidAt) return null;

  return (
    <div role="alert" className="border-b border-warning/25 bg-tint-warning">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 md:px-6">
        <p className="flex flex-1 items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            <span className="font-medium">Your GitHub connection expired.</span>{" "}
            <span className="text-muted-foreground">Reconnect so OSCA can keep your profile and contributions up to date.</span>
          </span>
        </p>
        <Button variant="outline" size="sm" className="self-start sm:self-auto" onClick={loginWithGithub}>
          <GithubIcon /> Reconnect GitHub
        </Button>
      </div>
    </div>
  );
}

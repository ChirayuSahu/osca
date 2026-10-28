"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Spinner } from "@/components/ui/spinner";

// Only our own wording is shown: text from the URL could be used to show a
// convincing fake message through a crafted link
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "GitHub sign-in was cancelled. Try again whenever you're ready.",
  session_error: "We couldn't finish signing you in. Please try again.",
  invalid_params: "That sign-in link was incomplete or expired. Please try again.",
};
const FALLBACK_ERROR = "Something went wrong while signing in. Please try again.";

function LoginContent() {
  const error = useSearchParams().get("error");
  const message = error ? ERROR_MESSAGES[error] ?? FALLBACK_ERROR : null;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      description="Pick up where you left off: your matches, saved repositories and conversations with OscaBot."
      error={message}
      footer={
        <>
          New to OSCA?{" "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center bg-background">
          <Spinner />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

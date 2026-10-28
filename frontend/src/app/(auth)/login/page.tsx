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
  // From the backend's GitHub callback
  invalid_state: "That sign-in took too long or was started in another tab. Please try again.",
  missing_code: "GitHub didn't finish the sign-in. Please try again.",
  bad_verification_code: "That sign-in link was already used or expired. Please try again.",
  token_exchange_failed: "We couldn't reach GitHub to finish signing in. Please try again.",
  sign_in_failed: "We couldn't finish signing you in. Please try again.",
};
const FALLBACK_ERROR = "Something went wrong while signing in. Please try again.";

function LoginContent() {
  const error = useSearchParams().get("error");
  const message = error ? ERROR_MESSAGES[error] ?? FALLBACK_ERROR : null;

  return (
    <AuthShell
      title="Sign in to your account"
      error={message}
      footer={
        <>
          New to OSCA?{" "}
          <Link href="/register">
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

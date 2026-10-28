"use client";

import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

// Accounts are created through GitHub OAuth, so signing up and signing in share one flow
export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Connect GitHub and OSCA reads the languages you already write, then finds projects where your first PR is welcome."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    />
  );
}

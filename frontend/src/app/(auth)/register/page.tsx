"use client";

import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

// Accounts are created through GitHub OAuth, so signing up and signing in share one flow
export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login">
            Sign in
          </Link>
        </>
      }
    />
  );
}

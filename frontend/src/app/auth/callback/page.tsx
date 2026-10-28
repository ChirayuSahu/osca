"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuth();

  const processed = React.useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    // The backend redirects with a one-time code (never the session itself) that
    // is valid for a minute and works once
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login?error=invalid_params");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.data?.token || !body?.data?.user) throw new Error(body?.message || "exchange failed");
        setAuth(body.data.token, body.data.user);
        // replace: the code shouldn't stay in history
        router.replace("/dashboard");
      } catch (err) {
        console.error("Sign-in failed", err);
        router.replace("/login?error=session_error");
      }
    })();
  }, [searchParams, setAuth, router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
      <Spinner className="size-5" />
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
        <Spinner className="size-5" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

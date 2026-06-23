"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuth();

  const processed = React.useRef(false);

  useEffect(() => {
    if (processed.current) return;
    
    const token = searchParams.get("token");
    const userJson = searchParams.get("user");

    if (token && userJson) {
      try {
        let parsedUser;
        try {
          parsedUser = JSON.parse(userJson);
        } catch {
          // If direct parsing fails, the string might be double-encoded
          try {
            parsedUser = JSON.parse(decodeURIComponent(userJson));
          } catch {
            // Try one more level of decoding if needed
            parsedUser = JSON.parse(decodeURIComponent(decodeURIComponent(userJson)));
          }
        }
        processed.current = true;
        setAuth(token, parsedUser);
        router.push("/dashboard");
      } catch (err) {
        console.error("Failed to parse user session. Raw value:", userJson, err);
        router.push("/login?error=session_error");
      }
    } else {
      processed.current = true;
      router.push("/login?error=invalid_params");
    }
  }, [searchParams, setAuth, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white space-y-4">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-neutral-400 font-light">Completing authentication...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white space-y-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-neutral-400 font-light">Loading...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setUnauthorizedHandler } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  skills?: string[];
  contributionScore?: number;
  // Settings, present on /auth/me
  communityHidden?: boolean;
  profileShowScores?: boolean;
  profileShowCalendar?: boolean;
  experienceLevel?: "first" | "some" | "experienced";
  preferredLanguages?: string[];
  excludedLanguages?: string[];
  feedView?: "grid" | "focus";
  interestAreas?: string[];
  onboardedAt?: string | null;
  /** Set when GitHub rejected the stored token; cleared by signing in again */
  githubTokenInvalidAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** True from logout until the landing page shows, so guards don't send you to /login */
  loggingOut: boolean;
  loginWithGithub: () => void;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
  /** Merge saved changes (e.g. settings) into the signed-in user */
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Check for stored token and fetch user on load
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem("osca_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setToken(storedToken);
            setUser(data.data);
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token is invalid/expired
          localStorage.removeItem("osca_token");
        } else {
          // Server trouble (5xx etc.): keep the session, the token may still be good
          setToken(storedToken);
        }
      } catch (err) {
        // Network error: keep the session rather than signing you out
        console.error("Error loading user profile:", err);
        setToken(storedToken);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [API_URL]);

  const loginWithGithub = useCallback(() => {
    // Redirect browser to Express GitHub OAuth initiation endpoint
    window.location.href = `${API_URL}/auth/github`;
  }, [API_URL]);

  const logout = useCallback(() => {
    // Flag first so the dashboard's redirect-to-login guard doesn't race this
    setLoggingOut(true);
    localStorage.removeItem("osca_token");
    setToken(null);
    setUser(null);
    router.replace("/");
  }, [router]);

  // The flag has done its job once the landing page shows
  useEffect(() => {
    if (loggingOut && pathname === "/") setLoggingOut(false);
  }, [loggingOut, pathname]);

  // A 401 from our API means the session JWT expired: sign out and go to /login.
  // Requests made with an older token (e.g. before signing in again) are ignored.
  useEffect(() => {
    setUnauthorizedHandler((requestToken) => {
      if (localStorage.getItem("osca_token") !== requestToken) return;
      localStorage.removeItem("osca_token");
      setToken(null);
      setUser(null);
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  const setAuth = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("osca_token", newToken);
    setLoggingOut(false);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, loggingOut, loginWithGithub, logout, setAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

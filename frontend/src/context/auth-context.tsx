"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  skills?: string[];
  contributionScore?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithGithub: () => void;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
          if (data.success && data.data?.user) {
            setToken(storedToken);
            setUser(data.data.user);
          } else {
            // Token is invalid/expired
            localStorage.removeItem("osca_token");
          }
        } else {
          localStorage.removeItem("osca_token");
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [API_URL]);

  const loginWithGithub = () => {
    // Redirect browser to Express GitHub OAuth initiation endpoint
    window.location.href = `${API_URL}/auth/github`;
  };

  const logout = () => {
    localStorage.removeItem("osca_token");
    setToken(null);
    setUser(null);
    router.push("/");
  };

  const setAuth = (newToken: string, newUser: User) => {
    localStorage.setItem("osca_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGithub, logout, setAuth }}>
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

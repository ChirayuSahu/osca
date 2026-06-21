"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { Sparkles, BookOpen, RefreshCw, UserCheck, Shield } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback, Badge, Progress } from "@/components/ui";

interface ContributorProfile {
  id: string;
  skillScore: number;
  activityScore: number;
  diversityScore: number;
  qualityScore: number;
  overallScore: number;
  contributionHistory?: unknown;
  repositoryExperience?: unknown;
}

interface FullUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  skills: string[];
  contributionScore: number;
  contributorProfile: ContributorProfile | null;
}

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function ProfilePage() {
  const { user: authUser, token } = useAuth();
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const hasTriggeredSync = useRef(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Fetch full user details (including contributorProfile)
  const fetchProfile = useCallback(async (silent = false) => {
    if (!authUser?.id || !token) return;
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API_URL}/users/${authUser.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setProfile(data.data);
        } else {
          setError("Failed to parse profile data.");
        }
      } else {
        setError("Failed to fetch profile details.");
      }
    } catch (err) {
      console.error("Error fetching profile details:", err);
      setError("An error occurred while loading profile.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authUser?.id, token, API_URL]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle triggering contributor profile analysis
  const handleAnalyzeProfile = useCallback(async () => {
    if (!authUser?.id || !token) return;
    try {
      setAnalyzing(true);
      setAnalysisStatus("Initializing analysis job on queue...");
      const res = await fetch(`${API_URL}/users/${authUser.id}/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setAnalysisStatus("Analyzing GitHub history...");
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          await fetchProfile(true);
          
          if (attempts >= 12) {
            clearInterval(interval);
            setAnalyzing(false);
            setAnalysisStatus("");
          }
        }, 5000);
      } else {
        setAnalyzing(false);
      }
    } catch (err) {
      console.error("Error starting profile analysis:", err);
      setAnalyzing(false);
    }
  }, [authUser?.id, token, API_URL, fetchProfile]);

  // Auto-sync if profile is loaded but has no analytics scores
  useEffect(() => {
    if (profile && !profile.contributorProfile && !analyzing && !hasTriggeredSync.current) {
      hasTriggeredSync.current = true;
      handleAnalyzeProfile();
    }
  }, [profile, analyzing, handleAnalyzeProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto mt-12 text-center py-12 border border-dashed border-red-500/20 rounded-3xl bg-red-950/5">
        <p className="text-red-400 text-sm font-light">{error}</p>
        <button 
          onClick={() => fetchProfile()} 
          className="mt-4 px-4 py-2 text-xs border border-white/[0.04] bg-neutral-950/40 rounded-xl text-white hover:bg-white/[0.02]"
        >
          Try Again
        </button>
      </div>
    );
  }

  const hasAnalytics = !!profile?.contributorProfile;
  const analytics = profile?.contributorProfile;

  return (
    <div className="max-w-7xl w-full mx-auto space-y-8 pb-16 pt-4 select-none">
      
      {/* Profile Header Banner */}
      <div className="p-8 rounded-3xl border border-white/[0.04] bg-neutral-950/20 backdrop-blur-md flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <Avatar className="w-20 h-20 border border-white/[0.08] shadow-2xl">
            {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
            <AvatarFallback className="bg-emerald-500/5 text-emerald-400 text-2xl font-light">
              {profile?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center md:text-left space-y-2.5">
            <div>
              <h1 className="text-2xl font-normal text-white tracking-tight">{profile?.name}</h1>
              <p className="text-xs text-neutral-500 font-light flex items-center justify-center md:justify-start gap-1 mt-0.5">
                <GithubIcon className="w-3.5 h-3.5" />
                @{profile?.username}
              </p>
            </div>
            {profile?.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-1">
                {profile.skills.map((skill) => (
                  <Badge 
                    key={skill}
                    variant="outline"
                    className="text-[10px] rounded-xl border-white/[0.06] bg-white/[0.01] text-neutral-400 font-light py-0.5 px-2 hover:border-emerald-500/20 hover:text-emerald-400 transition-colors"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {analyzing && (
          <div className="flex flex-col items-center md:items-end space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{analysisStatus}</span>
            </div>
          </div>
        )}
      </div>

      {/* Deep Contributor Analytics */}
      <div className="p-8 rounded-3xl border border-white/[0.04] bg-neutral-950/20 backdrop-blur-md space-y-8">
        
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
          <h2 className="text-sm font-normal text-neutral-300 tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Contributor Performance Index
          </h2>
        </div>

        {!hasAnalytics && !analyzing ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <p className="text-neutral-500 text-xs font-light">No deep analytics file found for your developer profile.</p>
            <p className="text-[11px] text-neutral-600 font-light max-w-sm">
              Please check back in a moment while we scan your profile in the background.
            </p>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            
            {/* Overall Index Score Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-white/[0.04] bg-neutral-950/30">
              <div className="space-y-1.5 max-w-xl">
                <span className="text-xs text-neutral-500 font-light tracking-wide uppercase">Overall Code Index Rating</span>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  Weighted index scored from your contributions, language diversity, commit volume, and code structural patterns.
                </p>
              </div>
              <div className="flex items-baseline gap-1 text-center md:text-right min-w-[120px]">
                <span className="text-5xl font-extralight text-white tracking-tight">
                  {analytics.overallScore.toFixed(1)}
                </span>
                <span className="text-xs text-neutral-600 font-light">/100</span>
              </div>
            </div>

            {/* Sub-Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 pt-2">
              {[
                { label: "Skill Depth", score: analytics.skillScore, desc: "Technical complexity & code variety", icon: BookOpen },
                { label: "Activity Rate", score: analytics.activityScore, desc: "Commit frequency & PR velocity", icon: RefreshCw },
                { label: "Code Quality", score: analytics.qualityScore, desc: "Best practices & documentation patterns", icon: UserCheck },
                { label: "Diversity Scope", score: analytics.diversityScore, desc: "Cross-repo contributions & org involvement", icon: Shield }
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-light flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-neutral-600" />
                        {metric.label}
                      </span>
                      <span className="text-white font-normal">{metric.score.toFixed(1)}%</span>
                    </div>
                    
                    <Progress value={metric.score} className="h-1 bg-white/[0.03]" />
                    <p className="text-[10px] text-neutral-500 font-light leading-snug">{metric.desc}</p>
                  </div>
                );
              })}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            <div className="space-y-1">
              <p className="text-neutral-400 text-xs font-normal">Analyzing your GitHub contribution history...</p>
              <p className="text-neutral-500 text-[10px] font-light">This usually takes around 10-20 seconds. Results will show automatically.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

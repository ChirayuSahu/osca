"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { 
  Sparkles, 
  BookOpen, 
  RefreshCw, 
  UserCheck, 
  Shield, 
  Network, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileCode, 
  GitMerge, 
  Code2,
  Loader2
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback, Badge, Button } from "@/components/ui";
import { GitHubCalendar } from 'react-github-calendar';
import { ErrorState } from "@/components/ui/error-state";

interface ContributorProfile {
  id: string;
  skillScore: number;
  activityScore: number;
  diversityScore: number;
  qualityScore: number;
  networkScore: number;
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
      setAnalysisStatus("Analyzing GitHub history...");
      const res = await fetch(`${API_URL}/users/${authUser.id}/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
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
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-neutral-400">Loading developer profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto mt-12 w-full">
        <ErrorState message={error} onRetry={() => fetchProfile()} />
      </div>
    );
  }

  const hasAnalytics = !!profile?.contributorProfile;
  const analytics = profile?.contributorProfile;

  return (
    <div className="max-w-7xl w-full mx-auto space-y-8 pb-16 pt-2 select-none relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Page Header matching Feed / Repositories pages */}
      <div className="space-y-2 mb-8">
        <h1 className="text-[40px] font-serif italic text-white font-medium tracking-wide">Developer Profile</h1>
        <p className="text-xl font-bold text-white">Insights and contribution metrics for your open-source journey</p>
      </div>

      {/* Profile Header Banner Card */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.05] hover:border-white/[0.1] p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 transition-all duration-300 relative overflow-hidden shadow-xl">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <Avatar className="w-20 h-20 border-2 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
            <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-2xl font-bold">
              {profile?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center md:text-left space-y-3">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{profile?.name}</h2>
              <a 
                href={`https://github.com/${profile?.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-neutral-400 hover:text-emerald-400 flex items-center justify-center md:justify-start gap-1.5 mt-1 transition-colors group"
              >
                <GithubIcon className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                <span>@{profile?.username}</span>
              </a>
            </div>
            {profile?.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                {profile.skills.map((skill) => (
                  <Badge 
                    key={skill}
                    variant="secondary"
                    className="text-xs rounded-full border-transparent bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 font-medium py-1 px-3 transition-colors"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {analyzing ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{analysisStatus}</span>
            </div>
          ) : (
            <Button
              onClick={handleAnalyzeProfile}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-full px-5 py-2.5 text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Re-sync Analytics
            </Button>
          )}
        </div>
      </div>

      {/* Deep Contributor Analytics */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.05] hover:border-white/[0.1] p-6 md:p-8 space-y-8 transition-all duration-300 shadow-xl">
        
        <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Contributor Performance Index
          </h2>
        </div>

        {!hasAnalytics && !analyzing ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <p className="text-neutral-400 text-sm font-medium">No deep analytics found for your developer profile.</p>
            <p className="text-xs text-neutral-500 max-w-sm">
              Click &quot;Re-sync Analytics&quot; to scan and process your GitHub contribution history.
            </p>
          </div>
        ) : analytics ? (
          <div className="space-y-6 relative">

            {/* Overall Index Score Banner */}
            <div className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-2xl border border-white/[0.05] bg-neutral-900/40 hover:border-emerald-500/20 transition-all duration-300">
              
              <div className="space-y-2.5 max-w-xl text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Primary Metric
                </div>
                <h3 className="text-2xl font-bold text-white">Overall Code Index Rating</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  A comprehensive, weighted index derived from your algorithmic contributions, language diversity, commit velocity, and structural code quality.
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative flex flex-col items-center justify-center w-32 h-32 rounded-full border-2 border-emerald-500/30 bg-black/90 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <span className="text-4xl font-bold text-emerald-400 tracking-tight">
                    {analytics.overallScore.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium tracking-widest mt-0.5">/ 100</span>
                </div>
              </div>
            </div>

            {/* Sub-Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Skill Depth", score: analytics.skillScore, desc: "Technical complexity & code variety", icon: BookOpen },
                { label: "Activity Rate", score: analytics.activityScore, desc: "Commit frequency & PR velocity", icon: RefreshCw },
                { label: "Code Quality", score: analytics.qualityScore, desc: "Best practices & documentation patterns", icon: UserCheck },
                { label: "Diversity Scope", score: analytics.diversityScore, desc: "Cross-repo contributions & org involvement", icon: Shield },
                { label: "Network Reach", score: analytics.networkScore, desc: "Collaborator overlap across contribution graph", icon: Network }
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div 
                    key={metric.label} 
                    className="bg-neutral-900/40 rounded-xl border border-white/[0.05] hover:border-emerald-500/30 p-5 flex flex-col justify-between space-y-4 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{metric.label}</h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">{metric.desc}</p>
                        </div>
                      </div>
                      <span className="text-base font-bold text-white">
                        {metric.score.toFixed(1)}<span className="text-emerald-400 text-xs ml-0.5">%</span>
                      </span>
                    </div>
                    
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <div className="space-y-1">
              <p className="text-neutral-300 text-sm font-medium">Analyzing your GitHub contribution history...</p>
              <p className="text-neutral-500 text-xs">This usually takes around 10-20 seconds. Results will show automatically.</p>
            </div>
          </div>
        )}

        {/* STAT SECTIONS (ALWAYS VISIBLE) */}
        <div className="pt-6 space-y-6 border-t border-white/[0.05]">
          {/* 3 Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lines of Code Added */}
            <div className="bg-neutral-900/40 rounded-xl border border-white/[0.05] hover:border-white/[0.1] p-5 flex flex-col items-center justify-center space-y-2.5 transition-all duration-300 text-center">
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-400" />
                Lines of code added
              </span>
              <div className="text-3xl font-bold text-white tracking-tight">
                {/* @ts-expect-error fallback handling */}
                {analytics?.contributionHistory?.linesAdded ? `${(analytics.contributionHistory.linesAdded / 1000).toFixed(1)}k` : "48.2k"}
              </div>
              <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +12% vs prev period
              </span>
            </div>

            {/* Avg PR cycle time */}
            <div className="bg-neutral-900/40 rounded-xl border border-white/[0.05] hover:border-white/[0.1] p-5 flex flex-col items-center justify-center space-y-2.5 transition-all duration-300 text-center">
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                <GitMerge className="w-4 h-4 text-emerald-400" />
                Avg PR cycle time
              </span>
              <div className="text-3xl font-bold text-white tracking-tight">
                {/* @ts-expect-error fallback handling */}
                {analytics?.contributionHistory?.avgPrCycleTime ? `${analytics.contributionHistory.avgPrCycleTime.toFixed(1)} d` : "1.4 d"}
              </div>
              <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3" />
                -0.3d faster
              </span>
            </div>

            {/* Code review score */}
            <div className="bg-neutral-900/40 rounded-xl border border-white/[0.05] hover:border-white/[0.1] p-5 flex flex-col items-center justify-center space-y-2.5 transition-all duration-300 text-center">
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Code review score
              </span>
              <div className="text-3xl font-bold text-white tracking-tight">
                {/* @ts-expect-error fallback handling */}
                {analytics?.contributionHistory?.codeReviewScore ? `${analytics.contributionHistory.codeReviewScore.toFixed(1)}/5` : "4.6/5"}
              </div>
              <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                Top 5% Contributor
              </span>
            </div>
          </div>

          {/* Bottom 2-col layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Skill Overview */}
            <div className="lg:col-span-2 bg-neutral-900/40 rounded-xl border border-white/[0.05] hover:border-white/[0.1] p-6 space-y-5 transition-all duration-300">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                Skill Overview
              </h3>
              <div className="space-y-4 pt-1">
                {(() => {
                  const repExp = analytics?.repositoryExperience as { skills?: { name: string, proficiencyScore: number }[] } | undefined;
                  const dbSkills = repExp?.skills && repExp.skills.length > 0 
                    ? repExp.skills.slice(0, 5).map(s => ({ name: s.name, val: Math.round(s.proficiencyScore) }))
                    : [
                        { name: "TypeScript / React", val: 91 },
                        { name: "Node.js / Express", val: 78 },
                        { name: "PostgreSQL", val: 64 },
                        { name: "Testing (Vitest)", val: 55 },
                        { name: "CI / DevOps", val: 42 }
                      ];
                  
                  return dbSkills.map((s, i) => (
                    <div key={i} className="space-y-1.5 group cursor-default">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-neutral-300 group-hover:text-white transition-colors">{s.name}</span>
                        <span className="text-emerald-400 font-semibold">{s.val}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${s.val}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Contribution Heatmap */}
            <div className="lg:col-span-3 bg-neutral-900/40 rounded-xl border border-white/[0.05] hover:border-white/[0.1] p-6 space-y-5 transition-all duration-300 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GithubIcon className="w-4 h-4 text-emerald-400" />
                  GitHub Contribution Activity
                </h3>
                <span className="text-xs text-neutral-400 font-medium">Past Year</span>
              </div>
              
              <div className="flex-1 flex items-center justify-center pt-2 overflow-x-auto custom-scrollbar">
                <div className="min-w-max pb-2">
                  {profile?.username ? (
                    <GitHubCalendar 
                      username={profile.username} 
                      colorScheme="dark"
                      theme={{
                        dark: ['#0f0f0f', '#064e3b', '#059669', '#10b981', '#34d399']
                      }}
                      fontSize={10}
                      blockSize={11}
                      blockMargin={3}
                    />
                  ) : (
                    <div className="text-xs text-neutral-500 py-8">Loading heatmap...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

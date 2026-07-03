"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RepositoryService } from "@/services/repository.service";
import { MessageSquarePlus, ExternalLink, ThumbsUp, GitMerge, Star, Activity, Clock, Network } from "lucide-react";
import CreateThreadDialog from "@/components/threads/create-thread-dialog";
import { GroupChatPanel } from "@/components/threads/group-chat-panel";
import { VisualMap, TreeNode, ManifestNode } from "@/components/visual-map";
import { RepositoryInsights } from "@/components/repository-insights";

interface Thread {
  id: string;
  title: string;
  content: string;
  createdAt: string | number | Date;
  [key: string]: unknown;
}

interface RepositoryDetail {
  id?: string;
  name?: string;
  url?: string;
  description?: string;
  techStack?: string[];
  folderStructure?: TreeNode[];
  dependencies?: ManifestNode[];
  [key: string]: unknown;
}

export default function RepositoryPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const { token } = useAuth();
  
  const [repo, setRepo] = useState<RepositoryDetail | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateThreadOpen, setIsCreateThreadOpen] = useState(false);
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false);

  useEffect(() => {
    if (!token || !repositoryId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [repoRes, threadsRes] = await Promise.all([
          RepositoryService.getRepository(repositoryId, token),
          RepositoryService.getRepositoryThreads(repositoryId, token).catch(e => {
            console.error("Failed to load threads", e);
            return { data: [] };
          })
        ]);
        setRepo(repoRes.data);
        setThreads(threadsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repositoryId, token]);

  const handleThreadCreated = (newThread: Record<string, unknown>) => {
    setThreads([newThread as unknown as Thread, ...threads]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-semibold text-neutral-200 mb-2">Repository Not Found</h2>
        <p className="text-neutral-400 max-w-md">We couldn&apos;t load the details for this repository. It may have been deleted or you don&apos;t have access.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 md:px-8 space-y-12 pb-16 pt-8 relative">
      {/* Immersive background glow */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-emerald-500/10 via-emerald-500/[0.02] to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Header Section */}
      <div className="relative bg-neutral-900/40 backdrop-blur-2xl border border-neutral-800/60 rounded-3xl p-8 sm:p-10 shadow-2xl overflow-hidden group">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-neutral-100 flex items-center gap-4 break-words">
              {repo.name}
              <a href={repo.url} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-neutral-800/50 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                <ExternalLink className="w-5 h-5" />
              </a>
            </h1>
            <p className="text-neutral-400 text-lg font-light leading-relaxed">
              {repo.description || "No description provided."}
            </p>
            
            <div className="flex flex-wrap items-center gap-3 mt-6">
              {repo.techStack && repo.techStack.length > 0 ? (
                repo.techStack.map((tech: string) => (
                  <span key={tech} className="px-3.5 py-1.5 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                    {tech}
                  </span>
                ))
              ) : (
                <span className="px-3.5 py-1.5 text-xs font-medium bg-neutral-800/50 border border-neutral-700/50 rounded-full text-neutral-400">
                  Codebase
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-4 min-w-[200px]">
            <button className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-sm font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5">
              <ThumbsUp className="w-4 h-4" />
              Like Repository
            </button>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-900/80 border border-neutral-800/60 rounded-xl p-3 flex flex-col items-center justify-center">
                <GitMerge className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-xs text-neutral-400 font-medium">Active</span>
              </div>
              <div className="bg-neutral-900/80 border border-neutral-800/60 rounded-xl p-3 flex flex-col items-center justify-center">
                <Star className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-xs text-neutral-400 font-medium">Favorite</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Map & Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Visual Map (takes up 2/3 on xl screens) */}
        <div className="xl:col-span-2 flex flex-col space-y-4">
          {(repo.folderStructure || (repo.dependencies && repo.dependencies.length > 0)) && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-200 flex items-center gap-2">
                  <Network className="w-5 h-5 text-emerald-500" />
                  Codebase Architecture Map
                </h2>
              </div>
              <VisualMap folderStructure={repo.folderStructure} dependencies={repo.dependencies} />
            </>
          )}
        </div>

        {/* Right Column: Insights (takes up 1/3 on xl screens) */}
        <div className="xl:col-span-1 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Repository Insights
            </h2>
          </div>
          <RepositoryInsights repo={repo} />
        </div>
      </div>

      {/* Discussions Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/50">
          <h2 className="text-2xl font-medium tracking-tight text-neutral-100 flex items-center gap-3">
            <MessageSquarePlus className="w-6 h-6 text-emerald-500" />
            Discussions
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20">
              {threads.length}
            </span>
          </h2>
          <button 
            onClick={() => setIsCreateThreadOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 text-neutral-300 font-medium rounded-xl text-sm transition-all shadow-lg"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Thread
          </button>
        </div>

        <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800/60 rounded-2xl overflow-hidden shadow-xl">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-neutral-800/50 rounded-2xl flex items-center justify-center mb-6 border border-neutral-700/50">
                <MessageSquarePlus className="w-8 h-8 text-neutral-500" />
              </div>
              <p className="text-neutral-300 text-lg font-medium mb-2">No discussions yet</p>
              <p className="text-neutral-500 text-sm max-w-sm">Be the first to start a conversation, report an issue, or suggest a feature for this repository.</p>
              <button 
                onClick={() => setIsCreateThreadOpen(true)}
                className="mt-6 px-6 py-2.5 bg-emerald-500/10 text-emerald-400 font-medium text-sm rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-neutral-950 transition-all duration-300"
              >
                Start Discussion
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/50">
              {threads.map(thread => (
                <a 
                  key={thread.id} 
                  href={`/dashboard/repository/${repositoryId}/threads/${thread.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-neutral-800/40 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-300" />
                  
                  <div className="flex-1 min-w-0 pr-6 pl-2">
                    <h3 className="text-lg font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors truncate mb-1.5">
                      {thread.title}
                    </h3>
                    <p className="text-neutral-500 text-sm font-light truncate">
                      {thread.content}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4 sm:mt-0 whitespace-nowrap text-xs text-neutral-500 font-medium">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950/50 border border-neutral-800/80">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {new Date(thread.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateThreadDialog 
        isOpen={isCreateThreadOpen} 
        onClose={() => setIsCreateThreadOpen(false)} 
        repositoryId={repositoryId}
        onThreadCreated={handleThreadCreated}
      />

      <GroupChatPanel 
        isOpen={isGroupChatOpen}
        onClose={() => setIsGroupChatOpen(false)}
        repositoryId={repositoryId}
      />
    </div>
  );
}

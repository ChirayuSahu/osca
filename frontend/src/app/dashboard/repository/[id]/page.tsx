"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RepositoryService } from "@/services/repository.service";
import { MessageSquarePlus, ExternalLink, ThumbsUp } from "lucide-react";
import CreateThreadDialog from "@/components/threads/create-thread-dialog";

export default function RepositoryPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const { token } = useAuth();
  
  const [repo, setRepo] = useState<any>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateThreadOpen, setIsCreateThreadOpen] = useState(false);

  useEffect(() => {
    if (!token || !repositoryId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [repoRes, threadsRes] = await Promise.all([
          RepositoryService.getRepository(repositoryId, token),
          RepositoryService.getRepositoryThreads(repositoryId, token)
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

  const handleThreadCreated = (newThread: any) => {
    setThreads([newThread, ...threads]);
  };

  if (loading) return <div className="p-12 text-center text-neutral-400 animate-pulse">Loading Repository...</div>;
  if (!repo) return <div className="p-12 text-center text-red-400">Failed to load repository.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="relative pt-12 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white flex items-center gap-4">
              {repo.name}
              <a href={repo.url} target="_blank" rel="noreferrer" className="text-neutral-600 hover:text-emerald-400 transition-colors">
                <ExternalLink className="w-6 h-6" />
              </a>
            </h1>
            <p className="text-neutral-400 text-base md:text-lg max-w-3xl font-light leading-relaxed">
              {repo.description || "No description provided."}
            </p>
            
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {repo.techStack?.map((tech: string) => (
                <span key={tech} className="px-3 py-1 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full text-sm font-semibold transition-all shadow-lg shadow-white/10 active:scale-95">
            <ThumbsUp className="w-4 h-4" />
            Like Repository
          </button>
        </div>
      </div>

      <div className="space-y-6 pt-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <h2 className="text-xl font-medium text-white flex items-center gap-3">
            Discussions
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-xs text-neutral-400">{threads.length}</span>
          </h2>
          <button 
            onClick={() => setIsCreateThreadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-full text-sm transition-all active:scale-95 shadow-md shadow-emerald-500/20"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Thread
          </button>
        </div>

        <div className="bg-neutral-950 border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
          {threads.length === 0 ? (
            <div className="text-center py-20 bg-neutral-950/50">
              <MessageSquarePlus className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm">No discussions yet. Be the first to start one!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {threads.map(thread => (
                <a 
                  key={thread.id} 
                  href={`/dashboard/repository/${repositoryId}/threads/${thread.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="text-base font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors truncate mb-1">
                      {thread.title}
                    </h3>
                    <p className="text-neutral-500 text-sm font-light truncate">
                      {thread.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 sm:mt-0 whitespace-nowrap text-xs text-neutral-500 font-medium">
                    <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
                      {new Date(thread.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
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
    </div>
  );
}

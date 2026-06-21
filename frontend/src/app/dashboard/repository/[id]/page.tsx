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
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Repo Header */}
      <div className="p-8 bg-neutral-950 border border-white/[0.04] rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-medium text-white mb-2 flex items-center gap-3">
              {repo.name}
              <a href={repo.url} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-white transition-colors">
                <ExternalLink className="w-5 h-5" />
              </a>
            </h1>
            <p className="text-neutral-400 text-sm max-w-2xl leading-relaxed">{repo.description}</p>
            
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {repo.techStack?.map((tech: string) => (
                <span key={tech} className="px-2.5 py-1 text-xs font-medium bg-white/[0.03] border border-white/[0.04] rounded-lg text-emerald-400">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/[0.04] rounded-xl text-sm font-medium text-white transition-all">
            <ThumbsUp className="w-4 h-4" />
            Like Repository
          </button>
        </div>
      </div>

      {/* Threads Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-white">Discussions</h2>
          <button 
            onClick={() => setIsCreateThreadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl text-sm transition-all"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Thread
          </button>
        </div>

        <div className="grid gap-4">
          {threads.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/[0.04] rounded-2xl bg-neutral-950/20">
              <p className="text-neutral-400 text-sm">No discussions yet. Be the first to start one!</p>
            </div>
          ) : (
            threads.map(thread => (
              <a 
                key={thread.id} 
                href={`/dashboard/repository/${repositoryId}/threads/${thread.id}`}
                className="block p-5 bg-neutral-950 border border-white/[0.04] hover:border-emerald-500/20 rounded-2xl transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-neutral-200 group-hover:text-white transition-colors">{thread.title}</h3>
                  <span className="text-xs text-neutral-500">{new Date(thread.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-neutral-400 text-sm font-light line-clamp-2">{thread.content}</p>
              </a>
            ))
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

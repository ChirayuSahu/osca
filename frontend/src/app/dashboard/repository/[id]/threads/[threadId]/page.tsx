"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ThreadService } from "@/services/thread.service";
import { ArrowLeft } from "lucide-react";
import CommentSection from "@/components/comments/comment-section";

export default function ThreadPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const threadId = params.threadId as string;
  const { token } = useAuth();
  
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !threadId) return;

    const loadThread = async () => {
      try {
        const res = await ThreadService.getThread(threadId, token);
        setThread(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadThread();
  }, [threadId, token]);

  if (loading) return <div className="p-12 text-center text-neutral-400 animate-pulse">Loading Thread...</div>;
  if (!thread) return <div className="p-12 text-center text-red-400">Failed to load thread.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <a 
        href={`/dashboard/repository/${repositoryId}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Repository
      </a>

      <div className="p-8 bg-neutral-950 border border-white/[0.04] rounded-3xl relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-2xl font-medium text-white mb-4">{thread.title}</h1>
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/[0.04]">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
              {thread.author?.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200">{thread.author?.name || "Unknown User"}</p>
              <p className="text-xs text-neutral-500">{new Date(thread.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{thread.content}</p>
        </div>
      </div>

      <CommentSection threadId={threadId} />
    </div>
  );
}

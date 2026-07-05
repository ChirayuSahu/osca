"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ThreadService } from "@/services/thread.service";
import { ArrowLeft } from "lucide-react";
import CommentSection from "@/components/comments/comment-section";

interface ThreadDetail {
  id?: string;
  title?: string;
  content?: string;
  createdAt: string | number | Date;
  author?: { name?: string };
  [key: string]: unknown;
}

export default function ThreadPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const threadId = params.threadId as string;
  const { token } = useAuth();
  
  const [thread, setThread] = useState<ThreadDetail | null>(null);
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
    <div className="max-w-7xl mx-auto space-y-12 pb-16">
      <div className="pt-8">
        <a 
          href={`/dashboard/repository/${repositoryId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-emerald-400 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Repository
        </a>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
          <h1 className="text-3xl md:text-4xl font-light text-white tracking-tight leading-tight mb-8">
            {thread.title}
          </h1>

          <div className="flex items-center gap-4 pb-8 border-b border-white/[0.06]">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-semibold shadow-inner">
              {thread.author?.name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-medium text-neutral-200">{thread.author?.name || "Unknown User"}</span>
              <span className="text-sm text-neutral-500 font-light">
                {new Date(thread.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(thread.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="py-8 text-neutral-300 text-lg leading-relaxed font-light whitespace-pre-wrap">
            {thread.content}
          </div>
        </div>
      </div>

      <CommentSection threadId={threadId} />
    </div>
  );
}

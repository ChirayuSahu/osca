"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ThreadService } from "@/services/thread.service";
import { RepositoryService } from "@/services/repository.service";
import { ArrowLeft, MessageSquare, Share2, MoreHorizontal } from "lucide-react";

function getRelativeTime(dateString: string | Date | number) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
import CommentSection from "@/components/comments/comment-section";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface ThreadDetail {
  id?: string | number;
  number?: string | number;
  title?: string;
  body?: string;
  created_at: string | number | Date;
  updated_at?: string | number | Date;
  user?: { login: string; avatar_url: string };
  state?: string;
  labels?: { name: string; color: string }[];
  reactions?: { '+1': number };
  comments?: number;
  [key: string]: unknown;
}

export default function ThreadPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const threadId = params.threadId as string;
  const { token } = useAuth();
  
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [repoDetails, setRepoDetails] = useState<{owner: string, name: string} | null>(null);
  const [relatedThreads, setRelatedThreads] = useState<ThreadDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token || !repositoryId || !threadId) return;

    const loadData = async () => {
      try {
        const repoRes = await RepositoryService.getRepository(repositoryId, token);
        const owner = repoRes.data.owner;
        const repo = repoRes.data.name;
        setRepoDetails({ owner, name: repo });

        const threadRes = await ThreadService.getThread(owner, repo, threadId, token);
        setThread(threadRes.data);

        // Fetch related threads (using recent threads for now)
        const allThreadsRes = await ThreadService.listThreads(owner, repo, token, 1);
        const otherThreads = (allThreadsRes.data || [])
          .filter((t: { number: string | number }) => String(t.number) !== String(threadId))
          .slice(0, 3); // Take top 3
        setRelatedThreads(otherThreads);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repositoryId, threadId, token]);

  if (loading) return <div className="p-12 text-center text-neutral-400 animate-pulse">Loading Thread...</div>;
  if (!thread || !repoDetails) return <div className="p-12 text-center text-red-400">Failed to load thread.</div>;

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-16 pt-8">
      <a 
        href={`/dashboard/repository/${repositoryId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-emerald-400 transition-colors mb-4 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        {repoDetails.name} / Discussions / {thread.title}
      </a>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none -z-10" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                {thread.labels?.map((label: { name: string; color: string }) => (
                  <span 
                    key={label.name} 
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-full"
                    style={{
                      backgroundColor: `#${label.color}1A`,
                      color: `#${label.color}`
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-neutral-400">
                <div className="flex items-center gap-2">
                  Watching 
                  <div className="w-8 h-4 bg-emerald-500 rounded-full relative shadow-inner cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <MoreHorizontal className="w-5 h-5 text-neutral-500 cursor-pointer hover:text-white transition-colors" />
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug mb-3">
              {thread.title}
            </h1>

            <div className="flex items-center gap-2 mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thread.user?.avatar_url || "https://github.com/identicons/user.png"} alt={thread.user?.login} className="w-5 h-5 rounded-full border border-white/[0.1]" />
              <div className="text-xs font-medium text-neutral-500 flex items-center gap-2">
                <span>Posted {getRelativeTime(thread.created_at)} by <span className="text-neutral-300 font-semibold">{thread.user?.login}</span></span>
                {thread.state === 'closed' && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-emerald-400 flex items-center gap-1">✓ Answered</span>
                  </>
                )}
              </div>
            </div>

            <div className="prose prose-invert prose-emerald max-w-none text-neutral-300 font-light text-[15px] leading-relaxed pb-8 border-b border-white/[0.06]">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  input: ({node, ...props}) => <input {...props} checked={props.checked ?? false} readOnly />
                }}
              >
                {thread.body || ''}
              </ReactMarkdown>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button 
                onClick={async () => {
                  try {
                    setIsUpvoted(!isUpvoted);
                    await RepositoryService.toggleLike(repositoryId, token!);
                  } catch (err) {
                    setIsUpvoted(isUpvoted);
                    console.error("Failed to upvote", err);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isUpvoted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20'}`}
              >
                ↑ {(thread.reactions?.['+1'] || 0) + (isUpvoted ? 1 : 0)}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] rounded-full text-sm font-medium transition-colors border border-white/[0.06]">
                <MessageSquare className="w-4 h-4" /> {thread.comments || 0} replies
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] rounded-full text-sm font-medium transition-colors border border-white/[0.06]"
              >
                <Share2 className="w-4 h-4" /> {copied ? 'Copied!' : 'Share'}
              </button>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl p-6">
            <CommentSection owner={repoDetails.owner} repo={repoDetails.name} threadId={threadId} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-xs font-semibold tracking-wider text-neutral-500 mb-6 uppercase flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Participants
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-400">{thread.user?.login}</span>
                <span className="text-xs text-neutral-500">author</span>
              </div>
              {/* Other participants will be dynamically handled in a real app, but for now we only know the author from thread context */}
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-xs font-semibold tracking-wider text-neutral-500 mb-6 uppercase flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Thread Info
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-white/[0.04] pb-3">
                <span className="text-neutral-500">Status</span>
                <span className={thread.state === 'closed' ? "text-emerald-400" : "text-emerald-400"}>
                  {thread.state === 'closed' ? 'Answered' : 'Needs Discussion'}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-3">
                <span className="text-neutral-500">Created</span>
                <span className="text-neutral-300">
                  {new Date(thread.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-3">
                <span className="text-neutral-500">Last reply</span>
                <span className="text-neutral-300">
                  {thread.updated_at ? new Date(thread.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-neutral-500">Upvotes</span>
                <span className="text-neutral-300 font-medium">{thread.reactions?.['+1'] || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-xs font-semibold tracking-wider text-neutral-500 mb-6 uppercase flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
              Related Threads
            </h3>
            <div className="space-y-4">
              {relatedThreads.length > 0 ? (
                relatedThreads.map(rt => (
                  <a 
                    key={rt.number} 
                    href={`/dashboard/repository/${repositoryId}/threads/${rt.number}`} 
                    className="block text-sm font-medium text-neutral-400 hover:text-emerald-400 transition-colors truncate"
                    title={rt.title}
                  >
                    {rt.title}
                  </a>
                ))
              ) : (
                <div className="text-sm text-neutral-600 italic">No related threads found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

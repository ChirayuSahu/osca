"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { CommentService } from "@/services/comment.service";
import { Loader2, MessageSquare, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Comment {
  id: string | number;
  body: string;
  created_at: string | number | Date;
  user?: { login: string; avatar_url: string };
  reactions?: { '+1': number };
}

export default function CommentSection({ owner, repo, threadId }: { owner: string; repo: string; threadId: string }) {
  const { token, user: currentUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !owner || !repo || !threadId) return;
    
    const loadComments = async () => {
      try {
        const res = await CommentService.getComments(owner, repo, threadId, token);
        setComments(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [owner, repo, threadId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !token) return;

    try {
      setSubmitting(true);
      const res = await CommentService.createComment(owner, repo, threadId, { body: newComment }, token);
      setComments([...comments, res.data]);
      setNewComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-medium text-white">{comments.length} Replies</h2>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-400 bg-white/[0.04] hover:bg-white/[0.08] rounded-md transition-colors border border-white/[0.06]">
          Top <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-0">
        {loading ? (
          <div className="text-center text-neutral-500 text-sm animate-pulse py-8">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-neutral-500 text-sm font-light italic text-center py-12">No replies yet. Start the conversation!</div>
        ) : (
          comments.map((comment, index) => (
            <div key={comment.id} className="relative pl-6 pb-8 group">
              {/* Vertical Thread Line */}
              {index !== comments.length - 1 && (
                <div className="absolute left-[11px] top-10 bottom-0 w-px bg-white/[0.06] group-hover:bg-white/[0.1] transition-colors" />
              )}
              
              <div className="absolute left-0 top-1 w-6 h-6 rounded-full overflow-hidden border border-white/[0.1] bg-neutral-800">
                <img src={comment.user?.avatar_url || "https://github.com/identicons/user.png"} alt={comment.user?.login} className="w-full h-full object-cover" />
              </div>

              <div className="ml-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-neutral-200">{comment.user?.login || "User"}</span>
                  <span className="text-xs text-neutral-500">•</span>
                  <span className="text-xs font-medium text-neutral-500">
                    {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                <div className="prose prose-invert prose-emerald max-w-none text-neutral-300 font-light text-[14px] leading-relaxed mb-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.body}</ReactMarkdown>
                </div>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-emerald-400 transition-colors">
                    ↑ {comment.reactions?.['+1'] || 0}
                  </button>
                  <button className="text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 bg-[#0A0A0A] border border-white/[0.06] rounded-xl p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 text-sm text-emerald-400 mb-4 ml-1">
            <span className="font-medium text-white">Add a reply</span>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden border border-white/[0.1] bg-neutral-800">
                <img src={currentUser?.avatarUrl || "https://github.com/identicons/user.png"} alt="You" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your reply"
                rows={4}
                className="w-full bg-[#141414] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40 transition-all resize-none shadow-inner"
                required
              />
              
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 tracking-wide">Markdown supported</span>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    className="px-4 py-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                    onClick={() => setNewComment("")}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting || !newComment.trim()}
                    className="flex items-center gap-2 px-5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-full text-xs transition-all disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-3 h-3 animate-spin text-black" />}
                    Post Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

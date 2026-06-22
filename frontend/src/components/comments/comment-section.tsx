"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { CommentService } from "@/services/comment.service";
import { Loader2, MessageSquare } from "lucide-react";

export default function CommentSection({ threadId }: { threadId: string }) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    
    const loadComments = async () => {
      try {
        const res = await CommentService.getComments(threadId, token);
        setComments(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [threadId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !token) return;

    try {
      setSubmitting(true);
      const res = await CommentService.createComment({ threadId, content: newComment }, token);
      setComments([...comments, res.data]);
      setNewComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 pt-4">
      <div className="flex items-center gap-3 border-b border-white/[0.06] pb-5">
        <MessageSquare className="w-5 h-5 text-emerald-500" />
        <h2 className="text-xl font-medium text-white">Comments <span className="text-neutral-500 font-light">({comments.length})</span></h2>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="text-center text-neutral-500 text-sm animate-pulse py-8">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-neutral-500 text-base font-light italic text-center py-12 bg-white/[0.01] rounded-2xl border border-white/[0.03]">No comments yet. Start the conversation!</div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-5 group">
              <div className="w-12 h-12 rounded-full shrink-0 bg-neutral-900 border border-white/[0.06] flex items-center justify-center text-neutral-300 text-base font-medium shadow-sm">
                {comment.author?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1">
                <div className="bg-neutral-950/40 border border-white/[0.04] group-hover:border-white/[0.08] transition-all rounded-2xl rounded-tl-sm p-6 shadow-xl shadow-black/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-medium text-neutral-200">{comment.author?.name || "User"}</span>
                    <span className="text-xs font-medium text-neutral-500 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/[0.05]">
                      {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(comment.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-base text-neutral-300 font-light leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-12 pt-8 border-t border-white/[0.06]">
        <div className="flex gap-5">
          <div className="w-12 h-12 rounded-full shrink-0 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-base font-bold shadow-inner">
            {user?.name?.charAt(0) || "Y"}
          </div>
          <div className="flex-1 space-y-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a meaningful comment..."
              rows={4}
              className="w-full bg-neutral-950 border border-white/[0.06] rounded-2xl rounded-tl-sm px-5 py-4 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40 transition-all resize-none text-base font-light shadow-inner"
              required
            />
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={submitting || !newComment.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold rounded-full text-sm transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-white/10"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                Post Comment
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

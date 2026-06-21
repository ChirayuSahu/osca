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
    <div className="space-y-8">
      <div className="flex items-center gap-3 border-b border-white/[0.04] pb-4">
        <MessageSquare className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-medium text-white">Comments ({comments.length})</h2>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center text-neutral-500 text-sm animate-pulse">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-neutral-500 text-sm italic">No comments yet.</div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-4 group">
              <div className="w-10 h-10 rounded-full shrink-0 bg-neutral-800 border border-white/[0.04] flex items-center justify-center text-neutral-400 text-sm font-medium">
                {comment.author?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 bg-neutral-950/50 border border-white/[0.02] group-hover:border-white/[0.06] transition-colors rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-300">{comment.author?.name || "User"}</span>
                  <span className="text-xs text-neutral-600">{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 pt-6 border-t border-white/[0.04]">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full shrink-0 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-sm font-bold">
            {user?.name?.charAt(0) || "Y"}
          </div>
          <div className="flex-1 space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full bg-neutral-900 border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none text-sm"
              required
            />
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={submitting || !newComment.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Comment
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

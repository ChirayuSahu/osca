"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { CommentService } from "@/services/comment.service";
import { isGithubTokenError } from "@/lib/api";
import { ArrowUp, ChevronDown, MessageSquare, Trash2 } from "lucide-react";
import { Markdown } from "@/components/markdown-lazy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dither } from "@/components/ui/dither";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/components/repo-ui";
import { cn } from "@/lib/utils";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [upvotedComments, setUpvotedComments] = useState<Set<string | number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<string | number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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
      toast.error(isGithubTokenError(err) ? "Reconnect GitHub to comment." : "Couldn't post your comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (!token) return;
    try {
      setDeleting(true);
      await CommentService.deleteComment(owner, repo, commentId, token);
      setComments(comments.filter(c => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (err) {
      console.error(err);
      toast.error(isGithubTokenError(err) ? "Reconnect GitHub to delete comments." : "Couldn't delete the comment");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      {/* Header row: title, count, collapse */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-base font-semibold">Comments</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{comments.length}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Show comments" : "Hide comments"}
        >
          <ChevronDown className={cn("transition-transform", isCollapsed && "-rotate-90")} />
        </Button>
      </div>

      {!isCollapsed && (
        loading ? (
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ) : comments.length === 0 ? (
          <div className="relative isolate flex items-center justify-center px-6 py-10 text-center">
            <Dither
              cols={60}
              rows={18}
              cell={4}
              direction="radial"
              peak={0.6}
              className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-500/[0.12]"
            />
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {comments.map((comment) => {
              const upvoted = upvotedComments.has(comment.id);
              return (
                <li key={comment.id} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{comment.user?.login || "User"}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-pressed={upvoted}
                        className={cn("h-7 px-2 text-xs", upvoted ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}
                        onClick={() => {
                          setUpvotedComments(prev => {
                            const next = new Set(prev);
                            if (next.has(comment.id)) next.delete(comment.id);
                            else next.add(comment.id);
                            return next;
                          });
                        }}
                      >
                        <ArrowUp className="size-3.5" />
                        <span className="tabular-nums">{(comment.reactions?.['+1'] || 0) + (upvoted ? 1 : 0)}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => {
                          setNewComment(`@${comment.user?.login || 'User'} `);
                          textareaRef.current?.focus();
                        }}
                      >
                        <MessageSquare className="size-3.5" /> Reply
                      </Button>
                      {currentUser?.username === comment.user?.login && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 text-muted-foreground"
                          onClick={() => setPendingDelete(comment.id)}
                          aria-label="Delete comment"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <Markdown>{comment.body}</Markdown>
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* Composer */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border bg-background p-4">
        <Label htmlFor="new-comment" className="sr-only">Add a comment</Label>
        <Textarea
          id="new-comment"
          ref={textareaRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment"
          rows={4}
          className="min-h-24 resize-none rounded-md"
          required
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Markdown supported</span>
          <div className="flex gap-2">
            {newComment && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewComment("")}>
                Clear
              </Button>
            )}
            <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
              {submitting && <Spinner className="text-current" />}
              Comment
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>This removes your comment from the GitHub thread. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" disabled={deleting}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => pendingDelete !== null && handleDeleteComment(pendingDelete)}
            >
              {deleting && <Spinner className="text-current" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

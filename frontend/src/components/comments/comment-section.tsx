"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { CommentService } from "@/services/comment.service";
import { isGithubTokenError } from "@/lib/api";
import { ChevronDown, MessageSquare, Reply, Send, Trash2 } from "lucide-react";
import { GithubBody } from "@/components/markdown-lazy";
import { Reactions, type ReactionRollup } from "@/components/reactions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/components/repo-ui";
import { cn } from "@/lib/utils";

interface Comment {
  id: string | number;
  body: string;
  body_html?: string;
  created_at: string | number | Date;
  user?: { login: string; avatar_url: string };
  reactions?: ReactionRollup;
  viewer_reactions?: string[];
}

/** Up to two letters from a GitHub login, e.g. "arjun_devs" -> "AD", "octocat" -> "OC" */
function initials(login?: string | null) {
  if (!login) return "?";
  const parts = login.split(/[-_.\s]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : login.slice(0, 2);
  return letters.toUpperCase();
}

/** Round avatar: the GitHub picture when there is one, initials on an emerald tint otherwise */
export function UserAvatar({
  login,
  avatarUrl,
  className,
}: {
  login?: string | null;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8 text-[11px]", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback className="bg-tint-emerald-500 text-[length:inherit] font-semibold text-emerald-700 dark:text-emerald-300">
        {initials(login)}
      </AvatarFallback>
    </Avatar>
  );
}

export default function CommentSection({ owner, repo, threadId }: { owner: string; repo: string; threadId: string }) {
  const { token, user: currentUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
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
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 sm:px-6">
        <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h2 className="text-sm font-semibold">Comments</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{comments.length}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mr-2 ml-auto text-muted-foreground"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Show comments" : "Hide comments"}
        >
          <ChevronDown className={cn("transition-transform", isCollapsed && "-rotate-90")} />
        </Button>
      </div>

      {!isCollapsed && (
        loading ? (
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex items-center justify-center px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          </div>
        ) : (
          // Timeline: a thin line runs from each avatar down to the next one
          <ul className="flex flex-col p-5 sm:p-6">
            {comments.map((comment) => {
              const login = comment.user?.login;
              return (
                <li key={comment.id} className="group/comment flex gap-3">
                  <div className="flex flex-col items-center">
                    <UserAvatar login={login} avatarUrl={comment.user?.avatar_url} />
                    <span className="mt-2 w-px flex-1 bg-border group-last/comment:hidden" aria-hidden />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 pb-6 group-last/comment:pb-0">
                    <div className="flex min-h-8 min-w-0 items-center gap-2 text-sm">
                      <span className="truncate font-medium">{login || "User"}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                      <div className="-mr-2 ml-auto flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                          onClick={() => {
                            setNewComment(`@${login || 'User'} `);
                            textareaRef.current?.focus();
                          }}
                        >
                          <Reply className="size-3.5" /> Reply
                        </Button>
                        {currentUser?.username === login && (
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

                    <GithubBody html={comment.body_html} markdown={comment.body} />
                    {token && (
                      <Reactions
                        className="pt-1"
                        reactions={comment.reactions}
                        viewerReactions={comment.viewer_reactions}
                        onToggle={(content) => CommentService.toggleReaction(owner, repo, comment.id, content, token)}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* Composer */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border p-5 sm:p-6">
        <Label htmlFor="new-comment" className="text-sm font-medium">Add a comment</Label>
        <div className="flex gap-3">
          <UserAvatar
            login={currentUser?.username}
            avatarUrl={currentUser?.avatarUrl}
            className="hidden sm:flex"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Textarea
              id="new-comment"
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment"
              rows={4}
              className="min-h-28 resize-none rounded-md bg-background dark:bg-background"
              required
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Markdown supported</span>
              <div className="flex gap-2">
                {newComment && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewComment("")}>
                    Clear
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                  {submitting ? <Spinner className="text-current" /> : <Send />}
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <DialogContent>
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

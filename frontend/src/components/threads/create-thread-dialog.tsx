"use client";

import React, { useState } from "react";
import { ThreadService } from "@/services/thread.service";
import { useAuth } from "@/context/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { GithubIcon } from "@/components/icons";
import { FileText } from "lucide-react";

interface CreateThreadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  owner?: string;
  repo?: string;
  onThreadCreated: (thread: Record<string, unknown>) => void;
}

export default function CreateThreadDialog({ isOpen, onClose, owner, repo, onThreadCreated }: CreateThreadDialogProps) {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !owner || !repo) return;

    try {
      setLoading(true);
      setError(null);
      const res = await ThreadService.createThread({ owner, repo, title, body: content }, token);
      onThreadCreated(res.data);
      setTitle("");
      setContent("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create thread");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden rounded-md p-0 sm:max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-0 border-b border-border px-5 py-3 text-left">
            <DialogTitle className="flex items-center gap-2 text-sm font-medium">
              <GithubIcon className="size-4 text-muted-foreground" />
              {owner && repo ? (
                <>
                  <span className="font-normal text-muted-foreground">{owner} / {repo}</span>
                  <span className="text-muted-foreground/50">·</span>
                </>
              ) : null}
              New issue
            </DialogTitle>
            <DialogDescription className="sr-only">Opens a new issue on GitHub.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col px-5 pt-4">
            <Label htmlFor="thread-title" className="sr-only">Title</Label>
            <input
              id="thread-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              autoFocus
              required
              className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground/60"
            />
            <div className="my-3 h-px bg-border" />
            <Label htmlFor="thread-body" className="sr-only">Description</Label>
            <textarea
              id="thread-body"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the bug or idea. What happened, what you expected, steps to reproduce…"
              rows={7}
              required
              className="min-h-40 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60"
            />
            {error && <p role="alert" className="pb-1 text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-3 flex-row items-center gap-2 border-t border-border px-5 py-3 sm:justify-between">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <FileText className="size-3.5" /> Markdown supported
            </span>
            <div className="ml-auto flex items-center gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm" disabled={loading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={loading || !title.trim() || !content.trim()}>
                {loading && <Spinner className="text-current" />}
                Create issue
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

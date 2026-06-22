"use client";

import React, { useState } from "react";
import { ThreadService } from "@/services/thread.service";
import { useAuth } from "@/context/auth-context";
import { Loader2, MessageSquarePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

interface CreateThreadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId: string;
  onThreadCreated: (thread: any) => void;
}

export default function CreateThreadDialog({ isOpen, onClose, repositoryId, onThreadCreated }: CreateThreadDialogProps) {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      const res = await ThreadService.createThread({ repositoryId, title, content }, token);
      onThreadCreated(res.data);
      setTitle("");
      setContent("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create thread");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-neutral-950 border border-neutral-800 shadow-2xl text-neutral-100 rounded-2xl p-6">
        <DialogHeader className="space-y-3 pb-4 border-b border-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <MessageSquarePlus className="w-4 h-4 text-emerald-400" />
            </div>
            <DialogTitle className="text-lg font-medium tracking-tight text-neutral-100">
              Start a Discussion
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-4 space-y-5">
          {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              className="w-full bg-neutral-900 border border-neutral-800/80 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Content</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide more details..."
              rows={5}
              className="w-full bg-neutral-900 border border-neutral-800/80 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              required
            />
          </div>

          <DialogFooter className="sm:justify-end gap-3 pt-4 border-t border-neutral-800/50">
            <DialogClose asChild>
              <button 
                type="button" 
                className="px-4 py-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </DialogClose>
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Post Thread
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

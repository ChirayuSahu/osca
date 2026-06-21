"use client";

import React, { useState } from "react";
import { ThreadService } from "@/services/thread.service";
import { useAuth } from "@/context/auth-context";
import { X, Loader2 } from "lucide-react";

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-white/[0.08] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.04]">
          <h2 className="text-xl font-medium text-white">Start a Discussion</h2>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white transition-colors rounded-full hover:bg-white/[0.04]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl">{error}</div>}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              className="w-full bg-neutral-900 border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
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
              className="w-full bg-neutral-900 border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Post Thread
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

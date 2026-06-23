"use client";

import React, { useState } from "react";
import { X, Send, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GroupChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId: string;
}

export function GroupChatPanel({ isOpen, onClose, repositoryId }: GroupChatPanelProps) {
  const [message, setMessage] = useState("");

  const MOCK_MESSAGES: any[] = [];

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#0A0A0A] border-l border-white/[0.05] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.05] bg-[#0A0A0A] z-10">
          <div>
            <h2 className="text-lg font-medium text-white">Repository Chat</h2>
            <p className="text-xs text-neutral-400 font-light flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 14 Online
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/[0.05] text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col">
          {MOCK_MESSAGES.length > 0 ? (
            <div className="space-y-6">
              {MOCK_MESSAGES.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.isMe ? "flex-row-reverse" : ""}`}>
                  <Avatar className="w-8 h-8 border border-white/10 shrink-0">
                    <AvatarFallback className="bg-neutral-800 text-xs">
                      {msg.user.substring(0,2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-neutral-300">{msg.user}</span>
                      <span className="text-[10px] text-neutral-500">{msg.time}</span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm font-light leading-relaxed ${
                      msg.isMe 
                        ? "bg-emerald-500 text-black rounded-tr-sm" 
                        : "bg-white/[0.05] text-neutral-200 border border-white/[0.05] rounded-tl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1"></div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/[0.05] bg-[#0A0A0A]">
          <form 
            onSubmit={(e) => { e.preventDefault(); setMessage(""); }}
            className="relative flex items-center"
          >
            <input 
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message the community..."
              className="w-full bg-neutral-900 border border-white/[0.05] rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
            />
            <button 
              type="submit"
              disabled={!message.trim()}
              className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-black rounded-full transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

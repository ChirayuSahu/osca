"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Code2, Bot, User as UserIcon, ExternalLink, Check, Copy, Sparkles, PlusCircle, ArrowDown, Compass } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

const SUGGESTED_PROMPTS = [
  "I'm a React dev looking to learn Rust. Where should I start?",
  "Find beginner-friendly Python repos with good mentorship",
  "What are trending Go projects that need contributors?",
  "Suggest ML repos suited for someone who knows PyTorch",
];

// Custom Github SVG Icon
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Render a beautiful card for GitHub links
const renderLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const { href, children } = props;
  if (href?.startsWith('https://github.com/')) {
    const repoName = String(children);
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center justify-between p-4 my-4 rounded-2xl bg-neutral-900/40 border border-white/[0.08] hover:border-emerald-500/30 hover:bg-neutral-900/80 transition-all duration-300 overflow-hidden no-underline w-full max-w-md shadow-lg"
      >
        {/* Subtle gradient hover background */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-300 shadow-inner">
            <GithubIcon className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors truncate max-w-[200px]">
              {repoName}
            </span>
            <span className="text-xs text-neutral-500 group-hover:text-neutral-400">
              View Repository
            </span>
          </div>
        </div>

        <div className="relative z-10 w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:bg-emerald-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-300">
          <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-950 transition-colors" />
        </div>
      </a>
    );
  }
  return <a {...props} className="text-emerald-400 hover:text-emerald-300 hover:underline underline-offset-4 transition-colors" />;
};

// Renders assistant content with a soft, natural "materialising" typewriter reveal.
// The backend responds with the full message at once, so this simulates a completion
// animation client-side rather than a real token stream.
function StreamingAssistantContent({
  content,
  streaming,
  onDone,
}: {
  content: string;
  streaming: boolean;
  onDone?: (content: string) => void;
}) {
  const [revealed, setRevealed] = useState(streaming ? 0 : content.length);

  useEffect(() => {
    if (!streaming) {
      setRevealed(content.length);
      return;
    }

    setRevealed(0);
    let frame = 0;
    const totalTicks = 42;
    const chunk = Math.max(1, Math.ceil(content.length / totalTicks));
    
    const interval = setInterval(() => {
      frame += 1;
      setRevealed((prev) => Math.min(content.length, prev + chunk));
      if (frame > totalTicks + 5) clearInterval(interval);
    }, 16);

    return () => clearInterval(interval);
  }, [content, streaming]);

  useEffect(() => {
    if (streaming && revealed >= content.length) {
      const timeout = setTimeout(() => onDone?.(content), 120);
      return () => clearTimeout(timeout);
    }
  }, [revealed, content.length, streaming, onDone, content]);

  const visibleText = content.slice(0, revealed);
  const isTyping = streaming && revealed < content.length;

  return (
    <div className="prose prose-invert prose-emerald max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-950/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: renderLink }}>
        {visibleText}
      </ReactMarkdown>
      {isTyping && (
        <span className="inline-block w-[7px] h-[1.05em] align-text-bottom bg-emerald-400/80 rounded-[1px] ml-0.5 animate-caret" />
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — silently ignore.
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-neutral-500 hover:text-emerald-300 hover:bg-white/[0.05] transition-colors duration-200 opacity-0 group-hover/msg:opacity-100 focus:opacity-100"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ChatConsole() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingMessage, isLoading]);

  // Auto-grow the textarea up to a sensible cap, then let it scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [searchQuery]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 240);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setStreamingMessage(null);
    setIsLoading(false);
    setSearchQuery("");
  }, []);

  const submitPrompt = useCallback((prompt: string) => {
    setSearchQuery(prompt);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading || streamingMessage !== null) return;

    const userMessage: Message = { role: 'user', content: searchQuery.trim() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setSearchQuery("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/recommendations/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI response');
      }

      const data = await response.json();
      const replyContent: string = data.data?.message?.content ?? '';
      setIsLoading(false);
      if (replyContent) {
        setStreamingMessage(replyContent);
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error while trying to fetch recommendations.' }]);
    }
  };

  const handleStreamDone = useCallback((content: string) => {
    setMessages((prev) => {
      // Prevent duplicates in case of race conditions
      if (prev.length > 0 && prev[prev.length - 1].content === content) {
        return prev;
      }
      return [...prev, { role: 'assistant', content }];
    });
    setStreamingMessage(null);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearchSubmit(e as unknown as React.FormEvent);
    }
  };

  const isBusy = isLoading || streamingMessage !== null;

  return (
    <div className={`relative w-full flex flex-col items-center max-w-4xl mx-auto z-10 h-full max-h-[85vh] ${messages.length === 0 ? 'justify-center' : ''}`}>
      {/* Conversation Header */}
      {messages.length > 0 && (
        <div className="w-full flex items-center justify-between px-4 pb-4 mb-2 border-b border-white/[0.06] animate-in fade-in duration-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.15)]">
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-white">OscaBot</span>
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                {isBusy ? "Responding" : "Online"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] text-xs text-neutral-400 hover:text-white transition-all duration-200"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New chat
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="space-y-8 text-center mb-10 animate-in slide-in-from-bottom-4 fade-in duration-700 ease-out">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] font-medium tracking-wide text-emerald-300 uppercase">
              <Sparkles className="w-3 h-3" />
              AI-powered matchmaking
            </div>
            <h1 className="text-4xl md:text-6xl font-light tracking-tight text-white leading-tight">
              {greeting}, <span className="font-serif italic font-medium text-emerald-400">{user?.name.split(" ")[0] || "Developer"}</span>
            </h1>
            <p className="text-neutral-400 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed">
              I am OscaBot. Tell me about your skills and let&apos;s find the perfect open-source repository for your next contribution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto px-4">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => submitPrompt(prompt)}
                className="group text-left flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-emerald-500/20 text-sm text-neutral-400 hover:text-neutral-200 transition-all duration-200"
              >
                <Compass className="w-4 h-4 mt-0.5 text-neutral-600 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                <span className="font-light leading-snug">{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative w-full flex-1 overflow-y-auto mb-6 px-4 space-y-8 custom-scrollbar"
        >
          {messages.map((msg, index) => (
            <div key={index} className={`group/msg flex gap-4 w-full animate-in slide-in-from-bottom-3 fade-in duration-500 ease-out ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {/* Assistant Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md">
                  <Bot className="w-4.5 h-4.5 text-emerald-400" />
                </div>
              )}

              <div className={`max-w-[80%] min-w-0 ${
                msg.role === 'user'
                  ? 'bg-white/[0.06] text-neutral-100 border border-white/[0.05] rounded-3xl rounded-tr-sm px-6 py-4 shadow-xl backdrop-blur-md'
                  : 'text-neutral-200'
              }`}>
                {msg.role === 'assistant' ? (
                  <>
                    <StreamingAssistantContent content={msg.content} streaming={false} />
                    <div className="mt-1 -ml-2">
                      <CopyButton text={msg.content} />
                    </div>
                  </>
                ) : (
                  <p className="leading-relaxed font-light whitespace-pre-wrap text-[15px]">{msg.content}</p>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-1 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md overflow-hidden relative">
                  {user?.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="User Avatar" fill className="object-cover" />
                  ) : (
                    <UserIcon className="w-4.5 h-4.5 text-neutral-300" />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Live streaming assistant reply */}
          {streamingMessage !== null && (
            <div className="flex gap-4 justify-start w-full animate-in slide-in-from-bottom-3 fade-in duration-400 ease-out">
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-emerald-500/25 to-emerald-500/5 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.25)] backdrop-blur-md">
                <Bot className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div className="max-w-[80%] min-w-0 text-neutral-200">
                <StreamingAssistantContent content={streamingMessage} streaming onDone={handleStreamDone} />
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {isLoading && (
            <div className="flex gap-4 justify-start w-full animate-in fade-in duration-300">
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 py-2.5 px-1">
                <span className="text-sm font-light bg-gradient-to-r from-neutral-600 via-neutral-200 to-neutral-600 bg-clip-text text-transparent animate-shimmer-text">
                  OscaBot is thinking&hellip;
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      )}

      {/* Scroll to latest button */}
      {showScrollButton && messages.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-900/90 border border-white/[0.1] text-xs text-neutral-300 shadow-xl backdrop-blur-md hover:bg-neutral-800 hover:text-white transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          New messages
        </button>
      )}

      {/* Modern Input Container */}
      <div className={`w-full px-4 shrink-0 pb-4 ${messages.length > 0 ? 'mt-auto' : ''}`}>
        <form onSubmit={handleSearchSubmit} className="w-full relative group">
          {/* Glowing background effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-emerald-500/20 rounded-[28px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="relative w-full bg-neutral-950/60 border border-white/[0.08] rounded-[24px] p-2 flex flex-col shadow-2xl backdrop-blur-2xl transition-all duration-300 focus-within:border-emerald-500/30 focus-within:bg-neutral-950/80">
            <div className="flex items-start gap-3 px-3 py-2">
              <div className="mt-1.5 text-neutral-500">
                <Search className="w-5 h-5" />
              </div>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="E.g., I'm a React dev looking to learn Rust. Where should I start?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isBusy}
                className="w-full bg-transparent border-0 outline-none text-neutral-100 text-[15px] placeholder:text-neutral-600 resize-none py-1 focus:ring-0 leading-relaxed font-light disabled:opacity-50 min-h-[44px] max-h-[160px] custom-scrollbar"
              />

              <button
                type="submit"
                disabled={!searchQuery.trim() || isBusy}
                className="self-end p-2.5 rounded-xl bg-white text-neutral-950 font-semibold active:scale-95 transition-all duration-300 shadow-lg disabled:opacity-30 disabled:active:scale-100 disabled:hover:bg-white hover:bg-emerald-400 hover:text-emerald-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] ml-2"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Footer */}
            {messages.length === 0 && (
              <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 px-3 pb-1 mt-1">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/repositories')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.1] text-xs text-neutral-400 hover:text-neutral-200 transition-all duration-200"
                  >
                    <GithubIcon className="w-3.5 h-3.5" />
                    Browse All Repositories
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.1] text-xs text-neutral-400 hover:text-neutral-200 transition-all duration-200"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Languages
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

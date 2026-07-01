"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Code2, Bot, User as UserIcon, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

export function ChatConsole() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [messages]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

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
      if (data.data?.message) {
        setMessages([...newMessages, data.data.message]);
      }
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error while trying to fetch recommendations.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearchSubmit(e as any);
    }
  };

  // Render a beautiful card for GitHub links
  const renderLink = (props: any) => {
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

  return (
    <div className={`w-full flex flex-col items-center max-w-4xl mx-auto z-10 h-full max-h-[85vh] ${messages.length === 0 ? 'justify-center' : ''}`}>
      {messages.length === 0 ? (
        <div className="space-y-4 text-center mb-10 animate-in slide-in-from-bottom-4 fade-in duration-700 ease-out">
          <h1 className="text-4xl md:text-6xl font-light tracking-tight text-white leading-tight">
            {greeting}, <span className="font-serif italic font-medium text-emerald-400">{user?.name.split(" ")[0] || "Developer"}</span>
          </h1>
          <p className="text-neutral-400 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed">
            I am OscaBot. Tell me about your skills and let's find the perfect open-source repository for your next contribution.
          </p>
        </div>
      ) : (
        <div className="w-full flex-1 overflow-y-auto mb-6 px-4 space-y-8 custom-scrollbar">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-5 w-full animate-in slide-in-from-bottom-4 fade-in duration-500 ease-out ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {/* Assistant Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${
                msg.role === 'user' 
                  ? 'bg-white/[0.06] text-neutral-100 border border-white/[0.05] rounded-3xl rounded-tr-sm px-6 py-4 shadow-xl backdrop-blur-md' 
                  : 'text-neutral-200'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-emerald max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-950/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{ a: renderLink }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="leading-relaxed font-light whitespace-pre-wrap text-[15px]">{msg.content}</p>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-1 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-neutral-300" />
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-5 justify-start w-full animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-3 py-3 px-2">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
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
                rows={1}
                placeholder="E.g., I'm a React dev looking to learn Rust. Where should I start?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full bg-transparent border-0 outline-none text-neutral-100 text-[15px] placeholder:text-neutral-600 resize-none py-1 focus:ring-0 leading-relaxed font-light disabled:opacity-50 min-h-[44px]"
              />
              
              <button 
                type="submit"
                disabled={!searchQuery.trim() || isLoading}
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

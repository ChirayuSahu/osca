"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Code2,
  Bot,
  User as UserIcon,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  PlusCircle,
  ArrowDown,
  Compass,
  AlertTriangle,
  RefreshCw,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

const SUGGESTED_PROMPTS = [
  "I'm a React dev looking to learn Rust. Where should I start?",
  "Find beginner-friendly Python repos with good mentorship",
  "What are trending Go projects that need contributors?",
  "Suggest ML repos suited for someone who knows PyTorch",
];

// Custom GitHub SVG icon used across the chat surface
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

type Disclaimer = "missing-api-key" | "temporary-outage" | null;

type ParsedRecommendation = {
  title: string;
  url: string;
  rationale: string;
};

type ParsedResponse = {
  intro: string | null;
  recommendations: ParsedRecommendation[];
  clarifying: string[];
  closing: string | null;
};

type ChatReplyPayload = {
  parsed?: ParsedResponse;
  markdown?: string;
  model?: string;
  disclaimer?: Disclaimer;
};

type AssistantMessage = {
  role: "assistant";
  parsed: ParsedResponse;
  markdown: string;
  disclaimer: Disclaimer;
};

type UserMessage = { role: "user"; content: string };

type Message = UserMessage | AssistantMessage;

// Render the markdown introduction (any prose / non-link text) as beautiful prose.
const renderMarkdown = (content: string, keyPrefix: string) => (
  <ReactMarkdown
    key={keyPrefix}
    remarkPlugins={[remarkGfm]}
    components={{
      a: (props) => (
        <a
          {...props}
          className="text-emerald-400 hover:text-emerald-300 hover:underline underline-offset-4 transition-colors"
          target={props.href?.startsWith("http") ? "_blank" : undefined}
          rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
        />
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

// Stream the markdown in with a soft reveal. Cancellable via the trailing callback.
function StreamingMarkdown({
  content,
  streaming,
  onDone,
}: {
  content: string;
  streaming: boolean;
  onDone?: () => void;
}) {
  const [revealed, setRevealed] = useState(streaming ? 0 : content.length);

  useEffect(() => {
    if (!streaming) {
      setRevealed(content.length);
      return;
    }
    setRevealed(0);
    const targetChars = Math.max(content.length, 1);
    const totalTicks = 36;
    const chunk = Math.max(1, Math.ceil(targetChars / totalTicks));
    const interval = setInterval(() => {
      setRevealed((prev) => Math.min(content.length, prev + chunk));
    }, 18);
    return () => clearInterval(interval);
  }, [content, streaming]);

  useEffect(() => {
    if (streaming && revealed >= content.length) {
      const timeout = setTimeout(() => onDone?.(), 140);
      return () => clearTimeout(timeout);
    }
  }, [revealed, content.length, streaming, onDone]);

  const visibleText = content.slice(0, revealed);
  const isTyping = streaming && revealed < content.length;

  return (
    <div className="prose prose-invert prose-emerald max-w-none prose-p:leading-relaxed">
      {renderMarkdown(visibleText, `${content.length}-${revealed}`)}
      {isTyping && (
        <span className="inline-block w-[7px] h-[1.05em] align-text-bottom bg-emerald-400/80 rounded-[1px] ml-0.5 animate-caret" />
      )}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  index,
}: {
  recommendation: ParsedRecommendation;
  index: number;
}) {
  const title = recommendation.title?.trim() || "owner/repo";
  const url = recommendation.url?.trim();
  const isLikelyRepo = /[\w.-]+\/[\w.-]+/.test(title);
  const cleanedUrl = url && /^https:\/\/github\.com\//i.test(url) ? url : null;

  // Fallback URL synthesised from owner/repo if the bot wrote a label without a usable link
  const syntheticUrl = !cleanedUrl && isLikelyRepo
    ? `https://github.com/${title.replace(/^\/+|\/+$/g, "")}`
    : null;

  const finalUrl = cleanedUrl ?? syntheticUrl;

  return (
    <div
      className="group relative my-3 rounded-2xl bg-gradient-to-br from-neutral-900/60 to-neutral-900/30 border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-300 overflow-hidden shadow-lg shadow-black/20"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-4 sm:p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:bg-emerald-500/15 group-hover:border-emerald-500/30 transition-all duration-300 flex-shrink-0 shadow-inner">
          <GithubIcon className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={finalUrl ?? "#"}
              target={finalUrl ? "_blank" : undefined}
              rel={finalUrl ? "noopener noreferrer" : undefined}
              className={`text-[15px] font-medium truncate transition-colors ${
                finalUrl ? "text-white group-hover:text-emerald-300" : "text-neutral-400"
              }`}
            >
              {title}
            </a>
            {!finalUrl && (
              <span className="text-[10px] uppercase tracking-wider text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                link unavailable
              </span>
            )}
          </div>
          {recommendation.rationale && (
            <p className="text-sm text-neutral-400 leading-relaxed font-light">
              {recommendation.rationale}
            </p>
          )}
          {finalUrl && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400/90 group-hover:text-emerald-300 transition-colors">
              <Star className="w-3.5 h-3.5" />
              <a
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline underline-offset-4"
              >
                Open on GitHub
              </a>
            </div>
          )}
        </div>
        <div className="relative z-10 w-9 h-9 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:bg-emerald-500 group-hover:shadow-[0_0_18px_rgba(16,185,129,0.45)] transition-all duration-300 flex-shrink-0">
          <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-950 transition-colors" />
        </div>
      </div>
    </div>
  );
}

function DisclaimerBanner({ kind }: { kind: Disclaimer }) {
  if (!kind) return null;
  const text =
    kind === "missing-api-key"
      ? "OscaBot is in offline mode — recommendations are limited until OpenRouter is configured."
      : "I couldn't reach my recommendation engine just now. Showing a curated fallback while you retry.";
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-300" />
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

function AssistantMessageView({
  message,
  streaming,
  onStreamDone,
  onRegenerate,
  canRegenerate,
}: {
  message: AssistantMessage;
  streaming: boolean;
  onStreamDone: () => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
}) {
  const { parsed } = message;

  return (
    <div className="space-y-1">
      <StreamingMarkdown
        content={message.markdown}
        streaming={streaming}
        onDone={onStreamDone}
      />

      {parsed.recommendations.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80 font-medium">
              Recommendations
            </span>
            <span className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent" />
            <span className="text-[11px] text-neutral-500 tabular-nums">
              {parsed.recommendations.length}
            </span>
          </div>
          {parsed.recommendations.map((rec, i) => (
            <RecommendationCard
              key={`${rec.title}-${i}`}
              recommendation={rec}
              index={i}
            />
          ))}
        </div>
      )}

      {parsed.clarifying.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80 font-medium mb-3">
            Quick clarifying questions
          </div>
          <div className="flex flex-col gap-2">
            {parsed.clarifying.map((q, i) => (
              <button
                key={i}
                type="button"
                className="text-left text-sm text-neutral-300 hover:text-white hover:bg-emerald-500/10 transition-colors rounded-xl px-3 py-2 border border-white/[0.05] hover:border-emerald-500/30"
                onClick={() => {
                  // future: prefills the composer; we keep it as visual cue for now
                  window.dispatchEvent(
                    new CustomEvent("osca-bot-prefill", { detail: q })
                  );
                }}
              >
                <span className="text-emerald-400/70 mr-2 font-medium">{i + 1}.</span>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {parsed.closing && (
        <p className="mt-3 text-sm italic text-neutral-400 leading-relaxed">
          {parsed.closing}
        </p>
      )}

      {!streaming && (
        <div className="mt-2 -ml-2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
          <CopyMarkdownButton markdown={message.markdown} />
          {canRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-neutral-500 hover:text-emerald-300 hover:bg-white/[0.05] transition-colors duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
          )}
        </div>
      )}

      <DisclaimerBanner kind={message.disclaimer} />
    </div>
  );
}

function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }, [markdown]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-neutral-500 hover:text-emerald-300 hover:bg-white/[0.05] transition-colors duration-200"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
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
  const [streamingMessage, setStreamingMessage] = useState<AssistantMessage | null>(
    null
  );
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [searchQuery]);

  // Allow programmatic pre-fills (e.g. from clarifying-question chips)
  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setSearchQuery(detail);
        window.setTimeout(() => textareaRef.current?.focus(), 0);
      }
    }
    window.addEventListener("osca-bot-prefill", onPrefill);
    return () => window.removeEventListener("osca-bot-prefill", onPrefill);
  }, []);

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
    setLastUserPrompt(null);
    setSearchQuery("");
  }, []);

  const submitPrompt = useCallback((prompt: string) => {
    setSearchQuery(prompt);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || streamingMessage !== null) return;

      const userMessage: UserMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setSearchQuery("");
      setLastUserPrompt(trimmed);

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const history = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.role === "user" ? m.content : m.markdown,
        }));

        const response = await fetch(`${apiUrl}/recommendations/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? ""}`,
          },
          body: JSON.stringify({ messages: history }),
        });

        if (!response.ok) {
          throw new Error(`OscaBot returned ${response.status}`);
        }

        const data = (await response.json()) as {
          success?: boolean;
          data?: ChatReplyPayload;
        };
        const payload = data?.data ?? {};
        const parsed: ParsedResponse = payload.parsed ?? {
          intro: payload.markdown ?? null,
          recommendations: [],
          clarifying: [],
          closing: null,
        };
        const markdown =
          payload.markdown ??
          (parsed.intro ?? "");

        setStreamingMessage({
          role: "assistant",
          parsed,
          markdown: markdown.trim() || parsed.intro || "",
          disclaimer: payload.disclaimer ?? null,
        });
      } catch (error) {
        console.error("[OscaBot] chat failed", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            disclaimer: "temporary-outage",
            markdown:
              "I'm OscaBot and I'm having trouble reaching my recommendation engine. Please retry in a moment.",
            parsed: {
              intro:
                "I'm OscaBot and I'm having trouble reaching my recommendation engine. Please retry in a moment.",
              recommendations: [],
              clarifying: [],
              closing: null,
            },
          },
        ]);
      }
    },
    [messages, streamingMessage, token]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(searchQuery);
  };

  const handleStreamDone = useCallback(() => {
    if (!streamingMessage) return;
    setMessages((prev) => [...prev, streamingMessage]);
    setStreamingMessage(null);
  }, [streamingMessage]);

  const handleRegenerate = useCallback(() => {
    if (lastUserPrompt) {
      // Drop the last assistant turn so the regenerated reply replaces it cleanly
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.slice();
        if (next[next.length - 1]?.role === "assistant") {
          next.pop();
        }
        return next;
      });
      void sendPrompt(lastUserPrompt);
    }
  }, [lastUserPrompt, sendPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearchSubmit(e as unknown as React.FormEvent);
    }
  };

  const isBusy = streamingMessage !== null;

  return (
    <div
      className={`relative w-full flex flex-col items-center max-w-4xl mx-auto z-10 h-full max-h-[85vh] ${
        messages.length === 0 && streamingMessage === null ? "justify-center" : ""
      }`}
    >
      {messages.length > 0 && (
        <div className="w-full flex items-center justify-between px-4 pb-4 mb-2 border-b border-white/[0.06] animate-in fade-in duration-500">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-b from-emerald-500/25 to-emerald-500/5 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.18)]">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-white">
                OscaBot
                <span className="ml-1.5 text-[10px] font-mono tracking-widest text-emerald-400/70 uppercase">
                  official
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.85)]" />
                {isBusy ? "Responding…" : "Open-source matchmaker"}
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

      {messages.length === 0 && streamingMessage === null ? (
        <div className="space-y-8 text-center mb-10 animate-in slide-in-from-bottom-4 fade-in duration-700 ease-out">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] font-medium tracking-wide text-emerald-300 uppercase">
              <Sparkles className="w-3 h-3" />
              OscaBot · Open-source matchmaker
            </div>
            <h1 className="text-4xl md:text-6xl font-light tracking-tight text-white leading-tight">
              {greeting},{" "}
              <span className="font-serif italic font-medium text-emerald-400">
                {user?.name.split(" ")[0] || "Developer"}
              </span>
            </h1>
            <p className="text-neutral-400 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed">
              I&apos;m OscaBot. Tell me your stack, your level, and the kind of
              projects you enjoy — I&apos;ll match you with repositories where
              you can make real contributions.
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
            <div
              key={index}
              className={`group/msg flex gap-4 w-full animate-in slide-in-from-bottom-3 fade-in duration-500 ease-out ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
              )}

              <div
                className={`max-w-[80%] min-w-0 ${
                  msg.role === "user"
                    ? "bg-white/[0.06] text-neutral-100 border border-white/[0.05] rounded-3xl rounded-tr-sm px-6 py-4 shadow-xl backdrop-blur-md"
                    : "text-neutral-200"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="leading-relaxed font-light whitespace-pre-wrap text-[15px]">
                    {msg.content}
                  </p>
                ) : (
                  <AssistantMessageView
                    message={msg}
                    streaming={false}
                    onStreamDone={() => {}}
                    onRegenerate={handleRegenerate}
                    canRegenerate={lastUserPrompt !== null}
                  />
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-1 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md overflow-hidden relative">
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt="User Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-neutral-300" />
                  )}
                </div>
              )}
            </div>
          ))}

          {streamingMessage && (
            <div className="flex gap-4 justify-start w-full animate-in slide-in-from-bottom-3 fade-in duration-400 ease-out">
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-emerald-500/25 to-emerald-500/5 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.25)] backdrop-blur-md relative">
                <Bot className="w-4 h-4 text-emerald-400" />
                <span className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping pointer-events-none" />
              </div>
              <div className="max-w-[80%] min-w-0 text-neutral-200 flex-1">
                <AssistantMessageView
                  message={streamingMessage}
                  streaming
                  onStreamDone={handleStreamDone}
                  onRegenerate={handleRegenerate}
                  canRegenerate={false}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      )}

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

      <div
        className={`w-full px-4 shrink-0 pb-4 ${
          messages.length > 0 || streamingMessage !== null ? "mt-auto" : ""
        }`}
      >
        <form onSubmit={handleSearchSubmit} className="w-full relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-emerald-500/20 rounded-[28px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="relative w-full bg-neutral-950/60 border border-white/[0.08] rounded-[24px] p-2 flex flex-col shadow-2xl backdrop-blur-2xl transition-all duration-300 focus-within:border-emerald-500/30 focus-within:bg-neutral-950/80">
            <div className="flex items-start gap-3 px-3 py-2">
              <div className="mt-1.5 text-neutral-500">
                <Search className="w-5 h-5" />
              </div>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask OscaBot — e.g., React dev looking to start with Rust"
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

            {messages.length === 0 && streamingMessage === null && (
              <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 px-3 pb-1 mt-1">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/repositories")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.1] text-xs text-neutral-400 hover:text-neutral-200 transition-all duration-200"
                  >
                    <GithubIcon className="w-3.5 h-3.5" />
                    Browse all repositories
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/explore")}
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

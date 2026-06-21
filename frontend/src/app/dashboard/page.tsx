"use client";

import React from "react";
import { ChatConsole } from "@/components/dashboard/chat-console";

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col justify-center items-center select-none relative pb-16">
      {/* Subtle Background Glow */}
      <div className="absolute right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.03] blur-[100px] pointer-events-none" />

      {/* Claude-style Welcome & Input Section (Centered Component) */}
      <ChatConsole />
    </div>
  );
}

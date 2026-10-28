"use client";

import React from "react";
import { ChatConsole } from "@/components/dashboard/chat-console";

export default function DashboardPage() {
  return (
    // Fills the viewport under the top spacer (and the phone-only top bar); the chat scrolls itself
    <div className="relative mx-auto flex h-[calc(100svh-5rem)] md:h-[calc(100svh-2rem)] w-full max-w-7xl flex-col items-center justify-center overflow-hidden px-4 pb-6 pt-2 md:px-6">
      <ChatConsole />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { MessagesSquare, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface GroupChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId: string;
}

interface ChatMessage {
  id: string;
  user: string;
  time: string;
  text: string;
  isMe?: boolean;
}

const MOCK_MESSAGES: ChatMessage[] = [];

export function GroupChatPanel({ isOpen, onClose }: GroupChatPanelProps) {
  const [message, setMessage] = useState("");

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Repository chat</SheetTitle>
          <SheetDescription>Talk with other contributors to this repository.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {MOCK_MESSAGES.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {MOCK_MESSAGES.map((msg) => (
                <li key={msg.id} className={cn("flex gap-3", msg.isMe && "flex-row-reverse")}>
                  <Avatar>
                    <AvatarFallback className="text-xs">{msg.user.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className={cn("flex max-w-[75%] flex-col gap-1", msg.isMe ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">{msg.user}</span>
                      <span className="text-muted-foreground">{msg.time}</span>
                    </div>
                    <div
                      className={cn(
                        "rounded-md px-3 py-2 text-sm",
                        msg.isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {msg.text}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="my-auto border-0"
              icon={<MessagesSquare />}
              title="No messages yet"
              description="Messages from other contributors will appear here."
            />
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); setMessage(""); }}
          className="flex items-center gap-2 border-t p-4"
        >
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message the community"
            aria-label="Message"
          />
          <Button type="submit" size="icon" disabled={!message.trim()} aria-label="Send message">
            <Send />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

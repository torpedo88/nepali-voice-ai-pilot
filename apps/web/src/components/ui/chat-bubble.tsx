"use client";

import * as React from "react";
import { Volume2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ChatBubbleProps {
  userText: string;
  aiText: string;
  audioUrl?: string;
  isUser?: boolean;
  className?: string;
}

export function ChatBubble({ userText, aiText, audioUrl, className }: ChatBubbleProps) {
  const [copied, setCopied] = React.useState<"user" | "ai" | null>(null);

  const handleCopy = async (text: string, type: "user" | "ai") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(console.error);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* User Message */}
      <div className="flex justify-end">
        <div className="group max-w-[85%] space-y-2">
          <div className="rounded-2xl rounded-br-md bg-blue-600 px-4 py-2 text-white">
            <p className="text-sm font-medium opacity-75 mb-1">You said</p>
            <p className="leading-relaxed">{userText}</p>
          </div>
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(userText, "user")}
              className="h-6 px-2 text-xs"
            >
              {copied === "user" ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Copy
            </Button>
          </div>
        </div>
      </div>

      {/* AI Message */}
      <div className="flex justify-start">
        <div className="group max-w-[85%] space-y-2">
          <div className="rounded-2xl rounded-bl-md bg-[var(--muted)] border border-[var(--border)] px-4 py-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)] mb-1">AI replied</p>
            <p className="leading-relaxed text-[var(--foreground)]">{aiText}</p>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {audioUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={playAudio}
                className="h-6 px-2 text-xs"
              >
                <Volume2 className="h-3 w-3" />
                Play
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(aiText, "ai")}
              className="h-6 px-2 text-xs"
            >
              {copied === "ai" ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Copy
            </Button>
          </div>

          {/* Audio Controls */}
          {audioUrl && (
            <div className="mt-2">
              <audio controls src={audioUrl} className="w-full h-8 opacity-75" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
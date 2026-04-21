"use client";

import * as React from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordingButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function RecordingButton({
  isRecording,
  isProcessing,
  onClick,
  disabled,
  className,
  "aria-label": ariaLabel,
}: RecordingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isProcessing}
      aria-label={ariaLabel}
      className={cn(
        // Base styles
        "relative h-20 w-20 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50",

        // Recording state
        isRecording && [
          "bg-red-500 shadow-lg animate-pulse",
          "before:absolute before:inset-0 before:rounded-full before:bg-red-500 before:opacity-30 before:animate-ping"
        ],

        // Processing state
        isProcessing && "bg-blue-500",

        // Default state
        !isRecording && !isProcessing && "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg",

        className
      )}
    >
      {/* Background pulse animation for recording */}
      {isRecording && (
        <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping" />
      )}

      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center text-white">
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : isRecording ? (
          <Square className="h-7 w-7" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </div>
    </button>
  );
}
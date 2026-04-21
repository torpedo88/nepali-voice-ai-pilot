"use client";

import * as React from "react";
import { Loader2, Mic, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = "idle" | "recording" | "processing" | "success" | "error";

interface StatusIndicatorProps {
  status: StatusType;
  message: string;
  className?: string;
}

const statusConfig = {
  idle: {
    icon: null,
    color: "text-[var(--muted-foreground)]",
    bgColor: "",
  },
  recording: {
    icon: Mic,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30",
  },
  processing: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30",
  },
};

export function StatusIndicator({ status, message, className }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
        config.bgColor,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {Icon && (
        <Icon
          className={cn(
            "h-4 w-4",
            config.color,
            status === "processing" && "animate-spin",
            status === "recording" && "animate-pulse"
          )}
        />
      )}
      <span className={cn(config.color, "font-medium")}>{message}</span>
    </div>
  );
}
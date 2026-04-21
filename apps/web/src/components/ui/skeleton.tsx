"use client";

import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--muted)]", className)}
      {...props}
    />
  );
}

function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full" // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="rounded-lg border border-[var(--border)] p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <Skeleton className="h-6 w-32 mx-auto mb-4" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonChatBubble() {
  return (
    <div className="space-y-4">
      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-2">
          <div className="rounded-2xl rounded-br-md bg-[var(--muted)] p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <SkeletonText lines={2} />
          </div>
        </div>
      </div>

      {/* AI message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-[85%] space-y-2">
          <div className="rounded-2xl rounded-bl-md bg-[var(--muted)] p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <SkeletonText lines={3} />
          </div>
          <Skeleton className="h-8 w-full" /> {/* Audio player */}
        </div>
      </div>
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonStats, SkeletonChatBubble };
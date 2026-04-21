"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "appearance-none cursor-pointer",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
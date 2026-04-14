import * as React from "react";

import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  fallback: string;
}

export function Avatar({ className, fallback, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--accent-soft)] text-sm font-semibold text-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      {fallback.slice(0, 2).toUpperCase()}
    </div>
  );
}

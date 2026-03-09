import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

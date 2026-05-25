import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "outline" | "muted" | "primary";
}) {
  const styles = {
    default: "bg-foreground text-background",
    outline: "border border-border text-foreground",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary border border-primary/30",
  } as const;
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

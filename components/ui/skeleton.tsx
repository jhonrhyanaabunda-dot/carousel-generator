import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-r from-muted via-muted/40 to-muted bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

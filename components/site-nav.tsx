"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, LayoutGrid, FolderHeart, LayoutTemplate, ArrowUpRight, Download } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/generator", label: "Generator", icon: Sparkles },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/projects", label: "Projects", icon: FolderHeart },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-strong flex h-14 w-full items-center justify-between gap-2 rounded-full border px-3 sm:px-4"
        >
          <Link href="/" className="flex items-center gap-2 pl-2 pr-3">
            <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-emerald-brand shadow-glow">
              <span className="text-[13px] font-black leading-none text-black tracking-tight">A3</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight">A3 Carousel</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:inline">Studio</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href}>
                  <span
                    className={cn(
                      "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {n.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/generator"
              className="hidden sm:inline-flex"
              onClick={(e) => {
                // If already on /generator, don't re-navigate — fire a
                // regenerate event that the generator page listens to.
                if (pathname.startsWith("/generator")) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("app:regenerate"));
                }
              }}
            >
              <Button size="sm" className="gap-1.5">
                {pathname.startsWith("/generator") ? "Regenerate" : "Generate"}{" "}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            {/* Download — only meaningful on /generator. Dispatches an event
                that the generator page listens to so the popover can be
                anchored to the same DOM that owns slideRefs / inputs. */}
            {pathname.startsWith("/generator") && (
              <button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("app:download"))
                }
                className="hidden h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-accent sm:inline-flex"
                title="Download options"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </header>
  );
}

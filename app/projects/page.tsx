"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, FolderOpen, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteProject, listProjects } from "@/lib/storage";
import type { CarouselProject } from "@/types";
import { getTemplate } from "@/lib/templates";
import { toast } from "sonner";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<CarouselProject[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProjects(listProjects());
    setHydrated(true);
  }, []);

  const onDelete = (id: string) => {
    deleteProject(id);
    setProjects(listProjects());
    toast.success("Project deleted.");
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Saved
          </p>
          <h1 className="font-display text-5xl font-black tracking-tight">
            Your projects
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Everything you save lives in your browser. Reopen any deck to keep editing,
            re-generate, or export new variations.
          </p>
        </div>
        <Link href="/generator">
          <Button size="lg" className="gap-1.5">
            New carousel <Sparkles className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {!hydrated ? null : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => {
            const t = getTemplate(p.templateId);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
              >
                <Card className="group overflow-hidden">
                  <Link
                    href={`/generator?project=${p.id}`}
                    className="block aspect-[4/5] overflow-hidden"
                    style={{ background: t.palette.bg }}
                  >
                    <div className="relative h-full w-full">
                      <div
                        className="absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-50 blur-2xl"
                        style={{ background: t.palette.accent }}
                      />
                      <div
                        className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full opacity-40 blur-2xl"
                        style={{ background: t.palette.accent2 }}
                      />
                      <div className="relative flex h-full flex-col justify-between p-6">
                        <span
                          className="w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: t.palette.muted, borderColor: t.palette.muted + "55" }}
                        >
                          {t.name}
                        </span>
                        <div>
                          <div
                            className="line-clamp-3 text-2xl font-black leading-tight"
                            style={{ color: t.palette.text, fontFamily: t.fonts.display }}
                          >
                            {p.headline || "Untitled carousel"}
                          </div>
                          <div className="mt-2 text-xs" style={{ color: t.palette.muted }}>
                            {p.slides.length} slides · updated {timeAgo(p.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between border-t border-border bg-card p-3">
                    <Link
                      href={`/generator?project=${p.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                    >
                      Open <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(p.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
        <FolderOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No projects yet</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Generate a carousel and hit{" "}
        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">⌘ S</span>{" "}
        to save it here. Your work stays private. It lives in your browser.
      </p>
      <Link href="/generator" className="mt-2">
        <Button className="gap-1.5">
          <Sparkles className="h-4 w-4" /> Create your first carousel
        </Button>
      </Link>
    </Card>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

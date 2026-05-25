"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  FolderHeart,
  LayoutTemplate,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listProjects } from "@/lib/storage";
import { TEMPLATES } from "@/lib/templates";
import type { CarouselProject } from "@/types";

export default function DashboardPage() {
  const [projects, setProjects] = useState<CarouselProject[]>([]);
  useEffect(() => setProjects(listProjects()), []);
  const totalSlides = projects.reduce((acc, p) => acc + p.slides.length, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Dashboard
          </p>
          <h1 className="font-display text-5xl font-black tracking-tight">
            Welcome back, designer.
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Spin up a fresh carousel, browse the template library, or pick up where you left off.
          </p>
        </div>
        <Link href="/generator">
          <Button size="lg" className="gap-1.5">
            <Wand2 className="h-4 w-4" /> Generate now
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={FolderHeart} label="Saved projects" value={projects.length} />
        <Stat icon={LayoutTemplate} label="Templates" value={TEMPLATES.length} />
        <Stat icon={Activity} label="Total slides" value={totalSlides} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border p-6">
            <div>
              <h2 className="text-lg font-semibold">Recent projects</h2>
              <p className="text-xs text-muted-foreground">Your last few decks.</p>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-secondary">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No projects yet. Hit{" "}
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                  Generate
                </span>{" "}
                to start your first.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {projects.slice(0, 5).map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/generator?project=${p.id}`}
                    className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{p.headline || "Untitled carousel"}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.templateId.replace(/-/g, " ")} · {p.slides.length} slides
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-semibold">Featured templates</h2>
            <p className="text-xs text-muted-foreground">Tap to use.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {TEMPLATES.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={`/generator?template=${t.id}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border"
                style={{ background: t.palette.bg }}
              >
                <div
                  className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-50 blur-2xl"
                  style={{ background: t.palette.accent }}
                />
                <div className="absolute inset-0 flex items-end p-3">
                  <div
                    className="text-sm font-black leading-none"
                    style={{ color: t.palette.text, fontFamily: t.fonts.display }}
                  >
                    {t.name}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex items-center gap-4 p-6">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-3xl font-black">{value}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      </div>
    </Card>
  );
}

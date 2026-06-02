"use client";

import { useState } from "react";
import { Replace } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Slide } from "@/types";

export interface FindReplaceProps {
  slides: Slide[];
  onChange: (next: Slide[]) => void;
}

// Bulk find-and-replace across every slide's editable fields (title,
// subtitle, body, eyebrow, custom text). String-level replace (case-aware
// optional). Big agency time-saver — change "Lincoln" → "BMW" deck-wide
// in one click instead of clicking through each slide.
export function FindReplace({ slides, onChange }: FindReplaceProps) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [open, setOpen] = useState(false);

  const run = () => {
    if (!find) {
      toast.error("Enter text to find.");
      return;
    }
    const flags = caseSensitive ? "g" : "gi";
    // Escape regex meta-chars so the user enters plain text, not regex.
    const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

    let hits = 0;
    const repl = (v?: string) => {
      if (!v) return v;
      const next = v.replace(re, (m) => {
        hits++;
        return replace;
      });
      return next;
    };

    const next = slides.map((s) => ({
      ...s,
      content: {
        ...s.content,
        title: repl(s.content.title),
        subtitle: repl(s.content.subtitle),
        body: repl(s.content.body),
        eyebrow: repl(s.content.eyebrow),
        bullets: s.content.bullets?.map((b) => repl(b) ?? b),
        stats: s.content.stats?.map((st) => ({
          ...st,
          value: repl(st.value) ?? st.value,
          label: repl(st.label),
        })),
      },
      customTexts: (s.customTexts ?? []).map((ct) => ({
        ...ct,
        text: repl(ct.text) ?? ct.text,
      })),
    }));

    if (hits === 0) {
      toast.error(`No matches for "${find}".`);
      return;
    }
    onChange(next);
    toast.success(`Replaced ${hits} occurrence${hits === 1 ? "" : "s"} across the deck.`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5">
          <Replace className="h-3.5 w-3.5" />
          Find / replace
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Find &amp; replace across deck
        </p>
        <div className="space-y-2">
          <Input
            placeholder="Find"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                run();
              }
            }}
          />
          <Input
            placeholder="Replace with…"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                run();
              }
            }}
          />
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="h-3 w-3"
            />
            Case sensitive
          </label>
        </div>
        <Button size="sm" className="mt-3 w-full" onClick={run}>
          Replace all
        </Button>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Scans every slide&apos;s title, subtitle, body, eyebrow, bullets,
          stats, and custom text elements.
        </p>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Copy, FileImage, FileText, Hash, Save, Sparkles, Undo2, Redo2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { downloadAllAsZip, downloadPdf, downloadSlidePng } from "@/lib/export";
import type { AspectRatio, Slide } from "@/types";
import { generateCaption, generateHashtags } from "@/lib/ai-helpers";
import { FindReplace } from "./FindReplace";

export interface ExportBarProps {
  slideRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  aspect: AspectRatio;
  baseName: string;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  captionInput: {
    headline: string;
    subtitle: string;
    body: string;
    brandName?: string;
    templateName?: string;
  };
  activeIndex?: number;
  // Timestamp of the last (silent) auto-save. When set, the export bar shows
  // a tiny "Saved 12s ago" indicator next to the Save button so the user
  // knows their work is being persisted.
  lastSavedAt?: number | null;
  // For bulk find-and-replace.
  slides: Slide[];
  onSlidesChange: (next: Slide[]) => void;
}

export function ExportBar({
  slideRefs,
  aspect,
  baseName,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  captionInput,
  activeIndex = 0,
  lastSavedAt,
  slides,
  onSlidesChange,
}: ExportBarProps) {
  const [busy, setBusy] = useState<"png" | "zip" | "pdf" | null>(null);

  const nodes = () => (slideRefs.current.filter(Boolean) as HTMLDivElement[]);

  // Live-updating relative timestamp for the "Saved Ns ago" indicator.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const savedAgo = lastSavedAt ? relativeTimeAgo(now - lastSavedAt) : null;

  async function exportPng() {
    const node = slideRefs.current[activeIndex];
    if (!node) return toast.error("Slide not ready.");
    setBusy("png");
    try {
      await downloadSlidePng(node, `${baseName}-slide-${String(activeIndex + 1).padStart(2, "0")}.png`);
      toast.success("Downloaded PNG.");
    } catch {
      toast.error("Couldn't export PNG.");
    } finally {
      setBusy(null);
    }
  }

  async function exportZip() {
    const arr = nodes();
    if (!arr.length) return toast.error("No slides to export.");
    setBusy("zip");
    try {
      await downloadAllAsZip(arr, baseName);
      toast.success(`Exported ${arr.length} slides as ZIP.`);
    } catch {
      toast.error("Couldn't export ZIP.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    const arr = nodes();
    if (!arr.length) return toast.error("No slides to export.");
    setBusy("pdf");
    try {
      await downloadPdf(arr, aspect, baseName);
      toast.success("Exported PDF deck.");
    } catch {
      toast.error("Couldn't export PDF.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 bg-background/60 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={onUndo} disabled={!canUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={onRedo} disabled={!canRedo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⇧⌘Z)</TooltipContent>
        </Tooltip>
        <div className="mx-2 h-6 w-px bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={onSave} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Save project
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save to local storage (⌘S)</TooltipContent>
        </Tooltip>
        {savedAgo && (
          <span className="ml-1 hidden text-[10px] font-medium text-muted-foreground sm:inline">
            · Saved {savedAgo}
          </span>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> AI captions
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <CaptionsTabs input={captionInput} />
          </PopoverContent>
        </Popover>

        <FindReplace slides={slides} onChange={onSlidesChange} />
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={exportPng} disabled={!!busy} className="gap-1.5">
              <FileImage className="h-3.5 w-3.5" />
              {busy === "png" ? "Saving…" : "This slide"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download the active slide as a high-res PNG</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={exportZip} disabled={!!busy} className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {busy === "zip" ? "Zipping…" : "All slides · ZIP"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Download every slide as a ZIP — one PNG per slide, ready to upload to IG / FB
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" onClick={exportPdf} disabled={!!busy} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {busy === "pdf" ? "Building…" : "Full deck · PDF"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Download all slides as a single multi-page PDF (LinkedIn carousel ready)
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function CaptionsTabs({
  input,
}: {
  input: ExportBarProps["captionInput"];
}) {
  const caption = generateCaption(input);
  const tags = generateHashtags(input, 14);

  return (
    <Tabs defaultValue="caption">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="caption" className="gap-1.5">
          <Sparkles className="h-3 w-3" /> Caption
        </TabsTrigger>
        <TabsTrigger value="tags" className="gap-1.5">
          <Hash className="h-3 w-3" /> Hashtags
        </TabsTrigger>
      </TabsList>
      <TabsContent value="caption">
        <Textarea defaultValue={caption} className="min-h-[180px] text-xs" />
        <CopyButton text={caption} label="Copy caption" />
      </TabsContent>
      <TabsContent value="tags">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-md border border-border bg-secondary px-2 py-1 text-xs"
            >
              {t}
            </span>
          ))}
        </div>
        <CopyButton text={tags.join(" ")} label="Copy hashtags" />
      </TabsContent>
    </Tabs>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-3 w-full gap-1.5"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard.");
      }}
    >
      <Copy className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

function relativeTimeAgo(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  return `${hr}h ago`;
}

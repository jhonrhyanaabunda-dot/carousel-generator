"use client";

import { useState } from "react";
import { Download, FileImage, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  downloadAllAsZip,
  downloadPdf,
  downloadSlideJpeg,
  downloadSlideWebp,
} from "@/lib/export";
import type { AspectRatio, Slide } from "@/types";

export interface DownloadMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: Slide[];
  slideRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
  aspect: AspectRatio;
  activeIndex: number;
  brandName?: string;
  // Anchor element the popover should attach to. When null, falls back to a
  // fixed position near the top-right of the viewport (when triggered from
  // the global nav button).
  anchorEl?: HTMLElement | null;
}

// Top-right Download popover that mounts in the generator page but is opened
// by the global site-nav button via a custom event (so the button can live
// outside the editor's React tree).
export function DownloadMenu({
  open,
  onOpenChange,
  slides,
  slideRefs,
  aspect,
  activeIndex,
  brandName,
}: DownloadMenuProps) {
  type Busy = "jpeg" | "webp" | "zip-jpeg" | "zip-webp" | "pdf" | null;
  const [busy, setBusy] = useState<Busy>(null);
  const baseName = (brandName || "carousel")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const nodes = () =>
    (slideRefs?.current?.filter(Boolean) as HTMLDivElement[]) ?? [];

  async function exportJpeg() {
    const node = slideRefs?.current?.[activeIndex];
    if (!node) return toast.error("Slide not ready.");
    setBusy("jpeg");
    try {
      await downloadSlideJpeg(
        node,
        `${baseName}-slide-${String(activeIndex + 1).padStart(2, "0")}.jpg`
      );
      toast.success("Downloaded JPEG.");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't export JPEG.");
    } finally {
      setBusy(null);
    }
  }

  async function exportWebp() {
    const node = slideRefs?.current?.[activeIndex];
    if (!node) return toast.error("Slide not ready.");
    setBusy("webp");
    try {
      await downloadSlideWebp(
        node,
        `${baseName}-slide-${String(activeIndex + 1).padStart(2, "0")}.webp`
      );
      toast.success("Downloaded WebP.");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't export WebP.");
    } finally {
      setBusy(null);
    }
  }

  async function exportZip(format: "jpeg" | "webp") {
    const arr = nodes();
    if (!arr.length) return toast.error("No slides to export.");
    setBusy(format === "webp" ? "zip-webp" : "zip-jpeg");
    try {
      await downloadAllAsZip(arr, baseName, format);
      toast.success(`Exported ${arr.length} slides as ZIP.`);
      onOpenChange(false);
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
      onOpenChange(false);
    } catch {
      toast.error("Couldn't export PDF.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {/* Invisible anchor docked to the top-right of the viewport. The popover
          opens directly underneath the global nav's Download button. */}
      <PopoverAnchor asChild>
        <div
          aria-hidden
          className="pointer-events-none fixed right-6 top-16 h-px w-px"
        />
      </PopoverAnchor>
      <PopoverContent className="w-80 p-2" align="end" sideOffset={4}>
        <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          This slide
        </p>
        <DownloadRow
          icon={<FileImage className="h-4 w-4 text-muted-foreground" />}
          title={busy === "jpeg" ? "Saving…" : "JPEG"}
          subtitle="Universal compatibility · IG / FB / Twitter ready"
          onClick={exportJpeg}
          disabled={!!busy || slides.length === 0}
          busy={busy === "jpeg"}
        />
        <DownloadRow
          icon={<FileImage className="h-4 w-4 text-muted-foreground" />}
          title={busy === "webp" ? "Saving…" : "WebP"}
          subtitle="Modern format · smaller file, same quality"
          onClick={exportWebp}
          disabled={!!busy || slides.length === 0}
          busy={busy === "webp"}
        />
        <p className="px-2 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Full deck
        </p>
        <DownloadRow
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          title={busy === "zip-jpeg" ? "Zipping…" : "All slides (JPEG · ZIP)"}
          subtitle="One JPEG per slide bundled in a ZIP"
          onClick={() => exportZip("jpeg")}
          disabled={!!busy || slides.length === 0}
          busy={busy === "zip-jpeg"}
        />
        <DownloadRow
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          title={busy === "zip-webp" ? "Zipping…" : "All slides (WebP · ZIP)"}
          subtitle="Same bundle, smaller files via WebP"
          onClick={() => exportZip("webp")}
          disabled={!!busy || slides.length === 0}
          busy={busy === "zip-webp"}
        />
        <DownloadRow
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          title={busy === "pdf" ? "Building…" : "PDF deck"}
          subtitle="All slides as one multi-page PDF — LinkedIn ready"
          onClick={exportPdf}
          disabled={!!busy || slides.length === 0}
          busy={busy === "pdf"}
        />
      </PopoverContent>
    </Popover>
  );
}

function DownloadRow({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
  busy,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50",
        busy && "opacity-60"
      )}
    >
      {icon}
      <div className="flex flex-1 flex-col items-start text-left">
        <span className="font-medium">{title}</span>
        <span className="text-[10px] text-muted-foreground">{subtitle}</span>
      </div>
    </button>
  );
}

// Expose Download icon for convenience (so callers don't need a separate import).
export { Download };

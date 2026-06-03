"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
  Aperture,
  ImageIcon,
  Move,
  Paintbrush,
  RotateCcw,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImageFilter } from "@/types";

export interface ImageToolbarProps {
  rect: DOMRect | null;
  // Current values
  currentFilter?: ImageFilter;
  currentBgColor?: string;
  currentTransform?: { x?: number; y?: number; scale?: number; margin?: number };
  // Change handlers
  onFilterChange: (f: ImageFilter | undefined) => void;
  onBgColorChange: (c: string | undefined) => void;
  onTransformChange: (
    t: { x?: number; y?: number; scale?: number; margin?: number } | undefined
  ) => void;
  onReset: () => void;
  onClose: () => void;
}

const FILTERS: { id: ImageFilter; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "bw", label: "B&W" },
  { id: "vintage", label: "Vintage" },
  { id: "vivid", label: "Vivid" },
  { id: "darken", label: "Darken" },
  { id: "brighten", label: "Brighten" },
  { id: "blur", label: "Blur" },
];

const COLOR_SWATCHES = [
  "#0B0D0F", "#2C3038", "#FFFFFF", "#F2EFE9",
  "#1DB954", "#0066B1", "#C3002F", "#003DA5",
  "#D4AF37", "#7C3AED", "#22D3EE", "#F472B6",
  "#FF3B3B", "#FFD60A", "#1F4E47", "#E8DBC8",
];

// Floating image-edit toolbar that appears above the selected image, similar
// to TextStyleToolbar. Lets the user adjust filter / margin / zoom and swap
// to a solid color background without leaving the slide preview.
export function ImageToolbar({
  rect,
  currentFilter,
  currentBgColor,
  currentTransform,
  onFilterChange,
  onBgColorChange,
  onTransformChange,
  onReset,
  onClose,
}: ImageToolbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !rect) return null;

  // Position above the image with a small gap. Flip below if no room above.
  const TOOLBAR_W = 700;
  const TOOLBAR_H = 56;
  const gap = 12;
  let left = rect.left + rect.width / 2 - TOOLBAR_W / 2;
  let top = rect.top - TOOLBAR_H - gap;
  if (top < 12) top = rect.bottom + gap;
  if (left < 12) left = 12;
  if (left + TOOLBAR_W > window.innerWidth - 12) {
    left = window.innerWidth - TOOLBAR_W - 12;
  }

  const t = currentTransform ?? {};
  const setT = (patch: Partial<typeof t>) =>
    onTransformChange({ ...t, ...patch });

  return createPortal(
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 flex items-center gap-1.5 rounded-2xl border border-border bg-popover/95 p-2 shadow-2xl backdrop-blur-md animate-fade-in"
      style={{ left, top, width: TOOLBAR_W, height: TOOLBAR_H }}
    >
      <span className="ml-1 mr-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        Image
      </span>

      {/* Filter quick chips */}
      <div className="flex items-center gap-1">
        {FILTERS.slice(0, 4).map((f) => {
          const active = (currentFilter ?? "none") === f.id;
          return (
            <button
              key={f.id}
              onClick={() =>
                onFilterChange(f.id === "none" ? undefined : f.id)
              }
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground"
              )}
              title={`Filter: ${f.label}`}
            >
              {f.label}
            </button>
          );
        })}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="rounded-md px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-accent"
              title="More filters"
            >
              More ▾
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-2" align="start">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Filter
            </p>
            <div className="grid grid-cols-2 gap-1">
              {FILTERS.map((f) => {
                const active = (currentFilter ?? "none") === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() =>
                      onFilterChange(f.id === "none" ? undefined : f.id)
                    }
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground hover:border-foreground/40"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Zoom + Margin compact sliders */}
      <MiniSlider
        icon={<Move className="h-3 w-3" />}
        label="Zoom"
        value={t.scale ?? 1}
        min={0.5}
        max={3}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => setT({ scale: v })}
      />
      <MiniSlider
        icon={<Aperture className="h-3 w-3" />}
        label="Margin"
        value={t.margin ?? 0}
        min={0}
        max={200}
        step={4}
        format={(v) => `${Math.round(v)}`}
        onChange={(v) => setT({ margin: v })}
      />

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Solid color swap */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 relative"
            title="Use solid color instead of image"
          >
            <Paintbrush className="h-3.5 w-3.5" />
            {currentBgColor && (
              <span
                className="absolute bottom-1.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-sm border border-black/20"
                style={{ background: currentBgColor }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[228px] p-3" align="end">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Solid color
            </span>
            {currentBgColor && (
              <button
                onClick={() => onBgColorChange(undefined)}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {COLOR_SWATCHES.map((c) => {
              const active =
                (currentBgColor ?? "").toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => onBgColorChange(c)}
                  className={cn(
                    "h-6 w-6 rounded-md border transition-transform hover:scale-110",
                    active
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border"
                  )}
                  style={{ background: c }}
                  aria-label={c}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={currentBgColor ?? "#0B0D0F"}
              onChange={(e) => onBgColorChange(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent"
            />
            <input
              type="text"
              value={currentBgColor ?? ""}
              onChange={(e) => onBgColorChange(e.target.value || undefined)}
              placeholder="#0B0D0F"
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono"
            />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Picking a color hides the photo on this slide.
          </p>
        </PopoverContent>
      </Popover>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Reset (clears filter, color, transform) */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onReset}
        className="gap-1.5"
        title="Reset image filter, position, and color"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
    </div>,
    document.body
  );
}

function MiniSlider({
  icon,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1" title={label}>
      <span className="text-muted-foreground">{icon}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
      <span className="w-10 text-right text-[10px] font-mono text-muted-foreground">
        {format(value)}
      </span>
    </div>
  );
}

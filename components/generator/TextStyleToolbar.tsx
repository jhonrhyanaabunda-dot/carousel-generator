"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Bold, Italic, Minus, Plus, RotateCcw, Type } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FONT_OPTIONS, findFontByFamily } from "@/lib/fonts";
import type { ElementStyle } from "@/types";
import { cn } from "@/lib/utils";

export interface TextStyleToolbarProps {
  field: string;
  rect: DOMRect | null;
  style?: ElementStyle;
  defaultFontSize: number;
  defaultFontFamily: string;
  scale: number; // slide CSS scale; needed to translate slide-px → screen-px
  onChange: (next: ElementStyle) => void;
  onReset: () => void;
  onClose: () => void;
}

export function TextStyleToolbar({
  field,
  rect,
  style,
  defaultFontSize,
  defaultFontFamily,
  scale,
  onChange,
  onReset,
  onClose,
}: TextStyleToolbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !rect) return null;

  // Position above the element with a small gap. Clamp into viewport.
  const TOOLBAR_W = 560;
  const TOOLBAR_H = 56;
  const gap = 12;
  let left = rect.left + rect.width / 2 - TOOLBAR_W / 2;
  let top = rect.top - TOOLBAR_H - gap;
  if (top < 12) top = rect.bottom + gap; // flip below if no room above
  if (left < 12) left = 12;
  if (left + TOOLBAR_W > window.innerWidth - 12)
    left = window.innerWidth - TOOLBAR_W - 12;

  const currentFamily = style?.fontFamily ?? defaultFontFamily;
  const currentFont = findFontByFamily(currentFamily) ?? FONT_OPTIONS[0];
  const currentSize = style?.fontSize ?? defaultFontSize;
  const currentWeight = style?.fontWeight ?? (currentFont.weights.includes(700) ? 700 : currentFont.weights[currentFont.weights.length - 1]);
  const isItalic = !!style?.italic;

  const update = (patch: Partial<ElementStyle>) => onChange({ ...style, ...patch });

  // Step the displayed size (in slide-native px). Display value also shows
  // approximate screen size for clarity.
  const stepSize = (delta: number) => {
    const next = Math.max(16, Math.min(600, Math.round(currentSize + delta)));
    update({ fontSize: next });
  };

  return createPortal(
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 flex items-center gap-2 rounded-2xl border border-border bg-popover/95 p-2 shadow-2xl backdrop-blur-md animate-fade-in"
      style={{ left, top, width: TOOLBAR_W, height: TOOLBAR_H }}
    >
      <div className="ml-1 mr-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Type className="h-3 w-3" />
        {field}
      </div>

      {/* Font family */}
      <div className="min-w-[170px] flex-1">
        <Select
          value={currentFont.family}
          onValueChange={(v) => update({ fontFamily: v })}
        >
          <SelectTrigger className="h-9 rounded-lg">
            <SelectValue>
              <span style={{ fontFamily: currentFont.family, fontSize: 14 }}>
                {currentFont.name}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {(["sans", "display", "serif", "mono", "handwritten"] as const).map((cat) => {
              const items = FONT_OPTIONS.filter((f) => f.category === cat);
              if (!items.length) return null;
              return (
                <SelectGroup key={cat}>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {cat}
                  </div>
                  {items.map((f) => (
                    <SelectItem key={f.name} value={f.family}>
                      <span style={{ fontFamily: f.family }}>{f.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Size stepper */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => stepSize(-4)}
          aria-label="Smaller"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <input
          className="w-12 bg-transparent text-center text-xs font-mono outline-none"
          value={Math.round(currentSize)}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) update({ fontSize: Math.max(16, Math.min(600, n)) });
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => stepSize(4)}
          aria-label="Larger"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Weight */}
      <Select
        value={String(currentWeight)}
        onValueChange={(v) => update({ fontWeight: parseInt(v, 10) })}
      >
        <SelectTrigger className="h-9 w-[88px] rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currentFont.weights.map((w) => (
            <SelectItem key={w} value={String(w)}>
              <span style={{ fontWeight: w }}>{weightLabel(w)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Italic toggle */}
      <Button
        size="icon"
        variant={isItalic ? "default" : "outline"}
        className="h-9 w-9"
        onClick={() => update({ italic: !isItalic })}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Reset */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onReset}
        className="gap-1.5"
        title="Reset to layout default"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
    </div>,
    document.body
  );
}

function weightLabel(w: number) {
  if (w <= 300) return "Light";
  if (w === 400) return "Regular";
  if (w === 500) return "Medium";
  if (w === 600) return "Semibold";
  if (w === 700) return "Bold";
  if (w === 800) return "Extrabold";
  return "Black";
}

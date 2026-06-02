"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  Italic,
  Layers,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Type,
  Underline,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { saveCustomFont } from "@/lib/custom-fonts";
import { nanoid } from "nanoid";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { customFontsAsOptions } from "@/lib/custom-fonts";
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
  // Optional: propagate the current style to every slide for the same field.
  // Renders an "Apply to all slides" button when provided.
  onApplyToAll?: () => void;
}

// Curated color palette — common dealership accent + neutrals.
const COLOR_SWATCHES = [
  "#FFFFFF", "#000000", "#0B0D0F", "#2C3038", "#8A919C",
  "#1DB954", "#0066B1", "#C3002F", "#003DA5", "#D4AF37",
  "#E8DBC8", "#7C3AED", "#22D3EE", "#F472B6", "#FF3B3B",
  "#FFD60A", "#1F4E47", "#E53935",
];

export function TextStyleToolbar({
  field,
  rect,
  style,
  defaultFontSize,
  defaultFontFamily,
  onChange,
  onReset,
  onClose,
  onApplyToAll,
}: TextStyleToolbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !rect) return null;

  // Position above the element with a small gap. Clamp into viewport.
  const TOOLBAR_W = onApplyToAll ? 840 : 720;
  const TOOLBAR_H = 56;
  const gap = 12;
  let left = rect.left + rect.width / 2 - TOOLBAR_W / 2;
  let top = rect.top - TOOLBAR_H - gap;
  if (top < 12) top = rect.bottom + gap; // flip below if no room above
  if (left < 12) left = 12;
  if (left + TOOLBAR_W > window.innerWidth - 12)
    left = window.innerWidth - TOOLBAR_W - 12;

  const userFonts = customFontsAsOptions();
  const ALL_FONTS = [...FONT_OPTIONS, ...userFonts];
  const currentFamily = style?.fontFamily ?? defaultFontFamily;
  const currentFont =
    ALL_FONTS.find((f) => f.family === currentFamily) ||
    findFontByFamily(currentFamily) ||
    FONT_OPTIONS[0];
  const currentSize = style?.fontSize ?? defaultFontSize;
  const currentWeight = style?.fontWeight ?? (currentFont.weights.includes(700) ? 700 : currentFont.weights[currentFont.weights.length - 1]);
  const isItalic = !!style?.italic;
  const isUnderline = !!style?.underline;
  const currentAlign = style?.align ?? "left";
  const currentCase = style?.textTransform ?? "none";
  const currentColor = style?.color ?? "#FFFFFF";

  const update = (patch: Partial<ElementStyle>) => onChange({ ...style, ...patch });

  const stepSize = (delta: number) => {
    const next = Math.max(12, Math.min(600, Math.round(currentSize + delta)));
    update({ fontSize: next });
  };

  // Cycle the case button (none → UPPER → lower → Title → none)
  const caseSequence: ElementStyle["textTransform"][] = ["none", "uppercase", "lowercase", "capitalize"];
  const nextCase = () => {
    const idx = caseSequence.indexOf(currentCase as any);
    update({ textTransform: caseSequence[(idx + 1) % caseSequence.length] });
  };

  return createPortal(
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 flex items-center gap-1.5 rounded-2xl border border-border bg-popover/95 p-2 shadow-2xl backdrop-blur-md animate-fade-in"
      style={{ left, top, width: TOOLBAR_W, height: TOOLBAR_H }}
    >
      <div className="ml-1 mr-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Type className="h-3 w-3" />
        {field}
      </div>

      {/* Font family */}
      <div className="min-w-[140px] flex-1">
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
            <div className="px-1 pb-1">
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-secondary/40 px-2 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                <UploadCloud className="h-3 w-3" />
                Upload .woff2 / .woff / .ttf
                <input
                  type="file"
                  accept=".woff2,.woff,.ttf,.otf,font/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const dataUrl = await new Promise<string>(
                        (resolve, reject) => {
                          const r = new FileReader();
                          r.onload = () => resolve(r.result as string);
                          r.onerror = reject;
                          r.readAsDataURL(f);
                        }
                      );
                      const baseName =
                        f.name.replace(/\.(woff2?|ttf|otf)$/i, "") || "Custom Font";
                      const family = `"${baseName}"`;
                      const ext = (
                        f.name.split(".").pop() || ""
                      ).toLowerCase();
                      const format =
                        ext === "ttf" ? "truetype" : ext === "otf" ? "opentype" : ext;
                      saveCustomFont({
                        id: `cf-${nanoid(6)}`,
                        name: baseName,
                        family,
                        dataUrl,
                        format,
                        uploadedAt: Date.now(),
                      });
                      onChange({ ...style, fontFamily: family });
                      toast.success(`Uploaded "${baseName}".`);
                    } catch {
                      toast.error("Couldn't load that font file.");
                    }
                  }}
                />
              </label>
            </div>
            {userFonts.length > 0 && (
              <SelectGroup>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  Your uploads
                </div>
                {userFonts.map((f) => (
                  <SelectItem key={f.name} value={f.family}>
                    <span style={{ fontFamily: f.family }}>{f.name}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
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
      <div className="flex items-center rounded-lg border border-border bg-background">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => stepSize(-4)} aria-label="Smaller">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <input
          className="w-10 bg-transparent text-center text-xs font-mono outline-none"
          value={Math.round(currentSize)}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) update({ fontSize: Math.max(12, Math.min(600, n)) });
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => stepSize(4)} aria-label="Larger">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Weight */}
      <Select
        value={String(currentWeight)}
        onValueChange={(v) => update({ fontWeight: parseInt(v, 10) })}
      >
        <SelectTrigger className="h-9 w-[78px] rounded-lg">
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

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Italic */}
      <Button
        size="icon"
        variant={isItalic ? "default" : "ghost"}
        className="h-9 w-9"
        onClick={() => update({ italic: !isItalic })}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      {/* Underline */}
      <Button
        size="icon"
        variant={isUnderline ? "default" : "ghost"}
        className="h-9 w-9"
        onClick={() => update({ underline: !isUnderline })}
        title="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>

      {/* Case transform — cycles UPPER / lower / Title / none */}
      <Button
        size="icon"
        variant={currentCase !== "none" ? "default" : "ghost"}
        className="h-9 w-9"
        onClick={nextCase}
        title={`Case: ${currentCase === "none" ? "as-typed" : currentCase}`}
      >
        {currentCase === "uppercase" ? <CaseUpper className="h-3.5 w-3.5" /> :
         currentCase === "lowercase" ? <CaseLower className="h-3.5 w-3.5" /> :
         <CaseSensitive className="h-3.5 w-3.5" />}
      </Button>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Text alignment */}
      <div className="flex items-center rounded-lg border border-border bg-background">
        {(["left", "center", "right", "justify"] as const).map((a) => {
          const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : a === "right" ? AlignRight : AlignJustify;
          const active = currentAlign === a;
          return (
            <button
              key={a}
              onClick={() => update({ align: a })}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-md transition-colors",
                active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
              title={`Align ${a}`}
              aria-label={`Align ${a}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 relative"
            title={`Color: ${currentColor}`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span
              className="absolute bottom-1.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-sm border border-black/20"
              style={{ background: currentColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[228px] p-3" align="end">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Color
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => update({ color: c })}
                className={cn(
                  "h-7 w-7 rounded-md border transition-transform hover:scale-110",
                  currentColor.toLowerCase() === c.toLowerCase()
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border"
                )}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => update({ color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent"
            />
            <input
              type="text"
              value={currentColor}
              onChange={(e) => update({ color: e.target.value })}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono"
            />
          </div>
        </PopoverContent>
      </Popover>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Apply to all slides */}
      {onApplyToAll && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onApplyToAll}
          className="gap-1.5"
          title={`Apply these styles to every slide's ${field}`}
        >
          <Layers className="h-3.5 w-3.5" />
          Apply to all
        </Button>
      )}

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

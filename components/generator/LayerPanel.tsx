"use client";

import {
  ChevronDown,
  ChevronUp,
  Circle,
  Image as ImageIcon,
  Layers,
  Minus,
  Square,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Slide } from "@/types";
import { cn } from "@/lib/utils";

export interface LayerPanelProps {
  slide: Slide | undefined;
  selectedField: string | null;
  onSelect: (key: string) => void;
  onDeleteCustomText: (id: string) => void;
  onDeleteCustomShape: (id: string) => void;
}

// Mapping from layout name → which built-in text fields are likely present.
// (We render rows for the ones whose content is non-empty.)
const BUILTIN_FIELDS = ["title", "subtitle", "body", "eyebrow"] as const;

export function LayerPanel({
  slide,
  selectedField,
  onSelect,
  onDeleteCustomText,
  onDeleteCustomShape,
}: LayerPanelProps) {
  if (!slide) return null;

  const builtins = BUILTIN_FIELDS.filter((f) => !!slide.content[f]);
  const customs = slide.customTexts ?? [];
  const shapes = slide.customShapes ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Layers
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
            {builtins.length + customs.length + shapes.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Elements on this slide
        </p>
        <div className="max-h-[60vh] space-y-0.5 overflow-auto">
          {builtins.length > 0 && (
            <>
              <SectionLabel>Layout content</SectionLabel>
              {builtins.map((f) => (
                <Row
                  key={f}
                  icon={<Type className="h-3.5 w-3.5" />}
                  label={f}
                  preview={String(slide.content[f] ?? "")}
                  selected={selectedField === f}
                  onClick={() => onSelect(f)}
                />
              ))}
            </>
          )}

          {customs.length > 0 && (
            <>
              <SectionLabel>Custom text ({customs.length})</SectionLabel>
              {customs.map((ct, i) => (
                <Row
                  key={ct.id}
                  icon={<Type className="h-3.5 w-3.5" />}
                  label={`Text ${i + 1}`}
                  preview={ct.text}
                  selected={selectedField === `custom:${ct.id}`}
                  onClick={() => onSelect(`custom:${ct.id}`)}
                  onDelete={() => onDeleteCustomText(ct.id)}
                />
              ))}
            </>
          )}

          {shapes.length > 0 && (
            <>
              <SectionLabel>Shapes ({shapes.length})</SectionLabel>
              {shapes.map((sh, i) => (
                <Row
                  key={sh.id}
                  icon={
                    sh.kind === "rect" ? <Square className="h-3.5 w-3.5" /> :
                    sh.kind === "line" ? <Minus className="h-3.5 w-3.5" /> :
                    <Circle className="h-3.5 w-3.5" />
                  }
                  label={`${capitalize(sh.kind)} ${i + 1}`}
                  preview={`${sh.color} · ${Math.round(sh.width)}×${Math.round(sh.height)}`}
                  selected={selectedField === `shape:${sh.id}`}
                  onClick={() => onSelect(`shape:${sh.id}`)}
                  onDelete={() => onDeleteCustomShape(sh.id)}
                />
              ))}
            </>
          )}

          {slide.content.imageUrl && (
            <>
              <SectionLabel>Background</SectionLabel>
              <Row
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                label="Background image"
                preview={
                  slide.content.imageFilter
                    ? `Filter: ${slide.content.imageFilter}`
                    : "no filter"
                }
                selected={false}
                muted
              />
            </>
          )}

          {builtins.length + customs.length + shapes.length === 0 && (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              Nothing on this slide yet. Add text or shapes from the toolbar.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  icon,
  label,
  preview,
  selected,
  muted,
  onClick,
  onDelete,
}: {
  icon: React.ReactNode;
  label: string;
  preview?: string;
  selected: boolean;
  muted?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  const Container: any = onClick ? "button" : "div";
  return (
    <Container
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        selected
          ? "bg-primary/15 text-foreground ring-1 ring-primary/40"
          : muted
          ? "text-muted-foreground"
          : "hover:bg-accent"
      )}
    >
      <span className={cn(selected ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold capitalize">{label}</span>
        {preview && (
          <span className="block truncate text-[10px] text-muted-foreground">
            {preview}
          </span>
        )}
      </span>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="invisible grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:visible"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </Container>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </div>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

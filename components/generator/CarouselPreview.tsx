"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  GripVertical,
  ImageIcon,
  ImagePlus,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ASPECT_RATIOS, type AspectRatio, type ElementStyle, type Slide, type TemplateTheme } from "@/types";
import { SlideRenderer } from "@/components/slides/SlideRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, readFileAsDataURL } from "@/lib/utils";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { TextStyleToolbar } from "./TextStyleToolbar";

export interface CarouselPreviewProps {
  slides: Slide[];
  template: TemplateTheme;
  aspect: AspectRatio;
  onSlidesChange: (next: Slide[]) => void;
  onRegenerate: () => void;
  loading?: boolean;
  // ref returned for export — outer element of each slide
  slideRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
  brandName?: string;
  // pool of images uploaded in InputPanel; offered as quick swap options
  projectImages?: string[];
  // append a freshly uploaded image to the project pool
  onAddProjectImage?: (dataUrl: string) => void;
  // notify parent (generator page) so we can sync active slide for export
  onActiveChange?: (idx: number) => void;
}

export function CarouselPreview({
  slides,
  template,
  aspect,
  onSlidesChange,
  onRegenerate,
  loading,
  slideRefs,
  brandName,
  projectImages = [],
  onAddProjectImage,
  onActiveChange,
}: CarouselPreviewProps) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState(true);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);

  // Clear text selection when switching slides.
  useEffect(() => {
    setSelectedField(null);
    setSelectedRect(null);
  }, [active]);

  // Notify the parent of the current active index. Done in an effect (not
  // inside the state updater) so we don't dispatch a parent setState while
  // React is rendering this component.
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerW(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Listen to "apply-accent" custom event from InputPanel palette swatches
  useEffect(() => {
    const handler = (e: Event) => {
      const accent = (e as CustomEvent).detail as string;
      onSlidesChange(
        slides.map((s) => ({ ...s, overrides: { ...s.overrides, accent } }))
      );
    };
    window.addEventListener("apply-accent", handler);
    return () => window.removeEventListener("apply-accent", handler);
  }, [slides, onSlidesChange]);

  const dims = ASPECT_RATIOS[aspect];
  const baseScale = useMemo(() => {
    if (!containerW) return 0.4;
    const targetW = Math.min(containerW - 40, 600);
    return (targetW / dims.w) * zoom;
  }, [containerW, dims.w, zoom]);
  const previewWidth = dims.w * baseScale;

  const goPrev = () => setActive((a) => Math.max(0, a - 1));
  const goNext = () => setActive((a) => Math.min(slides.length - 1, a + 1));

  const updateSlide = (idx: number, patch: Partial<Slide>) => {
    const next = slides.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onSlidesChange(next);
  };

  const updateContent = (idx: number, key: string, value: string) => {
    const next = slides.map((s, i) =>
      i === idx ? { ...s, content: { ...s.content, [key]: value } } : s
    );
    onSlidesChange(next);
  };

  const duplicateSlide = (idx: number) => {
    const copy: Slide = { ...slides[idx], id: nanoid(8) };
    const next = [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
    onSlidesChange(next);
    setActive(idx + 1);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 2) return;
    const next = slides.filter((_, i) => i !== idx);
    onSlidesChange(next);
    setActive(Math.max(0, Math.min(idx, next.length - 1)));
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    const arr = [...slides];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onSlidesChange(arr);
    setActive(to);
  };

  const setSlideStyle = (idx: number, key: string, style: ElementStyle) => {
    const next = slides.map((s, i) =>
      i === idx
        ? {
            ...s,
            overrides: {
              ...s.overrides,
              styles: { ...s.overrides?.styles, [key]: style },
            },
          }
        : s
    );
    onSlidesChange(next);
  };

  const resetSlideStyle = (idx: number, key: string) => {
    const next = slides.map((s, i) => {
      if (i !== idx) return s;
      const styles = { ...s.overrides?.styles };
      delete styles[key];
      return { ...s, overrides: { ...s.overrides, styles } };
    });
    onSlidesChange(next);
  };

  const setSlidePosition = (
    idx: number,
    key: string,
    pos: { x: number; y: number }
  ) => {
    const next = slides.map((s, i) =>
      i === idx
        ? {
            ...s,
            overrides: {
              ...s.overrides,
              positions: { ...s.overrides?.positions, [key]: pos },
            },
          }
        : s
    );
    onSlidesChange(next);
  };

  const setSlideImage = (idx: number, url: string | undefined) => {
    const next = slides.map((s, i) =>
      i === idx
        ? {
            ...s,
            content: { ...s.content, imageUrl: url },
            overrides: { ...s.overrides, imageLocked: true },
          }
        : s
    );
    onSlidesChange(next);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-background/40 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={loading} className="gap-1.5">
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Regenerate
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate a new variation (R)</TooltipContent>
          </Tooltip>
          <div className="ml-2 hidden items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs sm:flex">
            <span className="font-bold uppercase tracking-widest text-muted-foreground">
              {ASPECT_RATIOS[aspect].label}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold">{slides.length} slides</span>
          </div>
          {slides[active] && (
            <SlideImagePicker
              currentUrl={slides[active]?.content.imageUrl}
              projectImages={projectImages}
              onPick={(url) => setSlideImage(active, url)}
              onRemove={() => setSlideImage(active, undefined)}
              onAddProjectImage={onAddProjectImage}
              activeIndex={active}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border px-2 py-1 sm:flex">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Slider
              className="w-32"
              min={0.5}
              max={1.5}
              step={0.05}
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <span className="w-10 text-right text-xs text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={editing ? "default" : "outline"}
                onClick={() => setEditing((e) => !e)}
                className="gap-1.5"
              >
                {editing ? <Lock className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {editing ? "Editing" : "Preview"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle inline text editing (E)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stage */}
      <div ref={containerRef} className="flex flex-1 items-center justify-center p-4">
        <div className="flex w-full items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onClick={goPrev}
            disabled={active === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="relative mx-auto" style={{ width: previewWidth }}>
            <AnimatePresence mode="wait">
              {loading ? (
                <SkeletonStage key="loading" aspect={aspect} width={previewWidth} />
              ) : slides.length === 0 ? (
                <EmptyState key="empty" />
              ) : (
                <motion.div
                  key={slides[active]?.id ?? active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl shadow-card"
                >
                  <SlideRenderer
                    slide={slides[active]}
                    template={template}
                    aspect={aspect}
                    index={active}
                    total={slides.length}
                    width={previewWidth}
                    editable={editing}
                    onTextEdit={(field, value) => updateContent(active, field, value)}
                    onPositionChange={(key, pos) => setSlidePosition(active, key, pos)}
                    selectedField={selectedField}
                    onSelectField={setSelectedField}
                    onSelectedRect={setSelectedRect}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden full-resolution slides for export */}
            <div
              aria-hidden
              className="pointer-events-none fixed -left-[10000px] top-0 opacity-0"
            >
              {slides.map((s, i) => (
                <SlideRenderer
                  key={"export-" + s.id}
                  ref={(el) => {
                    if (slideRefs?.current) slideRefs.current[i] = el;
                  }}
                  slide={s}
                  template={template}
                  aspect={aspect}
                  index={i}
                  total={slides.length}
                  width={ASPECT_RATIOS[aspect].w}
                />
              ))}
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onClick={goNext}
            disabled={active >= slides.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Filmstrip */}
      <div className="border-t border-border/80 bg-background/40 backdrop-blur">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-3 p-4">
            {slides.map((s, i) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(i);
                  }
                }}
                className={cn(
                  "group relative shrink-0 cursor-pointer overflow-hidden rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === active
                    ? "border-primary shadow-glow"
                    : "border-border hover:border-foreground/40"
                )}
                style={{ width: 140 }}
              >
                <SlideRenderer
                  slide={s}
                  template={template}
                  aspect={aspect}
                  index={i}
                  total={slides.length}
                  width={140}
                />
                <div className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 p-1 opacity-0 transition-opacity",
                    "group-hover:opacity-100"
                  )}
                >
                  <Mini
                    icon={<GripVertical className="h-3 w-3 rotate-90" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSlide(i, i - 1);
                    }}
                    title="Move up"
                  />
                  <Mini
                    icon={<GripVertical className="h-3 w-3 -rotate-90" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSlide(i, i + 1);
                    }}
                    title="Move down"
                  />
                  <Mini
                    icon={<Copy className="h-3 w-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateSlide(i);
                    }}
                    title="Duplicate"
                  />
                  <Mini
                    icon={<Trash2 className="h-3 w-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(i);
                    }}
                    title="Delete"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const last = slides[slides.length - 1];
                if (!last) return;
                duplicateSlide(slides.length - 1);
              }}
              className="grid h-[176px] w-[140px] shrink-0 place-items-center rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* Floating per-element text style toolbar */}
      {selectedField && slides[active] && (
        <TextStyleToolbar
          field={selectedField}
          rect={selectedRect}
          style={slides[active].overrides?.styles?.[selectedField]}
          defaultFontSize={defaultFontSizeFor(selectedField, aspect)}
          defaultFontFamily={
            ["title", "stat-label"].includes(selectedField)
              ? template.fonts.display
              : template.fonts.body
          }
          scale={baseScale}
          onChange={(next) => setSlideStyle(active, selectedField, next)}
          onReset={() => {
            resetSlideStyle(active, selectedField);
            setSelectedField(null);
          }}
          onClose={() => setSelectedField(null)}
        />
      )}
    </div>
  );
}

function defaultFontSizeFor(field: string, aspect: AspectRatio): number {
  // Match the same shortest-side scaling used by SlideRenderer so the toolbar
  // shows the same default size the layout actually rendered with.
  const dims = ASPECT_RATIOS[aspect];
  const minSide = Math.min(dims.w, dims.h);
  switch (field) {
    case "title":
      return Math.round(Math.max(96, minSide * 0.122));
    case "subtitle":
      return Math.round(Math.max(28, minSide * 0.035));
    case "body":
      return Math.round(Math.max(24, minSide * 0.03));
    case "eyebrow":
      return Math.round(Math.max(12, minSide * 0.013));
    default:
      return 32;
  }
}

function SlideImagePicker({
  currentUrl,
  projectImages,
  onPick,
  onRemove,
  onAddProjectImage,
  activeIndex,
}: {
  currentUrl?: string;
  projectImages: string[];
  onPick: (url: string) => void;
  onRemove: () => void;
  onAddProjectImage?: (dataUrl: string) => void;
  activeIndex: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const url = await readFileAsDataURL(files[0]);
      onPick(url);
      onAddProjectImage?.(url);
      toast.success("Image set as background.");
    } catch {
      toast.error("Couldn't read that image.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          {currentUrl ? <ImageIcon className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {currentUrl ? "Background" : "Add image"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Slide {String(activeIndex + 1).padStart(2, "0")} background
          </p>
          {currentUrl && (
            <button
              onClick={onRemove}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          )}
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 p-3 text-xs font-medium transition-colors hover:border-primary hover:bg-secondary"
        >
          <Upload className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
          Upload new image
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files)}
          />
        </button>

        {projectImages.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Or pick from project images
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {projectImages.map((url, i) => {
                const isActive = url === currentUrl;
                return (
                  <button
                    key={i}
                    onClick={() => onPick(url)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-md border transition-all",
                      isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-foreground/40"
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Mini({
  icon,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-white hover:bg-white/20"
    >
      {icon}
    </button>
  );
}

function SkeletonStage({ aspect, width }: { aspect: AspectRatio; width: number }) {
  const dims = ASPECT_RATIOS[aspect];
  const height = (dims.h / dims.w) * width;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex items-center justify-center"
    >
      <div className="relative overflow-hidden rounded-2xl shadow-card" style={{ width, height }}>
        <Skeleton className="absolute inset-0 rounded-2xl" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/20 animate-pulse-soft">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Composing your slides…
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
        <Eye className="h-6 w-6" />
      </div>
      <div className="font-semibold text-foreground">Nothing here yet</div>
      <div className="max-w-sm text-sm">
        Fill in your headline and body, pick a template, then hit{" "}
        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
          Generate
        </span>{" "}
        to compose your first carousel.
      </div>
    </div>
  );
}

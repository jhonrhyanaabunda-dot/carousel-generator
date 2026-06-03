"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Download,
  Eye,
  FileImage,
  FileText,
  GripVertical,
  ImageIcon,
  ImagePlus,
  Lock,
  Minus as MinusIcon,
  Move,
  Package,
  Plus,
  RefreshCw,
  Shapes,
  Smartphone,
  Square,
  Trash2,
  Type,
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
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type CustomShapeElement,
  type CustomTextElement,
  type ElementStyle,
  type ShapeKind,
  type Slide,
  type TemplateTheme,
} from "@/types";
import { SlideRenderer } from "@/components/slides/SlideRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, readFileAsDataURL } from "@/lib/utils";
import { downloadAllAsZip, downloadPdf, downloadSlideJpeg } from "@/lib/export";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { TextStyleToolbar } from "./TextStyleToolbar";
import { SocialPreview } from "./SocialPreview";
import { LayerPanel } from "./LayerPanel";

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
  // Toggle between the editor stage and the social-feed mockup preview.
  const [feedPreview, setFeedPreview] = useState(false);
  // When true, show a slim slider dock BELOW the slide for adjusting the
  // active slide's image position / zoom / margin. Lives outside the
  // Background popover so it doesn't cover the image being edited.
  const [imagePosOpen, setImagePosOpen] = useState(false);

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

  // Keyboard shortcuts scoped to a selected element:
  //   • Delete / Backspace → remove custom-text element
  //   • Arrow keys → nudge selected element (any element) by 1px; Shift = 10px
  //   • Cmd/Ctrl + D → duplicate selected custom-text element
  // All shortcuts are skipped while the user is typing inside a
  // contenteditable so they don't fight normal text editing.
  useEffect(() => {
    if (!selectedField) return;

    const isCustom = selectedField.startsWith("custom:");
    const isShape = selectedField.startsWith("shape:");
    const customId = isCustom ? selectedField.slice(7) : null;
    const shapeId = isShape ? selectedField.slice(6) : null;

    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const typing = !!ae && ae.isContentEditable;

      // Delete / Backspace — removes custom text or shape, but never while typing.
      if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        if (isCustom) {
          deleteCustomText(active, customId!);
          e.preventDefault();
          return;
        }
        if (isShape) {
          deleteCustomShape(active, shapeId!);
          e.preventDefault();
          return;
        }
      }

      // Cmd/Ctrl + D — duplicate custom text only (shapes don't dup yet).
      if (isCustom && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        const ct = slides[active]?.customTexts?.find((c) => c.id === customId);
        if (ct) {
          const id = nanoid(6);
          const next = slides.map((s, i) =>
            i === active
              ? {
                  ...s,
                  customTexts: [
                    ...(s.customTexts ?? []),
                    { ...ct, id, x: ct.x + 24, y: ct.y + 24 },
                  ],
                }
              : s
          );
          onSlidesChange(next);
          setSelectedField(`custom:${id}`);
          e.preventDefault();
        }
        return;
      }

      // Arrow nudge — works for any selected element (text, custom, shape).
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const delta = arrows[e.key];
      if (!delta || typing) return;
      const step = e.shiftKey ? 10 : 1;
      const dx = delta[0] * step;
      const dy = delta[1] * step;
      if (isCustom) {
        const ct = slides[active]?.customTexts?.find((c) => c.id === customId);
        if (!ct) return;
        updateCustomText(active, customId!, { x: ct.x + dx, y: ct.y + dy });
        e.preventDefault();
      } else if (isShape) {
        const sh = slides[active]?.customShapes?.find((c) => c.id === shapeId);
        if (!sh) return;
        updateCustomShape(active, shapeId!, { x: sh.x + dx, y: sh.y + dy });
        e.preventDefault();
      } else {
        const current =
          slides[active]?.overrides?.positions?.[selectedField] ?? { x: 0, y: 0 };
        setSlidePosition(active, selectedField, {
          x: current.x + dx,
          y: current.y + dy,
        });
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedField, active, slides]);
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

  // Propagate the current element's style to every slide for the same field.
  // Custom (freeform) text elements aren't shared by ID across slides, so the
  // button is hidden for them (returned undefined → toolbar hides it).
  const applyStyleToAllSlides = (key: string, style: ElementStyle) => {
    if (key.startsWith("custom:")) return; // custom text is per-slide
    const next = slides.map((s) => ({
      ...s,
      overrides: {
        ...s.overrides,
        styles: { ...s.overrides?.styles, [key]: style },
      },
    }));
    onSlidesChange(next);
    toast.success(`Applied to all ${slides.length} slides.`);
  };

  const setSlideStyle = (idx: number, key: string, style: ElementStyle) => {
    // Style of a freeform custom-text element lives on the element itself,
    // not in slide.overrides.styles. Route accordingly.
    if (key.startsWith("custom:")) {
      const id = key.slice(7);
      updateCustomText(idx, id, { style });
      return;
    }
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
    if (key.startsWith("custom:")) {
      const id = key.slice(7);
      updateCustomText(idx, id, { style: undefined });
      return;
    }
    const next = slides.map((s, i) => {
      if (i !== idx) return s;
      const styles = { ...s.overrides?.styles };
      delete styles[key];
      return { ...s, overrides: { ...s.overrides, styles } };
    });
    onSlidesChange(next);
  };

  // ---- Custom (freeform) text element helpers ----

  const addCustomText = (idx: number) => {
    const dims = ASPECT_RATIOS[aspect];
    const id = nanoid(6);
    const newEl: CustomTextElement = {
      id,
      text: "New text",
      x: Math.round(dims.w / 2 - 120),
      y: Math.round(dims.h / 2 - 28),
    };
    const next = slides.map((s, i) =>
      i === idx
        ? { ...s, customTexts: [...(s.customTexts ?? []), newEl] }
        : s
    );
    onSlidesChange(next);
    setSelectedField(`custom:${id}`);
  };

  const updateCustomText = (
    idx: number,
    id: string,
    patch: Partial<CustomTextElement>
  ) => {
    const next = slides.map((s, i) => {
      if (i !== idx) return s;
      const updated = (s.customTexts ?? []).map((ct) =>
        ct.id === id ? { ...ct, ...patch } : ct
      );
      return { ...s, customTexts: updated };
    });
    onSlidesChange(next);
  };

  const deleteCustomText = (idx: number, id: string) => {
    const next = slides.map((s, i) => {
      if (i !== idx) return s;
      const filtered = (s.customTexts ?? []).filter((ct) => ct.id !== id);
      return { ...s, customTexts: filtered };
    });
    onSlidesChange(next);
    setSelectedField(null);
    setSelectedRect(null);
  };

  // ---- Custom shape helpers ----

  const addCustomShape = (idx: number, kind: ShapeKind) => {
    const dims = ASPECT_RATIOS[aspect];
    const id = nanoid(6);
    const center = { x: Math.round(dims.w / 2), y: Math.round(dims.h / 2) };
    const defaults: Record<ShapeKind, Partial<CustomShapeElement>> = {
      rect: { width: 240, height: 160, color: "#FFFFFF", outline: true, borderWidth: 3 },
      line: { width: 360, height: 2, color: "#FFFFFF", borderWidth: 2 },
      circle: { width: 160, height: 160, color: "#1DB954", outline: false },
    };
    const d = defaults[kind];
    const w = d.width ?? 200;
    const h = d.height ?? 200;
    const newEl: CustomShapeElement = {
      id,
      kind,
      x: center.x - w / 2,
      y: center.y - h / 2,
      width: w,
      height: h,
      color: d.color ?? "#FFFFFF",
      outline: d.outline,
      borderWidth: d.borderWidth,
    };
    const next = slides.map((s, i) =>
      i === idx
        ? { ...s, customShapes: [...(s.customShapes ?? []), newEl] }
        : s
    );
    onSlidesChange(next);
    setSelectedField(`shape:${id}`);
  };

  const updateCustomShape = (
    idx: number,
    id: string,
    patch: Partial<CustomShapeElement>
  ) => {
    const next = slides.map((s, i) => {
      if (i !== idx) return s;
      const updated = (s.customShapes ?? []).map((sh) =>
        sh.id === id ? { ...sh, ...patch } : sh
      );
      return { ...s, customShapes: updated };
    });
    onSlidesChange(next);
  };

  const deleteCustomShape = (idx: number, id: string) => {
    const next = slides.map((s, i) => {
      if (i !== idx) return s;
      const filtered = (s.customShapes ?? []).filter((sh) => sh.id !== id);
      return { ...s, customShapes: filtered };
    });
    onSlidesChange(next);
    setSelectedField(null);
    setSelectedRect(null);
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

  const setSlideFilter = (
    idx: number,
    filter: import("@/types").ImageFilter | undefined
  ) => {
    const next = slides.map((s, i) =>
      i === idx
        ? { ...s, content: { ...s.content, imageFilter: filter } }
        : s
    );
    onSlidesChange(next);
  };

  const setSlideBgColor = (idx: number, color: string | undefined) => {
    const next = slides.map((s, i) =>
      i === idx ? { ...s, content: { ...s.content, bgColor: color } } : s
    );
    onSlidesChange(next);
  };

  const setSlideTransform = (
    idx: number,
    transform:
      | { x?: number; y?: number; scale?: number; margin?: number }
      | undefined
  ) => {
    const next = slides.map((s, i) =>
      i === idx
        ? { ...s, content: { ...s.content, imageTransform: transform } }
        : s
    );
    onSlidesChange(next);
  };

  const setLogoPosition = (idx: number, x: number, y: number) => {
    const next = slides.map((s, i) =>
      i === idx
        ? { ...s, content: { ...s.content, logoPosition: { x, y } } }
        : s
    );
    onSlidesChange(next);
  };

  const setLogoScale = (idx: number, scale: number | undefined) => {
    const next = slides.map((s, i) =>
      i === idx ? { ...s, content: { ...s.content, logoScale: scale } } : s
    );
    onSlidesChange(next);
  };

  // Reset a slide to its layout default: clears all overrides (positions,
  // styles, image-lock) and removes custom text elements. Keeps the
  // generated content (title/subtitle/body/image) intact.
  const resetSlide = (idx: number) => {
    const next = slides.map((s, i) => {
      if (i !== idx) return s;
      return {
        ...s,
        overrides: { accent: s.overrides?.accent, align: s.overrides?.align },
        customTexts: [],
        customShapes: [],
        content: {
          ...s.content,
          imageFilter: undefined,
          bgColor: undefined,
          imageTransform: undefined,
          logoPosition: undefined,
          logoScale: undefined,
        },
      };
    });
    onSlidesChange(next);
    toast.success("Slide reset to defaults.");
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
            <>
              <SlideImagePicker
                currentUrl={slides[active]?.content.imageUrl}
                projectImages={projectImages}
                onPick={(url) => setSlideImage(active, url)}
                onRemove={() => setSlideImage(active, undefined)}
                onAddProjectImage={onAddProjectImage}
                activeIndex={active}
                currentFilter={slides[active]?.content.imageFilter}
                onFilterChange={(f) => setSlideFilter(active, f)}
                currentBgColor={slides[active]?.content.bgColor}
                onBgColorChange={(c) => setSlideBgColor(active, c)}
                currentTransform={slides[active]?.content.imageTransform}
                onTransformChange={(t) => setSlideTransform(active, t)}
                hasLogo={!!slides[active]?.content.brandLogoUrl}
                currentLogoScale={slides[active]?.content.logoScale}
                onLogoScaleChange={(s) => setLogoScale(active, s)}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addCustomText(active)}
                    className="gap-1.5"
                  >
                    <Type className="h-3.5 w-3.5" />
                    Add text
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Drop a free text element on this slide
                </TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Shapes className="h-3.5 w-3.5" />
                    Add shape
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Add shape
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => addCustomShape(active, "rect")}
                      className="grid place-items-center gap-1 rounded-md border border-border bg-card p-3 text-[10px] font-semibold hover:border-primary"
                      title="Rectangle (outlined)"
                    >
                      <Square className="h-4 w-4" />
                      Rect
                    </button>
                    <button
                      onClick={() => addCustomShape(active, "line")}
                      className="grid place-items-center gap-1 rounded-md border border-border bg-card p-3 text-[10px] font-semibold hover:border-primary"
                      title="Divider line"
                    >
                      <MinusIcon className="h-4 w-4" />
                      Line
                    </button>
                    <button
                      onClick={() => addCustomShape(active, "circle")}
                      className="grid place-items-center gap-1 rounded-md border border-border bg-card p-3 text-[10px] font-semibold hover:border-primary"
                      title="Circle"
                    >
                      <Circle className="h-4 w-4" />
                      Circle
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resetSlide(active)}
                    className="gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset slide
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Clear overrides, custom texts, filters, and bg color on this slide
                </TooltipContent>
              </Tooltip>

              {slides[active]?.content.imageUrl &&
                !slides[active]?.content.bgColor && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={imagePosOpen ? "default" : "outline"}
                        onClick={() => setImagePosOpen((v) => !v)}
                        className="gap-1.5"
                      >
                        <Move className="h-3.5 w-3.5" />
                        Position
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Fine-tune the image position, zoom, and margin (slider
                      strip docks below the slide so it doesn&apos;t cover it)
                    </TooltipContent>
                  </Tooltip>
                )}

              <LayerPanel
                slide={slides[active]}
                selectedField={selectedField}
                onSelect={setSelectedField}
                onDeleteCustomText={(id) => deleteCustomText(active, id)}
                onDeleteCustomShape={(id) => deleteCustomShape(active, id)}
              />
            </>
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
                disabled={feedPreview}
              >
                {editing ? <Lock className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {editing ? "Editing" : "Preview"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle inline text editing (E)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={feedPreview ? "default" : "outline"}
                onClick={() => {
                  setFeedPreview((v) => !v);
                  setSelectedField(null);
                }}
                className="gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                {feedPreview ? "Back to editor" : "Feed preview"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              See this carousel inside an IG / FB / LinkedIn feed mockup
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stage — editor view OR feed-preview view */}
      {feedPreview ? (
        <div className="flex-1 overflow-auto p-4">
          <SocialPreview
            slides={slides}
            template={template}
            aspect={aspect}
            active={active}
            onActiveChange={setActive}
            brandName={brandName}
            headline={slides[active]?.content.title ?? ""}
            subtitle={slides[active]?.content.subtitle ?? ""}
            body={slides[active]?.content.body ?? ""}
          />
        </div>
      ) : (
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
                    onCustomTextChange={(id, text) =>
                      updateCustomText(active, id, { text })
                    }
                    onCustomTextMove={(id, x, y) =>
                      updateCustomText(active, id, { x, y })
                    }
                    onCustomShapeMove={(id, x, y) =>
                      updateCustomShape(active, id, { x, y })
                    }
                    onImageTransformChange={(t) => setSlideTransform(active, t)}
                    onLogoMove={(x, y) => setLogoPosition(active, x, y)}
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
      )}

      {/* Image position dock — opens via the toolbar "Position" button.
          Stays below the slide so it doesn't cover the image being edited. */}
      {!feedPreview &&
        imagePosOpen &&
        slides[active]?.content.imageUrl &&
        !slides[active]?.content.bgColor && (
          <ImagePositionDock
            transform={slides[active].content.imageTransform}
            onChange={(t) => setSlideTransform(active, t)}
            onClose={() => setImagePosOpen(false)}
          />
        )}

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
                    icon={<ImagePlus className="h-3 w-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Jump to this slide and open the Background picker
                      // (the picker button is in the toolbar — selecting the
                      // slide focuses it, then user clicks the toolbar btn).
                      setActive(i);
                      // Programmatic file dialog for this slide:
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = async () => {
                        const f = input.files?.[0];
                        if (!f) return;
                        try {
                          const url = await readFileAsDataURL(f);
                          setSlideImage(i, url);
                          onAddProjectImage?.(url);
                          toast.success("Image set as background.");
                        } catch {
                          toast.error("Couldn't read that image.");
                        }
                      };
                      input.click();
                    }}
                    title="Change background image"
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
      {selectedField && slides[active] && (() => {
        // Custom (freeform) text style lives on the element itself.
        const isCustom = selectedField.startsWith("custom:");
        const customId = isCustom ? selectedField.slice(7) : null;
        const customEl =
          customId !== null
            ? slides[active].customTexts?.find((c) => c.id === customId)
            : null;
        const style = isCustom
          ? customEl?.style
          : slides[active].overrides?.styles?.[selectedField];
        const label = isCustom ? "text" : selectedField;
        return (
          <TextStyleToolbar
            field={label}
            rect={selectedRect}
            style={style}
            defaultFontSize={
              isCustom
                ? customEl?.style?.fontSize ?? 56
                : defaultFontSizeFor(selectedField, aspect)
            }
            defaultFontFamily={
              isCustom
                ? customEl?.style?.fontFamily ?? template.fonts.body
                : ["title", "stat-label"].includes(selectedField)
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
            onApplyToAll={
              isCustom
                ? undefined
                : () =>
                    applyStyleToAllSlides(
                      selectedField,
                      style ?? {}
                    )
            }
          />
        );
      })()}
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
  currentFilter,
  onFilterChange,
  currentBgColor,
  onBgColorChange,
  currentTransform,
  onTransformChange,
  hasLogo,
  currentLogoScale,
  onLogoScaleChange,
}: {
  currentUrl?: string;
  projectImages: string[];
  onPick: (url: string) => void;
  onRemove: () => void;
  onAddProjectImage?: (dataUrl: string) => void;
  activeIndex: number;
  currentFilter?: import("@/types").ImageFilter;
  onFilterChange?: (f: import("@/types").ImageFilter | undefined) => void;
  currentBgColor?: string;
  onBgColorChange?: (c: string | undefined) => void;
  currentTransform?: { x?: number; y?: number; scale?: number; margin?: number };
  onTransformChange?: (
    t: { x?: number; y?: number; scale?: number; margin?: number } | undefined
  ) => void;
  hasLogo?: boolean;
  currentLogoScale?: number;
  onLogoScaleChange?: (s: number | undefined) => void;
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

        {/* Image filter presets — only meaningful when there's an image */}
        {onFilterChange && currentUrl && !currentBgColor && (
          <>
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Image filter
            </p>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  { id: "none" as const, label: "Original" },
                  { id: "bw" as const, label: "B&W" },
                  { id: "vintage" as const, label: "Vintage" },
                  { id: "vivid" as const, label: "Vivid" },
                  { id: "darken" as const, label: "Darken" },
                  { id: "brighten" as const, label: "Brighten" },
                  { id: "blur" as const, label: "Blur" },
                ]
              ).map((f) => {
                const isActive = (currentFilter ?? "none") === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() =>
                      onFilterChange(f.id === "none" ? undefined : f.id)
                    }
                    className={cn(
                      "rounded-md border px-1.5 py-1.5 text-[10px] font-semibold transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-foreground/40"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Image position / zoom / margin — also available as a docked strip
            below the slide via the toolbar "Position" button if this popover
            ever covers the image you're trying to adjust. */}
        {onTransformChange && currentUrl && !currentBgColor && (
          <>
            <div className="mb-2 mt-4 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Image position
              </span>
              {(currentTransform?.x ||
                currentTransform?.y ||
                (currentTransform?.scale && currentTransform.scale !== 1) ||
                currentTransform?.margin) && (
                <button
                  onClick={() => onTransformChange(undefined)}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              <PositionSlider
                label="Horizontal"
                value={currentTransform?.x ?? 0}
                min={-600}
                max={600}
                step={4}
                onChange={(v) =>
                  onTransformChange({ ...currentTransform, x: v })
                }
              />
              <PositionSlider
                label="Vertical"
                value={currentTransform?.y ?? 0}
                min={-600}
                max={600}
                step={4}
                onChange={(v) =>
                  onTransformChange({ ...currentTransform, y: v })
                }
              />
              <PositionSlider
                label="Zoom"
                value={currentTransform?.scale ?? 1}
                min={0.5}
                max={3}
                step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) =>
                  onTransformChange({ ...currentTransform, scale: v })
                }
              />
              <PositionSlider
                label="Margin"
                value={currentTransform?.margin ?? 0}
                min={0}
                max={200}
                step={4}
                format={(v) => `${Math.round(v)}px`}
                onChange={(v) =>
                  onTransformChange({ ...currentTransform, margin: v })
                }
              />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Or drag the image directly. Use the toolbar&apos;s{" "}
              <span className="font-semibold text-foreground">Position</span>{" "}
              button if this popover covers what you&apos;re editing.
            </p>
          </>
        )}

        {/* Brand logo size — only when a logo is set on this slide */}
        {onLogoScaleChange && hasLogo && (
          <>
            <div className="mb-2 mt-4 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Logo size
              </span>
              {currentLogoScale !== undefined && currentLogoScale !== 1 && (
                <button
                  onClick={() => onLogoScaleChange(undefined)}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
            <PositionSlider
              label="Scale"
              value={currentLogoScale ?? 1}
              min={0.4}
              max={2.5}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onLogoScaleChange(v)}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Drag the corner logo on the slide to reposition it.
            </p>
          </>
        )}

        {/* Solid color background — replaces the image when set */}
        {onBgColorChange && (
          <>
            <p className="mb-2 mt-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Or use solid color</span>
              {currentBgColor && (
                <button
                  onClick={() => onBgColorChange(undefined)}
                  className="inline-flex items-center gap-1 normal-case tracking-normal text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </p>
            <div className="grid grid-cols-8 gap-1">
              {[
                "#0B0D0F", "#2C3038", "#FFFFFF", "#F2EFE9",
                "#1DB954", "#0066B1", "#C3002F", "#003DA5",
                "#D4AF37", "#7C3AED", "#22D3EE", "#F472B6",
                "#FF3B3B", "#FFD60A", "#1F4E47", "#E8DBC8",
              ].map((c) => {
                const isActive =
                  (currentBgColor ?? "").toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    onClick={() => onBgColorChange(c)}
                    className={cn(
                      "h-7 w-7 rounded-md border transition-transform hover:scale-110",
                      isActive
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
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Horizontal slider strip that docks below the slide stage, giving the user
// X / Y / Zoom / Margin control over the active slide's image WITHOUT a
// popover obscuring the slide. Reset + Close on the right.
// Compact Download menu — sits next to Regenerate in the top toolbar so
// users can grab a slide / deck / PDF without scrolling for the bottom bar.
function DownloadButton({
  slides,
  slideRefs,
  aspect,
  activeIndex,
  brandName,
}: {
  slides: Slide[];
  slideRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
  aspect: AspectRatio;
  activeIndex: number;
  brandName?: string;
}) {
  const [busy, setBusy] = useState<"png" | "zip" | "pdf" | null>(null);
  const baseName = (brandName || "carousel")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const nodes = () =>
    (slideRefs?.current?.filter(Boolean) as HTMLDivElement[]) ?? [];

  async function exportPng() {
    const node = slideRefs?.current?.[activeIndex];
    if (!node) return toast.error("Slide not ready.");
    setBusy("png");
    try {
      await downloadSlideJpeg(
        node,
        `${baseName}-slide-${String(activeIndex + 1).padStart(2, "0")}.jpg`
      );
      toast.success("Downloaded JPEG.");
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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="default"
          className="gap-1.5"
          disabled={slides.length === 0}
          title="Download options"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Export
        </p>
        <button
          onClick={exportPng}
          disabled={!!busy}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50",
            busy === "png" && "opacity-60"
          )}
        >
          <FileImage className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-1 flex-col items-start text-left">
            <span className="font-medium">
              {busy === "png" ? "Saving…" : "This slide (PNG)"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              The currently visible slide as a high-res PNG
            </span>
          </div>
        </button>
        <button
          onClick={exportZip}
          disabled={!!busy}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50",
            busy === "zip" && "opacity-60"
          )}
        >
          <Package className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-1 flex-col items-start text-left">
            <span className="font-medium">
              {busy === "zip" ? "Zipping…" : "All slides (ZIP)"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              One PNG per slide — IG / FB upload ready
            </span>
          </div>
        </button>
        <button
          onClick={exportPdf}
          disabled={!!busy}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50",
            busy === "pdf" && "opacity-60"
          )}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-1 flex-col items-start text-left">
            <span className="font-medium">
              {busy === "pdf" ? "Building…" : "Full deck (PDF)"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              All slides as one multi-page PDF — LinkedIn ready
            </span>
          </div>
        </button>
      </PopoverContent>
    </Popover>
  );
}

function ImagePositionDock({
  transform,
  onChange,
  onClose,
}: {
  transform?: { x?: number; y?: number; scale?: number; margin?: number };
  onChange: (
    t: { x?: number; y?: number; scale?: number; margin?: number } | undefined
  ) => void;
  onClose: () => void;
}) {
  const t = transform ?? {};
  const set = (patch: Partial<typeof t>) => onChange({ ...t, ...patch });
  const hasChanges =
    (t.x ?? 0) !== 0 ||
    (t.y ?? 0) !== 0 ||
    (t.scale ?? 1) !== 1 ||
    (t.margin ?? 0) !== 0;
  return (
    <div className="border-t border-border/80 bg-background/60 backdrop-blur">
      <div className="flex items-center gap-4 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Move className="h-3 w-3" />
          Image position
        </span>

        <div className="grid flex-1 grid-cols-4 gap-3">
          <PositionSlider
            label="Horizontal"
            value={t.x ?? 0}
            min={-600}
            max={600}
            step={4}
            onChange={(v) => set({ x: v })}
          />
          <PositionSlider
            label="Vertical"
            value={t.y ?? 0}
            min={-600}
            max={600}
            step={4}
            onChange={(v) => set({ y: v })}
          />
          <PositionSlider
            label="Zoom"
            value={t.scale ?? 1}
            min={0.5}
            max={3}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => set({ scale: v })}
          />
          <PositionSlider
            label="Margin"
            value={t.margin ?? 0}
            min={0}
            max={200}
            step={4}
            format={(v) => `${Math.round(v)}px`}
            onChange={(v) => set({ margin: v })}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(undefined)}
          disabled={!hasChanges}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          title="Close position dock"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Compact label + native range input + formatted value readout. Used by the
// image position controls in SlideImagePicker and ImagePositionDock.
function PositionSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{format ? format(value) : Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </div>
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

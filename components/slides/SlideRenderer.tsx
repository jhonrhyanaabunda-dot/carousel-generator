"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Globe, MapPin, Phone } from "lucide-react";
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type ElementStyle,
  type Slide,
  type TemplateTheme,
} from "@/types";
import { Backdrop } from "./Backdrop";
import { cn } from "@/lib/utils";

export interface SlideRendererProps {
  slide: Slide;
  template: TemplateTheme;
  aspect: AspectRatio;
  index: number;
  total: number;
  width?: number; // px width to render at; height derived from aspect
  className?: string;
  // editing
  editable?: boolean;
  onTextEdit?: (field: "title" | "subtitle" | "body" | "eyebrow", value: string) => void;
  // free positioning
  onPositionChange?: (key: string, pos: { x: number; y: number }) => void;
  // selection (which text element is currently being styled)
  selectedField?: string | null;
  onSelectField?: (key: string | null) => void;
  // expose element rect for floating toolbar positioning (screen coords)
  onSelectedRect?: (rect: DOMRect | null) => void;
  // custom (freeform) text element callbacks
  onCustomTextChange?: (id: string, text: string) => void;
  onCustomTextMove?: (id: string, x: number, y: number) => void;
}

/**
 * Renders a single carousel slide. The slide is laid out at the *actual* poster
 * dimensions (e.g. 1080x1350) and then scaled into its container with CSS
 * transform so html-to-image can capture full resolution while the UI shows
 * a fitted preview.
 */
export const SlideRenderer = React.forwardRef<HTMLDivElement, SlideRendererProps>(
  function SlideRenderer(
    {
      slide,
      template,
      aspect,
      index,
      total,
      width,
      className,
      editable,
      onTextEdit,
      onPositionChange,
      selectedField,
      onSelectField,
      onSelectedRect,
      onCustomTextChange,
      onCustomTextMove,
    },
    ref
  ) {
    const dims = ASPECT_RATIOS[aspect];
    const renderWidth = width ?? dims.w;
    const scale = renderWidth / dims.w;

    // Click on empty space inside the slide deselects the active text element.
    const onSlideMouseDown = (e: React.MouseEvent) => {
      if (!onSelectField) return;
      // Only deselect if the click target is the slide-frame itself, not a child
      // text element (which will stop propagation by virtue of its own handler).
      const target = e.target as HTMLElement;
      if (target.dataset?.editable === "1") return;
      onSelectField(null);
    };

    return (
      <div
        className={cn("relative overflow-hidden rounded-2xl", className)}
        style={{
          width: renderWidth,
          height: dims.h * scale,
        }}
      >
        <div
          ref={ref}
          className="slide-frame absolute left-0 top-0 origin-top-left"
          style={{
            width: dims.w,
            height: dims.h,
            transform: `scale(${scale})`,
            color: template.palette.text,
            fontFamily: template.fonts.body,
            background: template.palette.bg,
          }}
          onMouseDown={onSlideMouseDown}
        >
          <Backdrop theme={template} seed={index + 1} kind={slide.backdrop} />
          <BackgroundImage slide={slide} template={template} />
          <CornerLogoBadge slide={slide} />
          <SlideContent
            slide={slide}
            template={template}
            aspect={aspect}
            index={index}
            total={total}
            editable={editable}
            onTextEdit={onTextEdit}
            onPositionChange={onPositionChange}
            scale={scale}
            selectedField={selectedField}
            onSelectField={onSelectField}
            onSelectedRect={onSelectedRect}
          />
          {/* Freeform text elements added via the "Add text" toolbar button */}
          {(slide.customTexts ?? []).map((ct) => (
            <CustomTextItem
              key={ct.id}
              item={ct}
              scale={scale}
              editable={editable}
              selected={selectedField === `custom:${ct.id}`}
              onSelect={() => onSelectField?.(`custom:${ct.id}`)}
              onRect={
                selectedField === `custom:${ct.id}` ? onSelectedRect : undefined
              }
              onTextChange={(t) => onCustomTextChange?.(ct.id, t)}
              onMove={(x, y) => onCustomTextMove?.(ct.id, x, y)}
            />
          ))}
        </div>
      </div>
    );
  }
);

function CustomTextItem({
  item,
  scale,
  editable,
  selected,
  onSelect,
  onRect,
  onTextChange,
  onMove,
}: {
  item: import("@/types").CustomTextElement;
  scale: number;
  editable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onRect?: (rect: DOMRect | null) => void;
  onTextChange?: (text: string) => void;
  onMove?: (x: number, y: number) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const drag = React.useRef({ x: 0, y: 0, startX: 0, startY: 0, moved: false });

  // Re-report rect when selected
  React.useEffect(() => {
    if (!selected || !ref.current) return;
    const report = () => onRect?.(ref.current?.getBoundingClientRect() ?? null);
    report();
    window.addEventListener("scroll", report, true);
    window.addEventListener("resize", report);
    return () => {
      window.removeEventListener("scroll", report, true);
      window.removeEventListener("resize", report);
    };
  }, [selected, onRect, item.x, item.y]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      startX: item.x,
      startY: item.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (!drag.current.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.current.moved = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.getSelection()?.removeAllRanges();
      setDragging(true);
    }
    onMove?.(
      drag.current.startX + dx / scale,
      drag.current.startY + dy / scale
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.moved) {
      onSelect?.();
    } else {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setDragging(false);
    }
  };

  const s = item.style ?? {};
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: item.x,
    top: item.y,
    fontFamily: s.fontFamily ?? '"Sora", system-ui, sans-serif',
    fontSize: s.fontSize ?? 56,
    fontWeight: s.fontWeight ?? 700,
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration: s.underline ? "underline" : "none",
    color: s.color ?? "#FFFFFF",
    textAlign: s.align ?? "left",
    textTransform: s.textTransform ?? "none",
    letterSpacing: s.letterSpacing != null ? `${s.letterSpacing}em` : undefined,
    lineHeight: s.lineHeight ?? 1.15,
    textShadow: "0 2px 12px rgba(0,0,0,0.35)",
    cursor: dragging ? "grabbing" : "grab",
    touchAction: "none",
    padding: "4px 8px",
    minWidth: 32,
  };

  return (
    <div
      ref={ref}
      data-editable="1"
      className={cn(
        "rounded-md outline-none transition-shadow",
        editable && !selected && "hover:ring-2 hover:ring-primary/30",
        selected && !dragging && "ring-2 ring-primary/80",
        dragging && "ring-2 ring-primary"
      )}
      style={baseStyle}
      contentEditable={editable && !dragging}
      suppressContentEditableWarning
      onBlur={(e) => onTextChange?.(e.currentTarget.innerText)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      spellCheck={false}
    >
      {item.text}
    </div>
  );
}

// Layouts that already place the image themselves (so we don't double-render).
const LAYOUTS_WITH_OWN_IMAGE = new Set([
  "split-image-left",
  "split-image-right",
  "image-bg-overlay",
  "magazine",
  "image-collage",
  // Dealership-style layouts manage their own image + custom subtle overlay.
  "stats-row",
  "info-strip",
  "framed-card",
  "hero-headline",
  "model-hero",
  "brand-card",
  "dual-frame",
  "model-lineup",
  "drive-time-map",
]);

// Layouts that already render the brand logo prominently as part of their
// composition — we skip the corner badge there to avoid duplication.
const LAYOUTS_WITH_PROMINENT_LOGO = new Set([
  "model-hero",
  "brand-card",
  "info-strip",
  "hero-headline",
]);

function CornerLogoBadge({ slide }: { slide: Slide }) {
  const url = slide.content.brandLogoUrl;
  if (!url) return null;
  if (LAYOUTS_WITH_PROMINENT_LOGO.has(slide.layout)) return null;
  // Top-left corner, small, with a soft white background pad so the logo
  // stays legible on dark or light backgrounds.
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ top: 36, left: 36 }}
    >
      <div
        className="grid place-items-center rounded-lg backdrop-blur"
        style={{
          height: 56,
          padding: "0 14px",
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}
      >
        <img
          src={url}
          alt=""
          crossOrigin="anonymous"
          className="block max-h-9 w-auto object-contain"
        />
      </div>
    </div>
  );
}

// Shared dealership contact footer (phone+hours · website · address). Renders
// only when the slide carries contact info — used as a deck-wide unifier
// across the Parks-Lincoln-style premium dealer layouts.
function FooterStrip({
  content,
  padding,
}: {
  content: Slide["content"];
  padding: number;
}) {
  const phone = content.contact?.phone;
  const hours = content.contact?.hours;
  const website = content.contact?.website;
  const address = content.contact?.address;
  if (!phone && !website && !address) return null;
  const items: { Icon: typeof Phone; primary: string; secondary?: string }[] = [];
  if (phone) items.push({ Icon: Phone, primary: phone, secondary: hours });
  if (website) items.push({ Icon: Globe, primary: website });
  if (address) items.push({ Icon: MapPin, primary: address });

  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-start justify-around gap-6"
      style={{
        paddingTop: 0,
        paddingRight: padding * 0.6,
        paddingBottom: padding * 0.6,
        paddingLeft: padding * 0.6,
        color: "#fff",
      }}
    >
      {items.map(({ Icon, primary, secondary }, i) => (
        <div key={i} className="flex items-start gap-2 text-left">
          <span className="mt-0.5 shrink-0">
            <Icon style={{ width: 16, height: 16, opacity: 0.95 }} />
          </span>
          <div>
            <div style={{ fontSize: 16, lineHeight: 1.3, fontWeight: 500 }}>
              {primary}
            </div>
            {secondary && (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.3,
                  color: "#ffffffb3",
                  marginTop: 2,
                }}
              >
                {secondary}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BackgroundImage({
  slide,
  template,
}: {
  slide: Slide;
  template: TemplateTheme;
}) {
  if (!slide.content.imageUrl) return null;
  if (LAYOUTS_WITH_OWN_IMAGE.has(slide.layout)) return null;

  // Detect dark vs light template surface so the overlay tint is appropriate.
  const bg = template.palette.bg;
  const isDark = isHexDark(bg);
  const overlayBg = isDark ? "#000000" : "#ffffff";
  return (
    <>
      <img
        src={slide.content.imageUrl}
        alt=""
        crossOrigin="anonymous"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${overlayBg}cc 0%, ${overlayBg}99 40%, ${overlayBg}f0 100%)`
            : `linear-gradient(180deg, ${overlayBg}d9 0%, ${overlayBg}b3 40%, ${overlayBg}f5 100%)`,
        }}
      />
    </>
  );
}

function isHexDark(hex: string) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 150;
}

function Editable({
  text,
  className,
  style,
  editable,
  onChange,
  multiline,
  dragKey,
  position,
  scale = 1,
  onPositionChange,
  selected,
  onSelect,
  onRect,
  styleOverride,
}: {
  text?: string;
  className?: string;
  style?: React.CSSProperties;
  editable?: boolean;
  onChange?: (value: string) => void;
  multiline?: boolean;
  dragKey?: string;
  position?: { x: number; y: number };
  scale?: number;
  onPositionChange?: (key: string, pos: { x: number; y: number }) => void;
  selected?: boolean;
  onSelect?: (key: string | null) => void;
  onRect?: (rect: DOMRect | null) => void;
  styleOverride?: ElementStyle;
}) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState(position ?? { x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const drag = React.useRef({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
    moved: false,
  });

  React.useEffect(() => {
    setPos(position ?? { x: 0, y: 0 });
  }, [position?.x, position?.y]);

  // Report this element's screen-space rect when selected so the floating
  // toolbar can position itself above it. Re-report on scroll/resize.
  //
  // We read `onRect` through a ref instead of putting it in the effect deps
  // because the parent recreates `onRect` on every render (via the inline
  // `dragProps` helper). Including it as a dep would re-run this effect every
  // render, call setSelectedRect, and bounce the parent back into render —
  // producing a "Maximum update depth exceeded" loop on the selected element.
  const onRectRef = React.useRef(onRect);
  React.useEffect(() => {
    onRectRef.current = onRect;
  });

  React.useEffect(() => {
    if (!selected || !elRef.current) return;
    const report = () => {
      onRectRef.current?.(elRef.current?.getBoundingClientRect() ?? null);
    };
    report();
    window.addEventListener("scroll", report, true);
    window.addEventListener("resize", report);
    return () => {
      window.removeEventListener("scroll", report, true);
      window.removeEventListener("resize", report);
    };
  }, [selected, pos.x, pos.y]);

  if (!text) return null;

  const draggable = !!dragKey && !!onPositionChange;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    if (e.button !== 0) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    if (e.buttons !== 1) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (!drag.current.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.current.moved = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      // If the contenteditable was just focused on pointerdown, blur it so
      // the drag doesn't also accidentally edit text.
      const ae = document.activeElement as HTMLElement | null;
      ae?.blur?.();
      window.getSelection()?.removeAllRanges();
      setDragging(true);
    }
    setPos({
      x: drag.current.posX + dx / scale,
      y: drag.current.posY + dy / scale,
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) {
      // Even non-draggable Editables should select on click.
      if (dragKey && onSelect) onSelect(dragKey);
      return;
    }
    if (drag.current.moved) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setDragging(false);
      onPositionChange?.(dragKey!, pos);
      // Keep selection on the moved element.
      if (dragKey && onSelect) onSelect(dragKey);
    } else {
      // Click without drag → select for styling.
      if (dragKey && onSelect) onSelect(dragKey);
    }
  };

  const baseTransform = style?.transform ? `${style.transform} ` : "";
  const moveTransform = `translate(${pos.x}px, ${pos.y}px)`;

  // Merge per-element style overrides on top of the layout's default style.
  const overrideStyle: React.CSSProperties = {};
  if (styleOverride?.fontFamily) overrideStyle.fontFamily = styleOverride.fontFamily;
  if (styleOverride?.fontSize) overrideStyle.fontSize = styleOverride.fontSize;
  if (styleOverride?.fontWeight) overrideStyle.fontWeight = styleOverride.fontWeight;
  if (styleOverride?.italic) overrideStyle.fontStyle = "italic";
  if (styleOverride?.underline) overrideStyle.textDecoration = "underline";
  if (styleOverride?.color) overrideStyle.color = styleOverride.color;
  if (styleOverride?.align) overrideStyle.textAlign = styleOverride.align;
  if (styleOverride?.letterSpacing != null)
    overrideStyle.letterSpacing = `${styleOverride.letterSpacing}em`;
  if (styleOverride?.lineHeight != null) overrideStyle.lineHeight = styleOverride.lineHeight;
  if (styleOverride?.textTransform) overrideStyle.textTransform = styleOverride.textTransform;

  return (
    <div
      ref={elRef}
      data-editable="1"
      className={cn(
        "outline-none transition-shadow rounded-md",
        draggable && !dragging && !selected && editable && "hover:ring-2 hover:ring-primary/30",
        dragging && "ring-2 ring-primary cursor-grabbing",
        selected && !dragging && "ring-2 ring-primary/80",
        className
      )}
      style={{
        ...style,
        ...overrideStyle,
        transform: baseTransform + moveTransform,
        cursor: dragging ? "grabbing" : draggable ? "grab" : style?.cursor,
        touchAction: draggable ? "none" : undefined,
        WebkitUserSelect: dragging ? "none" : undefined,
        userSelect: dragging ? "none" : undefined,
      }}
      contentEditable={editable && !dragging}
      suppressContentEditableWarning
      onBlur={(e) => onChange?.(e.currentTarget.innerText)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      spellCheck={false}
    >
      {multiline
        ? text.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))
        : text}
    </div>
  );
}

function SlideContent({
  slide,
  template,
  aspect,
  index,
  total,
  editable,
  onTextEdit,
  onPositionChange,
  scale,
  selectedField,
  onSelectField,
  onSelectedRect,
}: {
  slide: Slide;
  template: TemplateTheme;
  aspect: AspectRatio;
  index: number;
  total: number;
  editable?: boolean;
  onTextEdit?: SlideRendererProps["onTextEdit"];
  onPositionChange?: SlideRendererProps["onPositionChange"];
  scale?: number;
  selectedField?: string | null;
  onSelectField?: (key: string | null) => void;
  onSelectedRect?: (rect: DOMRect | null) => void;
}) {
  const { layout, content, overrides } = slide;
  const accent = overrides?.accent ?? template.palette.accent;
  const align = overrides?.align ?? "left";
  // Scale padding & type sizes from the slide's shortest side so all four
  // aspect ratios (IG 1080×1350, Square 1080×1080, FB 1200×1500, Google
  // 1200×900 landscape) get proportionate breathing room.
  const dims = ASPECT_RATIOS[aspect];
  const minSide = Math.min(dims.w, dims.h);
  const padding = Math.round(Math.max(64, minSide * 0.075));
  // Per-slide display-font override (set by the generator so a whole deck shares
  // one chosen font). Falls back to the template's display font for any slide
  // that wasn't generated with one — e.g. saved projects from older sessions.
  const titleFamily = slide.displayFont ?? template.fonts.display;
  const positions = overrides?.positions ?? {};
  const styles = overrides?.styles ?? {};

  // Spreadable props that make any Editable draggable + selectable + styleable.
  const dragProps = (field: string) => ({
    dragKey: field,
    position: positions[field],
    scale,
    onPositionChange,
    selected: selectedField === field,
    onSelect: onSelectField,
    onRect: selectedField === field ? onSelectedRect : undefined,
    styleOverride: styles[field],
  });

  const Page = (
    <div
      className="absolute right-0 bottom-0 flex items-center gap-3"
      style={{ right: padding, bottom: padding }}
    >
      <div
        className="font-mono"
        style={{ color: template.palette.muted, fontSize: 22, letterSpacing: "0.1em" }}
      >
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      {content.brandName ? (
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
          style={{ color: template.palette.muted, borderColor: template.palette.muted + "55" }}
        >
          {content.brandName}
        </span>
      ) : null}
    </div>
  );

  // Common typography sizes — derived from the slide's shortest side so they
  // scale with all four aspect ratios. "AI text fitting" lite: shrink the
  // title based on length so long headlines don't blow past the slide edges.
  const titleLen = (content.title || "").length;
  const baseTitleSize = Math.round(Math.max(96, minSide * 0.122));
  const titleSize = Math.max(64, baseTitleSize - Math.max(0, titleLen - 36) * 1.4);
  const subSize = Math.round(Math.max(28, minSide * 0.035));

  switch (layout) {
    case "centered-hero":
      return (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ padding }}
        >
          {content.eyebrow && (
            <Editable
              text={content.eyebrow}
              editable={editable}
              onChange={(v) => onTextEdit?.("eyebrow", v)}
            {...dragProps("eyebrow")}
              className="mb-8 inline-flex items-center rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.3em]"
              style={{ background: accent + "22", color: accent, border: `1px solid ${accent}55` }}
            />
          )}
          <Editable
            text={content.title}
            editable={editable}
            onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
            className="text-balance font-black"
            style={{
              fontFamily: titleFamily,
              fontSize: titleSize,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
          />
          {content.subtitle && (
            <Editable
              text={content.subtitle}
              editable={editable}
              onChange={(v) => onTextEdit?.("subtitle", v)}
            {...dragProps("subtitle")}
              className="mt-8 max-w-[80%] text-balance"
              style={{ color: template.palette.muted, fontSize: subSize, lineHeight: 1.35 }}
            />
          )}
          <div
            className="mt-12 h-1 w-24 rounded-full"
            style={{ background: accent }}
          />
          {Page}
        </div>
      );

    case "split-image-left":
    case "split-image-right": {
      const imgFirst = layout === "split-image-left";
      const Image = (
        <div className="relative h-full w-full overflow-hidden" style={{ background: template.palette.surface }}>
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${imgFirst ? "90deg" : "270deg"}, transparent 60%, ${template.palette.bg})`,
            }}
          />
        </div>
      );
      const Text = (
        <div className="flex h-full flex-col justify-center" style={{ padding }}>
          {content.eyebrow && (
            <div className="mb-6 text-sm font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
              {content.eyebrow}
            </div>
          )}
          <Editable
            text={content.title}
            editable={editable}
            onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
            className="text-balance font-black"
            style={{
              fontFamily: titleFamily,
              fontSize: Math.max(80, titleSize * 0.85),
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
          />
          {content.body && (
            <Editable
              text={content.body}
              editable={editable}
              onChange={(v) => onTextEdit?.("body", v)}
            {...dragProps("body")}
              multiline
              className="mt-8 max-w-[90%]"
              style={{ color: template.palette.muted, fontSize: 32, lineHeight: 1.45 }}
            />
          )}
          <div
            className="mt-10 h-1 w-16 rounded-full"
            style={{ background: accent }}
          />
        </div>
      );
      return (
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: "1fr 1fr" }}
        >
          {imgFirst ? Image : Text}
          {imgFirst ? Text : Image}
          {Page}
        </div>
      );
    }

    case "image-bg-overlay":
      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${template.palette.bg}99 0%, ${template.palette.bg}22 30%, ${template.palette.bg}EE 100%)`,
            }}
          />
          <div
            className="absolute inset-0 flex flex-col justify-end"
            style={{ padding, textAlign: align }}
          >
            {content.eyebrow && (
              <div
                className="mb-6 inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.3em]"
                style={{ background: accent, color: "#0b0d0f" }}
              >
                {content.eyebrow}
              </div>
            )}
            <Editable
              text={content.title}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
              className="text-balance font-black"
              style={{
                fontFamily: titleFamily,
                fontSize: titleSize,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                color: "#fff",
                textShadow: "0 8px 40px rgba(0,0,0,0.45)",
              }}
            />
            {content.subtitle && (
              <Editable
                text={content.subtitle}
                editable={editable}
                onChange={(v) => onTextEdit?.("subtitle", v)}
            {...dragProps("subtitle")}
                className="mt-6 max-w-[80%]"
                style={{ color: "#FFFFFFcc", fontSize: subSize, lineHeight: 1.4 }}
              />
            )}
          </div>
          {Page}
        </div>
      );

    case "stat-block":
      return (
        <div className="absolute inset-0 flex flex-col" style={{ padding }}>
          {content.eyebrow && (
            <div className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
              {content.eyebrow}
            </div>
          )}
          <div className="mt-auto">
            <Editable
              text={content.title}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
              className="font-black"
              style={{
                fontFamily: titleFamily,
                fontSize: 360,
                lineHeight: 0.85,
                letterSpacing: "-0.04em",
                background: `linear-gradient(135deg, ${accent}, ${template.palette.accent2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            />
            <Editable
              text={content.subtitle}
              editable={editable}
              onChange={(v) => onTextEdit?.("subtitle", v)}
            {...dragProps("subtitle")}
              className="mt-2 font-semibold uppercase tracking-[0.25em]"
              style={{ color: template.palette.text, fontSize: 36 }}
            />
            {content.body && (
              <Editable
                text={content.body}
                editable={editable}
                onChange={(v) => onTextEdit?.("body", v)}
            {...dragProps("body")}
                multiline
                className="mt-8 max-w-[80%]"
                style={{ color: template.palette.muted, fontSize: 32, lineHeight: 1.45 }}
              />
            )}
          </div>
          {Page}
        </div>
      );

    case "quote-card":
      return (
        <div className="absolute inset-0 flex items-center justify-center" style={{ padding }}>
          <div className="relative w-full max-w-[88%]">
            <div
              className="absolute -left-6 -top-12 font-black"
              style={{ color: accent, opacity: 0.3, fontFamily: titleFamily, fontSize: 240, lineHeight: 1 }}
            >
              "
            </div>
            <Editable
              text={content.title}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
              className="text-balance"
              style={{
                fontFamily: titleFamily,
                fontSize: 86,
                lineHeight: 1.15,
                letterSpacing: "-0.015em",
                fontWeight: 600,
              }}
            />
            <div className="mt-12 flex items-center gap-4">
              <div className="h-[2px] w-16" style={{ background: accent }} />
              <Editable
                text={content.subtitle}
                editable={editable}
                onChange={(v) => onTextEdit?.("subtitle", v)}
            {...dragProps("subtitle")}
                className="font-bold uppercase tracking-[0.25em]"
                style={{ color: template.palette.muted, fontSize: 26 }}
              />
            </div>
          </div>
          {Page}
        </div>
      );

    case "list-stack":
      return (
        <div className="absolute inset-0 flex flex-col" style={{ padding }}>
          {content.eyebrow && (
            <div className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
              {content.eyebrow}
            </div>
          )}
          <Editable
            text={content.title}
            editable={editable}
            onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
            className="mt-4 max-w-[85%] text-balance font-black"
            style={{
              fontFamily: titleFamily,
              fontSize: 96,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          />
          <ul className="mt-12 flex flex-col gap-5">
            {(content.bullets ?? []).map((b, i) => (
              <li key={i} className="flex items-start gap-5">
                <span
                  className="mt-2 grid h-12 w-12 shrink-0 place-items-center rounded-full font-black"
                  style={{
                    background: accent,
                    color: "#0b0d0f",
                    fontSize: 26,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 36, lineHeight: 1.35, color: template.palette.text }}>
                  {b}
                </span>
              </li>
            ))}
          </ul>
          {Page}
        </div>
      );

    case "title-corner":
      return (
        <div className="absolute inset-0" style={{ padding }}>
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              {content.eyebrow && (
                <div
                  className="rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-[0.3em]"
                  style={{ borderColor: template.palette.muted + "55", color: template.palette.muted }}
                >
                  {content.eyebrow}
                </div>
              )}
              <div
                className="font-mono text-sm tracking-widest"
                style={{ color: template.palette.muted }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
            </div>
            <Editable
              text={content.title}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
              className="max-w-[92%] text-balance font-black"
              style={{
                fontFamily: titleFamily,
                fontSize: titleSize,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
              }}
            />
            <div className="flex items-end justify-between gap-12">
              <Editable
                text={content.subtitle}
                editable={editable}
                onChange={(v) => onTextEdit?.("subtitle", v)}
            {...dragProps("subtitle")}
                className="max-w-[60%]"
                style={{ color: template.palette.muted, fontSize: 30, lineHeight: 1.45 }}
              />
              <div
                className="h-2 w-40 shrink-0 rounded-full"
                style={{ background: accent }}
              />
            </div>
          </div>
        </div>
      );

    case "minimal-edge":
      return (
        <div className="absolute inset-0" style={{ padding }}>
          <div
            className="absolute left-0 top-0 h-full w-2"
            style={{ background: accent }}
          />
          <div className="flex h-full flex-col justify-center pl-8">
            {content.eyebrow && (
              <div className="mb-6 text-sm font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
                {content.eyebrow}
              </div>
            )}
            <Editable
              text={content.title}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
              className="max-w-[90%] text-balance font-black"
              style={{
                fontFamily: titleFamily,
                fontSize: titleSize,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
              }}
            />
            {content.body && (
              <Editable
                text={content.body}
                editable={editable}
                onChange={(v) => onTextEdit?.("body", v)}
            {...dragProps("body")}
                multiline
                className="mt-10 max-w-[80%]"
                style={{ color: template.palette.muted, fontSize: 32, lineHeight: 1.45 }}
              />
            )}
          </div>
          {Page}
        </div>
      );

    case "magazine":
      return (
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateRows: "60% 40%" }}
        >
          <div className="relative overflow-hidden">
            {content.imageUrl ? (
              <img
                src={content.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <PlaceholderArt accent={accent} bg={template.palette.surface} />
            )}
            <div
              className="absolute left-0 top-0 m-10 inline-flex items-center rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.3em]"
              style={{ background: template.palette.bg, color: accent }}
            >
              {content.eyebrow ?? "FEATURE"}
            </div>
          </div>
          <div className="flex flex-col justify-center" style={{ padding }}>
            <Editable
              text={content.title}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
              className="max-w-[95%] text-balance font-black"
              style={{
                fontFamily: titleFamily,
                fontSize: 84,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            />
            {content.body && (
              <Editable
                text={content.body}
                editable={editable}
                onChange={(v) => onTextEdit?.("body", v)}
            {...dragProps("body")}
                multiline
                className="mt-6 max-w-[90%]"
                style={{ color: template.palette.muted, fontSize: 28, lineHeight: 1.45 }}
              />
            )}
          </div>
          {Page}
        </div>
      );

    case "neon-frame":
      return (
        <div className="absolute inset-0" style={{ padding }}>
          <div
            className="relative h-full w-full rounded-[40px] p-12"
            style={{
              background:
                `linear-gradient(${template.palette.bg}, ${template.palette.bg}) padding-box, linear-gradient(135deg, ${accent}, ${template.palette.accent2}) border-box`,
              border: "4px solid transparent",
              boxShadow: `0 0 80px ${accent}55, inset 0 0 60px ${accent}22`,
            }}
          >
            <div className="flex h-full flex-col justify-center text-center">
              {content.eyebrow && (
                <div
                  className="mx-auto mb-8 inline-flex rounded-full border px-5 py-2 text-sm font-bold uppercase tracking-[0.3em]"
                  style={{
                    color: accent,
                    borderColor: accent + "88",
                    boxShadow: `0 0 20px ${accent}55`,
                  }}
                >
                  {content.eyebrow}
                </div>
              )}
              <Editable
                text={content.title}
                editable={editable}
                onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
                className="text-balance font-black"
                style={{
                  fontFamily: titleFamily,
                  fontSize: titleSize,
                  lineHeight: 0.95,
                  letterSpacing: "-0.02em",
                  background: `linear-gradient(135deg, #fff, ${accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: `0 0 60px ${accent}66`,
                }}
              />
              {content.subtitle && (
                <Editable
                  text={content.subtitle}
                  editable={editable}
                  onChange={(v) => onTextEdit?.("subtitle", v)}
            {...dragProps("subtitle")}
                  className="mx-auto mt-10 max-w-[70%]"
                  style={{ color: template.palette.muted, fontSize: subSize, lineHeight: 1.4 }}
                />
              )}
            </div>
          </div>
          {Page}
        </div>
      );

    case "image-collage":
      return (
        <div className="absolute inset-0" style={{ padding }}>
          <div className="grid h-full grid-cols-3 grid-rows-4 gap-6">
            <div className="col-span-2 row-span-2 overflow-hidden rounded-3xl" style={{ background: template.palette.surface }}>
              {content.imageUrl ? (
                <img src={content.imageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
              ) : (
                <PlaceholderArt accent={accent} bg={template.palette.surface} />
              )}
            </div>
            <div className="overflow-hidden rounded-3xl" style={{ background: accent }} />
            <div className="overflow-hidden rounded-3xl" style={{ background: template.palette.surface }}>
              <PlaceholderArt accent={template.palette.accent2} bg={template.palette.surface} />
            </div>
            <div className="col-span-3 row-span-2 flex flex-col justify-end rounded-3xl p-10" style={{ background: template.palette.surface }}>
              {content.eyebrow && (
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
                  {content.eyebrow}
                </div>
              )}
              <Editable
                text={content.title}
                editable={editable}
                onChange={(v) => onTextEdit?.("title", v)}
            {...dragProps("title")}
                className="max-w-[95%] text-balance font-black"
                style={{
                  fontFamily: titleFamily,
                  fontSize: 76,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              />
            </div>
          </div>
          {Page}
        </div>
      );

    case "stats-row": {
      // Lincoln warranty-strip style: bottom row of 3-4 mini stats, light
      // numerals, thin vertical dividers, soft bottom vignette for legibility.
      const rawStats =
        content.stats && content.stats.length
          ? content.stats
          : (content.bullets ?? []).slice(0, 4).map((b) => {
              const m = b.match(/^([\$\d.,]+\s?[a-zA-Z%★]*)\s*(.*)$/);
              return m
                ? { value: m[1].trim(), suffix: undefined, label: m[2].trim() || b }
                : { value: b.split(" ")[0], suffix: undefined, label: b };
            });
      const stats = (rawStats.length ? rawStats : [{ value: "—", label: "" }]).slice(0, 4);
      // Auto-size the value font so the LONGEST stat fits in its column.
      // Without this, long values like "$1,000-$1,600" overflow at the fixed
      // ~96px size and the layout scrambles.
      const numCols = stats.length;
      const usableW = dims.w - padding * 2;
      const dividerGap = 24;
      const perCol = (usableW - (numCols - 1) * dividerGap) / numCols;
      const longestLen = Math.max(
        ...stats.map(
          (s) =>
            String(s.value).length + (s.suffix ? String(s.suffix).length + 1 : 0)
        ),
        1
      );
      // Empirical: light serif glyphs are ~0.55em wide. We let the value
      // occupy ~92% of its column.
      const sizeFromWidth = (perCol * 0.92) / (longestLen * 0.55);
      const baseValueSize = numCols >= 4 ? 96 : 112;
      const valueSize = Math.max(
        44,
        Math.min(baseValueSize, Math.round(sizeFromWidth))
      );
      const suffixSize = Math.max(16, Math.round(valueSize * 0.28));
      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img src={content.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" crossOrigin="anonymous" />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          {/* Concentrated bottom vignette so the strip reads on any photo */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex justify-center"
            style={{ padding }}
          >
            <div className="flex w-full max-w-[96%] items-end justify-center">
              {stats.map((s, i, arr) => (
                <React.Fragment key={i}>
                  <div
                    className="flex min-w-0 flex-1 flex-col items-center text-center"
                    style={{ flexBasis: 0 }}
                  >
                    <div className="flex max-w-full items-baseline justify-center gap-1.5">
                      <Editable
                        text={String(s.value)}
                        editable={editable}
                        {...dragProps(`stat-${i}-value`)}
                        style={{
                          fontFamily: titleFamily,
                          fontSize: valueSize,
                          fontWeight: 300,
                          lineHeight: 1,
                          letterSpacing: "-0.01em",
                          color: "#fff",
                          textShadow: "0 2px 12px rgba(0,0,0,0.35)",
                          whiteSpace: "nowrap",
                        }}
                      />
                      {s.suffix && (
                        <Editable
                          text={s.suffix}
                          editable={editable}
                          {...dragProps(`stat-${i}-suffix`)}
                          style={{
                            color: "#ffffffd9",
                            fontSize: suffixSize,
                            fontWeight: 400,
                            lineHeight: 1,
                            letterSpacing: "0",
                            whiteSpace: "nowrap",
                          }}
                        />
                      )}
                    </div>
                    {s.label && (
                      <Editable
                        text={s.label}
                        editable={editable}
                        {...dragProps(`stat-${i}-label`)}
                        multiline
                        className="mt-3"
                        style={{
                          color: "#ffffffcc",
                          fontSize: 18,
                          fontWeight: 400,
                          lineHeight: 1.35,
                          textAlign: "center",
                          letterSpacing: "0",
                          maxWidth: perCol - 12,
                        }}
                      />
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      className="mx-3 self-stretch"
                      style={{ width: 1, background: "rgba(255,255,255,0.28)" }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          {Page}
        </div>
      );
    }

    case "info-strip": {
      // Nissan-dealer style: tiny brand mark + uppercase headline at top,
      // three contact items with Lucide icons in a row at the bottom.
      const phone = content.contact?.phone;
      const hours = content.contact?.hours;
      const website = content.contact?.website;
      const address = content.contact?.address;
      const items: { Icon: typeof Phone; primary: string; secondary?: string }[] = [];
      if (phone) items.push({ Icon: Phone, primary: phone, secondary: hours });
      if (website) items.push({ Icon: Globe, primary: website });
      if (address) items.push({ Icon: MapPin, primary: address });
      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img src={content.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" crossOrigin="anonymous" />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 28%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0.65) 100%)",
            }}
          />
          <div className="absolute inset-0 flex flex-col" style={{ padding }}>
            {/* Top: brand mark + uppercase headline */}
            <div className="flex flex-col items-center text-center">
              {content.brandLogoUrl ? (
                <img
                  src={content.brandLogoUrl}
                  alt=""
                  className="mb-7 h-12 w-auto object-contain"
                  crossOrigin="anonymous"
                />
              ) : content.brandName ? (
                <div
                  className="mb-7 grid h-14 w-14 place-items-center rounded-full border-2 text-xs font-bold uppercase tracking-widest"
                  style={{ color: "#fff", borderColor: "#ffffff88" }}
                >
                  {content.brandName.slice(0, 1)}
                </div>
              ) : null}
              <Editable
                text={content.title}
                editable={editable}
                onChange={(v) => onTextEdit?.("title", v)}
                {...dragProps("title")}
                className="max-w-[88%] text-balance"
                style={{
                  fontFamily: titleFamily,
                  fontSize: 52,
                  lineHeight: 1.1,
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
                  textShadow: "0 2px 14px rgba(0,0,0,0.35)",
                }}
              />
            </div>
            {/* Bottom: contact strip */}
            {items.length > 0 && (
              <div className="mt-auto flex w-full items-start justify-around gap-6">
                {items.map(({ Icon, primary, secondary }, i) => (
                  <div key={i} className="flex items-start gap-3 text-left">
                    <span
                      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
                      style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
                    >
                      <Icon style={{ width: 14, height: 14 }} />
                    </span>
                    <div style={{ color: "#fff" }}>
                      <div style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 500 }}>
                        {primary}
                      </div>
                      {secondary && (
                        <div style={{ fontSize: 14, lineHeight: 1.3, color: "#ffffffaa", marginTop: 2 }}>
                          {secondary}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    case "framed-card": {
      // Parks-Lincoln style (image 3.2):
      //   full-poster thin white border, photo shows through,
      //   centered: huge translucent-serif "watermark number" + italic serif tagline,
      //   bottom: persistent contact footer.
      const watermark = content.title || "51";
      const tagline = content.subtitle || `years <em>same corner</em> of Seminole County.`;
      const footerH = content.contact ? 110 : 0;
      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.12)" }} />
          {/* Thin full-poster border, with a gap at the bottom for the footer */}
          <div
            className="absolute"
            style={{
              top: padding * 0.55,
              left: padding * 0.55,
              right: padding * 0.55,
              bottom: footerH + padding * 0.4,
              border: "2px solid #ffffffd9",
              pointerEvents: "none",
            }}
          />
          {/* Centered content: watermark number + serif italic tagline */}
          <div
            className="absolute flex items-center"
            style={{
              top: padding * 0.55,
              left: padding * 0.55,
              right: padding * 0.55,
              bottom: footerH + padding * 0.4,
              padding: padding * 0.6,
            }}
          >
            <Editable
              text={watermark}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
              {...dragProps("title")}
              style={{
                fontFamily: titleFamily,
                fontSize: 400,
                lineHeight: 0.9,
                fontWeight: 400,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "-0.02em",
                marginRight: 24,
              }}
            />
            <Editable
              text={tagline.replace(/<em>|<\/em>/g, "")}
              editable={editable}
              onChange={(v) => onTextEdit?.("subtitle", v)}
              {...dragProps("subtitle")}
              multiline
              style={{
                fontFamily: titleFamily,
                fontSize: 64,
                lineHeight: 1.1,
                fontWeight: 400,
                color: "#fff",
                maxWidth: "55%",
                textShadow: "0 2px 14px rgba(0,0,0,0.5)",
              }}
            />
          </div>
          <FooterStrip content={content} padding={padding} />
        </div>
      );
    }


    case "hero-headline": {
      // Nissan-dealer style: small brand pill, uppercase medium-weight headline
      // with one word auto-emphasized in heavy weight, restrained subtitle.
      const titleText = content.title || "";
      const words = titleText.split(/\s+/).filter(Boolean);
      let emphasizedIdx = -1;
      let maxLen = 5; // require at least 5+ chars to emphasize
      words.forEach((w, i) => {
        if (w.length > maxLen) {
          maxLen = w.length;
          emphasizedIdx = i;
        }
      });
      // We render the headline as a real Editable for editing, but visually
      // overlay the emphasized version *only when the user isn't editing it*.
      const headlineSize = Math.max(48, Math.min(72, 720 / Math.max(8, titleText.length)));
      const isSelected = selectedField === "title";
      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img src={content.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" crossOrigin="anonymous" />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 35%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          <div
            className="absolute inset-0 flex flex-col items-center text-center"
            style={{
              paddingTop: padding * 1.4,
              paddingRight: padding,
              paddingBottom: padding,
              paddingLeft: padding,
            }}
          >
            {/* Brand: small circular badge if no logo */}
            {content.brandLogoUrl ? (
              <img
                src={content.brandLogoUrl}
                alt=""
                className="mb-7 h-14 w-auto object-contain"
                crossOrigin="anonymous"
              />
            ) : content.brandName ? (
              <div
                className="mb-7 grid place-items-center rounded-full border-2"
                style={{
                  width: 56,
                  height: 56,
                  borderColor: "#ffffffaa",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                }}
              >
                {content.brandName.slice(0, 1).toUpperCase()}
              </div>
            ) : null}

            {/* Editable headline (plain text, all caps, medium weight) */}
            <Editable
              text={titleText.toUpperCase()}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
              {...dragProps("title")}
              className="max-w-[90%] text-balance"
              style={{
                fontFamily: titleFamily,
                fontSize: headlineSize,
                lineHeight: 1.1,
                fontWeight: 500,
                color: isSelected ? "#fff" : "transparent", // hidden under overlay when not editing
                letterSpacing: "0.005em",
                position: "relative",
                zIndex: 2,
              }}
            />
            {/* Visual overlay with one bold word — sits on top when not editing */}
            {!isSelected && emphasizedIdx >= 0 && (
              <div
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  top: padding * 1.4 + (content.brandLogoUrl || content.brandName ? 56 + 28 : 0),
                  left: 0,
                  right: 0,
                  fontFamily: titleFamily,
                  fontSize: headlineSize,
                  lineHeight: 1.1,
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "0.005em",
                  textAlign: "center",
                  textShadow: "0 2px 18px rgba(0,0,0,0.4)",
                  textTransform: "uppercase",
                  padding: `0 ${padding}px`,
                }}
              >
                <span className="text-balance" style={{ display: "inline-block", maxWidth: "90%" }}>
                  {words.map((w, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && " "}
                      {i === emphasizedIdx ? <strong style={{ fontWeight: 900 }}>{w}</strong> : w}
                    </React.Fragment>
                  ))}
                </span>
              </div>
            )}
            {!isSelected && emphasizedIdx < 0 && titleText && (
              <div
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  top: padding * 1.4 + (content.brandLogoUrl || content.brandName ? 56 + 28 : 0),
                  left: 0,
                  right: 0,
                  fontFamily: titleFamily,
                  fontSize: headlineSize,
                  lineHeight: 1.1,
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "0.005em",
                  textAlign: "center",
                  textShadow: "0 2px 18px rgba(0,0,0,0.4)",
                  textTransform: "uppercase",
                  padding: `0 ${padding}px`,
                }}
              >
                {titleText.toUpperCase()}
              </div>
            )}

            {content.subtitle && (
              <Editable
                text={content.subtitle}
                editable={editable}
                onChange={(v) => onTextEdit?.("subtitle", v)}
                {...dragProps("subtitle")}
                className="mt-7 max-w-[70%]"
                style={{
                  color: "#ffffffd9",
                  fontSize: 24,
                  lineHeight: 1.4,
                  fontWeight: 400,
                  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                }}
              />
            )}
          </div>
          <FooterStrip content={content} padding={padding} />
        </div>
      );
    }

    case "model-hero": {
      // Image 6/8/9 — full-bleed photo with bottom-left block:
      //   small "2026 Lincoln" (year/maker) + huge italic-serif model name
      //   + italic small tagline. Persistent contact footer below.
      // We read:  eyebrow = small line (e.g. "2026 Lincoln")
      //           title   = big serif model name (e.g. "NAVIGATOR")
      //           subtitle = italic tagline (e.g. "the flagship.")
      const maker = content.eyebrow || (content.brandName ?? "");
      const model = (content.title || "").toUpperCase();
      const tagline = content.subtitle || "";
      const footerH = content.contact ? 110 : 0;
      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          {/* Bottom-weighted vignette so the model name reads */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, transparent 35%, rgba(0,0,0,0.65) 100%)",
            }}
          />
          <div
            className="absolute"
            style={{
              left: padding,
              right: padding,
              bottom: footerH + padding * 0.6,
              color: "#fff",
            }}
          >
            {maker && (
              <Editable
                text={maker}
                editable={editable}
                onChange={(v) => onTextEdit?.("eyebrow", v)}
                {...dragProps("eyebrow")}
                style={{
                  fontFamily: titleFamily,
                  fontSize: 30,
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                  color: "#fff",
                  marginBottom: -10,
                  fontStyle: "italic",
                  textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                }}
              />
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: 24, flexWrap: "wrap" }}>
              <Editable
                text={model}
                editable={editable}
                onChange={(v) => onTextEdit?.("title", v)}
                {...dragProps("title")}
                style={{
                  fontFamily: titleFamily,
                  fontSize: 160,
                  lineHeight: 0.95,
                  fontWeight: 700,
                  letterSpacing: "0.005em",
                  color: "#fff",
                  textShadow: "0 4px 24px rgba(0,0,0,0.5)",
                }}
              />
              {tagline && (
                <Editable
                  text={tagline}
                  editable={editable}
                  onChange={(v) => onTextEdit?.("subtitle", v)}
                  {...dragProps("subtitle")}
                  style={{
                    fontFamily: titleFamily,
                    fontSize: 38,
                    lineHeight: 1.1,
                    fontStyle: "italic",
                    fontWeight: 400,
                    color: "#ffffffe6",
                    textShadow: "0 2px 12px rgba(0,0,0,0.45)",
                  }}
                />
              )}
            </div>
          </div>
          <FooterStrip content={content} padding={padding} />
        </div>
      );
    }

    case "brand-card": {
      // Image 7 — centered brand mark + centered serif headline. Photo
      // full-bleed (sky-heavy works best). Persistent contact footer.
      const footerH = content.contact ? 110 : 0;
      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.45) 100%)",
            }}
          />
          <div
            className="absolute flex flex-col items-center text-center"
            style={{
              top: padding * 1.4,
              left: padding,
              right: padding,
              bottom: footerH + padding * 0.6,
              color: "#fff",
            }}
          >
            {content.brandLogoUrl ? (
              <img
                src={content.brandLogoUrl}
                alt=""
                className="mb-12 h-20 w-auto object-contain"
                crossOrigin="anonymous"
              />
            ) : content.brandName ? (
              <div
                className="mb-12 grid place-items-center rounded-full border"
                style={{
                  width: 92,
                  height: 92,
                  borderColor: "#ffffffd9",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontFamily: titleFamily,
                    fontSize: 18,
                    fontStyle: "italic",
                    color: "#fff",
                    textAlign: "center",
                    padding: "0 8px",
                    lineHeight: 1.05,
                  }}
                >
                  {content.brandName}
                </div>
              </div>
            ) : null}
            <Editable
              text={content.title}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
              {...dragProps("title")}
              className="max-w-[88%] text-balance"
              style={{
                fontFamily: titleFamily,
                fontSize: 78,
                lineHeight: 1.05,
                fontWeight: 700,
                color: "#fff",
                textShadow: "0 4px 24px rgba(0,0,0,0.5)",
              }}
            />
            {content.subtitle && (
              <Editable
                text={content.subtitle}
                editable={editable}
                onChange={(v) => onTextEdit?.("subtitle", v)}
                {...dragProps("subtitle")}
                className="mt-5 max-w-[70%]"
                style={{
                  fontFamily: titleFamily,
                  fontSize: 28,
                  fontStyle: "italic",
                  color: "#ffffffd9",
                  lineHeight: 1.35,
                  textShadow: "0 2px 12px rgba(0,0,0,0.45)",
                }}
              />
            )}
          </div>
          <FooterStrip content={content} padding={padding} />
        </div>
      );
    }

    case "dual-frame": {
      // Image 8.2 — SERVICE HOURS label inside a top white-bordered tab,
      // then two side-by-side white-bordered cards with day + time. Footer below.
      // Content mapping:
      //   eyebrow  = top label (e.g., "SERVICE HOURS")
      //   stats[0] = { value: "7AM to 6PM", label: "Mon - Fri" }
      //   stats[1] = { value: "8AM to 5PM", label: "Saturday" }
      // Falls back to parsing inputs.hours if no stats are provided.
      const label = content.eyebrow || "SERVICE HOURS";
      let cards =
        content.stats && content.stats.length >= 2
          ? content.stats.slice(0, 2)
          : ([
              { value: "7AM to 6PM", label: "Mon - Fri" },
              { value: "8AM to 5PM", label: "Saturday" },
            ] as { value: string; label?: string }[]);
      // Try to parse "Mon-Fri 7:30-6 · Sat 8-4" into two card halves.
      if (
        (!content.stats || content.stats.length < 2) &&
        content.contact?.hours
      ) {
        const parts = content.contact.hours.split(/[·•|,]/).map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const toCard = (p: string) => {
            const m = p.match(/^([\w\s\-]+?)\s+(.+)$/);
            return m ? { value: m[2].trim(), label: m[1].trim() } : { value: p, label: "" };
          };
          cards = [toCard(parts[0]), toCard(parts[1])];
        }
      }

      const footerH = content.contact ? 110 : 0;
      const renderTime = (txt: string) => {
        // Render "7AM to 6PM" with tiny AM/PM subscripts and small lowercase "to".
        const tokens = txt.split(/\s+/);
        return (
          <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 6 }}>
            {tokens.map((tok, i) => {
              const m = tok.match(/^(\d+(?::\d+)?)(am|pm|AM|PM)?$/i);
              if (m && m[2]) {
                return (
                  <span key={i} style={{ display: "inline-flex", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "1em", fontWeight: 400 }}>{m[1]}</span>
                    <span
                      style={{
                        fontSize: "0.3em",
                        fontWeight: 600,
                        paddingLeft: 3,
                        paddingBottom: "0.55em",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {m[2].toUpperCase()}
                    </span>
                  </span>
                );
              }
              if (/^to$/i.test(tok)) {
                return (
                  <span
                    key={i}
                    style={{ fontSize: "0.36em", fontWeight: 400, paddingBottom: "0.6em" }}
                  >
                    {tok.toLowerCase()}
                  </span>
                );
              }
              return (
                <span key={i} style={{ fontSize: "1em" }}>
                  {tok}
                </span>
              );
            })}
          </span>
        );
      };

      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.18)" }}
          />
          <div
            className="absolute flex flex-col items-center"
            style={{
              top: padding * 0.6,
              left: padding,
              right: padding,
              bottom: footerH + padding * 0.5,
              color: "#fff",
            }}
          >
            {/* SERVICE HOURS top tab */}
            <div
              className="mb-6 inline-flex items-center justify-center"
              style={{
                border: "2px solid #ffffffd9",
                padding: "10px 28px",
                background: "transparent",
              }}
            >
              <Editable
                text={label}
                editable={editable}
                onChange={(v) => onTextEdit?.("eyebrow", v)}
                {...dragProps("eyebrow")}
                style={{
                  fontFamily: titleFamily,
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "#fff",
                  textTransform: "uppercase",
                }}
              />
            </div>

            <div className="flex w-full max-w-[88%] items-stretch justify-center gap-5">
              {cards.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center justify-center text-center"
                  style={{
                    border: "2px solid #ffffffd9",
                    padding: 28,
                    minHeight: 200,
                    background: "transparent",
                  }}
                >
                  <div
                    style={{
                      fontFamily: titleFamily,
                      fontSize: 36,
                      fontWeight: 400,
                      color: "#fff",
                      marginBottom: 12,
                    }}
                  >
                    {c.label}
                  </div>
                  <div
                    style={{
                      fontFamily: titleFamily,
                      fontSize: 64,
                      lineHeight: 1,
                      fontWeight: 400,
                      color: "#fff",
                    }}
                  >
                    {renderTime(String(c.value))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <FooterStrip content={content} padding={padding} />
        </div>
      );
    }

    case "model-lineup": {
      // Image 1.jpg — "Which Lincoln SUV is right for you?" lineup.
      // Light cream background, top centered question, 2×2 grid of model
      // labels ("2026 Lincoln" + huge serif model name), persistent footer.
      const models =
        (content.bullets && content.bullets.length >= 4
          ? content.bullets.slice(0, 4)
          : ["AVIATOR", "CORSAIR", "NAVIGATOR", "NAUTILUS"]
        ).map((m) => m.toUpperCase());
      const year = new Date().getFullYear();
      // The brand prefix shown above each model name (e.g. "2026 Lincoln").
      // Try to derive a short single-word brand from the dealership name —
      // "Parks Lincoln of Longwood" → "Lincoln". Falls back to the full
      // brand name if no obvious manufacturer word is present.
      const KNOWN_MAKES = [
        "Lincoln", "BMW", "Nissan", "Subaru", "Honda", "Toyota", "Hyundai",
        "Acura", "Ford", "Chevrolet", "Dodge", "Chrysler", "Jeep",
        "Mercedes", "Audi", "Volkswagen", "Mazda", "Kia", "Volvo",
      ];
      const brandWord =
        KNOWN_MAKES.find((m) =>
          (content.brandName || "").toLowerCase().includes(m.toLowerCase())
        ) || content.brandName || "Lincoln";
      const makerLine = `${year} ${brandWord}`;
      const footerH = content.contact ? 110 : 0;
      return (
        <div className="absolute inset-0" style={{ background: "#F2EFE9" }}>
          {/* Subtle vignette so the cream isn't flat */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(255,255,255,0.0) 0%, rgba(0,0,0,0.04) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0"
            style={{
              top: padding * 0.7,
              padding: `0 ${padding}px`,
            }}
          >
            <Editable
              text={content.title || "Which model is right for you?"}
              editable={editable}
              onChange={(v) => onTextEdit?.("title", v)}
              {...dragProps("title")}
              className="max-w-[80%] mx-auto text-center text-balance"
              style={{
                fontFamily: titleFamily,
                fontSize: 44,
                fontWeight: 400,
                lineHeight: 1.15,
                color: "#0B0D0F",
              }}
            />
          </div>

          <div
            className="absolute grid"
            style={{
              top: padding * 0.7 + 130,
              left: padding,
              right: padding,
              bottom: footerH + padding * 0.6,
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              rowGap: padding * 0.2,
              columnGap: padding * 0.2,
            }}
          >
            {models.slice(0, 4).map((model, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center text-center"
              >
                <div
                  style={{
                    fontFamily: titleFamily,
                    fontSize: 18,
                    fontStyle: "italic",
                    color: "#0B0D0F",
                    marginBottom: -4,
                  }}
                >
                  {makerLine}
                </div>
                <Editable
                  text={model}
                  editable={editable}
                  {...dragProps(`lineup-${i}`)}
                  style={{
                    fontFamily: titleFamily,
                    fontSize: 60,
                    fontWeight: 700,
                    color: "#0B0D0F",
                    letterSpacing: "0.005em",
                    lineHeight: 1,
                  }}
                />
              </div>
            ))}
          </div>
          {/* Lineup uses a dark footer on cream bg */}
          {content.contact && (
            <div
              className="absolute inset-x-0 bottom-0 flex items-start justify-around gap-6"
              style={{
                paddingTop: 0,
                paddingRight: padding * 0.6,
                paddingBottom: padding * 0.6,
                paddingLeft: padding * 0.6,
                color: "#0B0D0F",
              }}
            >
              {[
                content.contact?.phone && {
                  Icon: Phone,
                  primary: content.contact.phone,
                  secondary: content.contact.hours,
                },
                content.contact?.website && {
                  Icon: Globe,
                  primary: content.contact.website,
                },
                content.contact?.address && {
                  Icon: MapPin,
                  primary: content.contact.address,
                },
              ]
                .filter(Boolean)
                .map((it: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-left">
                    <span className="mt-0.5 shrink-0">
                      <it.Icon style={{ width: 16, height: 16, opacity: 0.85 }} />
                    </span>
                    <div>
                      <div style={{ fontSize: 16, lineHeight: 1.3, fontWeight: 500 }}>
                        {it.primary}
                      </div>
                      {it.secondary && (
                        <div
                          style={{
                            fontSize: 12,
                            lineHeight: 1.3,
                            color: "#0B0D0Fb3",
                            marginTop: 2,
                          }}
                        >
                          {it.secondary}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      );
    }

    case "drive-time-map": {
      // Image 4 2.jpg — drive-time map of nearby cities with white pin markers
      // and a dashed connecting line. Photo full-bleed; pins are overlaid.
      // Pin data comes from bullets formatted as "City | 30 mins".
      const pins =
        (content.bullets && content.bullets.length
          ? content.bullets.slice(0, 6)
          : [
              "Lake Nona | 30 mins",
              "Kissimmee | 35 mins",
              "Winter Garden | 25 mins",
              "Dr. Phillips | 22 mins",
              "College Park | 18 mins",
              "Downtown Orlando | 15 - 20 mins",
              "Winter Park | 12 mins",
              "Maitland | 10 mins",
            ]
        ).map((s) => {
          const [city, time] = s.split(/\s*\|\s*/);
          return { city: (city || s).trim(), time: (time || "").trim() };
        });

      // Hand-tuned approximate positions matching the reference (percentages
      // relative to the slide). Each pin gets one of these slots in order.
      const slots = [
        { x: 56, y: 18 },
        { x: 80, y: 28 },
        { x: 60, y: 32 },
        { x: 50, y: 46 },
        { x: 22, y: 56 },
        { x: 40, y: 68 },
        { x: 55, y: 75 },
        { x: 45, y: 86 },
      ];

      const footerH = 0;
      return (
        <div className="absolute inset-0">
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <PlaceholderArt accent={accent} bg={template.palette.surface} />
          )}
          {/* Subtle darkening so white pins read */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.15)" }}
          />
          {/* Pin overlay */}
          {pins.slice(0, slots.length).map((p, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2"
              style={{ left: `${slots[i].x}%`, top: `${slots[i].y}%` }}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  style={{
                    fontFamily: titleFamily,
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#fff",
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}
                >
                  {p.city}
                </div>
                {p.time && (
                  <div
                    style={{
                      fontSize: 16,
                      color: "#ffffffd9",
                      textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                    }}
                  >
                    {p.time}
                  </div>
                )}
                <div
                  className="mt-2 grid h-5 w-5 place-items-center rounded-full"
                  style={{
                    background: "#E53935",
                    border: "2px solid #fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                  }}
                />
              </div>
            </div>
          ))}
          {/* Dealership address pin bottom-left */}
          {content.contact?.address && (
            <div
              className="absolute flex items-start gap-2"
              style={{ left: padding, bottom: padding * 0.7, maxWidth: "55%" }}
            >
              <span className="mt-1">
                <MapPin
                  style={{
                    width: 22,
                    height: 22,
                    color: "#E53935",
                    fill: "#E53935",
                    stroke: "#fff",
                    strokeWidth: 1.5,
                  }}
                />
              </span>
              <div
                style={{
                  fontFamily: titleFamily,
                  fontSize: 22,
                  color: "#fff",
                  lineHeight: 1.25,
                  textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                }}
              >
                {content.contact.address}
              </div>
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}


function PlaceholderArt({ accent, bg }: { accent: string; bg: string }) {
  return (
    <div
      className="h-full w-full"
      style={{
        background: `radial-gradient(circle at 30% 20%, ${accent}55, transparent 50%), radial-gradient(circle at 70% 80%, ${accent}44, transparent 60%), ${bg}`,
      }}
    />
  );
}

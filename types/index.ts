export type AspectRatio = "ig" | "square" | "fb" | "google";

export const ASPECT_RATIOS: Record<
  AspectRatio,
  { label: string; w: number; h: number; cssRatio: string }
> = {
  ig:     { label: "IG · 1080 × 1350",     w: 1080, h: 1350, cssRatio: "4 / 5" },
  square: { label: "Square · 1080 × 1080", w: 1080, h: 1080, cssRatio: "1 / 1" },
  fb:     { label: "FB · 1200 × 1500",     w: 1200, h: 1500, cssRatio: "4 / 5" },
  google: { label: "Google · 1200 × 900",  w: 1200, h: 900,  cssRatio: "4 / 3" },
};

export type TemplateId =
  | "a3-brand"
  | "premium-dealer"
  | "luxury-automotive"
  | "real-estate"
  | "fitness"
  | "fashion"
  | "ai-startup"
  | "corporate"
  | "dark-minimal"
  | "futuristic-neon";

export interface TemplateTheme {
  id: TemplateId;
  name: string;
  tagline: string;
  category: string;
  palette: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
  };
  fonts: {
    display: string; // CSS font-family value
    body: string;
  };
  vibe: "bold" | "elegant" | "energetic" | "minimal" | "neon";
  // Background generator hint: gradient/mesh/grid/noise/photo
  backdrop: BackdropKind;
}

export type LayoutVariant =
  | "centered-hero"
  | "split-image-left"
  | "split-image-right"
  | "image-bg-overlay"
  | "stat-block"
  | "quote-card"
  | "list-stack"
  | "title-corner"
  | "minimal-edge"
  | "magazine"
  | "neon-frame"
  | "image-collage"
  // Dealership-inspired (premium photo-forward) layouts
  | "stats-row"
  | "info-strip"
  | "framed-card"
  | "hero-headline"
  // Parks-Lincoln-inspired premium dealer layouts
  | "model-hero"
  | "brand-card"
  | "dual-frame"
  | "model-lineup"
  | "drive-time-map";

export type ImageFilter =
  | "none"
  | "bw"
  | "vintage"
  | "darken"
  | "brighten"
  | "blur"
  | "vivid";

export interface SlideContent {
  kind: "cover" | "content" | "stat" | "quote" | "list" | "cta";
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  stat?: { value: string; label: string };
  // For stats-row: rendered as a row of mini-stats with dividers.
  stats?: { value: string; suffix?: string; label?: string }[];
  // For info-strip: 3 contact items shown bottom of slide.
  contact?: {
    phone?: string;
    website?: string;
    address?: string;
    // Optional secondary lines paired with the primary value (e.g., business hours).
    hours?: string;
  };
  imageUrl?: string;
  // Optional CSS filter preset applied to the background image (or to the
  // image used by image-aware layouts). When set, SlideRenderer applies the
  // matching CSS filter chain.
  imageFilter?: ImageFilter;
  // Per-slide image position / zoom / inset controls. x and y offset the
  // image inside its container (px in slide-native units), scale zooms in
  // (1 = cover, 2 = 2x), margin adds padding so the image floats inside
  // a frame instead of full-bleed.
  imageTransform?: {
    x?: number;
    y?: number;
    scale?: number;
    margin?: number;
  };
  // Optional solid color background that REPLACES the image (and the
  // template's default backdrop) — useful when the dealer wants a flat
  // color slide instead of a photo.
  bgColor?: string;
  number?: number; // page number
  brandName?: string;
  brandLogoUrl?: string;
  // Per-slide override for the corner logo badge: position offsets (px in
  // slide-native units) and a scale multiplier (1 = default size).
  logoPosition?: { x?: number; y?: number };
  logoScale?: number;
}

export type BackdropKind =
  | "mesh"
  | "gradient"
  | "grid"
  | "noise"
  | "spotlight"
  | "scanlines";

export interface CustomTextElement {
  id: string;
  text: string;
  x: number; // px in slide-native coords (top-left origin)
  y: number;
  style?: ElementStyle;
}

// Shape primitives: thin lines, rectangles, circles. Reuse the same drag /
// select / delete infrastructure as custom text but render as a styled div.
export type ShapeKind = "rect" | "line" | "circle";

export interface CustomShapeElement {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  // For "rect" only — when true, only the border is rendered (no fill).
  outline?: boolean;
  borderWidth?: number;
  opacity?: number;
}

export interface Slide {
  id: string;
  layout: LayoutVariant;
  content: SlideContent;
  // Freeform text elements added via the "Add text" button — independent of
  // the layout's built-in fields, fully draggable + styleable + deletable.
  customTexts?: CustomTextElement[];
  // Freeform shape primitives (line / rect / circle) added via "Add shape".
  customShapes?: CustomShapeElement[];
  // Per-slide backdrop, overrides template default. Varied across the deck so
  // each slide feels visually distinct.
  backdrop?: BackdropKind;
  // Per-deck display-font override, propagated to every slide of the same
  // generation so the carousel reads as one design pass even when the template
  // is reused across many generations.
  displayFont?: string;
  // small per-slide style overrides
  overrides?: {
    accent?: string;
    align?: "left" | "center" | "right";
    rotation?: number;
    scale?: number;
    // True when the user manually set/cleared this slide's image via the
    // per-slide Background picker. Auto-sync from the project image pool
    // skips locked slides so user choices aren't clobbered.
    imageLocked?: boolean;
    // Free positioning offsets (in slide-native coordinates) per text element.
    // Keys: "title" | "subtitle" | "body" | "eyebrow" | "stat-label".
    positions?: Record<string, { x: number; y: number }>;
    // Per-element typography overrides. Keys mirror dragKey ("title", etc.).
    styles?: Record<string, ElementStyle>;
  };
}

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: number; // px in slide-native units
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
  letterSpacing?: number; // em
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface CarouselProject {
  id: string;
  name: string;
  templateId: TemplateId;
  aspect: AspectRatio;
  brandName?: string;
  brandLogoUrl?: string;
  headline: string;
  subtitle: string;
  body: string;
  imageUrls: string[];
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // dataURL
}

export interface GeneratorInputs {
  templateId: TemplateId;
  aspect: AspectRatio;
  brandName: string;
  brandLogoUrl?: string;
  headline: string;
  subtitle: string;
  body: string;
  imageUrls: string[];
  bullets?: string[];
  ctaText?: string;
  // Optional contact info shown by dealership-style info-strip layout.
  phone?: string;
  website?: string;
  address?: string;
  hours?: string;
  // When set by a template preset, these stats override the auto-extracted
  // dealershipStats so the rendered deck matches the reference photo exactly.
  presetStats?: { value: string; suffix?: string; label?: string }[];
}

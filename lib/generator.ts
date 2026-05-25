import { nanoid } from "nanoid";
import { hashString, makeRng, rand, shuffle } from "./utils";
import type {
  BackdropKind,
  GeneratorInputs,
  LayoutVariant,
  Slide,
  SlideContent,
  TemplateTheme,
} from "@/types";
import { getTemplate } from "./templates";

const ALL_BACKDROPS: BackdropKind[] = [
  "mesh",
  "gradient",
  "grid",
  "noise",
  "spotlight",
  "scanlines",
];

// A "structure mode" describes the high-level shape of a deck — what kinds of
// slides it leans on, how dense the typography is, whether it leads with
// photos or numbers. Each Generate click picks a different mode so two
// consecutive decks built from the same pattern can still feel structurally
// different.
type StructureMode =
  | "balanced"
  | "text-forward"
  | "image-forward"
  | "stat-forward"
  | "quote-forward"
  | "minimal";

const MODE_BIAS: Record<StructureMode, LayoutVariant[]> = {
  balanced: [
    "centered-hero", "magazine", "split-image-left", "stat-block",
    "quote-card", "minimal-edge", "list-stack", "image-bg-overlay",
    "model-hero", "brand-card",
  ],
  "text-forward": [
    "centered-hero", "title-corner", "minimal-edge", "list-stack",
    "quote-card", "hero-headline", "brand-card", "model-hero",
  ],
  "image-forward": [
    "image-bg-overlay", "magazine", "image-collage", "split-image-left",
    "split-image-right", "hero-headline", "info-strip", "stats-row",
    "model-hero", "brand-card",
  ],
  "stat-forward": [
    "stat-block", "stats-row", "framed-card", "stat-block",
    "image-bg-overlay", "split-image-right", "dual-frame", "framed-card",
  ],
  "quote-forward": [
    "quote-card", "centered-hero", "quote-card", "minimal-edge",
    "split-image-left", "magazine", "brand-card",
  ],
  minimal: [
    "minimal-edge", "title-corner", "centered-hero", "framed-card",
    "list-stack", "stats-row", "brand-card", "model-hero",
  ],
};

const ALL_MODES: StructureMode[] = [
  "balanced",
  "text-forward",
  "image-forward",
  "stat-forward",
  "quote-forward",
  "minimal",
];

const recentModes: StructureMode[] = [];
function pickStructureMode(rng: () => number): StructureMode {
  const cand = ALL_MODES.filter((m) => !recentModes.includes(m));
  const pool = cand.length ? cand : ALL_MODES;
  const chosen = pool[Math.floor(rng() * pool.length)];
  recentModes.unshift(chosen);
  if (recentModes.length > Math.min(3, ALL_MODES.length - 1)) recentModes.pop();
  return chosen;
}

const recentCounts: number[] = [];
function pickSlideCount(rng: () => number): number {
  const options = [5, 6, 7];
  const cand = options.filter((c) => !recentCounts.includes(c));
  const pool = cand.length ? cand : options;
  const chosen = pool[Math.floor(rng() * pool.length)];
  recentCounts.unshift(chosen);
  if (recentCounts.length > 2) recentCounts.pop();
  return chosen;
}

// Per-generation display-font pool, biased by the template's vibe. Even when
// a template is reused across many Generate clicks, the headline typeface
// shifts inside its vibe family so the deck feels visibly different.
const FONT_POOLS: Record<TemplateTheme["vibe"], string[]> = {
  elegant: [
    '"Playfair Display", serif',
    '"DM Serif Display", serif',
    '"Cormorant Garamond", serif',
    '"Lora", serif',
  ],
  bold: [
    '"Sora", system-ui, sans-serif',
    '"Anton", sans-serif',
    '"Archivo Black", sans-serif',
    '"Bebas Neue", sans-serif',
    '"Oswald", sans-serif',
  ],
  energetic: [
    '"Oswald", sans-serif',
    '"Bebas Neue", sans-serif',
    '"Anton", sans-serif',
    '"Archivo Black", sans-serif',
  ],
  minimal: [
    '"Sora", system-ui, sans-serif',
    '"Inter", system-ui, sans-serif',
    '"Manrope", system-ui, sans-serif',
    '"Space Grotesk", sans-serif',
    '"Bricolage Grotesque", sans-serif',
  ],
  neon: [
    '"Space Grotesk", sans-serif',
    '"Sora", system-ui, sans-serif',
    '"Bricolage Grotesque", sans-serif',
    '"Manrope", system-ui, sans-serif',
  ],
};

const recentFonts: string[] = [];
function pickDisplayFont(template: TemplateTheme, rng: () => number): string {
  const pool = FONT_POOLS[template.vibe] ?? [];
  if (pool.length === 0) return template.fonts.display;
  // Always include the template's own display font as a valid pick so users
  // who chose a template for its typography still see it some of the time.
  const expanded = [...pool, template.fonts.display];
  const fresh = expanded.filter((f) => !recentFonts.includes(f));
  const candidates = fresh.length ? fresh : expanded;
  const chosen = candidates[Math.floor(rng() * candidates.length)];
  recentFonts.unshift(chosen);
  if (recentFonts.length > 3) recentFonts.pop();
  return chosen;
}

// Per-generation alignment bias — pushes most slides toward the picked
// alignment so the deck has a consistent compositional "voice". "mixed"
// preserves per-slide randomness.
type AlignBias = "left" | "center" | "right" | "mixed";
const ALL_ALIGNS: AlignBias[] = ["left", "center", "right", "mixed"];
const recentAligns: AlignBias[] = [];
function pickAlignBias(rng: () => number): AlignBias {
  const cand = ALL_ALIGNS.filter((a) => !recentAligns.includes(a));
  const pool = cand.length ? cand : ALL_ALIGNS;
  const chosen = pool[Math.floor(rng() * pool.length)];
  recentAligns.unshift(chosen);
  if (recentAligns.length > 2) recentAligns.pop();
  return chosen;
}

function alignFromBias(
  bias: AlignBias,
  rng: () => number
): "left" | "center" | "right" {
  if (bias === "mixed") {
    return (["left", "center", "right"] as const)[Math.floor(rng() * 3)];
  }
  // Strong bias toward the picked alignment, occasional deviation for rhythm.
  return rng() < 0.75 ? bias : (["left", "center", "right"] as const)[Math.floor(rng() * 3)];
}

// A "design pattern" is a curated recipe for a deck — the layout sequence,
// dominant backdrop family, and accent rotation strategy. We rotate patterns
// across generations so two consecutive Generate clicks never produce the
// same vibe.
interface DesignPattern {
  id: string;
  name: string;
  // Layouts that anchor the pattern (cover, mids, cta).
  cover: LayoutVariant[];
  mids: LayoutVariant[];
  cta: LayoutVariant[];
  // Backdrops the pattern likes; rotated across slides.
  backdrops: BackdropKind[];
  // Accent rotation strategy.
  accentMode: "single" | "alternate" | "triad";
  // Vibes this pattern best fits.
  vibes: TemplateTheme["vibe"][];
}

const PATTERNS: DesignPattern[] = [
  {
    id: "editorial",
    name: "Editorial",
    cover: ["magazine", "centered-hero", "title-corner"],
    mids: ["split-image-left", "minimal-edge", "quote-card", "split-image-right", "magazine", "list-stack"],
    cta: ["minimal-edge", "centered-hero"],
    backdrops: ["gradient", "noise", "grid"],
    accentMode: "single",
    vibes: ["elegant", "minimal"],
  },
  {
    id: "neon-stack",
    name: "Neon Stack",
    cover: ["neon-frame", "image-bg-overlay", "centered-hero"],
    mids: ["image-bg-overlay", "stat-block", "neon-frame", "quote-card", "split-image-right"],
    cta: ["neon-frame", "centered-hero"],
    backdrops: ["mesh", "spotlight", "scanlines"],
    accentMode: "alternate",
    vibes: ["neon", "bold", "energetic"],
  },
  {
    id: "minimal-grid",
    name: "Minimal Grid",
    cover: ["title-corner", "centered-hero", "minimal-edge"],
    mids: ["minimal-edge", "title-corner", "list-stack", "stat-block", "quote-card", "split-image-left"],
    cta: ["minimal-edge", "title-corner"],
    backdrops: ["grid", "noise", "gradient"],
    accentMode: "single",
    vibes: ["minimal", "elegant"],
  },
  {
    id: "magazine-flow",
    name: "Magazine Flow",
    cover: ["magazine", "image-bg-overlay"],
    mids: ["magazine", "split-image-left", "image-collage", "split-image-right", "minimal-edge", "quote-card"],
    cta: ["minimal-edge", "centered-hero"],
    backdrops: ["noise", "gradient", "spotlight"],
    accentMode: "triad",
    vibes: ["elegant", "bold"],
  },
  {
    id: "stat-burst",
    name: "Stat Burst",
    cover: ["image-bg-overlay", "centered-hero"],
    mids: ["stat-block", "quote-card", "stat-block", "split-image-left", "image-bg-overlay", "list-stack"],
    cta: ["centered-hero", "neon-frame"],
    backdrops: ["spotlight", "mesh", "scanlines"],
    accentMode: "alternate",
    vibes: ["bold", "energetic"],
  },
  {
    id: "story-arc",
    name: "Story Arc",
    cover: ["centered-hero", "image-bg-overlay"],
    mids: ["split-image-left", "image-bg-overlay", "split-image-right", "minimal-edge", "magazine", "quote-card"],
    cta: ["neon-frame", "minimal-edge"],
    backdrops: ["scanlines", "gradient", "spotlight"],
    accentMode: "alternate",
    vibes: ["energetic", "bold"],
  },
  {
    id: "quote-led",
    name: "Quote Led",
    cover: ["centered-hero", "title-corner"],
    mids: ["quote-card", "split-image-left", "quote-card", "image-bg-overlay", "list-stack", "minimal-edge"],
    cta: ["minimal-edge", "centered-hero"],
    backdrops: ["gradient", "noise", "grid"],
    accentMode: "single",
    vibes: ["elegant", "minimal"],
  },
  {
    id: "bold-geometry",
    name: "Bold Geometry",
    cover: ["title-corner", "neon-frame", "magazine"],
    mids: ["magazine", "neon-frame", "stat-block", "image-collage", "minimal-edge", "split-image-right"],
    cta: ["neon-frame", "title-corner"],
    backdrops: ["mesh", "grid", "spotlight"],
    accentMode: "triad",
    vibes: ["bold", "neon", "energetic"],
  },
  {
    // Dealership-style: photo-forward, light typography, framed cards & stat
    // strips, real contact info. Inspired by premium auto dealer carousels.
    id: "dealership",
    name: "Dealership",
    cover: ["model-hero", "hero-headline", "brand-card"],
    mids: ["stats-row", "framed-card", "model-hero", "dual-frame", "brand-card", "model-hero"],
    cta: ["brand-card", "model-hero", "info-strip"],
    backdrops: ["spotlight", "gradient", "noise"],
    accentMode: "single",
    vibes: ["elegant", "minimal", "bold"],
  },
];

// Module-level memory of recent generations so consecutive Generate clicks
// never produce the same pattern. A small ring buffer keeps the last ~3
// pattern ids — we exclude those when picking the next one.
const recentPatterns: string[] = [];
function pickPattern(template: TemplateTheme, rng: () => number): DesignPattern {
  // Prefer patterns matching the template's vibe; fall back to any pattern.
  const onVibe = PATTERNS.filter((p) => p.vibes.includes(template.vibe));
  const pool = onVibe.length >= 2 ? onVibe : PATTERNS;
  const candidates = shuffle(pool, rng).filter((p) => !recentPatterns.includes(p.id));
  const chosen = candidates[0] ?? shuffle(pool, rng)[0];
  recentPatterns.unshift(chosen.id);
  if (recentPatterns.length > Math.min(3, PATTERNS.length - 1)) recentPatterns.pop();
  return chosen;
}

// Build a unique-by-default sequence of layouts from a pattern, weighted by
// the active structure mode. Each slot pulls from the pattern + mode pools;
// once exhausted we fall back to ALL layouts (still avoiding immediate
// repeats) so longer decks remain varied.
function pickLayouts(
  pattern: DesignPattern,
  mode: StructureMode,
  slideCount: number,
  rng: () => number
): LayoutVariant[] {
  const seen = new Set<LayoutVariant>();
  const slots: LayoutVariant[] = [];

  const modeBias = MODE_BIAS[mode];

  const pickFromPool = (
    patternPool: LayoutVariant[],
    prev?: LayoutVariant
  ): LayoutVariant => {
    // Blend: 2x weight to layouts that appear in BOTH pattern pool and mode
    // bias; 1x to either side. This means the mode actively reshapes the deck
    // without breaking the pattern's identity.
    const intersect = patternPool.filter((l) => modeBias.includes(l));
    const blended = [...intersect, ...intersect, ...patternPool, ...modeBias];
    const fresh = shuffle(blended, rng).filter((l) => !seen.has(l) && l !== prev);
    if (fresh.length) return fresh[0];
    // Pool exhausted: fall back to any layout that wasn't *just* used.
    const ALL: LayoutVariant[] = [
      "centered-hero", "split-image-left", "split-image-right", "image-bg-overlay",
      "stat-block", "quote-card", "list-stack", "title-corner", "minimal-edge",
      "magazine", "neon-frame", "image-collage",
      "stats-row", "info-strip", "framed-card", "hero-headline",
    ];
    const anyFresh = shuffle(ALL, rng).filter((l) => l !== prev);
    return anyFresh[0];
  };

  // Cover
  const cover = pickFromPool(pattern.cover);
  seen.add(cover);
  slots.push(cover);

  // Mids
  let prev = cover;
  for (let i = 1; i < slideCount - 1; i++) {
    const pick = pickFromPool(pattern.mids, prev);
    seen.add(pick);
    slots.push(pick);
    prev = pick;
  }

  // CTA — must differ from previous slide
  const cta = pickFromPool(pattern.cta, prev);
  slots.push(cta);

  return slots;
}

// Pick a backdrop sequence: each slide may differ from its neighbor and is
// drawn from the pattern's preferred backdrop family.
function pickBackdrops(
  pattern: DesignPattern,
  slideCount: number,
  rng: () => number
): BackdropKind[] {
  const out: BackdropKind[] = [];
  let prev: BackdropKind | undefined;
  for (let i = 0; i < slideCount; i++) {
    const pool = shuffle(
      // 70/30 weight toward pattern's preferred backdrops vs. all
      [...pattern.backdrops, ...pattern.backdrops, ...ALL_BACKDROPS],
      rng
    ).filter((b) => b !== prev);
    out.push(pool[0]);
    prev = pool[0];
  }
  return out;
}

// Build an accent rotation per slide based on the pattern's mode.
function pickAccents(
  pattern: DesignPattern,
  template: TemplateTheme,
  slideCount: number,
  rng: () => number
): string[] {
  const a = template.palette.accent;
  const b = template.palette.accent2;
  const c = template.palette.text;
  switch (pattern.accentMode) {
    case "single":
      return Array(slideCount).fill(rng() > 0.5 ? a : b);
    case "alternate":
      return Array.from({ length: slideCount }, (_, i) => (i % 2 === 0 ? a : b));
    case "triad":
      return Array.from({ length: slideCount }, (_, i) => [a, b, c][i % 3]);
  }
}

function chunkBody(body: string): string[] {
  // Split body into 3-6 logical fragments for content slides
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).trim().length > 180 && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur = (cur + " " + s).trim();
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function inferStats(body: string): { value: string; label: string }[] {
  const matches = Array.from(
    body.matchAll(/(\$?\d[\d,\.]*\s?(?:k|m|b|%|x)?)/gi)
  ).map((m) => m[1]);
  const stats: { value: string; label: string }[] = [];
  for (const m of matches.slice(0, 4)) {
    stats.push({ value: m.toUpperCase(), label: "Highlight" });
  }
  return stats;
}

// Build a row of 3-4 stats for the dealership-style layouts. Tries to extract
// real numbers from the body / bullets first, then falls back to plausible
// stats derived from the brand + headline so the layout always looks intentional.
function buildDealershipStats(
  inputs: GeneratorInputs,
  numbers: { value: string; label: string }[],
  bullets: string[]
): { value: string; suffix?: string; label?: string }[] {
  const out: { value: string; suffix?: string; label?: string }[] = [];

  // Convert any numeric matches into row stats, splitting unit suffix where
  // possible (e.g. "51yrs" → value:"51", suffix:"yrs").
  for (const n of numbers) {
    const m = n.value.match(/^([\$\d.,]+)([a-zA-Z%★]*)$/);
    if (!m) continue;
    out.push({ value: m[1], suffix: m[2] || undefined, label: shortLabelFor(out.length) });
  }

  // Top-up from bullets ("3505 N US 17-92, Longwood" → value first token, label rest)
  for (const b of bullets) {
    if (out.length >= 4) break;
    const tok = b.match(/^([\d.,]+\s?\S*)\s*(.*)$/);
    if (tok) out.push({ value: tok[1].trim(), label: tok[2].trim() || b });
    else out.push({ value: b.split(" ")[0], label: b });
  }

  // Plausible fallbacks if we still don't have enough, so the layout doesn't
  // look broken with empty content.
  while (out.length < 3) {
    const fallback = [
      { value: "12", suffix: "yrs", label: "in business" },
      { value: "4.9", suffix: "★", label: "verified reviews" },
      { value: "2.4k", label: "happy customers" },
      { value: "100", suffix: "%", label: "satisfaction" },
    ][out.length];
    if (!fallback) break;
    out.push(fallback);
  }
  return out.slice(0, 4);
}

function shortLabelFor(i: number): string {
  return ["highlight", "by the numbers", "verified", "this year"][i] ?? "stat";
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// Parse "Mon-Fri 7:30-6 · Sat 8-4" → two card halves used by dual-frame.
function parseDualHours(
  hours: string | undefined
): { value: string; label: string }[] {
  if (!hours) {
    return [
      { value: "7AM to 6PM", label: "Mon - Fri" },
      { value: "8AM to 5PM", label: "Saturday" },
    ];
  }
  const parts = hours
    .split(/[·•|,]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return [
      { value: hours, label: "Hours" },
      { value: "Closed", label: "Sunday" },
    ];
  }
  const toCard = (raw: string) => {
    // Split on first whitespace between days and times. Heuristic: the label
    // is the leading day word(s) like "Mon-Fri" or "Sat" or "Saturday".
    const m = raw.match(/^([A-Za-z][A-Za-z\s\-]+?)\s+(.+)$/);
    if (m) {
      const label = m[1].trim();
      const timeRaw = m[2].trim();
      // Normalize "7:30-6" or "7-6" → "7AM to 6PM" (rough)
      const norm = timeRaw.replace(
        /^(\d{1,2})(?::\d{2})?\s*-\s*(\d{1,2})(?::\d{2})?$/,
        "$1AM to $2PM"
      );
      return { value: norm, label };
    }
    return { value: raw, label: "" };
  };
  return [toCard(parts[0]), toCard(parts[1])];
}

function inferBullets(body: string, fallback: string[] = []): string[] {
  // Look for newline-separated short phrases or commas; otherwise build from sentences.
  const lines = body
    .split(/\n+|•|·|–|—|•/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 90);
  if (lines.length >= 3) return lines.slice(0, 5);
  if (fallback.length) return fallback.slice(0, 5);
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/[.!?]+$/, ""))
    .filter((s) => s.length > 4 && s.length < 90);
  return sentences.slice(0, 5);
}

// Module-level fingerprint of the most recent deck. Generations are retried
// up to a few times if the fingerprint matches the previous one — guarantees
// each Generate click yields a meaningfully different design.
let lastFingerprint = "";

function fingerprintOf(
  slides: Slide[],
  meta: {
    pattern: string;
    mode: StructureMode;
    count: number;
    font: string;
    align: AlignBias;
  }
): string {
  return [
    `count=${meta.count}`,
    `pattern=${meta.pattern}`,
    `mode=${meta.mode}`,
    `font=${meta.font}`,
    `align=${meta.align}`,
    ...slides.map(
      (s) =>
        `${s.layout}:${s.backdrop}:${s.overrides?.accent ?? ""}:${s.overrides?.align ?? ""}`
    ),
  ].join("|");
}

export function generateSlides(
  inputs: GeneratorInputs,
  opts: { count?: number; seed?: number; pinnedLayout?: LayoutVariant } = {}
): Slide[] {
  // Try several seeds until the resulting fingerprint differs from the
  // previous generation. The fingerprint covers slide count, design pattern,
  // structure mode, display font, alignment bias, and per-slide layout/
  // backdrop/accent/align — so consecutive Generate clicks are guaranteed to
  // produce a meaningfully different deck even on the same template.
  for (let attempt = 0; attempt < 8; attempt++) {
    const seed =
      (opts.seed ?? hashString(`${inputs.headline}|${inputs.body}|${Date.now()}`)) +
      attempt * 9973;
    const built = buildSlides(inputs, opts.count, seed, opts.pinnedLayout);
    const fp = fingerprintOf(built.slides, {
      pattern: built.pattern.id,
      mode: built.mode,
      count: built.count,
      font: built.font,
      align: built.alignBias,
    });
    if (fp !== lastFingerprint || opts.seed != null) {
      lastFingerprint = fp;
      return built.slides;
    }
  }
  // Fallback: take whatever we got on the last attempt.
  const fallback = buildSlides(
    inputs,
    opts.count,
    (opts.seed ?? Date.now()) + 1,
    opts.pinnedLayout
  );
  lastFingerprint = fingerprintOf(fallback.slides, {
    pattern: fallback.pattern.id,
    mode: fallback.mode,
    count: fallback.count,
    font: fallback.font,
    align: fallback.alignBias,
  });
  return fallback.slides;
}

function buildSlides(
  inputs: GeneratorInputs,
  countOverride: number | undefined,
  seed: number,
  pinnedLayout?: LayoutVariant
): {
  slides: Slide[];
  pattern: DesignPattern;
  mode: StructureMode;
  count: number;
  font: string;
  alignBias: AlignBias;
} {
  const rng = makeRng(seed);
  const template = getTemplate(inputs.templateId);

  // Each generation can pick its own slide count, structure mode, display
  // font, and alignment bias so two consecutive Regenerate clicks on the
  // same template feel structurally and visually different.
  const count = Math.max(
    5,
    Math.min(countOverride ?? pickSlideCount(rng), 10)
  );
  const mode = pickStructureMode(rng);
  const pattern = pickPattern(template, rng);
  const displayFont = pickDisplayFont(template, rng);
  const alignBias = pickAlignBias(rng);
  // If the user clicked a layout-specific template card, every slide locks to
  // that layout so the deck mirrors the photo they picked.
  const layouts = pinnedLayout
    ? (Array(count).fill(pinnedLayout) as LayoutVariant[])
    : pickLayouts(pattern, mode, count, rng);
  const backdrops = pickBackdrops(pattern, count, rng);
  const accents = pickAccents(pattern, template, count, rng);

  const chunks = chunkBody(inputs.body);
  const stats = inferStats(inputs.body);
  const bullets = inferBullets(inputs.body, inputs.bullets);

  const images = inputs.imageUrls.length ? inputs.imageUrls : [];
  let imgIdx = 0;
  const nextImage = () => {
    if (!images.length) return undefined;
    const url = images[imgIdx % images.length];
    imgIdx++;
    return url;
  };
  // Every slide gets an image (cycling) so uploaded photos act as backgrounds
  // across the whole deck, not only on image-layout slides.
  const imageForSlide = (i: number): string | undefined => {
    if (!images.length) return undefined;
    return images[i % images.length];
  };

  const slides: Slide[] = [];

  for (let i = 0; i < count; i++) {
    const layout = layouts[i];
    const isFirst = i === 0;
    const isLast = i === count - 1;
    const align = alignFromBias(alignBias, rng);
    const accent = accents[i];
    const backdrop = backdrops[i];
    const rotation = (rng() - 0.5) * (template.vibe === "energetic" ? 4 : 2);

    // Common dealership-style enrichments shared by stats-row / info-strip / etc.
    // Preset stats (from a template click) always win over auto-extracted ones.
    const dealershipStats =
      inputs.presetStats && inputs.presetStats.length
        ? inputs.presetStats
        : buildDealershipStats(inputs, stats, bullets);
    const contact =
      inputs.phone || inputs.website || inputs.address
        ? {
            phone: inputs.phone,
            website: inputs.website,
            address: inputs.address,
            hours: inputs.hours,
          }
        : undefined;

    let content: SlideContent;
    if (isFirst) {
      content = {
        kind: "cover",
        eyebrow: inputs.brandName?.toUpperCase(),
        title: inputs.headline,
        subtitle: inputs.subtitle,
        imageUrl: imageForSlide(i),
        stats: dealershipStats,
        contact,
        number: i + 1,
        brandName: inputs.brandName,
        brandLogoUrl: inputs.brandLogoUrl,
      };
    } else if (isLast) {
      content = {
        kind: "cta",
        eyebrow: "READY?",
        title: inputs.ctaText || "Let's build something legendary.",
        subtitle: inputs.brandName ? `@${inputs.brandName.toLowerCase().replace(/\s+/g, "")}` : "",
        body: inputs.subtitle,
        imageUrl: imageForSlide(i),
        stats: dealershipStats,
        contact,
        number: i + 1,
        brandName: inputs.brandName,
        brandLogoUrl: inputs.brandLogoUrl,
      };
    } else {
      // Mid slide kind chosen by layout affinity
      if (layout === "stats-row") {
        content = {
          kind: "stat",
          stats: dealershipStats,
          imageUrl: imageForSlide(i),
          number: i + 1,
        };
      } else if (layout === "info-strip") {
        content = {
          kind: "content",
          title: inputs.headline,
          subtitle: inputs.subtitle,
          contact,
          imageUrl: imageForSlide(i),
          number: i + 1,
          brandName: inputs.brandName,
          brandLogoUrl: inputs.brandLogoUrl,
        };
      } else if (layout === "framed-card") {
        // Parks-Lincoln "watermark number" framed card (image 3.2).
        // title    = the big watermark (a number/year/anniversary)
        // subtitle = italic serif tagline beside it
        const s = dealershipStats[(i - 1) % Math.max(dealershipStats.length, 1)];
        const watermark = s ? `${s.value}${s.suffix ?? ""}` : "51";
        const tagline =
          (s?.label && capitalize(s.label)) ||
          chunks[(i - 1) % Math.max(chunks.length, 1)] ||
          inputs.subtitle ||
          "years same corner of Seminole County.";
        content = {
          kind: "stat",
          title: watermark,
          subtitle: tagline,
          contact,
          imageUrl: imageForSlide(i),
          number: i + 1,
          brandName: inputs.brandName,
        };
      } else if (layout === "model-hero") {
        // Parks-Lincoln model card (image 6/8/9): "2026 Lincoln" + huge serif
        // model name + italic tagline. We pull the first chunk word as the
        // "model" and synthesize a year/maker line.
        const seedWord =
          chunks[(i - 1) % Math.max(chunks.length, 1)]?.split(" ")[0] ||
          inputs.brandName?.split(" ").pop() ||
          "FEATURE";
        const taglines = [
          "the flagship.",
          "the small luxury one.",
          "the family three-row.",
          "the new standard.",
          "designed for you.",
        ];
        const tagline = taglines[(i - 1) % taglines.length];
        const year = new Date().getFullYear();
        content = {
          kind: "content",
          eyebrow: `${year} ${inputs.brandName || "Lincoln"}`,
          title: seedWord.toUpperCase(),
          subtitle: tagline,
          contact,
          imageUrl: imageForSlide(i),
          number: i + 1,
          brandName: inputs.brandName,
          brandLogoUrl: inputs.brandLogoUrl,
        };
      } else if (layout === "brand-card") {
        // Parks-Lincoln visit card (image 7): centered logo + serif headline.
        content = {
          kind: "content",
          title: `Visit ${inputs.brandName || "Parks Lincoln of Longwood"}.`,
          subtitle: inputs.subtitle,
          contact,
          imageUrl: imageForSlide(i),
          number: i + 1,
          brandName: inputs.brandName,
          brandLogoUrl: inputs.brandLogoUrl,
        };
      } else if (layout === "dual-frame") {
        // Parks-Lincoln service hours card (image 8.2): two side-by-side
        // outlined cards with day + time. Source = inputs.hours, falling back
        // to two stat halves.
        const parsed = parseDualHours(inputs.hours);
        content = {
          kind: "stat",
          eyebrow: "SERVICE HOURS",
          stats: parsed,
          contact,
          imageUrl: imageForSlide(i),
          number: i + 1,
        };
      } else if (layout === "hero-headline") {
        content = {
          kind: "content",
          title:
            chunks[(i - 1) % Math.max(chunks.length, 1)]?.split(/[.!?]/)[0]?.trim() ||
            inputs.headline,
          subtitle: inputs.subtitle,
          contact,
          imageUrl: imageForSlide(i),
          number: i + 1,
          brandName: inputs.brandName,
          brandLogoUrl: inputs.brandLogoUrl,
        };
      } else if (layout === "stat-block" && stats.length) {
        const s = stats[(i - 1) % stats.length] ?? { value: "10X", label: "Result" };
        content = {
          kind: "stat",
          eyebrow: chunks[(i - 1) % Math.max(chunks.length, 1)]?.split(" ").slice(0, 2).join(" ").toUpperCase(),
          title: s.value,
          subtitle: s.label,
          body: chunks[(i - 1) % Math.max(chunks.length, 1)],
          imageUrl: imageForSlide(i),
          number: i + 1,
        };
      } else if (layout === "quote-card") {
        const quote = chunks[(i - 1) % Math.max(chunks.length, 1)] ?? inputs.subtitle;
        content = {
          kind: "quote",
          title: `"${quote}"`,
          subtitle: inputs.brandName,
          imageUrl: imageForSlide(i),
          number: i + 1,
        };
      } else if (layout === "list-stack" && bullets.length) {
        content = {
          kind: "list",
          eyebrow: "WHAT TO KNOW",
          title: chunks[0]?.split(" ").slice(0, 5).join(" ") || inputs.headline,
          bullets,
          imageUrl: imageForSlide(i),
          number: i + 1,
        };
      } else {
        const idx = (i - 1) % Math.max(chunks.length, 1);
        content = {
          kind: "content",
          eyebrow: `0${i + 1}`,
          title:
            chunks[idx]?.split(/[.!?]/)[0]?.trim().slice(0, 60) ||
            inputs.subtitle ||
            inputs.headline,
          body: chunks[idx] || inputs.body.slice(0, 180),
          imageUrl: imageForSlide(i),
          number: i + 1,
        };
      }
    }

    slides.push({
      id: nanoid(8),
      layout,
      backdrop,
      displayFont,
      content,
      overrides: { accent, align, rotation, scale: 1 },
    });
  }

  return { slides, pattern, mode, count, font: displayFont, alignBias };
}

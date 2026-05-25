# A3 Carousel Studio

Dealership-grade Instagram, Facebook, LinkedIn, and Google carousel maker — built exclusively for car dealerships. Modeled on the campaigns A3 Brands runs for 75+ active dealer clients.

## Quickstart

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Node ≥ 18.18 required.

## What's inside

- **Landing page** — hero (with brand thumbnails), social proof from real A3 case studies, features, real-template showcase, CTA.
- **Templates** — brand-tabbed library:
  - **Parks Lincoln** — 9 reference templates with real photos + exact-text presets
  - **BMW** — 10 reference templates from `/photos/bmw/` with real photos + presets
  - **Nissan / Subaru** — same 9-layout catalog with brand-tinted placeholders
- **Generator** — input panel, AI layout engine, live carousel preview, inline text edit with free-drag positioning, per-element font/size/weight/italic toolbar, undo/redo, PNG/ZIP/PDF export.
- **Dashboard / Projects** — saved decks per browser via `localStorage`.

## AI Layout Engine

Every Generate click varies along 6 axes to guarantee a meaningfully different deck:

| Axis | Range |
|---|---|
| Slide count | 5 / 6 / 7 |
| Design pattern | 9 (Editorial, Stat Burst, Dealership, Magazine Flow, …) |
| Structure mode | 6 (balanced, text-forward, image-forward, stat-forward, quote-forward, minimal) |
| Display font | 3–5 fonts per vibe family (e.g., elegant → Playfair / DM Serif / Cormorant / Lora) |
| Alignment bias | left / center / right / mixed |
| Per-slide backdrop + accent + layout | unique within deck |

A module-level fingerprint covering all 6 axes makes the next Generate retry seeds until it produces a deck different from the previous one.

## Layout variants

16 layouts: `centered-hero`, `split-image-left`, `split-image-right`, `image-bg-overlay`, `stat-block`, `quote-card`, `list-stack`, `title-corner`, `minimal-edge`, `magazine`, `neon-frame`, `image-collage`, `stats-row`, `info-strip`, `framed-card`, `hero-headline`, `model-hero`, `brand-card`, `dual-frame`, `model-lineup`, `drive-time-map`.

## Editing

- Click any text → select; drag > 5px → reposition (snaps applied in screen space, scaled to slide-native coords).
- Floating toolbar above the selected text: font picker (17 curated webfonts grouped by category), size stepper, weight, italic, reset.
- Per-slide background image swap (upload, pick from project pool, remove).
- Undo / redo, keyboard shortcuts (Cmd+Z, R for regenerate, E to toggle editing).

## Export

- PNG (full-res 1080×1350 / 1080×1080 / 1200×1500 / 1200×900)
- ZIP (all slides as PNGs)
- PDF (single multi-page deck)

## Stack

Next.js 15 · React 18 · TypeScript · Tailwind CSS · Framer Motion · Radix UI · Lucide Icons · html-to-image · jsPDF · JSZip · Sonner (toasts) · next-themes.

## Project structure

```
app/                Next App Router pages (/, /generator, /templates, /dashboard, /projects)
components/
  generator/        InputPanel, CarouselPreview, ExportBar, TextStyleToolbar
  landing/          Hero, SocialProof, Features, TemplatesShowcase, CTA
  slides/           SlideRenderer (every layout variant), Backdrop
  ui/               Buttons, Card, Tabs, Select, etc. (shadcn-style)
hooks/              useHistory, useKeyboardShortcuts
lib/
  generator.ts      Slide generation engine (patterns, modes, fingerprint)
  templates/        Vibe templates (palette + fonts)
  layout-templates.ts  Photo-driven template cards w/ presets per brand
  brands.ts         Dealership brand defaults (Parks Lincoln, BMW, Nissan, Subaru)
  export.ts         PNG / ZIP / PDF helpers
public/templates/   Reference photos served for template cards
```

## Built by

[A3 Brands](https://a3brands.com) — The Only SEO Agency Built Exclusively for Dealerships.

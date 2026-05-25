import type { LayoutVariant, TemplateId } from "@/types";
import type { BrandId } from "./brands";

// Per-template content overrides — the exact text / stats shown in the
// reference photo. Applied on top of the brand defaults when the user
// clicks a template card so the generated deck matches the reference.
export interface TemplatePreset {
  headline?: string;
  subtitle?: string;
  body?: string;
  ctaText?: string;
  bullets?: string[];
  stats?: { value: string; suffix?: string; label?: string }[];
}

// Photo-driven template cards shown on /templates. Each one is bound to a
// specific brand + LayoutVariant — clicking the card opens the generator
// with that brand's defaults pre-loaded, this layout pinned for every slide,
// and the preset content applied so the deck matches the photo.
export interface LayoutTemplate {
  id: string;
  brand: BrandId;
  name: string;
  tagline: string;
  category: string;
  // Photo source. For brands with real reference sets (Parks Lincoln, BMW)
  // these are real images; other brands fall back to brand-tinted gradients.
  imageSrc?: string;
  layout: LayoutVariant;
  baseTemplateId: TemplateId;
  preset?: TemplatePreset;
}

export function findTemplateById(id: string): LayoutTemplate | undefined {
  return LAYOUT_TEMPLATES.find((t) => t.id === id);
}

// =====================================================================
// PARKS LINCOLN — 9 reference photos from /photos/parks lincoln/
// Presets carry the EXACT text shown in each reference photo so the
// generated deck matches when the user clicks.
// =====================================================================
const PARKS_LINCOLN_TEMPLATES: LayoutTemplate[] = [
  {
    id: "parks-lincoln-model-lineup",
    brand: "parks-lincoln",
    name: "Model Lineup",
    tagline: '"Which model is right for you?" · 2×2 model grid',
    category: "Model launch",
    imageSrc: "/templates/model-lineup.jpg",
    layout: "model-lineup",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "Which Lincoln SUV is right for you?",
      bullets: ["AVIATOR", "CORSAIR", "NAVIGATOR", "NAUTILUS"],
    },
  },
  {
    id: "parks-lincoln-stats-row",
    brand: "parks-lincoln",
    name: "Stats Row",
    tagline: "Bottom strip · 3–4 mini-stats with thin dividers",
    category: "Spec sheet",
    imageSrc: "/templates/stats-row.jpg",
    layout: "stats-row",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "2026 Lincoln Aviator",
      stats: [
        { value: "3.0", suffix: "L", label: "Engine: Twin-Turbo V6" },
        { value: "383", label: "Horsepower" },
        { value: "7", label: "Seating for up to" },
        { value: "415", label: "Torque (lb/ft)" },
      ],
    },
  },
  {
    id: "parks-lincoln-framed-card",
    brand: "parks-lincoln",
    name: "Framed Card",
    tagline: "Full-poster outline · watermark number + italic tagline",
    category: "Brand story",
    imageSrc: "/templates/framed-card.jpg",
    layout: "framed-card",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "51",
      subtitle: "years same corner of Seminole County.",
    },
  },
  {
    id: "parks-lincoln-drive-time-map",
    brand: "parks-lincoln",
    name: "Drive-Time Map",
    tagline: "Aerial photo · drive-time pins to nearby cities",
    category: "Local",
    imageSrc: "/templates/drive-time-map.jpg",
    layout: "drive-time-map",
    baseTemplateId: "premium-dealer",
    preset: {
      bullets: [
        "Lake Nona | 30 mins",
        "Kissimmee | 35 mins",
        "Winter Garden | 25 mins",
        "Dr. Phillips | 22 mins",
        "College Park | 18 mins",
        "Downtown Orlando | 15 - 20 mins",
        "Winter Park | 12 mins",
        "Maitland | 10 mins",
      ],
    },
  },
  {
    id: "parks-lincoln-model-hero-corsair",
    brand: "parks-lincoln",
    name: "Model Hero · Corsair",
    tagline: "Compact luxury · serif model name + italic tagline",
    category: "Model launch",
    imageSrc: "/templates/model-hero-corsair.jpg",
    layout: "model-hero",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "CORSAIR",
      subtitle: "the small luxury one.",
      body: "2026 Lincoln",
    },
  },
  {
    id: "parks-lincoln-model-hero-aviator",
    brand: "parks-lincoln",
    name: "Model Hero · Aviator",
    tagline: "Dramatic showroom shot · family three-row",
    category: "Model launch",
    imageSrc: "/templates/model-hero-aviator.jpg",
    layout: "model-hero",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "AVIATOR",
      subtitle: "the family three-row.",
      body: "2026 Lincoln",
    },
  },
  {
    id: "parks-lincoln-model-hero-navigator",
    brand: "parks-lincoln",
    name: "Model Hero · Navigator",
    tagline: "Low-key night shot · the flagship",
    category: "Model launch",
    imageSrc: "/templates/model-hero-navigator.jpg",
    layout: "model-hero",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "NAVIGATOR",
      subtitle: "the flagship.",
      body: "2026 Lincoln",
    },
  },
  {
    id: "parks-lincoln-brand-card",
    brand: "parks-lincoln",
    name: "Brand Visit Card",
    tagline: "Centered brand mark + serif headline",
    category: "Dealership",
    imageSrc: "/templates/brand-card.jpg",
    layout: "brand-card",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "Visit Parks Lincoln of Longwood.",
    },
  },
  {
    id: "parks-lincoln-dual-frame",
    brand: "parks-lincoln",
    name: "Dual Hours Card",
    tagline: "SERVICE HOURS label + two outlined day cards",
    category: "Service",
    imageSrc: "/templates/dual-frame.jpg",
    layout: "dual-frame",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "SERVICE HOURS",
      stats: [
        { value: "7AM to 6PM", label: "Mon - Fri" },
        { value: "8AM to 5PM", label: "Saturday" },
      ],
    },
  },
];

// =====================================================================
// BMW — 10 reference photos from /photos/bmw/
// Each photo is paired with the closest matching layout in our library
// and a preset that pre-fills the exact text/stats from the reference.
// =====================================================================
const BMW_TEMPLATES: LayoutTemplate[] = [
  {
    id: "bmw-service-pricing",
    brand: "bmw",
    name: "Service Pricing",
    tagline: "Headline + photo + 3 dark price cards at bottom",
    category: "Service",
    imageSrc: "/templates/bmw/service-pricing.jpg",
    layout: "stats-row",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "BMW brake service in ATLANTA. Real costs, real engineering.",
      stats: [
        { value: "$300-$650", label: "Front pad · genuine BMW pads + new wear sensor" },
        { value: "$1,000-$1,600", label: "Full brake job · pads + rotors · all four corners" },
        { value: "EVERY 2 YEARS", label: "Brake fluid · gas and EV alike" },
      ],
    },
  },
  {
    id: "bmw-maintenance-schedule",
    brand: "bmw",
    name: "Maintenance Schedule",
    tagline: "Diagonal split · title block + interior photo + CTA bar",
    category: "Service",
    imageSrc: "/templates/bmw/maintenance-schedule.jpg",
    layout: "model-hero",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "BMW MAINTENANCE SCHEDULE",
      subtitle: "what to budget at every mileage.",
      ctaText: "VISIT US TODAY",
    },
  },
  {
    id: "bmw-diamond-collage",
    brand: "bmw",
    name: "Diamond Collage",
    tagline: "Blue split · 3 diamond photos + CTA pill",
    category: "Service",
    imageSrc: "/templates/bmw/diamond-collage.jpg",
    layout: "image-collage",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "BMW brake service COSTS IN ATLANTA.",
      ctaText: "CALL US NOW",
    },
  },
  {
    id: "bmw-foggy-stats",
    brand: "bmw",
    name: "Foggy Stats",
    tagline: "Light photo · 3 vertical-stack serif stats up top",
    category: "Spec sheet",
    imageSrc: "/templates/bmw/foggy-stats.jpg",
    layout: "stats-row",
    baseTemplateId: "premium-dealer",
    preset: {
      stats: [
        { value: "$40-$2,000+", label: "Typical range · routine line items from wiper inserts to wheel-and-tire packages" },
        { value: "$150-$275", label: "Oil change · BMW-approved synthetic, model dependent" },
        { value: "3 YRS/36,000", suffix: "mi", label: "Ultimate Care · Included with a new BMW" },
      ],
    },
  },
  {
    id: "bmw-pricing-by-model",
    brand: "bmw",
    name: "Pricing by Model",
    tagline: "Radial arch · 4 models + Ask/Contact buttons",
    category: "Model launch",
    imageSrc: "/templates/bmw/pricing-by-model.jpg",
    layout: "model-lineup",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "PRICING BY MODEL",
      subtitle: "We offer well-maintained cars at competitive prices, ensuring comfort, safety, and value in every deal.",
      bullets: ["3 Series", "5 Series", "X5", "X7"],
      ctaText: "ASK A QUESTION",
    },
  },
  {
    id: "bmw-four-things",
    brand: "bmw",
    name: "Four Things",
    tagline: "Diagonal split · 4 stacked outlined checklist cards",
    category: "Brand story",
    imageSrc: "/templates/bmw/four-things.jpg",
    layout: "list-stack",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "FOUR THINGS MOVE THE TICKET.",
      bullets: [
        "Model and engine",
        "Vehicle age and condition",
        "Genuine OEM BMW parts only",
        "CBS, not the calendar",
      ],
    },
  },
  {
    id: "bmw-topdown-stats",
    brand: "bmw",
    name: "Top-Down Stats",
    tagline: "Top-down car · 4 vertical serif stats + BOOK NOW",
    category: "Spec sheet",
    imageSrc: "/templates/bmw/topdown-stats.jpg",
    layout: "stat-block",
    baseTemplateId: "premium-dealer",
    preset: {
      stats: [
        { value: "3", suffix: "yrs", label: "Or 36,000 miles · whichever first" },
        { value: "$0", label: "Scheduled maintenance · all of it" },
        { value: "2017", suffix: "+", label: "Every new BMW since model year 2017" },
        { value: "MY22", suffix: "+", label: "Transferable to second owner" },
      ],
      ctaText: "BOOK NOW",
    },
  },
  {
    id: "bmw-framed-headline",
    brand: "bmw",
    name: "Framed Headline",
    tagline: "White outlined frame · big headline · photo below",
    category: "Brand story",
    imageSrc: "/templates/bmw/framed-headline.jpg",
    layout: "framed-card",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "WHEN BMW",
      subtitle: "PAYS FOR IT.",
    },
  },
  {
    id: "bmw-offers-coupons",
    brand: "bmw",
    name: "Offers & Coupons",
    tagline: "Angular wedge · big headline + photo + CTA bar",
    category: "Offer",
    imageSrc: "/templates/bmw/offers-coupons.jpg",
    layout: "hero-headline",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "CURRENT OFFERS AND COUPONS.",
      subtitle: "BMW STEP-certified technicians on the Union City service drive.",
      ctaText: "CALL NOW",
    },
  },
  {
    id: "bmw-why-us",
    brand: "bmw",
    name: "Why Us",
    tagline: "Torn-paper multi-section · showroom + lineup + service",
    category: "Dealership",
    imageSrc: "/templates/bmw/why-us.jpg",
    layout: "brand-card",
    baseTemplateId: "premium-dealer",
    preset: {
      headline: "WHY US?",
      subtitle: "Visit us: 4171 Jonesboro Rd Union City, GA 30291",
    },
  },
];

// =====================================================================
// NISSAN & SUBARU — no reference photos yet. We expose the same 9-layout
// catalog (so users can preview every layout in any brand) and let the
// card render a brand-tinted gradient placeholder when imageSrc is absent.
// =====================================================================
const LAYOUT_CATALOG: {
  layoutId: string;
  layout: LayoutVariant;
  name: string;
  tagline: string;
  category: string;
}[] = [
  { layoutId: "model-lineup",        layout: "model-lineup",  name: "Model Lineup",      tagline: '"Which model is right for you?" · 2×2 model grid',     category: "Model launch" },
  { layoutId: "stats-row",           layout: "stats-row",     name: "Stats Row",         tagline: "Bottom strip · 3–4 mini-stats with thin dividers",    category: "Spec sheet"   },
  { layoutId: "framed-card",         layout: "framed-card",   name: "Framed Card",       tagline: "Full-poster outline · watermark number + tagline",    category: "Brand story"  },
  { layoutId: "drive-time-map",      layout: "drive-time-map",name: "Drive-Time Map",    tagline: "Aerial photo · drive-time pins to nearby cities",     category: "Local"        },
  { layoutId: "model-hero-1",        layout: "model-hero",    name: "Model Hero · Compact",   tagline: "Tiny year + serif model name + italic tagline", category: "Model launch" },
  { layoutId: "model-hero-2",        layout: "model-hero",    name: "Model Hero · Showroom",  tagline: "Dramatic showroom shot · serif model name",     category: "Model launch" },
  { layoutId: "model-hero-3",        layout: "model-hero",    name: "Model Hero · Flagship",  tagline: "Low-key night shot · flagship treatment",       category: "Model launch" },
  { layoutId: "brand-card",          layout: "brand-card",    name: "Brand Visit Card",  tagline: "Centered brand mark + serif headline",                category: "Dealership"   },
  { layoutId: "dual-frame",          layout: "dual-frame",    name: "Dual Hours Card",   tagline: "SERVICE HOURS label + two outlined day cards",        category: "Service"      },
];

function placeholderTemplatesFor(brand: BrandId): LayoutTemplate[] {
  return LAYOUT_CATALOG.map((l) => ({
    id: `${brand}-${l.layoutId}`,
    brand,
    name: l.name,
    tagline: l.tagline,
    category: l.category,
    layout: l.layout,
    baseTemplateId: "premium-dealer",
  }));
}

// =====================================================================
// All templates, flat. Templates page filters by brand.
// =====================================================================
export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  ...PARKS_LINCOLN_TEMPLATES,
  ...BMW_TEMPLATES,
  ...placeholderTemplatesFor("nissan"),
  ...placeholderTemplatesFor("subaru"),
];

export function templatesForBrand(brand: BrandId): LayoutTemplate[] {
  return LAYOUT_TEMPLATES.filter((t) => t.brand === brand);
}

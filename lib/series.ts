import { nanoid } from "nanoid";
import { saveProject } from "./storage";
import { generateSlides } from "./generator";
import { LAYOUT_TEMPLATES } from "./layout-templates";
import type {
  CarouselProject,
  GeneratorInputs,
  TemplateId,
} from "@/types";

// A week of content angles. Each entry shapes the per-day deck so the
// resulting series isn't 7 identical posts. Tuned for car dealerships.
const WEEK_PLAN = [
  {
    day: "Mon",
    angle: "Model spotlight",
    headline: "{brand} model spotlight.",
    subtitle: "Tour the lineup that's moving fastest off our lot.",
    body: "Performance, comfort, and tech specs at a glance. {brand} hand-picked picks for the week.",
    preferLayouts: ["model-hero", "model-lineup"],
  },
  {
    day: "Tue",
    angle: "Service tip",
    headline: "Service tip of the week.",
    subtitle: "What our {brand}-certified technicians want every driver to know.",
    body: "A quick maintenance note from the {brand} service drive. Two minutes today saves you hours next month.",
    preferLayouts: ["stats-row", "framed-card"],
  },
  {
    day: "Wed",
    angle: "Customer review",
    headline: "What our customers are saying.",
    subtitle: "Verified reviews from {brand} owners this month.",
    body: "Honest words from {brand} drivers. The trust we earn is the trust we keep.",
    preferLayouts: ["framed-card", "brand-card"],
  },
  {
    day: "Thu",
    angle: "Trade-in offer",
    headline: "Trade in. Trade up.",
    subtitle: "Best trade-in values in the region, guaranteed.",
    body: "Bring your current vehicle. Walk out with a new {brand}. Our trade desk runs the numbers in 15 minutes.",
    preferLayouts: ["stats-row", "hero-headline"],
  },
  {
    day: "Fri",
    angle: "Meet the team",
    headline: "Meet the team.",
    subtitle: "The people behind {brand}.",
    body: "Sales, service, finance: the faces that make {brand} feel like home. Stop by and say hi.",
    preferLayouts: ["brand-card", "model-hero"],
  },
  {
    day: "Sat",
    angle: "Weekend showroom",
    headline: "The showroom is open.",
    subtitle: "Test drives all weekend at {brand}.",
    body: "Saturday is the busiest day on the lot. Skip the line. DM us for a same-day test drive slot.",
    preferLayouts: ["dual-frame", "info-strip"],
  },
  {
    day: "Sun",
    angle: "Weekly recap",
    headline: "This week at {brand}.",
    subtitle: "The numbers, the wins, the highlights.",
    body: "Cars sold, families served, miles driven. Every Sunday we count what mattered.",
    preferLayouts: ["stats-row", "framed-card"],
  },
];

function pickPhotoFromBrand(brand: string, layoutPref: string[]) {
  // Try to find a template in the user's brand that matches one of the
  // preferred layouts. Falls back to any photo template in that brand.
  const brandTemplates = LAYOUT_TEMPLATES.filter(
    (t) => t.brand === (brand as any) && t.imageSrc
  );
  for (const pref of layoutPref) {
    const m = brandTemplates.find((t) => t.layout === pref);
    if (m) return m;
  }
  return brandTemplates[0];
}

export interface SeriesResult {
  count: number;
  projectIds: string[];
}

export async function generateWeekSeries(
  baseInputs: GeneratorInputs,
  brandKey: string,
  baseName = "Weekly post"
): Promise<SeriesResult> {
  const projectIds: string[] = [];
  const brandName = baseInputs.brandName || "your dealership";

  for (const day of WEEK_PLAN) {
    const inputs: GeneratorInputs = {
      ...baseInputs,
      headline: day.headline.replace(/\{brand\}/g, brandName),
      subtitle: day.subtitle.replace(/\{brand\}/g, brandName),
      body: day.body.replace(/\{brand\}/g, brandName),
      ctaText: `${day.angle}: see more at ${brandName}.`,
    };

    // Pick a brand-matching photo + pin its layout if available.
    const template = pickPhotoFromBrand(brandKey, day.preferLayouts);
    const pinnedLayout = template?.layout;

    const slides = generateSlides(inputs, { count: 5, pinnedLayout });

    const id = nanoid(10);
    const proj: CarouselProject = {
      id,
      name: `${day.day} · ${day.angle}`,
      templateId: baseInputs.templateId as TemplateId,
      aspect: baseInputs.aspect,
      brandName: inputs.brandName,
      brandLogoUrl: inputs.brandLogoUrl,
      headline: inputs.headline,
      subtitle: inputs.subtitle,
      body: inputs.body,
      imageUrls: inputs.imageUrls,
      slides,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveProject(proj);
    projectIds.push(id);
  }

  return { count: WEEK_PLAN.length, projectIds };
}

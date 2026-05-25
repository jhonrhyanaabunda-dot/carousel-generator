// Curated font library exposed in the per-element style toolbar.
// All families are loaded via @import in app/globals.css.

export interface FontOption {
  name: string;
  family: string;
  category: "sans" | "serif" | "display" | "mono" | "handwritten";
  weights: number[]; // available weights for this family
}

export const FONT_OPTIONS: FontOption[] = [
  { name: "Sora", family: '"Sora", system-ui, sans-serif', category: "sans", weights: [300, 400, 500, 600, 700, 800, 900] },
  { name: "Inter", family: '"Inter", system-ui, sans-serif', category: "sans", weights: [300, 400, 500, 600, 700, 800, 900] },
  { name: "Manrope", family: '"Manrope", system-ui, sans-serif', category: "sans", weights: [300, 400, 500, 600, 700, 800] },
  { name: "Space Grotesk", family: '"Space Grotesk", sans-serif', category: "sans", weights: [300, 400, 500, 600, 700] },
  { name: "Bricolage Grotesque", family: '"Bricolage Grotesque", sans-serif', category: "sans", weights: [200, 300, 400, 500, 600, 700, 800] },
  { name: "Montserrat", family: '"Montserrat", sans-serif', category: "sans", weights: [300, 400, 500, 600, 700, 800, 900] },
  { name: "Poppins", family: '"Poppins", sans-serif', category: "sans", weights: [300, 400, 500, 600, 700, 800, 900] },
  { name: "Oswald", family: '"Oswald", sans-serif', category: "display", weights: [300, 400, 500, 600, 700] },
  { name: "Bebas Neue", family: '"Bebas Neue", sans-serif', category: "display", weights: [400] },
  { name: "Anton", family: '"Anton", sans-serif', category: "display", weights: [400] },
  { name: "Archivo Black", family: '"Archivo Black", sans-serif', category: "display", weights: [400] },
  { name: "Playfair Display", family: '"Playfair Display", serif', category: "serif", weights: [400, 700, 900] },
  { name: "DM Serif Display", family: '"DM Serif Display", serif', category: "serif", weights: [400] },
  { name: "Lora", family: '"Lora", serif', category: "serif", weights: [400, 500, 600, 700] },
  { name: "Cormorant Garamond", family: '"Cormorant Garamond", serif', category: "serif", weights: [400, 500, 600, 700] },
  { name: "JetBrains Mono", family: '"JetBrains Mono", monospace', category: "mono", weights: [400, 500, 700] },
  { name: "Caveat", family: '"Caveat", cursive', category: "handwritten", weights: [400, 500, 700] },
];

export function findFontByFamily(family?: string): FontOption | undefined {
  if (!family) return undefined;
  return FONT_OPTIONS.find((f) => f.family === family || family.includes(`"${f.name}"`));
}

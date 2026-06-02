"use client";

import type { FontOption } from "./fonts";

// User-uploaded fonts persist in localStorage as base64 data URLs and are
// injected into the page as @font-face rules on app boot.
export interface CustomFont {
  id: string;
  name: string;
  family: string;        // CSS font-family value (e.g., '"My Brand Font"')
  dataUrl: string;       // base64 data URL of the .woff2
  format?: string;       // woff2 | woff | truetype
  uploadedAt: number;
}

const KEY = "carousel-maker:custom-fonts";
const STYLE_ID = "carousel-maker-custom-fonts";

function read(): CustomFont[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CustomFont[]) : [];
  } catch {
    return [];
  }
}

function write(fonts: CustomFont[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(fonts));
}

export function listCustomFonts(): CustomFont[] {
  return read().sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export function saveCustomFont(font: CustomFont) {
  const all = read();
  const idx = all.findIndex((f) => f.id === font.id);
  if (idx >= 0) all[idx] = font;
  else all.unshift(font);
  write(all);
  injectAllCustomFonts();
}

export function deleteCustomFont(id: string) {
  write(read().filter((f) => f.id !== id));
  injectAllCustomFonts();
}

// Builds one big <style> element with all @font-face rules and injects it
// into <head>. Called on app boot and whenever a font is saved/deleted.
export function injectAllCustomFonts() {
  if (typeof document === "undefined") return;
  const fonts = read();
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = fonts
    .map(
      (f) => `
@font-face {
  font-family: ${f.family};
  src: url(${JSON.stringify(f.dataUrl)}) format(${JSON.stringify(f.format ?? "woff2")});
  font-display: swap;
}
      `
    )
    .join("\n");
}

// Convert a CustomFont into the same FontOption shape used by the curated
// FONT_OPTIONS list so they appear in the TextStyleToolbar dropdown.
export function customFontsAsOptions(): FontOption[] {
  return listCustomFonts().map((f) => ({
    name: f.name,
    family: f.family,
    category: "sans" as const,
    weights: [400, 700],
  }));
}

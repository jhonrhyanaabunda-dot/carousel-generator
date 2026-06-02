"use client";

import { BRANDS } from "./brands";

// Per-dealership saved profile. Loading a kit pre-fills the brand fields
// (name, logo, contact, CTA) in the generator with one click — so an agency
// running 75+ dealers never re-types the same dealership address twice.
export interface BrandKit {
  id: string;
  name: string; // display label, e.g. "Parks Lincoln of Longwood"
  brandName: string;
  brandLogoUrl?: string;
  phone?: string;
  hours?: string;
  website?: string;
  address?: string;
  ctaText?: string;
  // Optional accent override (future).
  accent?: string;
  // True for built-in starter kits (Parks Lincoln, BMW, Nissan, Subaru) —
  // shown alongside user-saved kits but can't be deleted.
  isStarter?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

const KEY = "carousel-maker:brand-kits";

function read(): BrandKit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BrandKit[]) : [];
  } catch {
    return [];
  }
}

function write(kits: BrandKit[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(kits));
}

export function listUserBrandKits(): BrandKit[] {
  return read().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function saveBrandKit(kit: BrandKit) {
  const all = read();
  const idx = all.findIndex((k) => k.id === kit.id);
  const stamped = {
    ...kit,
    createdAt: kit.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  if (idx >= 0) all[idx] = stamped;
  else all.unshift(stamped);
  write(all);
}

export function deleteBrandKit(id: string) {
  write(read().filter((k) => k.id !== id));
}

// Starter kits seeded from the BRANDS catalog. Always available, can't be
// deleted (the UI hides their delete button via `isStarter`).
export function getStarterKits(): BrandKit[] {
  return BRANDS.map((b) => ({
    id: `starter-${b.id}`,
    name: b.fullName,
    brandName: b.defaults.brandName,
    phone: b.defaults.phone,
    hours: b.defaults.hours,
    website: b.defaults.website,
    address: b.defaults.address,
    ctaText: b.defaults.ctaText,
    isStarter: true,
  }));
}

export function getAllBrandKits(): BrandKit[] {
  return [...getStarterKits(), ...listUserBrandKits()];
}

export function findBrandKit(id: string): BrandKit | undefined {
  return getAllBrandKits().find((k) => k.id === id);
}

"use client";

import type { CarouselProject, Slide } from "@/types";
import {
  externalizeImage,
  hydrateImage,
  isDataUrl,
} from "./image-store";

const KEY = "carousel-maker:projects";

function read(): CarouselProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CarouselProject[]) : [];
  } catch {
    return [];
  }
}

function write(projects: CarouselProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(projects));
}

export function listProjects(): CarouselProject[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

// Sync getter — returns the project as stored (image fields will be
// "idb:..." references or http URLs). For the editor, use getProject()
// which awaits and hydrates IDB refs into blob: URLs.
export function getProjectRaw(id: string): CarouselProject | undefined {
  return read().find((p) => p.id === id);
}

// Async — hydrate any "idb:<key>" image refs into blob: URLs so the editor
// can render them. Falls through to the raw value when the ref is missing.
export async function getProject(
  id: string
): Promise<CarouselProject | undefined> {
  const p = getProjectRaw(id);
  if (!p) return undefined;
  return hydrateProject(p);
}

async function hydrateProject(p: CarouselProject): Promise<CarouselProject> {
  const [brandLogoUrl, ...imageUrls] = await Promise.all([
    hydrateImage(p.brandLogoUrl),
    ...p.imageUrls.map((u) => hydrateImage(u)),
  ]);
  const slides = await Promise.all(
    p.slides.map(async (s): Promise<Slide> => ({
      ...s,
      content: {
        ...s.content,
        imageUrl: await hydrateImage(s.content.imageUrl),
        brandLogoUrl: await hydrateImage(s.content.brandLogoUrl),
      },
    }))
  );
  return {
    ...p,
    brandLogoUrl,
    imageUrls: imageUrls.filter((u): u is string => !!u),
    slides,
  };
}

// Walk the project, push every data: URL into IndexedDB, replace with
// "idb:<key>" references. After this the project is small enough to fit in
// localStorage (no base64 image payloads).
async function externalizeProject(
  p: CarouselProject
): Promise<CarouselProject> {
  const [brandLogoUrl, ...imageUrls] = await Promise.all([
    externalizeImage(p.brandLogoUrl),
    ...p.imageUrls.map((u) => externalizeImage(u)),
  ]);
  const slides = await Promise.all(
    p.slides.map(async (s): Promise<Slide> => ({
      ...s,
      content: {
        ...s.content,
        imageUrl: await externalizeImage(s.content.imageUrl),
        brandLogoUrl: await externalizeImage(s.content.brandLogoUrl),
      },
    }))
  );
  return {
    ...p,
    brandLogoUrl,
    imageUrls: imageUrls.filter((u): u is string => !!u),
    slides,
  };
}

// Final-fallback only — when IndexedDB itself fails (private window with
// no storage, exotic browsers), drop any remaining data: URLs so the
// localStorage write can succeed without crashing.
function stripDataUrls(project: CarouselProject): CarouselProject {
  const drop = (s?: string) => (isDataUrl(s) ? undefined : s);
  return {
    ...project,
    imageUrls: project.imageUrls.filter((u) => !isDataUrl(u)),
    brandLogoUrl: drop(project.brandLogoUrl),
    slides: project.slides.map((s): Slide => ({
      ...s,
      content: {
        ...s.content,
        imageUrl: drop(s.content.imageUrl),
        brandLogoUrl: drop(s.content.brandLogoUrl),
      },
    })),
  };
}

export async function saveProject(
  project: CarouselProject
): Promise<{ ok: true } | { ok: false; warning: string }> {
  // 1. Externalize every embedded image into IDB so the JSON written to
  //    localStorage carries only short "idb:<key>" references.
  const externalized = await externalizeProject(project);

  const all = read();
  const idx = all.findIndex((p) => p.id === project.id);
  if (idx >= 0) all[idx] = externalized;
  else all.unshift(externalized);

  // 2. Normal-case save — the index is small (KB, not MB) so this should
  //    always succeed even with hundreds of projects.
  try {
    write(all);
    return { ok: true as const };
  } catch {}

  // 3. localStorage quota exhausted by something other than this project
  //    (old metadata bloat). Try a stripped retry that drops anything left
  //    over from older saves.
  try {
    const stripped = all.map(stripDataUrls);
    if (idx >= 0) stripped[idx] = externalized;
    else stripped[0] = externalized;
    write(stripped);
    return { ok: true as const };
  } catch {}

  // 4. Last resort — keep only the current project.
  try {
    write([externalized]);
    return {
      ok: false as const,
      warning:
        "Storage was full, so older projects were cleared to make room. Only the current project remains.",
    };
  } catch {
    return {
      ok: false as const,
      warning:
        "Couldn't save (browser storage exhausted). Delete projects from /projects and retry.",
    };
  }
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

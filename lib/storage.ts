"use client";

import type { CarouselProject, Slide } from "@/types";

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

export function getProject(id: string): CarouselProject | undefined {
  return read().find((p) => p.id === id);
}

// Strip embedded image data URLs from a project so it fits inside the
// localStorage 5–10 MB quota. Brand logo + uploaded photos can be huge
// (a few hundred KB each); a deck of 7 slides with photos easily blows
// past the limit. We keep all the editable text + layout structure and
// just drop the binary image references — user re-uploads on reopen.
function stripImages(project: CarouselProject): CarouselProject {
  const isDataUrl = (s?: string) => !!s && s.startsWith("data:");
  const dropIfData = (s?: string) => (isDataUrl(s) ? undefined : s);
  return {
    ...project,
    imageUrls: project.imageUrls.filter((u) => !isDataUrl(u)),
    brandLogoUrl: dropIfData(project.brandLogoUrl),
    slides: project.slides.map((s): Slide => ({
      ...s,
      content: {
        ...s.content,
        imageUrl: dropIfData(s.content.imageUrl),
        brandLogoUrl: dropIfData(s.content.brandLogoUrl),
      },
    })),
  };
}

export function saveProject(project: CarouselProject) {
  const all = read();
  const idx = all.findIndex((p) => p.id === project.id);
  if (idx >= 0) all[idx] = project;
  else all.unshift(project);

  // Attempt 1 — full save with images.
  try {
    write(all);
    return { ok: true as const };
  } catch {}

  // Attempt 2 — strip images from the CURRENT project only.
  const slim = stripImages(project);
  if (idx >= 0) all[idx] = slim;
  else all[0] = slim;
  try {
    write(all);
    return {
      ok: false as const,
      warning:
        "Project saved without embedded images (browser storage limit). Re-upload images after reopening.",
    };
  } catch {}

  // Attempt 3 — strip images from EVERY project (old bloated ones may be
  // hogging space and blocking the new save).
  const allSlim = all.map(stripImages);
  try {
    write(allSlim);
    return {
      ok: false as const,
      warning:
        "Storage was full — images dropped from all saved projects. Re-upload images on reopen.",
    };
  } catch {}

  // Attempt 4 — keep only the current project (oldest projects evicted).
  try {
    write([slim]);
    return {
      ok: false as const,
      warning:
        "Storage was full — older projects were cleared to make room. Only the current project remains.",
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

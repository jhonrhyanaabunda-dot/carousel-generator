"use client";

import type { CarouselProject } from "@/types";

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

export function saveProject(project: CarouselProject) {
  const all = read();
  const idx = all.findIndex((p) => p.id === project.id);
  if (idx >= 0) all[idx] = project;
  else all.unshift(project);
  write(all);
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

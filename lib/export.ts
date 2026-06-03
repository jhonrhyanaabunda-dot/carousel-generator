"use client";

import { toCanvas, toJpeg, toPng } from "html-to-image";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { ASPECT_RATIOS, type AspectRatio } from "@/types";

// ---------------------------------------------------------------------------
// Format helpers — JPEG + WebP are the user-facing export formats. PNG is
// kept internally for the PDF pipeline (lossless source → smaller PDF text)
// and for the thumbnail helper.
// ---------------------------------------------------------------------------

async function nodeToPng(node: HTMLElement, scale = 2): Promise<string> {
  return toPng(node, {
    cacheBust: true,
    pixelRatio: scale,
    backgroundColor: getComputedStyle(node).backgroundColor || "#000",
    style: { transform: "none" },
  });
}

async function nodeToJpeg(
  node: HTMLElement,
  scale = 2,
  quality = 0.92
): Promise<string> {
  return toJpeg(node, {
    cacheBust: true,
    pixelRatio: scale,
    backgroundColor: getComputedStyle(node).backgroundColor || "#000",
    quality,
    style: { transform: "none" },
  });
}

// WebP isn't a first-class output of html-to-image, but toCanvas + canvas.toBlob
// with the image/webp mime type works in every modern browser.
async function nodeToWebpBlob(
  node: HTMLElement,
  scale = 2,
  quality = 0.92
): Promise<Blob> {
  const canvas = await toCanvas(node, {
    cacheBust: true,
    pixelRatio: scale,
    backgroundColor: getComputedStyle(node).backgroundColor || "#000",
    style: { transform: "none" },
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("WebP encoding failed")),
      "image/webp",
      quality
    );
  });
}

function triggerDownloadFromDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ---------------------------------------------------------------------------
// Single-slide exports
// ---------------------------------------------------------------------------

export async function downloadSlideJpeg(node: HTMLElement, filename = "slide.jpg") {
  const dataUrl = await nodeToJpeg(node, 2);
  triggerDownloadFromDataUrl(dataUrl, filename);
}

export async function downloadSlideWebp(node: HTMLElement, filename = "slide.webp") {
  const blob = await nodeToWebpBlob(node, 2);
  saveAs(blob, filename);
}

// ---------------------------------------------------------------------------
// Full-deck exports
// ---------------------------------------------------------------------------

export type DeckFormat = "jpeg" | "webp";

export async function downloadAllAsZip(
  nodes: HTMLElement[],
  baseName: string,
  format: DeckFormat = "jpeg"
) {
  const zip = new JSZip();
  const ext = format === "webp" ? "webp" : "jpg";
  for (let i = 0; i < nodes.length; i++) {
    const blob =
      format === "webp"
        ? await nodeToWebpBlob(nodes[i], 2)
        : await (await fetch(await nodeToJpeg(nodes[i], 2))).blob();
    zip.file(
      `${baseName}-slide-${String(i + 1).padStart(2, "0")}.${ext}`,
      blob
    );
  }
  const out = await zip.generateAsync({ type: "blob" });
  saveAs(out, `${baseName}.zip`);
}

export async function downloadPdf(
  nodes: HTMLElement[],
  aspect: AspectRatio,
  baseName: string
) {
  const { w, h } = ASPECT_RATIOS[aspect];
  const orientation = w > h ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [w, h],
    compress: true,
  });
  // JPEG inside the PDF — smaller file than PNG, indistinguishable at print
  // quality for photo-heavy carousels.
  for (let i = 0; i < nodes.length; i++) {
    const data = await nodeToJpeg(nodes[i], 2);
    if (i > 0) pdf.addPage([w, h], orientation);
    pdf.addImage(data, "JPEG", 0, 0, w, h);
  }
  pdf.save(`${baseName}.pdf`);
}

// ---------------------------------------------------------------------------
// Thumbnail helper (kept as PNG — used for project preview thumbnails where
// transparency is occasionally useful).
// ---------------------------------------------------------------------------

export async function makeThumbnail(node: HTMLElement): Promise<string> {
  return nodeToPng(node, 0.5);
}

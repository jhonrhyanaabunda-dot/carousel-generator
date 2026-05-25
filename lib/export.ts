"use client";

import { toPng } from "html-to-image";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { ASPECT_RATIOS, type AspectRatio } from "@/types";

async function nodeToPng(node: HTMLElement, scale = 2): Promise<string> {
  return toPng(node, {
    cacheBust: true,
    pixelRatio: scale,
    backgroundColor: getComputedStyle(node).backgroundColor || "#000",
    style: { transform: "none" },
  });
}

export async function downloadSlidePng(node: HTMLElement, filename = "slide.png") {
  const dataUrl = await nodeToPng(node, 2);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadAllAsZip(
  nodes: HTMLElement[],
  baseName: string
) {
  const zip = new JSZip();
  for (let i = 0; i < nodes.length; i++) {
    const data = await nodeToPng(nodes[i], 2);
    const blob = await (await fetch(data)).blob();
    zip.file(`${baseName}-slide-${String(i + 1).padStart(2, "0")}.png`, blob);
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
  for (let i = 0; i < nodes.length; i++) {
    const data = await nodeToPng(nodes[i], 2);
    if (i > 0) pdf.addPage([w, h], orientation);
    pdf.addImage(data, "PNG", 0, 0, w, h);
  }
  pdf.save(`${baseName}.pdf`);
}

export async function makeThumbnail(node: HTMLElement): Promise<string> {
  return nodeToPng(node, 0.5);
}

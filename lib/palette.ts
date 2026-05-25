"use client";

// Tiny color quantizer using bucket reduction. No external deps.
export async function extractPalette(dataUrl: string, count = 5): Promise<string[]> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i] >> 4;
    const g = data[i + 1] >> 4;
    const b = data[i + 2] >> 4;
    const key = `${r}-${g}-${b}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += data[i];
    bucket.g += data[i + 1];
    bucket.b += data[i + 2];
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  const sorted = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count * 3);

  const filtered = filterDistinct(
    sorted.map(({ r, g, b, n }) => ({
      hex: rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n)),
      n,
    })),
    count
  );

  return filtered.map((c) => c.hex);
}

function filterDistinct(colors: { hex: string; n: number }[], max: number) {
  const out: { hex: string; n: number }[] = [];
  for (const c of colors) {
    const tooClose = out.some((o) => colorDistance(o.hex, c.hex) < 35);
    if (!tooClose) out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

function colorDistance(a: string, b: string) {
  const ra = parseInt(a.slice(1, 3), 16);
  const ga = parseInt(a.slice(3, 5), 16);
  const ba = parseInt(a.slice(5, 7), 16);
  const rb = parseInt(b.slice(1, 3), 16);
  const gb = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ra - rb) ** 2 + (ga - gb) ** 2 + (ba - bb) ** 2);
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

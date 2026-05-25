// Heuristic, no-API "AI" helpers. They produce plausible captions and hashtags
// from the user's own input so the app ships out-of-the-box.

const STOP = new Set([
  "the","a","an","and","or","but","of","in","on","at","to","for","with","by","is","are","was","were","be","been","being","this","that","these","those","it","its","as","from","we","you","your","our","their","they","i","my","me","us","not","no","do","does","did","so","if","than","then","just","also","more","most","very","can","will","would","should","could","about","into","over","under","up","down","out","off","because","while","when","where","what","how","why","who","which"
]);

function tokens(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export function generateHashtags(input: {
  headline: string;
  subtitle: string;
  body: string;
  brandName?: string;
  templateName?: string;
}, count = 12): string[] {
  const counts = new Map<string, number>();
  const all = [input.headline, input.subtitle, input.body, input.templateName ?? ""].join(" ");
  for (const t of tokens(all)) counts.set(t, (counts.get(t) ?? 0) + 1);

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);

  const handcrafted = [
    "marketing","branding","design","social","contentcreator","viral","carousel","reels","creative","strategy","growth"
  ];
  const brand = input.brandName ? input.brandName.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const out: string[] = [];
  if (brand) out.push("#" + brand);
  for (const w of sorted) {
    if (out.length >= count) break;
    out.push("#" + w);
  }
  for (const w of handcrafted) {
    if (out.length >= count) break;
    if (!out.includes("#" + w)) out.push("#" + w);
  }
  return out.slice(0, count);
}

export function generateCaption(input: {
  headline: string;
  subtitle: string;
  body: string;
  brandName?: string;
}): string {
  const hook = input.headline?.trim() || "Stop scrolling.";
  const sub = input.subtitle?.trim() || "";
  const body = input.body?.trim() || "";
  const brand = input.brandName?.trim();

  const sentences = body.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lead = sentences.slice(0, 2).join(" ");

  const lines: string[] = [];
  lines.push(`${hook} ✨`);
  if (sub) lines.push("");
  if (sub) lines.push(sub);
  if (lead) {
    lines.push("");
    lines.push(lead);
  }
  lines.push("");
  lines.push("👉 Save this for later.");
  if (brand) lines.push(`Made with ${brand}.`);
  return lines.join("\n");
}

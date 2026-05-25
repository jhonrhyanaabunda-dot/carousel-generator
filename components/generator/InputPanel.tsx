"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Upload, X, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TEMPLATES } from "@/lib/templates";
import { ASPECT_RATIOS, type AspectRatio, type GeneratorInputs, type TemplateId } from "@/types";
import { extractPalette } from "@/lib/palette";
import { readFileAsDataURL } from "@/lib/utils";
import { toast } from "sonner";

export interface InputPanelProps {
  inputs: GeneratorInputs;
  onChange: (next: GeneratorInputs) => void;
  onGenerate: () => void;
  loading?: boolean;
  palette: string[];
  onPaletteChange: (p: string[]) => void;
}

export function InputPanel({
  inputs,
  onChange,
  onGenerate,
  loading,
  palette,
  onPaletteChange,
}: InputPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);

  function update<K extends keyof GeneratorInputs>(key: K, value: GeneratorInputs[K]) {
    onChange({ ...inputs, [key]: value });
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, 8)) {
      try {
        urls.push(await readFileAsDataURL(f));
      } catch {
        toast.error("Couldn't read one of the images.");
      }
    }
    const merged = [...inputs.imageUrls, ...urls].slice(0, 8);
    update("imageUrls", merged);

    if (urls[0]) {
      try {
        setExtracting(true);
        const colors = await extractPalette(urls[0], 5);
        if (colors.length) {
          onPaletteChange(colors);
          toast.success("Color palette extracted from your image.");
        }
      } catch {
        // non-fatal
      } finally {
        setExtracting(false);
      }
    }
  }

  async function onLogo(files: FileList | null) {
    if (!files?.length) return;
    const url = await readFileAsDataURL(files[0]);
    update("brandLogoUrl", url);
  }

  function removeImage(idx: number) {
    update(
      "imageUrls",
      inputs.imageUrls.filter((_, i) => i !== idx)
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-5 pb-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              A3 Carousel Studio
            </p>
            <h2 className="mt-1 text-lg font-semibold">Dealership inputs</h2>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>

        <Field label="Headline" hint="Lead with the result or the question your shopper is asking.">
          <Input
            placeholder="Your leads are down. Your competitors are rising. We fix that."
            value={inputs.headline}
            onChange={(e) => update("headline", e.target.value)}
            maxLength={120}
          />
        </Field>

        <Field label="Subtitle">
          <Input
            placeholder="Built exclusively for dealerships · 75+ active clients"
            value={inputs.subtitle}
            onChange={(e) => update("subtitle", e.target.value)}
            maxLength={140}
          />
        </Field>

        <Field
          label="Body / proof points"
          hint="Drop in your verified numbers — GA4 metrics, awards, reviews. We split this into individual slides."
        >
          <Textarea
            rows={6}
            placeholder="+93% leads in 60 days. 63% lower cost-per-lead. 4.8★ on 2,605+ Google reviews…"
            value={inputs.body}
            onChange={(e) => update("body", e.target.value)}
          />
        </Field>

        <Separator />

        <Field label="Dealership name">
          <Input
            placeholder="Big Nissani · Sheffield Village"
            value={inputs.brandName}
            onChange={(e) => update("brandName", e.target.value)}
          />
        </Field>

        <Field label="Dealership logo">
          <div className="flex items-center gap-3">
            <button
              onClick={() => logoRef.current?.click()}
              className="group flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border hover:border-primary"
            >
              {inputs.brandLogoUrl ? (
                <img src={inputs.brandLogoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">PNG / SVG · 1MB max</p>
              {inputs.brandLogoUrl && (
                <button
                  className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => update("brandLogoUrl", undefined)}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onLogo(e.target.files)}
            />
          </div>
        </Field>

        <Separator />

        <Field label="Template / Theme">
          <Select
            value={inputs.templateId}
            onValueChange={(v) => update("templateId", v as TemplateId)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} · {t.tagline}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Aspect ratio">
          <Select
            value={inputs.aspect}
            onValueChange={(v) => update("aspect", v as AspectRatio)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ASPECT_RATIOS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Separator />

        <Field
          label="Images"
          hint="Up to 8 images. We'll auto-extract a color palette from the first one."
        >
          <button
            onClick={() => fileRef.current?.click()}
            className="group relative flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 transition-colors hover:border-primary hover:bg-secondary"
          >
            <ImageIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            <div className="text-xs font-medium">Click to upload images</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              JPG · PNG · WEBP
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </button>

          {inputs.imageUrls.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 grid grid-cols-4 gap-2"
            >
              {inputs.imageUrls.map((url, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </Field>

        {palette.length > 0 && (
          <Field
            label={`Extracted palette ${extracting ? "(extracting…)" : ""}`}
            hint="Click a swatch to apply as the active accent color in your slides."
          >
            <div className="flex gap-2">
              {palette.map((c, i) => (
                <button
                  key={i}
                  className="h-10 flex-1 rounded-lg border border-border transition-transform hover:scale-105"
                  style={{ background: c }}
                  title={c}
                  onClick={() => {
                    // Update accent on every slide via overrides — handled upstream.
                    const event = new CustomEvent("apply-accent", { detail: c });
                    window.dispatchEvent(event);
                  }}
                />
              ))}
            </div>
          </Field>
        )}

        <Field label="CTA text (last slide)">
          <Input
            placeholder="DM us 'AUDIT' for a free dealership site teardown"
            value={inputs.ctaText ?? ""}
            onChange={(e) => update("ctaText", e.target.value)}
          />
        </Field>

        <Separator />

        <div className="space-y-2">
          <Label>Dealership contact <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">(used by info-strip, hours card, and contact CTA layouts)</span></Label>
          <Input
            placeholder="Phone — (555) 123-4567"
            value={inputs.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
          />
          <Input
            placeholder="Hours — Mon-Fri 7:30-6 · Sat 8-4"
            value={inputs.hours ?? ""}
            onChange={(e) => update("hours", e.target.value)}
          />
          <Input
            placeholder="Website — yourdealer.com"
            value={inputs.website ?? ""}
            onChange={(e) => update("website", e.target.value)}
          />
          <Input
            placeholder="Address — 5013 Detroit Rd, Sheffield Village, OH"
            value={inputs.address ?? ""}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border/80 bg-background/90 p-4 backdrop-blur">
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={onGenerate}
          disabled={loading}
        >
          <Wand2 className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating…" : "Generate carousel"}
        </Button>
      </div>
    </ScrollArea>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { LAYOUT_TEMPLATES, templatesForBrand } from "@/lib/layout-templates";
import { BRANDS, type BrandId } from "@/lib/brands";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TemplatesPage() {
  const [activeBrand, setActiveBrand] = useState<BrandId>("parks-lincoln");
  const templates = templatesForBrand(activeBrand);
  const brand = BRANDS.find((b) => b.id === activeBrand)!;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="primary" className="mb-3 gap-1">
            <Sparkles className="h-3 w-3" /> Templates by brand
          </Badge>
          <h1 className="font-display text-5xl font-black tracking-tight">
            Pick a brand. Pick a layout.
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Click a brand to see its templates. Click a template — every slide
            in your carousel locks to that layout and the brand&apos;s contact
            info is pre-filled.
          </p>
        </div>
        <Link href="/generator">
          <Button size="lg" className="gap-1.5">
            Open generator <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Brand tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        {BRANDS.map((b) => {
          const active = b.id === activeBrand;
          return (
            <button
              key={b.id}
              onClick={() => setActiveBrand(b.id)}
              className={cn(
                "group relative inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all",
                active
                  ? "border-foreground bg-foreground text-background shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: b.primary }}
              />
              {b.name}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                  active
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {b.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Brand description strip */}
      <div className="mb-8 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground backdrop-blur">
        <span className="font-semibold text-foreground">{brand.fullName}</span>
        {" · "}
        <span className="font-mono text-xs">{brand.defaults.address}</span>
      </div>

      {/* Template grid for the active brand */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
          >
            <Link
              href={`/generator?template=${t.baseTemplateId}&layout=${t.layout}&brand=${t.brand}&preset=${t.id}`}
              className="group block overflow-hidden rounded-2xl border border-border shadow-card transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                {t.imageSrc ? (
                  <img
                    src={t.imageSrc}
                    alt={t.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  // Brand-tinted gradient placeholder for brands without photo refs.
                  <div
                    className="relative h-full w-full"
                    style={{
                      background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)`,
                    }}
                  >
                    <div
                      className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30 blur-3xl"
                      style={{ background: brand.primary }}
                    />
                    <div
                      className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-25 blur-3xl"
                      style={{ background: "#FFFFFF" }}
                    />
                    {/* Faint logo-style mark */}
                    <div className="absolute inset-0 grid place-items-center">
                      <div
                        className="grid h-24 w-24 place-items-center rounded-full border-2 font-display text-3xl font-black"
                        style={{
                          borderColor: brand.text + "55",
                          color: brand.text,
                          opacity: 0.6,
                        }}
                      >
                        {brand.make.slice(0, 1)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-brand" />
                  <span className="h-2 w-2 rounded-full bg-white/60" />
                  <span className="h-2 w-2 rounded-full bg-white/30" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-white/40 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">
                  {t.category}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="font-display text-2xl font-bold leading-tight">
                    {t.name}
                  </div>
                  <div className="mt-1 text-xs text-white/80">{t.tagline}</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border bg-card p-4 text-sm">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {t.layout}
                </span>
                <span className="inline-flex items-center gap-1 text-primary">
                  Use template{" "}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* All four dealerships at a glance, each card showing a random
          template from that brand's library. Tap to jump straight in. */}
      <div className="mt-20">
        <div className="mb-6">
          <Badge variant="primary" className="mb-2 gap-1">
            <Sparkles className="h-3 w-3" /> All dealerships
          </Badge>
          <h2 className="font-display text-3xl font-black tracking-tight">
            Or jump straight to a dealership.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BRANDS.map((b) => {
            // Pick a random template from this brand that has a photo.
            const all = LAYOUT_TEMPLATES.filter((t) => t.brand === b.id);
            const withPhotos = all.filter((t) => t.imageSrc);
            const random =
              withPhotos.length > 0
                ? withPhotos[Math.floor(Math.random() * withPhotos.length)]
                : all[0];
            const href = random
              ? `/generator?template=${random.baseTemplateId}&layout=${random.layout}&brand=${random.brand}&preset=${random.id}`
              : `/generator?template=premium-dealer&brand=${b.id}`;
            return (
              <Link
                key={b.id}
                href={href}
                onClick={() => setActiveBrand(b.id)}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-border shadow-card transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                {random?.imageSrc ? (
                  <img
                    src={random.imageSrc}
                    alt={b.fullName}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${b.primary} 0%, ${b.secondary} 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 grid place-items-center">
                      <div
                        className="grid h-24 w-24 place-items-center rounded-full border-2 font-display text-3xl font-black text-white/70"
                        style={{ borderColor: "#ffffff55" }}
                      >
                        {b.make.slice(0, 1)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: b.primary }}
                  />
                  {b.category}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="font-display text-xl font-bold leading-tight">
                    {b.name}
                  </div>
                  <div className="mt-1 text-[11px] text-white/70 line-clamp-1">
                    {b.fullName}
                  </div>
                  {random && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-primary">
                      Sample: {random.name}{" "}
                      <ArrowUpRight className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

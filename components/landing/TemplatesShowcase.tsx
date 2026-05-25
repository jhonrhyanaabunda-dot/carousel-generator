"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LAYOUT_TEMPLATES } from "@/lib/layout-templates";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

// Interleave 8 real photo templates from Parks Lincoln + BMW so the
// showcase is mixed brand-wise rather than grouped.
function buildShowcase() {
  const parks = LAYOUT_TEMPLATES.filter(
    (t) => t.brand === "parks-lincoln" && t.imageSrc
  );
  const bmw = LAYOUT_TEMPLATES.filter((t) => t.brand === "bmw" && t.imageSrc);

  const out: typeof LAYOUT_TEMPLATES = [];
  const max = Math.max(parks.length, bmw.length);
  // Alternate parks/bmw/parks/bmw…
  for (let i = 0; i < max && out.length < 8; i++) {
    if (i < parks.length && out.length < 8) out.push(parks[i]);
    if (i < bmw.length && out.length < 8) out.push(bmw[i]);
  }
  return out.slice(0, 8);
}

const BRAND_LABEL: Record<string, { name: string; color: string }> = {
  "parks-lincoln": { name: "Parks Lincoln", color: "#E8DBC8" },
  bmw: { name: "BMW", color: "#0066B1" },
  nissan: { name: "Nissan", color: "#C3002F" },
  subaru: { name: "Subaru", color: "#003DA5" },
};

export function TemplatesShowcase() {
  const items = buildShowcase();
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Templates
          </p>
          <h2 className="font-display text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Real campaigns. Endless variations.
          </h2>
        </div>
        <Link href="/templates">
          <Button variant="outline" className="gap-1.5">
            See all <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((t, i) => {
          const brand = BRAND_LABEL[t.brand];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
            >
              <Link
                href={`/generator?template=${t.baseTemplateId}&layout=${t.layout}&brand=${t.brand}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-border shadow-card transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                <img
                  src={t.imageSrc!}
                  alt={t.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
                {/* Brand chip top-left */}
                <span
                  className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: brand.color }}
                  />
                  {brand.name}
                </span>
                {/* Category chip top-right */}
                <span className="absolute top-3 right-3 rounded-full border border-white/40 bg-black/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur">
                  {t.category}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="font-display text-lg font-bold leading-tight">
                    {t.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/75 line-clamp-1">
                    {t.tagline}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

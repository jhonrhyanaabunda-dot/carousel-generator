"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-24 sm:pt-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
          >
            <Badge variant="primary" className="mb-6 gap-1.5 px-3 py-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              Built exclusively for dealerships · By A3 Brands
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-balance font-display text-[44px] font-black leading-[0.95] tracking-tight sm:text-7xl md:text-[84px]"
          >
            Your dealership&apos;s social feed,{" "}
            <span className="gradient-text">designed in seconds.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg"
          >
            A3 Carousel Studio turns your dealership&apos;s wins — leads, reviews,
            warranties, hours, awards — into scroll-stopping Instagram and LinkedIn
            carousels. Same playbook our 75+ dealer clients use. No designer required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/generator">
              <Button size="xl" className="group">
                <Wand2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
                Generate Carousel
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/templates">
              <Button size="xl" variant="outline">
                Browse dealership templates
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              No login required
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              6+ on-brand slides per generation
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              PNG · ZIP · PDF export
            </div>
          </motion.div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      className="relative mx-auto mt-16 w-full max-w-5xl"
    >
      <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 rounded-[40px] bg-radial-fade opacity-60 blur-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          {
            brand: "parks-lincoln",
            layout: "model-hero",
            title: "Parks Lincoln",
            badge: "LUXURY",
            badgeColor: "#E8DBC8",
            image: "/templates/model-hero-aviator.jpg",
          },
          {
            brand: "bmw",
            layout: "framed-card",
            title: "BMW",
            badge: "PERFORMANCE",
            badgeColor: "#0066B1",
            image: "/templates/bmw/framed-headline.jpg",
          },
          {
            brand: "nissan",
            layout: "hero-headline",
            title: "Nissan",
            badge: "MAINSTREAM",
            badgeColor: "#C3002F",
            image: undefined,
          },
          {
            brand: "subaru",
            layout: "stats-row",
            title: "Subaru",
            badge: "ADVENTURE",
            badgeColor: "#003DA5",
            image: undefined,
          },
          // Intentionally blank placeholder slot
          {
            brand: null,
            layout: null,
            title: "",
            badge: "",
            badgeColor: "#1a1a1a",
            image: undefined,
            blank: true,
          },
        ].map((s: any, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, rotate: (i - 2) * 1.5 }}
            animate={{ opacity: 1, y: 0, rotate: (i - 2) * 1.5 }}
            transition={{ delay: 0.7 + i * 0.08, duration: 0.6 }}
            className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 shadow-card"
            style={{ background: s.blank ? "#0d0d0e" : "#0b0b0c" }}
          >
            {s.blank ? (
              // Empty/blank placeholder card
              <div className="absolute inset-0 grid place-items-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">
                  + Add
                </span>
              </div>
            ) : (
              <>
                {s.image ? (
                  // Real template thumbnail
                  <Link
                    href={`/generator?template=premium-dealer&layout=${s.layout}&brand=${s.brand}`}
                    className="absolute inset-0 group"
                  >
                    <img
                      src={s.image}
                      alt={s.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                  </Link>
                ) : (
                  // Brand-tinted gradient (when no photo yet)
                  <Link
                    href={`/generator?template=premium-dealer&layout=${s.layout}&brand=${s.brand}`}
                    className="absolute inset-0 group"
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${s.badgeColor} 0%, #1F1F1F 100%)`,
                      }}
                    />
                    <div className="absolute inset-0 grid place-items-center">
                      <div
                        className="grid h-14 w-14 place-items-center rounded-full border-2 font-display text-xl font-black text-white/80"
                        style={{ borderColor: "#ffffff44" }}
                      >
                        {s.title.slice(0, 1)}
                      </div>
                    </div>
                  </Link>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-3">
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: s.badgeColor }}
                  >
                    {s.badge}
                  </div>
                  <div
                    className="text-base font-black leading-none"
                    style={{ color: "#fff" }}
                  >
                    {s.title}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

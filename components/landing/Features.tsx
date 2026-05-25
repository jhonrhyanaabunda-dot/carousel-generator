"use client";

import { motion } from "framer-motion";
import {
  Layers,
  Wand2,
  Palette,
  Download,
  Sparkles,
  Type,
  PanelsTopLeft,
  Hash,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Wand2,
    title: "Dealership-trained AI",
    body: "Layouts modeled on the campaigns A3 runs for 75+ active dealer clients — warranty strips, hours cards, contact strips, hero stat reels.",
  },
  {
    icon: Palette,
    title: "OEM-ready theming",
    body: "Premium themes for luxury, mainstream, and pre-owned. Drop your dealership logo and a hero photo — the deck stays on brand.",
  },
  {
    icon: Type,
    title: "Numbers that look great",
    body: "Verified-in-GA4 stat blocks (lead growth, CPL drop, conversion rate) styled with the same restraint as our published case studies.",
  },
  {
    icon: Layers,
    title: "Edit anything inline",
    body: "Click any text to rewrite. Drag to reposition. Pick from 17 webfonts. Swap photos per slide. Undo / redo built in.",
  },
  {
    icon: PanelsTopLeft,
    title: "Templates by use case",
    body: "Service hours · Warranty proof · Award & accolade · New model launch · Trade-in offer · Why-us · Reviews · Contact card.",
  },
  {
    icon: Sparkles,
    title: "Photo-aware design",
    body: "Drop in showroom photos and the generator extracts your palette, sets full-bleed backgrounds, and tunes overlays for legibility.",
  },
  {
    icon: Hash,
    title: "Caption & hashtag draft",
    body: "Launch-ready caption plus a tuned dealership hashtag set — generated from your post copy, not stock filler.",
  },
  {
    icon: Download,
    title: "Ship to every channel",
    body: "High-quality PNG, full ZIP, or paginated PDF deck. Sized for IG portrait, square, Stories, and LinkedIn carousel.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">
          The full dealership social toolkit
        </p>
        <h2 className="font-display text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          Less fiddling. <span className="gradient-text">More leads.</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.04, duration: 0.5 }}
          >
            <Card className="group h-full p-6 transition-all hover:-translate-y-0.5 hover:shadow-glow">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary/50 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold leading-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

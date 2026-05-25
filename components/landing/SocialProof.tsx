"use client";

import { motion } from "framer-motion";

// Pulled straight from A3 Brands case studies — these are the kinds of stats
// dealerships post in their carousels, and the kinds A3 generates for clients.
const STATS = [
  { value: "+93%", label: "Leads in 60 days", dealer: "CDJR · Houston" },
  { value: "-63%", label: "Cost per lead", dealer: "CDJR · Houston" },
  { value: "346/mo", label: "Lead volume tripled", dealer: "Acura · NE Florida" },
  { value: "+53%", label: "YoY lead growth", dealer: "Hyundai · N. Nevada" },
];

const META = [
  { value: "75+", label: "active dealer clients" },
  { value: "20+", label: "OEM programs" },
  { value: "25%", label: "average YoY lead growth" },
  { value: "0", label: "long-term contracts" },
];

export function SocialProof() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-8 pt-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-border bg-card/60 p-8 backdrop-blur sm:p-10"
      >
        <div className="mb-6 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              The same playbook our 75+ dealers run
            </p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
              Real stats from real A3 dealer campaigns.
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            The carousel layouts in this studio mirror the on-brand stat cards,
            warranty strips, and hours posts A3 builds for clients. Every number
            below is verified in GA4.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="rounded-2xl border border-border bg-background/60 p-5"
            >
              <div className="font-display text-3xl font-black leading-none tracking-tight text-primary sm:text-4xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-semibold">{s.label}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {s.dealer}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-4">
          {META.map((m) => (
            <div key={m.label} className="text-center sm:text-left">
              <div className="font-display text-xl font-black tracking-tight">
                {m.value}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

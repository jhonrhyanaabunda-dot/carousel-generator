"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-[32px] border border-border bg-gradient-to-br from-primary/15 via-secondary to-secondary p-12 text-center sm:p-20">
        <div className="absolute -top-20 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-full bg-primary/30 opacity-40 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mx-auto mb-5 inline-grid h-10 w-10 place-items-center rounded-xl bg-emerald-brand">
            <span className="text-sm font-black leading-none text-black">A3</span>
          </div>
          <h2 className="font-display text-balance text-4xl font-black tracking-tight sm:text-5xl">
            Stop posting stock graphics.
          </h2>
          <p className="mt-5 text-balance text-base text-muted-foreground sm:text-lg">
            Ship a full week of dealership-grade carousels in the time it takes
            to brief a freelancer. Every layout pulled from campaigns that drive
            real leads.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/generator" className="inline-flex">
              <Button size="xl" className="gap-2">
                Start generating <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://a3brands.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button size="xl" variant="outline" className="gap-2">
                Talk to A3 about full-service SEO
              </Button>
            </a>
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Zero long-term contracts · Every number verified in GA4
          </p>
        </div>
      </div>
    </section>
  );
}

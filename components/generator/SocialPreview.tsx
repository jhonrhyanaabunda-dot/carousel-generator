"use client";

import { useState } from "react";
import {
  Bookmark,
  Heart,
  Linkedin,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type Slide,
  type TemplateTheme,
} from "@/types";
import { SlideRenderer } from "@/components/slides/SlideRenderer";
import { generateCaption, generateHashtags } from "@/lib/ai-helpers";
import { cn } from "@/lib/utils";

export interface SocialPreviewProps {
  slides: Slide[];
  template: TemplateTheme;
  aspect: AspectRatio;
  active: number;
  onActiveChange: (i: number) => void;
  brandName?: string;
  headline: string;
  subtitle: string;
  body: string;
}

type Channel = "instagram" | "facebook" | "linkedin" | "google";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "google", label: "Google" },
];

export function SocialPreview({
  slides,
  template,
  aspect,
  active,
  onActiveChange,
  brandName,
  headline,
  subtitle,
  body,
}: SocialPreviewProps) {
  const [channel, setChannel] = useState<Channel>("instagram");

  if (slides.length === 0) return null;

  const handle =
    "@" + (brandName ?? "your_dealership").toLowerCase().replace(/[^a-z0-9]/g, "");
  const caption = generateCaption({
    headline,
    subtitle,
    body,
    brandName,
  });
  const tags = generateHashtags({
    headline,
    subtitle,
    body,
    brandName,
    templateName: template.name,
  });

  // Card width is fixed; slide scales to fit.
  const cardWidth =
    channel === "linkedin" ? 540 : channel === "google" ? 480 : 420;
  const dims = ASPECT_RATIOS[aspect];
  const slideWidth = cardWidth;

  return (
    <div className="flex h-full flex-col">
      {/* Channel tabs */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => setChannel(c.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              channel === c.id
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Mockup */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto" style={{ width: cardWidth + 32 }}>
          {channel === "instagram" && (
            <InstagramCard
              slide={slides[active]}
              template={template}
              aspect={aspect}
              active={active}
              total={slides.length}
              onActiveChange={onActiveChange}
              handle={handle}
              brandName={brandName ?? "Your Dealership"}
              caption={caption}
              tags={tags}
              slideWidth={slideWidth}
            />
          )}
          {channel === "facebook" && (
            <FacebookCard
              slide={slides[active]}
              template={template}
              aspect={aspect}
              active={active}
              total={slides.length}
              onActiveChange={onActiveChange}
              handle={handle}
              brandName={brandName ?? "Your Dealership"}
              caption={caption}
              slideWidth={slideWidth}
            />
          )}
          {channel === "linkedin" && (
            <LinkedInCard
              slide={slides[active]}
              template={template}
              aspect={aspect}
              active={active}
              total={slides.length}
              onActiveChange={onActiveChange}
              handle={handle}
              brandName={brandName ?? "Your Dealership"}
              caption={caption}
              slideWidth={slideWidth}
            />
          )}
          {channel === "google" && (
            <GoogleCard
              slide={slides[active]}
              template={template}
              aspect={aspect}
              active={active}
              total={slides.length}
              onActiveChange={onActiveChange}
              brandName={brandName ?? "Your Dealership"}
              headline={headline}
              caption={caption}
              slideWidth={slideWidth}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Instagram mockup
// --------------------------------------------------------------------

function InstagramCard(props: {
  slide: Slide;
  template: TemplateTheme;
  aspect: AspectRatio;
  active: number;
  total: number;
  onActiveChange: (i: number) => void;
  handle: string;
  brandName: string;
  caption: string;
  tags: string[];
  slideWidth: number;
}) {
  const { slide, template, aspect, active, total, onActiveChange, handle, brandName, caption, tags, slideWidth } = props;
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-300 bg-white text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="grid h-full w-full place-items-center rounded-full bg-white text-[10px] font-bold text-zinc-900">
              {brandName.slice(0, 1)}
            </div>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{handle.slice(1)}</div>
            <div className="text-[10px] text-zinc-500">Sponsored</div>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-zinc-600" />
      </div>

      {/* Slide */}
      <div className="relative bg-zinc-100 dark:bg-zinc-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <SlideRenderer
              slide={slide}
              template={template}
              aspect={aspect}
              index={active}
              total={total}
              width={slideWidth}
            />
          </motion.div>
        </AnimatePresence>

        {/* Swipe dots */}
        {total > 1 && (
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => onActiveChange(i)}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === active ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}

        {/* Page x / N pill */}
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
          {active + 1}/{total}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-4">
          <Heart className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </div>
        <Bookmark className="h-5 w-5" />
      </div>

      {/* Likes + caption */}
      <div className="px-3 pb-3">
        <div className="text-sm font-semibold">2,605 likes</div>
        <div className="mt-1 text-sm leading-relaxed">
          <span className="font-semibold">{handle.slice(1)}</span>{" "}
          <span className="text-zinc-800 dark:text-zinc-200">
            {caption.split("\n")[0]}
          </span>
          {caption.split("\n").length > 1 && (
            <div className="mt-1 whitespace-pre-line text-xs text-zinc-700 dark:text-zinc-300">
              {caption.split("\n").slice(1).join("\n")}
            </div>
          )}
          <div className="mt-2 text-xs leading-relaxed text-sky-700 dark:text-sky-400">
            {tags.slice(0, 8).join(" ")}
          </div>
        </div>
        <div className="mt-2 text-[11px] text-zinc-500">2 hours ago</div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Facebook mockup
// --------------------------------------------------------------------

function FacebookCard(props: {
  slide: Slide;
  template: TemplateTheme;
  aspect: AspectRatio;
  active: number;
  total: number;
  onActiveChange: (i: number) => void;
  handle: string;
  brandName: string;
  caption: string;
  slideWidth: number;
}) {
  const { slide, template, aspect, active, total, onActiveChange, brandName, caption, slideWidth } = props;
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-600 text-sm font-bold text-white">
          {brandName.slice(0, 1)}
        </div>
        <div className="flex-1 leading-tight">
          <div className="text-sm font-semibold">{brandName}</div>
          <div className="text-[11px] text-zinc-500">Sponsored · Just now</div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-zinc-600" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-2 text-sm leading-relaxed">
        {caption.split("\n").slice(0, 2).join(" ")}
      </div>

      {/* Slide */}
      <div className="relative bg-zinc-100 dark:bg-zinc-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <SlideRenderer
              slide={slide}
              template={template}
              aspect={aspect}
              index={active}
              total={total}
              width={slideWidth}
            />
          </motion.div>
        </AnimatePresence>
        {total > 1 && (
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => onActiveChange(i)}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === active ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reactions row */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-sky-600 text-[10px] text-white">
            <ThumbsUp className="h-2.5 w-2.5" />
          </span>
          <span>1.2K</span>
        </div>
        <div>312 comments · 86 shares</div>
      </div>
      <div className="flex items-center justify-around px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
        <button className="flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" /> Like
        </button>
        <button className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" /> Comment
        </button>
        <button className="flex items-center gap-1.5">
          <Send className="h-4 w-4" /> Share
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// LinkedIn mockup
// --------------------------------------------------------------------

function LinkedInCard(props: {
  slide: Slide;
  template: TemplateTheme;
  aspect: AspectRatio;
  active: number;
  total: number;
  onActiveChange: (i: number) => void;
  handle: string;
  brandName: string;
  caption: string;
  slideWidth: number;
}) {
  const { slide, template, aspect, active, total, onActiveChange, brandName, caption, slideWidth } = props;
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-sky-700 text-base font-bold text-white">
          {brandName.slice(0, 1)}
        </div>
        <div className="flex-1 leading-tight">
          <div className="flex items-center gap-1 text-sm font-semibold">
            {brandName}
            <span className="text-xs font-normal text-zinc-500">· 1st</span>
          </div>
          <div className="text-xs text-zinc-500">
            Dealership · Automotive · Followed by 12,453 people
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
            2h · <MapPin className="h-3 w-3" />
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-zinc-600" />
      </div>

      {/* Caption */}
      <div className="px-4 pb-3 text-sm leading-relaxed">
        {caption.split("\n").slice(0, 3).join(" ")}
        <span className="ml-1 text-sm font-semibold text-sky-700">…see more</span>
      </div>

      {/* Slide */}
      <div className="relative bg-zinc-100 dark:bg-zinc-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <SlideRenderer
              slide={slide}
              template={template}
              aspect={aspect}
              index={active}
              total={total}
              width={slideWidth}
            />
          </motion.div>
        </AnimatePresence>
        {/* Page indicator + navigation */}
        {total > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              {active + 1} / {total}
            </div>
            {active < total - 1 && (
              <button
                onClick={() => onActiveChange(active + 1)}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-zinc-900 shadow-md"
                title="Next slide"
              >
                ›
              </button>
            )}
            {active > 0 && (
              <button
                onClick={() => onActiveChange(active - 1)}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-zinc-900 shadow-md"
                title="Previous slide"
              >
                ‹
              </button>
            )}
          </>
        )}
      </div>

      {/* Reaction count */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-sky-700 text-[10px] text-white">
            <ThumbsUp className="h-2.5 w-2.5" />
          </span>
          <span>847 reactions</span>
        </div>
        <div>168 comments · 24 reposts</div>
      </div>
      <div className="flex items-center justify-around px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        <button className="flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" /> Like
        </button>
        <button className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" /> Comment
        </button>
        <button className="flex items-center gap-1.5">
          <Send className="h-4 w-4" /> Send
        </button>
        <button className="flex items-center gap-1.5">
          <Linkedin className="h-4 w-4" /> Repost
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Google Discover-style mockup — how the carousel would appear as a
// sponsored card in Google's Discover feed / Performance Max placement.
// --------------------------------------------------------------------

function GoogleCard(props: {
  slide: Slide;
  template: TemplateTheme;
  aspect: AspectRatio;
  active: number;
  total: number;
  onActiveChange: (i: number) => void;
  brandName: string;
  headline: string;
  caption: string;
  slideWidth: number;
}) {
  const {
    slide,
    template,
    aspect,
    active,
    total,
    onActiveChange,
    brandName,
    headline,
    caption,
    slideWidth,
  } = props;
  const description = caption.split("\n")[0] || "";
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Google chrome header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Search className="h-3 w-3 text-zinc-500" />
          </span>
          <span className="text-[11px] font-medium text-zinc-500">
            Discover · Sponsored
          </span>
        </div>
        <span className="ml-auto rounded border border-zinc-300 px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 dark:border-zinc-700">
          Ad
        </span>
      </div>

      {/* Brand row */}
      <div className="flex items-center gap-2.5 px-3 pt-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-sky-600 text-xs font-bold text-white">
          {brandName.slice(0, 1)}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{brandName}</div>
          <div className="text-[10px] text-zinc-500">parkslincoln.com · 2h ago</div>
        </div>
        <MoreHorizontal className="ml-auto h-4 w-4 text-zinc-500" />
      </div>

      {/* Headline */}
      <div className="px-3 pb-2 pt-2 text-base font-bold leading-snug">
        {headline || "Visit your local dealership."}
      </div>
      {description && (
        <div className="px-3 pb-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {description}
        </div>
      )}

      {/* Slide */}
      <div className="relative bg-zinc-100 dark:bg-zinc-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <SlideRenderer
              slide={slide}
              template={template}
              aspect={aspect}
              index={active}
              total={total}
              width={slideWidth}
            />
          </motion.div>
        </AnimatePresence>
        {total > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-semibold text-white">
              {active + 1} / {total}
            </div>
            {active < total - 1 && (
              <button
                onClick={() => onActiveChange(active + 1)}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-zinc-900 shadow-md"
                title="Next slide"
              >
                ›
              </button>
            )}
            {active > 0 && (
              <button
                onClick={() => onActiveChange(active - 1)}
                className="absolute left-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-zinc-900 shadow-md"
                title="Previous slide"
              >
                ‹
              </button>
            )}
          </>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between border-t border-zinc-200 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <button className="flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
          Learn more
        </button>
        <div className="flex items-center gap-3 text-zinc-500">
          <button className="flex items-center gap-1" title="Like">
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button title="Save">
            <Bookmark className="h-3.5 w-3.5" />
          </button>
          <button title="Share">
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

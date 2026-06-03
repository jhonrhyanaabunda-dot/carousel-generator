"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarRange,
  Download,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "carousel-maker:onboarded";

interface Step {
  title: string;
  body: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: <Briefcase className="h-5 w-5" />,
    title: "Pick a Brand Kit",
    body:
      "Top-left of the input panel: load one of the 4 starter kits (Parks Lincoln, BMW, Nissan, Subaru), or save your own dealership. One click pre-fills name, contact, hours, address.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Hit Generate",
    body:
      "Click 'Generate carousel' (or press R) to spin up 5–7 unique slides. Each click rotates the design pattern, structure mode, fonts, and alignment so no two decks look the same.",
  },
  {
    icon: <Type className="h-5 w-5" />,
    title: "Edit anything inline",
    body:
      "Click any text to select. Type to edit. Drag (>5px) to move. The floating toolbar gives you font, size, color, case, alignment, plus 'Apply to all' to propagate to every slide.",
  },
  {
    icon: <CalendarRange className="h-5 w-5" />,
    title: "Generate a whole week",
    body:
      "Bottom of the input panel: 'Generate week of posts' creates 7 themed projects (Mon model spotlight, Tue service tip, Wed reviews, etc.), perfect for a dealer's weekly content cadence.",
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Export when you're ready",
    body:
      "Bottom toolbar: 'This slide' (PNG), 'All slides · ZIP' (one PNG per slide, ready to upload to IG), or 'Full deck · PDF' (LinkedIn carousel ready). Press ? anywhere to see all keyboard shortcuts.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        // Tiny delay so the tour appears after the page paints, not during.
        setTimeout(() => setOpen(true), 600);
      }
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  const finish = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (!open) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={finish}
    >
      <div
        className="relative w-[min(480px,92vw)] rounded-2xl border border-border bg-popover p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={finish}
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-brand text-black">
            {s.icon}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Step {step + 1} of {STEPS.length}
            </div>
            <h2 className="text-lg font-semibold leading-tight">{s.title}</h2>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>

        {/* Dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={finish}
            className="text-muted-foreground"
          >
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={() =>
                isLast ? finish() : setStep((s) => s + 1)
              }
              className="gap-1.5"
            >
              {isLast ? "Get started" : "Next"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

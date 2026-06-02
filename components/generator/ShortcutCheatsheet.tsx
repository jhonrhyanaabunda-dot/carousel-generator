"use client";

import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "Z"], label: "Undo" },
  { keys: ["⌘", "⇧", "Z"], label: "Redo" },
  { keys: ["⌘", "S"], label: "Save project" },
  { keys: ["R"], label: "Regenerate carousel" },
  { keys: ["E"], label: "Toggle editing / preview mode" },
  { keys: ["←", "→"], label: "Previous / next slide" },
  { keys: ["?"], label: "Open this cheatsheet" },
  { keys: ["Esc"], label: "Close cheatsheet · deselect element" },
  { keys: ["Click + drag"], label: "Move text element (after 5px)" },
  { keys: ["Click"], label: "Select text element · edit text" },
  { keys: ["↑", "↓", "←", "→"], label: "Nudge selected element 1px" },
  { keys: ["⇧", "+ arrow"], label: "Nudge selected element 10px" },
  { keys: ["⌘", "D"], label: "Duplicate selected custom text" },
  { keys: ["Delete", "Backspace"], label: "Remove selected custom text" },
];

export function ShortcutCheatsheet() {
  const [open, setOpen] = useState(false);

  // Open on ?, close on Esc. Ignored while typing inside an input/textarea/
  // contenteditable so it doesn't fight regular text entry.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const typing =
        !!ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.isContentEditable);
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (typing) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-[min(540px,92vw)] rounded-2xl border border-border bg-popover p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="grid h-7 w-7 place-items-center rounded-md hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2"
            >
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
          Press <kbd className="rounded border border-border bg-secondary px-1 font-mono">?</kbd> anywhere to open · <kbd className="rounded border border-border bg-secondary px-1 font-mono">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}

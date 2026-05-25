"use client";

import { useEffect } from "react";

export interface ShortcutMap {
  [combo: string]: () => void;
}

/**
 * combo format: "mod+z", "shift+mod+z", "g", "arrowleft"
 * mod = meta on mac, ctrl elsewhere.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) {
        return;
      }
      const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const parts: string[] = [];
      if (mod) parts.push("mod");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      const key = e.key.toLowerCase();
      parts.push(key);
      const combo = parts.join("+");
      const fn = shortcuts[combo];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts, enabled]);
}

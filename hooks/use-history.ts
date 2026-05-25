"use client";

import { useCallback, useRef, useState } from "react";

export function useHistory<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        past.current.push(prev);
        if (past.current.length > 50) past.current.shift();
        future.current = [];
        return value;
      });
    },
    []
  );

  const replace = useCallback((next: T) => {
    setState(next);
    past.current = [];
    future.current = [];
  }, []);

  // Silent update — does not push an undo entry. Use for auto-sync side effects
  // (like distributing newly uploaded images across existing slides) where the
  // change is incidental to the user's primary action.
  const setSilent = useCallback((next: T | ((prev: T) => T)) => {
    setState((prev) =>
      typeof next === "function" ? (next as (p: T) => T)(prev) : next
    );
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      const last = past.current.pop();
      if (last === undefined) return prev;
      future.current.push(prev);
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      const next = future.current.pop();
      if (next === undefined) return prev;
      past.current.push(prev);
      return next;
    });
  }, []);

  return {
    state,
    set,
    setSilent,
    replace,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}

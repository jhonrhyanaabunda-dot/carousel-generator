"use client";

import * as React from "react";

// Shared momentum (inertial / kinetic) drag + zoom for every draggable image
// in the app. Single source of truth — both SlideDragHandle (the full-slide
// handle) and DraggableImg (every per-template image render) wire through this
// hook, so any current or future template inherits identical behavior
// automatically.
//
// Why one hook instead of per-template implementations:
//   - Friction, click threshold, velocity guard, rAF lifecycle, the
//     "cancel-on-new-drag" rule, wheel-zoom and pinch-zoom are all easy to get
//     subtly wrong; doing them once means we don't drift between sites.
//   - Touch and mouse converge through PointerEvent, so a single set of
//     handlers covers both — no separate touch path to maintain. Pinch is just
//     "two PointerEvents tracked at once", wheel is the desktop equivalent.
//
// Naming follows the canonical drag terminology requested by the spec:
//   initDrag        — pointer-down anchor + cancel in-flight glide
//   end             — pointer-up, kicks off momentum if the gesture had velocity
//   applyImagePosition — opts.applyPosition, called every frame of drag + glide
//   imagePositions[idx] — modeled by opts.getPosition / applyPosition, so the
//                         hook stays storage-agnostic (works equally for a
//                         per-slide transform, a per-element x/y, etc.)

export interface UseMomentumDragOptions {
  // Source of truth for the current position — called once at pointer-down
  // (to anchor the drag) and once per frame during the post-release glide
  // (so the loop reads the freshest x/y even when state has been touched
  // elsewhere).
  getPosition: () => { x: number; y: number };
  // Write a new position back to state. Called on every pointer-move during
  // drag and every rAF tick during glide. Constraints (clamping, snapping,
  // boundary checks) belong inside applyPosition itself — the hook stays
  // out of policy.
  applyPosition: (x: number, y: number) => void;
  // CSS scale of the surface the pointer moves over — pointer-px ÷ scale
  // = state-space px. Slides render at a scale (e.g. 0.4); without this the
  // image would jump by 2.5× the intended distance on a downscaled preview.
  scale?: number;
  // Friction factor per ~16 ms frame. 0.9 = subtle glide (~30 frames),
  // 0.95 = longer trail, 0.85 = stops faster. Anything outside [0.6, 0.99]
  // gets clamped to keep the feel sane.
  friction?: number;
  // Stop the rAF loop when |v| falls below this (state-space px per frame).
  // Default 0.05 — sub-pixel, prevents the "asymptotic crawl" where the
  // image inches forward forever.
  minVelocity?: number;
  // Pixels of pointer travel before drag mode engages. Below this, pointer-up
  // is treated as a click and onClick fires (the image stays put). Default 3.
  clickThreshold?: number;
  // Fired on pointer-up when the gesture stayed below clickThreshold —
  // lets the caller treat tap-without-drag as "select this image".
  onClick?: () => void;
  // If false, all handlers no-op. Use this when the image is not yet
  // selected and should be a passive target.
  enabled?: boolean;
  // Optional zoom support. When provided, the same element gains mouse-wheel
  // zoom (desktop) and two-finger pinch zoom (touch), driving the SAME scale
  // value the rest of the system already uses (transform.scale). Like
  // applyPosition, all clamping / re-centering policy lives inside apply().
  zoom?: MomentumZoomOptions;
}

export interface MomentumZoomOptions {
  // Current zoom factor (e.g. transform.scale; 1 = native).
  get: () => number;
  // Write the new zoom factor back. Re-clamping the pan offset to the new,
  // smaller/larger overflow window belongs here (so a zoom-out can't leave the
  // image panned past its edges).
  apply: (scale: number) => void;
  // Hard zoom limits — kept in sync with the toolbar's Zoom slider (0.5–3).
  min?: number;
  max?: number;
  // Wheel sensitivity: factor = exp(-deltaY * sensitivity). Default 0.0015 —
  // ~15 % per notch, smooth on trackpads. Larger = more aggressive.
  sensitivity?: number;
  // Gate that decides whether zoom is allowed *right now* (read fresh on every
  // wheel/pinch event). Lets a per-image caller restrict zoom to the selected
  // image without re-attaching listeners. Defaults to always-on.
  active?: () => boolean;
}

export interface MomentumDragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

export interface UseMomentumDragResult {
  // True while the pointer is down AND has crossed the click threshold.
  dragging: boolean;
  // Spread directly onto the draggable element. PointerEvents unify mouse
  // and touch, so this is the entire desktop+mobile drag contract.
  handlers: MomentumDragHandlers;
  // Callback ref — MUST be attached to the draggable element. It both tracks
  // the node (so callers can read its box) and wires the non-passive `wheel`
  // listener used for desktop zoom (React's synthetic onWheel is passive and
  // can't preventDefault, which would let the page scroll while zooming).
  ref: (el: HTMLElement | null) => void;
  // The currently-attached element, for callers that need to measure it
  // (e.g. clamping pan to offsetWidth/offsetHeight).
  elementRef: React.MutableRefObject<HTMLElement | null>;
  // Imperative escape hatch — call to stop the glide programmatically
  // (e.g. when the parent unmounts the layer or switches slide).
  stopMomentum: () => void;
}

// Clamp friction to a sane band so a misconfigured caller can't make the
// glide either instantly stop (≤ 0.6) or run forever (≥ 0.99).
const FRICTION_MIN = 0.6;
const FRICTION_MAX = 0.99;

function clampZoom(v: number, z: MomentumZoomOptions): number {
  return Math.min(z.max ?? 4, Math.max(z.min ?? 1, v));
}

export function useMomentumDrag(
  opts: UseMomentumDragOptions
): UseMomentumDragResult {
  const {
    scale = 1,
    friction = 0.9,
    minVelocity = 0.05,
    clickThreshold = 3,
    enabled = true,
  } = opts;
  const fric = Math.min(FRICTION_MAX, Math.max(FRICTION_MIN, friction));

  // Drag bookkeeping — kept in a ref to avoid re-renders during pointer-move
  // (which fires up to 60+ times per second).
  const drag = React.useRef({
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
    lastClientX: 0,
    lastClientY: 0,
    lastT: 0,
    vx: 0, // client-px per ms
    vy: 0,
    moved: false,
    pointerId: -1,
  });

  // Live set of pointers currently down on the element, keyed by pointerId.
  // One entry → pan/drag. Two entries → pinch-zoom. PointerEvents give us
  // mouse, pen, and every touch through the same map.
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  // Pinch session state. startDist/startScale anchor the gesture so scale
  // tracks the ratio of finger spread to its spread at pinch start.
  const pinch = React.useRef({ active: false, startDist: 0, startScale: 1 });

  // Latest callback / option refs — so handlers stay stable across renders and
  // the rAF tick + native wheel listener read the freshest values.
  const getRef = React.useRef(opts.getPosition);
  const applyRef = React.useRef(opts.applyPosition);
  const onClickRef = React.useRef(opts.onClick);
  const zoomRef = React.useRef(opts.zoom);
  const enabledRef = React.useRef(enabled);
  React.useEffect(() => {
    getRef.current = opts.getPosition;
    applyRef.current = opts.applyPosition;
    onClickRef.current = opts.onClick;
    zoomRef.current = opts.zoom;
    enabledRef.current = enabled;
  });

  const raf = React.useRef<number | null>(null);
  const [dragging, setDragging] = React.useState(false);

  // Single source of momentum cancellation. Called from:
  //   - initDrag (cancel-on-new-drag — the #1 rule)
  //   - startMomentum (defensive — never stack two loops)
  //   - wheel / pinch zoom (a deliberate zoom shouldn't fight a glide)
  //   - effect cleanup (unmount during glide)
  //   - imperative stopMomentum() returned to callers
  const stopMomentum = React.useCallback(() => {
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, []);

  React.useEffect(() => () => stopMomentum(), [stopMomentum]);

  // Convert the last sampled client-px/ms velocity into state-space px/frame
  // and run the friction loop. Returns immediately if the velocity at
  // release was below the threshold — a deliberate "place and stop" drag
  // should never glide.
  const startMomentum = React.useCallback(() => {
    stopMomentum();
    let vx = (drag.current.vx / scale) * 16;
    let vy = (drag.current.vy / scale) * 16;
    if (Math.hypot(vx, vy) < minVelocity) return;
    const tick = () => {
      const cur = getRef.current();
      applyRef.current(cur.x + vx, cur.y + vy);
      vx *= fric;
      vy *= fric;
      if (Math.hypot(vx, vy) < minVelocity) {
        raf.current = null;
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [scale, fric, minVelocity, stopMomentum]);

  const initDrag = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}

      // Two fingers + zoom available → start a pinch. Cancel any glide and
      // abandon the in-flight single-finger drag (its velocity is now
      // meaningless). moved=true so the eventual pointer-up isn't a "click".
      const z = zoomRef.current;
      if (pointers.current.size === 2 && z && (z.active?.() ?? true)) {
        stopMomentum();
        setDragging(false);
        const pts = [...pointers.current.values()];
        pinch.current = {
          active: true,
          startDist:
            Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
          startScale: z.get(),
        };
        drag.current.moved = true;
        return;
      }
      // A 3rd+ pointer (or 2nd without zoom) shouldn't disturb the primary
      // drag — ignore it rather than re-anchoring onto it.
      if (pointers.current.size > 1) return;

      // Cancel-on-new-drag — without this, grabbing mid-glide makes the
      // image fight the user (the loop keeps applying old velocity while
      // they're trying to anchor it somewhere new).
      stopMomentum();
      const pos = getRef.current();
      const now = performance.now();
      drag.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: pos.x,
        startY: pos.y,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        lastT: now,
        vx: 0,
        vy: 0,
        moved: false,
        pointerId: e.pointerId,
      };
    },
    [enabled, stopMomentum]
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Pinch takes precedence over pan while two fingers are down.
      if (pinch.current.active) {
        const z = zoomRef.current;
        if (!z || pointers.current.size < 2) return;
        const pts = [...pointers.current.values()];
        const dist =
          Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const next = clampZoom(
          pinch.current.startScale * (dist / pinch.current.startDist),
          z
        );
        z.apply(next);
        e.stopPropagation();
        return;
      }

      if (e.buttons !== 1) return;
      if (e.pointerId !== drag.current.pointerId) return;
      const dx = e.clientX - drag.current.startClientX;
      const dy = e.clientY - drag.current.startClientY;
      if (!drag.current.moved) {
        if (Math.hypot(dx, dy) < clickThreshold) return;
        drag.current.moved = true;
        setDragging(true);
      }
      // Sample instantaneous velocity from the last pointer-move tick.
      // Floor dt at 1 ms so a same-frame event doesn't divide by zero.
      const now = performance.now();
      const dt = Math.max(1, now - drag.current.lastT);
      drag.current.vx = (e.clientX - drag.current.lastClientX) / dt;
      drag.current.vy = (e.clientY - drag.current.lastClientY) / dt;
      drag.current.lastClientX = e.clientX;
      drag.current.lastClientY = e.clientY;
      drag.current.lastT = now;
      applyRef.current(
        drag.current.startX + dx / scale,
        drag.current.startY + dy / scale
      );
      e.stopPropagation();
    },
    [enabled, scale, clickThreshold]
  );

  const end = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(e.pointerId);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}

      // Lifting a finger out of a pinch. When only one remains, leave pinch
      // mode and re-anchor that finger as a fresh pan so the image doesn't
      // jump by the (now stale) drag delta.
      if (pinch.current.active) {
        if (pointers.current.size < 2) {
          pinch.current.active = false;
          const remaining = [...pointers.current.entries()][0];
          if (remaining) {
            const [pid, p] = remaining;
            const pos = getRef.current();
            drag.current = {
              startClientX: p.x,
              startClientY: p.y,
              startX: pos.x,
              startY: pos.y,
              lastClientX: p.x,
              lastClientY: p.y,
              lastT: performance.now(),
              vx: 0,
              vy: 0,
              moved: false,
              pointerId: pid,
            };
          }
        }
        return;
      }

      // Click vs drag — if the gesture never crossed the threshold, treat
      // pointer-up as a click and don't apply any momentum.
      if (!drag.current.moved) {
        onClickRef.current?.();
        return;
      }
      setDragging(false);
      // Stale-velocity guard — if the user held still for >100 ms before
      // release, vx/vy reflect old motion. Zeroing them keeps a deliberate
      // "place here" drag from gliding past the target.
      if (performance.now() - drag.current.lastT > 100) {
        drag.current.vx = 0;
        drag.current.vy = 0;
      }
      startMomentum();
      e.stopPropagation();
    },
    [startMomentum]
  );

  // Element tracking + non-passive wheel listener for desktop zoom.
  // React's synthetic onWheel is registered passive, so preventDefault() there
  // is ignored and the page scrolls behind the zoom. A native listener with
  // { passive: false } is the only reliable way to both zoom AND swallow the
  // scroll. The callback ref attaches/detaches it as the node mounts/unmounts.
  const elementRef = React.useRef<HTMLElement | null>(null);
  const wheelCleanup = React.useRef<(() => void) | null>(null);
  const attachRef = React.useCallback(
    (el: HTMLElement | null) => {
      elementRef.current = el;
      if (wheelCleanup.current) {
        wheelCleanup.current();
        wheelCleanup.current = null;
      }
      if (!el) return;
      const onWheel = (ev: WheelEvent) => {
        const z = zoomRef.current;
        if (!enabledRef.current || !z || !(z.active?.() ?? true)) return;
        ev.preventDefault();
        stopMomentum();
        const factor = Math.exp(-ev.deltaY * (z.sensitivity ?? 0.0015));
        z.apply(clampZoom(z.get() * factor, z));
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      wheelCleanup.current = () => el.removeEventListener("wheel", onWheel);
    },
    [stopMomentum]
  );

  return {
    dragging,
    handlers: {
      onPointerDown: initDrag,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
    },
    ref: attachRef,
    elementRef,
    stopMomentum,
  };
}

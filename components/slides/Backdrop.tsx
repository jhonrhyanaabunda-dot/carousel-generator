"use client";

import type { BackdropKind, TemplateTheme } from "@/types";

export function Backdrop({
  theme,
  seed = 1,
  kind,
}: {
  theme: TemplateTheme;
  seed?: number;
  kind?: BackdropKind;
}) {
  const { palette } = theme;
  const backdrop = kind ?? theme.backdrop;
  switch (backdrop) {
    case "mesh":
      return (
        <>
          <div
            className="absolute inset-0"
            style={{ background: palette.bg }}
          />
          <div
            className="absolute -top-1/4 -left-1/4 h-[80%] w-[80%] rounded-full opacity-50 blur-3xl"
            style={{
              background: `radial-gradient(closest-side, ${palette.accent}, transparent 70%)`,
            }}
          />
          <div
            className="absolute -bottom-1/4 -right-1/4 h-[80%] w-[80%] rounded-full opacity-40 blur-3xl"
            style={{
              background: `radial-gradient(closest-side, ${palette.accent2}, transparent 70%)`,
            }}
          />
          <div
            className="absolute inset-0 mix-blend-overlay opacity-20"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
            }}
          />
        </>
      );
    case "gradient":
      return (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.surface} 100%)`,
          }}
        />
      );
    case "grid":
      return (
        <>
          <div className="absolute inset-0" style={{ background: palette.bg }} />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `linear-gradient(${palette.muted}22 1px, transparent 1px), linear-gradient(90deg, ${palette.muted}22 1px, transparent 1px)`,
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse at center, black 50%, transparent 90%)",
            }}
          />
          <div
            className="absolute -top-32 right-[10%] h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: palette.accent }}
          />
        </>
      );
    case "noise":
      return (
        <>
          <div className="absolute inset-0" style={{ background: palette.bg }} />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
            }}
          />
        </>
      );
    case "spotlight":
      return (
        <>
          <div className="absolute inset-0" style={{ background: palette.bg }} />
          <div
            className="absolute left-1/2 top-0 h-[120%] w-[120%] -translate-x-1/2 opacity-30 blur-3xl"
            style={{
              background: `radial-gradient(ellipse at top, ${palette.accent}, transparent 60%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(ellipse at bottom, ${palette.surface}, ${palette.bg})`,
            }}
          />
        </>
      );
    case "scanlines":
      return (
        <>
          <div className="absolute inset-0" style={{ background: palette.bg }} />
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, ${palette.accent}11 0px, ${palette.accent}11 2px, transparent 2px, transparent 6px)`,
            }}
          />
          <div
            className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full opacity-30 blur-3xl"
            style={{ background: palette.accent }}
          />
        </>
      );
    default:
      return <div className="absolute inset-0" style={{ background: palette.bg }} />;
  }
}

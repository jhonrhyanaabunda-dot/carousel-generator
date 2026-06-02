"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";
import { injectAllCustomFonts } from "@/lib/custom-fonts";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Inject any user-uploaded @font-face rules on app boot so custom fonts
  // are available everywhere (toolbar + rendered slides) without a reload.
  React.useEffect(() => {
    injectAllCustomFonts();
  }, []);
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "A3 Carousel Studio: Dealership Social Content, Done in Seconds",
  description:
    "The carousel generator built exclusively for car dealerships. Drop in your numbers, pick a vibe, and ship scroll-stopping social posts in under a minute. By A3 Brands.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans antialiased grain">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider delayDuration={250}>
            <div className="relative isolate flex min-h-dvh flex-col">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-radial-fade opacity-70"
              />
              <SiteNav />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <Toaster
                richColors
                position="bottom-right"
                toastOptions={{
                  className: "rounded-xl border border-border/50",
                }}
              />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

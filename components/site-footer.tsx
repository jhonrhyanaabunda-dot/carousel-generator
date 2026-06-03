import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-brand">
            <span className="text-[10px] font-black leading-none text-black">A3</span>
          </div>
          <span className="font-semibold text-foreground">A3 Carousel Studio</span>
          <span className="text-xs">Dealership social content, built by{" "}
            <a
              href="https://a3brands.com"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              A3 Brands
            </a>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/templates" className="hover:text-foreground">Templates</Link>
          <Link href="/generator" className="hover:text-foreground">Generator</Link>
          <Link href="/projects" className="hover:text-foreground">Projects</Link>
          <a
            href="https://a3brands.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            a3brands.com ↗
          </a>
        </div>
      </div>
    </footer>
  );
}

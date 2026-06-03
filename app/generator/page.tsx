"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { InputPanel } from "@/components/generator/InputPanel";
import { CarouselPreview } from "@/components/generator/CarouselPreview";
import { ExportBar } from "@/components/generator/ExportBar";
import { generateSlides } from "@/lib/generator";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { getBrand } from "@/lib/brands";
import { findTemplateById } from "@/lib/layout-templates";
import { generateWeekSeries } from "@/lib/series";
import { ShortcutCheatsheet } from "@/components/generator/ShortcutCheatsheet";
import { OnboardingTour } from "@/components/generator/OnboardingTour";
import { DownloadMenu } from "@/components/generator/DownloadMenu";
import type {
  CarouselProject,
  GeneratorInputs,
  LayoutVariant,
  Slide,
  TemplateId,
} from "@/types";
import { useHistory } from "@/hooks/use-history";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { saveProject, getProject, listProjects } from "@/lib/storage";

const DEFAULT_INPUTS: GeneratorInputs = {
  templateId: "premium-dealer",
  aspect: "ig",
  brandName: "Parks Lincoln of Longwood",
  headline: "Visit Parks Lincoln of Longwood.",
  subtitle: "51 years same corner of Seminole County.",
  body:
    "3.0L Twin-Turbo V6 engine. 383 horsepower. 7-passenger seating. 415 lb/ft torque. " +
    "51 years serving Seminole County. 2,605+ verified Google reviews at 4.8 stars. " +
    "Family-owned. Award-winning service.",
  imageUrls: [],
  ctaText: "Visit Parks Lincoln of Longwood.",
  phone: "(407) 268-5050",
  hours: "M-F 7 AM-6 PM · Sat 8 AM-4 PM",
  website: "www.parkslincoln.com",
  address: "3505 N. U.S. 17-92, Longwood, FL 32750",
};

function GeneratorInner() {
  const router = useRouter();
  const search = useSearchParams();
  const projectId = search.get("project");
  const templateParam = search.get("template") as TemplateId | null;
  const layoutParam = search.get("layout") as LayoutVariant | null;
  const brandParam = search.get("brand");
  const presetParam = search.get("preset");
  // When a layout-template card was clicked, every Regenerate keeps that
  // layout pinned so the deck stays consistent with the picked photo.
  const [pinnedLayout, setPinnedLayout] = useState<LayoutVariant | null>(
    layoutParam ?? null
  );

  const [inputs, setInputs] = useState<GeneratorInputs>(() => {
    // If the user clicked a brand template card, seed inputs with that
    // brand's defaults (dealership name, contact, sample copy) so the
    // generated deck reflects the brand immediately.
    const brand = getBrand(brandParam);
    const preset = findTemplateById(presetParam ?? "");
    const base: GeneratorInputs = {
      ...DEFAULT_INPUTS,
      templateId: templateParam ?? DEFAULT_INPUTS.templateId,
    };
    const withBrand = brand
      ? {
          ...base,
          brandName: brand.defaults.brandName,
          headline: brand.defaults.headline,
          subtitle: brand.defaults.subtitle,
          body: brand.defaults.body,
          phone: brand.defaults.phone,
          hours: brand.defaults.hours,
          website: brand.defaults.website,
          address: brand.defaults.address,
          ctaText: brand.defaults.ctaText,
        }
      : base;
    if (!preset?.preset) return withBrand;
    // Template preset overrides the brand defaults with the EXACT text shown
    // in the reference photo for this specific template card.
    const p = preset.preset;
    return {
      ...withBrand,
      headline: p.headline ?? withBrand.headline,
      subtitle: p.subtitle ?? withBrand.subtitle,
      body: p.body ?? withBrand.body,
      ctaText: p.ctaText ?? withBrand.ctaText,
      bullets: p.bullets ?? withBrand.bullets,
      presetStats: p.stats,
    };
  });
  const [palette, setPalette] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const projectIdRef = useRef<string>(projectId ?? nanoid(10));

  const history = useHistory<Slide[]>([]);

  // Hydrate from a saved project, if requested
  useEffect(() => {
    if (!projectId) return;
    const p = getProject(projectId);
    if (!p) {
      toast.error("Project not found.");
      return;
    }
    projectIdRef.current = p.id;
    setInputs({
      templateId: p.templateId,
      aspect: p.aspect,
      brandName: p.brandName ?? "",
      brandLogoUrl: p.brandLogoUrl,
      headline: p.headline,
      subtitle: p.subtitle,
      body: p.body,
      imageUrls: p.imageUrls,
      ctaText: undefined,
    });
    history.replace(p.slides);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const template = useMemo(() => getTemplate(inputs.templateId), [inputs.templateId]);

  const generate = useCallback(() => {
    setLoading(true);
    // Tiny artificial delay so the loading animation feels intentional.
    setTimeout(() => {
      try {
        // Let the generator pick a slide count (5–7) per click so every
        // Regenerate produces a structurally different deck. When the user
        // arrived via a layout-template card, pin that layout.
        const slides = generateSlides(inputs, {
          pinnedLayout: pinnedLayout ?? undefined,
        });
        history.replace(slides);
        setActiveIndex(0);
        toast.success(`Generated ${slides.length} slides.`);
      } catch (err) {
        console.error(err);
        toast.error("Generation failed.");
      } finally {
        setLoading(false);
      }
    }, 700);
  }, [inputs, history, pinnedLayout]);

  // Auto-generate first time if there's nothing.
  useEffect(() => {
    if (history.state.length === 0 && !projectId) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The "Generate" button in the global nav fires this event when the user
  // is already on /generator (instead of re-navigating to no effect).
  useEffect(() => {
    const onRegen = () => generate();
    window.addEventListener("app:regenerate", onRegen);
    return () => window.removeEventListener("app:regenerate", onRegen);
  }, [generate]);

  // The nav's Download button fires this event — we open the download
  // popover here (which has access to slideRefs + the active slide).
  const [downloadOpen, setDownloadOpen] = useState(false);
  useEffect(() => {
    const onDl = () => setDownloadOpen((v) => !v);
    window.addEventListener("app:download", onDl);
    return () => window.removeEventListener("app:download", onDl);
  }, []);

  // NOTE: previously this effect auto-distributed every uploaded image
  // across all slides (cycling pool[i % pool.length]) which clobbered any
  // user-locked per-slide image and surprised users. Removed by feedback:
  // uploaded images now sit in the project pool only — the user explicitly
  // assigns them per slide via the Background popover ("Or pick from project
  // images" grid) or the filmstrip thumbnail's image button.
  //
  // The initial generation in generateSlides() still pulls from inputs.imageUrls
  // when building cover/cta/image-aware mid slides, so a fresh Generate after
  // upload still shows photos. Subsequent uploads don't overwrite anything.

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  // Once we've shown the "saved without images" warning, don't show it again
  // every 8s on auto-save — annoying. Reset only when a fresh save succeeds.
  const quotaWarnedRef = useRef(false);

  // Internal save. Returns { project, result } so callers can decide how to
  // present any quota warning that came back from storage.
  const saveSilent = useCallback(() => {
    const project: CarouselProject = {
      id: projectIdRef.current,
      name: inputs.headline.slice(0, 60) || "Untitled carousel",
      templateId: inputs.templateId,
      aspect: inputs.aspect,
      brandName: inputs.brandName,
      brandLogoUrl: inputs.brandLogoUrl,
      headline: inputs.headline,
      subtitle: inputs.subtitle,
      body: inputs.body,
      imageUrls: inputs.imageUrls,
      slides: history.state,
      createdAt: getProject(projectIdRef.current)?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    const result = saveProject(project);
    setLastSavedAt(Date.now());
    if (result.ok) {
      quotaWarnedRef.current = false;
    }
    return { project, result };
  }, [inputs, history.state]);

  const onSave = useCallback(() => {
    const { project, result } = saveSilent();
    router.replace(`/generator?project=${project.id}`);
    if (result.ok) {
      toast.success("Project saved.");
    } else {
      toast.warning(result.warning);
    }
  }, [saveSilent, router]);

  // Auto-save every 8s while there's something to save. Silent — no toast on
  // success — but we surface a one-time warning if storage quota forced us
  // to drop image data URLs from the saved snapshot.
  useEffect(() => {
    if (history.state.length === 0) return;
    const t = setInterval(() => {
      const { result } = saveSilent();
      if (!result.ok && !quotaWarnedRef.current) {
        quotaWarnedRef.current = true;
        toast.warning(result.warning, { duration: 6000 });
      }
    }, 8000);
    return () => clearInterval(t);
  }, [saveSilent, history.state.length]);

  useKeyboardShortcuts({
    "mod+s": () => onSave(),
    "mod+z": () => history.undo(),
    "mod+shift+z": () => history.redo(),
    r: () => generate(),
    arrowleft: () => setActiveIndex((i) => Math.max(0, i - 1)),
    arrowright: () =>
      setActiveIndex((i) => Math.min(history.state.length - 1, i + 1)),
  });

  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-4 pb-10 pt-2 lg:grid-cols-[380px_1fr]">
      <motion.aside
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="glass sticky top-20 h-[calc(100dvh-110px)] overflow-hidden rounded-2xl border"
      >
        <InputPanel
          inputs={inputs}
          onChange={setInputs}
          onGenerate={generate}
          loading={loading}
          palette={palette}
          onPaletteChange={setPalette}
          seriesLoading={seriesLoading}
          onGenerateSeries={() => {
            setSeriesLoading(true);
            // Run in the next tick so the spinner can paint.
            setTimeout(() => {
              try {
                const brandKey = brandParam || "parks-lincoln";
                const result = generateWeekSeries(inputs, brandKey);
                toast.success(
                  `Created ${result.count} themed posts. Opening Projects…`
                );
                router.push("/projects");
              } catch (err) {
                console.error(err);
                toast.error("Series generation failed.");
              } finally {
                setSeriesLoading(false);
              }
            }, 120);
          }}
        />
      </motion.aside>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="glass flex h-[calc(100dvh-110px)] flex-col overflow-hidden rounded-2xl border"
      >
        <CarouselPreview
          slides={history.state}
          template={template}
          aspect={inputs.aspect}
          onSlidesChange={history.set}
          onRegenerate={generate}
          loading={loading}
          slideRefs={slideRefs}
          brandName={inputs.brandName}
          projectImages={inputs.imageUrls}
          onAddProjectImage={(url) =>
            setInputs((prev) => ({
              ...prev,
              imageUrls: prev.imageUrls.includes(url)
                ? prev.imageUrls
                : [...prev.imageUrls, url].slice(0, 16),
            }))
          }
          onActiveChange={setActiveIndex}
        />
        <ExportBar
          slideRefs={slideRefs}
          aspect={inputs.aspect}
          baseName={(inputs.brandName || "carousel").toLowerCase().replace(/\s+/g, "-")}
          onSave={onSave}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          activeIndex={activeIndex}
          lastSavedAt={lastSavedAt}
          slides={history.state}
          onSlidesChange={history.set}
          inputs={inputs}
          projectId={projectIdRef.current}
          onTemplateImport={(data) => {
            // Hydrate inputs (partial) and replace slide state with the
            // imported template. Brand defaults survive a missing field.
            setInputs((prev) => ({
              ...prev,
              ...(data.inputs as GeneratorInputs),
            }));
            history.replace(data.slides);
            setActiveIndex(0);
          }}
          captionInput={{
            headline: inputs.headline,
            subtitle: inputs.subtitle,
            body: inputs.body,
            brandName: inputs.brandName,
            templateName: template.name,
          }}
        />
      </motion.section>

      {/* Global overlays — keyboard cheatsheet (? key) + first-run tour */}
      <ShortcutCheatsheet />
      <OnboardingTour />

      {/* Download popover anchored to top-right of viewport. Opened by the
          global nav's Download button via the "app:download" custom event. */}
      <DownloadMenu
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        slides={history.state}
        slideRefs={slideRefs}
        aspect={inputs.aspect}
        activeIndex={activeIndex}
        brandName={inputs.brandName}
      />
    </div>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-muted-foreground">Loading…</div>}>
      <GeneratorInner />
    </Suspense>
  );
}

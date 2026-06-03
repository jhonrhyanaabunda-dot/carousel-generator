"use client";

import { useRef } from "react";
import { FileDown, FileUp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/utils";
import { saveProject } from "@/lib/storage";
import { nanoid } from "nanoid";
import type { CarouselProject, GeneratorInputs, Slide } from "@/types";

export interface TemplateExchangeProps {
  inputs: GeneratorInputs;
  slides: Slide[];
  projectId: string;
  // Called when an imported template successfully loads. Parent should
  // hydrate its own inputs + slide state from these.
  onImport: (data: {
    inputs: Partial<GeneratorInputs>;
    slides: Slide[];
    name?: string;
  }) => void;
}

// File format for downloaded templates. Carries a marker so we can verify
// what we're importing wasn't some random JSON.
const FILE_MARKER = "a3-carousel-template";
const FILE_VERSION = 1;

interface TemplateFile {
  marker: typeof FILE_MARKER;
  version: number;
  exportedAt: number;
  name: string;
  inputs: GeneratorInputs;
  slides: Slide[];
}

export function TemplateExchange({
  inputs,
  slides,
  projectId,
  onImport,
}: TemplateExchangeProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    if (slides.length === 0) {
      toast.error("Generate a deck first.");
      return;
    }
    const data: TemplateFile = {
      marker: FILE_MARKER,
      version: FILE_VERSION,
      exportedAt: Date.now(),
      name: inputs.headline.slice(0, 60) || "Untitled template",
      inputs,
      slides,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const filename =
      (inputs.brandName || "carousel")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") + "-template.json";
    downloadBlob(blob, filename);
    toast.success("Template downloaded.");
  };

  const handleImport = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text) as Partial<TemplateFile>;
      if (data.marker !== FILE_MARKER || !data.slides || !data.inputs) {
        toast.error("Not a valid A3 Carousel template file.");
        return;
      }
      // Save into projects so it appears in /projects and can be re-opened.
      const id = nanoid(10);
      const project: CarouselProject = {
        id,
        name: data.name || "Imported template",
        templateId: data.inputs.templateId!,
        aspect: data.inputs.aspect!,
        brandName: data.inputs.brandName,
        brandLogoUrl: data.inputs.brandLogoUrl,
        headline: data.inputs.headline ?? "",
        subtitle: data.inputs.subtitle ?? "",
        body: data.inputs.body ?? "",
        imageUrls: data.inputs.imageUrls ?? [],
        slides: data.slides,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveProject(project);
      onImport({
        inputs: data.inputs,
        slides: data.slides,
        name: data.name,
      });
      toast.success(`Imported "${data.name ?? "template"}"`);
    } catch {
      toast.error("Couldn't read template file.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5">
          <FileDown className="h-3.5 w-3.5" />
          Template
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Template file
        </p>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Download the current carousel (layout, text, styles, brand,
          images) as a single JSON file you can re-import later or share
          with a teammate.
        </p>
        <div className="space-y-2">
          <Button
            size="sm"
            variant="default"
            className="w-full gap-1.5"
            onClick={handleDownload}
          >
            <FileDown className="h-3.5 w-3.5" />
            Download template (.json)
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="h-3.5 w-3.5" />
            Import template (.json)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

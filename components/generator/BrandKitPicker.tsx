"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus, Save, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type BrandKit,
  deleteBrandKit,
  getAllBrandKits,
  getStarterKits,
  listUserBrandKits,
  saveBrandKit,
} from "@/lib/brand-kits";
import type { GeneratorInputs } from "@/types";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

export interface BrandKitPickerProps {
  inputs: GeneratorInputs;
  onLoad: (kit: BrandKit) => void;
}

export function BrandKitPicker({ inputs, onLoad }: BrandKitPickerProps) {
  // Local rev counter forces a re-read when we save/delete kits.
  const [rev, setRev] = useState(0);
  const [active, setActive] = useState<string>("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState(inputs.brandName || "");

  // Recompute every render to reflect localStorage changes after save/delete.
  const starter = useMemo(() => getStarterKits(), []);
  const user = useMemo(() => listUserBrandKits(), [rev]);

  useEffect(() => {
    setSaveName(inputs.brandName || "");
  }, [inputs.brandName]);

  const all = useMemo(() => getAllBrandKits(), [rev]);
  const handleSelect = (id: string) => {
    setActive(id);
    const kit = all.find((k) => k.id === id);
    if (kit) {
      onLoad(kit);
      toast.success(`Loaded ${kit.name}`);
    }
  };

  const handleSaveCurrent = () => {
    if (!saveName.trim()) {
      toast.error("Give the kit a name first.");
      return;
    }
    const id = `user-${nanoid(6)}`;
    const kit: BrandKit = {
      id,
      name: saveName.trim(),
      brandName: inputs.brandName,
      brandLogoUrl: inputs.brandLogoUrl,
      phone: inputs.phone,
      hours: inputs.hours,
      website: inputs.website,
      address: inputs.address,
      ctaText: inputs.ctaText,
    };
    saveBrandKit(kit);
    setRev((r) => r + 1);
    setActive(id);
    setSaveOpen(false);
    toast.success(`Saved “${kit.name}” as a brand kit.`);
  };

  const handleDelete = (id: string) => {
    deleteBrandKit(id);
    setRev((r) => r + 1);
    if (active === id) setActive("");
    toast.success("Brand kit deleted.");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Brand kit
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">
              Manage
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Your saved kits
            </p>
            {user.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No saved kits yet. Save the current one →
              </div>
            ) : (
              <div className="max-h-60 space-y-1 overflow-auto pr-1">
                {user.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{k.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {k.phone || k.address || k.website || "—"}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(k.id)}
                      title="Delete kit"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Built-in starter kits
            </p>
            <div className="space-y-1">
              {starter.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1 truncate">{k.name}</div>
                  <Star className="h-3 w-3 shrink-0 text-primary" />
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-1.5">
        <Select value={active} onValueChange={handleSelect}>
          <SelectTrigger className="h-10 flex-1">
            <SelectValue
              placeholder={
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Load brand kit…
                </span>
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Starter
              </div>
              {starter.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  <span className="inline-flex items-center gap-2">
                    <Star className="h-3 w-3 text-primary" />
                    {k.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
            {user.length > 0 && (
              <SelectGroup>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Your kits
                </div>
                {user.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

        <Popover open={saveOpen} onOpenChange={setSaveOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              title="Save current dealership info as a new brand kit"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Save current as new kit
            </p>
            <Input
              placeholder="e.g. Sheffield Subaru"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveCurrent();
                }
              }}
            />
            <p className="mt-2 text-[10px] text-muted-foreground">
              Captures the current dealership name, logo, phone, hours,
              website, address, and CTA so you can load them in one click
              next time.
            </p>
            <Button
              size="sm"
              className={cn("mt-3 w-full gap-1.5")}
              onClick={handleSaveCurrent}
            >
              <Plus className="h-3.5 w-3.5" />
              Save kit
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

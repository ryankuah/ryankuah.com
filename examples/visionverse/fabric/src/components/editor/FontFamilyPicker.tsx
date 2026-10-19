"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  LoaderCircle,
  Search,
  Type,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  GOOGLE_FONT_CATALOG,
  ensureFontFamilyLoaded,
  getFontFamilyStack,
  getPrimaryFontFamily,
} from "@/lib/fontRegistry";
import { cn } from "@/lib/utils";

type FontFamilyPickerProps = {
  value?: string;
  sceneFontFamilies: string[];
  onChange: (fontFamily: string) => Promise<boolean>;
};

type FontState = "idle" | "loading" | "loaded" | "missing";

function catalogFamily(entry: (typeof GOOGLE_FONT_CATALOG)[number]): string {
  return typeof entry === "string" ? entry : entry.family;
}

function uniqueFamilies(families: string[]) {
  const seen = new Set<string>();
  return families.filter((family) => {
    const key = family.toLocaleLowerCase();
    if (!family || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function FontFamilyPicker({
  value,
  sceneFontFamilies,
  onChange,
}: FontFamilyPickerProps) {
  const currentFamily = getPrimaryFontFamily(value) || "Inter";
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fontStates, setFontStates] = useState<Record<string, FontState>>({});
  const [pendingFamily, setPendingFamily] = useState<string | null>(null);
  const [unavailableFamily, setUnavailableFamily] = useState<string | null>(
    null,
  );
  const requestIdRef = useRef(0);

  const catalogFamilies = useMemo(
    () => GOOGLE_FONT_CATALOG.map(catalogFamily),
    [],
  );
  const catalogKeys = useMemo(
    () => new Set(catalogFamilies.map((family) => family.toLocaleLowerCase())),
    [catalogFamilies],
  );
  const projectFamilies = useMemo(
    () => uniqueFamilies([currentFamily, ...sceneFontFamilies]),
    [currentFamily, sceneFontFamilies],
  );
  const remainingFamilies = useMemo(() => {
    const projectKeys = new Set(
      projectFamilies.map((family) => family.toLocaleLowerCase()),
    );
    return catalogFamilies.filter(
      (family) => !projectKeys.has(family.toLocaleLowerCase()),
    );
  }, [catalogFamilies, projectFamilies]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingProjectFamilies = projectFamilies.filter((family) =>
    family.toLocaleLowerCase().includes(normalizedQuery),
  );
  const matchingCatalogFamilies = remainingFamilies.filter((family) =>
    family.toLocaleLowerCase().includes(normalizedQuery),
  );

  useEffect(() => {
    let cancelled = false;
    const family = currentFamily;
    setFontStates((current) => ({ ...current, [family]: "loading" }));

    void ensureFontFamilyLoaded(family)
      .then((loaded) => {
        if (cancelled) return;
        setFontStates((current) => ({
          ...current,
          [family]: loaded ? "loaded" : "missing",
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setFontStates((current) => ({ ...current, [family]: "missing" }));
      });

    return () => {
      cancelled = true;
    };
  }, [currentFamily]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    sceneFontFamilies.forEach((family) => {
      setFontStates((current) => ({ ...current, [family]: "loading" }));
      void ensureFontFamilyLoaded(family)
        .then((loaded) => {
          if (cancelled) return;
          setFontStates((current) => ({
            ...current,
            [family]: loaded ? "loaded" : "missing",
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setFontStates((current) => ({ ...current, [family]: "missing" }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, sceneFontFamilies]);

  const chooseFamily = async (family: string) => {
    if (pendingFamily) return;
    const requestId = ++requestIdRef.current;
    setPendingFamily(family);
    setUnavailableFamily(null);
    setFontStates((current) => ({ ...current, [family]: "loading" }));

    let loaded = false;
    try {
      loaded = await onChange(family);
    } catch {
      loaded = false;
    }
    if (requestId !== requestIdRef.current) return;

    setPendingFamily(null);
    setFontStates((current) => ({
      ...current,
      [family]: loaded ? "loaded" : "missing",
    }));
    if (loaded) {
      setIsOpen(false);
      setQuery("");
    } else {
      setUnavailableFamily(family);
    }
  };

  const renderOption = (family: string) => {
    const state = fontStates[family] ?? "idle";
    const selected = family === currentFamily;
    const isImported = !catalogKeys.has(family.toLocaleLowerCase());

    return (
      <button
        key={family}
        type="button"
        onClick={() => void chooseFamily(family)}
        disabled={pendingFamily !== null}
        className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
      >
        <span
          className="min-w-0 flex-1 truncate"
          style={
            state === "loaded"
              ? { fontFamily: getFontFamilyStack(family) }
              : undefined
          }
        >
          {family}
        </span>
        {isImported ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Imported
          </span>
        ) : null}
        {state === "loading" ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-slate-400" />
        ) : selected ? (
          <Check className="h-3.5 w-3.5 text-blue-600" />
        ) : state === "missing" ? (
          <span className="text-[10px] text-amber-600">Unavailable</span>
        ) : null}
      </button>
    );
  };

  const currentState = fontStates[currentFamily] ?? "idle";

  return (
    <div className="space-y-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-left text-xs text-slate-700 transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Font family"
          >
            <Type className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span
              className="min-w-0 flex-1 truncate"
              style={
                currentState === "loaded"
                  ? { fontFamily: getFontFamilyStack(currentFamily) }
                  : undefined
              }
            >
              {currentFamily}
            </span>
            {currentState === "loading" ? (
              <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="start"
          sideOffset={10}
          className="w-64 overflow-hidden p-0"
        >
          <div className="flex h-10 items-center gap-2 border-b border-slate-100 px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search fonts"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              aria-label="Search fonts"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {matchingProjectFamilies.length > 0 ? (
              <div>
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  In this quiz
                </div>
                {matchingProjectFamilies.map(renderOption)}
              </div>
            ) : null}
            {matchingCatalogFamilies.length > 0 ? (
              <div className={cn(matchingProjectFamilies.length > 0 && "mt-2")}>
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Google Fonts
                </div>
                {matchingCatalogFamilies.map(renderOption)}
              </div>
            ) : null}
            {matchingProjectFamilies.length === 0 &&
            matchingCatalogFamilies.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                No fonts match “{query}”.
              </p>
            ) : null}
          </div>
          {unavailableFamily ? (
            <p className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-700">
              {unavailableFamily} is unavailable. The current font was kept.
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
      {currentState === "missing" ? (
        <p className="px-0.5 text-[10px] leading-4 text-amber-600">
          Font unavailable — showing a fallback.
        </p>
      ) : null}
    </div>
  );
}

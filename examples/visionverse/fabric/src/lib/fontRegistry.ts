import type { FabricObjectJson } from "../../shared/fabricScene";

export type FontCategory =
  | "sans-serif"
  | "serif"
  | "display"
  | "handwriting"
  | "monospace";

export type FontCatalogEntry = {
  family: string;
  category: FontCategory;
};

// A useful offline catalog for the editor. Imported Figma families are not
// limited to this list: ensureFontFamilyLoaded also attempts any valid family
// name supplied by the plugin through the Google Fonts CSS endpoint.
export const GOOGLE_FONT_CATALOG = [
  { family: "Inter", category: "sans-serif" },
  { family: "Roboto", category: "sans-serif" },
  { family: "Open Sans", category: "sans-serif" },
  { family: "Lato", category: "sans-serif" },
  { family: "Montserrat", category: "sans-serif" },
  { family: "Poppins", category: "sans-serif" },
  { family: "Lexend", category: "sans-serif" },
  { family: "DM Sans", category: "sans-serif" },
  { family: "Manrope", category: "sans-serif" },
  { family: "Plus Jakarta Sans", category: "sans-serif" },
  { family: "Figtree", category: "sans-serif" },
  { family: "Outfit", category: "sans-serif" },
  { family: "Raleway", category: "sans-serif" },
  { family: "Nunito", category: "sans-serif" },
  { family: "Nunito Sans", category: "sans-serif" },
  { family: "Rubik", category: "sans-serif" },
  { family: "Ubuntu", category: "sans-serif" },
  { family: "Work Sans", category: "sans-serif" },
  { family: "Source Sans 3", category: "sans-serif" },
  { family: "Noto Sans", category: "sans-serif" },
  { family: "PT Sans", category: "sans-serif" },
  { family: "Karla", category: "sans-serif" },
  { family: "Cabin", category: "sans-serif" },
  { family: "Barlow", category: "sans-serif" },
  { family: "Archivo", category: "sans-serif" },
  { family: "Kanit", category: "sans-serif" },
  { family: "Hind", category: "sans-serif" },
  { family: "Mukta", category: "sans-serif" },
  { family: "Quicksand", category: "sans-serif" },
  { family: "Comfortaa", category: "sans-serif" },
  { family: "Josefin Sans", category: "sans-serif" },
  { family: "Titillium Web", category: "sans-serif" },
  { family: "Exo 2", category: "sans-serif" },
  { family: "Poetsen One", category: "display" },
  { family: "Poller One", category: "display" },
  { family: "Stint Ultra Condensed", category: "display" },
  { family: "Whisper", category: "handwriting" },
  { family: "Oswald", category: "display" },
  { family: "Bebas Neue", category: "display" },
  { family: "Anton", category: "display" },
  { family: "Archivo Black", category: "display" },
  { family: "Fjalla One", category: "display" },
  { family: "Abril Fatface", category: "display" },
  { family: "Playfair Display", category: "serif" },
  { family: "Merriweather", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "Crimson Pro", category: "serif" },
  { family: "Noto Serif", category: "serif" },
  { family: "Roboto Slab", category: "serif" },
  { family: "Bitter", category: "serif" },
  { family: "Zilla Slab", category: "serif" },
  { family: "Arvo", category: "serif" },
  { family: "Domine", category: "serif" },
  { family: "Lobster", category: "handwriting" },
  { family: "Pacifico", category: "handwriting" },
  { family: "Dancing Script", category: "handwriting" },
  { family: "Caveat", category: "handwriting" },
  { family: "Satisfy", category: "handwriting" },
  { family: "Great Vibes", category: "handwriting" },
  { family: "Permanent Marker", category: "handwriting" },
  { family: "Indie Flower", category: "handwriting" },
  { family: "Shadows Into Light", category: "handwriting" },
  { family: "Space Grotesk", category: "sans-serif" },
  { family: "Roboto Mono", category: "monospace" },
  { family: "Space Mono", category: "monospace" },
  { family: "IBM Plex Mono", category: "monospace" },
  { family: "Inconsolata", category: "monospace" },
  { family: "JetBrains Mono", category: "monospace" },
  { family: "Source Code Pro", category: "monospace" },
] as const satisfies readonly FontCatalogEntry[];

const SYSTEM_FONTS = new Set([
  "arial",
  "courier new",
  "georgia",
  "geist sans",
  "helvetica",
  "menlo",
  "monaco",
  "system-ui",
  "times new roman",
  "trebuchet ms",
  "verdana",
]);

const GENERIC_FONTS = new Set([
  "cursive",
  "fantasy",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
]);

const catalogByFamily = new Map(
  GOOGLE_FONT_CATALOG.map((entry) => [entry.family.toLocaleLowerCase(), entry]),
);
const catalogByCompactFamily = new Map(
  GOOGLE_FONT_CATALOG.map((entry) => [
    entry.family.replace(/[^a-z\d]/gi, "").toLocaleLowerCase(),
    entry,
  ]),
);
const fontLoadPromises = new Map<string, Promise<boolean>>();

export type FontFaceRequest = {
  family: string;
  weight: number;
  style: "normal" | "italic";
};

function cleanFamily(value: string) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, " ");
}

function rawPrimaryFontFamily(value?: string) {
  if (!value) return "";
  return cleanFamily(value.split(",")[0] ?? "");
}

function canonicalFontFamily(value: string) {
  const compact = value.replace(/[^a-z\d]/gi, "").toLocaleLowerCase();
  return catalogByCompactFamily.get(compact)?.family ?? value;
}

export function getPrimaryFontFamily(value?: string) {
  return canonicalFontFamily(rawPrimaryFontFamily(value));
}

function fallbackForFamily(family: string) {
  const category = catalogByFamily.get(family.toLocaleLowerCase())?.category;
  if (category === "serif") return 'Georgia, "Times New Roman", serif';
  if (category === "monospace")
    return 'Menlo, Monaco, "Courier New", monospace';
  if (category === "handwriting") return '"Comic Sans MS", cursive';
  return "Arial, Helvetica, sans-serif";
}

export function getFontFamilyStack(value?: string) {
  const family = getPrimaryFontFamily(value) || "Inter";
  if (GENERIC_FONTS.has(family.toLocaleLowerCase())) return family;
  const escaped = family.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `"${escaped}", ${fallbackForFamily(family)}`;
}

export function normalizeFontFamilyStack(value: string) {
  const rawFamily = rawPrimaryFontFamily(value);
  if (!rawFamily || canonicalFontFamily(rawFamily) === rawFamily) return value;
  return getFontFamilyStack(rawFamily);
}

function normalizeFontWeight(value: unknown) {
  if (value === "bold") return 700;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : 400;
  if (!Number.isFinite(parsed)) return 400;
  return Math.min(900, Math.max(100, Math.round(parsed / 100) * 100));
}

function normalizeFontStyle(value: unknown): "normal" | "italic" {
  return typeof value === "string" && /italic|oblique/i.test(value)
    ? "italic"
    : "normal";
}

export function googleFontStylesheetUrl(
  value: string,
  weight: number | string = 400,
  style = "normal",
) {
  const family = getPrimaryFontFamily(value);
  if (!family) return "";
  const params = new URLSearchParams({
    family,
    weight: String(normalizeFontWeight(weight)),
    style: normalizeFontStyle(style),
  });
  return `/api/fonts/google?${params.toString()}`;
}

function fontFaceKey(family: string, weight: number, style: string) {
  return `${family.toLocaleLowerCase()}|${weight}|${style}`;
}

function fontLinkId(family: string, weight: number, style: string) {
  let hash = 2166136261;
  for (const character of fontFaceKey(family, weight, style)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `vision-verse-font-${(hash >>> 0).toString(36)}`;
}

async function loadRegisteredFont(
  family: string,
  weight: number,
  style: "normal" | "italic",
) {
  if (!document.fonts?.load) return false;
  try {
    const faces = await document.fonts.load(
      `${style} ${weight} 16px "${family.replaceAll('"', '\\"')}"`,
    );
    return faces.length > 0;
  } catch {
    return false;
  }
}

export function ensureFontFaceLoaded(
  value: string,
  weight: number | string = 400,
  style = "normal",
): Promise<boolean> {
  const family = getPrimaryFontFamily(value);
  if (!family) return Promise.resolve(false);
  const normalizedWeight = normalizeFontWeight(weight);
  const normalizedStyle = normalizeFontStyle(style);
  const familyKey = family.toLocaleLowerCase();
  if (SYSTEM_FONTS.has(familyKey) || GENERIC_FONTS.has(familyKey)) {
    return Promise.resolve(true);
  }
  if (typeof document === "undefined") return Promise.resolve(false);

  const key = fontFaceKey(family, normalizedWeight, normalizedStyle);
  const existing = fontLoadPromises.get(key);
  if (existing) return existing;

  const load = (async () => {
    if (await loadRegisteredFont(family, normalizedWeight, normalizedStyle)) {
      return true;
    }

    const id = fontLinkId(family, normalizedWeight, normalizedStyle);
    const existingLink = document.getElementById(id) as HTMLLinkElement | null;
    if (existingLink) {
      return loadRegisteredFont(family, normalizedWeight, normalizedStyle);
    }

    return new Promise<boolean>((resolve) => {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = googleFontStylesheetUrl(
        family,
        normalizedWeight,
        normalizedStyle,
      );
      link.dataset.fontFamily = family;
      link.dataset.fontWeight = String(normalizedWeight);
      link.dataset.fontStyle = normalizedStyle;

      let settled = false;
      const finish = (loaded: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(loaded);
      };
      const timeout = window.setTimeout(() => finish(false), 6000);
      link.onerror = () => finish(false);
      link.onload = () => {
        void loadRegisteredFont(
          family,
          normalizedWeight,
          normalizedStyle,
        ).then(finish);
      };
      document.head.appendChild(link);
    });
  })();

  fontLoadPromises.set(key, load);
  return load;
}

export function ensureFontFamilyLoaded(value: string): Promise<boolean> {
  return ensureFontFaceLoaded(value, 400, "normal");
}

function collectFontFaces(value: unknown, faces: Map<string, FontFaceRequest>) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectFontFaces(item, faces));
    return;
  }
  if (typeof value !== "object" || value === null) return;

  const object = value as FabricObjectJson;
  if (typeof object.fontFamily === "string") {
    const family = getPrimaryFontFamily(object.fontFamily);
    if (family) {
      const weight = normalizeFontWeight(object.fontWeight);
      const style = normalizeFontStyle(object.fontStyle);
      faces.set(fontFaceKey(family, weight, style), { family, weight, style });
    }
  }
  Object.values(object).forEach((item) => collectFontFaces(item, faces));
}

export function sceneHasUnnormalizedFontFamilies(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(sceneHasUnnormalizedFontFamilies);
  }
  if (typeof value !== "object" || value === null) return false;

  const object = value as FabricObjectJson;
  if (
    typeof object.fontFamily === "string" &&
    normalizeFontFamilyStack(object.fontFamily) !== object.fontFamily
  ) {
    return true;
  }
  return Object.values(object).some(sceneHasUnnormalizedFontFamilies);
}

export function getSceneFontFamilies(value: unknown) {
  return [
    ...new Set(getSceneFontFaces(value).map((request) => request.family)),
  ];
}

export function getSceneFontFaces(value: unknown) {
  const faces = new Map<string, FontFaceRequest>();
  collectFontFaces(value, faces);
  return [...faces.values()];
}

export async function ensureSceneFontsLoaded(value: unknown) {
  return Promise.all(
    getSceneFontFaces(value).map(({ family, weight, style }) =>
      ensureFontFaceLoaded(family, weight, style),
    ),
  );
}

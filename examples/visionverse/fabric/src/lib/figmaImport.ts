import {
  DEFAULT_ARTBOARD,
  DEFAULT_WORKSPACE,
  FABRIC_CUSTOM_PROPERTIES,
  FABRIC_SCENE_SCHEMA_VERSION,
  type FabricObjectJson,
  type FabricQuizScene,
  type FabricSceneBackground,
} from "../../shared/fabricScene";
import type { FabricObject as FabricObjectInstance } from "fabric";
import { getFontFamilyStack } from "./fontRegistry";

type UnknownRecord = Record<string, unknown>;

type FigmaFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

type FigmaTransform = {
  matrix: [number, number, number, number, number, number];
  width: number;
  height: number;
};

type FigmaMatrix = FigmaTransform["matrix"];

type DecomposedTransform = {
  scaleX: number;
  scaleY: number;
  angle: number;
  skewX: number;
  flipY: boolean;
};

type FigmaComponent = {
  id?: string;
  name?: string;
  type: "text" | "image" | "shape" | "group";
  data?: string;
  frame: FigmaFrame;
  props?: UnknownRecord;
  action?: string;
  actionProps?: unknown;
  children?: FigmaComponent[];
};

export type FigmaPluginExport = {
  _visionVerse: true;
  version: number;
  frameId?: string;
  title?: string;
  quizGroup?: string;
  width: number;
  height: number;
  background?: {
    color?: string;
    image?: string;
    imageOpacity?: number;
  };
  components: FigmaComponent[];
  stats?: {
    imported?: number;
    images?: number;
    text?: number;
    shapes?: number;
    skipped?: number;
  };
};

export type FigmaPluginImport = {
  isBatch: boolean;
  pageName?: string;
  frames: FigmaPluginExport[];
  failures: Array<{ frameId?: string; title?: string; message?: string }>;
};

export type FigmaImportKind = "page" | "result";

export type ResolveFigmaAsset = (
  source: string,
  suggestedName: string,
) => Promise<string>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseFrame(value: unknown): FigmaFrame | null {
  if (!isRecord(value)) return null;
  const x = finiteNumber(value.x);
  const y = finiteNumber(value.y);
  const width = finiteNumber(value.width);
  const height = finiteNumber(value.height);
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return {
    x,
    y,
    width,
    height,
    rotation: finiteNumber(value.rotation),
  };
}

function parseFigmaTransform(value: unknown): FigmaTransform | null {
  if (!isRecord(value) || !Array.isArray(value.matrix)) return null;
  const matrix = value.matrix.map(finiteNumber);
  const width = finiteNumber(value.width);
  const height = finiteNumber(value.height);
  if (
    matrix.length !== 6 ||
    matrix.some((entry) => entry === undefined) ||
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return {
    matrix: matrix as FigmaTransform["matrix"],
    width,
    height,
  };
}

export function decomposeFigmaTransform(
  transform: FigmaTransform,
): DecomposedTransform {
  const [a, b, c, d] = transform.matrix;
  const scaleX = Math.max(0.0001, Math.hypot(a, b));
  const signedScaleY = (a * d - b * c) / scaleX;
  return {
    scaleX,
    scaleY: Math.max(0.0001, Math.abs(signedScaleY)),
    angle: (Math.atan2(b, a) * 180) / Math.PI,
    skewX: (Math.atan2(a * c + b * d, scaleX * scaleX) * 180) / Math.PI,
    flipY: signedScaleY < 0,
  };
}

function multiplyFigmaMatrices(left: FigmaMatrix, right: FigmaMatrix) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ] as FigmaMatrix;
}

function invertFigmaMatrix(matrix: FigmaMatrix): FigmaMatrix | null {
  const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
  if (Math.abs(determinant) < 0.000001) return null;
  const inverseDeterminant = 1 / determinant;
  const a = matrix[3] * inverseDeterminant;
  const b = -matrix[1] * inverseDeterminant;
  const c = -matrix[2] * inverseDeterminant;
  const d = matrix[0] * inverseDeterminant;
  return [
    a,
    b,
    c,
    d,
    -(a * matrix[4] + c * matrix[5]),
    -(b * matrix[4] + d * matrix[5]),
  ];
}

function frameMatrix(frame: FigmaFrame): FigmaMatrix {
  const angle = ((frame.rotation ?? 0) * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [cosine, sine, -sine, cosine, frame.x, frame.y];
}

function relativeFigmaMatrix(
  absolute: FigmaMatrix,
  parentAbsolute: FigmaMatrix,
) {
  const inverseParent = invertFigmaMatrix(parentAbsolute);
  return inverseParent
    ? multiplyFigmaMatrices(inverseParent, absolute)
    : absolute;
}

function parseComponent(value: unknown): FigmaComponent | null {
  if (!isRecord(value)) return null;
  if (
    value.type !== "text" &&
    value.type !== "image" &&
    value.type !== "shape" &&
    value.type !== "group"
  ) {
    return null;
  }

  const frame = parseFrame(value.frame);
  if (!frame) return null;

  const children = Array.isArray(value.children)
    ? value.children
        .map(parseComponent)
        .filter((child): child is FigmaComponent => child !== null)
    : undefined;

  return {
    id: stringValue(value.id),
    name: stringValue(value.name),
    type: value.type,
    data: stringValue(value.data),
    frame,
    props: isRecord(value.props) ? value.props : undefined,
    action: stringValue(value.action),
    actionProps: value.actionProps,
    children,
  };
}

function parseFigmaPluginFrame(parsed: unknown): FigmaPluginExport {
  if (!isRecord(parsed) || parsed._visionVerse !== true) {
    throw new Error("This is not a VisionVerse plugin frame export.");
  }
  const width = finiteNumber(parsed.width);
  const height = finiteNumber(parsed.height);
  if (
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("The Figma export is missing valid frame dimensions.");
  }
  if (!Array.isArray(parsed.components)) {
    throw new Error("The Figma export is missing its component data.");
  }

  const components = parsed.components
    .map(parseComponent)
    .filter((component): component is FigmaComponent => component !== null);
  if (parsed.components.length > 0 && components.length === 0) {
    throw new Error("The Figma export does not contain supported components.");
  }

  const background = isRecord(parsed.background)
    ? {
        color: stringValue(parsed.background.color),
        image: stringValue(parsed.background.image),
        imageOpacity: finiteNumber(parsed.background.imageOpacity),
      }
    : undefined;
  const stats = isRecord(parsed.stats)
    ? {
        imported: finiteNumber(parsed.stats.imported),
        images: finiteNumber(parsed.stats.images),
        text: finiteNumber(parsed.stats.text),
        shapes: finiteNumber(parsed.stats.shapes),
        skipped: finiteNumber(parsed.stats.skipped),
      }
    : undefined;

  return {
    _visionVerse: true,
    version: finiteNumber(parsed.version) ?? 1,
    frameId: stringValue(parsed.frameId),
    title: stringValue(parsed.title),
    quizGroup: stringValue(parsed.quizGroup),
    width,
    height,
    background,
    components,
    stats,
  };
}

export function parseFigmaPluginImport(value: string): FigmaPluginImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.trim());
  } catch {
    throw new Error("The pasted Figma export is not valid JSON.");
  }

  if (isRecord(parsed) && parsed._visionVerseBatch === true) {
    if (!Array.isArray(parsed.frames) || parsed.frames.length === 0) {
      throw new Error("The VisionVerse batch export does not contain frames.");
    }
    const frames = parsed.frames.map(parseFigmaPluginFrame);
    const failures = Array.isArray(parsed.failures)
      ? parsed.failures.flatMap((failure) => {
          if (!isRecord(failure)) return [];
          return [
            {
              frameId: stringValue(failure.frameId),
              title: stringValue(failure.title),
              message: stringValue(failure.message),
            },
          ];
        })
      : [];
    return {
      isBatch: true,
      pageName: stringValue(parsed.pageName),
      frames,
      failures,
    };
  }

  return {
    isBatch: false,
    frames: [parseFigmaPluginFrame(parsed)],
    failures: [],
  };
}

export function isFigmaPluginImportText(value: string) {
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("{") ||
    (!trimmed.includes('"_visionVerse"') &&
      !trimmed.includes('"_visionVerseBatch"'))
  ) {
    return false;
  }

  try {
    parseFigmaPluginImport(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function parseFigmaPluginExport(value: string): FigmaPluginExport {
  const imported = parseFigmaPluginImport(value);
  if (imported.isBatch) {
    throw new Error(
      "This export contains multiple frames. Use parseFigmaPluginImport for a batch.",
    );
  }
  return imported.frames[0]!;
}

export function inferFigmaImportKind(
  title: string | undefined,
): FigmaImportKind {
  const normalized = title?.trim() ?? "";
  if (/\b(?:loading|calculating)\b/i.test(normalized)) return "page";
  return /(?:result|outcome)|^[ap]\d+\b|\bhealth conscious(?:\s+ver\s*\d+)?\b/i.test(
    normalized,
  )
    ? "result"
    : "page";
}

function normalizeResultKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(?:final ver|results? page|results?|outcome)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function applyFigmaResultMappings(
  scene: FabricQuizScene,
  results: Array<{ id: string; title: string }>,
): FabricQuizScene {
  const normalizedResults = results.map((result) => ({
    ...result,
    key: normalizeResultKey(result.title),
  }));
  const visit = (objects: FabricObjectJson[] | undefined): FabricObjectJson[] =>
    (objects ?? []).map((object) => {
      const children = Array.isArray(object.objects)
        ? visit(object.objects)
        : object.objects;
      const actionProps = isRecord(object.vvActionProps)
        ? object.vvActionProps
        : undefined;
      const figmaResultKey = stringValue(actionProps?.figmaResultKey);
      if (object.vvAction !== "answerBox" || !figmaResultKey) {
        return children === object.objects
          ? object
          : { ...object, objects: children };
      }
      const key = normalizeResultKey(figmaResultKey);
      const matched = normalizedResults.find(
        (result) =>
          result.key === key ||
          (key.length >= 4 && result.key.includes(key)) ||
          (result.key.length >= 4 && key.includes(result.key)),
      );
      const nextActionProps = { ...actionProps };
      delete nextActionProps.resultMapping;
      if (matched) nextActionProps.resultMapping = { [matched.id]: 1 };
      return {
        ...object,
        objects: children,
        vvActionProps: nextActionProps,
      };
    });

  return {
    ...scene,
    fabric: { ...scene.fabric, objects: visit(scene.fabric.objects) },
  };
}

function objectBase(
  component: FigmaComponent,
  frame: FigmaFrame,
  geometryTransform?: FigmaTransform,
): FabricObjectJson {
  const props = component.props ?? {};
  const figmaTransform = parseFigmaTransform(props.figmaTransform);
  const decomposed = geometryTransform
    ? decomposeFigmaTransform(geometryTransform)
    : figmaTransform
      ? decomposeFigmaTransform(figmaTransform)
      : undefined;
  const effects = Array.isArray(props.effects)
    ? props.effects.filter(isRecord).map((effect) => ({ ...effect }))
    : undefined;
  const styleRanges = Array.isArray(props.textStyleRanges)
    ? props.textStyleRanges.filter(isRecord).map((range) => ({ ...range }))
    : undefined;
  return {
    version: "7.4.0",
    originX: "left",
    originY: "top",
    left: frame.x,
    top: frame.y,
    width: frame.width,
    height: frame.height,
    scaleX: decomposed?.scaleX ?? 1,
    scaleY: decomposed?.scaleY ?? 1,
    angle: decomposed?.angle ?? frame.rotation ?? 0,
    skewX: decomposed?.skewX ?? 0,
    skewY: 0,
    flipX: false,
    flipY: decomposed?.flipY ?? false,
    opacity: 1,
    visible: true,
    vvId:
      component.id ??
      `figma-${component.type}-${Math.random().toString(36).slice(2)}`,
    vvName:
      component.name ??
      stringValue(component.props?.sourceName) ??
      (component.type === "text" ? component.data : undefined),
    vvRole:
      component.action === "answerBox"
        ? "answer"
        : component.action
          ? "navigation"
          : "decorative",
    vvAction: component.action,
    vvActionProps: component.actionProps,
    vvFigmaRawText: stringValue(props.figmaRawText),
    vvFigmaTextCase: stringValue(props.figmaTextCase),
    vvFigmaTransform: figmaTransform ?? undefined,
    vvFigmaEffects: effects,
    vvFigmaTypography:
      styleRanges ||
      finiteNumber(props.paragraphIndent) !== undefined ||
      finiteNumber(props.paragraphSpacing) !== undefined ||
      finiteNumber(props.listSpacing) !== undefined
        ? {
            styleRanges,
            paragraphIndent: finiteNumber(props.paragraphIndent),
            paragraphSpacing: finiteNumber(props.paragraphSpacing),
            listSpacing: finiteNumber(props.listSpacing),
          }
        : undefined,
    vvFigmaNodeType: stringValue(props.figmaNodeType),
    vvFigmaConstraints: isRecord(props.figmaConstraints)
      ? { ...props.figmaConstraints }
      : undefined,
    vvFigmaComponent: isRecord(props.figmaComponent)
      ? { ...props.figmaComponent }
      : undefined,
    vvFigmaComponentPropertyReferences: isRecord(
      props.figmaComponentPropertyReferences,
    )
      ? { ...props.figmaComponentPropertyReferences }
      : undefined,
  };
}

type Size = {
  width: number;
  height: number;
};

function pngDataUrlSize(source: string): Size | null {
  const match = /^data:image\/png;base64,([a-z\d+/=\s]+)$/i.exec(source);
  if (!match) return null;
  const encoded = match[1];
  if (!encoded) return null;

  try {
    // A PNG's dimensions live in bytes 16-23 of the fixed IHDR header. Decode
    // only the prefix: Figma exports can otherwise be several megabytes.
    const prefix = encoded.replace(/\s/g, "").slice(0, 32);
    const bytes = globalThis.atob(prefix);
    if (
      bytes.length < 24 ||
      bytes.charCodeAt(0) !== 0x89 ||
      bytes.slice(1, 4) !== "PNG" ||
      bytes.slice(12, 16) !== "IHDR"
    ) {
      return null;
    }

    const readUint32 = (offset: number) =>
      bytes.charCodeAt(offset) * 0x1000000 +
      bytes.charCodeAt(offset + 1) * 0x10000 +
      bytes.charCodeAt(offset + 2) * 0x100 +
      bytes.charCodeAt(offset + 3);
    const width = readUint32(16);
    const height = readUint32(20);
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

function svgMarkupSize(svg: string): Size | null {
  const rootTag = /<svg\b[^>]*>/i.exec(svg)?.[0];
  if (!rootTag) return null;

  const viewBox = /\bviewBox\s*=\s*["']([^"']+)["']/i.exec(rootTag)?.[1];
  if (viewBox) {
    const values = viewBox
      .trim()
      .split(/[\s,]+/)
      .map((value) => Number.parseFloat(value));
    const width = values[2];
    const height = values[3];
    if (
      values.length >= 4 &&
      width !== undefined &&
      height !== undefined &&
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      return { width, height };
    }
  }

  const lengthAttribute = (name: "width" | "height") => {
    const raw = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(
      rootTag,
    )?.[1];
    if (!raw || raw.trim().endsWith("%")) return null;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const width = lengthAttribute("width");
  const height = lengthAttribute("height");
  return width && height ? { width, height } : null;
}

function textObject(
  component: FigmaComponent,
  frame: FigmaFrame,
  sourceScale: number,
  geometryTransform?: FigmaTransform,
): FabricObjectJson {
  const props = component.props ?? {};
  const rawFontSize =
    finiteNumber(props.figmaFontSize) ?? finiteNumber(props.fontSize) ?? 24;
  const explicitFontScale = finiteNumber(props.figmaFontScale);
  const fontSize = Math.max(
    1,
    rawFontSize * (explicitFontScale ?? sourceScale),
  );
  const letterSpacing = stringValue(props.letterSpacing);
  const emSpacing = letterSpacing?.endsWith("em")
    ? Number.parseFloat(letterSpacing.slice(0, -2))
    : Number.NaN;
  const fontScale = explicitFontScale ?? sourceScale;
  const text = component.data ?? "Text";
  const styles = figmaTextStyles(text, props.textStyleRanges, fontScale);
  const stroke = stringValue(props.strokeColor);
  const rawStrokeWidth = finiteNumber(props.strokeWidth) ?? 0;
  const strokeAlign = stringValue(props.strokeAlign)?.toLocaleLowerCase();
  const base = objectBase(component, frame, geometryTransform);
  const textAutoResize = stringValue(props.textAutoResize) ?? "NONE";
  const textTruncation = stringValue(props.textTruncation);
  const effects = Array.isArray(props.effects)
    ? props.effects.filter(isRecord)
    : [];
  const dropShadow = effects.find((effect) => effect.type === "DROP_SHADOW");
  const shadowColor = dropShadow ? stringValue(dropShadow.color) : undefined;

  // A Figma text frame's height is its layout box. Fabric Textbox.height is a
  // measured rendering value and is recalculated from wrapped lines. Passing
  // the Figma frame height through as though it were that measured value can
  // leave stale clipping bounds while the font is being resolved.
  delete base.height;

  return {
    ...base,
    type: "Textbox",
    text,
    fontSize,
    fontFamily: getFontFamilyStack(stringValue(props.fontFamily) ?? "Inter"),
    fontWeight:
      finiteNumber(props.fontWeight) ?? (props.bold === true ? 700 : 400),
    fontStyle: props.italic === true ? "italic" : "normal",
    underline: props.underline === true,
    linethrough: props.linethrough === true,
    fill: stringValue(props.color) ?? "#111827",
    stroke: stroke ?? null,
    strokeWidth:
      stroke && rawStrokeWidth > 0
        ? rawStrokeWidth * fontScale * (strokeAlign === "outside" ? 2 : 1)
        : 0,
    paintFirst: "stroke",
    strokeUniform: true,
    textDecorationColor:
      stringValue(props.textDecorationColor) ?? stringValue(props.color),
    textDecorationThickness:
      finiteNumber(props.textDecorationThickness) ?? 66.667,
    textAlign: stringValue(props.align) ?? "left",
    lineHeight: finiteNumber(props.lineHeight) ?? 1.16,
    charSpacing: Number.isFinite(emSpacing) ? emSpacing * 1000 : 0,
    splitByGrapheme: false,
    minWidth: 20,
    styles,
    shadow:
      dropShadow && shadowColor
        ? {
            color: shadowColor,
            blur: (finiteNumber(dropShadow.radius) ?? 0) * fontScale,
            offsetX: (finiteNumber(dropShadow.offsetX) ?? 0) * fontScale,
            offsetY: (finiteNumber(dropShadow.offsetY) ?? 0) * fontScale,
            affectStroke: true,
            nonScaling: false,
          }
        : null,
    vvAutoWidth: textAutoResize === "WIDTH_AND_HEIGHT",
    // Fabric remeasures Textbox height after the real web font loads. Keep the
    // source Figma box so the editor can restore center/bottom alignment once,
    // without serializing a stale Fabric height that clips wrapped glyphs.
    vvFigmaTextFrameWidth: frame.width,
    vvFigmaTextFrameHeight: frame.height,
    vvFigmaTextAutoResize: textAutoResize,
    vvFigmaTextTruncation: textTruncation,
    vvFigmaTextMaxLines: finiteNumber(props.maxLines) ?? null,
    vvFigmaVerticalAlign: stringValue(props.verticalAlign) ?? "top",
    vvFigmaTextLayoutApplied: false,
  };
}

function figmaTextStyles(
  text: string,
  value: unknown,
  fontScale: number,
): Record<number, Record<number, UnknownRecord>> | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const ranges = value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const start = finiteNumber(item.start);
    const end = finiteNumber(item.end);
    if (start === undefined || end === undefined || start < 0 || end <= start) {
      return [];
    }

    const style: UnknownRecord = {};
    const family = stringValue(item.fontFamily);
    const fontSize = finiteNumber(item.fontSize);
    const fontWeight = finiteNumber(item.fontWeight);
    const fontStyleName = stringValue(item.fontStyleName);
    const fill = stringValue(item.color);
    const letterSpacing = stringValue(item.letterSpacing);
    const emSpacing = letterSpacing?.endsWith("em")
      ? Number.parseFloat(letterSpacing.slice(0, -2))
      : Number.NaN;
    if (family) style.fontFamily = getFontFamilyStack(family);
    if (fontSize !== undefined)
      style.fontSize = Math.max(1, fontSize * fontScale);
    if (fontWeight !== undefined) style.fontWeight = fontWeight;
    if (typeof item.italic === "boolean" || fontStyleName) {
      style.fontStyle =
        item.italic === true || /italic/i.test(fontStyleName ?? "")
          ? "italic"
          : "normal";
    }
    if (typeof item.underline === "boolean") style.underline = item.underline;
    if (typeof item.linethrough === "boolean") {
      style.linethrough = item.linethrough;
    }
    if (Number.isFinite(emSpacing)) style.charSpacing = emSpacing * 1000;
    const decorationColor = stringValue(item.textDecorationColor);
    const decorationThickness = finiteNumber(item.textDecorationThickness);
    if (decorationColor) style.textDecorationColor = decorationColor;
    if (decorationThickness !== undefined) {
      style.textDecorationThickness = decorationThickness;
    }
    if (fill) style.fill = fill;
    return [{ start, end, style }];
  });
  if (ranges.length === 0) return undefined;

  const styles: Record<number, Record<number, UnknownRecord>> = {};
  let utf16Offset = 0;
  let lineIndex = 0;
  let characterIndex = 0;
  for (const character of Array.from(text)) {
    const nextOffset = utf16Offset + character.length;
    if (character === "\n") {
      lineIndex += 1;
      characterIndex = 0;
      utf16Offset = nextOffset;
      continue;
    }

    const range = ranges.find(
      (candidate) =>
        candidate.start < nextOffset && candidate.end > utf16Offset,
    );
    if (range && Object.keys(range.style).length > 0) {
      const lineStyles = styles[lineIndex] ?? {};
      lineStyles[characterIndex] = { ...range.style };
      styles[lineIndex] = lineStyles;
    }
    characterIndex += 1;
    utf16Offset = nextOffset;
  }

  return Object.keys(styles).length > 0 ? styles : undefined;
}

async function imageObject(
  component: FigmaComponent,
  frame: FigmaFrame,
  source: string,
  resolveAsset: ResolveFigmaAsset,
  suffix: string,
  naturalSizeOverride?: Size | null,
  geometryTransform?: FigmaTransform,
): Promise<FabricObjectJson> {
  const naturalSize = naturalSizeOverride ?? pngDataUrlSize(source);
  const url = await resolveAsset(source, `figma-${component.type}-${suffix}`);
  const base = objectBase(component, frame, geometryTransform);
  const transformScaleX = finiteNumber(base.scaleX) ?? 1;
  const transformScaleY = finiteNumber(base.scaleY) ?? 1;
  return {
    ...base,
    type: "Image",
    src: url,
    // Fabric Image.width/height address pixels in the source bitmap; they are
    // not display-frame dimensions. Figma's selected-frame export is normally
    // a 2x PNG, so using the display frame here draws only its top-left quarter.
    // Keep the intended frame on screen by moving that sizing into scaleX/Y.
    width: naturalSize?.width ?? frame.width,
    height: naturalSize?.height ?? frame.height,
    scaleX:
      (naturalSize ? frame.width / naturalSize.width : 1) * transformScaleX,
    scaleY:
      (naturalSize ? frame.height / naturalSize.height : 1) * transformScaleY,
    crossOrigin: "anonymous",
    filters: [],
  };
}

export function getPersistedFigmaImageSizeRepair(
  object: FabricObjectJson,
  naturalSize: Size,
  artboard?: { x: number; y: number; width: number; height: number },
): Pick<
  FabricObjectJson,
  "left" | "top" | "width" | "height" | "scaleX" | "scaleY" | "angle"
> | null {
  if (
    (object.type !== "Image" && object.type !== "image") ||
    typeof object.vvId !== "string" ||
    (!object.vvId.startsWith("figma-plugin-") &&
      object.vvId !== "figma-background") ||
    (finiteNumber(object.cropX) !== undefined &&
      finiteNumber(object.cropX) !== 0) ||
    (finiteNumber(object.cropY) !== undefined &&
      finiteNumber(object.cropY) !== 0)
  ) {
    return null;
  }

  const width = finiteNumber(object.width);
  const height = finiteNumber(object.height);
  if (
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0 ||
    naturalSize.width <= 0 ||
    naturalSize.height <= 0
  ) {
    return null;
  }

  const scaleX = finiteNumber(object.scaleX) ?? 1;
  const scaleY = finiteNumber(object.scaleY) ?? 1;
  if (artboard) {
    const left = finiteNumber(object.left) ?? 0;
    const top = finiteNumber(object.top) ?? 0;
    const renderedWidth = width * Math.abs(scaleX);
    const renderedHeight = height * Math.abs(scaleY);
    const visibleLeft = Math.max(left, artboard.x);
    const visibleTop = Math.max(top, artboard.y);
    const visibleRight = Math.min(
      left + renderedWidth,
      artboard.x + artboard.width,
    );
    const visibleBottom = Math.min(
      top + renderedHeight,
      artboard.y + artboard.height,
    );
    const visibleWidth = visibleRight - visibleLeft;
    const visibleHeight = visibleBottom - visibleTop;
    const overflowsArtboard =
      visibleWidth > 0 &&
      visibleHeight > 0 &&
      (visibleWidth < renderedWidth - 1 || visibleHeight < renderedHeight - 1);
    const visibleScaleX = visibleWidth / naturalSize.width;
    const visibleScaleY = visibleHeight / naturalSize.height;
    const bitmapMatchesVisibleClip =
      visibleScaleX > 0 &&
      visibleScaleY > 0 &&
      Math.abs(visibleScaleX - visibleScaleY) <=
        Math.max(visibleScaleX, visibleScaleY) * 0.02;
    const differsFromFlattenedFrame =
      Math.abs(scaleX - visibleScaleX) > 0.02 ||
      Math.abs(scaleY - visibleScaleY) > 0.02 ||
      Math.abs(finiteNumber(object.angle) ?? 0) > 0.02;

    // Older batch exports could contain a PNG already flattened through the
    // Figma frame's clipping bounds while retaining the original oversized
    // child geometry. The bitmap then got scaled/rotated a second time in
    // Fabric, cutting off its right and bottom edges. The narrow signature is
    // an overflowing object whose visible intersection matches the bitmap's
    // aspect ratio, because exportAsync already reduced the PNG to that area.
    if (
      overflowsArtboard &&
      bitmapMatchesVisibleClip &&
      differsFromFlattenedFrame
    ) {
      return {
        left: visibleLeft,
        top: visibleTop,
        width: naturalSize.width,
        height: naturalSize.height,
        scaleX: visibleScaleX,
        scaleY: visibleScaleY,
        angle: 0,
      };
    }
  }

  const widthRatio = naturalSize.width / width;
  const heightRatio = naturalSize.height / height;
  const sourceRatioMatches =
    Math.abs(widthRatio - heightRatio) <=
    Math.max(widthRatio, heightRatio) * 0.02;
  const storedAtUnitScale =
    Math.abs(Math.abs(scaleX) - 1) <= 0.02 &&
    Math.abs(Math.abs(scaleY) - 1) <= 0.02;

  // Older SVG-backed shapes stored the intended display-frame dimensions as
  // Fabric Image.width/height. Fabric interprets those fields as a source crop,
  // so any source SVG larger than the frame lost its right and bottom edges.
  // The old objects have a narrow signature: unit scale, an uncropped source,
  // and matching width/height ratios. Move the resize into scale instead.
  if (
    storedAtUnitScale &&
    sourceRatioMatches &&
    widthRatio > 1.01 &&
    heightRatio > 1.01
  ) {
    return {
      width: naturalSize.width,
      height: naturalSize.height,
      scaleX: scaleX / widthRatio,
      scaleY: scaleY / heightRatio,
    };
  }

  // The affected plugin path exported selected images at exactly 2x. Keeping
  // this repair deliberately narrow avoids mistaking an intentional crop or a
  // normal 1x/batch export for the historical serialization bug.
  if (Math.abs(widthRatio - 2) > 0.02 || Math.abs(heightRatio - 2) > 0.02) {
    return null;
  }

  return {
    width: naturalSize.width,
    height: naturalSize.height,
    scaleX: scaleX / widthRatio,
    scaleY: scaleY / heightRatio,
  };
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function applyFabricMetadata(
  object: Record<string, unknown>,
  component: FigmaComponent,
  frame: FigmaFrame,
  geometryTransform?: FigmaTransform,
) {
  const base = objectBase(component, frame, geometryTransform);
  for (const property of FABRIC_CUSTOM_PROPERTIES) {
    if (base[property] !== undefined) object[property] = base[property];
  }
  object.originX = "left";
  object.originY = "top";
  object.opacity = 1;
  object.visible = true;
}

async function editableSvgObject(
  component: FigmaComponent,
  frame: FigmaFrame,
  svg: string,
  geometryTransform?: FigmaTransform,
): Promise<FabricObjectJson | null> {
  const fabric = await import("fabric");
  const parsed = await fabric.loadSVGFromString(svg);
  const objects = parsed.objects.filter(
    (object): object is NonNullable<typeof object> => object !== null,
  );
  if (objects.length === 0) return null;

  const firstObject = objects[0];
  if (!firstObject) return null;
  const root =
    objects.length === 1
      ? firstObject
      : new fabric.Group(objects, {
          interactive: false,
          subTargetCheck: false,
        });
  const sourceWidth = Math.max(0.01, root.width || parsed.options.width || 1);
  const sourceHeight = Math.max(
    0.01,
    root.height || parsed.options.height || 1,
  );
  const base = objectBase(component, frame, geometryTransform);
  const transformScaleX = finiteNumber(base.scaleX) ?? 1;
  const transformScaleY = finiteNumber(base.scaleY) ?? 1;
  root.set({
    originX: "left",
    originY: "top",
    left: frame.x,
    top: frame.y,
    scaleX: (frame.width / sourceWidth) * transformScaleX,
    scaleY: (frame.height / sourceHeight) * transformScaleY,
    angle: finiteNumber(base.angle) ?? 0,
    skewX: finiteNumber(base.skewX) ?? 0,
    skewY: finiteNumber(base.skewY) ?? 0,
    flipX: base.flipX === true,
    flipY: base.flipY === true,
  });
  applyFabricMetadata(
    root as unknown as Record<string, unknown>,
    component,
    frame,
    geometryTransform,
  );

  let vectorIndex = 0;
  const tagChildren = (object: unknown) => {
    if (!object || typeof object !== "object") return;
    const candidate = object as Record<string, unknown> & {
      getObjects?: () => unknown[];
    };
    const children = candidate.getObjects?.() ?? [];
    for (const child of children) {
      vectorIndex += 1;
      const tagged = child as Record<string, unknown>;
      tagged.vvId = `${component.id ?? "figma-vector"}-${vectorIndex}`;
      tagged.vvName = `${component.name ?? "Vector"} ${vectorIndex}`;
      tagged.vvRole = "decorative";
      tagChildren(child);
    }
  };
  tagChildren(root);
  root.setCoords();
  return (
    root as unknown as {
      toObject(propertiesToInclude?: string[]): unknown;
    }
  ).toObject([...FABRIC_CUSTOM_PROPERTIES]) as FabricObjectJson;
}

async function editableGroupObject(
  component: FigmaComponent,
  frame: FigmaFrame,
  children: FabricObjectJson[],
  geometryTransform?: FigmaTransform,
): Promise<FabricObjectJson | null> {
  if (children.length === 0) return null;
  const fabric = await import("fabric");
  const enlivened = (await fabric.util.enlivenObjects(
    children,
  )) as unknown as FabricObjectInstance[];
  const layoutBounds = new fabric.Rect({
    originX: "left",
    originY: "top",
    left: 0,
    top: 0,
    width: frame.width,
    height: frame.height,
    fill: "transparent",
    stroke: null,
    strokeWidth: 0,
    selectable: false,
    evented: false,
  });
  const base = objectBase(component, frame, geometryTransform);
  const group = new fabric.Group([layoutBounds, ...enlivened], {
    originX: "left",
    originY: "top",
    left: finiteNumber(base.left) ?? frame.x,
    top: finiteNumber(base.top) ?? frame.y,
    width: frame.width,
    height: frame.height,
    scaleX: finiteNumber(base.scaleX) ?? 1,
    scaleY: finiteNumber(base.scaleY) ?? 1,
    angle: finiteNumber(base.angle) ?? 0,
    skewX: finiteNumber(base.skewX) ?? 0,
    skewY: finiteNumber(base.skewY) ?? 0,
    flipX: base.flipX === true,
    flipY: base.flipY === true,
    interactive: false,
    subTargetCheck: false,
    layoutManager: new fabric.LayoutManager(new fabric.FixedLayout()),
  });
  group.remove(layoutBounds);
  applyFabricMetadata(
    group as unknown as Record<string, unknown>,
    component,
    frame,
    geometryTransform,
  );
  group.setCoords();
  return (
    group as unknown as {
      toObject(propertiesToInclude?: string[]): unknown;
    }
  ).toObject([...FABRIC_CUSTOM_PROPERTIES]) as FabricObjectJson;
}

async function componentObjects(
  component: FigmaComponent,
  artboard: { x: number; y: number },
  sourceScale: number,
  resolveAsset: ResolveFigmaAsset,
  parentAbsoluteTransform?: FigmaMatrix,
): Promise<FabricObjectJson[]> {
  const figmaTransform = parseFigmaTransform(component.props?.figmaTransform);
  const absoluteTransform =
    figmaTransform?.matrix ??
    (parentAbsoluteTransform
      ? multiplyFigmaMatrices(
          parentAbsoluteTransform,
          frameMatrix(component.frame),
        )
      : frameMatrix(component.frame));
  const localTransform = parentAbsoluteTransform
    ? relativeFigmaMatrix(absoluteTransform, parentAbsoluteTransform)
    : absoluteTransform;
  const geometryTransform: FigmaTransform = {
    matrix: parentAbsoluteTransform
      ? localTransform
      : [
          localTransform[0],
          localTransform[1],
          localTransform[2],
          localTransform[3],
          artboard.x + localTransform[4],
          artboard.y + localTransform[5],
        ],
    width: figmaTransform?.width ?? component.frame.width,
    height: figmaTransform?.height ?? component.frame.height,
  };
  const frame: FigmaFrame = {
    x: geometryTransform.matrix[4],
    y: geometryTransform.matrix[5],
    width: geometryTransform.width,
    height: geometryTransform.height,
  };

  if (component.type === "group") {
    const children = await Promise.all(
      (component.children ?? []).map((child) =>
        componentObjects(
          child,
          artboard,
          sourceScale,
          resolveAsset,
          absoluteTransform,
        ),
      ),
    );
    const visualObjects = children.flat();
    const group = await editableGroupObject(
      component,
      frame,
      visualObjects,
      geometryTransform,
    );
    return group ? [group] : [];
  }

  if (component.type === "text") {
    return [textObject(component, frame, sourceScale, geometryTransform)];
  }
  if (component.type === "image" && component.data) {
    return [
      await imageObject(
        component,
        frame,
        component.data,
        resolveAsset,
        component.id ?? "image",
        undefined,
        geometryTransform,
      ),
    ];
  }
  if (component.type === "shape") {
    const svg = stringValue(component.props?.svgContent);
    if (svg) {
      const editable = await editableSvgObject(
        component,
        frame,
        svg,
        geometryTransform,
      );
      if (editable) return [editable];
      return [
        await imageObject(
          component,
          frame,
          svgDataUrl(svg),
          resolveAsset,
          component.id ?? "shape",
          svgMarkupSize(svg),
          geometryTransform,
        ),
      ];
    }
  }

  return [];
}

export async function figmaExportToFabricScene(
  exported: FigmaPluginExport,
  resolveAsset: ResolveFigmaAsset,
): Promise<FabricQuizScene> {
  const sourceScale = DEFAULT_ARTBOARD.width / exported.width;
  const artboardHeight = Math.max(
    DEFAULT_ARTBOARD.height,
    Math.round(exported.height * sourceScale),
  );
  const artboard = { ...DEFAULT_ARTBOARD, height: artboardHeight };
  const workspace = {
    ...DEFAULT_WORKSPACE,
    height: Math.max(
      DEFAULT_WORKSPACE.height,
      artboard.y + artboard.height + 48,
    ),
  };
  const objects: FabricObjectJson[] = [];
  const background: FabricSceneBackground = {
    color: exported.background?.color ?? "#ffffff",
  };
  if (exported.background?.image) {
    background.image = await resolveAsset(
      exported.background.image,
      "figma-background",
    );
    background.imageOpacity = Math.min(
      1,
      Math.max(0, exported.background.imageOpacity ?? 1),
    );
  }

  const converted = await Promise.all(
    exported.components.map((component) =>
      componentObjects(component, artboard, sourceScale, resolveAsset),
    ),
  );
  objects.push(...converted.flat());

  return {
    schemaVersion: FABRIC_SCENE_SCHEMA_VERSION,
    workspace,
    artboard,
    background,
    figmaSource: {
      ...(exported.frameId ? { frameId: exported.frameId } : {}),
      ...(exported.quizGroup ? { quizGroup: exported.quizGroup } : {}),
      ...(exported.title ? { title: exported.title } : {}),
    },
    fabric: {
      version: "7.4.0",
      width: workspace.width,
      height: workspace.height,
      objects,
    },
  };
}

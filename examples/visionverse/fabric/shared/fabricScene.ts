export const FABRIC_SCENE_SCHEMA_VERSION = 1;
export const MIN_RESULT_ARTBOARD_HEIGHT = 844;
export const RESULT_ARTBOARD_BOTTOM_PADDING = 48;

export const FABRIC_CUSTOM_PROPERTIES = [
  "vvId",
  "vvName",
  "vvRole",
  "vvAction",
  "vvActionProps",
  "vvAutoWidth",
  "vvFigmaRawText",
  "vvFigmaTextCase",
  "vvFigmaTextFrameWidth",
  "vvFigmaTextFrameHeight",
  "vvFigmaTextAutoResize",
  "vvFigmaTextTruncation",
  "vvFigmaTextMaxLines",
  "vvFigmaTypography",
  "vvFigmaVerticalAlign",
  "vvFigmaTextLayoutApplied",
  "vvFigmaTextLayoutOffset",
  "vvFigmaTransform",
  "vvFigmaEffects",
  "vvFigmaNodeType",
  "vvFigmaConstraints",
  "vvFigmaComponent",
  "vvFigmaComponentPropertyReferences",
] as const;

export type FabricQuizRole = "decorative" | "answer" | "navigation";
export type FabricQuizAction =
  | "nextPage"
  | "previousPage"
  | "answerBox"
  | "confirmAnswer"
  | "hyperlink"
  | "startQuiz";

export type FabricWorkspace = {
  width: number;
  height: number;
};

export type FabricArtboard = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FabricSceneBackground = {
  color?: string;
  image?: string;
  imageOpacity?: number;
};

export type FabricFigmaSource = {
  frameId?: string;
  quizGroup?: string;
  title?: string;
};

export type FabricObjectJson = Record<string, unknown> & {
  objects?: FabricObjectJson[];
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  strokeWidth?: number;
  originX?: string;
  originY?: string;
  excludeFromExport?: boolean;
  vvActionProps?: unknown;
};

export type FabricCanvasJson = Record<string, unknown> & {
  objects?: FabricObjectJson[];
  width?: number;
  height?: number;
};

export type FabricQuizScene = {
  schemaVersion: typeof FABRIC_SCENE_SCHEMA_VERSION;
  workspace: FabricWorkspace;
  artboard: FabricArtboard;
  background: FabricSceneBackground;
  figmaSource?: FabricFigmaSource;
  fabric: FabricCanvasJson;
};

export const DEFAULT_ARTBOARD: FabricArtboard = {
  x: 360,
  y: 48,
  width: 390,
  height: 844,
};

export const DEFAULT_WORKSPACE: FabricWorkspace = {
  width: 1120,
  height: 980,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function opacityValue(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}

// `legacyFabricBackground` covers scenes saved before the dedicated
// background model, where the color lived on the Fabric canvas JSON itself.
function normalizeBackground(
  value: unknown,
  legacyFabricBackground: unknown,
): FabricSceneBackground {
  const candidate = isRecord(value) ? value : undefined;
  const color =
    stringValue(candidate?.color) ??
    stringValue(legacyFabricBackground) ??
    "#ffffff";
  const image = stringValue(candidate?.image);
  const imageOpacity = opacityValue(candidate?.imageOpacity);

  return {
    color,
    ...(image ? { image } : {}),
    ...(image && imageOpacity !== undefined ? { imageOpacity } : {}),
  };
}

export function createBlankFabricQuizScene(
  overrides: Partial<Pick<FabricQuizScene, "workspace" | "artboard">> = {},
): FabricQuizScene {
  const workspace = overrides.workspace ?? DEFAULT_WORKSPACE;
  const artboard = overrides.artboard ?? DEFAULT_ARTBOARD;

  return {
    schemaVersion: FABRIC_SCENE_SCHEMA_VERSION,
    workspace,
    artboard,
    background: { color: "#ffffff" },
    fabric: {
      version: "7.4.0",
      width: workspace.width,
      height: workspace.height,
      objects: [],
    },
  };
}

export function normalizeFabricQuizScene(
  value: unknown,
  overrides: Partial<Pick<FabricQuizScene, "workspace" | "artboard">> = {},
): FabricQuizScene {
  if (!isRecord(value)) {
    return createBlankFabricQuizScene(overrides);
  }

  const workspaceCandidate = isRecord(value.workspace)
    ? value.workspace
    : undefined;
  const artboardCandidate = isRecord(value.artboard)
    ? value.artboard
    : undefined;
  const workspace = overrides.workspace ?? {
    width: finiteNumber(workspaceCandidate?.width, DEFAULT_WORKSPACE.width),
    height: finiteNumber(workspaceCandidate?.height, DEFAULT_WORKSPACE.height),
  };
  const artboard = overrides.artboard ?? {
    x: finiteNumber(artboardCandidate?.x, DEFAULT_ARTBOARD.x),
    y: finiteNumber(artboardCandidate?.y, DEFAULT_ARTBOARD.y),
    width: finiteNumber(artboardCandidate?.width, DEFAULT_ARTBOARD.width),
    height: finiteNumber(artboardCandidate?.height, DEFAULT_ARTBOARD.height),
  };
  const fabric = isRecord(value.fabric)
    ? (cloneValue(value.fabric) as FabricCanvasJson)
    : createBlankFabricQuizScene({ workspace, artboard }).fabric;
  const objects = Array.isArray(fabric.objects) ? fabric.objects : [];
  const background = normalizeBackground(value.background, fabric.background);
  const figmaSourceCandidate = isRecord(value.figmaSource)
    ? value.figmaSource
    : undefined;
  const frameId = stringValue(figmaSourceCandidate?.frameId);
  const quizGroup = stringValue(figmaSourceCandidate?.quizGroup);
  const title = stringValue(figmaSourceCandidate?.title);
  const figmaSource =
    frameId || quizGroup || title
      ? {
          ...(frameId ? { frameId } : {}),
          ...(quizGroup ? { quizGroup } : {}),
          ...(title ? { title } : {}),
        }
      : undefined;
  delete fabric.background;

  return {
    schemaVersion: FABRIC_SCENE_SCHEMA_VERSION,
    workspace,
    artboard,
    background,
    ...(figmaSource ? { figmaSource } : {}),
    fabric: {
      ...fabric,
      width: finiteNumber(fabric.width, workspace.width),
      height: finiteNumber(fabric.height, workspace.height),
      objects,
    },
  };
}

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

// Fraction of the object's size that sits before the point `left`/`top` addresses.
// Fabric's `left`/`top` name whichever point `originX`/`originY` designate, not
// necessarily the top-left corner (Fabric 6+ defaults new objects to "center").
function originLeadingFraction(origin: unknown): number {
  if (origin === "center") return 0.5;
  if (origin === "right" || origin === "bottom") return 1;
  return 0; // "left" / "top" / unset
}

function objectBounds(object: FabricObjectJson): Rect {
  const width = Math.max(0, finiteNumber(object.width, 0));
  const height = Math.max(0, finiteNumber(object.height, 0));
  const scaleX = finiteNumber(object.scaleX, 1);
  const scaleY = finiteNumber(object.scaleY, 1);
  const scaledWidth = width * scaleX;
  const scaledHeight = height * scaleY;
  const angle = finiteNumber(object.angle, 0);
  const anchorX = finiteNumber(object.left, 0);
  const anchorY = finiteNumber(object.top, 0);
  const originX = originLeadingFraction(object.originX);
  const originY = originLeadingFraction(object.originY);
  const localLeft = -scaledWidth * originX;
  const localTop = -scaledHeight * originY;
  const localRight = scaledWidth * (1 - originX);
  const localBottom = scaledHeight * (1 - originY);
  const radians = (angle * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const corners = [
    { x: localLeft, y: localTop },
    { x: localRight, y: localTop },
    { x: localRight, y: localBottom },
    { x: localLeft, y: localBottom },
  ].map(({ x, y }) => ({
    x: anchorX + x * cos - y * sin,
    y: anchorY + x * sin + y * cos,
  }));
  const strokeExpansion =
    (Math.abs(finiteNumber(object.strokeWidth, 0)) *
      Math.max(Math.abs(scaleX), Math.abs(scaleY))) /
    2;

  return {
    left: Math.min(...corners.map((corner) => corner.x)) - strokeExpansion,
    top: Math.min(...corners.map((corner) => corner.y)) - strokeExpansion,
    right: Math.max(...corners.map((corner) => corner.x)) + strokeExpansion,
    bottom: Math.max(...corners.map((corner) => corner.y)) + strokeExpansion,
  };
}

export function fitFabricSceneArtboardHeightToContent(
  scene: unknown,
  minimumHeight = MIN_RESULT_ARTBOARD_HEIGHT,
  bottomPadding = RESULT_ARTBOARD_BOTTOM_PADDING,
): FabricQuizScene {
  const normalized = normalizeFabricQuizScene(scene);
  const contentBottom = (normalized.fabric.objects ?? [])
    .filter((object) => !object.excludeFromExport)
    .reduce(
      (bottom, object) => Math.max(bottom, objectBounds(object).bottom),
      normalized.artboard.y + minimumHeight - bottomPadding,
    );
  const height = Math.max(
    minimumHeight,
    Math.ceil(contentBottom - normalized.artboard.y + bottomPadding),
  );

  return {
    ...normalized,
    workspace: {
      ...normalized.workspace,
      height: Math.max(
        normalized.workspace.height,
        normalized.artboard.y + height + bottomPadding,
      ),
    },
    artboard: { ...normalized.artboard, height },
  };
}

function intersectsArtboard(
  object: FabricObjectJson,
  artboard: FabricArtboard,
) {
  const bounds = objectBounds(object);
  return (
    bounds.right >= artboard.x &&
    bounds.left <= artboard.x + artboard.width &&
    bounds.bottom >= artboard.y &&
    bounds.top <= artboard.y + artboard.height
  );
}

function remapUnknown(value: unknown, idMap: Record<string, string>): unknown {
  if (typeof value === "string") {
    return idMap[value] ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => remapUnknown(item, idMap));
  }
  if (isRecord(value)) {
    const next: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, item]) => {
      next[idMap[key] ?? key] = remapUnknown(item, idMap);
    });
    return next;
  }
  return value;
}

function preparePublishedActionProps(
  value: unknown,
  artboard: FabricArtboard,
  idMap: Record<string, string>,
) {
  const remapped = remapUnknown(value, idMap);
  if (!isRecord(remapped) || !isRecord(remapped.answerStates)) {
    return remapped;
  }

  const answerStates = { ...remapped.answerStates };
  for (const stateName of ["unselected", "selected"] as const) {
    const state = answerStates[stateName];
    if (!isRecord(state) || !isRecord(state.properties)) continue;
    const properties = { ...state.properties };
    if (typeof properties.left === "number") {
      properties.left -= artboard.x;
    }
    if (typeof properties.top === "number") {
      properties.top -= artboard.y;
    }
    answerStates[stateName] = { ...state, properties };
  }

  return { ...remapped, answerStates };
}

function preparePublishedObject(
  object: FabricObjectJson,
  artboard: FabricArtboard,
  idMap: Record<string, string>,
): FabricObjectJson {
  const next = cloneValue(object);
  next.left = finiteNumber(next.left, 0) - artboard.x;
  next.top = finiteNumber(next.top, 0) - artboard.y;
  next.vvActionProps = preparePublishedActionProps(
    next.vvActionProps,
    artboard,
    idMap,
  );
  if (Array.isArray(next.objects)) {
    next.objects = next.objects.map((child) =>
      prepareNestedPublishedObject(child, idMap),
    );
  }
  return next;
}

function prepareNestedPublishedObject(
  object: FabricObjectJson,
  idMap: Record<string, string>,
): FabricObjectJson {
  const next = cloneValue(object);
  next.vvActionProps = remapUnknown(next.vvActionProps, idMap);
  if (Array.isArray(next.objects)) {
    next.objects = next.objects.map((child) =>
      prepareNestedPublishedObject(child, idMap),
    );
  }
  return next;
}

export function exportFabricSceneForPublish(
  scene: unknown,
  idMap: Record<string, string> = {},
  options: { fitArtboardHeightToContent?: boolean } = {},
): FabricQuizScene {
  const normalized = options.fitArtboardHeightToContent
    ? fitFabricSceneArtboardHeightToContent(scene)
    : normalizeFabricQuizScene(scene);
  const objects = (normalized.fabric.objects ?? [])
    .filter((object) => !object.excludeFromExport)
    .filter((object) => intersectsArtboard(object, normalized.artboard))
    .map((object) =>
      preparePublishedObject(object, normalized.artboard, idMap),
    );

  return {
    schemaVersion: FABRIC_SCENE_SCHEMA_VERSION,
    workspace: {
      width: normalized.artboard.width,
      height: normalized.artboard.height,
    },
    artboard: {
      x: 0,
      y: 0,
      width: normalized.artboard.width,
      height: normalized.artboard.height,
    },
    background: cloneValue(normalized.background),
    fabric: {
      ...cloneValue(normalized.fabric),
      width: normalized.artboard.width,
      height: normalized.artboard.height,
      objects,
    },
  };
}

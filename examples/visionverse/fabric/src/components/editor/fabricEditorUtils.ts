"use client";

import type * as FabricTypes from "fabric";
import { normalizeFontFamilyStack } from "@/lib/fontRegistry";
import {
  FABRIC_CUSTOM_PROPERTIES,
  type FabricCanvasJson,
  type FabricObjectJson,
} from "../../../shared/fabricScene";
import {
  ARTBOARD_GUIDE_IDS,
  EDITOR_CONTROL_COLOR,
  EDITOR_CONTROL_SIZE,
  EDITOR_ROTATE_CONTROL_OFFSET,
  EDITOR_TOUCH_CONTROL_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  PAN_CLAMP_MARGIN,
  TEXT_MEASURE_PADDING,
  TEXT_MIN_WIDTH,
} from "./fabricEditorConfig";
import type {
  FabricCanvas,
  FabricControlLike,
  FabricGroupObject,
  FabricModule,
  FabricObject,
  FabricObjectJsonLike,
  ViewportTransform,
} from "./fabricEditorTypes";

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function objectLabel(object: FabricObject | null) {
  if (!object) return "No selection";
  return object.vvName || object.vvAction || object.type || "Object";
}

export function isFabricGroupObject(
  object: FabricObject,
): object is FabricGroupObject {
  return (
    object.type?.toLowerCase() === "group" &&
    typeof (object as unknown as Partial<FabricGroupObject>).getObjects ===
      "function"
  );
}

export function assignFreshObjectIds(object: FabricObject) {
  object.vvId = createId(object.type ?? "object");
  if (isFabricGroupObject(object)) {
    object.getObjects().forEach(assignFreshObjectIds);
  }
}

export function getFabricObjectParent(
  object: FabricObject,
): FabricGroupObject | null {
  const parent = (object as unknown as { parent?: FabricObject }).parent;
  return parent && isFabricGroupObject(parent) ? parent : null;
}

export function getTopLevelFabricObject(object: FabricObject): FabricObject {
  let current = object;
  let parent = getFabricObjectParent(current);
  while (parent) {
    current = parent;
    parent = getFabricObjectParent(current);
  }
  return current;
}

export function isFabricObjectOnCanvas(
  canvas: FabricCanvas,
  object: FabricObject,
) {
  return canvas.contains(getTopLevelFabricObject(object));
}

export function isArtboardGuideObject(object: FabricObjectJsonLike) {
  return typeof object.vvId === "string" && ARTBOARD_GUIDE_IDS.has(object.vvId);
}

export function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function clampViewportTransform(
  vpt: number[],
  viewportWidth: number,
  viewportHeight: number,
  artboard: { x: number; y: number; width: number; height: number },
): ViewportTransform {
  const zoom = vpt[0] ?? 1;
  const centerX = artboard.x + artboard.width / 2;
  const centerY = artboard.y + artboard.height / 2;
  const horizontalMargin = Math.min(PAN_CLAMP_MARGIN, viewportWidth / 2);
  const verticalMargin = Math.min(PAN_CLAMP_MARGIN, viewportHeight / 2);

  let tx = vpt[4] ?? 0;
  let ty = vpt[5] ?? 0;

  const screenCenterX = tx + centerX * zoom;
  if (screenCenterX < horizontalMargin) {
    tx += horizontalMargin - screenCenterX;
  } else if (screenCenterX > viewportWidth - horizontalMargin) {
    tx -= screenCenterX - (viewportWidth - horizontalMargin);
  }

  const screenCenterY = ty + centerY * zoom;
  if (screenCenterY < verticalMargin) {
    ty += verticalMargin - screenCenterY;
  } else if (screenCenterY > viewportHeight - verticalMargin) {
    ty -= screenCenterY - (viewportHeight - verticalMargin);
  }

  return [zoom, vpt[1] ?? 0, vpt[2] ?? 0, vpt[3] ?? zoom, tx, ty];
}

export function editableEventTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

export function eventClientPoint(
  event: MouseEvent | TouchEvent | PointerEvent,
) {
  if ("clientX" in event && "clientY" in event) {
    return { x: event.clientX, y: event.clientY };
  }

  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

export function wheelPixelDelta(event: WheelEvent, viewportHeight: number) {
  const multiplier =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? viewportHeight
        : 1;
  return {
    x: event.deltaX * multiplier,
    y: event.deltaY * multiplier,
  };
}

let measureContext: CanvasRenderingContext2D | null | undefined;
function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext;
  measureContext =
    typeof document === "undefined"
      ? null
      : (document.createElement("canvas").getContext("2d") ?? null);
  return measureContext;
}

export function applyAutoWidth(target: FabricObject) {
  if (target.type !== "textbox") return;
  const ctx = getMeasureContext();
  if (!ctx) return;

  const textbox = target as unknown as FabricTypes.Textbox;
  const lines = textbox.text.length > 0 ? textbox.text.split("\n") : [""];
  ctx.font = `${textbox.fontStyle} ${textbox.fontWeight} ${textbox.fontSize}px ${textbox.fontFamily}`;
  const longestLineWidth = lines.reduce(
    (max, line) => Math.max(max, ctx.measureText(line).width),
    0,
  );
  target.set(
    "width",
    Math.max(TEXT_MIN_WIDTH, longestLineWidth + TEXT_MEASURE_PADDING),
  );
}

// Canvas-level width/height/viewportTransform/background are editor chrome,
// not scene content. They must never survive a round-trip: Fabric's
// loadFromJSON ends with `this.set(serialized)`, so a stale `width: 1120`
// from the editor workspace would get stamped onto whatever canvas loads the
// scene (e.g. the artboard-sized play renderer), desyncing its logical size
// from its DOM element and breaking all scaling.
export function stripEditorViewportProperties(
  fabric: FabricCanvasJson,
): FabricCanvasJson {
  const next = { ...fabric };
  delete next.viewportTransform;
  delete next.width;
  delete next.height;
  delete next.background;
  return next;
}

export function serializeCanvas(
  canvas: FabricCanvas,
  workspace: { width: number; height: number },
): FabricCanvasJson {
  const fabric = stripEditorViewportProperties(
    canvas.toObject([...FABRIC_CUSTOM_PROPERTIES]) as FabricCanvasJson,
  );
  return {
    ...fabric,
    width: workspace.width,
    height: workspace.height,
    objects: (fabric.objects ?? []).filter(
      (object) => !object.excludeFromExport && !isArtboardGuideObject(object),
    ),
  };
}

function normalizeObjectFontFamilies(
  object: FabricObjectJson,
): FabricObjectJson {
  const next = { ...object };
  if (typeof next.fontFamily === "string") {
    next.fontFamily = normalizeFontFamilyStack(next.fontFamily);
  }
  if (Array.isArray(next.objects)) {
    next.objects = next.objects.map(normalizeObjectFontFamilies);
  }
  return next;
}

export function canvasLoadJson(fabric: FabricCanvasJson): FabricCanvasJson {
  const next = stripEditorViewportProperties(fabric);
  return {
    ...next,
    objects: next.objects?.map(normalizeObjectFontFamilies),
  };
}

export function clearFabricTextMeasurementCache(fabric: FabricModule) {
  // Fabric caches glyph widths by font-family string. If a Textbox is measured
  // while its web font is still loading, those fallback widths survive after
  // the real font appears and center/right alignment is calculated from the
  // wrong line width. Clear the shared cache after font loading and before
  // enlivening scene objects so measurement and drawing use the same face.
  fabric.cache.clearFontCache();
}

export function applyFigmaTextFrameLayout(object: FabricObject) {
  if (
    object.type !== "textbox" ||
    typeof object.vvFigmaTextFrameHeight !== "number" ||
    !Number.isFinite(object.vvFigmaTextFrameHeight)
  ) {
    return false;
  }

  const textbox = object as unknown as FabricTypes.Textbox;
  const shiftAlongLocalY = (distance: number) => {
    if (Math.abs(distance) <= 0.01) return;
    const matrix = textbox.calcOwnMatrix();
    textbox.set({
      left: textbox.left + matrix[2] * distance,
      top: textbox.top + matrix[3] * distance,
    });
  };
  const previousOffset = object.vvFigmaTextLayoutOffset ?? 0;
  shiftAlongLocalY(-previousOffset);
  if (
    object.vvFigmaTextLayoutApplied !== true &&
    typeof object.vvFigmaTextFrameWidth === "number" &&
    Number.isFinite(object.vvFigmaTextFrameWidth) &&
    object.vvFigmaTextAutoResize !== "WIDTH_AND_HEIGHT"
  ) {
    textbox.set("width", Math.max(1, object.vvFigmaTextFrameWidth));
  }
  textbox.initDimensions();
  const frameHeight = Math.max(0, object.vvFigmaTextFrameHeight);
  const renderedHeight = textbox.height;
  const alignment = object.vvFigmaVerticalAlign?.toLocaleLowerCase();
  const offset =
    alignment === "center"
      ? (frameHeight - renderedHeight) / 2
      : alignment === "bottom"
        ? frameHeight - renderedHeight
        : 0;

  shiftAlongLocalY(offset);
  object.vvFigmaTextLayoutOffset = offset;
  object.vvFigmaTextLayoutApplied = true;
  textbox.setCoords();
  return true;
}

function scaledObjectWidth(object: FabricObject) {
  return Math.max(0, object.width * Math.abs(object.scaleX || 1));
}

function scaledObjectHeight(object: FabricObject) {
  return Math.max(0, object.height * Math.abs(object.scaleY || 1));
}

function setScaledObjectWidth(object: FabricObject, width: number) {
  object.set("scaleX", Math.max(0.01, width) / Math.max(0.01, object.width));
}

function setScaledObjectHeight(object: FabricObject, height: number) {
  object.set("scaleY", Math.max(0.01, height) / Math.max(0.01, object.height));
}

function clampConstraintSize(
  value: number,
  minimum: number | null | undefined,
  maximum: number | null | undefined,
) {
  const withMinimum =
    typeof minimum === "number" ? Math.max(minimum, value) : value;
  return typeof maximum === "number"
    ? Math.min(maximum, withMinimum)
    : withMinimum;
}

function constraintChildren(group: FabricGroupObject) {
  return group.getObjects().filter((object) => object.visible !== false);
}

function constrainAxis(
  object: FabricObject,
  oldParentSize: number,
  newParentSize: number,
  axis: "horizontal" | "vertical",
) {
  const constraints = object.vvFigmaConstraints;
  const rule = constraints?.[axis] ?? "MIN";
  const horizontal = axis === "horizontal";
  const start = (horizontal ? object.left : object.top) + oldParentSize / 2;
  const size = horizontal
    ? scaledObjectWidth(object)
    : scaledObjectHeight(object);
  const delta = newParentSize - oldParentSize;
  const ratio = oldParentSize > 0 ? newParentSize / oldParentSize : 1;
  let nextStart = start;
  let nextSize = size;
  if (rule === "MAX") nextStart += delta;
  if (rule === "CENTER") nextStart += delta / 2;
  if (rule === "STRETCH") nextSize += delta;
  if (rule === "SCALE") {
    nextStart *= ratio;
    nextSize *= ratio;
  }
  nextSize = clampConstraintSize(
    nextSize,
    horizontal ? constraints?.minWidth : constraints?.minHeight,
    horizontal ? constraints?.maxWidth : constraints?.maxHeight,
  );
  if (horizontal) {
    setScaledObjectWidth(object, nextSize);
    object.set("left", nextStart - newParentSize / 2);
  } else {
    setScaledObjectHeight(object, nextSize);
    object.set("top", nextStart - newParentSize / 2);
  }
}

export function normalizeFigmaGroupResize(object: FabricObject) {
  if (!isFabricGroupObject(object)) return false;
  const scaleX = object.scaleX || 1;
  const scaleY = object.scaleY || 1;
  if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) {
    return false;
  }
  const oldWidth = object.width;
  const oldHeight = object.height;
  const newWidth = Math.max(1, oldWidth * Math.abs(scaleX));
  const newHeight = Math.max(1, oldHeight * Math.abs(scaleY));
  object.set({ width: newWidth, height: newHeight, scaleX: 1, scaleY: 1 });
  constraintChildren(object).forEach((child) => {
    constrainAxis(child, oldWidth, newWidth, "horizontal");
    constrainAxis(child, oldHeight, newHeight, "vertical");
    child.setCoords();
  });
  object.setCoords();
  return true;
}

export function applyFigmaComponentProperty(
  object: FabricObject,
  propertyName: string,
  value: string | boolean,
) {
  if (!isFabricGroupObject(object) || !object.vvFigmaComponent) return false;
  const current = object.vvFigmaComponent;
  const property = current.properties?.[propertyName];
  const variantName = propertyName.replace(/#.*$/, "");
  object.vvFigmaComponent = {
    ...current,
    properties: {
      ...(current.properties ?? {}),
      [propertyName]: {
        ...(current.properties?.[propertyName] ?? {}),
        value,
      },
    },
    ...(property?.type === "VARIANT" && typeof value === "string"
      ? {
          variants: {
            ...(current.variants ?? {}),
            [variantName]: value,
          },
        }
      : {}),
  };
  let changed = false;
  const visit = (candidate: FabricObject) => {
    const references = candidate.vvFigmaComponentPropertyReferences;
    if (
      references?.characters === propertyName &&
      candidate.type === "textbox"
    ) {
      (candidate as unknown as FabricTypes.Textbox).set("text", String(value));
      (candidate as unknown as FabricTypes.Textbox).initDimensions();
      changed = true;
    }
    if (references?.visible === propertyName && typeof value === "boolean") {
      candidate.set("visible", value);
      changed = true;
    }
    if (isFabricGroupObject(candidate)) candidate.getObjects().forEach(visit);
  };
  object.getObjects().forEach(visit);
  object.setCoords();
  return changed;
}

export function configureFabricEditorControlDefaults(fabric: FabricModule) {
  const controlDefaults = fabric.InteractiveFabricObject.ownDefaults;
  controlDefaults.cornerSize = EDITOR_CONTROL_SIZE;
  controlDefaults.touchCornerSize = EDITOR_TOUCH_CONTROL_SIZE;
  controlDefaults.transparentCorners = false;
  controlDefaults.cornerColor = "#ffffff";
  controlDefaults.cornerStrokeColor = EDITOR_CONTROL_COLOR;
  controlDefaults.borderColor = EDITOR_CONTROL_COLOR;
  controlDefaults.borderScaleFactor = 1;
}

export function applyEditorControls(object: FabricObject) {
  object.set({
    cornerSize: EDITOR_CONTROL_SIZE,
    touchCornerSize: EDITOR_TOUCH_CONTROL_SIZE,
    transparentCorners: false,
    cornerColor: "#ffffff",
    cornerStrokeColor: EDITOR_CONTROL_COLOR,
    borderColor: EDITOR_CONTROL_COLOR,
    borderScaleFactor: 1,
  });

  const controls = object.controls as
    | Record<string, FabricControlLike>
    | undefined;

  Object.values(controls ?? {}).forEach((control) => {
    control.sizeX = EDITOR_CONTROL_SIZE;
    control.sizeY = EDITOR_CONTROL_SIZE;
    control.touchSizeX = EDITOR_TOUCH_CONTROL_SIZE;
    control.touchSizeY = EDITOR_TOUCH_CONTROL_SIZE;
  });

  if (controls?.mtr) {
    controls.mtr.offsetY = EDITOR_ROTATE_CONTROL_OFFSET;
  }

  if (object.type === "textbox") {
    // Fabric's Textbox already gives the middle-left/right controls a
    // width-resize action that reflows text without scaling its glyphs. Hide
    // the remaining scale controls so dragging a text frame can never stretch
    // the font or make the rendered size disagree with `fontSize`.
    object.setControlsVisibility({
      tl: false,
      tr: false,
      bl: false,
      br: false,
      mt: false,
      mb: false,
      ml: true,
      mr: true,
      mtr: true,
    });
  }
}

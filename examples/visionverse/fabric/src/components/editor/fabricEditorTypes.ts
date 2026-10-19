"use client";

import type * as FabricTypes from "fabric";
import type {
  FabricQuizAction,
  FabricQuizRole,
} from "../../../shared/fabricScene";

export type FabricModule = typeof FabricTypes;
export type FabricCanvas = InstanceType<FabricModule["Canvas"]>;
export type ViewportTransform = [
  number,
  number,
  number,
  number,
  number,
  number,
];

export type FabricObject = InstanceType<FabricModule["FabricObject"]> & {
  vvId?: string;
  vvName?: string;
  vvRole?: FabricQuizRole;
  vvAction?: FabricQuizAction;
  vvActionProps?: Record<string, unknown>;
  vvAutoWidth?: boolean;
  vvFigmaRawText?: string;
  vvFigmaTextCase?: string;
  vvFigmaTextFrameWidth?: number;
  vvFigmaTextFrameHeight?: number;
  vvFigmaTextAutoResize?: string;
  vvFigmaTextTruncation?: string;
  vvFigmaTextMaxLines?: number | null;
  vvFigmaTypography?: FigmaTypographyMetadata;
  vvFigmaVerticalAlign?: string;
  vvFigmaTextLayoutApplied?: boolean;
  vvFigmaTextLayoutOffset?: number;
  vvFigmaTransform?: FigmaTransformMetadata;
  vvFigmaEffects?: FigmaEffectMetadata[];
  vvFigmaNodeType?: string;
  vvFigmaConstraints?: FigmaConstraintMetadata;
  vvFigmaComponent?: FigmaComponentMetadata;
  vvFigmaComponentPropertyReferences?: Record<string, string>;
};

export type FigmaTransformMetadata = {
  matrix: [number, number, number, number, number, number];
  width: number;
  height: number;
};

export type FigmaEffectMetadata = {
  type?: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  color?: string;
  offsetX?: number;
  offsetY?: number;
  radius?: number;
  spread?: number;
  blendMode?: string;
  showShadowBehindNode?: boolean;
};

export type FigmaTypographyMetadata = {
  styleRanges?: Array<Record<string, unknown>>;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  listSpacing?: number;
};

export type FigmaConstraintMetadata = {
  horizontal?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
  vertical?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
  minWidth?: number | null;
  maxWidth?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
};

export type FigmaComponentProperty = {
  type?: "BOOLEAN" | "INSTANCE_SWAP" | "TEXT" | "VARIANT";
  value?: string | boolean;
  defaultValue?: string | boolean;
  options?: string[];
};

export type FigmaComponentMetadata = {
  kind?: "component" | "component_set" | "instance";
  key?: string;
  name?: string;
  properties?: Record<string, FigmaComponentProperty>;
  variants?: Record<string, string>;
};

export type FabricGroupObject = FabricObject & {
  getObjects: () => FabricObject[];
  add: (...objects: FabricObject[]) => number;
  insertAt: (index: number, ...objects: FabricObject[]) => number;
  remove: (...objects: FabricObject[]) => FabricObject[];
};

export type EditorTool = "pointer" | "text" | "shape" | "brush" | "pen";
export type ShapeKind = "rect" | "ellipse" | "triangle";
export type BrushKind = "pencil" | "circle" | "spray";

export type PenPoint = { x: number; y: number };
export type PenAnchor = {
  x: number;
  y: number;
  handleIn?: PenPoint;
  handleOut?: PenPoint;
};
export type PenPointerEvent = {
  e: MouseEvent | TouchEvent | PointerEvent;
};

export type FabricObjectJsonLike = {
  vvId?: unknown;
  excludeFromExport?: unknown;
};

export type ViewportPanState = {
  lastPoint: PenPoint;
  previousSelection: boolean;
  previousSkipTargetFind: boolean;
  previousDrawingMode: boolean;
};

export type FabricControlLike = {
  offsetY?: number;
  sizeX?: number;
  sizeY?: number;
  touchSizeX?: number;
  touchSizeY?: number;
};

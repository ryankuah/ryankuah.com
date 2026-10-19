"use client";

import type { BrushKind, ShapeKind } from "./fabricEditorTypes";

export const SHAPE_OPTIONS: { kind: ShapeKind; label: string }[] = [
  { kind: "rect", label: "Rectangle" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "triangle", label: "Triangle" },
];

export const SHAPE_DEFAULT_SIZE: Record<
  ShapeKind,
  { width: number; height: number }
> = {
  rect: { width: 160, height: 92 },
  ellipse: { width: 160, height: 104 },
  triangle: { width: 140, height: 120 },
};

export const SHAPE_DRAG_CLICK_THRESHOLD = 2;

export const BRUSH_OPTIONS: { kind: BrushKind; label: string }[] = [
  { kind: "pencil", label: "Pencil" },
  { kind: "circle", label: "Circle brush" },
  { kind: "spray", label: "Spray" },
];

export const PEN_CLOSE_THRESHOLD = 10;
export const PEN_ANCHOR_RADIUS = 4;
export const PEN_HANDLE_RADIUS = 3;
export const PEN_STROKE_COLOR = "#6366f1";

export const ARTBOARD_GUIDE_IDS = new Set([
  "__artboard-screen",
  "__artboard-frame",
  "__artboard-corner-mask",
  "__artboard-bezel",
]);
export const PHONE_FRAME_BORDER = 6;
export const PHONE_FRAME_RADIUS = 40;
export const FIT_VIEWPORT_PADDING = 32;
export const FIT_BOTTOM_CLEARANCE = 96;
export const EDITOR_CONTROL_SIZE = 8;
export const EDITOR_TOUCH_CONTROL_SIZE = 18;
export const EDITOR_ROTATE_CONTROL_OFFSET = -22;
export const EDITOR_CONTROL_COLOR = "#93c5fd";
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const PAN_CLAMP_MARGIN = 120;
export const TEXT_MIN_WIDTH = 20;
export const TEXT_MEASURE_PADDING = 4;
export const RESULT_EDITOR_BOTTOM_BUFFER = 360;

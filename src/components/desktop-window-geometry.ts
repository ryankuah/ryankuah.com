export type Point = { x: number; y: number };

export const keyboardStep: Record<string, Point> = {
  ArrowLeft: { x: -20, y: 0 },
  ArrowRight: { x: 20, y: 0 },
  ArrowUp: { x: 0, y: -20 },
  ArrowDown: { x: 0, y: 20 },
};

export type WindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type ResizeEdge = "n" | "e" | "s" | "w" | "ne" | "se" | "sw" | "nw";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

export function resizeWindow(
  origin: WindowRect,
  bounds: { width: number; height: number },
  edge: ResizeEdge,
  delta: { x: number; y: number },
  minimum = { width: 320, height: 220 },
): WindowRect {
  const minWidth = Math.min(minimum.width, bounds.width - 16);
  const minHeight = Math.min(minimum.height, bounds.height - 144);
  let left = origin.x;
  let top = origin.y;
  let right = origin.x + origin.width;
  let bottom = origin.y + origin.height;

  if (edge.includes("w")) left = clamp(left + delta.x, 8, right - minWidth);
  if (edge.includes("e"))
    right = clamp(right + delta.x, left + minWidth, bounds.width - 8);
  if (edge.includes("n")) top = clamp(top + delta.y, 48, bottom - minHeight);
  if (edge.includes("s"))
    bottom = clamp(bottom + delta.y, top + minHeight, bounds.height - 96);

  return { x: left, y: top, width: right - left, height: bottom - top };
}

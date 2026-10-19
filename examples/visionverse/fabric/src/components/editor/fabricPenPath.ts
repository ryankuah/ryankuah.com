import { PEN_CLOSE_THRESHOLD, PEN_STROKE_COLOR } from "./fabricEditorConfig";
import type { PenAnchor, PenPoint } from "./fabricEditorTypes";

// A segment's control points default to its own endpoints when a handle is
// absent, which degenerates the cubic bezier to a straight line. Corner and
// curve points can therefore share the same path-building code.
function penSegmentPath(from: PenAnchor, to: PenAnchor): string {
  const c1 = from.handleOut ?? from;
  const c2 = to.handleIn ?? to;
  return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`;
}

export function isPenPathClosingPoint(
  anchors: PenAnchor[],
  point: PenPoint,
): boolean {
  const first = anchors[0];
  return (
    anchors.length >= 2 &&
    !!first &&
    Math.hypot(point.x - first.x, point.y - first.y) <= PEN_CLOSE_THRESHOLD
  );
}

export function buildPenPathDefinition(anchors: PenAnchor[], closed: boolean) {
  const first = anchors[0];
  if (!first) {
    return {
      d: "",
      fill: null,
      stroke: PEN_STROKE_COLOR,
      strokeWidth: 2,
    };
  }

  const segments: string[] = [];
  let previous = first;
  for (const anchor of anchors.slice(1)) {
    segments.push(penSegmentPath(previous, anchor));
    previous = anchor;
  }
  if (closed && anchors.length > 1) {
    segments.push(penSegmentPath(previous, first));
  }

  return {
    d: `M ${first.x} ${first.y} ${segments.join(" ")}${closed ? " Z" : ""}`,
    // Fabric paths default to a black fill. Use an explicit null so an open
    // pen stroke remains an unfilled path after JSON serialization/reload.
    fill: closed ? PEN_STROKE_COLOR : null,
    stroke: closed ? null : PEN_STROKE_COLOR,
    strokeWidth: closed ? 0 : 2,
  };
}

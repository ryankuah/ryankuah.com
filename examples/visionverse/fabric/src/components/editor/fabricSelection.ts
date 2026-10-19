export type FabricSelectionKind =
  | "text"
  | "image"
  | "shape"
  | "path"
  | "selection"
  | "other";

type FabricSelectionLike = {
  type?: string;
  path?: unknown;
};

const TEXT_TYPES = new Set(["text", "i-text", "textbox"]);
const SHAPE_TYPES = new Set([
  "circle",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "rect",
  "triangle",
]);

export function getFabricSelectionKind(
  object: FabricSelectionLike,
): FabricSelectionKind {
  const type = object.type?.toLowerCase();
  if (!type) return "other";
  if (TEXT_TYPES.has(type)) return "text";
  if (type === "image") return "image";
  if (SHAPE_TYPES.has(type)) return "shape";
  if (type === "path") return "path";
  if (type === "activeselection") return "selection";
  return "other";
}

export function isClosedFabricPath(object: FabricSelectionLike) {
  if (object.type?.toLowerCase() !== "path" || !Array.isArray(object.path)) {
    return false;
  }

  const finalCommand = object.path.at(-1);
  return (
    Array.isArray(finalCommand) &&
    typeof finalCommand[0] === "string" &&
    finalCommand[0].toLowerCase() === "z"
  );
}

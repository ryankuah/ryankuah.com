"use client";

import { useReducer, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  ChevronRight,
  Combine,
  Copy,
  Image as ImageIcon,
  Italic,
  Strikethrough,
  Trash2,
  Underline,
  Ungroup,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FontFamilyPicker } from "./FontFamilyPicker";
import type { FabricObject } from "./fabricEditorTypes";
import {
  getFabricObjectParent,
  isFabricGroupObject,
  objectLabel,
} from "./fabricEditorUtils";
import { getFabricSelectionKind, isClosedFabricPath } from "./fabricSelection";

type FabricSelectionMenuProps = {
  selectedObject: FabricObject;
  onUpdateObject: (
    object: FabricObject,
    properties: Record<string, unknown>,
  ) => void;
  onUpdateTextStyle: (
    object: FabricObject,
    properties: Record<string, unknown>,
  ) => void;
  onUpdateComponentProperty: (
    object: FabricObject,
    propertyName: string,
    value: string | boolean,
  ) => void;
  onTransformTextCase: (
    object: FabricObject,
    textCase: "original" | "upper" | "lower" | "title",
  ) => void;
  sceneFontFamilies: string[];
  onChangeFontFamily: (
    object: FabricObject,
    fontFamily: string,
  ) => Promise<boolean>;
  onReplaceImage: () => void;
  onDuplicate: () => Promise<void>;
  onMerge: () => void;
  onUngroup: (group: FabricObject) => void;
  onSelectObject: (object: FabricObject) => void;
  onDelete: () => void;
};

type MenuActionProps = {
  label: string;
  icon: ReactNode;
  destructive?: boolean;
  pressed?: boolean;
  accent?: "blue" | "violet";
  preserveTextSelection?: boolean;
  onClick: () => void;
};

type TextObject = FabricObject & {
  fill?: unknown;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: string;
  fontWeight?: string | number;
  charSpacing?: number;
  direction?: string;
  lineHeight?: number;
  linethrough?: boolean;
  textBackgroundColor?: string;
  textDecorationColor?: string;
  textDecorationThickness?: number;
  textAlign?: string;
  underline?: boolean;
  isEditing?: boolean;
  selectionStart?: number;
  selectionEnd?: number;
  getSelectionStyles?: (
    start?: number,
    end?: number,
    complete?: boolean,
  ) => Array<Record<string, unknown>>;
};

type RectObject = FabricObject & {
  rx?: number;
  ry?: number;
};

const SELECTION_LABELS = {
  image: "Image",
  other: "Component",
  path: "Path",
  selection: "Selection",
  shape: "Shape",
  text: "Text",
} as const;

function colorValue(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value)
    ? value
    : fallback;
}

function MenuAction({
  label,
  icon,
  destructive = false,
  pressed = false,
  accent = "blue",
  preserveTextSelection = false,
  onClick,
}: MenuActionProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        if (preserveTextSelection) event.preventDefault();
      }}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        pressed &&
          (accent === "violet"
            ? "bg-violet-50 text-violet-700 hover:bg-violet-100"
            : "bg-blue-50 text-blue-700 hover:bg-blue-100"),
        destructive && "text-red-600 hover:bg-red-50",
      )}
      title={label}
      aria-label={label}
      aria-pressed={pressed || undefined}
    >
      {icon}
    </button>
  );
}

function ColorControl({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: unknown;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
      <span>{label}</span>
      <span className="relative h-7 w-9 overflow-hidden rounded-md border border-slate-200 bg-white">
        <input
          type="color"
          value={colorValue(value, fallback)}
          onChange={(event) => onChange(event.target.value)}
          className="absolute -inset-2 h-11 w-14 cursor-pointer border-0 bg-transparent p-0"
          aria-label={`${label} color`}
        />
      </span>
    </label>
  );
}

function OpacityControl({
  opacity,
  onChange,
}: {
  opacity: number;
  onChange: (opacity: number) => void;
}) {
  const percent = Math.round(opacity * 100);
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
      <span>Opacity</span>
      <span className="tabular-nums text-slate-500">{percent}%</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="col-span-2 h-1.5 w-full cursor-pointer accent-blue-600"
      />
    </label>
  );
}

export function FabricSelectionMenu({
  selectedObject,
  onUpdateObject,
  onUpdateTextStyle,
  onUpdateComponentProperty,
  onTransformTextCase,
  sceneFontFamilies,
  onChangeFontFamily,
  onReplaceImage,
  onDuplicate,
  onMerge,
  onUngroup,
  onSelectObject,
  onDelete,
}: FabricSelectionMenuProps) {
  const [, refreshControls] = useReducer((value: number) => value + 1, 0);
  const selectionKind = getFabricSelectionKind(selectedObject);
  const text = selectedObject as TextObject;
  const rect = selectedObject as RectObject;
  const opacity = selectedObject.opacity ?? 1;
  const pathIsClosed = isClosedFabricPath(
    selectedObject as FabricObject & { path?: unknown },
  );
  const hasTextOutline =
    selectedObject.stroke !== null &&
    selectedObject.stroke !== undefined &&
    selectedObject.stroke !== "";
  const textOutlineWidth = hasTextOutline
    ? (selectedObject.strokeWidth ?? 1)
    : 0;
  const showFill = selectionKind === "shape" || pathIsClosed;
  const showStroke = selectionKind === "shape" || selectionKind === "path";
  const isRectangle = selectedObject.type?.toLowerCase() === "rect";
  const rectangleShortestSide = Math.max(
    1,
    Math.min(selectedObject.width, selectedObject.height),
  );
  const rectangleRadius = Math.round(
    Math.min(50, ((rect.rx ?? 0) / rectangleShortestSide) * 100),
  );
  const groupChildren = isFabricGroupObject(selectedObject)
    ? [...selectedObject.getObjects()].reverse()
    : [];
  const parentGroup = getFabricObjectParent(selectedObject);
  const selectionStart = text.selectionStart ?? 0;
  const selectionEnd = text.selectionEnd ?? selectionStart;
  const hasTextSelection =
    selectionKind === "text" &&
    text.isEditing === true &&
    selectionEnd > selectionStart;
  const selectedTextStyles = hasTextSelection
    ? (text.getSelectionStyles?.(selectionStart, selectionEnd, true) ?? [])
    : [];
  const boldPressed =
    selectedTextStyles.length > 0
      ? selectedTextStyles.every((style) => {
          const weight = style.fontWeight;
          return (
            weight === "bold" || (typeof weight === "number" && weight >= 600)
          );
        })
      : text.fontWeight === "bold" ||
        (typeof text.fontWeight === "number" && text.fontWeight >= 600);
  const italicPressed =
    selectedTextStyles.length > 0
      ? selectedTextStyles.every((style) => style.fontStyle === "italic")
      : text.fontStyle === "italic";
  const underlinePressed =
    selectedTextStyles.length > 0
      ? selectedTextStyles.every((style) => style.underline === true)
      : text.underline === true;
  const linethroughPressed =
    selectedTextStyles.length > 0
      ? selectedTextStyles.every((style) => style.linethrough === true)
      : text.linethrough === true;
  const componentProperties = Object.entries(
    selectedObject.vvFigmaComponent?.properties ?? {},
  );
  const constraints = selectedObject.vvFigmaConstraints ?? {};

  const updateObject = (properties: Record<string, unknown>) => {
    onUpdateObject(selectedObject, properties);
    refreshControls();
  };

  const updateTextStyle = (properties: Record<string, unknown>) => {
    onUpdateTextStyle(selectedObject, properties);
    refreshControls();
  };

  return (
    <div
      role="group"
      aria-label={`${SELECTION_LABELS[selectionKind]} controls`}
      className="absolute right-4 top-1/2 z-30 max-h-[calc(100%-2rem)] w-72 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200/90 bg-white/95 p-2 shadow-lg backdrop-blur"
    >
      {parentGroup ? (
        <button
          type="button"
          onClick={() => onSelectObject(parentGroup)}
          className="mb-2 flex w-full items-center gap-2 border-b border-slate-100 px-1 pb-2 text-left text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Back to Group</span>
          <span className="max-w-24 truncate text-[11px] font-normal text-slate-400">
            {objectLabel(parentGroup)}
          </span>
        </button>
      ) : null}

      <div className="flex items-center justify-between border-b border-slate-100 px-1 pb-2">
        <span className="text-xs font-semibold text-slate-800">
          {SELECTION_LABELS[selectionKind]}
        </span>
        <span className="max-w-32 truncate text-[11px] text-slate-400">
          {selectedObject.vvName}
        </span>
      </div>

      {groupChildren.length > 0 ? (
        <div className="space-y-1 py-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Children
          </p>
          {groupChildren.map((child, index) => (
            <button
              key={child.vvId ?? `group-child-${index}`}
              type="button"
              onClick={() => onSelectObject(child)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Combine className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate">
                {objectLabel(child)}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      ) : null}

      {selectedObject.vvFigmaComponent ? (
        <div className="space-y-2 border-t border-slate-100 py-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Figma {selectedObject.vvFigmaComponent.kind ?? "component"}
            </span>
            <span className="max-w-36 truncate text-[11px] text-slate-500">
              {selectedObject.vvFigmaComponent.name}
            </span>
          </div>
          {componentProperties.map(([name, property]) => (
            <label
              key={name}
              className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-2 px-1 text-xs font-medium text-slate-600"
            >
              <span className="truncate" title={name}>
                {name.replace(/#.*$/, "")}
              </span>
              {property.type === "BOOLEAN" ? (
                <input
                  type="checkbox"
                  checked={property.value === true}
                  onChange={(event) =>
                    onUpdateComponentProperty(
                      selectedObject,
                      name,
                      event.target.checked,
                    )
                  }
                  className="justify-self-end accent-blue-600"
                />
              ) : property.options && property.options.length > 0 ? (
                <select
                  value={String(property.value ?? property.defaultValue ?? "")}
                  onChange={(event) =>
                    onUpdateComponentProperty(
                      selectedObject,
                      name,
                      event.target.value,
                    )
                  }
                  className="h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                >
                  {property.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={String(property.value ?? property.defaultValue ?? "")}
                  onChange={(event) =>
                    onUpdateComponentProperty(
                      selectedObject,
                      name,
                      event.target.value,
                    )
                  }
                  className="h-8 min-w-0 rounded-md border border-slate-200 px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              )}
            </label>
          ))}
          {Object.entries(selectedObject.vvFigmaComponent.variants ?? {}).map(
            ([name, value]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-2 px-1 text-xs text-slate-600"
              >
                <span>{name}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                  {value}
                </span>
              </div>
            ),
          )}
        </div>
      ) : null}

      {parentGroup ? (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-1 py-2">
          <label className="text-[11px] font-medium text-slate-500">
            Horizontal constraint
            <select
              value={constraints.horizontal ?? "MIN"}
              onChange={(event) =>
                updateObject({
                  vvFigmaConstraints: {
                    ...constraints,
                    horizontal: event.target.value,
                  },
                })
              }
              className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-1 text-xs"
            >
              <option value="MIN">Left</option>
              <option value="CENTER">Center</option>
              <option value="MAX">Right</option>
              <option value="STRETCH">Left & right</option>
              <option value="SCALE">Scale</option>
            </select>
          </label>
          <label className="text-[11px] font-medium text-slate-500">
            Vertical constraint
            <select
              value={constraints.vertical ?? "MIN"}
              onChange={(event) =>
                updateObject({
                  vvFigmaConstraints: {
                    ...constraints,
                    vertical: event.target.value,
                  },
                })
              }
              className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-1 text-xs"
            >
              <option value="MIN">Top</option>
              <option value="CENTER">Center</option>
              <option value="MAX">Bottom</option>
              <option value="STRETCH">Top & bottom</option>
              <option value="SCALE">Scale</option>
            </select>
          </label>
        </div>
      ) : null}

      {selectionKind === "text" ? (
        <div className="space-y-2.5 py-2">
          <FontFamilyPicker
            value={text.fontFamily}
            sceneFontFamilies={sceneFontFamilies}
            onChange={(fontFamily) =>
              onChangeFontFamily(selectedObject, fontFamily)
            }
          />

          <div className="flex items-center gap-1">
            <label className="mr-auto flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>Size</span>
              <input
                type="number"
                min={6}
                max={300}
                value={Math.round(text.fontSize ?? 16)}
                onChange={(event) => {
                  const fontSize = Number(event.target.value);
                  if (Number.isFinite(fontSize) && fontSize > 0) {
                    updateTextStyle({ fontSize });
                  }
                }}
                className="h-8 w-16 rounded-md border border-slate-200 px-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                aria-label="Font size"
              />
            </label>
            <MenuAction
              label={hasTextSelection ? "Bold selected text" : "Bold"}
              icon={<Bold className="h-3.5 w-3.5" />}
              pressed={boldPressed}
              preserveTextSelection
              onClick={() =>
                updateTextStyle({ fontWeight: boldPressed ? "normal" : "bold" })
              }
            />
            <MenuAction
              label={hasTextSelection ? "Italicize selected text" : "Italic"}
              icon={<Italic className="h-3.5 w-3.5" />}
              pressed={italicPressed}
              preserveTextSelection
              onClick={() =>
                updateTextStyle({
                  fontStyle: italicPressed ? "normal" : "italic",
                })
              }
            />
            <MenuAction
              label={hasTextSelection ? "Underline selected text" : "Underline"}
              icon={<Underline className="h-3.5 w-3.5" />}
              pressed={underlinePressed}
              preserveTextSelection
              onClick={() => updateTextStyle({ underline: !underlinePressed })}
            />
            <MenuAction
              label={
                hasTextSelection
                  ? "Strike through selected text"
                  : "Strikethrough"
              }
              icon={<Strikethrough className="h-3.5 w-3.5" />}
              pressed={linethroughPressed}
              preserveTextSelection
              onClick={() =>
                updateTextStyle({ linethrough: !linethroughPressed })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-medium text-slate-500">
              Weight
              <select
                value={
                  typeof text.fontWeight === "number"
                    ? text.fontWeight
                    : text.fontWeight === "bold"
                      ? 700
                      : 400
                }
                onChange={(event) =>
                  updateTextStyle({ fontWeight: Number(event.target.value) })
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
              >
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => (
                  <option key={weight} value={weight}>
                    {weight}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-500">
              Text case
              <select
                defaultValue=""
                onChange={(event) => {
                  const value = event.target.value as
                    | "upper"
                    | "lower"
                    | "title";
                  if (value) onTransformTextCase(selectedObject, value);
                  event.target.value = "";
                }}
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
              >
                <option value="">Transform…</option>
                <option value="upper">UPPERCASE</option>
                <option value="lower">lowercase</option>
                <option value="title">Title Case</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-auto text-xs font-medium text-slate-600">
              Align
            </span>
            {(
              [
                ["left", AlignLeft],
                ["center", AlignCenter],
                ["right", AlignRight],
                ["justify", AlignJustify],
              ] as const
            ).map(([align, Icon]) => (
              <MenuAction
                key={align}
                label={`Align ${align}`}
                icon={<Icon className="h-3.5 w-3.5" />}
                pressed={(text.textAlign ?? "left") === align}
                onClick={() => updateObject({ textAlign: align })}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-medium text-slate-500">
              Line height
              <input
                type="number"
                min={0.5}
                max={5}
                step={0.05}
                value={Math.round((text.lineHeight ?? 1.16) * 100) / 100}
                onChange={(event) =>
                  updateObject({ lineHeight: Number(event.target.value) })
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs"
              />
            </label>
            <label className="text-[11px] font-medium text-slate-500">
              Letter spacing
              <input
                type="number"
                min={-1000}
                max={3000}
                step={10}
                value={Math.round(text.charSpacing ?? 0)}
                onChange={(event) =>
                  updateObject({ charSpacing: Number(event.target.value) })
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs"
              />
            </label>
            <label className="text-[11px] font-medium text-slate-500">
              Vertical align
              <select
                value={selectedObject.vvFigmaVerticalAlign ?? "top"}
                onChange={(event) =>
                  updateObject({ vvFigmaVerticalAlign: event.target.value })
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-500">
              Direction
              <select
                value={text.direction ?? "ltr"}
                onChange={(event) =>
                  updateObject({ direction: event.target.value })
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="ltr">Left to right</option>
                <option value="rtl">Right to left</option>
              </select>
            </label>
          </div>

          <ColorControl
            label="Text"
            value={text.fill}
            fallback="#111827"
            onChange={(fill) => updateTextStyle({ fill })}
          />
          <ColorControl
            label="Text background"
            value={text.textBackgroundColor}
            fallback="#ffffff"
            onChange={(textBackgroundColor) =>
              updateTextStyle({ textBackgroundColor })
            }
          />
          <ColorControl
            label="Outline"
            value={selectedObject.stroke}
            fallback="#111827"
            onChange={(stroke) =>
              updateTextStyle({
                stroke,
                strokeWidth: Math.max(textOutlineWidth, 1),
                paintFirst: "stroke",
              })
            }
          />
          <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
            <span>Outline width</span>
            <span className="tabular-nums text-slate-500">
              {Math.round(textOutlineWidth * 10) / 10} px
            </span>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={textOutlineWidth}
              onChange={(event) => {
                const strokeWidth = Number(event.target.value);
                updateTextStyle({
                  stroke:
                    strokeWidth > 0
                      ? (selectedObject.stroke ?? "#111827")
                      : null,
                  strokeWidth,
                  paintFirst: "stroke",
                });
              }}
              className="col-span-2 h-1.5 w-full cursor-pointer accent-blue-600"
            />
          </label>
          <ColorControl
            label="Decoration"
            value={text.textDecorationColor}
            fallback="#111827"
            onChange={(textDecorationColor) =>
              updateTextStyle({ textDecorationColor })
            }
          />
          <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
            <span>Decoration thickness</span>
            <span className="tabular-nums text-slate-500">
              {Math.round(text.textDecorationThickness ?? 66.667)}
            </span>
            <input
              type="range"
              min={10}
              max={300}
              step={5}
              value={text.textDecorationThickness ?? 66.667}
              onChange={(event) =>
                updateTextStyle({
                  textDecorationThickness: Number(event.target.value),
                })
              }
              className="col-span-2 h-1.5 w-full cursor-pointer accent-blue-600"
            />
          </label>
          <OpacityControl
            opacity={opacity}
            onChange={(nextOpacity) => updateObject({ opacity: nextOpacity })}
          />
        </div>
      ) : null}

      {selectionKind === "image" ? (
        <div className="space-y-3 py-2">
          <button
            type="button"
            onClick={onReplaceImage}
            className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Change image
          </button>
          <OpacityControl
            opacity={opacity}
            onChange={(nextOpacity) => updateObject({ opacity: nextOpacity })}
          />
        </div>
      ) : null}

      {showFill || showStroke ? (
        <div className="space-y-3 py-2">
          {showFill ? (
            <ColorControl
              label="Fill"
              value={selectedObject.fill}
              fallback="#3b82f6"
              onChange={(fill) => updateObject({ fill })}
            />
          ) : null}
          {showStroke ? (
            <>
              <ColorControl
                label="Stroke"
                value={selectedObject.stroke}
                fallback="#111827"
                onChange={(stroke) =>
                  updateObject({
                    stroke,
                    strokeWidth: Math.max(selectedObject.strokeWidth ?? 0, 1),
                  })
                }
              />
              <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
                <span>Stroke width</span>
                <span className="tabular-nums text-slate-500">
                  {Math.round(selectedObject.strokeWidth ?? 0)} px
                </span>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={Math.round(selectedObject.strokeWidth ?? 0)}
                  onChange={(event) =>
                    updateObject({ strokeWidth: Number(event.target.value) })
                  }
                  className="col-span-2 h-1.5 w-full cursor-pointer accent-blue-600"
                />
              </label>
            </>
          ) : null}
          {isRectangle ? (
            <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
              <span>Corner radius</span>
              <span className="tabular-nums text-slate-500">
                {rectangleRadius}%
              </span>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={rectangleRadius}
                onChange={(event) => {
                  const radius =
                    (Number(event.target.value) / 100) * rectangleShortestSide;
                  updateObject({ rx: radius, ry: radius });
                }}
                className="col-span-2 h-1.5 w-full cursor-pointer accent-blue-600"
              />
            </label>
          ) : null}
          <OpacityControl
            opacity={opacity}
            onChange={(nextOpacity) => updateObject({ opacity: nextOpacity })}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center justify-end gap-1 border-t border-slate-100 pt-2",
          selectionKind === "other" || selectionKind === "selection"
            ? "mt-2"
            : undefined,
        )}
      >
        <MenuAction
          label="Duplicate"
          icon={<Copy className="h-4 w-4" />}
          onClick={() => void onDuplicate()}
        />
        {selectionKind === "selection" ? (
          <MenuAction
            label="Merge"
            icon={<Combine className="h-4 w-4" />}
            onClick={onMerge}
          />
        ) : null}
        {isFabricGroupObject(selectedObject) ? (
          <MenuAction
            label="Ungroup"
            icon={<Ungroup className="h-4 w-4" />}
            onClick={() => onUngroup(selectedObject)}
          />
        ) : null}
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <MenuAction
          label="Delete"
          icon={<Trash2 className="h-4 w-4" />}
          destructive
          onClick={onDelete}
        />
      </div>
    </div>
  );
}

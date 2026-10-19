"use client";

import type { ReactNode } from "react";
import {
  ChevronDown,
  Circle,
  Image as ImageIcon,
  MousePointer2,
  PenTool,
  Pencil,
  RectangleHorizontal,
  SprayCan,
  Triangle,
  Type,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BRUSH_OPTIONS, SHAPE_OPTIONS } from "./fabricEditorConfig";
import type { BrushKind, EditorTool, ShapeKind } from "./fabricEditorTypes";

type FabricEditorToolDockProps = {
  activeTool: EditorTool;
  shapeKind: ShapeKind;
  brushKind: BrushKind;
  isInteracting: boolean;
  isShapePickerOpen: boolean;
  isBrushPickerOpen: boolean;
  onToolChange: (tool: EditorTool) => void;
  onShapeKindChange: (kind: ShapeKind) => void;
  onBrushKindChange: (kind: BrushKind) => void;
  onShapePickerOpenChange: (open: boolean) => void;
  onBrushPickerOpenChange: (open: boolean) => void;
  onOpenImagePicker: () => void;
};

function shapeIcon(kind: ShapeKind, className: string) {
  if (kind === "rect") return <RectangleHorizontal className={className} />;
  if (kind === "ellipse") return <Circle className={className} />;
  return <Triangle className={className} />;
}

function brushIcon(kind: BrushKind, className: string) {
  if (kind === "circle") return <Circle className={className} />;
  if (kind === "spray") return <SprayCan className={className} />;
  return <Pencil className={className} />;
}

export function FabricEditorToolDock({
  activeTool,
  shapeKind,
  brushKind,
  isInteracting,
  isShapePickerOpen,
  isBrushPickerOpen,
  onToolChange,
  onShapeKindChange,
  onBrushKindChange,
  onShapePickerOpenChange,
  onBrushPickerOpenChange,
  onOpenImagePicker,
}: FabricEditorToolDockProps) {
  const toolbarButton = (tool: EditorTool, label: string, icon: ReactNode) => (
    <button
      key={tool}
      type="button"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md border text-slate-600 transition",
        activeTool === tool
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white hover:bg-slate-50",
      )}
      onClick={() => onToolChange(tool)}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur transition-all duration-150",
          isInteracting
            ? "pointer-events-none translate-y-2 opacity-0"
            : "pointer-events-auto translate-y-0 opacity-100",
        )}
      >
        {toolbarButton(
          "pointer",
          "Pointer",
          <MousePointer2 className="h-4 w-4" />,
        )}
        {toolbarButton("text", "Text", <Type className="h-4 w-4" />)}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          onClick={onOpenImagePicker}
          title="Image"
          aria-label="Image"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <div
          className={cn(
            "flex items-center rounded-md border transition",
            activeTool === "shape"
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600",
          )}
        >
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-l-md hover:bg-slate-50"
            onClick={() => onToolChange("shape")}
            title={`Shape: ${SHAPE_OPTIONS.find((o) => o.kind === shapeKind)?.label ?? ""}`}
            aria-label="Shape tool"
            aria-pressed={activeTool === "shape"}
          >
            {shapeIcon(shapeKind, "h-4 w-4")}
          </button>
          <Popover
            open={isShapePickerOpen}
            onOpenChange={onShapePickerOpenChange}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-6 items-center justify-center rounded-r-md border-l border-slate-200 hover:bg-slate-50"
                title="Choose shape"
                aria-label="Choose shape"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              sideOffset={8}
              className="w-auto p-2"
            >
              <div className="flex items-center gap-1.5">
                {SHAPE_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => {
                      onShapeKindChange(option.kind);
                      onToolChange("shape");
                      onShapePickerOpenChange(false);
                    }}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md border transition",
                      shapeKind === option.kind
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={shapeKind === option.kind}
                  >
                    {shapeIcon(option.kind, "h-4 w-4")}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {toolbarButton("pen", "Pen", <PenTool className="h-4 w-4" />)}

        <div
          className={cn(
            "flex items-center rounded-md border transition",
            activeTool === "brush"
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600",
          )}
        >
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-l-md hover:bg-slate-50"
            onClick={() => onToolChange("brush")}
            title={`Brush: ${BRUSH_OPTIONS.find((o) => o.kind === brushKind)?.label ?? ""}`}
            aria-label="Brush tool"
            aria-pressed={activeTool === "brush"}
          >
            {brushIcon(brushKind, "h-4 w-4")}
          </button>
          <Popover
            open={isBrushPickerOpen}
            onOpenChange={onBrushPickerOpenChange}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-6 items-center justify-center rounded-r-md border-l border-slate-200 hover:bg-slate-50"
                title="Choose brush"
                aria-label="Choose brush"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              sideOffset={8}
              className="w-auto p-2"
            >
              <div className="flex items-center gap-1.5">
                {BRUSH_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => {
                      onBrushKindChange(option.kind);
                      onToolChange("brush");
                      onBrushPickerOpenChange(false);
                    }}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md border transition",
                      brushKind === option.kind
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={brushKind === option.kind}
                  >
                    {brushIcon(option.kind, "h-4 w-4")}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

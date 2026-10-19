"use client";

import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Combine,
  Copy,
  GripVertical,
  Image as ImageIcon,
  PaintBucket,
  Pencil,
  PenTool,
  RectangleHorizontal,
  Shapes,
  Scissors,
  Trash2,
  Triangle,
  Type,
  Ungroup,
  Square,
  SquareCheckBig,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FabricQuizAction } from "../../../shared/fabricScene";
import {
  getAnswerEditingState,
  hasAnswerSelectedState,
  type AnswerEditingState,
} from "./fabricAnswerStates";
import type { FabricObject } from "./fabricEditorTypes";
import { isFabricGroupObject, objectLabel } from "./fabricEditorUtils";

type LayerSection = "regular" | "buttons" | "answer";
type AnswerSelectionMode = "single" | "multiple";

const BUTTON_ACTION_OPTIONS: Array<{
  value: Exclude<FabricQuizAction, "answerBox">;
  label: string;
}> = [
  { value: "nextPage", label: "Next page" },
  { value: "previousPage", label: "Previous page" },
  { value: "startQuiz", label: "Start quiz" },
  { value: "confirmAnswer", label: "Confirm answers" },
  { value: "hyperlink", label: "Redirect" },
];

type FabricEditorLayerPanelProps = {
  header?: ReactNode;
  layers: FabricObject[];
  selectedObject: FabricObject | null;
  isBackgroundSelected: boolean;
  draggingLayerId: string | null;
  editingLayerId: string | null;
  editingLayerName: string;
  onDraggingLayerIdChange: (id: string | null) => void;
  onEditingLayerNameChange: (name: string) => void;
  onCancelRenameLayer: () => void;
  onSelectLayer: (object: FabricObject) => void;
  onSelectBackground: () => void;
  onDeleteLayer: (object: FabricObject) => void;
  onCopyLayer: (object: FabricObject) => void;
  onCutLayer: (object: FabricObject) => void;
  onUngroupLayer: (object: FabricObject) => void;
  onStartRenameLayer: (object: FabricObject) => void;
  onCommitRenameLayer: (object: FabricObject) => void;
  onReorderLayers: (draggedVvId: string, targetVvId: string) => void;
  canAssignActions?: boolean;
  answerSelectionMode?: AnswerSelectionMode;
  isSavingAnswerSelectionMode?: boolean;
  onAnswerSelectionModeChange?: (mode: AnswerSelectionMode) => void;
  onAnswerEditingStateChange?: (
    object: FabricObject,
    state: AnswerEditingState,
  ) => void;
  onChangeLayerAction: (
    object: FabricObject,
    action: FabricQuizAction | undefined,
  ) => void;
  onChangeLayerUrl: (object: FabricObject, url: string) => void;
  onDeletePage?: () => void;
  deletePageLabel?: string;
};

function getLayerSection(object: FabricObject): LayerSection {
  if (object.vvAction === "answerBox") return "answer";
  if (object.vvAction) return "buttons";
  return "regular";
}

function layerIcon(object: FabricObject, className: string) {
  if (isFabricGroupObject(object)) {
    return <Combine className={className} />;
  }

  switch (object.type) {
    case "rect":
      return <RectangleHorizontal className={className} />;
    case "ellipse":
    case "circle":
      return <Circle className={className} />;
    case "triangle":
      return <Triangle className={className} />;
    case "textbox":
    case "i-text":
    case "text":
      return <Type className={className} />;
    case "image":
      return <ImageIcon className={className} />;
    case "path":
      return <PenTool className={className} />;
    default:
      return <Shapes className={className} />;
  }
}

export function FabricEditorLayerPanel({
  header,
  layers,
  selectedObject,
  isBackgroundSelected,
  draggingLayerId,
  editingLayerId,
  editingLayerName,
  onDraggingLayerIdChange,
  onEditingLayerNameChange,
  onCancelRenameLayer,
  onSelectLayer,
  onSelectBackground,
  onDeleteLayer,
  onCopyLayer,
  onCutLayer,
  onUngroupLayer,
  onStartRenameLayer,
  onCommitRenameLayer,
  onReorderLayers,
  canAssignActions = true,
  answerSelectionMode = "single",
  isSavingAnswerSelectionMode = false,
  onAnswerSelectionModeChange,
  onAnswerEditingStateChange,
  onChangeLayerAction,
  onChangeLayerUrl,
  onDeletePage,
  deletePageLabel = "Delete page",
}: FabricEditorLayerPanelProps) {
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [contextMenu, setContextMenu] = useState<{
    object: FabricObject;
    x: number;
    y: number;
  } | null>(null);
  const [dropTargetSection, setDropTargetSection] =
    useState<LayerSection | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  const openContextMenu = (event: React.MouseEvent, object: FabricObject) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectLayer(object);
    const menuHeight = 156 + (isFabricGroupObject(object) ? 36 : 0);
    setContextMenu({
      object,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 176)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight)),
    });
  };
  const selectedLayerIds = useMemo(() => {
    if (!selectedObject) return new Set<string>();
    if (
      selectedObject.type?.toLowerCase() === "activeselection" &&
      typeof (selectedObject as { getObjects?: unknown }).getObjects ===
        "function"
    ) {
      return new Set(
        (selectedObject as FabricObject & { getObjects: () => FabricObject[] })
          .getObjects()
          .flatMap((object) => (object.vvId ? [object.vvId] : [])),
      );
    }
    return new Set(selectedObject.vvId ? [selectedObject.vvId] : []);
  }, [selectedObject]);

  const toggleGroup = (object: FabricObject) => {
    if (!object.vvId) return;
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(object.vvId!)) next.delete(object.vvId!);
      else next.add(object.vvId!);
      return next;
    });
  };

  const renderGroupChildren = (object: FabricObject, depth: number) => {
    if (
      !isFabricGroupObject(object) ||
      !object.vvId ||
      !expandedGroupIds.has(object.vvId)
    ) {
      return null;
    }

    return [...object.getObjects()].reverse().map((child, index) => {
      const childIsGroup = isFabricGroupObject(child);
      const childKey = child.vvId ?? `${object.vvId}-child-${index}`;
      const childExpanded =
        childIsGroup && Boolean(child.vvId && expandedGroupIds.has(child.vvId));

      return (
        <div key={childKey}>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm transition",
              child.vvId && selectedLayerIds.has(child.vvId)
                ? getLayerSection(child) !== "regular"
                  ? "bg-blue-50 text-violet-700"
                  : "bg-blue-50 text-blue-700"
                : getLayerSection(child) !== "regular"
                  ? "text-violet-700 hover:bg-slate-50"
                  : "text-slate-500 hover:bg-slate-50",
            )}
            style={{ paddingLeft: 8 + depth * 18 }}
            onContextMenu={(event) => openContextMenu(event, child)}
          >
            {childIsGroup ? (
              <button
                type="button"
                onClick={() => toggleGroup(child)}
                className="shrink-0 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={childExpanded ? "Collapse group" : "Expand group"}
                aria-expanded={childExpanded}
              >
                {childExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" aria-hidden="true" />
            )}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelectLayer(child)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSelectLayer(child);
              }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {layerIcon(child, "h-3.5 w-3.5 shrink-0")}
              {editingLayerId === child.vvId ? (
                <input
                  autoFocus
                  value={editingLayerName}
                  onChange={(event) =>
                    onEditingLayerNameChange(event.target.value)
                  }
                  onBlur={() => onCommitRenameLayer(child)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") onCommitRenameLayer(child);
                    if (event.key === "Escape") onCancelRenameLayer();
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="min-w-0 flex-1 rounded border border-blue-300 px-1 py-0.5 text-sm outline-none"
                />
              ) : (
                <span
                  className="min-w-0 flex-1 truncate"
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    onStartRenameLayer(child);
                  }}
                >
                  {objectLabel(child)}
                </span>
              )}
            </div>
          </div>
          {renderGroupChildren(child, depth + 1)}
        </div>
      );
    });
  };

  const layersBySection: Record<LayerSection, FabricObject[]> = {
    regular: canAssignActions
      ? layers.filter((layer) => getLayerSection(layer) === "regular")
      : layers,
    buttons: canAssignActions
      ? layers.filter((layer) => getLayerSection(layer) === "buttons")
      : [],
    answer: canAssignActions
      ? layers.filter((layer) => getLayerSection(layer) === "answer")
      : [],
  };

  const handleLayerDragStart = (
    event: DragEvent<HTMLDivElement>,
    layer: FabricObject,
  ) => {
    if (!layer.vvId) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-vision-verse-layer", layer.vvId);
    event.dataTransfer.setData("text/plain", objectLabel(layer));

    const dragPreview = document.createElement("div");
    dragPreview.style.position = "fixed";
    dragPreview.style.top = "-1000px";
    dragPreview.style.left = "-1000px";
    dragPreview.style.maxWidth = "220px";
    dragPreview.style.overflow = "hidden";
    dragPreview.style.textOverflow = "ellipsis";
    dragPreview.style.whiteSpace = "nowrap";
    dragPreview.style.border = "1px solid #cbd5e1";
    dragPreview.style.borderRadius = "8px";
    dragPreview.style.background = "#ffffff";
    dragPreview.style.padding = "8px 12px";
    dragPreview.style.color = "#334155";
    dragPreview.style.font = "500 12px system-ui, sans-serif";
    dragPreview.style.boxShadow = "0 8px 20px rgb(15 23 42 / 0.14)";
    dragPreview.textContent = objectLabel(layer);
    document.body.appendChild(dragPreview);
    event.dataTransfer.setDragImage(dragPreview, 16, 16);
    window.setTimeout(() => dragPreview.remove(), 0);

    onDraggingLayerIdChange(layer.vvId);
  };

  const handleLayerDrop = (
    event: DragEvent<HTMLElement>,
    targetSection: LayerSection,
    targetVvId?: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedVvId =
      draggingLayerId ||
      event.dataTransfer.getData("application/x-vision-verse-layer");
    const draggedLayer = layers.find((layer) => layer.vvId === draggedVvId);
    if (!draggedLayer || !draggedVvId) {
      setDropTargetSection(null);
      return;
    }

    const sourceSection = canAssignActions
      ? getLayerSection(draggedLayer)
      : "regular";
    if (canAssignActions && sourceSection !== targetSection) {
      onChangeLayerAction(
        draggedLayer,
        targetSection === "answer"
          ? "answerBox"
          : targetSection === "buttons"
            ? "nextPage"
            : undefined,
      );
    }
    if (targetVvId && targetVvId !== draggedVvId) {
      onReorderLayers(draggedVvId, targetVvId);
    }

    setDropTargetSection(null);
    onDraggingLayerIdChange(null);
  };

  const renderButtonMapping = (layer: FabricObject) => {
    if (getLayerSection(layer) !== "buttons") return null;
    const action = layer.vvAction as Exclude<FabricQuizAction, "answerBox">;

    return (
      <div className="mb-1 ml-7 mr-1 space-y-1.5 rounded-md border border-violet-100 bg-violet-50/60 p-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-violet-600">
            Action
          </span>
          <select
            value={action}
            onChange={(event) =>
              onChangeLayerAction(
                layer,
                event.target.value as Exclude<FabricQuizAction, "answerBox">,
              )
            }
            onPointerDown={(event) => event.stopPropagation()}
            className="h-7 w-full rounded border border-violet-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            aria-label={`${objectLabel(layer)} button action`}
          >
            {BUTTON_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {action === "hyperlink" ? (
          <label className="block">
            <span className="sr-only">Website URL</span>
            <input
              type="url"
              inputMode="url"
              value={
                typeof layer.vvActionProps?.url === "string"
                  ? layer.vvActionProps.url
                  : ""
              }
              onChange={(event) => onChangeLayerUrl(layer, event.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="https://example.com"
              aria-label={`${objectLabel(layer)} redirect URL`}
              className="h-7 w-full rounded border border-violet-200 bg-white px-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </label>
        ) : null}
      </div>
    );
  };

  const renderLayer = (
    layer: FabricObject,
    index: number,
    section: LayerSection,
  ) => {
    const isGroup = isFabricGroupObject(layer);
    const isExpanded = Boolean(
      isGroup && layer.vvId && expandedGroupIds.has(layer.vvId),
    );
    const isSelected = Boolean(layer.vvId && selectedLayerIds.has(layer.vvId));
    const answerEditingState = getAnswerEditingState(layer);
    const hasSelectedState = hasAnswerSelectedState(layer);

    return (
      <div key={layer.vvId ?? `${section}-layer-${index}`}>
        <div
          draggable={Boolean(layer.vvId)}
          onContextMenu={(event) => openContextMenu(event, layer)}
          onDragStart={(event) => handleLayerDragStart(event, layer)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTargetSection(section);
          }}
          onDrop={(event) => handleLayerDrop(event, section, layer.vvId)}
          onDragEnd={() => {
            setDropTargetSection(null);
            onDraggingLayerIdChange(null);
          }}
          className={cn(
            "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition",
            isSelected && section === "regular" && "bg-blue-50 text-blue-700",
            isSelected &&
              section === "buttons" &&
              "bg-violet-100 text-violet-800",
            isSelected &&
              section === "answer" &&
              "bg-emerald-100 text-emerald-800",
            !isSelected &&
              section === "regular" &&
              "text-slate-700 hover:bg-slate-50",
            !isSelected &&
              section === "buttons" &&
              "text-violet-700 hover:bg-violet-50",
            !isSelected &&
              section === "answer" &&
              "text-emerald-700 hover:bg-emerald-50",
            draggingLayerId === layer.vvId && "opacity-40",
          )}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-400" />
          {isGroup ? (
            <button
              type="button"
              onClick={() => toggleGroup(layer)}
              className="shrink-0 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={isExpanded ? "Collapse group" : "Expand group"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectLayer(layer)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSelectLayer(layer);
            }}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5"
          >
            {layerIcon(layer, "h-3.5 w-3.5 shrink-0")}
            {editingLayerId === layer.vvId ? (
              <input
                autoFocus
                value={editingLayerName}
                onChange={(event) =>
                  onEditingLayerNameChange(event.target.value)
                }
                onBlur={() => onCommitRenameLayer(layer)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onCommitRenameLayer(layer);
                  if (event.key === "Escape") onCancelRenameLayer();
                }}
                onClick={(event) => event.stopPropagation()}
                className="min-w-0 flex-1 rounded border border-blue-300 px-1 py-0.5 text-sm outline-none"
              />
            ) : (
              <span
                className="min-w-0 flex-1 truncate"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  onStartRenameLayer(layer);
                }}
              >
                {objectLabel(layer)}
              </span>
            )}
          </div>
          {section === "answer" && onAnswerEditingStateChange ? (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onDragStart={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelectLayer(layer);
                onAnswerEditingStateChange(
                  layer,
                  answerEditingState === "selected" ? "unselected" : "selected",
                );
              }}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                answerEditingState === "selected"
                  ? "bg-emerald-100 text-emerald-800"
                  : hasSelectedState
                    ? "text-emerald-700 hover:bg-emerald-50"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
              )}
              title={
                answerEditingState === "selected"
                  ? "Editing selected state"
                  : "Edit selected state"
              }
              aria-label={`${objectLabel(layer)} selected state`}
              aria-pressed={answerEditingState === "selected"}
            >
              {answerEditingState === "selected" ? (
                <SquareCheckBig className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              <span>Selected</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDeleteLayer(layer)}
            className="shrink-0 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
            title="Delete"
            aria-label="Delete layer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {renderButtonMapping(layer)}
        {renderGroupChildren(layer, 1)}
      </div>
    );
  };

  const renderSection = (
    section: LayerSection,
    label: string,
    sectionLayers: FabricObject[],
  ) => (
    <section className="mt-3" aria-labelledby={`layer-section-${section}`}>
      <div className="mb-1 flex items-center gap-2 px-1">
        <h2
          id={`layer-section-${section}`}
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
        >
          {label}
        </h2>
        <span className="text-[10px] tabular-nums text-slate-400">
          {sectionLayers.length}
        </span>
      </div>
      {section === "answer" && onAnswerSelectionModeChange ? (
        <label className="mb-1.5 flex items-center justify-between gap-3 rounded-md border border-emerald-100 bg-emerald-50/60 px-2 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Answer type
          </span>
          <select
            value={answerSelectionMode}
            disabled={isSavingAnswerSelectionMode}
            onChange={(event) =>
              onAnswerSelectionModeChange(
                event.target.value as AnswerSelectionMode,
              )
            }
            className="h-7 min-w-0 flex-1 rounded border border-emerald-200 bg-white pl-2 pr-7 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
          >
            <option value="single">Single choice</option>
            <option value="multiple">Multiple choice</option>
          </select>
        </label>
      ) : null}
      <div
        onDragOver={(event) => {
          if (!draggingLayerId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTargetSection(section);
        }}
        onDrop={(event) => handleLayerDrop(event, section)}
        className={cn(
          "min-h-10 rounded-lg border border-transparent p-0.5 transition-colors",
          dropTargetSection === section &&
            (section === "regular"
              ? "border-blue-300 bg-blue-50/70"
              : section === "buttons"
                ? "border-violet-300 bg-violet-50/70"
                : "border-emerald-300 bg-emerald-50/70"),
        )}
      >
        {sectionLayers.length > 0 ? (
          sectionLayers.map((layer, index) =>
            renderLayer(layer, index, section),
          )
        ) : (
          <p className="px-2 py-2 text-center text-[11px] text-slate-400">
            {dropTargetSection === section ? "Drop here" : "Drag layers here"}
          </p>
        )}
      </div>
      {section === "answer" &&
      answerSelectionMode === "multiple" &&
      !layersBySection.buttons.some(
        (layer) => layer.vvAction === "confirmAnswer",
      ) ? (
        <p className="mx-1 mt-1.5 text-[10px] leading-4 text-amber-700">
          Add a Confirm answers button for multiple choice.
        </p>
      ) : null}
      {section === "answer" &&
      answerSelectionMode === "multiple" &&
      sectionLayers.some((layer) => !hasAnswerSelectedState(layer)) ? (
        <p className="mx-1 mt-1.5 text-[10px] leading-4 text-amber-700">
          Set a selected state for every answer.{" "}
          {
            sectionLayers.filter((layer) => !hasAnswerSelectedState(layer))
              .length
          }{" "}
          missing.
        </p>
      ) : null}
    </section>
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r bg-white">
      {header ? <div className="border-b px-2 py-2">{header}</div> : null}
      <div className="flex-1 overflow-auto p-2">
        <button
          type="button"
          onClick={onSelectBackground}
          aria-pressed={isBackgroundSelected}
          className={cn(
            "mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition",
            isBackgroundSelected
              ? "bg-blue-50 text-blue-700"
              : "text-slate-700 hover:bg-slate-50",
          )}
        >
          <span className="w-3.5 shrink-0" aria-hidden="true" />
          <PaintBucket className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Background</span>
        </button>
        {canAssignActions ? (
          <>
            {renderSection("regular", "Regular", layersBySection.regular)}
            {renderSection("buttons", "Buttons", layersBySection.buttons)}
            {renderSection("answer", "Answer", layersBySection.answer)}
          </>
        ) : (
          renderSection("regular", "Regular", layersBySection.regular)
        )}
      </div>
      {onDeletePage ? (
        <div className="border-t border-slate-200 p-2">
          <button
            type="button"
            onClick={onDeletePage}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="h-4 w-4" />
            {deletePageLabel}
          </button>
        </div>
      ) : null}
      {contextMenu ? (
        <div
          role="menu"
          aria-label={`${objectLabel(contextMenu.object)} actions`}
          className="fixed z-50 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onStartRenameLayer(contextMenu.object);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCopyLayer(contextMenu.object);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
            <span className="ml-auto text-[10px] text-slate-400">⌘C</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCutLayer(contextMenu.object);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
          >
            <Scissors className="h-3.5 w-3.5" />
            Cut
            <span className="ml-auto text-[10px] text-slate-400">⌘X</span>
          </button>
          {isFabricGroupObject(contextMenu.object) ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onUngroupLayer(contextMenu.object);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              <Ungroup className="h-3.5 w-3.5" />
              Ungroup
              <span className="ml-auto text-[10px] text-slate-400">⇧⌘G</span>
            </button>
          ) : null}
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteLayer(contextMenu.object);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ) : null}
    </aside>
  );
}

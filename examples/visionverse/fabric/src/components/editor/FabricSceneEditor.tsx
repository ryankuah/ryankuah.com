"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type * as FabricTypes from "fabric";
import {
  ClipboardPaste,
  Copy,
  CopyPlus,
  Pencil,
  Trash2,
  Ungroup,
} from "lucide-react";
import { toast } from "sonner";
import { FabricBackgroundMenu } from "./FabricBackgroundMenu";
import {
  applyAnswerVisualState,
  captureAnswerVisualState,
  clearAnswerVisualStates,
  cloneAnswerVisualState,
  getAnswerEditingState,
  getAnswerVisualStates,
  setAnswerVisualStates,
  storeCurrentAnswerVisualState,
  type AnswerEditingState,
} from "./fabricAnswerStates";
import { FabricEditorLayerPanel } from "./FabricEditorLayerPanel";
import { FabricEditorToolDock } from "./FabricEditorToolDock";
import { FabricSelectionMenu } from "./FabricSelectionMenu";
import ImagePickerDialog from "@/components/quiz/ImagePickerDialog";
import {
  getPersistedFigmaImageSizeRepair,
  isFigmaPluginImportText,
} from "@/lib/figmaImport";
import {
  ensureFontFamilyLoaded,
  ensureSceneFontsLoaded,
  getFontFamilyStack,
  getSceneFontFamilies,
  sceneHasUnnormalizedFontFamilies,
} from "@/lib/fontRegistry";
import { cn } from "@/lib/utils";
import { registerFabricQuizProperties } from "@/lib/fabricSetup";
import {
  FIT_BOTTOM_CLEARANCE,
  FIT_VIEWPORT_PADDING,
  PEN_ANCHOR_RADIUS,
  PEN_HANDLE_RADIUS,
  PEN_STROKE_COLOR,
  PHONE_FRAME_BORDER,
  PHONE_FRAME_RADIUS,
  RESULT_EDITOR_BOTTOM_BUFFER,
  SHAPE_DEFAULT_SIZE,
  SHAPE_DRAG_CLICK_THRESHOLD,
} from "./fabricEditorConfig";
import type {
  BrushKind,
  EditorTool,
  FabricCanvas,
  FabricModule,
  FabricObject,
  PenAnchor,
  PenPoint,
  PenPointerEvent,
  ShapeKind,
  ViewportPanState,
} from "./fabricEditorTypes";
import {
  applyAutoWidth,
  applyEditorControls,
  applyFigmaComponentProperty,
  applyFigmaTextFrameLayout,
  assignFreshObjectIds,
  canvasLoadJson,
  clampViewportTransform,
  clampZoom,
  clearFabricTextMeasurementCache,
  configureFabricEditorControlDefaults,
  createId,
  editableEventTarget,
  eventClientPoint,
  getFabricObjectParent,
  getTopLevelFabricObject,
  isArtboardGuideObject,
  isFabricGroupObject,
  isFabricObjectOnCanvas,
  normalizeFigmaGroupResize,
  objectLabel,
  serializeCanvas,
  wheelPixelDelta,
} from "./fabricEditorUtils";
import { buildPenPathDefinition, isPenPathClosingPoint } from "./fabricPenPath";
import {
  FABRIC_CUSTOM_PROPERTIES,
  MIN_RESULT_ARTBOARD_HEIGHT,
  RESULT_ARTBOARD_BOTTOM_PADDING,
  normalizeFabricQuizScene,
  type FabricQuizAction,
  type FabricObjectJson,
  type FabricQuizScene,
  type FabricSceneBackground,
} from "../../../shared/fabricScene";
import type { Image as ImageAsset } from "@/types";

type Tool = EditorTool;

type PageViewportTransform = [number, number, number, number, number, number];

type ImagePickerTarget =
  | { kind: "background" }
  | { kind: "object"; object: FabricObject }
  | null;

type CanvasContextMenuState = {
  object: FabricObject | null;
  point: PenPoint;
  x: number;
  y: number;
};

function isPrimaryPointerEvent(event: PenPointerEvent["e"]) {
  return !("button" in event) || event.button === 0;
}

function cssUrl(url: string) {
  return `url(${JSON.stringify(url)})`;
}

function roundedRectSubpath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const right = x + width;
  const bottom = y + height;
  return [
    `M ${x + radius} ${y}`,
    `H ${right - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${y + radius}`,
    `V ${bottom - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
    `H ${x + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x} ${bottom - radius}`,
    `V ${y + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

function raiseArtboardOverlays(canvas: FabricCanvas) {
  for (const id of ["__artboard-corner-mask", "__artboard-bezel"]) {
    const overlay = (canvas.getObjects() as FabricObject[]).find(
      (object) => object.vvId === id,
    );
    if (overlay) canvas.moveObjectTo(overlay, canvas.getObjects().length - 1);
  }
}

type FabricSceneEditorProps = {
  scene?: FabricQuizScene;
  sceneKey?: string;
  images?: ImageAsset[];
  pageType?: "page" | "result";
  answerSelectionMode?: "single" | "multiple";
  isSavingAnswerSelectionMode?: boolean;
  onAnswerSelectionModeChange?: (mode: "single" | "multiple") => void;
  onFigmaPaste?: (content: string) => void;
  sidebarHeader?: ReactNode;
  onSaveScene: (scene: FabricQuizScene) => Promise<void> | void;
  onDeletePage?: () => void;
  deletePageLabel?: string;
  className?: string;
};

export function FabricSceneEditor({
  scene,
  sceneKey,
  images = [],
  pageType = "page",
  answerSelectionMode = "single",
  isSavingAnswerSelectionMode = false,
  onAnswerSelectionModeChange,
  onFigmaPaste,
  sidebarHeader,
  onSaveScene,
  onDeletePage,
  deletePageLabel,
  className,
}: FabricSceneEditorProps) {
  const workspaceViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const historyCaptureTimerRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);
  const isSavingRef = useRef(false);
  const loadTokenRef = useRef(0);
  const loadChainRef = useRef<Promise<void>>(Promise.resolve());
  const historyRestoreChainRef = useRef<Promise<void>>(Promise.resolve());
  const historyRef = useRef<{ entries: string[]; index: number }>({
    entries: [],
    index: -1,
  });
  const recordHistoryRef = useRef<() => void>(() => undefined);
  const resetHistoryRef = useRef<() => void>(() => undefined);
  const activeToolRef = useRef<Tool>("pointer");
  const shapeKindRef = useRef<ShapeKind>("rect");
  const brushKindRef = useRef<BrushKind>("pencil");
  const penAnchorsRef = useRef<PenAnchor[]>([]);
  const penDragIndexRef = useRef<number | null>(null);
  const penMousePosRef = useRef<PenPoint | null>(null);
  const viewportPanStateRef = useRef<ViewportPanState | null>(null);
  const viewportCursorRef = useRef<{
    defaultCursor: string;
    hoverCursor: string;
  } | null>(null);
  const isSpacePressedRef = useRef(false);
  const scheduleSaveRef = useRef<() => void>(() => undefined);
  const writeSceneRef = useRef<() => Promise<void>>(async () => undefined);
  const refreshLayersRef = useRef<() => void>(() => undefined);
  const syncResultArtboardHeightRef = useRef<() => void>(() => undefined);
  const imagePickerTargetRef = useRef<ImagePickerTarget>(null);
  const clipboardObjectRef = useRef<FabricObject | null>(null);
  const undoRef = useRef<() => void>(() => undefined);
  const redoRef = useRef<() => void>(() => undefined);
  const copyRef = useRef<() => void>(() => undefined);
  const cutRef = useRef<() => void>(() => undefined);
  const pasteRef = useRef<() => void>(() => undefined);
  const ungroupRef = useRef<(group: FabricObject) => void>(() => undefined);
  const normalizedScene = useMemo(
    () => normalizeFabricQuizScene(scene),
    [scene],
  );
  // Frozen at mount: every consumer remounts this component (via a
  // `key={sceneKey}`) when the user switches to a different page, so this
  // never needs to change within one mounted instance's lifetime. Loading
  // from `normalizedScene` directly instead would re-run the load effect
  // (and its `setSelectedObject(null)`) every time the parent's `getQuiz`
  // query happens to refetch — including right after this editor's own
  // autosave round-trips — silently clearing the user's selection ~1s after
  // any edit even though nothing about the loaded content actually changed.
  const initialSceneToLoadRef = useRef(normalizedScene);
  const [sceneFontFamilies, setSceneFontFamilies] = useState(() =>
    getSceneFontFamilies(initialSceneToLoadRef.current.fabric),
  );
  const { artboard } = initialSceneToLoadRef.current;
  const [background, setBackground] = useState<FabricSceneBackground>(() => ({
    ...initialSceneToLoadRef.current.background,
  }));
  const backgroundRef = useRef(background);
  const isResultEditor = pageType === "result";
  const [resultArtboardHeight, setResultArtboardHeight] = useState(() =>
    isResultEditor
      ? Math.max(MIN_RESULT_ARTBOARD_HEIGHT, artboard.height)
      : artboard.height,
  );
  const resultArtboardHeightRef = useRef(resultArtboardHeight);
  const resultViewportScaleRef = useRef(1);
  const currentArtboardRef = useRef({
    ...artboard,
    height: isResultEditor ? resultArtboardHeight : artboard.height,
  });
  const [canvasReady, setCanvasReady] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("pointer");
  const [shapeKind, setShapeKind] = useState<ShapeKind>("rect");
  const [brushKind, setBrushKind] = useState<BrushKind>("pencil");
  const [isShapePickerOpen, setIsShapePickerOpen] = useState(false);
  const [isBrushPickerOpen, setIsBrushPickerOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(
    null,
  );
  const [, setTextSelectionRevision] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  // Front-most first (Figma convention), guides excluded.
  const [layers, setLayers] = useState<FabricObject[]>([]);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState("");
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isBackgroundSelected, setIsBackgroundSelected] = useState(false);
  const [canvasContextMenu, setCanvasContextMenu] =
    useState<CanvasContextMenuState | null>(null);
  const [pageViewportTransform, setPageViewportTransform] =
    useState<PageViewportTransform>([1, 0, 0, 1, 0, 0]);

  const buildCurrentScene = useCallback((): FabricQuizScene | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const syncAnswerStates = (object: FabricObject) => {
      storeCurrentAnswerVisualState(object);
      if (isFabricGroupObject(object)) {
        object.getObjects().forEach(syncAnswerStates);
      }
    };
    (canvas.getObjects() as FabricObject[]).forEach(syncAnswerStates);

    const current = normalizeFabricQuizScene(scene);
    const currentArtboard = currentArtboardRef.current;
    const workspace = {
      width: current.workspace.width,
      height: Math.max(
        current.workspace.height,
        currentArtboard.y +
          currentArtboard.height +
          RESULT_ARTBOARD_BOTTOM_PADDING,
      ),
    };
    const fabric = serializeCanvas(canvas, workspace);
    return {
      schemaVersion: 1,
      workspace,
      artboard: { ...currentArtboard },
      background: { ...backgroundRef.current },
      fabric,
    };
  }, [scene]);

  const recordHistory = useCallback(() => {
    if (isLoadingRef.current) return;
    const snapshot = buildCurrentScene();
    if (!snapshot) return;
    const serialized = JSON.stringify(snapshot);
    const history = historyRef.current;
    if (history.entries[history.index] === serialized) return;

    const entries = history.entries.slice(0, history.index + 1);
    entries.push(serialized);
    if (entries.length > 100) entries.shift();
    historyRef.current = { entries, index: entries.length - 1 };
  }, [buildCurrentScene]);

  const resetHistory = useCallback(() => {
    const snapshot = buildCurrentScene();
    if (!snapshot) return;
    historyRef.current = {
      entries: [JSON.stringify(snapshot)],
      index: 0,
    };
  }, [buildCurrentScene]);

  const writeScene = useCallback(async () => {
    if (isLoadingRef.current) return;
    const nextScene = buildCurrentScene();
    if (!nextScene) return;

    isSavingRef.current = true;
    try {
      await onSaveScene(nextScene);
    } catch (error) {
      console.error("Failed to save Fabric scene", error);
      toast.error("Failed to save canvas");
    } finally {
      isSavingRef.current = false;
    }
  }, [buildCurrentScene, onSaveScene]);

  const scheduleSave = useCallback(() => {
    if (isLoadingRef.current) return;
    if (historyCaptureTimerRef.current === null) {
      historyCaptureTimerRef.current = window.setTimeout(() => {
        historyCaptureTimerRef.current = null;
        recordHistoryRef.current();
      }, 0);
    }
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void writeScene();
    }, 500);
  }, [writeScene]);

  const refreshLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas
      .getObjects()
      .filter((object) => !isArtboardGuideObject(object as FabricObject))
      .reverse() as FabricObject[];
    setLayers(objects);
  }, []);

  const applyResultViewportTransform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isResultEditor) return;
    const scale = resultViewportScaleRef.current;
    const transform: PageViewportTransform = [
      scale,
      0,
      0,
      scale,
      canvas.getWidth() / 2 - (artboard.x + artboard.width / 2) * scale,
      FIT_VIEWPORT_PADDING - artboard.y * scale,
    ];
    canvas.setViewportTransform(transform);
    setPageViewportTransform(transform);
    canvas.clearContext(canvas.contextTop);
    canvas.requestRenderAll();
  }, [artboard.width, artboard.x, artboard.y, isResultEditor]);

  const syncResultArtboardHeight = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isResultEditor || isLoadingRef.current) return;

    const contentBottom = canvas
      .getObjects()
      .filter((object) => !isArtboardGuideObject(object as FabricObject))
      .reduce(
        (bottom, object) => {
          const bounds = object.getBoundingRect();
          return Math.max(bottom, bounds.top + bounds.height);
        },
        artboard.y +
          MIN_RESULT_ARTBOARD_HEIGHT -
          RESULT_ARTBOARD_BOTTOM_PADDING,
      );
    const nextHeight = Math.max(
      MIN_RESULT_ARTBOARD_HEIGHT,
      Math.ceil(contentBottom - artboard.y + RESULT_ARTBOARD_BOTTOM_PADDING),
    );
    if (nextHeight === resultArtboardHeightRef.current) return;

    resultArtboardHeightRef.current = nextHeight;
    currentArtboardRef.current = {
      ...currentArtboardRef.current,
      height: nextHeight,
    };
    setResultArtboardHeight(nextHeight);
    scheduleSaveRef.current();
  }, [artboard.y, isResultEditor]);

  useEffect(() => {
    syncResultArtboardHeightRef.current = syncResultArtboardHeight;
  }, [syncResultArtboardHeight]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    shapeKindRef.current = shapeKind;
  }, [shapeKind]);

  useEffect(() => {
    brushKindRef.current = brushKind;
  }, [brushKind]);

  useEffect(() => {
    if (!canvasContextMenu) return;
    const close = () => setCanvasContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasContextMenu]);

  useEffect(() => {
    scheduleSaveRef.current = scheduleSave;
  }, [scheduleSave]);

  useEffect(() => {
    recordHistoryRef.current = recordHistory;
    resetHistoryRef.current = resetHistory;
  }, [recordHistory, resetHistory]);

  useEffect(() => {
    writeSceneRef.current = writeScene;
  }, [writeScene]);

  useEffect(() => {
    refreshLayersRef.current = refreshLayers;
  }, [refreshLayers]);

  const setViewportCursor = useCallback(
    (cursor: "grab" | "grabbing" | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (cursor) {
        if (!viewportCursorRef.current) {
          viewportCursorRef.current = {
            defaultCursor: canvas.defaultCursor,
            hoverCursor: canvas.hoverCursor,
          };
        }
        canvas.defaultCursor = cursor;
        canvas.hoverCursor = cursor;
        canvas.upperCanvasEl.style.cursor = cursor;
        return;
      }

      const previous = viewportCursorRef.current;
      if (previous) {
        canvas.defaultCursor = previous.defaultCursor;
        canvas.hoverCursor = previous.hoverCursor;
        viewportCursorRef.current = null;
      }
      canvas.upperCanvasEl.style.cursor = canvas.defaultCursor;
    },
    [],
  );

  const applyViewportTransform = useCallback(
    (vpt: number[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const clamped = clampViewportTransform(
        vpt,
        canvas.getWidth(),
        canvas.getHeight(),
        artboard,
      );
      canvas.setViewportTransform(clamped);
      setPageViewportTransform([...clamped] as PageViewportTransform);
      canvas.clearContext(canvas.contextTop);
    },
    [artboard],
  );

  const stopViewportPan = useCallback(() => {
    const state = viewportPanStateRef.current;
    if (!state) return;

    viewportPanStateRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.selection = state.previousSelection;
      canvas.skipTargetFind = state.previousSkipTargetFind;
      canvas.isDrawingMode = state.previousDrawingMode;
      canvas.requestRenderAll();
    }
    setIsInteracting(false);
    setViewportCursor(isSpacePressedRef.current ? "grab" : null);
  }, [setViewportCursor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isResultEditor) return;
      if (event.code !== "Space" || event.repeat) return;
      if (editableEventTarget(event.target)) return;
      isSpacePressedRef.current = true;
      event.preventDefault();
      if (!viewportPanStateRef.current) setViewportCursor("grab");
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      isSpacePressedRef.current = false;
      if (!viewportPanStateRef.current) setViewportCursor(null);
    };

    const handleBlur = () => {
      isSpacePressedRef.current = false;
      stopViewportPan();
      setViewportCursor(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isResultEditor, setViewportCursor, stopViewportPan]);

  const addArtboardGuide = useCallback(() => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    canvas
      .getObjects()
      .filter((object) => isArtboardGuideObject(object as FabricObject))
      .forEach((object) => canvas.remove(object));

    const artboard = initialSceneToLoadRef.current.artboard;
    const editorArtboardHeight = isResultEditor
      ? resultArtboardHeightRef.current + RESULT_EDITOR_BOTTOM_BUFFER
      : artboard.height;

    // Solid bezel behind a flush screen inset, rather than a stroked outline:
    // a centered stroke on an inset rect leaves a gap showing the canvas
    // background between the frame and the screen, and reads as two
    // mismatched rounded rects instead of one phone silhouette.
    const frame = new fabric.Rect({
      left: artboard.x - PHONE_FRAME_BORDER,
      top: artboard.y - PHONE_FRAME_BORDER,
      width: artboard.width + PHONE_FRAME_BORDER * 2,
      height: editorArtboardHeight + PHONE_FRAME_BORDER * 2,
      rx: PHONE_FRAME_RADIUS,
      ry: PHONE_FRAME_RADIUS,
      fill: "#020617",
      selectable: false,
      evented: false,
      excludeFromExport: true,
      objectCaching: false,
    }) as FabricObject;
    frame.vvId = "__artboard-frame";

    const screen = new fabric.Rect({
      left: artboard.x,
      top: artboard.y,
      width: artboard.width,
      height: editorArtboardHeight,
      rx: PHONE_FRAME_RADIUS - PHONE_FRAME_BORDER,
      ry: PHONE_FRAME_RADIUS - PHONE_FRAME_BORDER,
      // A transparent fill would still leave the solid frame visible beneath
      // the screen. Punch the screen out of the bezel so the dedicated DOM
      // background layer (color/image) can show through the Fabric canvas.
      fill: "#000000",
      globalCompositeOperation: "destination-out",
      selectable: false,
      evented: false,
      excludeFromExport: true,
      objectCaching: false,
    }) as FabricObject;
    screen.vvId = "__artboard-screen";

    // Keep the solid frame and its screen cutout behind the page contents.
    // A separate, transparent bezel is placed at the very top so objects that
    // touch an edge disappear beneath the phone shell instead of covering it.
    canvas.insertAt(0, frame, screen);

    const outerWidth = artboard.width + PHONE_FRAME_BORDER * 2;
    const outerHeight = editorArtboardHeight + PHONE_FRAME_BORDER * 2;
    const outerPath = roundedRectSubpath(
      0,
      0,
      outerWidth,
      outerHeight,
      PHONE_FRAME_RADIUS,
    );
    const innerPath = roundedRectSubpath(
      PHONE_FRAME_BORDER,
      PHONE_FRAME_BORDER,
      artboard.width,
      editorArtboardHeight,
      PHONE_FRAME_RADIUS - PHONE_FRAME_BORDER,
    );
    const squarePath = `M 0 0 H ${outerWidth} V ${outerHeight} H 0 Z`;

    // Erase square artwork corners that fall outside the rounded phone shell.
    // Keeping this transparent is important: a painted mask would introduce a
    // visible rectangle whenever the workspace color differs from the mask.
    const cornerMask = new fabric.Path(`${squarePath} ${outerPath}`, {
      left: artboard.x - PHONE_FRAME_BORDER,
      top: artboard.y - PHONE_FRAME_BORDER,
      fill: "#000000",
      fillRule: "evenodd",
      globalCompositeOperation: "destination-out",
      selectable: false,
      evented: false,
      excludeFromExport: true,
      objectCaching: false,
    }) as FabricObject;
    cornerMask.vvId = "__artboard-corner-mask";

    // A true outer-minus-inner ring keeps the visible bezel at exactly the
    // configured thickness instead of doubling it with a centered stroke.
    const bezel = new fabric.Path(`${outerPath} ${innerPath}`, {
      left: artboard.x - PHONE_FRAME_BORDER,
      top: artboard.y - PHONE_FRAME_BORDER,
      fill: "#020617",
      fillRule: "evenodd",
      selectable: false,
      evented: false,
      excludeFromExport: true,
      objectCaching: false,
    }) as FabricObject;
    bezel.vvId = "__artboard-bezel";
    canvas.add(cornerMask, bezel);
    canvas.requestRenderAll();
  }, [isResultEditor]);

  useEffect(() => {
    if (!canvasReady || !isResultEditor || isLoadingRef.current) return;
    addArtboardGuide();
  }, [addArtboardGuide, canvasReady, isResultEditor, resultArtboardHeight]);

  const applyHistorySnapshot = useCallback(
    async (serialized: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const snapshot = normalizeFabricQuizScene(JSON.parse(serialized));

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (historyCaptureTimerRef.current !== null) {
        window.clearTimeout(historyCaptureTimerRef.current);
        historyCaptureTimerRef.current = null;
      }

      isLoadingRef.current = true;
      setSelectedObject(null);
      setIsBackgroundSelected(false);
      setEditingLayerId(null);
      backgroundRef.current = { ...snapshot.background };
      setBackground({ ...snapshot.background });
      currentArtboardRef.current = { ...snapshot.artboard };
      resultArtboardHeightRef.current = snapshot.artboard.height;
      setResultArtboardHeight(snapshot.artboard.height);

      try {
        await ensureSceneFontsLoaded(snapshot.fabric);
        const fabric = fabricRef.current;
        if (fabric) clearFabricTextMeasurementCache(fabric);
        canvas.clear();
        await canvas.loadFromJSON(canvasLoadJson(snapshot.fabric));
        canvas.selection = true;
        canvas.backgroundColor = "rgba(0, 0, 0, 0)";

        const configureObject = (item: FabricObject) => {
          applyFigmaTextFrameLayout(item);
          applyEditorControls(item);
          item.selectable = true;
          item.evented = true;
          if (isFabricGroupObject(item)) {
            item.getObjects().forEach(configureObject);
          }
        };
        (canvas.getObjects() as FabricObject[]).forEach(configureObject);

        addArtboardGuide();
        canvas.requestRenderAll();
        refreshLayersRef.current();
        applyResultViewportTransform();
      } catch (error) {
        console.error("Failed to restore Fabric history", error);
        toast.error("Failed to restore canvas history");
      } finally {
        isLoadingRef.current = false;
      }

      await writeSceneRef.current();
    },
    [addArtboardGuide, applyResultViewportTransform],
  );

  const handleUndo = useCallback(() => {
    const history = historyRef.current;
    if (history.index <= 0) return;
    history.index -= 1;
    const snapshot = history.entries[history.index];
    if (!snapshot) return;
    historyRestoreChainRef.current = historyRestoreChainRef.current
      .catch(() => undefined)
      .then(() => applyHistorySnapshot(snapshot));
  }, [applyHistorySnapshot]);

  const handleRedo = useCallback(() => {
    const history = historyRef.current;
    if (history.index >= history.entries.length - 1) return;
    history.index += 1;
    const snapshot = history.entries[history.index];
    if (!snapshot) return;
    historyRestoreChainRef.current = historyRestoreChainRef.current
      .catch(() => undefined)
      .then(() => applyHistorySnapshot(snapshot));
  }, [applyHistorySnapshot]);

  useEffect(() => {
    undoRef.current = handleUndo;
    redoRef.current = handleRedo;
  }, [handleRedo, handleUndo]);

  useEffect(() => {
    const viewport = workspaceViewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvasReady || !canvas) return;

    const frameWidth = artboard.width + PHONE_FRAME_BORDER * 2;
    const frameHeight =
      (isResultEditor ? MIN_RESULT_ARTBOARD_HEIGHT : artboard.height) +
      PHONE_FRAME_BORDER * 2;

    // Fits the phone frame to the viewport (never zooming past 100%) and
    // re-centers on it. Both the canvas size and the viewport transform are derived
    // from the same ResizeObserver reading, so a one-shot requestAnimationFrame
    // that races the flex layout (the aside panel and tool dock haven't
    // settled yet on first paint) can never leave them out of sync — and the
    // observer re-fires on every later resize (window resize, sidebar
    // toggle), so both stay correct instead of freezing at a stale value.
    const fitAndCenter = () => {
      const viewportWidth = Math.max(1, viewport.clientWidth);
      const viewportHeight = Math.max(1, viewport.clientHeight);
      const availableWidth = Math.max(
        1,
        viewportWidth - FIT_VIEWPORT_PADDING * 2,
      );
      const availableHeight = Math.max(
        1,
        viewportHeight - FIT_VIEWPORT_PADDING - FIT_BOTTOM_CLEARANCE,
      );
      const nextScale = Math.min(
        1,
        availableWidth / frameWidth,
        availableHeight / frameHeight,
      );

      if (isResultEditor) {
        const canvasWidth = viewportWidth;
        const canvasHeight = Math.max(
          viewportHeight,
          FIT_VIEWPORT_PADDING * 2 +
            (resultArtboardHeightRef.current + RESULT_EDITOR_BOTTOM_BUFFER) *
              nextScale,
        );
        if (
          canvas.getWidth() !== canvasWidth ||
          canvas.getHeight() !== canvasHeight
        ) {
          canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
          canvas.calcOffset();
        }
        resultViewportScaleRef.current = nextScale;
        canvas.backgroundColor = "rgba(0, 0, 0, 0)";
        applyResultViewportTransform();
        return;
      }

      if (
        canvas.getWidth() !== viewportWidth ||
        canvas.getHeight() !== viewportHeight
      ) {
        canvas.setDimensions({ width: viewportWidth, height: viewportHeight });
        canvas.calcOffset();
      }

      // Horizontal padding is symmetric, so the viewport's own midpoint is
      // the right centering target. Vertical isn't: the dock eats more of
      // the bottom than FIT_VIEWPORT_PADDING reserves up top, so centering
      // within the full clientHeight would still sit the frame too low —
      // center within the space above the dock instead.
      const verticalCenter = FIT_VIEWPORT_PADDING + availableHeight / 2;
      const centerX = artboard.x + artboard.width / 2;
      const centerY = artboard.y + artboard.height / 2;
      applyViewportTransform([
        nextScale,
        0,
        0,
        nextScale,
        viewportWidth / 2 - centerX * nextScale,
        verticalCenter - centerY * nextScale,
      ]);
    };

    const observer = new ResizeObserver(fitAndCenter);
    observer.observe(viewport);
    fitAndCenter();

    return () => observer.disconnect();
  }, [
    applyViewportTransform,
    applyResultViewportTransform,
    artboard.height,
    artboard.width,
    artboard.x,
    artboard.y,
    canvasReady,
    isResultEditor,
    resultArtboardHeight,
    sceneKey,
  ]);

  useEffect(() => {
    let disposed = false;

    void import("fabric").then((fabric) => {
      if (disposed || !canvasElementRef.current) return;
      fabricRef.current = fabric;
      registerFabricQuizProperties(fabric.FabricObject);
      configureFabricEditorControlDefaults(fabric);

      const canvas = new fabric.Canvas(canvasElementRef.current, {
        width: 1,
        height: 1,
        preserveObjectStacking: true,
        selection: true,
        backgroundColor: "rgba(0, 0, 0, 0)",
      });
      canvas.upperCanvasEl.style.touchAction = "none";
      canvas.lowerCanvasEl.style.touchAction = "none";
      canvasRef.current = canvas;

      const handleCanvasContextMenu = (event: PenPointerEvent) => {
        const isRightClick =
          "button" in event.e && (event.e as MouseEvent).button === 2;
        if (!isRightClick) {
          setCanvasContextMenu(null);
          return;
        }

        event.e.preventDefault();
        event.e.stopPropagation();
        const clientPoint = eventClientPoint(event.e);
        if (!clientPoint) return;
        const point = canvas.getScenePoint(event.e);
        const target = canvas.searchPossibleTargets(canvas.getObjects(), point)
          .target as FabricObject | undefined;
        const object = target && !isArtboardGuideObject(target) ? target : null;

        if (object) {
          canvas.setActiveObject(object);
          setSelectedObject(object);
          setIsBackgroundSelected(false);
        } else {
          canvas.discardActiveObject();
          setSelectedObject(null);
        }
        canvas.requestRenderAll();

        const menuHeight = object
          ? (isResultEditor ? 152 : 196) +
            (isFabricGroupObject(object) ? 36 : 0)
          : 44;
        setCanvasContextMenu({
          object,
          point: { x: point.x, y: point.y },
          x: Math.max(8, Math.min(clientPoint.x, window.innerWidth - 176)),
          y: Math.max(
            8,
            Math.min(clientPoint.y, window.innerHeight - menuHeight - 8),
          ),
        });
      };

      const startViewportPan = (event: PenPointerEvent) => {
        if (isResultEditor) return;
        if (viewportPanStateRef.current) return;
        const point = eventClientPoint(event.e);
        if (!point) return;
        const isMiddleMouse =
          "button" in event.e && (event.e as MouseEvent).button === 1;
        const isPrimarySpaceDrag =
          isSpacePressedRef.current &&
          (!("button" in event.e) || (event.e as MouseEvent).button === 0);
        if (!isPrimarySpaceDrag && !isMiddleMouse) return;

        event.e.preventDefault();
        event.e.stopPropagation();
        viewportPanStateRef.current = {
          lastPoint: point,
          previousSelection: canvas.selection,
          previousSkipTargetFind: canvas.skipTargetFind,
          previousDrawingMode: canvas.isDrawingMode,
        };
        canvas.selection = false;
        canvas.skipTargetFind = true;
        canvas.isDrawingMode = false;
        setIsInteracting(true);
        setViewportCursor("grabbing");
      };

      const handleViewportPanMove = (event: PenPointerEvent) => {
        const state = viewportPanStateRef.current;
        if (!state) return;
        const point = eventClientPoint(event.e);
        if (!point) return;

        event.e.preventDefault();
        const deltaX = point.x - state.lastPoint.x;
        const deltaY = point.y - state.lastPoint.y;
        state.lastPoint = point;
        if (deltaX === 0 && deltaY === 0) return;

        canvas.relativePan(new fabric.Point(deltaX, deltaY));
        applyViewportTransform(canvas.viewportTransform);
      };

      const handleViewportPanEnd = (event: PenPointerEvent) => {
        if (!viewportPanStateRef.current) return;
        event.e.preventDefault();
        stopViewportPan();
      };

      const handleWheel = (event: { e: WheelEvent }) => {
        if (isResultEditor) {
          // The result artboard is a naturally tall document. Leave the wheel
          // event alone so the workspace scrolls instead of moving content
          // inside a fixed-height phone viewport.
          return;
        }

        event.e.preventDefault();
        event.e.stopPropagation();

        if (event.e.metaKey || event.e.ctrlKey) {
          const nextZoom = clampZoom(
            canvas.getZoom() * Math.pow(0.999, event.e.deltaY),
          );
          canvas.zoomToPoint(canvas.getViewportPoint(event.e), nextZoom);
          applyViewportTransform(canvas.viewportTransform);
          return;
        }

        const delta = wheelPixelDelta(event.e, canvas.getHeight());
        const panX = event.e.shiftKey && delta.x === 0 ? delta.y : delta.x;
        const panY = event.e.shiftKey ? 0 : delta.y;
        canvas.relativePan(new fabric.Point(-panX, -panY));
        applyViewportTransform(canvas.viewportTransform);
      };

      const handleSelection = () => {
        const active = canvas.getActiveObject() as FabricObject | undefined;
        setIsBackgroundSelected(false);
        setSelectedObject(active ?? null);
      };
      const handleTextSelectionChanged = () => {
        handleSelection();
        setTextSelectionRevision((revision) => revision + 1);
      };
      const handleChanged = () => {
        syncResultArtboardHeightRef.current();
        scheduleSaveRef.current();
      };
      const handleTransformStart = () => setIsInteracting(true);
      const handleTransformEnd = (event: { target?: FabricObject }) => {
        if (event.target && normalizeFigmaGroupResize(event.target)) {
          canvas.requestRenderAll();
          refreshLayersRef.current();
        }
        setIsInteracting(false);
      };
      // A side-handle drag is a deliberate manual-width resize — once that
      // happens, permanently stop overriding width on keystrokes and let the
      // Textbox's normal fixed-width wrapping take over.
      const handleScalingTransform = (event: {
        target?: FabricObject;
        transform?: { corner?: string };
      }) => {
        const corner = event.transform?.corner;
        if (
          event.target &&
          event.target.type === "textbox" &&
          (corner === "ml" || corner === "mr")
        ) {
          event.target.vvAutoWidth = false;
        }
      };
      const handleTextChanged = (event: { target?: FabricObject }) => {
        if (event.target && event.target.vvAutoWidth !== false) {
          applyAutoWidth(event.target);
        }
        canvas.requestRenderAll();
        handleChanged();
      };
      const handleObjectAdded = (event: { target?: FabricObject }) => {
        if (!event.target || isArtboardGuideObject(event.target)) return;
        applyEditorControls(event.target);
        raiseArtboardOverlays(canvas);
        handleChanged();
        refreshLayersRef.current();
      };
      const handleObjectRemoved = (event: { target?: FabricObject }) => {
        if (event.target && isArtboardGuideObject(event.target)) return;
        handleChanged();
        refreshLayersRef.current();
      };

      canvas.on("mouse:down:before", startViewportPan);
      canvas.on("mouse:down", handleCanvasContextMenu);
      canvas.on("mouse:move:before", handleViewportPanMove);
      canvas.on("mouse:up", handleViewportPanEnd);
      canvas.on("mouse:wheel", handleWheel);
      canvas.on("selection:created", handleSelection);
      canvas.on("selection:updated", handleSelection);
      canvas.on("selection:cleared", () => {
        setIsBackgroundSelected(false);
        setSelectedObject(null);
        setIsInteracting(false);
      });
      canvas.on("text:selection:changed", handleTextSelectionChanged);
      canvas.on("object:added", handleObjectAdded);
      canvas.on("object:modified", handleChanged);
      canvas.on("object:modified", handleTransformEnd);
      canvas.on("object:moving", handleTransformStart);
      canvas.on("object:scaling", handleTransformStart);
      canvas.on("object:scaling", handleScalingTransform);
      // A Textbox's side-handle drag is a width-only resize, which Fabric
      // fires as "object:resizing" — a distinct event from "object:scaling"
      // (confirmed by instrumenting canvas.fire directly; corner/action
      // land in the same transform payload shape either way).
      canvas.on("object:resizing", handleTransformStart);
      canvas.on("object:resizing", handleScalingTransform);
      canvas.on("object:rotating", handleTransformStart);
      canvas.on("object:removed", handleObjectRemoved);
      canvas.on("text:changed", handleTextChanged);
      canvas.on("path:created", (event) => {
        const path = event.path as FabricObject | undefined;
        if (path) {
          path.vvId = createId("brush");
          path.vvRole = "decorative";
          applyEditorControls(path);
          setActiveTool("pointer");
        }
        handleChanged();
        refreshLayersRef.current();
        // Safety net alongside the mouse:up handler below — path:created
        // firing always means a brush stroke just finished.
        setIsInteracting(false);
      });

      canvas.on("mouse:up", () => {
        if (activeToolRef.current === "brush") setIsInteracting(false);
      });

      canvas.on("mouse:down", (event) => {
        if (viewportPanStateRef.current) return;
        if (!isPrimaryPointerEvent(event.e)) return;
        const tool = activeToolRef.current;
        if (tool === "brush") {
          setIsInteracting(true);
          return;
        }
        if (tool === "pointer" || tool === "pen" || tool === "shape") return;
        const pointer = canvas.getScenePoint(event.e);

        if (tool === "text") {
          const textbox = new fabric.Textbox("Text", {
            left: pointer.x,
            top: pointer.y,
            width: 220,
            fontFamily: getFontFamilyStack("Inter"),
            fontSize: 28,
            fill: "#111827",
          }) as FabricObject;
          textbox.vvId = createId("text");
          textbox.vvRole = "decorative";
          textbox.vvAutoWidth = true;
          applyEditorControls(textbox);
          canvas.add(textbox);
          canvas.setActiveObject(textbox);
          // Drop back to the pointer and start editing with the placeholder
          // selected so the next keystroke replaces "Text".
          setActiveTool("pointer");
          const editable = textbox as unknown as FabricTypes.Textbox;
          editable.enterEditing();
          editable.selectAll();
          canvas.requestRenderAll();
          scheduleSaveRef.current();
          return;
        }
      });

      setCanvasReady(true);
    });

    return () => {
      disposed = true;
      setCanvasReady(false);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        void writeSceneRef.current();
      }
      if (historyCaptureTimerRef.current !== null) {
        window.clearTimeout(historyCaptureTimerRef.current);
        historyCaptureTimerRef.current = null;
      }
      // Invalidate any in-flight scene load so its callbacks no-op.
      loadTokenRef.current += 1;
      viewportPanStateRef.current = null;
      viewportCursorRef.current = null;
      void canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, [
    applyViewportTransform,
    isResultEditor,
    normalizedScene.workspace.height,
    normalizedScene.workspace.width,
    setViewportCursor,
    stopViewportPan,
  ]);

  useEffect(() => {
    if (!canvasReady) return;

    // Serialize loads: chaining on the previous load (rather than firing
    // concurrent loadFromJSON calls) prevents Strict Mode's double-invocation
    // and rapid page switches from enlivening the same objects twice and
    // stacking duplicates on the canvas.
    const token = (loadTokenRef.current += 1);
    isLoadingRef.current = true;
    setSelectedObject(null);
    const sceneToLoad = initialSceneToLoadRef.current;

    loadChainRef.current = loadChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const canvas = canvasRef.current;
        if (!canvas || token !== loadTokenRef.current) return;

        try {
          await ensureSceneFontsLoaded(sceneToLoad.fabric);
        } catch (error) {
          // Font delivery must not prevent the scene itself from opening. Any
          // unavailable family stays serialized and Fabric uses its fallback.
          console.warn("Some scene fonts could not be loaded", error);
        }
        if (canvasRef.current !== canvas || token !== loadTokenRef.current) {
          return;
        }

        const fabric = fabricRef.current;
        if (fabric) clearFabricTextMeasurementCache(fabric);
        canvas.clear();
        await canvas.loadFromJSON(canvasLoadJson(sceneToLoad.fabric));
        // A newer load (or unmount) superseded us while awaiting.
        if (canvasRef.current !== canvas || token !== loadTokenRef.current) {
          return;
        }

        canvas.selection = true;
        // Keep Fabric transparent: the scene background is a dedicated DOM
        // layer below the canvas, not a selectable or serialized object.
        canvas.backgroundColor = "rgba(0, 0, 0, 0)";
        let repairedImportedContent = sceneHasUnnormalizedFontFamilies(
          sceneToLoad.fabric,
        );
        const configureObject = (item: FabricObject) => {
          if (item.type === "image") {
            const image = item as unknown as FabricTypes.FabricImage;
            const repair = getPersistedFigmaImageSizeRepair(
              item as unknown as FabricObjectJson,
              image.getOriginalSize(),
              sceneToLoad.artboard,
            );
            if (repair) {
              image.set(repair);
              image.setCoords();
              repairedImportedContent = true;
            }
          }
          if (applyFigmaTextFrameLayout(item)) {
            repairedImportedContent = true;
          }
          applyEditorControls(item);
          item.selectable = true;
          item.evented = true;
          if (isFabricGroupObject(item)) {
            item.getObjects().forEach(configureObject);
          }
        };
        canvas.getObjects().forEach((object) => {
          const item = object as FabricObject;
          configureObject(item);
        });
        addArtboardGuide();
        canvas.requestRenderAll();
        isLoadingRef.current = false;
        refreshLayersRef.current();
        syncResultArtboardHeightRef.current();
        applyResultViewportTransform();
        resetHistoryRef.current();
        if (repairedImportedContent) scheduleSaveRef.current();
      })
      .catch((error) => {
        if (token !== loadTokenRef.current) return;
        isLoadingRef.current = false;
        console.error("Failed to load Fabric scene", error);
        toast.error("Failed to load canvas");
      });
    // Deliberately excludes `normalizedScene`/`scene`: this loads once per
    // mount from the frozen `initialSceneToLoadRef` snapshot (see its
    // declaration for why), and every consumer remounts this component via
    // `key={sceneKey}` when switching pages, so `sceneKey` here is a
    // defensive-clarity dependency rather than a live trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applyResultViewportTransform,
    canvasReady,
    addArtboardGuide,
    isResultEditor,
    sceneKey,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    canvas.isDrawingMode = activeTool === "brush";
    if (activeTool === "brush") {
      const BrushClass =
        brushKind === "circle"
          ? fabric.CircleBrush
          : brushKind === "spray"
            ? fabric.SprayBrush
            : fabric.PencilBrush;
      canvas.freeDrawingBrush = new BrushClass(canvas);
      canvas.freeDrawingBrush.width = brushKind === "spray" ? 14 : 5;
      canvas.freeDrawingBrush.color = "#111827";
    }
  }, [activeTool, brushKind]);

  const redrawPenPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.contextTop;
    canvas.clearContext(ctx);
    const anchors = penAnchorsRef.current;
    const first = anchors[0];
    if (!first) return;

    // Fabric draws contextTop overlays (brush previews, selection UI) in
    // scene coordinates under the canvas's own viewport transform — matching
    // that here keeps this preview correctly placed if zoom/pan is ever
    // added to the viewport transform (currently always identity).
    const vpt = canvas.viewportTransform;
    ctx.save();
    ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    let previous = first;
    for (const anchor of anchors.slice(1)) {
      const c1 = previous.handleOut ?? previous;
      const c2 = anchor.handleIn ?? anchor;
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, anchor.x, anchor.y);
      previous = anchor;
    }
    ctx.strokeStyle = PEN_STROKE_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();

    const mouse = penMousePosRef.current;
    const isDragging = penDragIndexRef.current !== null;
    if (mouse && !isDragging) {
      const last = previous;
      const c1 = last.handleOut ?? last;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.bezierCurveTo(c1.x, c1.y, mouse.x, mouse.y, mouse.x, mouse.y);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const drawHandle = (anchor: PenPoint, handle: PenPoint) => {
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(handle.x, handle.y);
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, PEN_HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#3b82f6";
      ctx.stroke();
    };

    anchors.forEach((anchor, index) => {
      if (anchor.handleIn) drawHandle(anchor, anchor.handleIn);
      if (anchor.handleOut) drawHandle(anchor, anchor.handleOut);
      ctx.beginPath();
      ctx.arc(
        anchor.x,
        anchor.y,
        index === 0 ? PEN_ANCHOR_RADIUS + 1 : PEN_ANCHOR_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = index === 0 ? "#ffffff" : PEN_STROKE_COLOR;
      ctx.fill();
      ctx.strokeStyle = PEN_STROKE_COLOR;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.restore();
  }, []);

  const resetPenState = useCallback(() => {
    const canvas = canvasRef.current;
    penAnchorsRef.current = [];
    penDragIndexRef.current = null;
    penMousePosRef.current = null;
    if (canvas) canvas.clearContext(canvas.contextTop);
    setIsInteracting(false);
  }, []);

  const finishPenPath = useCallback(
    (closed: boolean) => {
      const canvas = canvasRef.current;
      const fabric = fabricRef.current;
      const anchors = penAnchorsRef.current;
      if (!canvas || !fabric || anchors.length < 2) {
        resetPenState();
        setActiveTool("pointer");
        return;
      }

      const { d, ...paint } = buildPenPathDefinition(anchors, closed);
      const path = new fabric.Path(d, paint) as FabricObject;
      path.vvId = createId("pen");
      path.vvRole = "decorative";
      applyEditorControls(path);
      canvas.add(path);
      canvas.setActiveObject(path);
      scheduleSaveRef.current();

      resetPenState();
      setActiveTool("pointer");
    },
    [resetPenState],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTool !== "pen") return;

    const previousSelection = canvas.selection;
    const previousSkipTargetFind = canvas.skipTargetFind;
    canvas.selection = false;
    // Fabric 7 resolves and activates an event target before firing the
    // public mouse:down handler. Disabling marquee selection alone therefore
    // still lets an existing object become selected under a new pen anchor.
    canvas.skipTargetFind = true;
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const handleMouseDown = (opt: PenPointerEvent) => {
      if (viewportPanStateRef.current) return;
      if (!isPrimaryPointerEvent(opt.e)) return;
      const pointer = canvas.getScenePoint(opt.e);
      const anchors = penAnchorsRef.current;

      if (isPenPathClosingPoint(anchors, pointer)) {
        finishPenPath(true);
        return;
      }

      penAnchorsRef.current = [...anchors, { x: pointer.x, y: pointer.y }];
      penDragIndexRef.current = penAnchorsRef.current.length - 1;
      setIsInteracting(true);
      redrawPenPreview();
    };

    const handleMouseMove = (opt: PenPointerEvent) => {
      if (viewportPanStateRef.current) return;
      const pointer = canvas.getScenePoint(opt.e);
      penMousePosRef.current = { x: pointer.x, y: pointer.y };

      const dragIndex = penDragIndexRef.current;
      const anchor =
        dragIndex !== null ? penAnchorsRef.current[dragIndex] : undefined;
      if (anchor) {
        const dx = pointer.x - anchor.x;
        const dy = pointer.y - anchor.y;
        // Below the threshold reads as a plain click (corner point) rather
        // than a deliberate drag, so tiny hand tremor doesn't create handles.
        if (Math.hypot(dx, dy) > 2) {
          anchor.handleOut = { x: anchor.x + dx, y: anchor.y + dy };
          anchor.handleIn = { x: anchor.x - dx, y: anchor.y - dy };
        }
      }
      redrawPenPreview();
    };

    const handleMouseUp = (opt: PenPointerEvent) => {
      if (viewportPanStateRef.current) return;
      if (!isPrimaryPointerEvent(opt.e)) return;
      penDragIndexRef.current = null;
      redrawPenPreview();
    };

    const handleDoubleClick = () => {
      finishPenPath(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        finishPenPath(false);
      } else if (event.key === "Escape") {
        resetPenState();
        setActiveTool("pointer");
      }
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("mouse:dblclick", handleDoubleClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("mouse:dblclick", handleDoubleClick);
      window.removeEventListener("keydown", handleKeyDown);
      canvas.selection = previousSelection;
      canvas.skipTargetFind = previousSkipTargetFind;
      resetPenState();
    };
  }, [activeTool, finishPenPath, redrawPenPreview, resetPenState]);

  // Drag-to-size shape creation, mirroring the pen tool's contextTop preview
  // technique above: mouse:down records a start point (no object yet),
  // mouse:move draws a live outline, mouse:up creates the real object at the
  // normalized (negative-delta-safe) final size. A negligible drag reads as a
  // plain click and falls back to a default-sized shape at that point.
  useEffect(() => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric || activeTool !== "shape") return;

    canvas.selection = false;
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    let dragStart: PenPoint | null = null;
    let hasMoved = false;

    const clearPreview = () => {
      canvas.clearContext(canvas.contextTop);
    };

    const drawPreview = (
      kind: ShapeKind,
      start: PenPoint,
      current: PenPoint,
    ) => {
      clearPreview();
      const ctx = canvas.contextTop;
      const vpt = canvas.viewportTransform;
      ctx.save();
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

      const x = Math.min(start.x, current.x);
      const y = Math.min(start.y, current.y);
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);

      ctx.beginPath();
      if (kind === "rect") {
        ctx.roundRect(x, y, width, height, Math.min(12, width / 2, height / 2));
      } else if (kind === "ellipse") {
        ctx.ellipse(
          x + width / 2,
          y + height / 2,
          width / 2,
          height / 2,
          0,
          0,
          Math.PI * 2,
        );
      } else {
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
      }
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    const createShape = (
      kind: ShapeKind,
      left: number,
      top: number,
      width: number,
      height: number,
    ) => {
      const shape: FabricObject =
        kind === "rect"
          ? (new fabric.Rect({
              left,
              top,
              width,
              height,
              rx: 12,
              ry: 12,
              fill: "#3b82f6",
            }) as FabricObject)
          : kind === "ellipse"
            ? (new fabric.Ellipse({
                left,
                top,
                rx: width / 2,
                ry: height / 2,
                fill: "#14b8a6",
              }) as FabricObject)
            : (new fabric.Triangle({
                left,
                top,
                width,
                height,
                fill: "#f59e0b",
              }) as FabricObject);
      shape.vvId = createId(kind);
      shape.vvRole = "decorative";
      applyEditorControls(shape);
      canvas.add(shape);
      canvas.setActiveObject(shape);
      setActiveTool("pointer");
      scheduleSaveRef.current();
    };

    const handleMouseDown = (opt: PenPointerEvent) => {
      if (viewportPanStateRef.current) return;
      if (!isPrimaryPointerEvent(opt.e)) return;
      const pointer = canvas.getScenePoint(opt.e);
      dragStart = { x: pointer.x, y: pointer.y };
      hasMoved = false;
      setIsInteracting(true);
    };

    const handleMouseMove = (opt: PenPointerEvent) => {
      if (viewportPanStateRef.current) return;
      if (!dragStart) return;
      const pointer = canvas.getScenePoint(opt.e);
      if (
        Math.hypot(pointer.x - dragStart.x, pointer.y - dragStart.y) >
        SHAPE_DRAG_CLICK_THRESHOLD
      ) {
        hasMoved = true;
      }
      drawPreview(shapeKindRef.current, dragStart, {
        x: pointer.x,
        y: pointer.y,
      });
    };

    const handleMouseUp = (opt: PenPointerEvent) => {
      if (viewportPanStateRef.current) return;
      if (!isPrimaryPointerEvent(opt.e)) return;
      const start = dragStart;
      dragStart = null;
      clearPreview();
      setIsInteracting(false);
      if (!start) return;

      const kind = shapeKindRef.current;
      if (!hasMoved) {
        const defaults = SHAPE_DEFAULT_SIZE[kind];
        createShape(kind, start.x, start.y, defaults.width, defaults.height);
        return;
      }

      const pointer = canvas.getScenePoint(opt.e);
      const left = Math.min(start.x, pointer.x);
      const top = Math.min(start.y, pointer.y);
      const width = Math.abs(pointer.x - start.x);
      const height = Math.abs(pointer.y - start.y);
      createShape(kind, left, top, width, height);
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.selection = true;
      dragStart = null;
      clearPreview();
      setIsInteracting(false);
    };
  }, [activeTool]);

  const focusFabricObject = useCallback((object: FabricObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = getTopLevelFabricObject(object);
    if (!canvas.contains(root)) return;

    setIsBackgroundSelected(false);
    canvas.setActiveObject(root);
    setSelectedObject(object);
    canvas.requestRenderAll();
  }, []);

  // Deletes the whole active selection: with a multi-select the active
  // object is an ActiveSelection wrapper that isn't itself on the canvas, so
  // removing it directly would silently do nothing — the members have to be
  // removed individually.
  const handleDelete = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedObject) return;

    const parent = getFabricObjectParent(selectedObject);
    const targets = parent
      ? []
      : (canvas.getActiveObjects() as FabricObject[]).filter(
          (object) => !isArtboardGuideObject(object),
        );

    // A delete can originate while Fabric still owns the pointer transform
    // that selected the object (especially from a right-click menu). End it
    // before removing anything so Fabric cannot retain a deleted transform
    // target and stop dispatching later pointer events.
    if (canvas._currentTransform) canvas.endCurrentTransform();
    canvas.discardActiveObject();
    setCanvasContextMenu(null);
    setSelectedObject(null);
    setIsInteracting(false);

    if (parent) {
      parent.remove(selectedObject);
      if (parent.getObjects().length === 0) {
        const grandparent = getFabricObjectParent(parent);
        if (grandparent) grandparent.remove(parent);
        else canvas.remove(parent);
        setSelectedObject(grandparent ?? null);
      } else {
        focusFabricObject(parent);
      }
      refreshLayers();
      syncResultArtboardHeightRef.current();
      canvas.requestRenderAll();
      scheduleSave();
      return;
    }

    const objectsToDelete =
      targets.length > 0
        ? targets
        : isFabricObjectOnCanvas(canvas, selectedObject)
          ? [selectedObject]
          : [];
    if (objectsToDelete.length === 0) return;
    objectsToDelete.forEach((object) => canvas.remove(object));
    canvas.requestRenderAll();
    scheduleSave();
  }, [focusFabricObject, refreshLayers, scheduleSave, selectedObject]);

  const handleDeleteRef = useRef(handleDelete);
  useEffect(() => {
    handleDeleteRef.current = handleDelete;
  }, [handleDelete]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Covers inline text editing too: Fabric routes it through a hidden
      // textarea, which holds focus while a Textbox is being edited.
      if (editableEventTarget(event.target)) return;

      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redoRef.current();
        else undoRef.current();
        return;
      }
      if (modifier && key === "y") {
        event.preventDefault();
        redoRef.current();
        return;
      }
      if (modifier && key === "c") {
        event.preventDefault();
        copyRef.current();
        return;
      }
      if (modifier && key === "x") {
        event.preventDefault();
        cutRef.current();
        return;
      }
      if (
        modifier &&
        event.shiftKey &&
        key === "g" &&
        selectedObject &&
        isFabricGroupObject(selectedObject)
      ) {
        event.preventDefault();
        ungroupRef.current(selectedObject);
        return;
      }

      if (event.key === "Escape") {
        if (canvas.getActiveObject()) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (!canvas.getActiveObject()) return;
        event.preventDefault();
        handleDeleteRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedObject]);

  useEffect(() => {
    const handleWindowPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || editableEventTarget(event.target)) return;

      const content = event.clipboardData?.getData("text/plain") ?? "";
      if (onFigmaPaste && isFigmaPluginImportText(content)) {
        event.preventDefault();
        onFigmaPaste(content);
        return;
      }

      if (!clipboardObjectRef.current) return;
      event.preventDefault();
      pasteRef.current();
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [onFigmaPaste]);

  const handleDuplicate = useCallback(async () => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric || !selectedObject) return;
    const cloned = (await selectedObject.clone([
      ...FABRIC_CUSTOM_PROPERTIES,
    ])) as FabricObject;
    assignFreshObjectIds(cloned);
    cloned.selectable = true;
    cloned.evented = true;
    applyEditorControls(cloned);

    const parent = getFabricObjectParent(selectedObject);
    if (parent) {
      fabric.util.sendObjectToPlane(
        cloned,
        parent.calcTransformMatrix(),
        undefined,
      );
      cloned.set({
        left: (cloned.left ?? 0) + 20,
        top: (cloned.top ?? 0) + 20,
      });
      parent.add(cloned);
      focusFabricObject(cloned);
      refreshLayers();
    } else {
      cloned.set({
        left: (cloned.left ?? 0) + 20,
        top: (cloned.top ?? 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
    }
    canvas.requestRenderAll();
    syncResultArtboardHeightRef.current();
    scheduleSave();
  }, [focusFabricObject, refreshLayers, scheduleSave, selectedObject]);

  const handleMerge = useCallback(() => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    const targets = (canvas.getActiveObjects() as FabricObject[]).filter(
      (object) => !isArtboardGuideObject(object),
    );
    if (targets.length < 2) return;

    const targetSet = new Set(targets);
    const originalObjects = canvas.getObjects() as FabricObject[];
    const topmostSelectedIndex = originalObjects.reduce(
      (topmost, object, index) =>
        targetSet.has(object) ? Math.max(topmost, index) : topmost,
      -1,
    );
    const mergedIndex = originalObjects
      .slice(0, topmostSelectedIndex)
      .filter((object) => !targetSet.has(object)).length;

    canvas.discardActiveObject();
    canvas.remove(...targets);

    const group = new fabric.Group(targets, {
      interactive: false,
      subTargetCheck: false,
    }) as FabricObject;
    group.vvId = createId("group");
    group.vvName = "Group";
    applyEditorControls(group);

    canvas.add(group);
    canvas.moveObjectTo(group, mergedIndex);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    refreshLayers();
    syncResultArtboardHeightRef.current();
    scheduleSave();
  }, [refreshLayers, scheduleSave]);

  const handleUngroup = useCallback(
    (group: FabricObject) => {
      const canvas = canvasRef.current;
      const fabric = fabricRef.current;
      if (
        !canvas ||
        !fabric ||
        !isFabricGroupObject(group) ||
        !isFabricObjectOnCanvas(canvas, group)
      ) {
        return;
      }

      const children = group.getObjects();
      if (children.length === 0) return;

      const parent = getFabricObjectParent(group);
      const siblings = parent
        ? parent.getObjects()
        : (canvas.getObjects() as FabricObject[]);
      const groupIndex = siblings.indexOf(group);
      if (groupIndex === -1) return;

      if (canvas._currentTransform) canvas.endCurrentTransform();
      canvas.discardActiveObject();
      setCanvasContextMenu(null);
      setSelectedObject(null);
      setIsInteracting(false);

      // Remove every child before the group's layout changes, then insert the
      // children where the group sat. Fabric preserves their scene transforms
      // while moving them between the group, parent, and canvas planes.
      group.remove(...children);
      if (parent) {
        parent.remove(group);
        parent.insertAt(groupIndex, ...children);
      } else {
        canvas.remove(group);
        canvas.insertAt(groupIndex, ...children);
      }

      children.forEach((child) => {
        applyEditorControls(child);
        child.setCoords();
      });

      if (parent) {
        parent.setCoords();
        focusFabricObject(children[children.length - 1]!);
      } else {
        const selection = new fabric.ActiveSelection(children, {
          canvas,
        }) as FabricObject;
        canvas.setActiveObject(selection);
        setSelectedObject(selection);
      }

      canvas.requestRenderAll();
      refreshLayers();
      syncResultArtboardHeightRef.current();
      scheduleSave();
    },
    [focusFabricObject, refreshLayers, scheduleSave],
  );

  useEffect(() => {
    ungroupRef.current = handleUngroup;
  }, [handleUngroup]);

  const handleUpdateObject = useCallback(
    (object: FabricObject, properties: Record<string, unknown>) => {
      const canvas = canvasRef.current;
      if (!canvas || !isFabricObjectOnCanvas(canvas, object)) return;

      object.set(properties as Partial<FabricObject>);
      if (object.type === "textbox" && object.vvAutoWidth !== false) {
        applyAutoWidth(object);
      }
      if (object.type === "textbox") applyFigmaTextFrameLayout(object);
      object.setCoords();
      canvas.requestRenderAll();
      syncResultArtboardHeightRef.current();
      scheduleSave();
    },
    [scheduleSave],
  );

  const handleUpdateTextStyle = useCallback(
    (object: FabricObject, properties: Record<string, unknown>) => {
      const canvas = canvasRef.current;
      if (
        !canvas ||
        !isFabricObjectOnCanvas(canvas, object) ||
        object.type !== "textbox"
      ) {
        return;
      }

      const textbox = object as unknown as FabricTypes.Textbox;
      const hasCharacterSelection =
        textbox.selectionEnd > textbox.selectionStart;
      if (hasCharacterSelection) {
        textbox.setSelectionStyles(
          properties,
          textbox.selectionStart,
          textbox.selectionEnd,
        );
        textbox.initDimensions();
      } else {
        textbox.set(properties);
        if (object.vvAutoWidth !== false) applyAutoWidth(object);
        textbox.initDimensions();
      }

      textbox.setCoords();
      applyFigmaTextFrameLayout(object);
      canvas.requestRenderAll();
      setTextSelectionRevision((revision) => revision + 1);
      syncResultArtboardHeightRef.current();
      scheduleSave();
    },
    [scheduleSave],
  );

  const handleUpdateComponentProperty = useCallback(
    (object: FabricObject, propertyName: string, value: string | boolean) => {
      const canvas = canvasRef.current;
      if (!canvas || !isFabricObjectOnCanvas(canvas, object)) return;
      applyFigmaComponentProperty(object, propertyName, value);
      object.setCoords();
      canvas.requestRenderAll();
      refreshLayers();
      scheduleSave();
    },
    [refreshLayers, scheduleSave],
  );

  const handleTransformTextCase = useCallback(
    (
      object: FabricObject,
      textCase: "original" | "upper" | "lower" | "title",
    ) => {
      const canvas = canvasRef.current;
      if (
        !canvas ||
        !isFabricObjectOnCanvas(canvas, object) ||
        object.type !== "textbox" ||
        textCase === "original"
      ) {
        return;
      }
      const textbox = object as unknown as FabricTypes.Textbox;
      const start =
        textbox.selectionEnd > textbox.selectionStart
          ? textbox.selectionStart
          : 0;
      const end =
        textbox.selectionEnd > textbox.selectionStart
          ? textbox.selectionEnd
          : textbox.text.length;
      const selected = textbox.text.slice(start, end);
      const transformed =
        textCase === "upper"
          ? selected.toLocaleUpperCase()
          : textCase === "lower"
            ? selected.toLocaleLowerCase()
            : selected.replace(/\b\p{L}/gu, (character) =>
                character.toLocaleUpperCase(),
              );
      textbox.set(
        "text",
        `${textbox.text.slice(0, start)}${transformed}${textbox.text.slice(end)}`,
      );
      textbox.selectionStart = start;
      textbox.selectionEnd = start + transformed.length;
      textbox.initDimensions();
      applyFigmaTextFrameLayout(object);
      textbox.setCoords();
      canvas.requestRenderAll();
      setTextSelectionRevision((revision) => revision + 1);
      scheduleSave();
    },
    [scheduleSave],
  );

  const handleChangeButtonAction = useCallback(
    (object: FabricObject, action: FabricQuizAction | undefined) => {
      const canvas = canvasRef.current;
      if (
        !canvas ||
        isResultEditor ||
        !isFabricObjectOnCanvas(canvas, object)
      ) {
        return;
      }

      const actionProps = object.vvActionProps ?? {};
      if (!action) {
        const remainingProps = clearAnswerVisualStates(actionProps);
        delete remainingProps.resultMapping;
        delete remainingProps.selectedOpacity;
        delete remainingProps.deselectedOpacity;
        delete remainingProps.enabledOpacity;
        delete remainingProps.disabledOpacity;
        delete remainingProps.selectionMode;
        delete remainingProps.url;
        object.set({
          vvRole: "decorative",
          vvAction: undefined,
          vvActionProps:
            Object.keys(remainingProps).length > 0 ? remainingProps : undefined,
        } as Partial<FabricObject>);
      } else {
        const nextProps =
          action === "answerBox"
            ? { ...actionProps }
            : clearAnswerVisualStates(actionProps);
        if (action === "answerBox") {
          delete nextProps.enabledOpacity;
          delete nextProps.disabledOpacity;
          delete nextProps.selectionMode;
          delete nextProps.url;
          nextProps.resultMapping =
            typeof actionProps.resultMapping === "object" &&
            actionProps.resultMapping !== null
              ? actionProps.resultMapping
              : {};
          nextProps.selectedOpacity =
            typeof actionProps.selectedOpacity === "number"
              ? actionProps.selectedOpacity
              : 1;
          nextProps.deselectedOpacity =
            typeof actionProps.deselectedOpacity === "number"
              ? actionProps.deselectedOpacity
              : 0.5;
        } else {
          delete nextProps.resultMapping;
          delete nextProps.selectedOpacity;
          delete nextProps.deselectedOpacity;
        }
        if (action === "confirmAnswer") {
          nextProps.enabledOpacity =
            typeof actionProps.enabledOpacity === "number"
              ? actionProps.enabledOpacity
              : 1;
          nextProps.disabledOpacity =
            typeof actionProps.disabledOpacity === "number"
              ? actionProps.disabledOpacity
              : 0.5;
          delete nextProps.selectionMode;
        } else {
          delete nextProps.enabledOpacity;
          delete nextProps.disabledOpacity;
          delete nextProps.selectionMode;
        }
        if (action === "hyperlink") {
          nextProps.url =
            typeof actionProps.url === "string" ? actionProps.url : "";
        } else {
          delete nextProps.url;
        }
        object.set({
          vvRole: action === "answerBox" ? "answer" : "navigation",
          vvAction: action,
          vvActionProps: nextProps,
        } as Partial<FabricObject>);
      }

      object.setCoords();
      refreshLayers();
      canvas.requestRenderAll();
      scheduleSave();
    },
    [isResultEditor, refreshLayers, scheduleSave],
  );

  const handleChangeButtonUrl = useCallback(
    (object: FabricObject, url: string) => {
      handleUpdateObject(object, {
        vvActionProps: { ...(object.vvActionProps ?? {}), url },
      });
      refreshLayers();
    },
    [handleUpdateObject, refreshLayers],
  );

  const handleAnswerEditingStateChange = useCallback(
    async (object: FabricObject, nextEditingState: AnswerEditingState) => {
      const canvas = canvasRef.current;
      const fabric = fabricRef.current;
      if (
        !canvas ||
        !fabric ||
        object.vvAction !== "answerBox" ||
        !isFabricObjectOnCanvas(canvas, object)
      ) {
        return;
      }

      const currentEditingState = getAnswerEditingState(object);
      if (currentEditingState === nextEditingState) return;

      const states = getAnswerVisualStates(object);
      states[currentEditingState] = captureAnswerVisualState(object);
      const nextState =
        states[nextEditingState] ??
        cloneAnswerVisualState(states[currentEditingState]!);
      states[nextEditingState] = nextState;
      setAnswerVisualStates(object, states, nextEditingState);

      try {
        await applyAnswerVisualState(fabric, object, nextState);
      } catch (error) {
        console.error("Failed to switch answer visual state", error);
        toast.error("Failed to switch answer state");
        return;
      }

      setAnswerVisualStates(object, states, nextEditingState);
      focusFabricObject(object);
      refreshLayers();
      canvas.requestRenderAll();
      scheduleSave();
    },
    [focusFabricObject, refreshLayers, scheduleSave],
  );

  const handleChangeFontFamily = useCallback(
    async (object: FabricObject, fontFamily: string) => {
      const loaded = await ensureFontFamilyLoaded(fontFamily);
      if (!loaded) return false;

      const canvas = canvasRef.current;
      if (
        !canvas ||
        !isFabricObjectOnCanvas(canvas, object) ||
        object.type !== "textbox"
      ) {
        return false;
      }

      const textbox = object as unknown as FabricTypes.Textbox;
      const nextFamily = getFontFamilyStack(fontFamily);
      const fabric = fabricRef.current;
      if (fabric) clearFabricTextMeasurementCache(fabric);
      if (textbox.selectionEnd > textbox.selectionStart) {
        textbox.setSelectionStyles(
          { fontFamily: nextFamily },
          textbox.selectionStart,
          textbox.selectionEnd,
        );
      } else {
        textbox.set("fontFamily", nextFamily);
      }
      if (object.vvAutoWidth !== false) applyAutoWidth(object);
      textbox.initDimensions();
      textbox.setCoords();
      applyFigmaTextFrameLayout(object);
      canvas.requestRenderAll();
      setSceneFontFamilies((current) =>
        current.some(
          (family) =>
            family.toLocaleLowerCase() === fontFamily.toLocaleLowerCase(),
        )
          ? current
          : [...current, fontFamily],
      );
      syncResultArtboardHeightRef.current();
      scheduleSave();
      return true;
    },
    [scheduleSave],
  );

  const handleSelectLayer = useCallback(
    (object: FabricObject) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setIsBackgroundSelected(false);
      if (isResultEditor) {
        object.setCoords();
        const bounds = object.getBoundingRect();
        const viewport = workspaceViewportRef.current;
        const canvasElement = canvas.upperCanvasEl;
        if (viewport && canvasElement) {
          const viewportRect = viewport.getBoundingClientRect();
          const canvasRect = canvasElement.getBoundingClientRect();
          const scale = resultViewportScaleRef.current;
          const viewportOffsetY = canvas.viewportTransform[5];
          const objectTop =
            canvasRect.top + bounds.top * scale + viewportOffsetY;
          const objectBottom = objectTop + bounds.height * scale;
          const inset = RESULT_ARTBOARD_BOTTOM_PADDING * scale;
          const visibleTop = viewportRect.top + inset;
          const visibleBottom = viewportRect.bottom - inset;

          if (objectTop < visibleTop) {
            viewport.scrollBy({ top: objectTop - visibleTop });
          } else if (objectBottom > visibleBottom) {
            viewport.scrollBy({ top: objectBottom - visibleBottom });
          }
        }
      }
      focusFabricObject(object);
    },
    [focusFabricObject, isResultEditor],
  );

  const handleDeleteLayer = useCallback(
    (object: FabricObject) => {
      const canvas = canvasRef.current;
      if (!canvas || !isFabricObjectOnCanvas(canvas, object)) return;

      if (canvas._currentTransform) canvas.endCurrentTransform();
      canvas.discardActiveObject();
      setCanvasContextMenu(null);
      setSelectedObject(null);
      setIsInteracting(false);

      const parent = getFabricObjectParent(object);
      if (parent) {
        parent.remove(object);
        if (parent.getObjects().length === 0) {
          const grandparent = getFabricObjectParent(parent);
          if (grandparent) grandparent.remove(parent);
          else canvas.remove(parent);
          setSelectedObject(grandparent ?? null);
        } else {
          focusFabricObject(parent);
        }
      } else {
        canvas.remove(object);
      }

      refreshLayers();
      syncResultArtboardHeightRef.current();
      canvas.requestRenderAll();
      scheduleSave();
    },
    [focusFabricObject, refreshLayers, scheduleSave],
  );

  const handleCopyLayer = useCallback(async (object: FabricObject) => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric || !isFabricObjectOnCanvas(canvas, object)) return;

    const clone = (await object.clone([
      ...FABRIC_CUSTOM_PROPERTIES,
    ])) as FabricObject;
    const parent = getFabricObjectParent(object);
    if (parent) {
      fabric.util.sendObjectToPlane(
        clone,
        parent.calcTransformMatrix(),
        undefined,
      );
    }
    clipboardObjectRef.current = clone;
  }, []);

  const handleCutLayer = useCallback(
    async (object: FabricObject) => {
      await handleCopyLayer(object);
      if (clipboardObjectRef.current) handleDeleteLayer(object);
    },
    [handleCopyLayer, handleDeleteLayer],
  );

  const handlePaste = useCallback(
    async (point?: PenPoint) => {
      const canvas = canvasRef.current;
      const fabric = fabricRef.current;
      const source = clipboardObjectRef.current;
      if (!canvas || !fabric || !source) return;

      const clone = (await source.clone([
        ...FABRIC_CUSTOM_PROPERTIES,
      ])) as FabricObject;
      assignFreshObjectIds(clone);
      clone.set({ selectable: true, evented: true });
      if (point) {
        clone.setPositionByOrigin(
          new fabric.Point(point.x, point.y),
          "center",
          "center",
        );
      } else {
        clone.set({
          left: (clone.left ?? 0) + 20,
          top: (clone.top ?? 0) + 20,
        });
      }
      applyEditorControls(clone);
      canvas.add(clone);
      canvas.setActiveObject(clone);
      canvas.requestRenderAll();
      refreshLayers();
      syncResultArtboardHeightRef.current();
      scheduleSave();
    },
    [refreshLayers, scheduleSave],
  );

  useEffect(() => {
    copyRef.current = () => {
      if (selectedObject?.type?.toLowerCase() !== "activeselection") {
        if (selectedObject) void handleCopyLayer(selectedObject);
      }
    };
    cutRef.current = () => {
      if (selectedObject?.type?.toLowerCase() !== "activeselection") {
        if (selectedObject) void handleCutLayer(selectedObject);
      }
    };
    pasteRef.current = () => void handlePaste();
  }, [handleCopyLayer, handleCutLayer, handlePaste, selectedObject]);

  const startRenameLayer = useCallback((object: FabricObject) => {
    setEditingLayerId(object.vvId ?? null);
    setEditingLayerName(objectLabel(object));
  }, []);

  const commitRenameLayer = useCallback(
    (object: FabricObject) => {
      const trimmed = editingLayerName.trim();
      if (trimmed) object.vvName = trimmed;
      setEditingLayerId(null);
      setLayers((current) => [...current]);
      scheduleSave();
    },
    [editingLayerName, scheduleSave],
  );

  // Reordering operates on canvas.getObjects()'s natural back-to-front order
  // (guides excluded) rather than the panel's front-first display order —
  // vvId lookups make the direction irrelevant, since the dragged object
  // simply takes over the drop target's stacking slot either way.
  const handleReorderLayers = useCallback(
    (draggedVvId: string, targetVvId: string) => {
      const canvas = canvasRef.current;
      if (!canvas || draggedVvId === targetVvId) return;

      const allObjects = canvas.getObjects() as FabricObject[];
      const nonGuideObjects = allObjects.filter(
        (object) => !isArtboardGuideObject(object),
      );
      const bottomGuideCount = allObjects.filter(
        (object) =>
          object.vvId === "__artboard-frame" ||
          object.vvId === "__artboard-screen",
      ).length;

      const fromIndex = nonGuideObjects.findIndex(
        (object) => object.vvId === draggedVvId,
      );
      const toIndex = nonGuideObjects.findIndex(
        (object) => object.vvId === targetVvId,
      );
      if (fromIndex === -1 || toIndex === -1) return;

      const reordered = [...nonGuideObjects];
      const [moved] = reordered.splice(fromIndex, 1);
      if (!moved) return;
      reordered.splice(toIndex, 0, moved);

      reordered.forEach((object, index) => {
        canvas.moveObjectTo(object, bottomGuideCount + index);
      });
      raiseArtboardOverlays(canvas);
      canvas.requestRenderAll();
      refreshLayers();
      scheduleSave();
    },
    [refreshLayers, scheduleSave],
  );

  const handleSelectBackground = useCallback(() => {
    const canvas = canvasRef.current;
    setActiveTool("pointer");
    setEditingLayerId(null);
    if (canvas) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
    setSelectedObject(null);
    setIsBackgroundSelected(true);
  }, []);

  const updateBackground = useCallback(
    (patch: Partial<FabricSceneBackground>) => {
      const nextBackground: FabricSceneBackground = {
        ...backgroundRef.current,
        ...patch,
      };
      if (!nextBackground.image) {
        delete nextBackground.image;
        delete nextBackground.imageOpacity;
      } else {
        nextBackground.imageOpacity = Math.min(
          1,
          Math.max(0, nextBackground.imageOpacity ?? 1),
        );
      }
      backgroundRef.current = nextBackground;
      setBackground(nextBackground);
      scheduleSave();
    },
    [scheduleSave],
  );

  const openImagePicker = useCallback(
    (target?: FabricObject | "background") => {
      imagePickerTargetRef.current =
        target === "background"
          ? { kind: "background" }
          : target?.type === "image"
            ? { kind: "object", object: target }
            : null;
      setIsImagePickerOpen(true);
    },
    [],
  );

  const closeImagePicker = useCallback(() => {
    imagePickerTargetRef.current = null;
    setIsImagePickerOpen(false);
  }, []);

  const handleImageSelect = useCallback(
    async (url: string, fileName: string) => {
      const canvas = canvasRef.current;
      const fabric = fabricRef.current;
      if (!canvas || !fabric) return;
      try {
        const pickerTarget = imagePickerTargetRef.current;
        if (pickerTarget?.kind === "background") {
          updateBackground({ image: url, imageOpacity: 1 });
          closeImagePicker();
          return;
        }

        const replacement =
          pickerTarget?.kind === "object" ? pickerTarget.object : null;
        if (replacement && isFabricObjectOnCanvas(canvas, replacement)) {
          const image = replacement as unknown as FabricTypes.FabricImage;
          const previousWidth = Math.max(image.width ?? 1, 1);
          const previousHeight = Math.max(image.height ?? 1, 1);
          const previousScaleX = image.scaleX;
          const previousScaleY = image.scaleY;

          await image.setSrc(url, { crossOrigin: "anonymous" });
          image.set({
            scaleX:
              (previousScaleX * previousWidth) / Math.max(image.width ?? 1, 1),
            scaleY:
              (previousScaleY * previousHeight) /
              Math.max(image.height ?? 1, 1),
          });
          replacement.vvName = fileName;
          replacement.setCoords();
          canvas.requestRenderAll();
          refreshLayers();
          closeImagePicker();
          scheduleSave();
          return;
        }

        const image = (await fabric.FabricImage.fromURL(url, {
          crossOrigin: "anonymous",
        })) as FabricObject & { width?: number; height?: number };
        const width = Math.max(image.width ?? 220, 1);
        const height = Math.max(image.height ?? 160, 1);
        const imageScale = Math.min(220 / width, 160 / height);
        const viewport = workspaceViewportRef.current;
        const canvasRect = canvas.upperCanvasEl.getBoundingClientRect();
        const viewportRect = viewport?.getBoundingClientRect();
        const visibleResultTop =
          isResultEditor && viewportRect
            ? Math.max(
                0,
                (viewportRect.top -
                  canvasRect.top -
                  canvas.viewportTransform[5]) /
                  Math.max(resultViewportScaleRef.current, 0.01) -
                  normalizedScene.artboard.y,
              )
            : 0;
        image.set({
          left: normalizedScene.artboard.x + 40,
          top: normalizedScene.artboard.y + visibleResultTop + 40,
          scaleX: imageScale,
          scaleY: imageScale,
        });
        image.vvId = createId("image");
        image.vvName = fileName;
        image.vvRole = "decorative";
        applyEditorControls(image);
        canvas.add(image);
        canvas.setActiveObject(image);
        setActiveTool("pointer");
        closeImagePicker();
        scheduleSave();
      } catch (error) {
        console.error("Failed to add image to canvas", error);
        toast.error("Failed to add image");
      }
    },
    [
      closeImagePicker,
      isResultEditor,
      normalizedScene.artboard.x,
      normalizedScene.artboard.y,
      refreshLayers,
      scheduleSave,
      updateBackground,
    ],
  );

  const resultEditorCanvasHeight =
    resultArtboardHeight + RESULT_EDITOR_BOTTOM_BUFFER;

  const pageViewportScale = pageViewportTransform[0];
  // Let the bezel's Fabric cutout be the only rounded mask. Matching a DOM
  // border radius to an independently anti-aliased canvas edge can expose a
  // hairline of the workspace between them, especially at fractional zoom.
  const pageBackgroundOverlap = Math.min(
    1,
    PHONE_FRAME_BORDER * pageViewportScale,
  );
  const artboardBackground = (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={
        isResultEditor
          ? {
              left:
                pageViewportTransform[4] +
                artboard.x * pageViewportScale -
                pageBackgroundOverlap,
              top:
                pageViewportTransform[5] +
                artboard.y * pageViewportScale -
                pageBackgroundOverlap,
              width:
                artboard.width * pageViewportScale + pageBackgroundOverlap * 2,
              height:
                resultEditorCanvasHeight * pageViewportScale +
                pageBackgroundOverlap * 2,
              borderRadius:
                (PHONE_FRAME_RADIUS - PHONE_FRAME_BORDER) * pageViewportScale +
                pageBackgroundOverlap,
              backgroundColor: background.color ?? "#ffffff",
            }
          : {
              left:
                pageViewportTransform[4] +
                artboard.x * pageViewportScale -
                pageBackgroundOverlap,
              top:
                pageViewportTransform[5] +
                artboard.y * pageViewportScale -
                pageBackgroundOverlap,
              width:
                artboard.width * pageViewportScale + pageBackgroundOverlap * 2,
              height:
                artboard.height * pageViewportScale + pageBackgroundOverlap * 2,
              borderRadius:
                (PHONE_FRAME_RADIUS - PHONE_FRAME_BORDER) * pageViewportScale +
                pageBackgroundOverlap,
              backgroundColor: background.color ?? "#ffffff",
            }
      }
      aria-hidden="true"
    >
      {background.image ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: cssUrl(background.image),
            opacity: background.imageOpacity ?? 1,
          }}
        />
      ) : null}
    </div>
  );

  const toolDock = (
    <FabricEditorToolDock
      activeTool={activeTool}
      shapeKind={shapeKind}
      brushKind={brushKind}
      isInteracting={isInteracting}
      isShapePickerOpen={isShapePickerOpen}
      isBrushPickerOpen={isBrushPickerOpen}
      onToolChange={(tool) => {
        setIsBackgroundSelected(false);
        setActiveTool(tool);
      }}
      onShapeKindChange={setShapeKind}
      onBrushKindChange={setBrushKind}
      onShapePickerOpenChange={setIsShapePickerOpen}
      onBrushPickerOpenChange={setIsBrushPickerOpen}
      onOpenImagePicker={() => {
        setIsBackgroundSelected(false);
        openImagePicker();
      }}
    />
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-slate-100", className)}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FabricEditorLayerPanel
          header={sidebarHeader}
          layers={layers}
          selectedObject={selectedObject}
          isBackgroundSelected={isBackgroundSelected}
          draggingLayerId={draggingLayerId}
          editingLayerId={editingLayerId}
          editingLayerName={editingLayerName}
          onDraggingLayerIdChange={setDraggingLayerId}
          onEditingLayerNameChange={setEditingLayerName}
          onCancelRenameLayer={() => setEditingLayerId(null)}
          onSelectLayer={handleSelectLayer}
          onSelectBackground={handleSelectBackground}
          onDeleteLayer={handleDeleteLayer}
          onCopyLayer={(object) => void handleCopyLayer(object)}
          onCutLayer={(object) => void handleCutLayer(object)}
          onUngroupLayer={handleUngroup}
          onStartRenameLayer={startRenameLayer}
          onCommitRenameLayer={commitRenameLayer}
          onReorderLayers={handleReorderLayers}
          canAssignActions={!isResultEditor}
          answerSelectionMode={answerSelectionMode}
          isSavingAnswerSelectionMode={isSavingAnswerSelectionMode}
          onAnswerSelectionModeChange={
            isResultEditor ? undefined : onAnswerSelectionModeChange
          }
          onAnswerEditingStateChange={(object, state) =>
            void handleAnswerEditingStateChange(object, state)
          }
          onChangeLayerAction={handleChangeButtonAction}
          onChangeLayerUrl={handleChangeButtonUrl}
          onDeletePage={onDeletePage}
          deletePageLabel={deletePageLabel}
        />

        <div className="relative min-w-0 flex-1 bg-slate-100">
          <div
            ref={workspaceViewportRef}
            className={cn(
              "relative h-full w-full [&_canvas]:block",
              isResultEditor ? "overflow-auto" : "overflow-hidden",
            )}
            style={{ touchAction: isResultEditor ? "pan-y" : "none" }}
            onScroll={() => canvasRef.current?.calcOffset()}
          >
            {artboardBackground}
            <canvas ref={canvasElementRef} />
          </div>
          {toolDock}
          {canvasContextMenu ? (
            <div
              role="menu"
              aria-label={
                canvasContextMenu.object
                  ? `${objectLabel(canvasContextMenu.object)} actions`
                  : "Canvas actions"
              }
              className="fixed z-50 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
              style={{
                left: canvasContextMenu.x,
                top: canvasContextMenu.y,
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {canvasContextMenu.object ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      startRenameLayer(canvasContextMenu.object!);
                      setCanvasContextMenu(null);
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
                      void handleDuplicate();
                      setCanvasContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <CopyPlus className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      void handleCopyLayer(canvasContextMenu.object!);
                      setCanvasContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                  {isFabricGroupObject(canvasContextMenu.object) ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleUngroup(canvasContextMenu.object!);
                        setCanvasContextMenu(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <Ungroup className="h-3.5 w-3.5" />
                      Ungroup
                      <span className="ml-auto text-[10px] text-slate-400">
                        ⇧⌘G
                      </span>
                    </button>
                  ) : null}
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleDeleteLayer(canvasContextMenu.object!);
                      setCanvasContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={!clipboardObjectRef.current}
                  onClick={() => {
                    void handlePaste(canvasContextMenu.point);
                    setCanvasContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Paste
                </button>
              )}
            </div>
          ) : null}
          {isBackgroundSelected ? (
            <FabricBackgroundMenu
              background={background}
              onChangeColor={(color) => updateBackground({ color })}
              onChooseImage={() => openImagePicker("background")}
              onRemoveImage={() => updateBackground({ image: undefined })}
              onChangeImageOpacity={(imageOpacity) =>
                updateBackground({ imageOpacity })
              }
            />
          ) : selectedObject && !isArtboardGuideObject(selectedObject) ? (
            <FabricSelectionMenu
              selectedObject={selectedObject}
              onUpdateObject={handleUpdateObject}
              onUpdateTextStyle={handleUpdateTextStyle}
              onUpdateComponentProperty={handleUpdateComponentProperty}
              onTransformTextCase={handleTransformTextCase}
              sceneFontFamilies={sceneFontFamilies}
              onChangeFontFamily={handleChangeFontFamily}
              onReplaceImage={() => openImagePicker(selectedObject)}
              onDuplicate={handleDuplicate}
              onMerge={handleMerge}
              onUngroup={handleUngroup}
              onSelectObject={handleSelectLayer}
              onDelete={handleDelete}
            />
          ) : null}
        </div>
      </div>

      <ImagePickerDialog
        isOpen={isImagePickerOpen}
        onClose={closeImagePicker}
        images={images}
        onImageSelect={handleImageSelect}
      />
    </div>
  );
}

export default FabricSceneEditor;

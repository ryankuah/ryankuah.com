"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as FabricTypes from "fabric";
import { registerFabricQuizProperties } from "@/lib/fabricSetup";
import { ensureSceneFontsLoaded } from "@/lib/fontRegistry";
import {
  applyAnswerVisualState,
  getAnswerVisualStates,
} from "./fabricAnswerStates";
import {
  applyFigmaTextFrameLayout,
  canvasLoadJson,
  clearFabricTextMeasurementCache,
} from "./fabricEditorUtils";
import type { FabricObject as EditorFabricObject } from "./fabricEditorTypes";
import {
  normalizeFabricQuizScene,
  type FabricQuizAction,
  type FabricQuizScene,
} from "../../../shared/fabricScene";

type FabricModule = typeof FabricTypes;
type FabricCanvas = InstanceType<FabricModule["Canvas"]>;
type FabricObject = InstanceType<FabricModule["FabricObject"]> & {
  vvId?: string;
  vvAction?: FabricQuizAction;
  vvActionProps?: Record<string, unknown>;
  getObjects?: () => FabricObject[];
  subTargetCheck?: boolean;
  __vvBaseOpacity?: number;
};

function childObjects(object: FabricObject): FabricObject[] {
  return object.type?.toLowerCase() === "group" && object.getObjects
    ? object.getObjects()
    : [];
}

function visitObjects(
  objects: FabricObject[],
  callback: (object: FabricObject) => void,
) {
  objects.forEach((object) => {
    callback(object);
    visitObjects(childObjects(object), callback);
  });
}

function configurePlaybackObject(object: FabricObject): boolean {
  applyFigmaTextFrameLayout(object);
  const children = childObjects(object);
  const hasInteractiveChild = children
    .map(configurePlaybackObject)
    .some(Boolean);
  const isInteractive = Boolean(object.vvAction) || hasInteractiveChild;

  object.__vvBaseOpacity = object.opacity ?? 1;

  object.selectable = false;
  object.evented = isInteractive;
  object.hoverCursor = isInteractive ? "pointer" : "default";
  object.setCoords();
  if (children.length > 0) object.subTargetCheck = hasInteractiveChild;
  return isInteractive;
}

type FabricSceneRendererProps = {
  scene?: FabricQuizScene;
  sceneKey?: string;
  scale?: number;
  viewportHeight?: number;
  selectedAnswerIds?: string[];
  answerSelectionEnabled?: boolean;
  confirmEnabled?: boolean;
  onAction?: (
    action: FabricQuizAction,
    actionProps?: Record<string, unknown>,
    sourceId?: string,
  ) => void;
  className?: string;
};

export function FabricSceneRenderer({
  scene,
  sceneKey,
  scale,
  viewportHeight,
  selectedAnswerIds = [],
  answerSelectionEnabled = false,
  confirmEnabled = false,
  onAction,
  className,
}: FabricSceneRendererProps) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const loadTokenRef = useRef(0);
  const loadChainRef = useRef<Promise<void>>(Promise.resolve());
  const appearanceRevisionRef = useRef(0);
  const appearanceChainRef = useRef<Promise<void>>(Promise.resolve());
  const onActionRef = useRef(onAction);
  const [canvasReady, setCanvasReady] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const normalizedScene = useMemo(
    () => normalizeFabricQuizScene(scene),
    [scene],
  );
  const resolvedViewportHeight = Math.min(
    normalizedScene.artboard.height,
    viewportHeight ?? normalizedScene.artboard.height,
  );

  // Keep the latest handler in a ref so a new onAction identity doesn't tear
  // down and rebuild the canvas.
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    let disposed = false;

    void import("fabric").then((fabric) => {
      if (disposed || !canvasElementRef.current) return;
      fabricRef.current = fabric;
      registerFabricQuizProperties(fabric.FabricObject);
      const canvas = new fabric.Canvas(canvasElementRef.current, {
        width: normalizedScene.artboard.width,
        height: resolvedViewportHeight,
        backgroundColor: "transparent",
        selection: false,
        preserveObjectStacking: true,
      });
      canvasRef.current = canvas;

      canvas.on("mouse:up", (event) => {
        const target =
          ((event.subTargets as FabricObject[] | undefined) ?? []).find(
            (object) => object.vvAction,
          ) ?? (event.target as FabricObject | undefined);
        if (!target?.vvAction) return;
        onActionRef.current?.(
          target.vvAction,
          target.vvActionProps,
          target.vvId,
        );
      });

      setCanvasReady(true);
    });

    return () => {
      disposed = true;
      setCanvasReady(false);
      loadTokenRef.current += 1;
      void canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, [normalizedScene.artboard.width, resolvedViewportHeight]);

  useEffect(() => {
    if (!canvasReady) return;

    // Serialize loads to avoid concurrent loadFromJSON calls (Strict Mode /
    // rapid scene changes) enlivening the same objects twice.
    const token = (loadTokenRef.current += 1);
    loadChainRef.current = loadChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const canvas = canvasRef.current;
        if (!canvas || token !== loadTokenRef.current) return;

        const { artboard } = normalizedScene;
        canvas.clear();
        canvas.setDimensions({
          width: artboard.width,
          height: resolvedViewportHeight,
        });
        await ensureSceneFontsLoaded(normalizedScene.fabric);
        if (canvasRef.current !== canvas || token !== loadTokenRef.current) {
          return;
        }
        const fabric = fabricRef.current;
        if (fabric) clearFabricTextMeasurementCache(fabric);
        await canvas.loadFromJSON(canvasLoadJson(normalizedScene.fabric));
        if (canvasRef.current !== canvas || token !== loadTokenRef.current) {
          return;
        }

        // The scene background is rendered by the artboard container so image
        // opacity can be applied without also fading the Fabric objects.
        canvas.backgroundColor = "transparent";
        // Draft scenes keep objects in workspace coordinates with the
        // artboard inset at (artboard.x, artboard.y); published scenes are
        // already artboard-origin (x = y = 0). Panning the viewport to the
        // artboard corner renders both correctly with one code path.
        canvas.setViewportTransform([1, 0, 0, 1, -artboard.x, -artboard.y]);
        canvas.selection = false;
        (canvas.getObjects() as FabricObject[]).forEach(
          configurePlaybackObject,
        );
        canvas.requestRenderAll();
        setLoadRevision(token);
      })
      .catch((error) => {
        if (token !== loadTokenRef.current) return;
        console.error("Failed to render Fabric scene", error);
      });
  }, [canvasReady, normalizedScene, resolvedViewportHeight, sceneKey]);

  useEffect(() => {
    const revision = (appearanceRevisionRef.current += 1);
    appearanceChainRef.current = appearanceChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const canvas = canvasRef.current;
        const fabric = fabricRef.current;
        if (!canvas || !fabric || revision !== appearanceRevisionRef.current) {
          return;
        }

        const objectsById = new Map<string, FabricObject>();
        const objects: FabricObject[] = [];
        visitObjects(canvas.getObjects() as FabricObject[], (object) => {
          objects.push(object);
          if (object.vvId) objectsById.set(object.vvId, object);
        });

        const numberProp = (
          props: Record<string, unknown> | undefined,
          key: string,
          fallback: number,
        ) =>
          typeof props?.[key] === "number" && Number.isFinite(props[key])
            ? (props[key] as number)
            : fallback;
        const visualTargets = (object: FabricObject) => {
          const ids = Array.isArray(object.vvActionProps?.styleTargetIds)
            ? object.vvActionProps.styleTargetIds.filter(
                (id): id is string => typeof id === "string",
              )
            : [];
          const targets = ids.flatMap((id) => {
            const target = objectsById.get(id);
            return target ? [target] : [];
          });
          return targets.length > 0 ? targets : [object];
        };
        const setVisualOpacity = (object: FabricObject, opacity: number) => {
          visualTargets(object).forEach((target) => {
            target.set("opacity", Math.min(1, Math.max(0, opacity)));
          });
        };

        for (const object of objects) {
          if (object.vvAction === "answerBox") {
            const states = getAnswerVisualStates(object);
            const isSelected = Boolean(
              answerSelectionEnabled &&
                object.vvId &&
                selectedAnswerIds.includes(object.vvId),
            );
            const visualState = isSelected
              ? states.selected
              : states.unselected;
            if (visualState) {
              await applyAnswerVisualState(
                fabric,
                object as EditorFabricObject,
                visualState,
              );
            } else {
              const selectedOpacity = numberProp(
                object.vvActionProps,
                "selectedOpacity",
                object.__vvBaseOpacity ?? 1,
              );
              const deselectedOpacity = numberProp(
                object.vvActionProps,
                "deselectedOpacity",
                selectedOpacity * 0.5,
              );
              setVisualOpacity(
                object,
                !answerSelectionEnabled || selectedAnswerIds.length === 0
                  ? selectedOpacity
                  : isSelected
                    ? selectedOpacity
                    : deselectedOpacity,
              );
            }
          }
          if (object.vvAction === "confirmAnswer") {
            const enabledOpacity = numberProp(
              object.vvActionProps,
              "enabledOpacity",
              object.__vvBaseOpacity ?? 1,
            );
            const disabledOpacity = numberProp(
              object.vvActionProps,
              "disabledOpacity",
              enabledOpacity * 0.5,
            );
            setVisualOpacity(
              object,
              confirmEnabled ? enabledOpacity : disabledOpacity,
            );
            object.evented = confirmEnabled;
            object.hoverCursor = confirmEnabled ? "pointer" : "default";
          }
          if (revision !== appearanceRevisionRef.current) return;
        }
        canvas.requestRenderAll();
      })
      .catch((error) => {
        if (revision !== appearanceRevisionRef.current) return;
        console.error("Failed to apply answer visual states", error);
      });

    return () => {
      if (revision === appearanceRevisionRef.current) {
        appearanceRevisionRef.current += 1;
      }
    };
  }, [
    selectedAnswerIds,
    answerSelectionEnabled,
    confirmEnabled,
    canvasReady,
    loadRevision,
    sceneKey,
  ]);

  const resolvedScale = scale ?? 1;

  return (
    <div
      className={className}
      style={{
        width: normalizedScene.artboard.width * resolvedScale,
        height: resolvedViewportHeight * resolvedScale,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: normalizedScene.artboard.width,
          height: normalizedScene.artboard.height,
          overflow: "hidden",
          backgroundColor: normalizedScene.background.color ?? "#ffffff",
          transform: `scale(${resolvedScale})`,
          transformOrigin: "top left",
        }}
      >
        {normalizedScene.background.image ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${JSON.stringify(normalizedScene.background.image)})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              opacity: normalizedScene.background.imageOpacity ?? 1,
              pointerEvents: "none",
            }}
          />
        ) : null}
        <canvas ref={canvasElementRef} />
      </div>
    </div>
  );
}

export default FabricSceneRenderer;

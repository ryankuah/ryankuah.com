"use client";

import { FABRIC_CUSTOM_PROPERTIES } from "../../../shared/fabricScene";
import type { FabricModule, FabricObject } from "./fabricEditorTypes";
import { isFabricGroupObject } from "./fabricEditorUtils";

export type AnswerEditingState = "unselected" | "selected";

export type AnswerVisualState = {
  objectId?: string;
  properties: Record<string, unknown>;
  children?: AnswerVisualState[];
};

export type AnswerVisualStates = Partial<
  Record<AnswerEditingState, AnswerVisualState>
>;

const ANSWER_STATES_KEY = "answerStates";
const ANSWER_EDITING_STATE_KEY = "answerEditingState";
const OMITTED_STATE_PROPERTIES = new Set([
  "type",
  "version",
  "objects",
  "layoutManager",
  "path",
  "points",
  "src",
  "crossOrigin",
  "filters",
  "resizeFilter",
  "clipPath",
  "excludeFromExport",
  "vvId",
  "vvName",
  "vvRole",
  "vvAction",
  "vvActionProps",
  "vvFigmaRawText",
  "vvFigmaTextCase",
  "vvFigmaTransform",
  "vvFigmaEffects",
  "vvFigmaTypography",
  "vvFigmaNodeType",
  "vvFigmaConstraints",
  "vvFigmaComponentPropertyReferences",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseAnswerVisualState(value: unknown): AnswerVisualState | undefined {
  if (!isRecord(value) || !isRecord(value.properties)) return undefined;
  const children = Array.isArray(value.children)
    ? value.children.flatMap((child) => {
        const parsed = parseAnswerVisualState(child);
        return parsed ? [parsed] : [];
      })
    : undefined;
  return {
    ...(typeof value.objectId === "string" ? { objectId: value.objectId } : {}),
    properties: cloneJson(value.properties),
    ...(children && children.length > 0 ? { children } : {}),
  };
}

export function getAnswerEditingState(
  object: Pick<FabricObject, "vvActionProps">,
): AnswerEditingState {
  return object.vvActionProps?.[ANSWER_EDITING_STATE_KEY] === "selected"
    ? "selected"
    : "unselected";
}

export function getAnswerVisualStates(
  object: Pick<FabricObject, "vvActionProps">,
): AnswerVisualStates {
  const value = object.vvActionProps?.[ANSWER_STATES_KEY];
  if (!isRecord(value)) return {};
  return {
    unselected: parseAnswerVisualState(value.unselected),
    selected: parseAnswerVisualState(value.selected),
  };
}

export function hasAnswerSelectedState(
  object: Pick<FabricObject, "vvActionProps">,
) {
  return Boolean(getAnswerVisualStates(object).selected);
}

export function captureAnswerVisualState(
  object: FabricObject,
): AnswerVisualState {
  const serialized = object.toObject([...FABRIC_CUSTOM_PROPERTIES]) as Record<
    string,
    unknown
  >;
  const properties = Object.fromEntries(
    Object.entries(serialized).filter(
      ([property]) => !OMITTED_STATE_PROPERTIES.has(property),
    ),
  );
  const children = isFabricGroupObject(object)
    ? object.getObjects().map(captureAnswerVisualState)
    : undefined;

  return {
    ...(object.vvId ? { objectId: object.vvId } : {}),
    properties: cloneJson(properties),
    ...(children && children.length > 0 ? { children } : {}),
  };
}

export function cloneAnswerVisualState(state: AnswerVisualState) {
  return cloneJson(state);
}

export function storeCurrentAnswerVisualState(object: FabricObject) {
  if (object.vvAction !== "answerBox") return;
  const editingState = getAnswerEditingState(object);
  const states = getAnswerVisualStates(object);
  object.vvActionProps = {
    ...(object.vvActionProps ?? {}),
    [ANSWER_STATES_KEY]: {
      ...states,
      [editingState]: captureAnswerVisualState(object),
    },
    [ANSWER_EDITING_STATE_KEY]: editingState,
  };
}

export function setAnswerVisualStates(
  object: FabricObject,
  states: AnswerVisualStates,
  editingState: AnswerEditingState,
) {
  object.vvActionProps = {
    ...(object.vvActionProps ?? {}),
    [ANSWER_STATES_KEY]: states,
    [ANSWER_EDITING_STATE_KEY]: editingState,
  };
}

export function clearAnswerVisualStates(actionProps: Record<string, unknown>) {
  const next = { ...actionProps };
  delete next[ANSWER_STATES_KEY];
  delete next[ANSWER_EDITING_STATE_KEY];
  return next;
}

type FabricImageWithSource = FabricObject & {
  getSrc?: () => string;
  setSrc?: (
    source: string,
    options?: { crossOrigin?: string },
  ) => Promise<void>;
};

async function applyStateProperties(
  fabric: FabricModule,
  object: FabricObject,
  state: AnswerVisualState,
) {
  const properties = cloneJson(state.properties);
  const source = typeof properties.src === "string" ? properties.src : null;
  const crossOrigin =
    typeof properties.crossOrigin === "string"
      ? properties.crossOrigin
      : undefined;
  const filters = Array.isArray(properties.filters)
    ? properties.filters
    : undefined;
  delete properties.src;
  delete properties.filters;

  if (source && object.type?.toLowerCase() === "image") {
    const image = object as FabricImageWithSource;
    if (image.setSrc && image.getSrc?.() !== source) {
      await image.setSrc(source, crossOrigin ? { crossOrigin } : undefined);
    }
  }

  const hydrated =
    await fabric.util.enlivenObjectEnlivables<Record<string, unknown>>(
      properties,
    );
  if (filters) {
    hydrated.filters = await fabric.util.enlivenObjects(filters);
  }
  object.set(hydrated as Partial<FabricObject>);

  if (object.type?.toLowerCase() === "textbox") {
    (object as unknown as { initDimensions: () => void }).initDimensions();
  }
  object.setCoords();
}

export async function applyAnswerVisualState(
  fabric: FabricModule,
  object: FabricObject,
  state: AnswerVisualState,
) {
  await applyStateProperties(fabric, object, state);
  if (!isFabricGroupObject(object) || !state.children) return;

  const children = object.getObjects();
  for (let index = 0; index < state.children.length; index += 1) {
    const childState = state.children[index];
    if (!childState) continue;
    const child =
      (childState.objectId
        ? children.find((candidate) => candidate.vvId === childState.objectId)
        : undefined) ?? children[index];
    if (child) await applyAnswerVisualState(fabric, child, childState);
  }
  object.setCoords();
}

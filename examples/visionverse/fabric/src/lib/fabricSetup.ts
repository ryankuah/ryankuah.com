"use client";

import type { FabricObject } from "fabric";
import { FABRIC_CUSTOM_PROPERTIES } from "../../shared/fabricScene";

type FabricObjectConstructor = typeof FabricObject;

let registered = false;

export function registerFabricQuizProperties(
  fabricObject: FabricObjectConstructor,
) {
  if (registered) return;
  fabricObject.customProperties = Array.from(
    new Set([
      ...(fabricObject.customProperties ?? []),
      ...FABRIC_CUSTOM_PROPERTIES,
    ]),
  );

  // Fabric 6+ defaults new objects to origin "center"/"center" (left/top address
  // the object's center), a breaking change from the "left"/"top" convention every
  // `left`/`top` in this codebase assumes (guide frame/screen, click-to-place
  // shapes, image drop, answer-checkmark markers). Left uncorrected, every object
  // is planted half its own width/height up and to the left of where it's told to
  // go — this is why the phone frame guide used to render off the top-left edge
  // of the canvas instead of where the artboard said it should be.
  fabricObject.ownDefaults.originX = "left";
  fabricObject.ownDefaults.originY = "top";

  registered = true;
}

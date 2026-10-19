"use client";

import { Image as ImageIcon, Trash2 } from "lucide-react";
import type { FabricSceneBackground } from "../../../shared/fabricScene";

type FabricBackgroundMenuProps = {
  background: FabricSceneBackground;
  onChangeColor: (color: string) => void;
  onChooseImage: () => void;
  onRemoveImage: () => void;
  onChangeImageOpacity: (opacity: number) => void;
};

function colorValue(value: string | undefined) {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : "#ffffff";
}

export function FabricBackgroundMenu({
  background,
  onChangeColor,
  onChooseImage,
  onRemoveImage,
  onChangeImageOpacity,
}: FabricBackgroundMenuProps) {
  const imageOpacity = background.imageOpacity ?? 1;
  const imageOpacityPercent = Math.round(imageOpacity * 100);

  return (
    <div
      role="group"
      aria-label="Background controls"
      className="absolute right-4 top-1/2 z-30 w-56 -translate-y-1/2 rounded-xl border border-slate-200/90 bg-white/95 p-2 shadow-lg backdrop-blur"
    >
      <div className="border-b border-slate-100 px-1 pb-2 text-xs font-semibold text-slate-800">
        Background
      </div>

      <div className="space-y-3 py-2">
        <label className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
          <span>Color</span>
          <span className="relative h-7 w-9 overflow-hidden rounded-md border border-slate-200 bg-white">
            <input
              type="color"
              value={colorValue(background.color)}
              onChange={(event) => onChangeColor(event.target.value)}
              className="absolute -inset-2 h-11 w-14 cursor-pointer border-0 bg-transparent p-0"
              aria-label="Background color"
            />
          </span>
        </label>

        <button
          type="button"
          onClick={onChooseImage}
          className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          {background.image ? "Change image" : "Choose image"}
        </button>

        {background.image ? (
          <>
            <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
              <span>Image opacity</span>
              <span className="tabular-nums text-slate-500">
                {imageOpacityPercent}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={imageOpacityPercent}
                onChange={(event) =>
                  onChangeImageOpacity(Number(event.target.value) / 100)
                }
                className="col-span-2 h-1.5 w-full cursor-pointer accent-blue-600"
              />
            </label>

            <button
              type="button"
              onClick={onRemoveImage}
              className="flex h-8 w-full items-center justify-center gap-2 rounded-md text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove image
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

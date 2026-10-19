import { buildBiomeGrid } from "./atlas";
import type { WorldData } from "./types";

self.onmessage = (event: MessageEvent<WorldData>) => {
  try {
    const configuredSampleSize = event.data.meta.biomeSampleSize ?? Math.max(4, Math.floor((event.data.meta.gridSize ?? 128) / 8));
    const previewSampleSize = Math.max(configuredSampleSize, 32);
    if (previewSampleSize > configuredSampleSize) {
      const preview = buildBiomeGrid(event.data, previewSampleSize);
      self.postMessage(
        { quality: "preview", width: preview.width, height: preview.height, values: preview.values.buffer },
        { transfer: [preview.values.buffer] }
      );
    }
    const grid = buildBiomeGrid(event.data);
    self.postMessage(
      { quality: "final", width: grid.width, height: grid.height, values: grid.values.buffer },
      { transfer: [grid.values.buffer] }
    );
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Could not render terrain" });
  }
};

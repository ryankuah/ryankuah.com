# CityCraft portfolio viewer

Snapshot of the CityCraft browser planner and `city/city.json`, copied from the CityCraft project on 17 October 2026. The public viewer uses the same geometry and palette. Visitor controls retain zoom, rotation, feature selection, grid, and 3D heights; development validation and JSON-editing instructions are omitted.

Rebuild the checked-in static viewer:

```sh
npm --prefix examples/citycraft/planner ci
npm --prefix examples/citycraft/planner run build
```

Output: `public/minecraft/citycraft/planner/`. The portfolio embeds this self-contained build, so a local planner server is not required. MapLibre font glyphs load from its public demo font service. The Vite build explicitly bundles the MapLibre worker.

## World loops

The footage is captured in Minecraft using the CityCraft source and layout snapshot, with the HUD hidden. The capture run and its fresh world are isolated under ignored `output/citycraft-capture/`. The original CityCraft project and saves are unchanged.

The portfolio serves silent looping MP4 files with JPEG posters for smaller downloads and playback controls. They pause offscreen and respect reduced motion. The scenes are Exchange Plaza at ground level and the suspended Circle line at Tithe Street West.
